// Socket.io event handlers
module.exports = function setupSocketHandlers(io, utilities, obs, gtts, mp3Duration, sleep, logger, userCreds, user, allBadges) {
  io.on('connection', (connection) => {
    logger.info('IO Client Connected!');

    // tell twitch we've fulfilled the channel point reward
    connection.on('point-fulfill', ({ id, rewardId }) => {
      utilities
        .completeChannelPointRewardRequest(
          userCreds.access_token,
          user.id,
          rewardId,
          id
        )
        .catch(logger.error);
    });

    // delete tts generated mp3
    connection.on('tts-complete', (id) => {
      const filename = utilities.createMp3FileName(id);
      try {
        require('fs').unlinkSync(filename);
      } catch (e) {
        logger.error('Failed to delete TTS file:', e);
      }
      obs.toggleChatHead(false);
    });
  });
};
