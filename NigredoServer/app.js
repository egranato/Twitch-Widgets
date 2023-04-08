require("dotenv").config();
const express = require("express");
const WebSocketClient = require("websocket").client;
const socketio = require("socket.io");
const twitchBot = require("./lib/tmi-bot");
const utilities = require("./lib/utilities");
const logger = require("./lib/logger");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const gtts = require("better-node-gtts").default;

const app = express();
const server = require("http").createServer(app);
// cors for when angular is running in development
app.use(
  cors({
    origin: "http://localhost:4200",
  })
);

// get global items that will be nessicary for functioning later
utilities
  .getAppCreds()
  .then((appToken) => {
    // carry app token across incase it's needed later
    return Promise.all([
      utilities.getUserData(appToken),
      utilities.getGobalBadges(appToken),
      appToken,
    ]);
  })
  .then(([user, globalBadges, appToken]) => {
    if (!fs.existsSync("user-creds.json")) {
      logger.warning("NO USER CREDS FOUND PLEASE RUN AUTH FLOW");
      return;
    }

    let userCreds = JSON.parse(fs.readFileSync("user-creds.json").toString());

    // socket server to talk to widgets and tts client
    const io = new socketio.Server(server, {
      cors: {
        origin: "http://localhost:4200",
      },
    });

    io.on("connection", (connection) => {
      logger.info("IO Client Connected!");

      // tell twitch we've fulfilled the channel point reward
      connection.on("point-fulfill", ({ id, rewardId }) => {
        utilities
          .completeChannelPointRewardRequest(
            userCreds.access_token,
            user.id,
            rewardId,
            id
          )
          .catch(logger.error);
      });

      // delete tts generated mp3
      connection.on("tts-complete", (id) => {
        const filename = utilities.createMp3FileName(id);
        fs.unlinkSync(filename);
      });
    });

    twitchBot.on("message", (channel, data, message, self) => {
      if (self) return;
      // send chat messages to clients
      const messageEvent = utilities.formatMessageData(
        data,
        message,
        globalBadges
      );
      io.emit("message", messageEvent);

      // tts
      const filename = utilities.createMp3FileName(data.id);

      gtts.save(filename, message).then(() => {
        io.emit("tts-message", data.id);
      });
    });

    twitchBot.on(
      "subscription",
      (channel, username, methods, message, userstate) => {
        logger.info({ channel, username, methods, message, userstate });
      }
    );

    // twitchBot.on("emotesets", (sets, obj) => {
    //   console.log(sets);
    //   console.log(obj);
    // });

    // set up twitch pubsub socket
    const twitchClient = new WebSocketClient();

    const subscribeToFollow = (sessionId) => {
      return new Promise((resolve, reject) => {
        utilities
          .subscribeToFollow(userCreds.access_token, sessionId, user.id)
          .then((_) => {
            logger.info("Twitch Client Subscribed to Follow Events");
            resolve();
          })
          .catch((error) => {
            if (error.response.status === 401) {
              utilities
                .refreshUserCreds(userCreds.refresh_token)
                .then((newUserCreds) => {
                  userCreds = newUserCreds;
                  logger.info("Refreshed OAuth Token");
                  return subscribeToFollow(sessionId);
                })
                .then(resolve)
                .catch((error) => {
                  reject(error);
                });
            } else {
              reject(error);
            }
          });
      });
    };
    const subscribeToChannelPointRedemptions = (sessionId) => {
      utilities
        .subscribeToChannelPointRedemptions(
          userCreds.access_token,
          sessionId,
          user.id
        )
        .then((_) => {
          logger.info(
            "Twitch Client Subscribed to Channel Point Reward Events"
          );
        })
        .catch(logger.error);
    };

    twitchClient.on("connectFailed", function (error) {
      logger.info("Twitch Connect Error: " + error.toString());
    });

    twitchClient.on("connect", (connection) => {
      logger.info("Twitch Client Connected");

      connection.on("error", (error) => {
        logger.error("Twitch Connection Error: " + error.toString());
      });

      connection.on("close", () => {
        logger.warning("Twitch Connection Closed");
      });

      connection.on("message", (message) => {
        if (message.type === "utf8") {
          const messageData = JSON.parse(message.utf8Data);

          if (messageData.metadata.message_type === "notification") {
            switch (messageData.metadata.subscription_type) {
              case "channel.follow":
                const newFollower = messageData.payload.event.user_name;
                logger.info(`New Follower: ${newFollower}`);
                io.emit("follow", newFollower);
                break;
              case "channel.channel_points_custom_reward_redemption.add":
                const event = messageData.payload.event;
                logger.info(`Point redemption: ${event.reward.title}`);
                io.emit("point-redeem", event);
                break;
            }
          } else if (messageData.metadata.message_type === "session_welcome") {
            const sessionId = messageData.payload.session.id;
            subscribeToFollow(sessionId)
              .then((_) => {
                subscribeToChannelPointRedemptions(sessionId);
              })
              .catch(logger.error);
          }
        }
      });
    });

    // connect to twitch pubsub socket
    twitchClient.connect("wss://eventsub-beta.wss.twitch.tv/ws");
  });

// serve angular widgets for OBS
// cors is for development when angular is not running on 3000
app.get("/api/client-id", (req, res) => {
  res.send({ clientId: process.env.CLIENT_ID });
});
app.get("/api/authreturn", (req, res) => {
  const { code } = req.query;
  utilities
    .getUserCreds(code)
    .then((_) => {
      res.send(`<h1>Good to go!</h1>`);
    })
    .catch((error) => {
      res.send(`
        <h1>Error!</h1>
        <p>code: ${error.code}</p>
        <p>status: ${error.status}</p>
        <p>message: ${error.message}</p>
      `);
    });
});
app.use(express.static("public/"));
app.get("*", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

// start express/socket.io server
server.listen(3000);
