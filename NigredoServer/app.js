
require('dotenv').config();
const express = require('express');
const socketio = require('socket.io');
const twitchBot = require('./lib/tmi-bot');
const utilities = require('./lib/utilities');
const logger = require('./lib/logger');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const gtts = require('better-node-gtts').default;
const mp3Duration = require('./lib/mp3-duration');
const obs = require('./lib/obs');
const sleep = require('./utils/sleep');

const app = express();
const server = require('http').createServer(app);
// CORS for Angular dev
app.use(cors({ origin: 'http://localhost:4200' }));


// get global items that will be necessary for functioning later
utilities
  .getAppCreds()
  .then((appToken) => Promise.all([utilities.getUserData(appToken), appToken]))
  .then(([user, appToken]) => Promise.all([user, utilities.getBadges(appToken, user.id)]))
  .then(([user, allBadges]) => {
    if (!fs.existsSync('user-creds.json')) {
      logger.warning('NO USER CREDS FOUND PLEASE RUN AUTH FLOW: http://localhost:3000/auth');
      return;
    }
    let userCreds = JSON.parse(fs.readFileSync('user-creds.json').toString());

    // socket server to talk to widgets and tts client
    const io = new socketio.Server(server, { cors: { origin: 'http://localhost:4200' } });

    // Socket.io event handlers
    require('./sockets/index')(io, utilities, obs, gtts, mp3Duration, sleep, logger, userCreds, user, allBadges);

    // Twitch bot event handlers
    require('./twitch/botEvents')(twitchBot, io, utilities, obs, gtts, mp3Duration, sleep, logger, allBadges, userCreds, user);

    // Twitch PubSub (WebSocket) event handling
    require('./twitch/pubsub')(utilities, logger, obs, io, userCreds, user, sleep);
  });


// Express routes
const clientIdRoute = require('./routes/clientId');
const authRoute = require('./routes/auth');
app.use('/api', clientIdRoute);
app.use('/api', authRoute);
app.use(express.static('public/'));
app.get('*', (req, res) => {
  res.sendFile(path.resolve('public/index.html'));
});

// listen for crashes
process.on('uncaughtException', (error) => {
  logger.error(error.stack);
});

// start express/socket.io server
server.listen(3000);
