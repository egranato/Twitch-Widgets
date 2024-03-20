const OBSWebSocket = require("obs-websocket-js").default;
const obs = new OBSWebSocket();

obs.connect().then(() => {
  console.log("Connected to OBS Websocket!");
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

module.exports = { toggleChatHead };
