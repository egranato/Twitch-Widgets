/**
 * Chat Processor Service
 * Handles chat message and TTS event processing
 */
const commonUtils = require('./common-utils');

const processTTS = ({ container, data, message }) => {
  const { gtts, obs, sleep, io, logger } = container;

  // Skip TTS processing if desktop TTS is disabled
  const desktopTtsEnabled = process.env.DESKTOP_TTS_ENABLED !== 'false';
  if (!desktopTtsEnabled) {
    return Promise.resolve();
  }

  const filename = commonUtils.createMp3FileName(data.id);

  return gtts
    .save(filename, message)
    .then(() => {
      return obs.toggleChatHead(true).catch((error) => {
        logger.warning(`Skipping ChatHead toggle because OBS is unavailable: ${error.message}`);
      });
    })
    .then(() => sleep(500))
    .then(() => {
      // Emit TTS event for desktop-local playback only.
      io.emit('tts-desktop-message', data.id);
    })
    .catch((error) => {
      logger.error('Failed to process TTS:', error);
      throw error;
    });
};

module.exports = {
  processTTS,
};
