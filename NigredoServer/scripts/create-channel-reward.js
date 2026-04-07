#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios').default;
const querystring = require('querystring');
const dotenv = require('dotenv');

const serverRoot = path.resolve(__dirname, '..');
const defaultEnvPath = path.resolve(__dirname, '..', '.env');
const cwdEnvPath = path.resolve(process.cwd(), '.env');
const configuredEnvPath = process.env.DOTENV_CONFIG_PATH
  ? path.resolve(process.env.DOTENV_CONFIG_PATH)
  : null;

// Load in priority order: explicit path -> NigredoServer/.env -> cwd/.env
if (configuredEnvPath && fs.existsSync(configuredEnvPath)) {
  dotenv.config({ path: configuredEnvPath });
} else if (fs.existsSync(defaultEnvPath)) {
  dotenv.config({ path: defaultEnvPath });
} else {
  dotenv.config({ path: cwdEnvPath });
}

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_USERS_URL = 'https://api.twitch.tv/helix/users';
const TWITCH_CREATE_REWARD_URL = 'https://api.twitch.tv/helix/channel_points/custom_rewards';

function parseArgs(argv) {
  const args = {};
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = String(argv[i] || '');
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    i += 1;
  }

  // Fallback for positional format: "<title words>" <cost> "<prompt words>"
  if (!args.title && !args.cost && positional.length >= 2) {
    const costIndex = positional.findIndex((part) => /^\d+$/.test(part));
    if (costIndex > 0) {
      args.title = positional.slice(0, costIndex).join(' ').trim();
      args.cost = positional[costIndex];

      const prompt = positional.slice(costIndex + 1).join(' ').trim();
      if (prompt) {
        args.prompt = prompt;
      }
    }
  }

  return args;
}

function toBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }
  return String(value).toLowerCase() === 'true';
}

function toNumber(value, fallback = null) {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function getCredsPath() {
  const envPath = process.env.USER_CREDS_PATH || process.env.user_creds_path;
  if (envPath && String(envPath).trim()) {
    if (path.isAbsolute(envPath)) {
      return envPath;
    }
    return path.resolve(serverRoot, envPath);
  }
  return path.resolve(serverRoot, 'user-creds.json');
}

function readUserCreds(credsPath) {
  if (!fs.existsSync(credsPath)) {
    throw new Error(`user-creds file not found at ${credsPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  if (!raw.access_token || !raw.refresh_token) {
    throw new Error(`user-creds file is missing access_token or refresh_token (${credsPath})`);
  }

  return raw;
}

async function refreshUserCreds(refreshToken) {
  const body = {
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  };

  const { data } = await axios.post(TWITCH_TOKEN_URL, querystring.stringify(body));
  return data;
}

function getApiHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Client-Id': process.env.CLIENT_ID,
  };
}

async function getBroadcasterByLogin(token, login) {
  const { data } = await axios.get(`${TWITCH_USERS_URL}?login=${encodeURIComponent(login)}`, {
    headers: getApiHeaders(token),
  });

  const user = data?.data?.[0];
  if (!user || !user.id) {
    throw new Error(`unable to resolve broadcaster for login: ${login}`);
  }

  return user;
}

async function createReward(token, broadcasterId, payload) {
  const url = `${TWITCH_CREATE_REWARD_URL}?broadcaster_id=${encodeURIComponent(broadcasterId)}`;
  const { data } = await axios.post(url, payload, {
    headers: {
      ...getApiHeaders(token),
      'Content-Type': 'application/json',
    },
  });

  return data?.data?.[0] || null;
}

function buildRewardPayload(args) {
  const title = String(args.title || '').trim();
  const cost = toNumber(args.cost);

  if (!title) {
    throw new Error('missing required argument: --title');
  }

  if (!Number.isInteger(cost) || cost <= 0) {
    throw new Error('missing/invalid required argument: --cost (positive integer)');
  }

  const payload = {
    title,
    cost,
    is_enabled: toBoolean(args.enabled, true),
    is_user_input_required: toBoolean(args.userInputRequired, false),
  };

  if (args.prompt !== undefined) {
    payload.prompt = String(args.prompt);
  }

  if (args.backgroundColor !== undefined) {
    payload.background_color = String(args.backgroundColor);
  }

  const maxPerStream = toNumber(args.maxPerStream);
  if (maxPerStream !== null) {
    payload.is_max_per_stream_enabled = true;
    payload.max_per_stream = maxPerStream;
  }

  const maxPerUserPerStream = toNumber(args.maxPerUserPerStream);
  if (maxPerUserPerStream !== null) {
    payload.is_max_per_user_per_stream_enabled = true;
    payload.max_per_user_per_stream = maxPerUserPerStream;
  }

  const globalCooldown = toNumber(args.globalCooldownSeconds);
  if (globalCooldown !== null) {
    payload.is_global_cooldown_enabled = true;
    payload.global_cooldown_seconds = globalCooldown;
  }

  return payload;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const credsPath = getCredsPath();
  const payload = buildRewardPayload(args);

  if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
    throw new Error('CLIENT_ID and CLIENT_SECRET must be present in .env');
  }

  const broadcasterLogin = String(args.channel || process.env.BOT_CHANNEL || '').trim();
  if (!broadcasterLogin) {
    throw new Error('channel login missing: pass --channel or set BOT_CHANNEL in .env');
  }

  let creds = readUserCreds(credsPath);

  const tryCreate = async (token) => {
    const broadcaster = await getBroadcasterByLogin(token, broadcasterLogin);
    return createReward(token, broadcaster.id, payload);
  };

  try {
    const reward = await tryCreate(creds.access_token);
    if (!reward) {
      throw new Error('Twitch API returned no reward object');
    }
    console.log(`Created reward: ${reward.title} (id=${reward.id}, cost=${reward.cost})`);
    return;
  } catch (error) {
    if (error?.response?.status !== 401) {
      throw error;
    }
  }

  const refreshed = await refreshUserCreds(creds.refresh_token);
  const mergedCreds = {
    ...creds,
    ...refreshed,
  };
  fs.writeFileSync(credsPath, JSON.stringify(mergedCreds, null, 2), 'utf8');

  const reward = await tryCreate(mergedCreds.access_token);
  if (!reward) {
    throw new Error('Twitch API returned no reward object after token refresh');
  }

  console.log(`Created reward: ${reward.title} (id=${reward.id}, cost=${reward.cost})`);
}

run().catch((error) => {
  const apiMessage = error?.response?.data?.message;
  const message = apiMessage ? `${error.message}: ${apiMessage}` : error.message;
  console.error(`Failed to create reward: ${message}`);
  process.exit(1);
});
