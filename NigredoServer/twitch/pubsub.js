// Twitch PubSub (WebSocket) event handling and subscription logic
const WebSocketClient = require('websocket').client;
const twitchApi = require('../services/twitch-api');
const authService = require('../services/auth-service');
const rewardProcessor = require('../services/reward-processor');
const createPendingRewardsManager = require('../services/pending-rewards-manager');

module.exports = function setupTwitchPubSub(container) {
  const { logger, user, sleep } = container;
  let userCreds = container.userCreds;
  const twitchClient = new WebSocketClient();
  const pendingRewardsManager = createPendingRewardsManager(container);

  const retryWithBackoff = async (operation, maxRetries = 3, initialDelay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        const delay = initialDelay * Math.pow(2, attempt - 1);
        logger.warning(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms: ${error.message}`);
        await sleep(delay);
      }
    }
  };

  const subscribeToFollow = (sessionId) => {
    return new Promise((resolve, reject) => {
      twitchApi
        .subscribeToFollow(userCreds.access_token, sessionId, user.id)
        .then((_) => {
          logger.info('Twitch Client Subscribed to Follow Events');
          resolve();
        })
        .catch((error) => {
          if (error.response && error.response.status === 401) {
            authService
              .refreshUserCreds(userCreds.refresh_token)
              .then((newUserCreds) => {
                userCreds = newUserCreds;
                // Update userCreds in container so other handlers have fresh token
                container.userCreds = newUserCreds;
                logger.info('Refreshed OAuth Token');
                return subscribeToFollow(sessionId);
              })
              .then(resolve)
              .catch((error) => {
                reject(error);
              });
          } else {
            reject(error);
          }
        });
    });
  };

  const subscribeToChannelPointRedemptions = (sessionId) => {
    twitchApi
      .subscribeToChannelPointRedemptions(userCreds.access_token, sessionId, user.id)
      .then((_) => {
        logger.info('Twitch Client Subscribed to Channel Point Reward Events');
      })
      .catch((error) => logger.error('Failed to subscribe to channel points:', error));
  };

  const completeChannelPointRewardRequestWithRefresh = (channelId, id, rewardId, success = true) => {
    logger.info(`Attempting to mark reward as ${success ? 'FULFILLED' : 'CANCELED'} - ID: ${id}, RewardID: ${rewardId}`);
    return twitchApi
      .completeChannelPointRewardRequest(userCreds.access_token, channelId, id, rewardId, success)
      .catch((error) => {
        const debugInfo = error.debugInfo || {};
        const status = debugInfo.status || error.response?.status;
        const errorMsg = debugInfo.data?.message || error.message || 'Unknown error';

        logger.error(`API Error: Status ${status} - ${errorMsg} - URL: ${debugInfo.url}`);

        if (status === 401) {
          logger.info('Token expired, attempting refresh...');
          return authService
            .refreshUserCreds(userCreds.refresh_token)
            .then((newUserCreds) => {
              userCreds = newUserCreds;
              container.userCreds = newUserCreds;
              logger.info('OAuth Token refreshed, retrying reward completion');
              return twitchApi.completeChannelPointRewardRequest(
                userCreds.access_token,
                channelId,
                id,
                rewardId,
                success
              );
            })
            .catch((refreshError) => {
              logger.error(`Failed to refresh token or retry: ${refreshError.message}`);
              throw refreshError;
            });
        } else if (status === 422) {
          logger.warning(`Reward already processed (422): ${id}`);
          return { already_completed: true };
        } else {
          throw error;
        }
      });
  };

  twitchClient.on('connectFailed', function (error) {
    logger.error('Twitch Connect Error: ' + error.toString());
  });

  twitchClient.on('connect', (connection) => {
    logger.info('Twitch Client Connected');

    connection.on('error', (error) => {
      logger.error('Twitch Connection Error: ' + error.toString());
    });

    connection.on('close', (event) => {
      logger.warning('Twitch Connection Closed');
    });

    connection.on('message', async (message) => {
      if (message.type === 'utf8') {
        const messageData = JSON.parse(message.utf8Data);
        if (messageData.metadata.message_type === 'notification') {
          switch (messageData.metadata.subscription_type) {
            case 'channel.follow':
              const newFollower = messageData.payload.event.user_name;
              logger.info(`New Follower: ${newFollower}`);
              // Enqueue follow alert sound
              if (container.audioManagerHandlers) {
                const followAudioPath = container.alertAudioConfig
                  ? container.alertAudioConfig.resolveAudioUrl('follow')
                  : '';

                if (!followAudioPath) {
                  logger.warning('Follow audio is not configured; emitting visual follow alert without sound.');
                  container.io.emit('follow', newFollower);
                  break;
                }

                container.audioManagerHandlers.enqueueAudio({
                  type: 'follow',
                  filePath: followAudioPath,
                  volume: 0.85,
                  priority: 'normal',
                  cooldownMs: 3000, // Avoid rapid-fire follows
                  label: `Follow from ${newFollower}`,
                  displayEvent: {
                    name: 'follow',
                    payload: newFollower,
                  },
                });
              }
              break;

            case 'channel.channel_points_custom_reward_redemption.add':
              const event = messageData.payload.event;
              const rewardId = event.id;
              let alreadyProcessing = pendingRewardsManager.getRewardInfo(rewardId);
              
              if (alreadyProcessing && alreadyProcessing.completed) {
                logger.warning(`Duplicate reward event - already processed: ${event.reward.title} (ID: ${rewardId})`);
                break;
              }

              (async () => {
                try {
                  logger.info(`Received reward redemption: ${event.reward.title} from ${event.user_name} (ID: ${rewardId})`);
                  
                  // Track this reward for timeout monitoring
                  pendingRewardsManager.trackReward(event);

                  const result = await rewardProcessor.processReward({ container, event });
                  logger.info(`Reward processor returned: success=${result.success}, autoCancel=${result.autoCancel}`);

                  if (result.success) {
                    // Mark as fulfilled
                    pendingRewardsManager.completeReward(rewardId);
                    try {
                      await retryWithBackoff(() =>
                        completeChannelPointRewardRequestWithRefresh(user.id, rewardId, event.reward.id, true)
                      );
                      logger.info(`✓ Reward fulfilled: ${event.reward.title} (ID: ${rewardId})`);
                      pendingRewardsManager.cleanup(rewardId);
                    } catch (fulfillError) {
                      logger.error(`✗ Failed to fulfill reward: ${event.reward.title} (${rewardId}) - Error: ${fulfillError.message}`);
                      pendingRewardsManager.cleanup(rewardId);
                    }
                  } else if (result.autoCancel) {
                    // Auto-cancel if no clients
                    logger.warning(`Auto-canceling reward: ${event.reward.title} (ID: ${rewardId}) - no clients connected`);
                    try {
                      await retryWithBackoff(() =>
                        completeChannelPointRewardRequestWithRefresh(user.id, rewardId, event.reward.id, false)
                      );
                      logger.info(`✓ Reward refunded (auto-cancel): ${event.reward.title} (ID: ${rewardId})`);
                      pendingRewardsManager.cleanup(rewardId);
                    } catch (cancelError) {
                      logger.error(`✗ Failed to cancel reward: ${event.reward.title} (${rewardId}) - Error: ${cancelError.message}`);
                      pendingRewardsManager.cleanup(rewardId);
                    }
                  } else if (result.success === false) {
                    // Explicit failure, refund points
                    logger.warning(`Reward processing failed: ${event.reward.title} (ID: ${rewardId}) - Refunding`);
                    try {
                      await retryWithBackoff(() =>
                        completeChannelPointRewardRequestWithRefresh(user.id, rewardId, event.reward.id, false)
                      );
                      logger.info(`✓ Reward refunded: ${event.reward.title} (ID: ${rewardId})`);
                      pendingRewardsManager.cleanup(rewardId);
                    } catch (refundError) {
                      logger.error(`✗ Failed to refund reward: ${event.reward.title} (${rewardId}) - Error: ${refundError.message}`);
                      pendingRewardsManager.cleanup(rewardId);
                    }
                  }
                } catch (error) {
                  logger.error(`✗ Uncaught error processing reward: ${event.reward.title} (${rewardId}) - Error: ${error.message}`);
                  pendingRewardsManager.cleanup(rewardId);
                  try {
                    await retryWithBackoff(() =>
                      completeChannelPointRewardRequestWithRefresh(user.id, rewardId, event.reward.id, false)
                    );
                    logger.info(`✓ Reward error-refunded: ${event.reward.title} (ID: ${rewardId})`);
                  } catch (retryError) {
                    logger.error(`✗ Failed to error-refund reward: ${event.reward.title} (${rewardId}) - Error: ${retryError.message}`);
                  }
                }
              })();
              break;
          }
        } else if (messageData.metadata.message_type === 'session_welcome') {
          const sessionId = messageData.payload.session.id;
          subscribeToFollow(sessionId)
            .then((_) => {
              subscribeToChannelPointRedemptions(sessionId);
            })
            .catch((error) => logger.error('Failed during pubsub subscription setup:', error));
        }
      }
    });
  });

  // connect to twitch pubsub socket
  twitchClient.connect('wss://eventsub.wss.twitch.tv/ws');
};

