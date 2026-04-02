/**
 * Dependency Container - Centralizes all application dependencies
 * This replaces the heavy parameter passing pattern
 */
const AudioQueue = require('./audio-queue');

module.exports = function createContainer({ io, logger, obs, gtts, mp3Duration, sleep, userCreds, user, allBadges }) {
  const audioQueue = new AudioQueue({ logger });

  return {
    io,
    logger,
    obs,
    gtts,
    mp3Duration,
    sleep,
    userCreds,
    user,
    allBadges,
    audioQueue,
  };
};
