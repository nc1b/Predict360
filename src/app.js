'use strict';

const path = require('node:path');
const express = require('express');
const { LIMITS } = require('./config');
const { validateAnalyzeRequest } = require('./validate');
const { analyze } = require('./scoring');
const ai = require('./ai');
const { validateActivityRequest, analyzeActivity } = require('./activity');
const { benchmarks, weatherContextText } = require('./research');
const { validateWeather, getWeatherContext } = require('./weather');
const { verifyAiRequest } = require('./auth');

function errorBody(code, message, details) {
  const error = { code, message };
  if (details) error.details = details;
  return { error };
}

function jsonBody(limit) {
  return [
    (req, res, next) => {
      if (!req.is('application/json')) {
        return res.status(415).json(errorBody('unsupported_media_type', 'Send the body as JSON with Content-Type: application/json.'));
      }
      next();
    },
    // Parse primitives too so the schema validator gives a consistent 400.
    // Disallow compressed uploads to keep the byte limit a predictable CPU bound.
    express.json({ limit, strict: false, inflate: false }),
  ];
}

/**
 * Build the Express app. Nothing is stored: each request is processed in memory
 * and discarded. The access log records method, path, status and duration only,
 * never request bodies.
 */
function createApp({ log = () => {}, corsOrigin = process.env.CORS_ORIGIN || '*', staticDir = null,
  aiClient = ai, aiTimeoutMs = 15000, maxAiConcurrent = 4, authenticateAi = verifyAiRequest } = {}) {
  const app = express();
  let aiInFlight = 0;
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      // A caller can put private text in an unknown URL. Log matched route names
      // only, never arbitrary paths or query strings.
      log(`${req.method} ${req.route?.path || '[unmatched]'} ${res.statusCode} ${Date.now() - started}ms`);
    });
    next();
  });

  // The frontend will be served from a different origin during development.
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    if (/^\/api(?:\/|$)/.test(req.path) || req.path === '/health') res.set('Cache-Control', 'no-store');
    res.set('Access-Control-Allow-Origin', corsOrigin);
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'predict360-backend', version: '0.1.0' });
  });
  app.get('/api/research', (req, res) => res.json(benchmarks));
  app.post('/api/weather/context', jsonBody(4096), async (req, res) => {
    if (!validateWeather(req.body)) return res.status(400).json(errorBody('invalid_request', 'Send a city name and a valid past or current date (YYYY-MM-DD).'));
    try {
      const context = await getWeatherContext(req.body);
      if (!context) return res.status(404).json(errorBody('weather_missing', 'No pressure data found for that city and date.'));
      res.json(context);
    } catch { res.status(502).json(errorBody('weather_unavailable', 'Weather context is unavailable. Please try again later.')); }
  });

  app.post(
    '/api/activity/analyze',
    jsonBody(LIMITS.maxBodyBytes),
    (req, res) => {
      const errors = validateActivityRequest(req.body);
      if (errors.length) return res.status(400).json(errorBody('invalid_request', 'Invalid activity summary.', errors));
      res.json(analyzeActivity(req.body));
    }
  );

  app.post(
    '/api/analyze',
    jsonBody(LIMITS.maxBodyBytes),
    (req, res) => {
      const result = validateAnalyzeRequest(req.body);
      if (result.errors.length > 0) {
        const more = result.truncated ? ` Showing the first ${result.errors.length}.` : '';
        return res
          .status(400)
          .json(errorBody('invalid_request', `The request has validation problems.${more}`, result.errors));
      }
      res.json(analyze(req.body));
    }
  );

  // Optional: a plain-language explanation of a result, via the Hack Club AI proxy.
  // Only numbers are forwarded to the model (see ai.js); never text or keystrokes.
  app.post(
    ['/api/explain', '/api/activity/explain'],
    jsonBody(LIMITS.maxExplainBodyBytes),
    async (req, res) => {
      if (!aiClient.isConfigured()) {
        return res
          .status(503)
          .json(errorBody('ai_unconfigured', 'AI explanations are not configured on this server.'));
      }
      try {
        if (!await authenticateAi(req)) return res.status(401).json(errorBody('unauthorized', 'Sign in to request an explanation.'));
      } catch { return res.status(503).json(errorBody('auth_unavailable', 'Could not verify your account. Please try again.')); }
      const activity = req.path === '/api/activity/explain';
      if (activity) {
        const errors = validateActivityRequest(req.body);
        if (errors.length) return res.status(400).json(errorBody('invalid_request', 'Invalid activity summary.', errors));
      }
      let summaryText = activity ? aiClient.buildActivitySummaryText(analyzeActivity(req.body)) : aiClient.buildSummaryText(req.body && req.body.summary);
      if (!summaryText) {
        return res
          .status(400)
          .json(errorBody('invalid_request', 'Send { "summary": ... } from an /api/analyze response.'));
      }
      if (!activity) summaryText += '\n' + weatherContextText(req.body?.weather);
      if (aiInFlight >= maxAiConcurrent) {
        res.set('Retry-After', '5');
        return res.status(429).json(errorBody('ai_busy', 'Explanations are busy. Please try again shortly.'));
      }
      aiInFlight++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), aiTimeoutMs);
      const onClose = () => { if (!res.writableEnded) controller.abort(); };
      res.on('close', onClose);
      try {
        const text = await aiClient.callAi(summaryText, { signal: controller.signal, mode: activity ? 'activity' : 'typing' });
        res.json({ text });
      } catch (err) {
        log('error ai');
        if (!res.destroyed) {
          const timedOut = controller.signal.aborted;
          res.status(timedOut ? 504 : 502).json(errorBody(timedOut ? 'ai_timeout' : 'ai_error', "Couldn't get an explanation right now. Please try again."));
        }
      } finally {
        clearTimeout(timer);
        res.off('close', onClose);
        aiInFlight--;
      }
    }
  );

  // Optional: serve the built frontend (web/dist) so one process runs the whole demo.
  if (staticDir) {
    app.use(express.static(staticDir));
    app.use((req, res, next) => {
      const wantsPage = req.method === 'GET' && !/^\/api(?:\/|$)/.test(req.path) && !path.extname(req.path) && req.accepts('html');
      if (!wantsPage) return next();
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  app.use((req, res) => {
    res
      .status(404)
      .json(errorBody('not_found', 'Unknown route. Available: GET /health, POST /api/analyze, POST /api/explain.'));
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') {
      return res
        .status(413)
        .json(errorBody('payload_too_large', `Request body exceeds ${err.limit} bytes.`));
    }
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json(errorBody('invalid_json', 'Request body is not valid JSON.'));
    }
    if (err && ['encoding.unsupported', 'charset.unsupported'].includes(err.type)) {
      return res.status(415).json(errorBody('unsupported_media_type', 'Send uncompressed JSON encoded as UTF-8.'));
    }
    if (err && ['request.aborted', 'request.size.invalid'].includes(err.type)) {
      return res.status(400).json(errorBody('invalid_request', 'The request body was incomplete.'));
    }
    // Log the error type only: parser messages can quote the request body.
    log('error internal');
    res.status(500).json(errorBody('internal_error', 'Unexpected server error.'));
  });

  return app;
}

module.exports = { createApp };
