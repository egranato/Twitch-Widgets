require("dotenv").config();
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const socketio = require("socket.io");
const twitchBot = require("./lib/tmi-bot");
const utilities = require("./lib/utilities");
const path = require("path");

// get newest FE widgets build
utilities.getLatestVersion();

// socket server to talk to widgets and tts client
const io = new socketio.Server(server, {
  cors: {
    origin: "http://localhost:4200",
  },
});

io.on("connection", (client) => {
  console.log("IO Client Connected!");
});

twitchBot.on("message", (channel, data, message, self) => {
  if (self) return;
  // send chat messages to clients
  utilities.formatMessageData(data, message).then((messageEvent) => {
    io.emit("message", messageEvent);
    // utilities.runRandomly(50, () => {
    //   twitchBot.say(channel, "Use !bounce ");
    // });
  });
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

// server angular widgets for OBS
app.use(express.static("public/"));
app.get("*", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

// start express/socket.io server
server.listen(3000);
