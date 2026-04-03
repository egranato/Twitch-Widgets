/**
 * Twitch API Service
 * Handles EventSub subscriptions, channel points, badges, and user data retrieval
 */
require('dotenv').config({
  path: process.env.DOTENV_CONFIG_PATH || '.env',
});
const axios = require('axios').default;

const EVENTSUB_URL = 'https://api.twitch.tv/helix/eventsub/subscriptions';
const CHANNEL_POINTS_URL = 'https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions';
const BADGES_URL = 'https://api.twitch.tv/helix/chat/badges';
const USERS_URL = 'https://api.twitch.tv/helix/users';

const getApiHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Client-Id': process.env.CLIENT_ID,
});

const subscribeToPubSubEvent = (token, sessionId, userId, type, version) => {
  return new Promise((resolve, reject) => {
    const body = {
      type,
      version,
      condition: {
        broadcaster_user_id: userId,
        moderator_user_id: userId,
      },
      transport: {
        method: 'websocket',
        session_id: sessionId,
      },
    };

    axios
      .post(EVENTSUB_URL, body, {
        headers: getApiHeaders(token),
        'Content-Type': 'application/json',
      })
      .then(({ data }) => resolve(data))
      .catch(reject);
  });
};

const subscribeToFollow = (token, sessionId, userId) => {
  return subscribeToPubSubEvent(token, sessionId, userId, 'channel.follow', '2');
};

const subscribeToChannelPointRedemptions = (token, sessionId, userId) => {
  return subscribeToPubSubEvent(
    token,
    sessionId,
    userId,
    'channel.channel_points_custom_reward_redemption.add',
    '1'
  );
};

const completeChannelPointRewardRequest = (token, channelId, id, rewardId, success = true) => {
  return new Promise((resolve, reject) => {
    const url = `${CHANNEL_POINTS_URL}?broadcaster_id=${channelId}&reward_id=${rewardId}&id=${id}`;
    const body = { status: success ? 'FULFILLED' : 'CANCELED' };

    axios
      .patch(url, body, {
        headers: getApiHeaders(token),
      })
      .then(({ data }) => {
        resolve(data.data ? data.data[0] : data);
      })
      .catch((error) => {
        const errorInfo = {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: url,
          body: body,
        };
        reject(Object.assign(error, { debugInfo: errorInfo }));
      });
  });
};

const getGlobalBadges = (token) => {
  return new Promise((resolve, reject) => {
    const url = `${BADGES_URL}/global`;

    axios
      .get(url, {
        headers: getApiHeaders(token),
      })
      .then(({ data }) => {
        resolve(data.data);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const getChannelBadges = (token, userId) => {
  return new Promise((resolve, reject) => {
    const url = `${BADGES_URL}?broadcaster_id=${userId}`;

    axios
      .get(url, {
        headers: getApiHeaders(token),
      })
      .then(({ data }) => {
        resolve(data.data);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const getBadges = (token, userId) => {
  return new Promise((resolve, reject) => {
    Promise.all([getGlobalBadges(token), getChannelBadges(token, userId)])
      .then(([globalBadges, channelBadges]) => {
        const badges = globalBadges;
        channelBadges.forEach((badge) => {
          const exIndex = badges.findIndex((ebad) => ebad.set_id === badge.set_id);
          if (exIndex > -1) {
            badges.splice(exIndex, 1);
          }
          badges.push(badge);
        });

        badges.sort((a, b) => {
          if (a.set_id > b.set_id) return 1;
          if (a.set_id < b.set_id) return -1;
          return 0;
        });

        resolve(badges);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const getUserData = (token) => {
  return new Promise((resolve, reject) => {
    const url = `${USERS_URL}?login=${process.env.BOT_CHANNEL}`;

    axios
      .get(url, {
        headers: getApiHeaders(token),
      })
      .then(({ data }) => {
        resolve(data.data[0]);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

module.exports = {
  subscribeToFollow,
  subscribeToChannelPointRedemptions,
  completeChannelPointRewardRequest,
  getBadges,
  getUserData,
};
