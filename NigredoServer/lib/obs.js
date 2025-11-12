const OBSWebSocket = require("obs-websocket-js").default;
const obs = new OBSWebSocket();

const logger = require("./logger");

obs.connect().then(() => {
  logger.info("Connected to OBS Websocket!");
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
  const rewardItems = await obs.call("GetGroupSceneItemList", { sceneName: "Channel Point Rewards"});
  const penguinIndex = rewardItems.sceneItems.findIndex((x) => {
    return x.sourceName === "Penguins";
  });
  if (penguinIndex >= 0) {
    await obs.call("SetSceneItemEnabled", {
      sceneName: "Channel Point Rewards",
      sceneItemId: rewardItems.sceneItems[penguinIndex].sceneItemId,
      sceneItemEnabled: enable,
    });
    return true;
  } else {
    return false;
  }
}

module.exports = { toggleChatHead, penguins };
