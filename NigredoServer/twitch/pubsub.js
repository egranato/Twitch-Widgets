// Twitch PubSub (WebSocket) event handling and subscription logic
const WebSocketClient = require('websocket').client;
const twitchApi = require('../services/twitch-api');
const authService = require('../services/auth-service');
const rewardProcessor = require('../services/reward-processor');

module.exports = function setupTwitchPubSub(container) {
  const { logger, user, sleep } = container;
  let userCreds = container.userCreds;
  const twitchClient = new WebSocketClient();

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
    return twitchApi
      .completeChannelPointRewardRequest(userCreds.access_token, channelId, id, rewardId, success)
      .catch((error) => {
        if (error.response && error.response.status === 401) {
          return authService
            .refreshUserCreds(userCreds.refresh_token)
            .then((newUserCreds) => {
              userCreds = newUserCreds;
              container.userCreds = newUserCreds;
              logger.info('Refreshed OAuth Token');
              return twitchApi.completeChannelPointRewardRequest(
                userCreds.access_token,
                channelId,
                id,
                rewardId,
                success
              );
            })
            .catch((refreshError) => {
              logger.error('Failed to refresh token or retry reward completion: ' + refreshError);
              throw refreshError;
            });
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
              container.io.emit('follow', newFollower);
              break;

            case 'channel.channel_points_custom_reward_redemption.add':
              const event = messageData.payload.event;

              try {
                const result = await rewardProcessor.processReward({ container, event });

                if (result.success) {
                  // Mark as fulfilled
                  completeChannelPointRewardRequestWithRefresh(user.id, event.id, event.reward.id, true)
                    .catch((error) => logger.error('Failed to mark reward fulfilled: ' + error));
                } else if (result.autoCancel) {
                  // Auto-cancel if no clients
                  completeChannelPointRewardRequestWithRefresh(user.id, event.id, event.reward.id, false)
                    .catch((error) => logger.error('Failed to cancel reward: ' + error));
                }
              } catch (error) {
                logger.error('Error processing reward:', error);
                // Try to cancel on error
                completeChannelPointRewardRequestWithRefresh(user.id, event.id, event.reward.id, false)
                  .catch((error) => logger.error('Failed to cancel reward after error: ' + error));
              }
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

