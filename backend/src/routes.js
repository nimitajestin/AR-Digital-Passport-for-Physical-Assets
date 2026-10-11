'use strict';

const { store } = require('./db');
const {
  ASSET_ID_RE, MARKER_ID_RE, ASSET_STATUSES, ISSUE_STATUSES, ISSUE_PRIORITIES,
  httpError, isValidDate
} = require('./utils');

function parsePaging(q) {
  const limit = q.limit !== undefined ? parseInt(q.limit, 10) : 50;
  const offset = q.offset !== undefined ? parseInt(q.offset, 10) : 0;
  if ((q.limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) ||
      (q.offset !== undefined && (!Number.isInteger(offset) || offset < 0))) {
    throw httpError(400, 'INVALID_PAGING', 'limit must be 1-100 and offset must be >= 0');
  }
  return { limit: limit || 50, offset: offset || 0 };
}

function validateAssetPayload(body, isCreate) {
  const errors = [];
  if (isCreate) {
    if (!body.name || !String(body.name).trim()) errors.push('name is required');
    if (!body.category || !String(body.category).trim()) errors.push('category is required');
    if (body.location === undefined && body.locationId === undefined) errors.push('location or locationId is required');
  }
  if (body.id !== undefined && !ASSET_ID_RE.test(String(body.id))) errors.push('id must match AST-001 format');
  if (body.status !== undefined && !ASSET_STATUSES.includes(body.status)) errors.push(`status must be one of ${ASSET_STATUSES.join(', ')}`);
  if (body.markerId !== undefined && body.markerId !== null && body.markerId !== '' && !MARKER_ID_RE.test(String(body.markerId))) errors.push('markerId must be lowercase alphanumeric with dashes');
  for (const f of ['lastMaintenance', 'nextMaintenance']) {
    if (body[f] !== undefined && body[f] !== null && body[f] !== '' && !isValidDate(String(body[f]))) {
      errors.push(`${f} must be YYYY-MM-DD`);
    }
  }
  if (body.lastMaintenance && body.nextMaintenance &&
      isValidDate(String(body.lastMaintenance)) && isValidDate(String(body.nextMaintenance)) &&
      String(body.nextMaintenance) < String(body.lastMaintenance)) {
    errors.push('nextMaintenance must be on or after lastMaintenance');
  }
  return errors;
}

async function resolveLocationId(ref, locationId) {
  const s = store();
  const lookup = locationId !== undefined ? locationId : ref;
  if (lookup === undefined || lookup === null || lookup === '') return null;
  const loc = await s.findLocationByCodeOrId(lookup);
  return loc ? loc.id : null;
}

async function listAssets(req, res, next) {
  try {
    const { limit, offset } = parsePaging(req.query);
    if (req.query.status && !ASSET_STATUSES.includes(req.query.status)) {
      throw httpError(400, 'INVALID_STATUS', `status must be one of ${ASSET_STATUSES.join(', ')}`);
    }
    const { rows, total } = await store().listAssets({
      status: req.query.status, category: req.query.category,
      location: req.query.location, search: req.query.search, limit, offset
    });
    res.json({ data: rows, meta: { total, limit, offset } });
  } catch (e) { next(e); }
}

async function getAsset(req, res, next) {
  try {
    const { id } = req.params;
    if (!ASSET_ID_RE.test(id)) throw httpError(400, 'INVALID_ASSET_ID', `Asset id "${id}" must match AST-001 format`);
    const asset = await store().getAsset(id);
    if (!asset) throw httpError(404, 'ASSET_NOT_FOUND', `Asset ${id} was not found`);
    res.json(asset);
  } catch (e) { next(e); }
}

async function getAssetByMarker(req, res, next) {
  try {
    const { markerId } = req.params;
    if (!MARKER_ID_RE.test(markerId)) throw httpError(400, 'INVALID_MARKER_ID', `Marker id "${markerId}" is invalid`);
    const found = await store().getAssetByMarker(markerId);
    if (!found) throw httpError(404, 'MARKER_NOT_FOUND', `Marker ${markerId} was not found`);
    // Contract (frozen for AR): { markerId, assetId, asset }
    // AR reads `assetId` then calls GET /api/assets/:id.
    res.json(found);
  } catch (e) { next(e); }
}

async function getMaintenance(req, res, next) {
  try {
    const { id } = req.params;
    if (!ASSET_ID_RE.test(id)) throw httpError(400, 'INVALID_ASSET_ID', `Asset id "${id}" must match AST-001 format`);
    const rows = await store().getMaintenance(id);
    if (rows === null) throw httpError(404, 'ASSET_NOT_FOUND', `Asset ${id} was not found`);
    // Bare array (documented): AR expects a JSON array.
    res.json(rows);
  } catch (e) { next(e); }
}

async function createAsset(req, res, next) {
  try {
    const errors = validateAssetPayload(req.body || {}, true);
    if (errors.length) throw httpError(400, 'INVALID_ASSET', 'Asset payload is invalid', errors);
    const body = req.body;
    const location_id = await resolveLocationId(body.location, body.locationId);
    if (!location_id) throw httpError(400, 'INVALID_LOCATION', 'Location was not recognised. Use a valid code from GET /api/locations');
    const id = body.id || await store().nextAssetId();
    const created = await store().createAsset({
      id, name: String(body.name).trim(), category: String(body.category).trim(),
      location_id, status: body.status || 'operational',
      description: body.description || '', imageUrl: body.imageUrl || body.image_url || '',
      modelUrl: body.modelUrl || body.model_url || '',
      lastMaintenance: body.lastMaintenance || body.last_maintenance || null,
      nextMaintenance: body.nextMaintenance || body.next_maintenance || null,
      markerId: body.markerId || body.marker_id || null
    });
    res.status(201).json(created);
  } catch (e) { next(e); }
}

async function patchAsset(req, res, next) {
  try {
    const { id } = req.params;
    if (!ASSET_ID_RE.test(id)) throw httpError(400, 'INVALID_ASSET_ID', `Asset id "${id}" must match AST-001 format`);
    const body = req.body || {};
    if (!Object.keys(body).length) throw httpError(400, 'EMPTY_PATCH', 'Provide at least one field to update');
    const errors = validateAssetPayload(body, false);
    if (errors.length) throw httpError(400, 'INVALID_ASSET', 'Asset payload is invalid', errors);
    const patch = {};
    for (const k of ['name', 'category', 'status', 'description', 'imageUrl', 'modelUrl', 'lastMaintenance', 'nextMaintenance', 'markerId']) {
      if (body[k] !== undefined) patch[k] = body[k];
    }
    // snake_case aliases
    if (body.image_url !== undefined) patch.imageUrl = body.image_url;
    if (body.model_url !== undefined) patch.modelUrl = body.model_url;
    if (body.last_maintenance !== undefined) patch.lastMaintenance = body.last_maintenance;
    if (body.next_maintenance !== undefined) patch.nextMaintenance = body.next_maintenance;
    if (body.marker_id !== undefined) patch.markerId = body.marker_id;
    if (body.location !== undefined || body.locationId !== undefined) {
      const location_id = await resolveLocationId(body.location, body.locationId);
      if (!location_id) throw httpError(400, 'INVALID_LOCATION', 'Location was not recognised');
      patch.location_id = location_id;
    }
    const updated = await store().updateAsset(id, patch);
    if (!updated) throw httpError(404, 'ASSET_NOT_FOUND', `Asset ${id} was not found`);
    res.json(updated);
  } catch (e) { next(e); }
}

async function deleteAsset(req, res, next) {
  try {
    const { id } = req.params;
    if (!ASSET_ID_RE.test(id)) throw httpError(400, 'INVALID_ASSET_ID', `Asset id "${id}" must match AST-001 format`);
    const ok = await store().deleteAsset(id);
    if (!ok) throw httpError(404, 'ASSET_NOT_FOUND', `Asset ${id} was not found`);
    res.status(204).send();
  } catch (e) { next(e); }
}

async function listLocations(req, res, next) {
  try {
    const rows = await store().listLocations();
    res.json({ data: rows });
  } catch (e) { next(e); }
}

async function listIssues(req, res, next) {
  try {
    const { limit, offset } = parsePaging(req.query);
    if (req.query.status && !ISSUE_STATUSES.includes(req.query.status)) {
      throw httpError(400, 'INVALID_STATUS', `status must be one of ${ISSUE_STATUSES.join(', ')}`);
    }
    if (req.query.assetId && !ASSET_ID_RE.test(req.query.assetId)) {
      throw httpError(400, 'INVALID_ASSET_ID', 'assetId must match AST-001 format');
    }
    const { rows, total } = await store().listIssues({
      assetId: req.query.assetId, status: req.query.status, limit, offset
    });
    res.json({ data: rows, meta: { total, limit, offset } });
  } catch (e) { next(e); }
}

async function createIssue(req, res, next) {
  try {
    const body = req.body || {};
    const assetId = body.assetId || body.asset_id;
    const description = body.description;
    if (!assetId) throw httpError(400, 'INVALID_ISSUE', 'assetId is required', ['assetId is required']);
    if (!ASSET_ID_RE.test(String(assetId))) throw httpError(400, 'INVALID_ASSET_ID', 'assetId must match AST-001 format');
    if (!description || String(description).trim().length < 5) {
      throw httpError(400, 'INVALID_ISSUE', 'description must be at least 5 characters', ['description must be at least 5 characters']);
    }
    if (body.priority !== undefined && !ISSUE_PRIORITIES.includes(body.priority)) {
      throw httpError(400, 'INVALID_ISSUE', `priority must be one of ${ISSUE_PRIORITIES.join(', ')}`);
    }
    const created = await store().createIssue({
      assetId: String(assetId), description: String(description).trim(),
      priority: body.priority || 'medium', reportedBy: body.reportedBy || body.reported_by || null
    });
    res.status(201).json(created);
  } catch (e) { next(e); }
}

async function patchIssueStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(String(id))) throw httpError(400, 'INVALID_ISSUE_ID', `Issue id "${id}" must be numeric`);
    const status = (req.body || {}).status;
    if (!status || !ISSUE_STATUSES.includes(status)) {
      throw httpError(400, 'INVALID_STATUS', `status must be one of ${ISSUE_STATUSES.join(', ')}`);
    }
    const updated = await store().updateIssueStatus(id, status);
    if (!updated) throw httpError(404, 'ISSUE_NOT_FOUND', `Issue ${id} was not found`);
    res.json(updated);
  } catch (e) { next(e); }
}

module.exports = {
  listAssets, getAsset, getAssetByMarker, getMaintenance,
  createAsset, patchAsset, deleteAsset, listLocations,
  listIssues, createIssue, patchIssueStatus
};
