'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const STATE_DIR = path.join(os.homedir(), '.thunderid');
const STATE_FILE = path.join(STATE_DIR, 'state.json');

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(version, installPath) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({ version, installPath, installedAt: new Date().toISOString() }, null, 2)
  );
}

module.exports = { readState, writeState, STATE_DIR };
