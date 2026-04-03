// Socket.io event handlers
const commonUtils = require('../services/common-utils');

module.exports = function setupSocketHandlers(container) {
  const { io, logger, rewardDisplayQueue } = container;

  io.on('connection', (connection) => {
    logger.info('IO Client Connected!');

    connection.on('point-fulfill', (payload) => {
      const eventId = payload?.id;
      rewardDisplayQueue.complete(eventId);
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

