'use strict';
const benchmarks = require('../research/benchmarks.json');
function typingResearchContext() {
  return benchmarks.datasets.filter((dataset) => dataset.metrics?.dwellMs).map((dataset) => {
    const metric = dataset.metrics.dwellMs;
    return `${dataset.name}: participant median hold-time reference p10 ${metric.p10}, median ${metric.median}, p90 ${metric.p90} ms, n=${metric.n}.`;
  }).concat('These cohorts and typing tasks differ from this user. Context only: never infer a diagnosis, medical risk, or population health status.').join('\n');
}
function activityResearchContext() {
  const dataset = benchmarks.datasets.find((entry) => entry.id === 'swell');
  const lines = Object.entries(dataset.conditions).map(([condition, metrics]) => `${condition}: reference participant median keyboard events/min ${metrics.keyboardEventsPerMinute.median}, left clicks/min ${metrics.leftClicksPerMinute.median}.`);
  return ['SWELL-KW public office-task research reference:', ...lines, 'The study used different event definitions and controlled tasks. Counts cannot diagnose stress, burnout, depression, or migraine and do not establish an accuracy gain.'].join('\n');
}
function weatherContextText(weather) {
  if (!weather || typeof weather !== 'object' || Array.isArray(weather)) return '';
  const fields = ['meanHpa', 'minHpa', 'maxHpa', 'changeHpa'];
  if (!fields.every((key) => typeof weather[key] === 'number' && Number.isFinite(weather[key]))) return '';
  if (fields.slice(0, 3).some((key) => weather[key] < 200 || weather[key] > 1100) || Math.abs(weather.changeHpa) > 900) return '';
  return `Optional modeled pressure context: mean ${weather.meanHpa}, min ${weather.minHpa}, max ${weather.maxHpa}, change ${weather.changeHpa} hPa. Weather is context only, never evidence of migraine or an aura.`;
}
module.exports = { benchmarks, typingResearchContext, activityResearchContext, weatherContextText };
