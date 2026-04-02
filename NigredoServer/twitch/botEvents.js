// Twitch bot event handlers
const messageFormatter = require('../services/message-formatter');
const chatProcessor = require('../services/chat-processor');
const fisher = require('../lib/fisher');

module.exports = function setupTwitchBotEvents(twitchBot, container) {
  const { io, logger, allBadges } = container;

  twitchBot.on('message', (channel, data, message, self) => {
    if (self) return;

    const username = data['display-name'];
    const lowerMessage = message.toLowerCase();

    // Check for !fish command
    if (lowerMessage.startsWith('!fish ') || lowerMessage === '!fish') {
      const fishResult = fisher.catchFish(username);
      twitchBot.say(channel, fishResult.message);
      logger.info(`Fish catch: ${username} - ${fishResult.fish || 'failed'}`);
      return; // Don't process as normal chat message
    }

    // Check for !fishstats command
    if (lowerMessage === '!fishstats') {
      const playerStats = fisher.getPlayerFishingStats(username);
      const catchRate = playerStats.attempts > 0 
        ? ((playerStats.catches / playerStats.attempts) * 100).toFixed(1)
        : 0;
      const bestFishText = playerStats.personalBest 
        ? `${playerStats.personalBest.fish} (${playerStats.personalBest.size}cm)`
        : 'none yet';
      const statsMessage = `${username}'s fishing stats: ${playerStats.catches}/${playerStats.attempts} catches (${catchRate}%) | Personal best: ${bestFishText}`;
      twitchBot.say(channel, statsMessage);
      logger.info(`Stats requested: ${username}`);
      return; // Don't process as normal chat message
    }

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

