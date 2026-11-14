'use strict';

const path = require('node:path');
const express = require('express');
const { LIMITS } = require('./config');
const { validateAnalyzeRequest } = require('./validate');
const { analyze } = require('./scoring');
const ai = require('./ai');

function errorBody(code, message, details) {
  const error = { code, message };
  if (details) error.details = details;
  return { error };
}

/**
 * Build the Express app. Nothing is stored: each request is processed in memory
 * and discarded. The access log records method, path, status and duration only,
 * never request bodies.
 */
function createApp({ log = () => {}, corsOrigin = process.env.CORS_ORIGIN || '*', staticDir = null } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - started}ms`);
    });
    next();
  });

  // The frontend will be served from a different origin during development.
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', corsOrigin);
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'predict360-backend', version: '0.1.0' });
  });

  app.post(
    '/api/analyze',
    (req, res, next) => {
      if (!req.is('application/json')) {
        return res
          .status(415)
          .json(errorBody('unsupported_media_type', 'Send the body as JSON with Content-Type: application/json.'));
      }
      next();
    },
    express.json({ limit: LIMITS.maxBodyBytes }),
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
    '/api/explain',
    (req, res, next) => {
      if (!req.is('application/json')) {
        return res
          .status(415)
          .json(errorBody('unsupported_media_type', 'Send the body as JSON with Content-Type: application/json.'));
      }
      next();
    },
    express.json({ limit: 32 * 1024 }),
    async (req, res) => {
      if (!ai.isConfigured()) {
        return res
          .status(503)
          .json(errorBody('ai_unconfigured', 'AI explanations are not configured on this server.'));
      }
      const summaryText = ai.buildSummaryText(req.body && req.body.summary);
      if (!summaryText) {
        return res
          .status(400)
          .json(errorBody('invalid_request', 'Send { "summary": ... } from an /api/analyze response.'));
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const text = await ai.callAi(summaryText, { signal: controller.signal });
        res.json({ text });
      } catch (err) {
        log(`error ai ${(err && err.name) || 'unknown'}`);
        res.status(502).json(errorBody('ai_error', "Couldn't get an explanation right now. Please try again."));
      } finally {
        clearTimeout(timer);
      }
    }
  );

  // Optional: serve the built frontend (web/dist) so one process runs the whole demo.
  if (staticDir) {
    app.use(express.static(staticDir));
    app.use((req, res, next) => {
      const wantsPage = req.method === 'GET' && !req.path.startsWith('/api') && req.accepts('html');
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
        .json(errorBody('payload_too_large', `Request body exceeds ${LIMITS.maxBodyBytes} bytes.`));
    }
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json(errorBody('invalid_json', 'Request body is not valid JSON.'));
    }
    // Log the error type only: parser messages can quote the request body.
    log(`error ${(err && (err.type || err.name)) || 'unknown'}`);
    res.status(500).json(errorBody('internal_error', 'Unexpected server error.'));
  });

  return app;
}

module.exports = { createApp };
