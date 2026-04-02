/**
 * Fishing Feature
 * Handles !fish command - players attempt to catch fish with random types and sizes
 */
const stateManager = require('./state-manager');
const path = require('path');

const FISH_SPECIES = [
  { name: 'Bass', minSize: 20, maxSize: 65, rarity: 'common' },
  { name: 'Trout', minSize: 15, maxSize: 50, rarity: 'common' },
  { name: 'Pike', minSize: 40, maxSize: 120, rarity: 'uncommon' },
  { name: 'Salmon', minSize: 45, maxSize: 90, rarity: 'uncommon' },
  { name: 'Catfish', minSize: 30, maxSize: 150, rarity: 'uncommon' },
  { name: 'Perch', minSize: 10, maxSize: 30, rarity: 'common' },
  { name: 'Carp', minSize: 35, maxSize: 130, rarity: 'uncommon' },
  { name: 'Goldfish', minSize: 5, maxSize: 15, rarity: 'rare' },
  { name: 'Legendary Sturgeon', minSize: 200, maxSize: 300, rarity: 'legendary' },
  { name: 'Albino Koi', minSize: 60, maxSize: 100, rarity: 'legendary' },
];

// Base catch rates - higher rarity = lower chance
const RARITY_CATCH_RATES = {
  common: 0.65,
  uncommon: 0.35,
  rare: 0.15,
  legendary: 0.02,
};

const OVERALL_SUCCESS_RATE = 0.10; // 10% chance of catching something (1 in 10)
const COOLDOWN_DURATION_MS = 30000; // 30 seconds between attempts

// In-memory cooldown tracking - { username: lastAttemptTimestamp }
const userCooldowns = {};

/**
 * Initialize fishing stats if not already done
 */
const initializeFishingStats = () => {
  const existingStats = stateManager.get('fishingStats');
  if (!existingStats) {
    const initialStats = {
      global: {
        totalAttempts: 0,
        totalCatches: 0,
        largestCatch: null,
      },
      players: {}, // { username: { attempts, catches, personalBest } }
    };
    stateManager.set('fishingStats', initialStats);
    return initialStats;
  }
  return existingStats;
};

/**
 * Get or create player stats
 */
const getPlayerStats = (username) => {
  let stats = stateManager.get('fishingStats');
  if (!stats) {
    stats = initializeFishingStats();
  }

  if (!stats.players[username]) {
    stats.players[username] = {
      attempts: 0,
      catches: 0,
      personalBest: null,
    };
    stateManager.set('fishingStats', stats);
  }

  return stats.players[username];
};

/**
 * Select a random fish based on rarity-weighted catch rates
 */
const selectRandomFish = () => {
  // Try to catch each fish in order, weighted by rarity
  for (const fish of FISH_SPECIES) {
    if (Math.random() < RARITY_CATCH_RATES[fish.rarity]) {
      return fish;
    }
  }
  // If all fail, return a common fish
  return FISH_SPECIES[0];
};

/**
 * Generate random fish size within species range
 */
const generateFishSize = (fish) => {
  const min = fish.minSize;
  const max = fish.maxSize;
  return Math.round((Math.random() * (max - min) + min) * 10) / 10; // Round to 1 decimal
};

/**
 * Check if user is on cooldown
 */
const isOnCooldown = (username) => {
  const lastAttempt = userCooldowns[username];
  if (!lastAttempt) return false;

  const timeSinceLastAttempt = Date.now() - lastAttempt;
  return timeSinceLastAttempt < COOLDOWN_DURATION_MS;
};

/**
 * Get remaining cooldown time in seconds
 */
const getCooldownRemaining = (username) => {
  const lastAttempt = userCooldowns[username];
  if (!lastAttempt) return 0;

  const remaining = COOLDOWN_DURATION_MS - (Date.now() - lastAttempt);
  return Math.max(0, Math.ceil(remaining / 1000));
};

/**
 * Set user cooldown
 */
const setCooldown = (username) => {
  userCooldowns[username] = Date.now();
};

/**
 * Main fishing function - handles the !fish command
 */
const catchFish = (username) => {
  // Check cooldown
  if (isOnCooldown(username)) {
    const remaining = getCooldownRemaining(username);
    return {
      success: false,
      onCooldown: true,
      message: `${username}, your line is still reeling in! Wait ${remaining}s before trying again.`,
      emoji: '⏳',
    };
  }

  // Initialize stats if needed
  initializeFishingStats();
  
  let stats = stateManager.get('fishingStats');
  const playerStats = getPlayerStats(username);

  // Set cooldown for this user
  setCooldown(username);

  // Increment attempts
  stats.global.totalAttempts++;
  playerStats.attempts++;

  // Check if line breaks (90% chance of failure)
  if (Math.random() > OVERALL_SUCCESS_RATE) {
    stateManager.set('fishingStats', stats);
    return {
      success: false,
      message: `${username} cast their line... but it snapped! No fish today.`,
      emoji: '🎣💔',
    };
  }

  // Try to catch a fish
  const fish = selectRandomFish();
  const size = generateFishSize(fish);

  // Track the catch
  stats.global.totalCatches++;
  playerStats.catches++;

  // Check if it's the largest catch overall
  const isNewRecord =
    !stats.global.largestCatch ||
    size > stats.global.largestCatch.size;

  if (isNewRecord) {
    stats.global.largestCatch = {
      username,
      fish: fish.name,
      size,
      timestamp: new Date().toISOString(),
    };
  }

  // Check if it's player's personal best
  const isPersonalBest =
    !playerStats.personalBest ||
    size > playerStats.personalBest.size;

  if (isPersonalBest) {
    playerStats.personalBest = {
      fish: fish.name,
      size,
      timestamp: new Date().toISOString(),
    };
  }

  stateManager.set('fishingStats', stats);

  // Format result message
  let message = `${username} caught a ${fish.name} (${size}cm)!`;
  let emoji = '🎣✨';

  if (isNewRecord) {
    message += ` NEW STREAM RECORD!`;
    emoji = '🎣🏆';
  } else if (isPersonalBest) {
    message += ` Personal Best!`;
    emoji = '🎣⭐';
  }

  return {
    success: true,
    fish: fish.name,
    size,
    isNewRecord,
    isPersonalBest,
    message,
    emoji,
  };
};

/**
 * Get global fishing stats
 */
const getGlobalStats = () => {
  const stats = stateManager.get('fishingStats') || initializeFishingStats();
  return stats.global;
};

/**
 * Get player-specific stats
 */
const getPlayerFishingStats = (username) => {
  const stats = stateManager.get('fishingStats') || initializeFishingStats();
  return {
    ...stats.players[username] || { attempts: 0, catches: 0, personalBest: null },
  };
};

module.exports = {
  catchFish,
  getGlobalStats,
  getPlayerFishingStats,
  initializeFishingStats,
};