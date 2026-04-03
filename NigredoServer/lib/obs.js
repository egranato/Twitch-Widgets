const OBSWebSocket = require("obs-websocket-js").default;
const obs = new OBSWebSocket();

const logger = require("./logger");
const REWARD_GROUP_SCENE = "Channel Point Rewards";

obs.connect()
  .then(() => {
    logger.info("Connected to OBS Websocket!");
  })
  .catch((error) => {
    // OBS is optional for local startup; keep server alive if it is offline.
    logger.warning(`OBS websocket unavailable at startup: ${error.message}`);
  });

const toggleChatHead = async (enable = false) => {
  const scene = await obs.call("GetCurrentProgramScene");
  const result = await obs.call("GetSceneItemList", {
    sceneUuid: scene.sceneUuid,
  });
  const chatHeadIndex = result.sceneItems.findIndex((x) => {
    return x.sourceName === "ChatHead";
  });

  if (chatHeadIndex >= 0) {
    await obs.call("SetSceneItemEnabled", {
      sceneUuid: scene.sceneUuid,
      sceneItemId: result.sceneItems[chatHeadIndex].sceneItemId,
      sceneItemEnabled: enable,
    });
  }
};

const penguins = async (enable = false) => {
  const rewardItems = await obs.call("GetGroupSceneItemList", { sceneName: REWARD_GROUP_SCENE });
  const penguinIndex = rewardItems.sceneItems.findIndex((x) => {
    return x.sourceName === "Penguins";
  });
  if (penguinIndex >= 0) {
    await obs.call("SetSceneItemEnabled", {
      sceneName: REWARD_GROUP_SCENE,
      sceneItemId: rewardItems.sceneItems[penguinIndex].sceneItemId,
      sceneItemEnabled: enable,
    });
    return true;
  } else {
    return false;
  }
};

const toggleRewardSource = async (sourceName, enable = false) => {
  const rewardItems = await obs.call("GetGroupSceneItemList", { sceneName: REWARD_GROUP_SCENE });
  const sourceIndex = rewardItems.sceneItems.findIndex((x) => x.sourceName === sourceName);

  if (sourceIndex < 0) {
    return false;
  }

  await obs.call("SetSceneItemEnabled", {
    sceneName: REWARD_GROUP_SCENE,
    sceneItemId: rewardItems.sceneItems[sourceIndex].sceneItemId,
    sceneItemEnabled: enable,
  });

  return true;
};

const playRewardSource = async (sourceName, durationMs = 4500) => {
  let success = await toggleRewardSource(sourceName, true);
  if (!success) {
    return false;
  }

  await new Promise((resolve) => setTimeout(resolve, durationMs));

  success = await toggleRewardSource(sourceName, false);
  return success;
};

module.exports = { toggleChatHead, penguins, toggleRewardSource, playRewardSource };
