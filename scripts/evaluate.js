'use strict';

// Judging evidence: run every labeled fixture through the scoring algorithm and
// through a naive comparator that always returns 100 with no flags.
// Usage: npm run evaluate            (markdown table)
//        npm run evaluate -- --json  (raw results)

const { fixtures, baselineSessions } = require('../fixtures/synthetic');
const { analyze, naiveAnalyze } = require('../src/scoring');

function sameFlags(a, b) {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

function evaluate() {
  const baseline = { sessions: baselineSessions() };
  return fixtures().map((f) => {
    const result = analyze({ keystrokes: f.keystrokes, baseline });
    const naive = naiveAnalyze();
    return {
      name: f.name,
      label: f.label,
      confounder: f.confounder,
      expectedFlags: f.expectedFlags,
      features: {
        dwellMs: result.features.dwellMs.value,
        sentencePauseMs: result.features.sentencePauseMs.value,
        flightVolatilityMs: result.features.flightVolatilityMs.value,
      },
      algorithm: {
        readinessScore: result.readinessScore,
        status: result.status,
        flags: result.flags,
        matchesScript: sameFlags(result.flags, f.expectedFlags),
      },
      naive: {
        readinessScore: naive.readinessScore,
        flags: naive.flags,
        matchesScript: sameFlags(naive.flags, f.expectedFlags),
      },
    };
  });
}

function toMarkdown(rows) {
  const show = (flags) => (flags.length ? flags.join(', ') : 'none');
  const yn = (b) => (b ? 'yes' : 'no');
  const lines = [
    '| Fixture | Scripted change | Dwell ms | Pause ms | Volatility ms | Algorithm score | Algorithm flags | Algorithm matches script | Naive score | Naive flags | Naive matches script |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    lines.push(
      `| ${r.name} | ${show(r.expectedFlags)} | ${r.features.dwellMs} | ${r.features.sentencePauseMs} | ` +
        `${r.features.flightVolatilityMs} | ${r.algorithm.readinessScore} (${r.algorithm.status}) | ` +
        `${show(r.algorithm.flags)} | ${yn(r.algorithm.matchesScript)} | ${r.naive.readinessScore} | ` +
        `${show(r.naive.flags)} | ${yn(r.naive.matchesScript)} |`
    );
  }
  return lines.join('\n');
}

if (require.main === module) {
  const rows = evaluate();
  console.log(process.argv.includes('--json') ? JSON.stringify(rows, null, 2) : toMarkdown(rows));
}

module.exports = { evaluate, toMarkdown };
