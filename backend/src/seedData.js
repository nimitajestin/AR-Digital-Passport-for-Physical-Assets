'use strict';

/**
 * Canonical demo dataset.
 * Seeds BOTH the real Postgres database (database/seed.sql) and the
 * test-only in-memory store. Single source of truth for tests.
 */

const LOCATIONS = [
  { id: 1, code: 'CL-6',       name: 'Classroom 6',         building: 'Main Block',      floor: 'Ground Floor' },
  { id: 2, code: 'Lab-2',      name: 'Electronics Lab 2',   building: 'Science Block',   floor: 'First Floor' },
  { id: 3, code: 'Workshop A', name: 'Maker Workshop A',    building: 'Innovation Block', floor: 'Ground Floor' },
  { id: 4, code: 'Server-R1',  name: 'Server Room 1',       building: 'IT Block',        floor: 'Second Floor' }
];

const ASSETS = [
  { id: 'AST-001', name: 'Projector',      category: 'AV Equipment',  location_id: 1, status: 'operational', description: 'Classroom projector used for lectures, presentations, and live demonstrations.', image_url: '', model_url: '', last_maintenance: '2026-09-18', next_maintenance: '2026-12-18' },
  { id: 'AST-002', name: 'Air Purifier',   category: 'Facilities',    location_id: 2, status: 'operational', description: 'High-efficiency air purifier supporting ventilation and indoor air quality in Lab-2.', image_url: '', model_url: '', last_maintenance: '2026-08-27', next_maintenance: '2026-11-27' },
  { id: 'AST-003', name: '3D Printer',     category: 'Maker Lab',     location_id: 3, status: 'maintenance', description: 'Prototype fabrication unit used for rapid model building and testing. Nozzle assembly under service.', image_url: '', model_url: '', last_maintenance: '2026-09-03', next_maintenance: '2026-10-20' },
  { id: 'AST-004', name: 'Oscilloscope',   category: 'Lab Equipment', location_id: 2, status: 'operational', description: '100 MHz digital storage oscilloscope for electronics measurements and debugging.', image_url: '', model_url: '', last_maintenance: '2026-07-15', next_maintenance: '2026-10-15' },
  { id: 'AST-005', name: 'VR Headset',     category: 'AV Equipment',  location_id: 1, status: 'degraded',    description: 'Standalone VR headset for immersive lab sessions. Right controller tracking is intermittent.', image_url: '', model_url: '', last_maintenance: '2026-06-30', next_maintenance: '2026-10-12' },
  { id: 'AST-006', name: 'Network Switch', category: 'IT Hardware',   location_id: 4, status: 'operational', description: '24-port managed gigabit switch serving the IT block. Firmware updated to latest stable.', image_url: '', model_url: '', last_maintenance: '2026-08-01', next_maintenance: '2027-02-01' },
  { id: 'AST-007', name: 'Lab PC 26 (CL-412)', category: 'Lab Equipment', location_id: 1, status: 'operational', description: 'CL-412 lab workstation running the course VM image since Aug 2026. Do not shut down. Contact: Lab Assistant Nimita.', image_url: '', model_url: '', last_maintenance: '2026-09-01', next_maintenance: '2026-12-01' }
];

const MARKERS = [
  { marker_id: 'projector-marker', asset_id: 'AST-001', target_index: 0 },
  { marker_id: 'purifier-marker',  asset_id: 'AST-002', target_index: 1 },
  { marker_id: 'printer-marker',   asset_id: 'AST-003', target_index: 2 },
  { marker_id: 'oscope-marker',    asset_id: 'AST-004', target_index: 3 },
  { marker_id: 'vr-marker',        asset_id: 'AST-005', target_index: 4 },
  { marker_id: 'switch-marker',    asset_id: 'AST-006', target_index: 5 }
];

const MAINTENANCE = [
  { id: 1, asset_id: 'AST-001', maintenance_date: '2026-09-18', type: 'routine',     description: 'Cleaned air filter, replaced lamp hours counter, verified HDMI inputs.', performed_by: 'Campus Facilities', cost: 450.00 },
  { id: 2, asset_id: 'AST-001', maintenance_date: '2026-06-10', type: 'inspection',  description: 'Routine inspection before semester start. Focus calibrated.', performed_by: 'Campus Facilities', cost: 0 },
  { id: 3, asset_id: 'AST-002', maintenance_date: '2026-08-27', type: 'routine',     description: 'Replaced HEPA filter and reset air-quality sensor.', performed_by: 'Lab Support', cost: 1200.00 },
  { id: 4, asset_id: 'AST-003', maintenance_date: '2026-09-03', type: 'repair',      description: 'Replaced clogged nozzle and recalibrated print bed leveling.', performed_by: 'Maker Lab Tech', cost: 800.00 },
  { id: 5, asset_id: 'AST-003', maintenance_date: '2026-07-20', type: 'routine',     description: 'Lubricated Z-axis lead screw, updated firmware to 2.1.4.', performed_by: 'Maker Lab Tech', cost: 150.00 },
  { id: 6, asset_id: 'AST-004', maintenance_date: '2026-07-15', type: 'calibration', description: 'Calibrated probes against reference signal generator.', performed_by: 'Electronics Lab', cost: 600.00 },
  { id: 7, asset_id: 'AST-005', maintenance_date: '2026-06-30', type: 'inspection',  description: 'Inspected lenses and straps; flagged right-controller drift for repair.', performed_by: 'AV Support', cost: 0 },
  { id: 8, asset_id: 'AST-006', maintenance_date: '2026-08-01', type: 'upgrade',     description: 'Upgraded firmware and re-applied VLAN configuration.', performed_by: 'IT Admin', cost: 0 }
];

const ISSUES = [
  { id: 1, asset_id: 'AST-003', description: 'Nozzle keeps clogging mid-print on PLA jobs longer than 2 hours.', status: 'open', priority: 'high', reported_by: 'Student — Maker Club', reported_at: '2026-10-02T10:15:00.000Z' },
  { id: 2, asset_id: 'AST-005', description: 'Right controller loses tracking near the windows; possibly IR interference.', status: 'in_progress', priority: 'medium', reported_by: 'Lab Assistant', reported_at: '2026-10-05T09:00:00.000Z' },
  { id: 3, asset_id: 'AST-001', description: 'Remote control missing from classroom drawer; projector itself works.', status: 'resolved', priority: 'low', reported_by: 'Faculty — CL-6', reported_at: '2026-09-20T14:30:00.000Z' },
  { id: 4, asset_id: 'AST-004', description: 'Channel 2 probe reads 5% high compared to channel 1.', status: 'open', priority: 'medium', reported_by: 'Student — ELC Lab', reported_at: '2026-10-07T11:45:00.000Z' }
];

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
function initialState() {
  return {
    locations: deepClone(LOCATIONS),
    assets: deepClone(ASSETS),
    markers: deepClone(MARKERS),
    maintenance: deepClone(MAINTENANCE),
    issues: deepClone(ISSUES),
    nextIssueId: 5,
    nextMaintenanceId: 9,
    nextLocationId: 5
  };
}

module.exports = { initialState };
