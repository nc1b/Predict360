'use strict';

// Vercel serverless entry point: the same Express app, with no static serving
// (Vercel serves web/dist itself). See vercel.json for the routing.
const { createApp } = require('../src/app');

module.exports = createApp({ log: (line) => console.log(line) });
