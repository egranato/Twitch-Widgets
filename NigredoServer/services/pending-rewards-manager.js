/**
 * Pending Rewards Manager
 * Tracks in-flight rewards and auto-refunds if not completed within timeout
 */

module.exports = function createPendingRewardsManager(container) {
  const { logger } = container;
  const pendingRewards = new Map();
  const REWARD_TIMEOUT_MS = 60000; // 60 seconds to complete a reward

  const trackReward = (rewardEvent) => {
    const rewardId = rewardEvent.id;
    const trackingData = {
      rewardEvent,
      startTime: Date.now(),
      completed: false,
      refunded: false,
    };

    pendingRewards.set(rewardId, trackingData);
    logger.info(`Tracking reward: ${rewardEvent.reward.title} (ID: ${rewardId})`);

    // Set timeout to auto-refund if not completed
    const timeoutHandle = setTimeout(() => {
      if (!trackingData.completed && !trackingData.refunded) {
        logger.warning(`Reward timeout: ${rewardEvent.reward.title} (ID: ${rewardId}) - Auto-refunding`);
        trackingData.refunded = true;
        trackingData.timeoutTriggered = true;
      }
    }, REWARD_TIMEOUT_MS);

    trackingData.timeoutHandle = timeoutHandle;
    return trackingData;
  };

  const completeReward = (rewardId) => {
    const tracking = pendingRewards.get(rewardId);
    if (tracking) {
      tracking.completed = true;
      clearTimeout(tracking.timeoutHandle);
      const duration = Date.now() - tracking.startTime;
      logger.info(`Reward completed: ${tracking.rewardEvent.reward.title} (ID: ${rewardId}) in ${duration}ms`);
      return true;
    }
    return false;
  };

  const shouldRefund = (rewardId) => {
    const tracking = pendingRewards.get(rewardId);
    return tracking && tracking.refunded;
  };

  const getRewardInfo = (rewardId) => {
    return pendingRewards.get(rewardId);
  };

  const cleanup = (rewardId) => {
    const tracking = pendingRewards.get(rewardId);
    if (tracking) {
      clearTimeout(tracking.timeoutHandle);
      pendingRewards.delete(rewardId);
    }
  };

  return {
    trackReward,
    completeReward,
    shouldRefund,
    getRewardInfo,
    cleanup,
  };
};
