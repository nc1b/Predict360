'use strict';

const { FEATURES } = require('./config');

function timingInputs(features, baseline) {
  return FEATURES.map((name) => Math.log1p(features[name].value) - Math.log1p(baseline.features[name].value));
}

function predictTiming(inputs, weights) {
  const logit = inputs.reduce((sum, input, i) => sum + input * weights[i + 1], weights[0]);
  return logit >= 0 ? 'different' : 'usual';
}

module.exports = { timingInputs, predictTiming };

