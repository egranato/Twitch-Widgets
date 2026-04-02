/**
 * Chat Command Tips Service
 * Sends occasional, randomized command hints based on message and time thresholds.
 */

const DEFAULT_COMMAND_HINTS = [
  { command: '!fish', description: 'catch a fish' },
  { command: '!fishstats', description: 'view your fishing stats' },
];

const DEFAULT_OPTIONS = {
  minMessages: 35,
  maxMessages: 80,
  minMinutes: 8,
  maxMinutes: 18,
  minCommandsPerTip: 1,
  maxCommandsPerTip: 2,
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createChannelState(options) {
  return {
    messagesSinceLastTip: 0,
    nextMessageThreshold: randomInt(options.minMessages, options.maxMessages),
    nextTimeThreshold: Date.now() + randomInt(options.minMinutes, options.maxMinutes) * 60 * 1000,
  };
}

module.exports = function createChatCommandTips(config = {}) {
  const commandHints = Array.isArray(config.commandHints) && config.commandHints.length > 0
    ? config.commandHints
    : DEFAULT_COMMAND_HINTS;

  const options = {
    ...DEFAULT_OPTIONS,
    ...(config.options || {}),
  };

  const channelState = new Map();

  function getState(channel) {
    if (!channelState.has(channel)) {
      channelState.set(channel, createChannelState(options));
    }
    return channelState.get(channel);
  }

  function resetState(state) {
    state.messagesSinceLastTip = 0;
    state.nextMessageThreshold = randomInt(options.minMessages, options.maxMessages);
    state.nextTimeThreshold = Date.now() + randomInt(options.minMinutes, options.maxMinutes) * 60 * 1000;
  }

  function shouldSendTip(channel) {
    const state = getState(channel);
    state.messagesSinceLastTip += 1;

    const enoughMessages = state.messagesSinceLastTip >= state.nextMessageThreshold;
    const enoughTimePassed = Date.now() >= state.nextTimeThreshold;

    if (!enoughMessages || !enoughTimePassed) {
      return false;
    }

    resetState(state);
    return true;
  }

  function createTipMessage() {
    const desiredCount = Math.min(
      commandHints.length,
      randomInt(options.minCommandsPerTip, options.maxCommandsPerTip)
    );

    const selected = getRandomCommandHints(desiredCount);
    const fragments = selected.map((entry) => `${entry.command} (${entry.description})`);

    return `Tip: Try ${fragments.join(' | ')}`;
  }

  function getAllCommandHints() {
    return [...commandHints];
  }

  function getRandomCommandHints(count) {
    const safeCount = Math.max(1, Math.min(commandHints.length, Number.parseInt(String(count), 10) || 1));
    return shuffle(commandHints).slice(0, safeCount);
  }

  return {
    shouldSendTip,
    createTipMessage,
    getAllCommandHints,
    getRandomCommandHints,
  };
};
