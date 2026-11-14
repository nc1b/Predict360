'use strict';

const path = require('node:path');
const express = require('express');
const { LIMITS } = require('./config');
const { validateAnalyzeRequest } = require('./validate');
const { analyze } = require('./scoring');

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
      .json(errorBody('not_found', 'Unknown route. Available: GET /health, POST /api/analyze.'));
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
