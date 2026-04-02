/**
 * Reward Processor Service
 * Handles channel point redemption logic
 */
const commonUtils = require('./common-utils');

const REWARD_CONFIGS = {
  'Replace Gameplay with Penguins': {
    process: async ({ container, event }) => {
      const { obs, sleep, logger } = container;
      try {
        let success = await obs.penguins(true);
        if (!success) throw new Error('could not find video to show');

        await sleep(180000); // 3 minutes

        success = await obs.penguins(false);
        if (!success) throw new Error('could not find video to show');

        return { success: true };
      } catch (error) {
        logger.error('Error processing penguins reward:', error);
        return { success: false, error };
      }
    },
  },
};

const processReward = async ({ container, event }) => {
  const { logger, io } = container;
  const rewardTitle = event.reward.title;

  logger.info(`Point redemption: ${rewardTitle}`);

  const config = REWARD_CONFIGS[rewardTitle];

  if (config && config.process) {
    // Custom reward processing
    return config.process({ container, event });
  } else {
    // Default: emit to socket if clients connected
    const clientCount = io.engine.clientsCount;
    if (clientCount > 0) {
      io.emit('point-redeem', event);
      return { success: true };
    } else {
      // No clients, auto-cancel
      return { success: false, autoCancel: true };
    }
  }
};

module.exports = {
  processReward,
  REWARD_CONFIGS,
};
