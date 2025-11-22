// stateManager.js
// Utility for reading and updating keys in state/state.json with auto (de)serialization of non-primitives
const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, '../state/state.json');

function ensureStateFile() {
  if (!fs.existsSync(STATE_PATH)) {
    fs.writeFileSync(STATE_PATH, '{}', 'utf8');
  }
}

function readState() {
  ensureStateFile();
  const raw = fs.readFileSync(STATE_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function get(key) {
  const state = readState();
  let value = state[key];
  // Try to parse if it's a stringified object/array
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object') return parsed;
    } catch {}
  }
  return value;
}

function set(key, value) {
  const state = readState();
  // Stringify non-primitives
  if (typeof value === 'object' && value !== null) {
    state[key] = JSON.stringify(value);
  } else {
    state[key] = value;
  }
  writeState(state);
}

module.exports = {
  get,
  set,
  readState,
  writeState,
};
