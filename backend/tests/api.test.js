'use strict';

/**
 * Backend API tests (Dev 2).
 * Run: npm test  (from backend/)
 * Uses the in-memory store so no Postgres is required.
 */
process.env.USE_MEMORY_DB = 'true';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { createApp } = require('../src/app');
const { resetMemory } = require('../src/db');

let app;
beforeEach(() => { resetMemory(); app = createApp(); });

describe('assets', () => {
  test('asset creation (POST /api/assets -> 201)', async () => {
    const res = await request(app).post('/api/assets').send({
      name: 'Test Projector', category: 'AV Equipment', location: 'CL-6',
      status: 'operational', description: 'Created by automated test'
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^AST-/);
    expect(res.body.name).toBe('Test Projector');
  });

  test('asset retrieval (GET /api/assets and GET /api/assets/:id)', async () => {
    const list = await request(app).get('/api/assets');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.data.length).toBeGreaterThanOrEqual(5);

    const one = await request(app).get('/api/assets/AST-001');
    expect(one.status).toBe(200);
    expect(one.body.id).toBe('AST-001');
    expect(one.body.name).toBe('Projector');
    expect(one.body.location).toBe('CL-6');
  });

  test('invalid asset id returns 404 with JSON error envelope', async () => {
    const res = await request(app).get('/api/assets/AST-999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ASSET_NOT_FOUND');
  });

  test('invalid input returns 400 (bad status + bad dates)', async () => {
    const res = await request(app).post('/api/assets').send({
      name: 'Bad', category: 'X', location: 'CL-6', status: 'flying',
      lastMaintenance: 'not-a-date'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('asset update + delete lifecycle', async () => {
    const created = await request(app).post('/api/assets').send({
      name: 'Temp', category: 'Test', location: 'Lab-2'
    });
    const id = created.body.id;
    const patched = await request(app).patch(`/api/assets/${id}`).send({ status: 'maintenance' });
    expect(patched.status).toBe(200);
    expect(patched.body.status).toBe('maintenance');
    const del = await request(app).delete(`/api/assets/${id}`);
    expect(del.status).toBe(204);
    const gone = await request(app).get(`/api/assets/${id}`);
    expect(gone.status).toBe(404);
  });

  test('duplicate asset id returns 409', async () => {
    const res = await request(app).post('/api/assets').send({
      id: 'AST-001', name: 'Dupe', category: 'X', location: 'CL-6'
    });
    expect(res.status).toBe(409);
  });
});

describe('markers (AR contract)', () => {
  test('marker lookup returns { markerId, assetId, asset }', async () => {
    const res = await request(app).get('/api/assets/marker/projector-marker');
    expect(res.status).toBe(200);
    expect(res.body.assetId).toBe('AST-001');
    expect(res.body.markerId).toBe('projector-marker');
    expect(res.body.asset.id).toBe('AST-001');
  });

  test('nonexistent marker returns 404 MARKER_NOT_FOUND', async () => {
    const res = await request(app).get('/api/assets/marker/nope-marker');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('MARKER_NOT_FOUND');
  });
});

describe('maintenance', () => {
  test('maintenance retrieval returns an array', async () => {
    const res = await request(app).get('/api/assets/AST-001/maintenance');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].assetId).toBe('AST-001');
  });

  test('maintenance for unknown asset returns 404', async () => {
    const res = await request(app).get('/api/assets/AST-999/maintenance');
    expect(res.status).toBe(404);
  });
});

describe('issues', () => {
  test('issue creation (POST /api/issues -> 201)', async () => {
    const res = await request(app).post('/api/issues').send({
      assetId: 'AST-001', description: 'Lens is dusty and image is dim in daylight.'
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('open');
    expect(res.body.assetId).toBe('AST-001');
  });

  test('malformed issue returns 400', async () => {
    const res = await request(app).post('/api/issues').send({ assetId: 'AST-001', description: 'bad' });
    expect(res.status).toBe(400);
  });

  test('issue status update (PATCH /api/issues/:id/status)', async () => {
    const created = await request(app).post('/api/issues').send({
      assetId: 'AST-002', description: 'Filter indicator stays red after replacement.'
    });
    const id = created.body.id;
    const updated = await request(app).patch(`/api/issues/${id}/status`).send({ status: 'in_progress' });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe('in_progress');

    const bad = await request(app).patch(`/api/issues/${id}/status`).send({ status: 'bogus' });
    expect(bad.status).toBe(400);
  });

  test('issue listing supports ?status filter', async () => {
    const res = await request(app).get('/api/issues?status=open');
    expect(res.status).toBe(200);
    expect(res.body.data.every((i) => i.status === 'open')).toBe(true);
  });
});

describe('locations', () => {
  test('GET /api/locations returns seeded locations', async () => {
    const res = await request(app).get('/api/locations');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });
});
