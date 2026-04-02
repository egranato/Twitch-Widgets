/**
 * Dependency Container - Centralizes all application dependencies
 * This replaces the heavy parameter passing pattern
 */
module.exports = function createContainer({ io, logger, obs, gtts, mp3Duration, sleep, userCreds, user, allBadges }) {
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
  };
};
