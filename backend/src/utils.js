'use strict';

const { initialState } = require('./seedData');

const ASSET_ID_RE = /^AST-[0-9]{3,}$/;
const MARKER_ID_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;
const ASSET_STATUSES = ['operational', 'maintenance', 'degraded', 'offline', 'retired'];
const ISSUE_STATUSES = ['open', 'in_progress', 'resolved', 'rejected'];
const ISSUE_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function httpError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details) err.details = details;
  return err;
}

function errorBody(err) {
  return {
    error: {
      code: err.code || (err.status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR'),
      message: err.message || 'Unexpected server error',
      ...(err.details ? { details: err.details } : {})
    }
  };
}

function isValidDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function toAssetDto(row, locationById, markerByAsset) {
  const loc = locationById.get(row.location_id);
  const marker = markerByAsset.get(row.id);
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    location: loc ? loc.code : null,
    locationId: row.location_id,
    locationName: loc ? loc.name : null,
    status: row.status,
    description: row.description || '',
    imageUrl: row.image_url || '',
    modelUrl: row.model_url || '',
    lastMaintenance: row.last_maintenance || null,
    nextMaintenance: row.next_maintenance || null,
    markerId: marker ? marker.marker_id : null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

function toMaintenanceDto(r) {
  return {
    id: r.id,
    assetId: r.asset_id,
    date: r.maintenance_date,
    type: r.type,
    description: r.description,
    performedBy: r.performed_by || null,
    cost: r.cost
  };
}

function toIssueDto(r) {
  return {
    id: r.id,
    assetId: r.asset_id,
    description: r.description,
    status: r.status,
    priority: r.priority,
    reportedBy: r.reported_by || null,
    reportedAt: r.reported_at,
    resolvedAt: r.resolved_at || null,
    createdAt: r.created_at || r.reported_at,
    updatedAt: r.updated_at || r.reported_at
  };
}

module.exports = {
  ASSET_ID_RE, MARKER_ID_RE, ASSET_STATUSES, ISSUE_STATUSES, ISSUE_PRIORITIES,
  httpError, errorBody, isValidDate, toAssetDto, toMaintenanceDto, toIssueDto
};
