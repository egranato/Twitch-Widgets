// Twitch bot event handlers
const messageFormatter = require('../services/message-formatter');
const chatProcessor = require('../services/chat-processor');

module.exports = function setupTwitchBotEvents(twitchBot, container) {
  const { io, logger, allBadges } = container;

  twitchBot.on('message', (channel, data, message, self) => {
    if (self) return;
    // send chat messages to clients
    const messageEvent = messageFormatter.formatMessageData(data, message, allBadges);
    io.emit('message', messageEvent);

    // tts
    chatProcessor.processTTS({ container, data, message }).catch(logger.error);
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
    // tts for cheer
    const cheerMessage = `${userState['display-name']} donated ${userState.bits} bits and says "${message}"`;
    const choreData = { id: userState.id };
    chatProcessor.processTTS({ container, data: choreData, message: cheerMessage }).catch(logger.error);
  });
};

