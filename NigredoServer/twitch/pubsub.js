// Twitch PubSub (WebSocket) event handling and subscription logic
const WebSocketClient = require('websocket').client;

module.exports = function setupTwitchPubSub(utilities, logger, obs, io, userCreds, user, sleep) {
  const twitchClient = new WebSocketClient();

  const subscribeToFollow = (sessionId) => {
    return new Promise((resolve, reject) => {
      utilities
        .subscribeToFollow(userCreds.access_token, sessionId, user.id)
        .then((_) => {
          logger.info('Twitch Client Subscribed to Follow Events');
          resolve();
        })
        .catch((error) => {
          if (error.response && error.response.status === 401) {
            utilities
              .refreshUserCreds(userCreds.refresh_token)
              .then((newUserCreds) => {
                userCreds = newUserCreds;
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
    utilities
      .subscribeToChannelPointRedemptions(
        userCreds.access_token,
        sessionId,
        user.id
      )
      .then((_) => {
        logger.info('Twitch Client Subscribed to Channel Point Reward Events');
      })
      .catch(logger.error);
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
              io.emit('follow', newFollower);
              break;
            case 'channel.channel_points_custom_reward_redemption.add':
              const event = messageData.payload.event;
              logger.info(`Point redemption: ${event.reward.title}`);
              const clientCount = io.engine.clientsCount;
              switch (event.reward.title) {
                case 'Replace Gameplay with Penguins':
                  const processPenguins = async () => {
                    // show penguins
                    var success = await obs.penguins(true);
                    if (!success) throw new Error('could not find video to show');
                    // wait
                    await sleep(180000); // 3 minutes
                    // hide penguins
                    success = await obs.penguins(false);
                    if (!success) throw new Error('could not find video to show');
                  };
                  processPenguins()
                    .then(() => {
                      utilities
                        .completeChannelPointRewardRequest(
                          userCreds.access_token,
                          user.id,
                          event.id,
                          event.reward.id
                        )
                        .catch(logger.error);
                    })
                    .catch((error) => {
                      logger.error(error);
                      utilities
                        .completeChannelPointRewardRequest(
                          userCreds.access_token,
                          user.id,
                          event.id,
                          event.reward.id,
                          false
                        )
                        .catch(logger.error);
                    });
                  break;
                default:
                  if (clientCount > 0) {
                    io.emit('point-redeem', event);
                  } else {
                    utilities
                      .completeChannelPointRewardRequest(
                        userCreds.access_token,
                        user.id,
                        event.id,
                        event.reward.id,
                        false
                      )
                      .catch(logger.error);
                  }
              }
              break;
          }
        } else if (messageData.metadata.message_type === 'session_welcome') {
          const sessionId = messageData.payload.session.id;
          subscribeToFollow(sessionId)
            .then((_) => {
              subscribeToChannelPointRedemptions(sessionId);
            })
            .catch(logger.error);
        }
      }
    });
  });

  // connect to twitch pubsub socket
  twitchClient.connect('wss://eventsub.wss.twitch.tv/ws');
};
