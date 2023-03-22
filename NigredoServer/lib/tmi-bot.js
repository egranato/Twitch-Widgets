require("dotenv").config();
const tmi = require("tmi.js");

const client = new tmi.Client({
  options: { debug: true },
  identity: {
    username: process.env.BOT_USERNAME,
    password: process.env.BOT_TOKEN,
  },
  channels: [process.env.BOT_CHANNEL],
});

client.connect().catch(console.error);

module.exports = client;
