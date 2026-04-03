/**
 * Reward Processor Service
 * Handles channel point redemption logic
 */
const fs = require('fs');
const path = require('path');

const OBS_VIDEO_REWARD_CONFIG = {
  Loser: {
    sourceName: process.env.OBS_REWARD_SOURCE_LOSER || 'Loser',
    durationMs: Number.parseInt(process.env.OBS_REWARD_DURATION_LOSER_MS || '4500', 10),
  },
  Yupee: {
    sourceName: process.env.OBS_REWARD_SOURCE_YUPEE || 'Yupee',
    durationMs: Number.parseInt(process.env.OBS_REWARD_DURATION_YUPEE_MS || '4500', 10),
  },
};

function normalizeDurationMs(value, fallbackMs = 4500) {
  return Number.isInteger(value) && value > 0 ? value : fallbackMs;
}

function createObsVideoRewardConfig(sourceName, durationMs = 4500) {
  return {
    process: async ({ container }) => {
      const { obs, logger } = container;
      try {
        const safeDurationMs = normalizeDurationMs(durationMs, 4500);
        logger.info(
          `OBS video reward trigger: source=${sourceName}, durationMs=${safeDurationMs}`
        );

        const success = await obs.playRewardSource(sourceName, safeDurationMs);
        if (!success) {
          throw new Error(`could not find OBS reward source: ${sourceName}`);
        }

        return { success: true };
      } catch (error) {
        logger.error(`Error processing OBS video reward ${sourceName}:`, error);
        return { success: false, error };
      }
    },
  };
}

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
  Loser: createObsVideoRewardConfig(
    OBS_VIDEO_REWARD_CONFIG.Loser.sourceName,
    OBS_VIDEO_REWARD_CONFIG.Loser.durationMs
  ),
  Yupee: createObsVideoRewardConfig(
    OBS_VIDEO_REWARD_CONFIG.Yupee.sourceName,
    OBS_VIDEO_REWARD_CONFIG.Yupee.durationMs
  ),
};

const processReward = async ({ container, event }) => {
  const { logger, io, rewardDisplayQueue } = container;
  const rewardTitle = event.reward.title;
  const rewardSlug = String(rewardTitle || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
  const rewardAudioFileName = `${rewardSlug}.mp3`;
  const rewardAudioDiskPath = path.resolve('public', 'assets', 'audio', rewardAudioFileName);
  const hasDedicatedAudio = rewardSlug && fs.existsSync(rewardAudioDiskPath);

  logger.info(`Processing reward: ${rewardTitle} from ${event.user_name}`);

  const config = REWARD_CONFIGS[rewardTitle];

  if (config && config.process) {
    // Custom reward processing
    logger.info(`Using custom processor for: ${rewardTitle}`);
    return config.process({ container, event });
  } else {
    // Default: emit to socket if clients connected
    const clientCount = io.engine.clientsCount;
    if (clientCount > 0) {
      const queueOptions = {};

      if (hasDedicatedAudio) {
        logger.info(
          `Queueing reward audio+visual sync for ${rewardTitle} (${clientCount} connected client(s))`
        );
        queueOptions.audio = {
          type: 'redemption',
          filePath: `/assets/audio/${rewardAudioFileName}`,
          volume: 0.9,
          priority: 'normal',
          cooldownMs: 0,
          label: `Reward ${rewardTitle} from ${event.user_name}`,
        };
      } else {
        logger.info(`No dedicated reward audio found for ${rewardTitle}; visual-only emit`);
      }

      logger.info(`Queueing visual redemption for ${rewardTitle} (${clientCount} connected client(s))`);
      rewardDisplayQueue.enqueue(event, queueOptions);

      return { success: true };
    } else {
      // No clients, auto-cancel
      logger.warning(`No clients connected, auto-canceling reward: ${rewardTitle}`);
      return { success: false, autoCancel: true };
    }
  }
};

module.exports = {
  processReward,
  REWARD_CONFIGS,
};
