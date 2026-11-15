'use strict';

const { createApp } = require('../src/app');

module.exports = createApp({ log: (line) => console.log(line) });
