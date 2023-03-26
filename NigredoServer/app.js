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
    // socket server to talk to widgets and tts client
    const io = new socketio.Server(server, {
      cors: {
        origin: "http://localhost:4200",
      },
    });

    io.on("connection", (connection) => {
      logger.info("IO Client Connected!");
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
    });

    twitchBot.on(
      "subscription",
      (channel, username, methods, message, userstate) => {
        console.log({ channel, username, methods, message, userstate });
      }
    );

    // twitchBot.on("emotesets", (sets, obj) => {
    //   console.log(sets);
    //   console.log(obj);
    // });

    // set up twitch pubsub socket
    const twitchClient = new WebSocketClient();
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
          if (
            messageData.metadata.message_type === "notification" &&
            messageData.metadata.subscription_type === "channel.follow"
          ) {
            io.emit("follow", messageData.payload.event.user_name);
          } else if (messageData.metadata.message_type === "session_welcome") {
            const sessionId = messageData.payload.session.id;

            if (!fs.existsSync("user-creds.json")) {
              logger.warning("NO USER CREDS FOUND PLEASE RUN AUTH FLOW");
              return;
            }

            const userCreds = JSON.parse(
              fs.readFileSync("user-creds.json").toString()
            );

            utilities
              .subscribeToFollow(userCreds.access_token, sessionId, user.id)
              .then((_) => {
                logger.info("Twitch Client Subscribed to Follow Events");
              })
              .catch((error) => {
                logger.error(error);
              });
          }
        }
      });
    });

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
