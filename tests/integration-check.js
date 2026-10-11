'use strict';
/**
 * End-to-end integration check (Dev 4).
 * Exercises the primary acceptance flow against a RUNNING backend:
 *   marker -> asset -> maintenance -> issue create -> issue visible ->
 *   status update -> reflected state, plus negative cases.
 *
 * Usage:
 *   node tests/integration-check.js [--base http://localhost:3000]
 * Exit 0 = all checks pass, 1 = any failure.
 * Uses only Node's built-in fetch (Node 18+). No extra dependencies.
 */
const BASE = (process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : process.env.API_BASE || 'http://localhost:3000') + '/api';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? ' — ' + extra : ''}`); }
}
async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, json };
}

(async () => {
  console.log(`Integration check against ${BASE}`);
  try {
    // B. backend startup
    const health = await req('GET', '/health'.replace('/api', ''), null).catch(() => null);
    // /health lives at root, not /api — fetch directly
    const hres = await fetch(BASE.replace(/\/api$/, '/health'));
    const hjson = await hres.json().catch(() => null);
    ok('B. backend /health reachable', hres.status === 200 && hjson && hjson.ok === true);

    // G. asset retrieval (AR-critical, bare object)
    const a = await req('GET', '/assets/AST-001');
    ok('G. GET /api/assets/:id returns bare asset', a.status === 200 && a.json && a.json.id === 'AST-001' && a.json.location === 'CL-6');

    // F. marker recognition mapping
    const m = await req('GET', '/assets/marker/projector-marker');
    ok('F. GET /api/assets/marker/:markerId returns assetId', m.status === 200 && m.json && m.json.assetId === 'AST-001' && m.json.markerId === 'projector-marker');

    // H. maintenance retrieval (bare array for AR)
    const mh = await req('GET', '/assets/AST-001/maintenance');
    ok('H. GET maintenance returns array', mh.status === 200 && Array.isArray(mh.json) && mh.json.length >= 1);

    // D/E. dashboard data paths
    const assets = await req('GET', '/assets?limit=100');
    ok('D. GET /api/assets list >= 5 assets', assets.status === 200 && assets.json && (assets.json.data || []).length >= 5);
    const locs = await req('GET', '/locations');
    ok('D. GET /api/locations >= 3 locations', locs.status === 200 && locs.json && (locs.json.data || []).length >= 3);

    // I. issue creation
    const created = await req('POST', '/issues', { assetId: 'AST-001', description: 'Integration check: lamp flickers on cold start.' });
    ok('I. POST /api/issues -> 201 open', created.status === 201 && created.json && created.json.status === 'open');
    const issueId = created.json && created.json.id;

    // J. dashboard issue visibility
    const list = await req('GET', '/issues?assetId=AST-001');
    ok('J. created issue visible in GET /api/issues', list.status === 200 && (list.json.data || []).some((i) => i.id === issueId));

    // K. status update reflected
    const upd = await req('PATCH', `/issues/${issueId}/status`, { status: 'in_progress' });
    ok('K. PATCH issue status -> in_progress', upd.status === 200 && upd.json && upd.json.status === 'in_progress');

    // L. error handling (negative cases)
    const badMarker = await req('GET', '/assets/marker/does-not-exist-1');
    ok('L1. invalid marker -> 404 MARKER_NOT_FOUND', badMarker.status === 404 && badMarker.json && badMarker.json.error && badMarker.json.error.code === 'MARKER_NOT_FOUND');
    const badAsset = await req('GET', '/assets/AST-999');
    ok('L2. nonexistent asset -> 404 ASSET_NOT_FOUND', badAsset.status === 404 && badAsset.json.error.code === 'ASSET_NOT_FOUND');
    const badIssue = await req('POST', '/issues', { assetId: 'AST-001', description: 'bad' });
    ok('L3. malformed issue -> 400', badIssue.status === 400);
    const badStatus = await req('PATCH', `/issues/${issueId}/status`, { status: 'bogus' });
    ok('L4. invalid status -> 400', badStatus.status === 400);
    const unknownRoute = await req('GET', '/nope');
    ok('L5. unknown route -> 404 envelope', unknownRoute.status === 404 && unknownRoute.json && unknownRoute.json.error);
  } catch (e) {
    fail++;
    console.log(`  FAIL  harness error — ${e.message} (is the backend running? Start it: cd backend && npm start)`);
  }
  console.log(`\nResult: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
