/**
 * Chat Processor Service
 * Handles chat message and TTS event processing
 */
const commonUtils = require('./common-utils');

const processTTS = ({ container, data, message }) => {
  const { gtts, obs, sleep, io, logger, audioManagerHandlers } = container;
  const filename = commonUtils.createMp3FileName(data.id);

  return gtts
    .save(filename, message)
    .then(() => obs.toggleChatHead(true))
    .then(() => sleep(500))
    .then(() => {
      // Emit TTS event to clients
      io.emit('tts-message', data.id);
      
      // Also queue to audio manager if available
      if (audioManagerHandlers) {
        audioManagerHandlers.enqueueAudio({
          type: 'tts',
          filePath: `/output/${filename}`,
          volume: 0.8,
          priority: 'normal',
          label: `TTS: ${message.substring(0, 50)}...`,
        });
      }
    })
    .catch((error) => {
      logger.error('Failed to process TTS:', error);
      throw error;
    });
};

module.exports = {
  processTTS,
};
