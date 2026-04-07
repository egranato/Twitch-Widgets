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
  const { logger, io, obsRewardRegistry, obs, audioManagerHandlers } = container;
  const rewardTitle = event.reward.title;
  const rewardSlug = String(rewardTitle || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
  const rewardAudioFileName = `${rewardSlug}.mp3`;
  const rewardAudioDiskPath = path.resolve('public', 'assets', 'audio', rewardAudioFileName);
  const hasDedicatedAudio = rewardSlug && fs.existsSync(rewardAudioDiskPath);

  logger.info(`Processing reward: ${rewardTitle} from ${event.user_name}`);

  const dynamicObsMapping = obsRewardRegistry ? obsRewardRegistry.getByRewardTitle(rewardTitle) : null;
  if (!dynamicObsMapping) {
    logger.warning(
      `Reward redeemed without OBS mapping: ${rewardTitle} from ${event.user_name}. Refunding until mapping is configured.`,
    );

    io.emit('reward-unconfigured', {
      id: event.id,
      rewardId: event.reward?.id,
      rewardTitle,
      userName: event.user_name,
      redeemedAt: new Date().toISOString(),
      message: `Reward '${rewardTitle}' is not mapped to any OBS sources yet.`,
    });

    return { success: false, autoCancel: true, unconfigured: true };
  }

  try {
    const mappedSources = Array.isArray(dynamicObsMapping.sources)
      ? dynamicObsMapping.sources.filter((item) => item?.sourceName)
      : [];

    if (mappedSources.length === 0) {
      throw new Error(`mapping for '${rewardTitle}' has no OBS sources`);
    }

    logger.info(
      `Using registered OBS reward mapping for '${rewardTitle}' with ${mappedSources.length} source(s)`,
    );

    const sourceResults = await Promise.all(
      mappedSources.map((source) => obs.playRewardSource(source.sourceName, source.durationMs)),
    );

    if (sourceResults.some((success) => success !== true)) {
      throw new Error(`one or more OBS sources were not found for reward '${rewardTitle}'`);
    }

    let mappedAudio = dynamicObsMapping.audio || null;
    if (!mappedAudio && hasDedicatedAudio) {
      mappedAudio = {
        fileName: rewardAudioFileName,
        volume: 0.9,
      };
    }

    if (mappedAudio && audioManagerHandlers) {
      const fileName = String(mappedAudio.fileName || '').trim();
      const diskPath = path.resolve('public', 'assets', 'audio', fileName);

      if (fileName && fs.existsSync(diskPath)) {
        audioManagerHandlers.enqueueAudio({
          type: 'redemption',
          filePath: `/assets/audio/${fileName}`,
          volume: Number.isFinite(mappedAudio.volume) ? mappedAudio.volume : 0.9,
          priority: 'high',
          cooldownMs: 0,
          label: `Reward ${rewardTitle} from ${event.user_name}`,
        });
      } else {
        logger.warning(`Mapped audio file not found for reward '${rewardTitle}': ${fileName}`);
      }
    }

    return { success: true };
  } catch (error) {
    logger.error(`Error processing registered OBS reward ${rewardTitle}:`, error);
    return { success: false, error };
  }
};

module.exports = {
  processReward,
  REWARD_CONFIGS,
};
