// Twitch bot event handlers
const messageFormatter = require('../services/message-formatter');
const chatProcessor = require('../services/chat-processor');
const createChatCommandTips = require('../services/chat-command-tips');
const fisher = require('../lib/fisher');

const MAX_CHAT_MESSAGE_LENGTH = 450;

function chunkCommandMessages(prefix, entries) {
  const messages = [];
  let current = prefix;

  for (const entry of entries) {
    const fragment = `${entry.command} (${entry.description})`;
    const separator = current === prefix ? '' : ' | ';
    if ((current + separator + fragment).length > MAX_CHAT_MESSAGE_LENGTH) {
      messages.push(current);
      current = `${prefix}${fragment}`;
    } else {
      current += `${separator}${fragment}`;
    }
  }

  if (current.length > prefix.length) {
    messages.push(current);
  }

  return messages;
}

module.exports = function setupTwitchBotEvents(twitchBot, container) {
  const { io, logger, allBadges } = container;
  const chatCommandTips = createChatCommandTips();

  twitchBot.on('message', (channel, data, message, self) => {
    if (self) return;

    const username = data['display-name'];
    const lowerMessage = message.toLowerCase();

    // Check for !commands command
    if (lowerMessage === '!commands' || lowerMessage.startsWith('!commands ')) {
      const showAll = lowerMessage.includes(' all');
      const commandHints = showAll
        ? chatCommandTips.getAllCommandHints()
        : chatCommandTips.getRandomCommandHints(4);

      const commandMessages = chunkCommandMessages('Commands: ', commandHints);
      commandMessages.forEach((line) => {
        twitchBot.say(channel, line);
      });

      if (!showAll) {
        twitchBot.say(channel, 'Use !commands all to see the full command list.');
      }

      logger.info(`[commands] Command list requested by ${username} in ${channel} (all=${showAll})`);
      return; // Don't process as normal chat message
    }

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

    if (chatCommandTips.shouldSendTip(channel)) {
      const tipMessage = chatCommandTips.createTipMessage();
      twitchBot.say(channel, tipMessage);
      logger.info(`[chat-tip] Sent command tip in ${channel}: ${tipMessage}`);
    }

    // send chat messages to clients
    const messageEvent = messageFormatter.formatMessageData(data, message, allBadges);
    io.emit('message', messageEvent);

    // tts
    chatProcessor.processTTS({ container, data, message }).catch(logger.error);
  });

  twitchBot.on('subscription', (channel, username, methods, message, userState) => {
    io.emit('subscription', userState['system-msg']);
    // Enqueue subscription alert sound
    if (container.audioManagerHandlers) {
      container.audioManagerHandlers.enqueueAudio({
        type: 'subscription',
        filePath: '/assets/audio/subscription.mp3',
        volume: 0.9,
        priority: 'high',
        label: `Subscription from ${username}`,
      });
    }
  });

  twitchBot.on('resub', (channel, username, months, message, userState, methods) => {
    io.emit('subscription', userState['system-msg']);
    // Enqueue resub alert sound
    if (container.audioManagerHandlers) {
      container.audioManagerHandlers.enqueueAudio({
        type: 'subscription',
        filePath: '/assets/audio/subscription.mp3',
        volume: 0.9,
        priority: 'high',
        label: `Resub from ${username}`,
      });
    }
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

    // Enqueue cheer alert sound (high priority)
    if (container.audioManagerHandlers) {
      container.audioManagerHandlers.enqueueAudio({
        type: 'cheer',
        filePath: '/assets/audio/shotgun.mp3',
        volume: 0.95,
        priority: 'high',
        label: `Cheer from ${userState['display-name']} (${userState.bits} bits)`,
      });
    }
  });
};

