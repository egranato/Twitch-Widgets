/**
 * Dependency Container - Centralizes all application dependencies
 * This replaces the heavy parameter passing pattern
 */
const AudioQueue = require('./audio-queue');
const VolumeProfiles = require('./volume-profiles');

module.exports = function createContainer({ io, logger, obs, gtts, mp3Duration, sleep, userCreds, user, allBadges }) {
  const audioQueue = new AudioQueue({ logger });
  const volumeProfiles = new VolumeProfiles({ logger });

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
    volumeProfiles,
  };
};
