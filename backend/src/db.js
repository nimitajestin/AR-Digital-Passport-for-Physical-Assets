'use strict';

/**
 * Data-access layer.
 *  - PostgreSQL via `pg` Pool — the ONLY store used by the running server.
 *  - In-memory store — test-only (NODE_ENV=test or USE_MEMORY_DB=true),
 *    seeded identically so contract tests need no database.
 * Both expose the same async method surface.
 */

const config = require('./config');
const { initialState } = require('./seedData');
const { toAssetDto, toMaintenanceDto, toIssueDto, httpError } = require('./utils');

let pool = null;
function getPool() {
  if (pool) return pool;
  // eslint-disable-next-line global-require
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: /supabase|render|neon|railway/i.test(config.databaseUrl) ? { rejectUnauthorized: false } : undefined
  });
  return pool;
}

function useMemory() {
  return config.memoryRequested || config.nodeEnv === 'test';
}

// ---------------- in-memory store ----------------
let mem = initialState();
function resetMemory() { mem = initialState(); }

function memMaps() {
  const locationById = new Map(mem.locations.map((l) => [l.id, l]));
  const markerByAsset = new Map(mem.markers.map((m) => [m.asset_id, m]));
  return { locationById, markerByAsset };
}

const memoryStore = {
  mode: 'memory',
  resetMemory,

  async health() { return { db: 'memory', assets: mem.assets.length }; },

  async listLocations() {
    return mem.locations.map((l) => ({
      id: l.id, code: l.code, name: l.name, building: l.building, floor: l.floor
    }));
  },

  async findLocationByCodeOrId(ref) {
    if (ref === undefined || ref === null || ref === '') return null;
    if (typeof ref === 'number' || /^\d+$/.test(String(ref))) {
      return mem.locations.find((l) => l.id === Number(ref)) || null;
    }
    return mem.locations.find((l) => l.code.toLowerCase() === String(ref).toLowerCase()) || null;
  },

  async listAssets(filters = {}) {
    const { locationById, markerByAsset } = memMaps();
    let rows = [...mem.assets];
    if (filters.status) rows = rows.filter((a) => a.status === filters.status);
    if (filters.category) rows = rows.filter((a) => a.category.toLowerCase() === String(filters.category).toLowerCase());
    if (filters.location) {
      const q = String(filters.location).toLowerCase();
      rows = rows.filter((a) => {
        const loc = locationById.get(a.location_id);
        return loc && (loc.code.toLowerCase() === q || loc.name.toLowerCase().includes(q));
      });
    }
    if (filters.search) {
      const q = String(filters.search).toLowerCase();
      rows = rows.filter((a) => [a.id, a.name, a.category, a.description].join(' ').toLowerCase().includes(q));
    }
    const total = rows.length;
    const offset = Math.max(0, filters.offset || 0);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    rows = rows.slice(offset, offset + limit);
    return { rows: rows.map((r) => toAssetDto(r, locationById, markerByAsset)), total };
  },

  async getAsset(id) {
    const { locationById, markerByAsset } = memMaps();
    const row = mem.assets.find((a) => a.id === id);
    return row ? toAssetDto(row, locationById, markerByAsset) : null;
  },

  async getAssetByMarker(markerId) {
    const m = mem.markers.find((x) => x.marker_id === markerId);
    if (!m) return null;
    const asset = await this.getAsset(m.asset_id);
    return asset ? { markerId, assetId: asset.id, asset } : null;
  },

  async nextAssetId() {
    let max = 0;
    for (const a of mem.assets) {
      const n = parseInt(a.id.split('-')[1] || '0', 10);
      if (n > max) max = n;
    }
    return `AST-${String(max + 1).padStart(3, '0')}`;
  },

  async createAsset(input) {
    if (mem.assets.some((a) => a.id === input.id)) {
      throw httpError(409, 'ASSET_CONFLICT', `Asset ${input.id} already exists`);
    }
    if (input.markerId && mem.markers.some((m) => m.marker_id === input.markerId)) {
      throw httpError(409, 'MARKER_CONFLICT', `Marker ${input.markerId} is already assigned`);
    }
    const now = new Date().toISOString();
    mem.assets.push({
      id: input.id, name: input.name, category: input.category,
      location_id: input.location_id, status: input.status,
      description: input.description || '', image_url: input.imageUrl || '',
      model_url: input.modelUrl || '', last_maintenance: input.lastMaintenance || null,
      next_maintenance: input.nextMaintenance || null, created_at: now, updated_at: now
    });
    if (input.markerId) mem.markers.push({ marker_id: input.markerId, asset_id: input.id, target_index: null });
    return this.getAsset(input.id);
  },

  async updateAsset(id, patch) {
    const row = mem.assets.find((a) => a.id === id);
    if (!row) return null;
    if (patch.markerId !== undefined) {
      const clash = mem.markers.find((m) => m.marker_id === patch.markerId && m.asset_id !== id);
      if (clash) throw httpError(409, 'MARKER_CONFLICT', `Marker ${patch.markerId} is already assigned`);
      mem.markers = mem.markers.filter((m) => m.asset_id !== id);
      if (patch.markerId) mem.markers.push({ marker_id: patch.markerId, asset_id: id, target_index: null });
    }
    Object.assign(row, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.location_id !== undefined ? { location_id: patch.location_id } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.imageUrl !== undefined ? { image_url: patch.imageUrl } : {}),
      ...(patch.modelUrl !== undefined ? { model_url: patch.modelUrl } : {}),
      ...(patch.lastMaintenance !== undefined ? { last_maintenance: patch.lastMaintenance } : {}),
      ...(patch.nextMaintenance !== undefined ? { next_maintenance: patch.nextMaintenance } : {}),
      updated_at: new Date().toISOString()
    });
    return this.getAsset(id);
  },

  async deleteAsset(id) {
    const idx = mem.assets.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    mem.assets.splice(idx, 1);
    mem.markers = mem.markers.filter((m) => m.asset_id !== id);
    mem.maintenance = mem.maintenance.filter((m) => m.asset_id !== id);
    mem.issues = mem.issues.filter((i) => i.asset_id !== id);
    return true;
  },

  async getMaintenance(assetId) {
    const exists = mem.assets.some((a) => a.id === assetId);
    if (!exists) return null;
    return mem.maintenance
      .filter((m) => m.asset_id === assetId)
      .sort((a, b) => (a.maintenance_date < b.maintenance_date ? 1 : -1))
      .map(toMaintenanceDto);
  },

  async listIssues(filters = {}) {
    let rows = [...mem.issues];
    if (filters.assetId) rows = rows.filter((i) => i.asset_id === filters.assetId);
    if (filters.status) rows = rows.filter((i) => i.status === filters.status);
    rows.sort((a, b) => (a.reported_at < b.reported_at ? 1 : -1));
    const total = rows.length;
    const offset = Math.max(0, filters.offset || 0);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    return { rows: rows.slice(offset, offset + limit).map(toIssueDto), total };
  },

  async createIssue(input) {
    const asset = mem.assets.find((a) => a.id === input.assetId);
    if (!asset) throw httpError(404, 'ASSET_NOT_FOUND', `Asset ${input.assetId} was not found`);
    const now = new Date().toISOString();
    const row = {
      id: mem.nextIssueId++, asset_id: input.assetId, description: input.description,
      status: 'open', priority: input.priority || 'medium',
      reported_by: input.reportedBy || null, reported_at: now,
      resolved_at: null, created_at: now, updated_at: now
    };
    mem.issues.push(row);
    return toIssueDto(row);
  },

  async updateIssueStatus(id, status) {
    const row = mem.issues.find((i) => i.id === Number(id));
    if (!row) return null;
    row.status = status;
    row.updated_at = new Date().toISOString();
    row.resolved_at = (status === 'resolved' || status === 'rejected') ? row.updated_at : null;
    return toIssueDto(row);
  }
};

// ---------------- Postgres store ----------------
function pgToAssetDto(row) {
  return {
    id: row.id, name: row.name, category: row.category,
    location: row.location_code, locationId: row.location_id, locationName: row.location_name,
    status: row.status, description: row.description || '',
    imageUrl: row.image_url || '', modelUrl: row.model_url || '',
    lastMaintenance: row.last_maintenance ? String(row.last_maintenance).slice(0, 10) : null,
    nextMaintenance: row.next_maintenance ? String(row.next_maintenance).slice(0, 10) : null,
    markerId: row.marker_id || null,
    createdAt: row.created_at, updatedAt: row.updated_at
  };
}

const pgStore = {
  mode: 'postgres',

  async health() {
    const r = await getPool().query('SELECT COUNT(*)::int AS n FROM assets');
    return { db: 'postgres', assets: r.rows[0].n };
  },

  async listLocations() {
    const r = await getPool().query('SELECT id, code, name, building, floor FROM locations ORDER BY code');
    return r.rows;
  },

  async findLocationByCodeOrId(ref) {
    if (ref === undefined || ref === null || ref === '') return null;
    if (typeof ref === 'number' || /^\d+$/.test(String(ref))) {
      const r = await getPool().query('SELECT * FROM locations WHERE id=$1', [Number(ref)]);
      return r.rows[0] || null;
    }
    const r = await getPool().query('SELECT * FROM locations WHERE LOWER(code)=LOWER($1)', [String(ref)]);
    return r.rows[0] || null;
  },

  async listAssets(filters = {}) {
    const where = [], params = [];
    if (filters.status) { params.push(filters.status); where.push(`a.status=$${params.length}`); }
    if (filters.category) { params.push(filters.category); where.push(`LOWER(a.category)=LOWER($${params.length})`); }
    if (filters.location) { params.push(`%${String(filters.location).toLowerCase()}%`); where.push(`(LOWER(l.code)=LOWER($${params.length}) OR LOWER(l.name) LIKE $${params.length})`); }
    if (filters.search) { params.push(`%${String(filters.search).toLowerCase()}%`); where.push(`(LOWER(a.id) LIKE $${params.length} OR LOWER(a.name) LIKE $${params.length} OR LOWER(a.category) LIKE $${params.length} OR LOWER(a.description) LIKE $${params.length})`); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const offset = Math.max(0, filters.offset || 0);
    const count = await getPool().query(
      `SELECT COUNT(*)::int AS total FROM assets a JOIN locations l ON l.id=a.location_id ${clause}`, params);
    params.push(limit, offset);
    const r = await getPool().query(
      `SELECT a.*, l.code AS location_code, l.name AS location_name, m.marker_id
       FROM assets a JOIN locations l ON l.id=a.location_id
       LEFT JOIN asset_markers m ON m.asset_id=a.id
       ${clause} ORDER BY a.id LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return { rows: r.rows.map(pgToAssetDto), total: count.rows[0].total };
  },

  async getAsset(id) {
    const r = await getPool().query(
      `SELECT a.*, l.code AS location_code, l.name AS location_name, m.marker_id
       FROM assets a JOIN locations l ON l.id=a.location_id
       LEFT JOIN asset_markers m ON m.asset_id=a.id WHERE a.id=$1`, [id]);
    return r.rows[0] ? pgToAssetDto(r.rows[0]) : null;
  },

  async getAssetByMarker(markerId) {
    const r = await getPool().query('SELECT asset_id FROM asset_markers WHERE marker_id=$1', [markerId]);
    if (!r.rows[0]) return null;
    const asset = await this.getAsset(r.rows[0].asset_id);
    return asset ? { markerId, assetId: asset.id, asset } : null;
  },

  async nextAssetId() {
    const r = await getPool().query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INT)),0)+1 AS n FROM assets WHERE id ~ '^AST-[0-9]+$'`);
    return `AST-${String(r.rows[0].n).padStart(3, '0')}`;
  },

  async createAsset(input) {
    try {
      await getPool().query(
        `INSERT INTO assets (id,name,category,location_id,status,description,image_url,model_url,last_maintenance,next_maintenance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [input.id, input.name, input.category, input.location_id, input.status, input.description || '',
         input.imageUrl || '', input.modelUrl || '', input.lastMaintenance || null, input.nextMaintenance || null]);
      if (input.markerId) {
        await getPool().query('INSERT INTO asset_markers (marker_id, asset_id) VALUES ($1,$2)', [input.markerId, input.id]);
      }
    } catch (e) {
      if (e.code === '23505') throw httpError(409, 'ASSET_CONFLICT', 'Asset or marker already exists');
      if (e.code === '23503') throw httpError(400, 'INVALID_LOCATION', 'Location reference is invalid');
      throw e;
    }
    return this.getAsset(input.id);
  },

  async updateAsset(id, patch) {
    const sets = [], params = [];
    const map = { name: 'name', category: 'category', location_id: 'location_id', status: 'status', description: 'description', imageUrl: 'image_url', modelUrl: 'model_url', lastMaintenance: 'last_maintenance', nextMaintenance: 'next_maintenance' };
    for (const [k, col] of Object.entries(map)) {
      if (patch[k] !== undefined) { params.push(patch[k]); sets.push(`${col}=$${params.length}`); }
    }
    if (sets.length) {
      params.push(id);
      const r = await getPool().query(`UPDATE assets SET ${sets.join(', ')}, updated_at=NOW() WHERE id=$${params.length}`, params);
      if (r.rowCount === 0) return null;
    } else {
      const exists = await this.getAsset(id);
      if (!exists) return null;
    }
    if (patch.markerId !== undefined) {
      await getPool().query('DELETE FROM asset_markers WHERE asset_id=$1', [id]);
      if (patch.markerId) {
        try {
          await getPool().query('INSERT INTO asset_markers (marker_id, asset_id) VALUES ($1,$2)', [patch.markerId, id]);
        } catch (e) {
          if (e.code === '23505') throw httpError(409, 'MARKER_CONFLICT', `Marker ${patch.markerId} is already assigned`);
          throw e;
        }
      }
    }
    return this.getAsset(id);
  },

  async deleteAsset(id) {
    const r = await getPool().query('DELETE FROM assets WHERE id=$1', [id]);
    return r.rowCount > 0;
  },

  async getMaintenance(assetId) {
    const a = await getPool().query('SELECT id FROM assets WHERE id=$1', [assetId]);
    if (!a.rows[0]) return null;
    const r = await getPool().query(
      `SELECT id, asset_id, maintenance_date, type, description, performed_by, cost
       FROM maintenance_records WHERE asset_id=$1 ORDER BY maintenance_date DESC`, [assetId]);
    return r.rows.map((x) => ({
      id: x.id, assetId: x.asset_id, date: String(x.maintenance_date).slice(0, 10),
      type: x.type, description: x.description, performedBy: x.performed_by, cost: x.cost
    }));
  },

  async listIssues(filters = {}) {
    const where = [], params = [];
    if (filters.assetId) { params.push(filters.assetId); where.push(`asset_id=$${params.length}`); }
    if (filters.status) { params.push(filters.status); where.push(`status=$${params.length}`); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const offset = Math.max(0, filters.offset || 0);
    const count = await getPool().query(`SELECT COUNT(*)::int AS total FROM issues ${clause}`, params);
    params.push(limit, offset);
    const r = await getPool().query(
      `SELECT * FROM issues ${clause} ORDER BY reported_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return {
      rows: r.rows.map((x) => ({
        id: x.id, assetId: x.asset_id, description: x.description, status: x.status,
        priority: x.priority, reportedBy: x.reported_by, reportedAt: x.reported_at,
        resolvedAt: x.resolved_at, createdAt: x.created_at, updatedAt: x.updated_at
      })),
      total: count.rows[0].total
    };
  },

  async createIssue(input) {
    const a = await getPool().query('SELECT id FROM assets WHERE id=$1', [input.assetId]);
    if (!a.rows[0]) throw httpError(404, 'ASSET_NOT_FOUND', `Asset ${input.assetId} was not found`);
    const r = await getPool().query(
      `INSERT INTO issues (asset_id, description, priority, reported_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [input.assetId, input.description, input.priority || 'medium', input.reportedBy || null]);
    const x = r.rows[0];
    return {
      id: x.id, assetId: x.asset_id, description: x.description, status: x.status,
      priority: x.priority, reportedBy: x.reported_by, reportedAt: x.reported_at,
      resolvedAt: x.resolved_at, createdAt: x.created_at, updatedAt: x.updated_at
    };
  },

  async updateIssueStatus(id, status) {
    // NOTE: each $n is used exactly once. Supavisor (transaction pooling)
    // rejects queries that reuse a parameter (42P08), so resolved_at is
    // computed in JS rather than CASE WHEN $1 ... END.
    const resolvedAt = (status === 'resolved' || status === 'rejected') ? new Date().toISOString() : null;
    const r = await getPool().query(
      `UPDATE issues SET status=$1, updated_at=NOW(), resolved_at=$2
       WHERE id=$3 RETURNING *`, [status, resolvedAt, Number(id)]);
    if (!r.rows[0]) return null;
    const x = r.rows[0];
    return {
      id: x.id, assetId: x.asset_id, description: x.description, status: x.status,
      priority: x.priority, reportedBy: x.reported_by, reportedAt: x.reported_at,
      resolvedAt: x.resolved_at, createdAt: x.created_at, updatedAt: x.updated_at
    };
  }
};

function store() { return useMemory() ? memoryStore : pgStore; }

module.exports = { store, memoryStore, pgStore, resetMemory, useMemory };
