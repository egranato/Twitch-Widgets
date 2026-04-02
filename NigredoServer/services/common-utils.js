/**
 * Common Utility Functions
 * Shared helpers for file paths, random numbers, and other utilities
 */
const path = require('path');

const createMp3FileName = (id) => {
  return path.join(__dirname, '..', 'public', 'assets', 'audio', id + '.mp3');
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

module.exports = {
  createMp3FileName,
  getRandom,
  runRandomly,
};
