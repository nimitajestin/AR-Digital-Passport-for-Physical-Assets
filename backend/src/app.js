'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const handlers = require('./routes');
const { errorBody } = require('./utils');

// Static frontend served same-origin as the API so the phone demo works over
// the hotspot with zero CORS or mixed-content issues (AR's default "/api" just works).
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
  app.use(express.json({ limit: '256kb' }));
  app.get('/health', async (req, res) => {
    try {
      // eslint-disable-next-line global-require
      const { store } = require('./db');
      const info = await store().health();
      res.json({ ok: true, ...info, time: new Date().toISOString() });
    } catch (e) {
      res.status(500).json({ ok: false, error: 'health check failed' });
    }
  });

  const api = express.Router();
  api.get('/assets', handlers.listAssets);
  // Marker lookup MUST be registered before /assets/:id (Express matches in order).
  api.get('/assets/marker/:markerId', handlers.getAssetByMarker);
  api.get('/assets/:id/maintenance', handlers.getMaintenance);
  api.get('/assets/:id', handlers.getAsset);
  api.post('/assets', handlers.createAsset);
  api.patch('/assets/:id', handlers.patchAsset);
  api.delete('/assets/:id', handlers.deleteAsset);
  api.get('/locations', handlers.listLocations);
  api.get('/issues', handlers.listIssues);
  api.post('/issues', handlers.createIssue);
  api.patch('/issues/:id/status', handlers.patchIssueStatus);
  app.use('/api', api);

  // 404 for unknown API routes — consistent JSON error.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} was not found` } });
  });

  // Static frontend (dashboard + AR). Registered AFTER /api so API routes
  // always win. Serves: / -> landing, /ar/, /dashboard/.
  app.use(express.static(FRONTEND_DIR, { index: 'index.html' }));

  // Central error handler. Only errors created via httpError() (which carry
  // an integer .status and a string .code) are trusted. Anything else —
  // e.g. raw pg driver errors — becomes a generic 500 so database internals
  // and stack traces never leak to clients.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const isAppError = err && Number.isInteger(err.status) && typeof err.code === 'string';
    const status = isAppError ? err.status : 500;
    if (config.nodeEnv !== 'test' || status === 500) {
      // eslint-disable-next-line no-console
      console.error(`[api] ${req.method} ${req.originalUrl} -> ${status} ${err.code || ''} ${err.message}`);
    }
    if (status === 500 && config.nodeEnv === 'production') {
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
    }
    res.status(status).json(errorBody(err));
  });

  return app;
}

module.exports = { createApp };
