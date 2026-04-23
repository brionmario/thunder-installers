'use strict';

const fly = require('./fly');
const railway = require('./railway');
const render = require('./render');

function loadRecipes() {
  return [fly, railway, render];
}

module.exports = { loadRecipes };
