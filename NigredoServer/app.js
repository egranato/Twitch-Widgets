
require('dotenv').config({
  path: process.env.DOTENV_CONFIG_PATH || '.env',
});
const express = require('express');
const socketio = require('socket.io');
const twitchBot = require('./lib/tmi-bot');
const logger = require('./lib/logger');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const gtts = require('better-node-gtts').default;
const mp3Duration = require('./lib/mp3-duration');
const obs = require('./lib/obs');
const sleep = require('./utils/sleep');

const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const AUTH_URL = `http://localhost:${PORT}/auth`;
const USER_CREDS_PATH = process.env.USER_CREDS_PATH || 'user-creds.json';

// Services
const authService = require('./services/auth-service');
const twitchApi = require('./services/twitch-api');
const createContainer = require('./services/container');
const createObsRewardRegistry = require('./services/obs-reward-registry');
const createAlertAudioConfig = require('./services/alert-audio-config');

const app = express();
const server = require('http').createServer(app);
// CORS for Angular dev
app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

const obsRewardRegistry = createObsRewardRegistry({ logger });
const alertAudioConfig = createAlertAudioConfig({
  logger,
  serverRoot: path.resolve(__dirname),
  followAudioFilePath: process.env.FOLLOW_AUDIO_FILE_PATH,
  subscriptionAudioFilePath: process.env.SUBSCRIPTION_AUDIO_FILE_PATH,
});
alertAudioConfig.logMissingConfiguredFiles();


// get global items that will be necessary for functioning later
authService
  .getAppCreds()
  .then((appToken) => Promise.all([twitchApi.getUserData(appToken), appToken]))
  .then(([user, appToken]) => Promise.all([user, twitchApi.getBadges(appToken, user.id)]))
  .then(([user, allBadges]) => {
    if (!fs.existsSync(USER_CREDS_PATH)) {
      logger.warning(`NO USER CREDS FOUND PLEASE RUN AUTH FLOW: ${AUTH_URL}`);
      return;
    }
    let userCreds = JSON.parse(fs.readFileSync(USER_CREDS_PATH).toString());

    // socket server to talk to widgets and tts client
    const io = new socketio.Server(server, { cors: { origin: 'http://localhost:4200' } });

    // Create dependency container
    const container = createContainer({
      io,
      logger,
      obs,
      gtts,
      mp3Duration,
      sleep,
      userCreds,
      user,
      allBadges,
      obsRewardRegistry,
      alertAudioConfig,
    });

    // Socket.io event handlers
    require('./sockets/index')(container);

    // Audio Manager socket handlers
    const audioManagerHandlers = require('./sockets/audio-manager')(container);
    container.audioManagerHandlers = audioManagerHandlers;
    container.rewardDisplayQueue.setAudioEnqueue(audioManagerHandlers.enqueueAudio);

    // Audio Control socket handlers (test, mute, diagnostics)
    const audioControlHandlers = require('./sockets/audio-control')(container);
    container.audioControlHandlers = audioControlHandlers;

    // Make container available to HTTP routes
    appContainer = container;

    // Twitch bot event handlers
    require('./twitch/botEvents')(twitchBot, container);

    // Twitch PubSub (WebSocket) event handling
    require('./twitch/pubsub')(container);
  });


// Express routes
const clientIdRoute = require('./routes/clientId');
const authRoute = require('./routes/auth');
const audioManagerRoute = require('./routes/audio-manager');
const audioControlRoute = require('./routes/audio-control');

// Middleware to attach container to request once available
let appContainer = null;
app.use((req, res, next) => {
  req.container = appContainer;
  next();
});

app.use('/api', clientIdRoute);
app.use('/api', authRoute);
app.use('/api', audioControlRoute);
app.use('/', audioManagerRoute);
app.use(express.static('public/'));
app.get('*', (req, res) => {
  res.sendFile(path.resolve('public/index.html'));
});

// listen for crashes
process.on('uncaughtException', (error) => {
  logger.error(`UNCAUGHT EXCEPTION: ${error.message}\n${error.stack}`);
  console.error('Uncaught Exception - check /output/error.txt for details');
});

// listen for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  const errorStack = reason instanceof Error ? reason.stack : '';
  logger.error(`UNHANDLED REJECTION: ${errorMessage}\n${errorStack}\nPromise: ${promise}`);
  console.error('Unhandled Rejection - check /output/error.txt for details');
});

// start express/socket.io server
server.listen(PORT);
