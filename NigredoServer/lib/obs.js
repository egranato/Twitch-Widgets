const OBSWebSocket = require("obs-websocket-js").default;
const obs = new OBSWebSocket();

const logger = require("./logger");
const REWARD_GROUP_SCENE = "Channel Point Rewards";
const OBS_CONNECT_RETRY_DELAY_MS = 2000;
const OBS_CONNECT_MAX_STARTUP_RETRIES = 5;
const OBS_MEDIA_POLL_MS = 250;
const OBS_MEDIA_MAX_WAIT_MS = 300000;
const OBS_WEBSOCKET_HOST = process.env.OBS_WEBSOCKET_HOST || "127.0.0.1";
const OBS_WEBSOCKET_PORT = Number.parseInt(process.env.OBS_WEBSOCKET_PORT || "4455", 10);
const OBS_WEBSOCKET_PASSWORD = process.env.OBS_WEBSOCKET_PASSWORD || "";
const OBS_WEBSOCKET_URL = `ws://${OBS_WEBSOCKET_HOST}:${OBS_WEBSOCKET_PORT}`;

const connectionState = {
  connected: false,
  connecting: false,
  gaveUp: false,
  retryCount: 0,
  maxRetries: OBS_CONNECT_MAX_STARTUP_RETRIES,
  lastError: "",
  lastAttemptAt: null,
  targetHost: OBS_WEBSOCKET_HOST,
  targetPort: OBS_WEBSOCKET_PORT,
  targetUrl: OBS_WEBSOCKET_URL,
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getConnectionStatus = () => ({
  ...connectionState,
});

const tryConnectOnce = async () => {
  if (connectionState.connected) {
    return true;
  }

  if (connectionState.connecting) {
    return false;
  }

  connectionState.connecting = true;
  connectionState.lastAttemptAt = new Date().toISOString();

  try {
    await obs.connect(OBS_WEBSOCKET_URL, OBS_WEBSOCKET_PASSWORD || undefined);
    connectionState.connected = true;
    connectionState.gaveUp = false;
    connectionState.lastError = "";
    logger.info(`Connected to OBS Websocket at ${OBS_WEBSOCKET_URL}`);
    return true;
  } catch (error) {
    connectionState.connected = false;
    connectionState.lastError = error.message;
    return false;
  } finally {
    connectionState.connecting = false;
  }
};

const connectWithStartupRetries = async () => {
  connectionState.gaveUp = false;
  connectionState.retryCount = 0;

  for (let attempt = 1; attempt <= OBS_CONNECT_MAX_STARTUP_RETRIES; attempt += 1) {
    connectionState.retryCount = attempt;
    const connected = await tryConnectOnce();
    if (connected) {
      return true;
    }

    logger.warning(
      `OBS websocket connect attempt ${attempt}/${OBS_CONNECT_MAX_STARTUP_RETRIES} failed: ${connectionState.lastError}`,
    );

    if (attempt < OBS_CONNECT_MAX_STARTUP_RETRIES) {
      await delay(OBS_CONNECT_RETRY_DELAY_MS);
    }
  }

  connectionState.gaveUp = true;
  logger.warning("OBS websocket unavailable after startup retries; manual reconnect is required.");
  return false;
};

const connectManual = async () => {
  connectionState.gaveUp = false;
  const connected = await tryConnectOnce();
  if (!connected) {
    connectionState.gaveUp = true;
  }
  return {
    ok: connected,
    status: getConnectionStatus(),
  };
};

obs.on("ConnectionClosed", () => {
  connectionState.connected = false;
  connectionState.connecting = false;
  logger.warning("OBS websocket disconnected.");
});

connectWithStartupRetries().catch((error) => {
  connectionState.connected = false;
  connectionState.connecting = false;
  connectionState.gaveUp = true;
  connectionState.lastError = error.message;
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

const waitForMediaSourceEnd = async (sourceName) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < OBS_MEDIA_MAX_WAIT_MS) {
    const status = await obs.call("GetMediaInputStatus", { inputName: sourceName });
    const state = String(status?.mediaState || '').toUpperCase();
    const duration = Number(status?.mediaDuration || 0);
    const cursor = Number(status?.mediaCursor || 0);

    if (state.includes('ENDED') || state.includes('STOPPED')) {
      return true;
    }

    if (duration > 0 && cursor >= duration - 50) {
      return true;
    }

    await delay(OBS_MEDIA_POLL_MS);
  }

  return false;
};

const playRewardSource = async (sourceName, durationMs = null) => {
  let success = await toggleRewardSource(sourceName, true);
  if (!success) {
    return false;
  }

  const hasFixedDuration = Number.isInteger(durationMs) && durationMs > 0;

  if (hasFixedDuration) {
    await delay(durationMs);
  } else {
    try {
      const ended = await waitForMediaSourceEnd(sourceName);
      if (!ended) {
        logger.warning(
          `OBS source '${sourceName}' did not report media end in time; using fallback timeout`,
        );
        await delay(4500);
      }
    } catch (error) {
      logger.warning(
        `OBS source '${sourceName}' does not expose media status; using fallback timeout (${error.message})`,
      );
      await delay(4500);
    }
  }

  success = await toggleRewardSource(sourceName, false);
  return success;
};

module.exports = {
  toggleChatHead,
  penguins,
  toggleRewardSource,
  playRewardSource,
  getConnectionStatus,
  connectManual,
};
