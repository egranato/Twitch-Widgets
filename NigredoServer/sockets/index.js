// Socket.io event handlers
const commonUtils = require('../services/common-utils');

module.exports = function setupSocketHandlers(container) {
  const { io, logger, user } = container;

  io.on('connection', (connection) => {
    logger.info('IO Client Connected!');

    // Note: Channel point reward fulfillment is now handled automatically by the PubSub handler
    // No need for the client to manually fulfill rewards

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

