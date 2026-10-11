-- ============================================================
-- AR Digital Passport — seed data (Dev 2)
-- Run AFTER schema.sql:
--   psql "$DATABASE_URL" -f database/schema.sql
--   psql "$DATABASE_URL" -f database/seed.sql
-- Locations, assets, and markers are idempotent (ON CONFLICT).
-- Re-running this file can DUPLICATE maintenance_records and issues
-- rows — those inserts have no unique key / ON CONFLICT clause.
-- ============================================================

BEGIN;

-- ---------- locations (3+) ----------
INSERT INTO locations (id, code, name, building, floor) VALUES
  (1, 'CL-6',       'Classroom 6',   'Main Block', 'Ground Floor'),
  (2, 'Lab-2',      'Electronics Lab 2', 'Science Block', 'First Floor'),
  (3, 'Workshop A', 'Maker Workshop A',  'Innovation Block', 'Ground Floor'),
  (4, 'Server-R1',  'Server Room 1', 'IT Block', 'Second Floor')
ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code, name=EXCLUDED.name,
  building=EXCLUDED.building, floor=EXCLUDED.floor;
SELECT setval('locations_id_seq', (SELECT MAX(id) FROM locations));

-- ---------- assets (7 realistic; Lab PC is dashboard-only, no AR marker) ----------
INSERT INTO assets (id, name, category, location_id, status, description, image_url, model_url, last_maintenance, next_maintenance) VALUES
  ('AST-001', 'Projector',        'AV Equipment', 1, 'operational', 'Classroom projector used for lectures, presentations, and live demonstrations.', '', '', '2026-09-18', '2026-12-18'),
  ('AST-002', 'Air Purifier',     'Facilities',   2, 'operational', 'High-efficiency air purifier supporting ventilation and indoor air quality in Lab-2.', '', '', '2026-08-27', '2026-11-27'),
  ('AST-003', '3D Printer',       'Maker Lab',    3, 'maintenance', 'Prototype fabrication unit used for rapid model building and testing. Nozzle assembly under service.', '', '', '2026-09-03', '2026-10-20'),
  ('AST-004', 'Oscilloscope',     'Lab Equipment',2, 'operational', '100 MHz digital storage oscilloscope for electronics measurements and debugging.', '', '', '2026-07-15', '2026-10-15'),
  ('AST-005', 'VR Headset',       'AV Equipment', 1, 'degraded',    'Standalone VR headset for immersive lab sessions. Right controller tracking is intermittent.', '', '', '2026-06-30', '2026-10-12'),
  ('AST-006', 'Network Switch',   'IT Hardware',  4, 'operational', '24-port managed gigabit switch serving the IT block. Firmware updated to latest stable.', '', '', '2026-08-01', '2027-02-01'),
  ('AST-007', 'Lab PC 26 (CL-412)', 'Lab Equipment', 1, 'operational', 'CL-412 lab workstation running the course VM image since Aug 2026. Do not shut down. Contact: Lab Assistant Nimita.', '', '', '2026-09-01', '2026-12-01')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category,
  location_id=EXCLUDED.location_id, status=EXCLUDED.status, description=EXCLUDED.description,
  last_maintenance=EXCLUDED.last_maintenance, next_maintenance=EXCLUDED.next_maintenance,
  updated_at=NOW();

-- ---------- markers (3 AR-usable + extras) ----------
INSERT INTO asset_markers (marker_id, asset_id, target_index) VALUES
  ('projector-marker', 'AST-001', 0),
  ('purifier-marker',  'AST-002', 1),
  ('printer-marker',   'AST-003', 2),
  ('oscope-marker',    'AST-004', 3),
  ('vr-marker',        'AST-005', 4),
  ('switch-marker',    'AST-006', 5)
ON CONFLICT (marker_id) DO UPDATE SET asset_id=EXCLUDED.asset_id, target_index=EXCLUDED.target_index;

-- ---------- maintenance records ----------
-- No unique constraint: re-running seed.sql can duplicate these rows.
INSERT INTO maintenance_records (asset_id, maintenance_date, type, description, performed_by, cost) VALUES
  ('AST-001', '2026-09-18', 'routine',    'Cleaned air filter, replaced lamp hours counter, verified HDMI inputs.', 'Campus Facilities', 450.00),
  ('AST-001', '2026-06-10', 'inspection', 'Routine inspection before semester start. Focus calibrated.', 'Campus Facilities', 0.00),
  ('AST-002', '2026-08-27', 'routine',    'Replaced HEPA filter and reset air-quality sensor.', 'Lab Support', 1200.00),
  ('AST-003', '2026-09-03', 'repair',     'Replaced clogged nozzle and recalibrated print bed leveling.', 'Maker Lab Tech', 800.00),
  ('AST-003', '2026-07-20', 'routine',    'Lubricated Z-axis lead screw, updated firmware to 2.1.4.', 'Maker Lab Tech', 150.00),
  ('AST-004', '2026-07-15', 'calibration','Calibrated probes against reference signal generator.', 'Electronics Lab', 600.00),
  ('AST-005', '2026-06-30', 'inspection', 'Inspected lenses and straps; flagged right-controller drift for repair.', 'AV Support', 0.00),
  ('AST-006', '2026-08-01', 'upgrade',    'Upgraded firmware and re-applied VLAN configuration.', 'IT Admin', 0.00);

-- ---------- issues ----------
-- No unique constraint: re-running seed.sql can duplicate these rows.
-- AST-003 nozzle issue priority is 'high' (must match backend/src/seedData.js).
INSERT INTO issues (asset_id, description, status, priority, reported_by, reported_at) VALUES
  ('AST-003', 'Nozzle keeps clogging mid-print on PLA jobs longer than 2 hours.', 'open', 'high', 'Student — Maker Club', '2026-10-02 10:15:00+00'),
  ('AST-005', 'Right controller loses tracking near the windows; possibly IR interference.', 'in_progress', 'medium', 'Lab Assistant', '2026-10-05 09:00:00+00'),
  ('AST-001', 'Remote control missing from classroom drawer; projector itself works.', 'resolved', 'low', 'Faculty — CL-6', '2026-09-20 14:30:00+00'),
  ('AST-004', 'Channel 2 probe reads 5% high compared to channel 1.', 'open', 'medium', 'Student — ELC Lab', '2026-10-07 11:45:00+00');

-- ---------- admin_users ----------
-- No credentials are seeded: authentication is not implemented yet.
-- The admin_users table (see schema.sql) is reserved for future auth work.

COMMIT;
