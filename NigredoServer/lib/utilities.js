require("dotenv").config();
const axios = require("axios").default;
const fs = require("fs");
const querystring = require("querystring");

const getUserCreds = (authCode) => {
  return new Promise((resolve, reject) => {
    const url = "https://id.twitch.tv/oauth2/token";
    const body = {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code: authCode,
      grant_type: "authorization_code",
      redirect_uri: "http://localhost:3000/api/authreturn",
    };
    axios
      .post(url, querystring.stringify(body))
      .then(({ data }) => {
        // using a raw file because this app is not intended to ever be hosted on a server and only used locally, might ecrpyt eventually
        fs.writeFileSync("user-creds.json", JSON.stringify(data));
        resolve(true);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const subscribeToFollow = (token, sessionId, userId) => {
  return new Promise((resolve, reject) => {
    const url = "https://api.twitch.tv/helix/eventsub/subscriptions";
    const body = {
      type: "channel.follow",
      version: "2",
      condition: {
        broadcaster_user_id: userId,
        moderator_user_id: userId,
      },
      transport: {
        method: "websocket",
        session_id: sessionId,
      },
    };
    const options = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": process.env.CLIENT_ID,
        "Content-Type": "application/json",
      },
    };
    axios
      .post(url, body, options)
      .then(({ data }) => resolve(data))
      .catch(reject);
  });
};

const getGobalBadges = (token) => {
  return new Promise((resolve, reject) => {
    const url = "https://api.twitch.tv/helix/chat/badges/global";
    axios
      .get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": process.env.CLIENT_ID,
        },
      })
      .then(({ data }) => {
        resolve(data.data);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const getBadge = (id, version, badges) => {
  const binarySearch = (arr, x) => {
    const mid = Math.floor(arr.length / 2);
    if (arr.length === 1) {
      return arr[mid].set_id === x ? arr[mid].versions : null;
    }
    if (arr[mid].set_id === x) {
      return arr[mid].versions;
    }

    if (arr[mid].set_id > x) {
      const half = arr.slice(0, mid);
      return binarySearch(half, x);
    } else {
      const half = arr.slice(mid + 1, arr.length);
      return binarySearch(half, x);
    }
  };

  const badgeSet = binarySearch(badges, id);
  if (badgeSet === null) {
    return null;
  }
  const ver = badgeSet.find((v) => v.id == version);
  return ver.image_url_2x; // image_url_2x; image_url_4x; for bigger
};

const getRandom = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const runRandomly = (rarity, callback) => {
  if (getRandom(1, rarity) === 2) {
    callback();
  }
};

const getAppCreds = () => {
  return new Promise((resolve, reject) => {
    const url = "https://id.twitch.tv/oauth2/token";
    let body = new URLSearchParams();
    body.set("client_id", process.env.CLIENT_ID);
    body.set("client_secret", process.env.CLIENT_SECRET);
    body.set("grant_type", "client_credentials");
    axios
      .post(url, body, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })
      .then((result) => {
        appToken = result.data.access_token;
        resolve(appToken);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const getUserImage = (userId) => {
  return new Promise((resolve, reject) => {
    const existingUserImage = userImagesMap[userId];
    if (existingUserImage !== void 0) {
      resolve(existingUserImage);
    } else {
      const url = `https://api.twitch.tv/helix/users?id=${userId}`;
      getAppCreds()
        .then((token) => {
          return axios.get(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Client-Id": process.env.CLIENT_ID,
            },
          });
        })
        .then(({ data }) => {
          const userImage = data.data[0]?.profile_image_url;
          userImagesMap[userId] = userImage;
          resolve(userImage);
        })
        .catch((error) => {
          reject(error);
        });
    }
  });
};

const getUserData = (token) => {
  return new Promise((resolve, reject) => {
    const url = `https://api.twitch.tv/helix/users?login=${process.env.BOT_CHANNEL}`;
    const options = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": process.env.CLIENT_ID,
      },
    };
    axios
      .get(url, options)
      .then(({ data }) => {
        resolve(data.data[0]);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const generateEmotePlaceHolder = (index, length) => {
  let result = `${index}`;
  while (result.length < length) {
    result = "0" + result;
  }
  return result;
};

const formatMessage = (message, emotes) => {
  if (emotes) {
    let result = message;
    const emoteMap = [];
    Object.keys(emotes).forEach((emoteId, index) => {
      const emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/static/light/1.0`; // 2.0,3.0 for bigger
      const map = {
        html: `<img src="${emoteUrl}" alt="Emote-${emoteId}" />`,
      };

      emotes[emoteId].forEach((inst) => {
        const params = inst.split("-");
        const start = Number(params.shift());
        const end = Number(params.shift()) + 1;
        const length = end - start;
        map.placeholder = generateEmotePlaceHolder(index, length);
        result =
          result.substring(0, start) + map.placeholder + result.substring(end);
      });

      emoteMap.push(map);
    });

    emoteMap.forEach((emote) => {
      const regex = new RegExp(emote.placeholder, "g");
      result = result.replace(regex, emote.html);
    });

    return result.replace(/\s\s+/g, " ");
  }

  return message;
};

const formatMessageData = (data, message, badges) => {
  const result = {
    userId: data["user-id"],
    displayName: data["display-name"],
    color: data.color,
    mod: data.mod,
    firstMsg: data["first-msg"],
    subscriber: data.subscriber,
    returningChatter: data["returning-chatter"],
    messageType: data["message-type"],
    message: formatMessage(message, data.emotes),
    rawMessage: message,
    badges: "",
  };

  if (data.badges) {
    Object.keys(data.badges).forEach((b) => {
      const url = getBadge(b, data.badges[b], badges);
      if (url !== null) {
        result.badges += `<img src="${url}" alt="${b}-badge" /> `;
      }
    });
  }

  return result;
};

module.exports = {
  formatMessageData,
  getAppCreds,
  getGobalBadges,
  getLatestVersion,
  getUserData,
  subscribeToFollow,
  getUserCreds,
};
