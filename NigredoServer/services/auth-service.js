/**
 * Authentication Service
 * Handles OAuth token management for Twitch API
 */
require('dotenv').config();
const axios = require('axios').default;
const fs = require('fs');
const querystring = require('querystring');

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const CREDS_FILE = 'user-creds.json';

const getAppCreds = () => {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams();
    body.set('client_id', process.env.CLIENT_ID);
    body.set('client_secret', process.env.CLIENT_SECRET);
    body.set('grant_type', 'client_credentials');

    axios
      .post(TWITCH_TOKEN_URL, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      .then((result) => {
        resolve(result.data.access_token);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const getUserCreds = (authCode) => {
  return new Promise((resolve, reject) => {
    const body = {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code: authCode,
      grant_type: 'authorization_code',
      redirect_uri: 'http://localhost:3000/api/authreturn',
    };

    axios
      .post(TWITCH_TOKEN_URL, querystring.stringify(body))
      .then(({ data }) => {
        fs.writeFileSync(CREDS_FILE, JSON.stringify(data));
        resolve(true);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const refreshUserCreds = (refreshToken) => {
  return new Promise((resolve, reject) => {
    const body = {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    };

    axios
      .post(TWITCH_TOKEN_URL, querystring.stringify(body))
      .then(({ data }) => {
        fs.writeFileSync(CREDS_FILE, JSON.stringify(data));
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

module.exports = {
  getAppCreds,
  getUserCreds,
  refreshUserCreds,
};
