/* Dashboard controller: search/filter/table, CRUD forms, issue management. */
(function () {
  'use strict';
  var api = window.DashboardAPI;
  var state = { assets: [], allAssets: [], locations: [], issues: [], openIssueCount: 0, editingId: null, deleteId: null };
  var $ = function (id) { return document.getElementById(id); };

  function alert(msg, kind) {
    var region = $('alertRegion');
    var div = document.createElement('div');
    div.className = 'alert ' + (kind || '');
    div.textContent = msg;
    region.appendChild(div);
    setTimeout(function () { div.remove(); }, 6000);
  }
  function apiErrorMessage(err, fallback) {
    if (err && err.details && Array.isArray(err.details)) return err.message + ': ' + err.details.join('; ');
    return (err && err.message) || fallback || 'Something went wrong.';
  }

  function setTableState(msg) {
    var el = $('tableState');
    if (!msg) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false; el.textContent = msg;
  }

  async function loadAll() {
    $('apiBase').value = api.base;
    setTableState('Loading assets…');
    $('issueState').hidden = false;
    $('issueState').textContent = 'Loading issues…';
    try {
      var loc = await api.listLocations();
      state.locations = loc.data || [];
      fillSelect($('locationFilter'), state.locations.map(function (l) { return { v: l.code, t: l.code + ' — ' + l.name }; }), 'All locations');
      fillSelect($('assetLocationSelect'), state.locations.map(function (l) { return { v: l.code, t: l.code + ' — ' + l.name }; }), null);

      var cats = {};
      var assets = await api.listAssets({ limit: 100 });
      (assets.data || []).forEach(function (a) { if (a.category) cats[a.category] = 1; });
      fillSelect($('categoryFilter'), Object.keys(cats).sort().map(function (c) { return { v: c, t: c }; }), 'All categories');

      await refreshAssets();
      await refreshIssues();
      await refreshSummaryStats();
    } catch (err) {
      setTableState('API unavailable: ' + apiErrorMessage(err) + ' — check the API URL above and that the backend is running.');
      $('issueState').textContent = 'Issues unavailable: backend is not reachable.';
      alert('Backend unreachable: ' + apiErrorMessage(err), 'error');
    }
  }

  function fillSelect(sel, items, allLabel) {
    var keep = sel.value;
    sel.innerHTML = '';
    if (allLabel !== null && allLabel !== undefined) {
      var o = document.createElement('option'); o.value = ''; o.textContent = allLabel; sel.appendChild(o);
    }
    items.forEach(function (it) {
      var op = document.createElement('option'); op.value = it.v; op.textContent = it.t; sel.appendChild(op);
    });
    if (keep) sel.value = keep;
  }

  async function refreshAssets(silent) {
    if (!silent) setTableState('Loading assets…');
    try {
      var res = await api.listAssets({
        search: $('searchInput').value.trim(),
        status: $('statusFilter').value,
        category: $('categoryFilter').value,
        location: $('locationFilter').value,
        limit: 100
      });
      state.assets = res.data || [];
      state.lastSync = new Date();
      renderAssets();
    } catch (err) {
      if (!silent) setTableState('Could not load assets: ' + apiErrorMessage(err));
    }
  }

  async function refreshSummaryStats() {
    try {
      var assets = await api.listAssets({ limit: 100 });
      var open = await api.listIssues({ status: 'open', limit: 100 });
      state.allAssets = assets.data || [];
      state.openIssueCount = (open.data || []).length;
      renderStats();
    } catch (err) { /* table/issue panels already show the failure */ }
  }

  function renderStats() {
    var pool = state.allAssets.length ? state.allAssets : state.assets;
    $('statTotal').textContent = pool.length;
    $('statOperational').textContent = pool.filter(function (a) { return a.status === 'operational'; }).length;
    $('statMaintenance').textContent = pool.filter(function (a) { return a.status === 'maintenance' || a.status === 'degraded'; }).length;
    $('statIssues').textContent = state.openIssueCount;
  }

  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function renderAssets() {
    var tb = $('assetRows');
    tb.innerHTML = '';
    var sync = state.lastSync ? ' · live, updated ' + state.lastSync.toLocaleTimeString() : '';
    $('resultCount').textContent = state.assets.length + ' asset(s)' + sync;
    if (!state.assets.length) {
      setTableState('No assets found. Adjust search/filters or add a new asset.');
      return;
    }
    setTableState(null);
    state.assets.forEach(function (a) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><strong>' + esc(a.id) + '</strong></td><td>' + esc(a.name) + '</td><td>' + esc(a.category) + '</td>' +
        '<td>' + esc(a.location) + '</td>' +
        '<td><span class="badge ' + esc(a.status) + '">' + esc(a.status) + '</span></td>' +
        '<td>' + esc(a.lastMaintenance || '–') + '</td><td>' + esc(a.nextMaintenance || '–') + '</td>';
      var td = document.createElement('td');
      td.className = 'row-actions';
      [['View', function () { showDetail(a.id); }], ['Edit', function () { openForm(a); }], ['Delete', function () { askDelete(a); }]].forEach(function (pair) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'btn small' + (pair[0] === 'Delete' ? ' danger' : ' secondary');
        b.textContent = pair[0];
        b.setAttribute('aria-label', pair[0] + ' asset ' + a.id);
        b.addEventListener('click', pair[1]);
        td.appendChild(b);
      });
      tr.appendChild(td);
      tb.appendChild(tr);
    });
  }

  async function showDetail(id) {
    var body = $('detailBody');
    body.innerHTML = '<p class="muted">Loading…</p>';
    $('detailDialog').showModal();
    try {
      var a = await api.getAsset(id);
      var maint = await api.getMaintenance(id);
      var issues = await api.listIssues({ assetId: id, limit: 20 });
      var rows = [['Asset ID', a.id], ['Name', a.name], ['Category', a.category],
        ['Location', a.location + (a.locationName ? ' — ' + a.locationName : '')],
        ['Status', a.status], ['Marker ID', a.markerId || '–'],
        ['Last maintenance', a.lastMaintenance || '–'], ['Next maintenance', a.nextMaintenance || '–']];
      var html = '<p>' + esc(a.description || 'No description.') + '</p><dl class="detail-grid">' +
        rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>';
      html += '<h3>Maintenance history (' + maint.length + ')</h3>';
      html += maint.length ? '<ul class="mini-list">' + maint.map(function (m) {
        return '<li><strong>' + esc(m.date) + '</strong> [' + esc(m.type) + '] ' + esc(m.description) + (m.performedBy ? ' — ' + esc(m.performedBy) : '') + '</li>';
      }).join('') + '</ul>' : '<p class="muted">No maintenance records.</p>';
      var list = issues.data || [];
      html += '<h3>Reported issues (' + list.length + ')</h3>';
      html += list.length ? '<ul class="mini-list">' + list.map(function (i) {
        return '<li><span class="badge ' + esc(i.status) + '">' + esc(i.status) + '</span> ' + esc(i.description) + ' <span class="muted">(' + esc(i.reportedAt || '') + ')</span></li>';
      }).join('') + '</ul>' : '<p class="muted">No issues reported for this asset.</p>';
      body.innerHTML = html;
    } catch (err) {
      body.innerHTML = '<p class="form-error">Could not load details: ' + esc(apiErrorMessage(err)) + '</p>';
    }
  }

  function openForm(asset) {
    var form = $('assetForm');
    form.reset();
    $('assetFormError').hidden = true;
    state.editingId = asset ? asset.id : null;
    $('assetDialogTitle').textContent = asset ? 'Edit asset ' + asset.id : 'New asset';
    if (asset) {
      form.id.value = asset.id; form.id.disabled = true;
      form.name.value = asset.name || ''; form.category.value = asset.category || '';
      form.location.value = asset.location || ''; form.status.value = asset.status || 'operational';
      form.markerId.value = asset.markerId || '';
      form.lastMaintenance.value = asset.lastMaintenance || ''; form.nextMaintenance.value = asset.nextMaintenance || '';
      form.description.value = asset.description || '';
      form.imageUrl.value = asset.imageUrl || ''; form.modelUrl.value = asset.modelUrl || '';
    } else { form.id.disabled = false; }
    $('assetDialog').showModal();
  }

  async function submitForm(ev) {
    ev.preventDefault();
    var form = $('assetForm');
    var err = $('assetFormError');
    var payload = {
      name: form.name.value.trim(), category: form.category.value.trim(),
      location: form.location.value, status: form.status.value,
      markerId: form.markerId.value.trim() || null,
      lastMaintenance: form.lastMaintenance.value || null,
      nextMaintenance: form.nextMaintenance.value || null,
      description: form.description.value.trim(),
      imageUrl: form.imageUrl.value.trim(), modelUrl: form.modelUrl.value.trim()
    };
    if (!state.editingId && form.id.value.trim()) payload.id = form.id.value.trim();
    if (!payload.name || !payload.category || !payload.location) {
      err.textContent = 'Name, category and location are required.';
      err.hidden = false; return;
    }
    if (payload.lastMaintenance && payload.nextMaintenance && payload.nextMaintenance < payload.lastMaintenance) {
      err.textContent = 'Next maintenance must be on or after last maintenance.';
      err.hidden = false; return;
    }
    err.hidden = true;
    $('assetSubmit').disabled = true;
    try {
      if (state.editingId) await api.updateAsset(state.editingId, payload);
      else await api.createAsset(payload);
      $('assetDialog').close();
      alert(state.editingId ? 'Asset updated.' : 'Asset created.', 'ok');
      await refreshAssets();
      await refreshSummaryStats();
    } catch (e) {
      err.textContent = apiErrorMessage(e);
      err.hidden = false;
    } finally { $('assetSubmit').disabled = false; }
  }

  function askDelete(asset) {
    state.deleteId = asset.id;
    $('confirmText').textContent = 'Delete ' + asset.id + ' (' + asset.name + ')? Its markers, maintenance and issues will also be removed. This cannot be undone.';
    $('confirmDialog').showModal();
  }

  async function refreshIssues(silent) {
    var list = $('issueList');
    try {
      var res = await api.listIssues({ status: $('issueStatusFilter').value, limit: 100 });
      state.issues = res.data || [];
      list.innerHTML = '';
      $('issueState').hidden = true;
      $('issueState').textContent = '';
      if (!state.issues.length) {
        $('issueState').hidden = false;
        $('issueState').textContent = 'No issues match this filter.';
        return;
      }
      state.issues.forEach(function (i) {
        var li = document.createElement('li');
        var sel = document.createElement('select');
        sel.setAttribute('aria-label', 'Status for issue ' + i.id);
        ['open', 'in_progress', 'resolved', 'rejected'].forEach(function (s) {
          var o = document.createElement('option'); o.value = s; o.textContent = s; if (i.status === s) o.selected = true; sel.appendChild(o);
        });
        sel.addEventListener('change', async function () {
          sel.disabled = true;
          try { await api.updateIssueStatus(i.id, sel.value); i.status = sel.value; await refreshSummaryStats(); alert('Issue #' + i.id + ' → ' + sel.value, 'ok'); }
          catch (e) { alert('Could not update issue: ' + apiErrorMessage(e), 'error'); sel.value = i.status; }
          finally { sel.disabled = false; }
        });
        li.innerHTML = '<div class="issue-meta"><span class="badge ' + esc(i.status) + '">' + esc(i.status) + '</span>' +
          '<strong>#' + i.id + ' · ' + esc(i.assetId) + '</strong><span>' + esc(i.reportedAt ? String(i.reportedAt).slice(0, 10) : '') + '</span>' +
          (i.reportedBy ? '<span>by ' + esc(i.reportedBy) + '</span>' : '') + '</div><p>' + esc(i.description) + '</p>';
        li.appendChild(sel);
        list.appendChild(li);
      });
    } catch (e) {
      $('issueState').hidden = false;
      $('issueState').textContent = 'Could not load issues: ' + apiErrorMessage(e);
    }
  }

  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); var a = arguments, s = this; t = setTimeout(function () { fn.apply(s, a); }, ms); };
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('searchInput').addEventListener('input', debounce(function () { refreshAssets(true); }, 250));
    ['statusFilter', 'categoryFilter', 'locationFilter'].forEach(function (id) { $(id).addEventListener('change', function () { refreshAssets(false); }); });
    $('issueStatusFilter').addEventListener('change', function () { refreshIssues(false); });
    $('reloadBtn').addEventListener('click', function () { loadAll(); });
    $('newAssetBtn').addEventListener('click', function () { openForm(null); });
    $('assetForm').addEventListener('submit', submitForm);
    $('confirmDelete').addEventListener('click', async function () {
      try { await api.deleteAsset(state.deleteId); $('confirmDialog').close(); alert('Asset deleted.', 'ok'); await refreshAssets(); await refreshSummaryStats(); }
      catch (e) { alert('Delete failed: ' + apiErrorMessage(e), 'error'); }
    });
    $('apiBase').addEventListener('change', function (e) {
      try { window.localStorage.setItem('ar_passport_api_base', e.target.value.trim()); } catch (x) { /* ignore */ }
      window.DASHBOARD_CONFIG.API_BASE_URL = e.target.value.trim().replace(/\/$/, '');
      loadAll();
    });
    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { b.closest('dialog').close(); });
    });
    loadAll();
    // Live updates: re-fetch silently every 10s (skipped while tab hidden),
    // plus a refresh whenever the tab becomes visible again. No mock data —
    // every render comes from the backend.
    setInterval(function () {
      if (document.hidden) return;
      refreshAssets(true);
      refreshIssues(true);
      refreshSummaryStats();
    }, 10000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { refreshAssets(true); refreshIssues(true); refreshSummaryStats(); }
    });
  });
})();
