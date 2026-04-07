/**
 * Dependency Container - Centralizes all application dependencies
 * This replaces the heavy parameter passing pattern
 */
const AudioQueue = require('./audio-queue');
const VolumeProfiles = require('./volume-profiles');
const RewardDisplayQueue = require('./reward-display-queue');

module.exports = function createContainer({
  io,
  logger,
  obs,
  gtts,
  mp3Duration,
  sleep,
  userCreds,
  user,
  allBadges,
  obsRewardRegistry,
  alertAudioConfig,
}) {
  const audioQueue = new AudioQueue({ logger });
  const volumeProfiles = new VolumeProfiles({ logger });
  const rewardDisplayQueue = new RewardDisplayQueue({ io, logger });

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
    obsRewardRegistry,
    alertAudioConfig,
    audioQueue,
    volumeProfiles,
    rewardDisplayQueue,
  };
};
