// Socket.io event handlers
const twitchApi = require('../services/twitch-api');
const commonUtils = require('../services/common-utils');

module.exports = function setupSocketHandlers(container) {
  const { io, logger, userCreds, user } = container;

  io.on('connection', (connection) => {
    logger.info('IO Client Connected!');

    // tell twitch we've fulfilled the channel point reward
    connection.on('point-fulfill', ({ id, rewardId }) => {
      twitchApi
        .completeChannelPointRewardRequest(userCreds.access_token, user.id, rewardId, id)
        .catch((error) => logger.error('Failed to fulfill reward:', error));
    });

    // delete tts generated mp3
    connection.on('tts-complete', (id) => {
      const filename = commonUtils.createMp3FileName(id);
      try {
        require('fs').unlinkSync(filename);
      } catch (e) {
        logger.error('Failed to delete TTS file:', e);
      }
      container.obs.toggleChatHead(false);
    });
  });
};

