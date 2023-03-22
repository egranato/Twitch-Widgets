require("dotenv").config();
const axios = require("axios").default;
const fs = require("fs");
const path = require("path");

// session storage so I don't have to remake calls
const userImagesMap = {};
let appToken = null;

const getLatestVersion = () => {
  const sourceDir = path.resolve("../AlbedoClient/dist/albedo-client");
  const destinationDir = path.resolve("public");

  const newFiles = fs.readdirSync(sourceDir);
  newFiles.forEach((file) => {
    const ogPath = path.join(sourceDir, file);
    const newPath = path.join(destinationDir, file);

    fs.copyFileSync(ogPath, newPath);
  });
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
    if (appToken === null) {
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
    } else {
      resolve(appToken);
    }
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

const makeEmoteMap = (id, firstOccurance, message) => {
  const result = {
    id,
    emoteUrl: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/static/light/2.0`, //1.0,3.0 for smaller/bigger
  };

  const map = firstOccurance.split("-");
  const start = Number(map.shift());
  const end = Number(map.shift()) + 1;
  result.textToReplace = message.slice(start, end);

  return result;
};

const formatMessageData = (data, message) => {
  return new Promise((resolve, reject) => {
    const result = {
      userId: data["user-id"],
      displayName: data["display-name"],
      badges: data.badges,
      color: data.color,
      mod: data.mod,
      firstMsg: data["first-msg"],
      subscriber: data.subscriber,
      returningChatter: data["returning-chatter"],
      messageType: data["message-type"],
      message: message,
    };

    const emoteMap = [];
    if (data.emotes !== null) {
      Object.keys(data.emotes).forEach((emoteId) => {
        emoteMap.push(makeEmoteMap(emoteId, data.emotes[emoteId][0], message));
      });
    }

    result.messageHTML = message;
    emoteMap.forEach((map) => {
      const regExp = new RegExp(map.textToReplace, "g");
      result.messageHTML = result.messageHTML.replace(
        regExp,
        `<img src="${map.emoteUrl}" alt="Emote-${map.id}" />`
      );
    });
    result.messageHTML = result.messageHTML.replace(/\s\s+/g, " ");

    getUserImage(result.userId)
      .then((userImage) => {
        result.userImage = userImage;
        resolve(result);
      })
      .catch((error) => {
        console.log(error);
        result.userImage = null;
        resolve(result);
      });
  });
};

module.exports = {
  runRandomly,
  formatMessageData,
  getLatestVersion,
};
