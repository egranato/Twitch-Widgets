/**
 * Chat Processor Service
 * Handles chat message and TTS event processing
 */
const commonUtils = require('./common-utils');

const processTTS = ({ container, data, message }) => {
  const { gtts, obs, sleep, io, logger } = container;
  const filename = commonUtils.createMp3FileName(data.id);

  return gtts
    .save(filename, message)
    .then(() => obs.toggleChatHead(true))
    .then(() => sleep(500))
    .then(() => {
      io.emit('tts-message', data.id);
    })
    .catch((error) => {
      logger.error('Failed to process TTS:', error);
      throw error;
    });
};

module.exports = {
  processTTS,
};
