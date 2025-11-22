// Twitch bot event handlers
module.exports = function setupTwitchBotEvents(twitchBot, io, utilities, obs, gtts, mp3Duration, sleep, logger, allBadges, userCreds, user) {
  twitchBot.on('message', (channel, data, message, self) => {
    if (self) return;
    // send chat messages to clients
    const messageEvent = utilities.formatMessageData(
      data,
      message,
      allBadges
    );
    io.emit('message', messageEvent);

    // tts
    const filename = utilities.createMp3FileName(data.id);
    gtts
      .save(filename, message)
      .then(() => obs.toggleChatHead(true))
      .then(() => sleep(500))
      .then(() => {
        io.emit('tts-message', data.id);
      });
  });

  twitchBot.on('subscription', (channel, username, methods, message, userState) => {
    io.emit('subscription', userState['system-msg']);
  });

  twitchBot.on('resub', (channel, username, months, message, userState, methods) => {
    io.emit('subscription', userState['system-msg']);
  });

  twitchBot.on('anonsubgift', (channel, streakMonths, recipient, methods, userState) => {
    logger.info({ event: 'anonsubgift', channel, streakMonths, recipient, methods, userState });
  });

  twitchBot.on('anonsubmysterygift', (channel, numOfSubs, methods, userState) => {
    logger.info({ event: 'anonsubmysterygift', channel, numOfSubs, methods, userState });
  });

  twitchBot.on('giftpaidupgrade', (channel, username, sender, userState) => {
    logger.info({ event: 'giftpaidupgrade', channel, username, sender, userState });
  });

  twitchBot.on('primepaidupgrade', (channel, username, methods, userState) => {
    logger.info({ event: 'primepaidupgrade', channel, username, methods, userState });
  });

  twitchBot.on('subgift', (channel, username, streakMonths, recipient, methods, userState) => {
    logger.info({ event: 'subgift', channel, username, streakMonths, recipient, methods, userState });
  });

  twitchBot.on('submysterygift', (channel, username, numOfSubs, methods, userState) => {
    logger.info({ event: 'submysterygift', channel, username, numOfSubs, methods, userState });
  });

  twitchBot.on('action', (channel, userState, message, self) => {
    logger.info({ event: 'action', channel, userState, message, self });
  });

  twitchBot.on('cheer', (channel, userState, message) => {
    // tts
    const filename = utilities.createMp3FileName(userState.id);
    message = `${userState['display-name']} donated ${userState.bits} bits and says "${message}"`;
    gtts
      .save(filename, message)
      .then(() => obs.toggleChatHead(true))
      .then(() => sleep(500))
      .then(() => {
        io.emit('tts-message', userState.id);
      });
  });
};
