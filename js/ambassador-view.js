/* Ambassador page markup. Uses the dashboard card, chip, and drill classes. */
(function (root) {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function hint(text) {
    return '<span class="info" tabindex="0" role="button" aria-label="About this number">ⓘ<span class="tip" role="tooltip">' + esc(text) + '</span></span>';
  }

  function card(title, tip, body, extra) {
    return '<section class="card' + (extra || '') + '"><div class="hd"><h2 class="ttl">' + esc(title) + (tip ? hint(tip) : '') +
      '</h2></div><div class="bodycol">' + body + '</div></section>';
  }

  function kpi(label, value, drill, tip, note) {
    return card(label, tip, '<button type="button" class="kpi-num" data-drill="' + drill + '">' + value + '</button>' +
      (note ? '<p class="kpi-caption">' + note + '</p>' : '') +
      '<p class="card-foot"><button type="button" class="detail-link" data-drill="' + drill + '">View records</button></p>', ' card-kpi');
  }

  function pct(count, total) {
    if (!total) return '';
    return Math.round((count / total) * 100) + '%';
  }

  function chip(label, attr, value) {
    return '<button type="button" class="filter-chip" ' + attr + '="' + esc(value) + '">' + esc(label) +
      ' <span aria-hidden="true">×</span><span class="sr-only"> Remove</span></button>';
  }

  function options(list, selected) {
    return list.map(function (item) {
      var value = Array.isArray(item) ? item[0] : item;
      var label = Array.isArray(item) ? item[1] : item;
      return '<option value="' + esc(value) + '"' + (value === selected ? ' selected' : '') + '>' + esc(label) + '</option>';
    }).join('');
  }

  function bars(rows, attr, kind) {
    var max = 1;
    rows.forEach(function (row) { if (row.value > max) max = row.value; });
    return '<div class="chart-slot">' + rows.map(function (row) {
      var width = Math.max(4, Math.round((row.value / max) * 100));
      return '<button type="button" class="filter-hit tenure-hit' + (row.on ? ' is-on' : '') + '" ' + attr + '="' + esc(row.name) + '" aria-pressed="' + (row.on ? 'true' : 'false') + '">' +
        '<span class="pl">' + esc(row.name) + '</span><span class="pv">' + row.value + (row.share ? ' <span class="share">' + esc(row.share) + '</span>' : '') + '</span>' +
        '<span class="bar" style="display:block;height:8px;width:' + width + '%;background:#3F768B;border-radius:2px;grid-column:1 / -1"></span></button>';
    }).join('') + '</div>';
  }

  function render(source, state, numbers, message) {
    var model = root.ABAAmbassador;
    var signups = model.signupsIn(source, state);
    var names = [];
    var types = [];
    var roles = [];
    (source.signups || []).forEach(function (row) {
      if (names.indexOf(row.name) === -1) names.push(row.name);
      if (types.indexOf(row.eventType) === -1) types.push(row.eventType);
      if (roles.indexOf(row.role) === -1) roles.push(row.role);
    });
    var companies = (source.companies || []).map(function (row) { return row.company; });
    var chips = '';
    if (state.ambassador) chips += chip('Ambassador: ' + state.ambassador, 'data-clear', 'ambassador');
    if (state.eventType) chips += chip('Event type: ' + state.eventType, 'data-clear', 'eventType');
    if (state.role) chips += chip('Role: ' + state.role, 'data-clear', 'role');
    if (state.company) chips += chip('Company: ' + state.company, 'data-clear', 'company');
    if (state.folderStatus) chips += chip('Folder status: ' + state.folderStatus, 'data-clear', 'folderStatus');
    var range = model.rangeFor(state, source.asOf);
    var byName = {};
    signups.forEach(function (row) { byName[row.name] = (byName[row.name] || 0) + 1; });
    var shiftTotal = signups.length || 1;
    var shiftBars = Object.keys(byName).map(function (name) {
      return { name: name, value: byName[name], share: Math.round((byName[name] / shiftTotal) * 100) + '%', on: state.ambassador === name };
    });
    var body = '';
    if (state.page === 'companies') body = companiesPage(source, state, numbers);
    else if (state.page === 'folders') body = foldersPage(source, state, numbers);
    else body = overviewPage(source, state, numbers, shiftBars);
    var flag = numbers.attendanceVerified ? '' : '<p class="scope-note">Events Worked is omitted. Volunteer sign-ups have no attendance or completion field.</p>';
    return '<header class="docbar"><div class="brand-wrap"><a class="mark" href="https://adabusinessassociation.com/" target="_blank" rel="noopener noreferrer" aria-label="Ada Business Association website"><img src="../assets/aba-logo.png" alt=""></a><a class="brand" href="../"><span class="brand-full">Board &amp; Committee Portal</span></a>' +
      '<span class="example-badge">Example data</span></div><nav class="topnav" aria-label="Portal">' +
      '<a class="nav-link" href="../dashboard/">Dashboard</a>' +
      '<a class="nav-link on" href="./" aria-current="page">Ambassadors</a>' +
      '<a class="nav-link" href="https://vanderwinn.github.io/aba-hospitality-signup/" target="_blank" rel="noopener noreferrer">Hospitality Sign-Up</a>' +
      '</nav></header><div class="shell"><div class="view-tabs" role="tablist">' +
      tab('overview', 'Overview', state) + tab('companies', 'My Companies', state) + tab('folders', 'Folder deliveries', state) +
      '</div><div class="controls">' + field('Date range', '<select data-range>' + options([['fy', 'This fiscal year'], ['last12', 'Last 12 months'], ['last3', 'Last 3 fiscal years']], state.rangeKind) + '</select>') +
      field('Group by', '<select data-group>' + options([['month', 'Month'], ['quarter', 'Quarter'], ['year', 'Year']], state.group) + '</select>') +
      field('Ambassador', '<select data-ambassador><option value="">All</option>' + options(names, state.ambassador) + '</select>') +
      field('Event type', '<select data-event-type><option value="">All</option>' + options(types, state.eventType) + '</select>') +
      field('Role', '<select data-role><option value="">All</option>' + options(roles, state.role) + '</select>') +
      field('Company', '<select data-company><option value="">All</option>' + options(companies, state.company) + '</select>') +
      field('Folder status', '<select data-folder-status><option value="">All</option>' + options(['Uncovered', 'Not started', 'Assigned', 'Delivered'], state.folderStatus) + '</select>') +
      field('Acting as', '<select data-actor>' + options(names, state.actor) + '</select>', 'The shared portal password cannot tell an ambassador, a committee lead, and the folder team apart. AMBASSADOR_ROLE_LISTS is the working name list for this preview.') +
      '<button type="button" class="clear-filters" data-clear="all">Clear selections</button></div>' +
      (chips ? '<div class="filter-chips">' + chips + '</div>' : '') +
      '<p class="context-line">' + esc(range.label) + ' · Grouped by ' + esc(state.group) + '</p>' + flag +
      (message ? '<p class="no-matches" role="status">' + esc(message) + '</p>' : '') +
      '<div class="main" id="content">' + body + '</div></div>';
  }

  function field(label, control, tip) {
    return '<div class="dgroup"><span class="lab">' + esc(label) + (tip ? hint(tip) : '') + '</span>' + control + '</div>';
  }

  function tab(id, label, state) {
    var on = state.page === id;
    return '<button type="button" role="tab" data-amb-page="' + id + '"' + (on ? ' class="on" aria-selected="true"' : '') + '>' + label + '</button>';
  }

  function overviewPage(source, state, numbers, shiftBars) {
    var upcoming = root.ABAAmbassador.upcomingIn(source, state);
    return '<div class="kpi-row">' +
      kpi('Events', numbers.events, 'events', 'Distinct events after canceled sign-ups are removed. Two roles at one event count once.') +
      kpi('Shifts', numbers.shifts, 'shifts', 'One row per role. Setup and cleanup at the same event are two shifts.') +
      kpi('Upcoming', numbers.upcoming, 'upcoming', 'Assignments on or after today, with the shift date and time.', numbers.shifts ? pct(numbers.upcoming, numbers.shifts) + ' of shifts' : '') +
      '</div><div class="chart-grid">' +
      card('Shifts by ambassador', 'Click a name to filter.', bars(shiftBars, 'data-ambassador-bar', 'shifts'), ' card-gains') +
      card('Shifts by ' + state.group, 'Group by changes these buckets. Counts stay shifts, not events.', bars(root.ABAAmbassador.shiftPeriods(source, state).map(function (row) {
        return { name: row.name, value: row.value, on: false };
      }), 'data-period', 'period'), '') +
      card('Upcoming', 'The date and time come from the shift.', '<ul class="portal-list">' + upcoming.map(function (row) {
        return '<li><button type="button" class="detail-link" data-ambassador-bar="' + esc(row.name) + '">' +
          esc(row.date) + ' ' + esc(row.start) + '–' + esc(row.end) + ' · ' + esc(row.name) + ' · ' + esc(row.role) + '</button></li>';
      }).join('') + '</ul>' + '<p class="card-foot"><button type="button" class="detail-link" data-drill="upcoming">View records</button></p>', '') +
      '</div>';
  }

  function companiesPage(source, state, numbers) {
    var rows = root.ABAAmbassador.ownersIn(source, state);
    var lead = (source.roles.committeeLeads || []).indexOf(state.actor) !== -1;
    var names = [];
    (source.signups || []).forEach(function (row) { if (names.indexOf(row.name) === -1) names.push(row.name); });
    return '<div class="kpi-row">' +
      kpi('Uncovered', numbers.uncovered, 'uncovered', 'Directory members with no ambassador owner.', pct(numbers.uncovered, numbers.uncovered + numbers.covered) + ' of directory') +
      kpi('Covered', numbers.covered, 'companies', 'Companies that currently have an owner.', pct(numbers.covered, numbers.uncovered + numbers.covered) + ' of directory') +
      '</div>' + card('Directory members', 'Claim an uncovered company. A second claim is rejected. Only a committee lead can reassign.',
      '<table class="drill-table"><thead><tr><th>Company</th><th>Owner</th><th></th></tr></thead><tbody>' +
      rows.map(function (row) {
        var owner = row.uncovered ? 'Uncovered' : '<button type="button" class="detail-link" data-ambassador-bar="' + esc(row.ambassador) + '">' + esc(row.ambassador) + '</button>';
        var action = row.uncovered
          ? '<button type="button" data-claim="' + esc(row.company) + '">Claim</button>'
          : (lead ? '<select data-reassign="' + esc(row.company) + '" aria-label="Reassign ' + esc(row.company) + '"><option value="">Reassign</option>' + options(names, '') + '</select>' : '');
        return '<tr><td><button type="button" class="detail-link" data-company-bar="' + esc(row.company) + '">' + esc(row.company) + '</button></td><td>' + owner + '</td><td>' + action + '</td></tr>';
      }).join('') + '</tbody></table><p class="card-foot"><button type="button" class="detail-link" data-drill="companies">View records</button></p>', '');
  }

  function foldersPage(source, state, numbers) {
    var rows = root.ABAAmbassador.deliveriesIn(source, state);
    return '<div class="kpi-row">' +
      kpi('Not started', numbers.folders['Not started'], 'not-started', 'Team total. Not tied to who owns the company.', pct(numbers.folders['Not started'], numbers.teamTotal) + ' of team') +
      kpi('Assigned', numbers.folders.Assigned, 'assigned', 'Assigned to the folder delivery team.', pct(numbers.folders.Assigned, numbers.teamTotal) + ' of team') +
      kpi('Delivered', numbers.folders.Delivered, 'delivered', 'Completion is recorded by the folder team.', pct(numbers.folders.Delivered, numbers.teamTotal) + ' of team') +
      kpi('Named credit', numbers.credited, 'credited', 'Counted only when the record names who completed it.', (numbers.folders.Delivered ? pct(numbers.credited, numbers.folders.Delivered) + ' of delivered' : '')) +
      '</div>' + card('Folder deliveries', 'Recording delivery does not change the company owner.',
      '<table class="drill-table"><thead><tr><th>Company</th><th>Status</th><th>Ambassador</th><th>Completed</th><th></th></tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr><td><button type="button" class="detail-link" data-company-bar="' + esc(row.company) + '">' + esc(row.company) + '</button></td><td>' +
          '<button type="button" class="detail-link" data-folder-bar="' + esc(row.status) + '">' + esc(row.status) + '</button></td><td>' +
          esc(row.completedBy || row.ambassador || '') + '</td><td>' + esc(row.completedOn || '') + '</td><td>' +
          (row.status === 'Delivered' ? '' : '<button type="button" data-deliver="' + esc(row.company) + '">Mark delivered</button>') +
          '</td></tr>';
      }).join('') + '</tbody></table><p class="card-foot"><button type="button" class="detail-link" data-drill="folders">View records</button></p>', '');
  }

  function drill(pack) {
    if (!pack) return '';
    var heads = pack.columns.map(function (column) { return '<th>' + esc(column) + '</th>'; }).join('');
    var body = pack.rows.map(function (row) {
      return '<tr>' + row.map(function (cell) { return '<td>' + esc(cell) + '</td>'; }).join('') + '</tr>';
    }).join('') || '<tr><td colspan="' + Math.max(1, pack.columns.length) + '">No matches</td></tr>';
    return '<div class="drill-back" data-drill-close></div><section class="drill" role="dialog" aria-label="' + esc(pack.title) + '">' +
      '<header class="drill-bar"><button type="button" class="drill-back-btn" data-drill-close>Back</button><h2>' + esc(pack.title) + '</h2>' +
      '<span class="example-badge">Example data</span></header><p class="record-count">' + pack.rows.length + ' records</p>' +
      '<div class="drill-scroll"><table class="drill-table"><thead><tr>' + heads + '</tr></thead><tbody>' + body + '</tbody></table></div></section>';
  }

  root.ABAAmbassadorView = { render: render, drill: drill };
})(typeof window !== 'undefined' ? window : globalThis);
