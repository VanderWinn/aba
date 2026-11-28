/* Ambassador page markup. Uses the dashboard card, chip, menu, and side-panel classes. */
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

  function pct(count, total) {
    if (!total) return '';
    return Math.round((count / total) * 100) + '%';
  }

  function kpi(label, value, drill, tip, note, tone) {
    return card(label, tip, '<button type="button" class="kpi-num" data-drill="' + drill + '">' + value + '</button>' +
      (note ? '<p class="kpi-caption">' + note + '</p>' : '') +
      '<p class="card-foot"><button type="button" class="detail-link" data-drill="' + drill + '">View records</button></p>',
      ' card-kpi ' + (tone || ''));
  }

  function chip(label, key) {
    return '<button type="button" class="filter-chip" data-clear="' + esc(key) + '">' + esc(label) +
      ' <span aria-hidden="true">×</span><span class="sr-only"> Remove</span></button>';
  }

  function rangeFace(state) {
    if (state.rangeKind === 'last12') return 'Last 12 months';
    if (state.rangeKind === 'last3') return 'Last 3 fiscal years';
    if (state.rangeKind === 'custom') return 'Custom';
    return 'This fiscal year';
  }

  function groupLabel(group) {
    if (group === 'quarter') return 'Quarter';
    if (group === 'year') return 'Year';
    return 'Month';
  }

  function rangeMenu(state) {
    var open = state.openMenu === 'range';
    var kinds = [['fy', 'This fiscal year'], ['last12', 'Last 12 months'], ['last3', 'Last 3 fiscal years']];
    var radios = kinds.map(function (item) {
      var on = state.rangeKind === item[0];
      return '<label class="check"><input type="radio" name="date-range" data-range="' + item[0] + '"' + (on ? ' checked' : '') + '> ' + item[1] + (on ? ' <span class="tick">✓</span>' : '') + '</label>';
    }).join('');
    return '<div class="multi range-menu' + (open ? ' is-open' : '') + '" data-menu="range">' +
      '<button type="button" class="multi-face" data-menu-toggle="range" aria-expanded="' + (open ? 'true' : 'false') + '" aria-label="Date range">' + esc(rangeFace(state)) + '</button>' +
      '<div class="multi-pop"' + (open ? '' : ' hidden') + '><p class="custom-label">Date range</p>' + radios + '</div></div>';
  }

  function groupControl(state) {
    var items = [['month', 'Month'], ['quarter', 'Quarter'], ['year', 'Year']];
    return '<div class="pseg" role="group" aria-label="Group by">' + items.map(function (item) {
      var on = state.group === item[0];
      return '<button type="button" data-group="' + item[0] + '"' + (on ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' +
        (on ? '<span class="tick" aria-hidden="true">✓</span> ' : '') + item[1] + '</button>';
    }).join('') + '</div>';
  }

  function checks(title, rows, attr, selected) {
    return '<div class="rail-block"><div class="h">' + esc(title) + '</div>' + rows.map(function (row) {
      var on = selected === row.name;
      return '<label class="check tog-check"><input type="checkbox" ' + attr + '="' + esc(row.name) + '"' + (on ? ' checked' : '') + '> <span class="tog-label">' + esc(row.name) + '</span>' +
        (on ? ' <span class="tick">✓</span>' : '') + ' <span class="n">' + row.count + '</span></label>';
    }).join('') + '</div>';
  }

  function countBy(rows, key) {
    var counts = {};
    rows.forEach(function (row) {
      var name = row[key];
      if (!name) return;
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.keys(counts).map(function (name) { return { name: name, count: counts[name] }; });
  }

  function sideFilters(source, state) {
    var model = root.ABAAmbassador;
    var page = state.page;
    var blocks = '';
    if (page === 'overview') {
      var signups = model.signupsIn(source, Object.assign({}, state, { ambassador: '', eventType: '', role: '' }));
      var names = countBy(signups, 'name');
      var types = {};
      var roles = {};
      signups.forEach(function (row) {
        types[row.eventType] = types[row.eventType] || {};
        types[row.eventType][row.eventType + '|' + row.date] = true;
        roles[row.role] = (roles[row.role] || 0) + 1;
      });
      blocks += checks('Ambassador', names, 'data-ambassador-option', state.ambassador);
      blocks += checks('Event type', Object.keys(types).map(function (name) { return { name: name, count: Object.keys(types[name]).length }; }), 'data-event-option', state.eventType);
      blocks += checks('Role', Object.keys(roles).map(function (name) { return { name: name, count: roles[name] }; }), 'data-role-option', state.role);
    } else if (page === 'companies') {
      var coverage = model.ownersIn(source, Object.assign({}, state, { ambassador: '', company: '', folderStatus: '' }));
      blocks += checks('Ambassador', countBy(coverage.filter(function (row) { return row.ambassador; }), 'ambassador'), 'data-ambassador-option', state.ambassador);
      blocks += checks('Company', coverage.map(function (row) { return { name: row.company, count: 1 }; }), 'data-company-option', state.company);
      blocks += checks('Coverage', [{ name: 'Uncovered', count: coverage.filter(function (row) { return row.uncovered; }).length }], 'data-folder-option', state.folderStatus);
    } else {
      var deliveries = model.deliveriesIn(source, Object.assign({}, state, { ambassador: '', company: '', folderStatus: '' }));
      var statuses = ['Not started', 'Assigned', 'Delivered'].map(function (name) {
        return { name: name, count: deliveries.filter(function (row) { return row.status === name; }).length };
      });
      blocks += checks('Ambassador', countBy(deliveries.filter(function (row) { return row.ambassador; }), 'ambassador'), 'data-ambassador-option', state.ambassador);
      blocks += checks('Company', countBy(deliveries, 'company'), 'data-company-option', state.company);
      blocks += checks('Folder status', statuses, 'data-folder-option', state.folderStatus);
    }
    var actors = [];
    (source.signups || []).forEach(function (row) { if (actors.indexOf(row.name) === -1) actors.push(row.name); });
    blocks += '<div class="rail-block"><div class="h">Acting as' + hint('The shared portal password cannot tell an ambassador, a committee lead, and the folder team apart. AMBASSADOR_ROLE_LISTS is the working name list for this preview.') + '</div>' +
      actors.map(function (name) {
        var on = state.actor === name;
        return '<label class="check"><input type="radio" name="actor" data-actor="' + esc(name) + '"' + (on ? ' checked' : '') + '> ' + esc(name) + (on ? ' <span class="tick">✓</span>' : '') + '</label>';
      }).join('') + '</div>';
    return '<aside class="side" id="filters">' + blocks + '</aside>';
  }

  function bars(rows, attr) {
    var max = 1;
    rows.forEach(function (row) { if (row.value > max) max = row.value; });
    return '<div class="chart-slot">' + rows.map(function (row) {
      var width = Math.max(4, Math.round((row.value / max) * 100));
      return '<button type="button" class="filter-hit tenure-hit' + (row.on ? ' is-on' : '') + '" ' + attr + '="' + esc(row.name) + '" aria-pressed="' + (row.on ? 'true' : 'false') + '">' +
        '<span class="pl">' + esc(row.label || row.name) + '</span><span class="pv">' + row.value + '</span>' +
        '<span class="bar" style="display:block;height:8px;width:' + width + '%;background:#3F768B;border-radius:2px;grid-column:1 / -1"></span></button>';
    }).join('') + '</div>';
  }

  function render(source, state, numbers, message) {
    var model = root.ABAAmbassador;
    var page = state.page || 'overview';
    var chips = '';
    if (page === 'overview' || page === 'companies' || page === 'folders') {
      if (state.ambassador) chips += chip('Ambassador: ' + state.ambassador, 'ambassador');
    }
    if (page === 'overview' && state.eventType) chips += chip('Event type: ' + state.eventType, 'eventType');
    if (page === 'overview' && state.role) chips += chip('Role: ' + state.role, 'role');
    if ((page === 'companies' || page === 'folders') && state.company) chips += chip('Company: ' + state.company, 'company');
    if (page === 'companies' && state.folderStatus === 'Uncovered') chips += chip('Coverage: Uncovered', 'folderStatus');
    if (page === 'folders' && state.folderStatus && state.folderStatus !== 'Uncovered') chips += chip('Folder status: ' + state.folderStatus, 'folderStatus');
    if (state.rangeKind && state.rangeKind !== 'fy') chips += chip('Date range: ' + rangeFace(state), 'range');
    var filtersOn = !!(state.ambassador || state.eventType || state.role || state.company || state.folderStatus || (state.rangeKind && state.rangeKind !== 'fy'));
    var clear = filtersOn ? '<button type="button" class="clear-filters" data-clear="all">Clear selections</button>' : '';
    var signups = model.signupsIn(source, state);
    var byName = {};
    signups.forEach(function (row) { byName[row.name] = (byName[row.name] || 0) + 1; });
    var shiftBars = Object.keys(byName).map(function (name) {
      return { name: name, value: byName[name], on: state.ambassador === name };
    });
    var body = page === 'companies' ? companiesPage(source, state, numbers) : (page === 'folders' ? foldersPage(source, state, numbers) : overviewPage(source, state, numbers, shiftBars));
    var cols = page === 'folders' ? ' cols-4' : (page === 'companies' ? ' cols-2' : ' cols-3');
    return '<header class="docbar"><div class="brand-wrap"><a class="mark" href="https://adabusinessassociation.com/" target="_blank" rel="noopener noreferrer" aria-label="Ada Business Association website"><img src="../assets/aba-logo.png" alt=""></a><a class="brand" href="../"><span class="brand-full">Board &amp; Committee Portal</span></a>' +
      '<span class="example-badge">Example data</span></div><nav class="topnav" aria-label="Portal">' +
      '<a class="nav-link" href="../dashboard/">Dashboard</a>' +
      '<a class="nav-link on" href="./" aria-current="page">Ambassadors</a>' +
      '<a class="nav-link" href="https://vanderwinn.github.io/aba-hospitality-signup/" target="_blank" rel="noopener noreferrer">Hospitality Sign-Up</a>' +
      '</nav></header><div class="shell"><div class="view-tabs" role="tablist">' +
      tab('overview', 'Overview', state) + tab('companies', 'My Companies', state) + tab('folders', 'Folder deliveries', state) +
      '</div><div class="controls"><div class="dgroup"><span class="lab">Date range</span>' + rangeMenu(state) + '</div>' +
      '<div class="dgroup"><span class="lab">Group by</span>' + groupControl(state) + '</div>' +
      (chips ? '<div class="filter-chips" aria-label="Active filters">' + chips + '</div>' : '') + clear + '</div>' +
      '<p class="context-line">' + esc(rangeFace(state)) + ' · Grouped by ' + esc(groupLabel(state.group)) + '</p>' +
      (message ? '<p class="no-matches" role="status">' + esc(message) + '</p>' : '') +
      '<div class="body">' + sideFilters(source, state) + '<div class="main' + cols + '" id="content">' + body + '</div></div></div>';
  }

  function tab(id, label, state) {
    var on = state.page === id;
    return '<button type="button" role="tab" data-amb-page="' + id + '"' + (on ? ' class="on" aria-selected="true"' : '') + '>' + label + '</button>';
  }

  function overviewPage(source, state, numbers, shiftBars) {
    var model = root.ABAAmbassador;
    var upcoming = model.upcomingIn(source, state);
    var events = model.eventGroups(source, state);
    return '<div class="kpi-row">' +
      kpi('Events', numbers.events, 'events', 'Distinct events after canceled sign-ups are removed. Setup and cleanup at the same event count once. Events Worked is omitted. Volunteer sign-ups have no attendance or completion field.', '', 'kpi-events') +
      kpi('Shifts', numbers.shifts, 'shifts', 'One row per role. Setup and cleanup at the same event are two shifts.', '', 'kpi-visits') +
      kpi('Upcoming', numbers.upcoming, 'upcoming', 'Assignments on or after today, with the shift date and time.', numbers.shifts ? pct(numbers.upcoming, numbers.shifts) + ' of shifts' : '', 'kpi-members') +
      '</div><div class="chart-grid">' +
      card('Shifts by ambassador', 'Click a name to filter. The count is shifts, not events.', bars(shiftBars, 'data-ambassador-bar'), '') +
      card('Shifts by ' + groupLabel(state.group).toLowerCase(), 'Group by changes these buckets. Counts stay shifts.', bars(model.shiftPeriods(source, state), 'data-period'), '') +
      '</div><div class="chart-grid">' +
      card('Events', 'Canceled sign-ups are left out. Two roles on one date stay one event.', '<ul class="portal-list">' + events.map(function (row) {
        return '<li><button type="button" class="detail-link" data-event-bar="' + esc(row.eventType) + '">' +
          esc(model.shortDate(row.date)) + ' · ' + esc(row.eventType) + ' · ' + esc(row.name) + ' · ' + esc(row.roles.join(' + ')) + '</button></li>';
      }).join('') + '</ul><p class="card-foot"><button type="button" class="detail-link" data-drill="events">View records</button></p>', '') +
      card('Upcoming', 'The date and time come from the shift.', '<ul class="portal-list">' + upcoming.map(function (row) {
        return '<li><button type="button" class="detail-link" data-ambassador-bar="' + esc(row.name) + '">' + esc(model.formatUpcoming(row)) + '</button></li>';
      }).join('') + '</ul><p class="card-foot"><button type="button" class="detail-link" data-drill="upcoming">View records</button></p>', '') +
      '</div>';
  }

  function companiesPage(source, state, numbers) {
    var rows = root.ABAAmbassador.ownersIn(source, state);
    var lead = (source.roles.committeeLeads || []).indexOf(state.actor) !== -1;
    var names = [];
    (source.signups || []).forEach(function (row) { if (names.indexOf(row.name) === -1) names.push(row.name); });
    return '<div class="kpi-row">' +
      kpi('Uncovered', numbers.uncovered, 'uncovered', 'Directory members with no ambassador owner.', pct(numbers.uncovered, numbers.uncovered + numbers.covered) + ' of directory', 'kpi-renewal') +
      kpi('Covered', numbers.covered, 'companies', 'Companies that currently have an owner.', pct(numbers.covered, numbers.uncovered + numbers.covered) + ' of directory', 'kpi-net') +
      '</div>' + card('Directory members', 'Claim an uncovered company. A second claim is rejected. Only a committee lead can reassign.',
      '<table class="drill-table"><thead><tr><th>Company</th><th>Owner</th><th></th></tr></thead><tbody>' +
      rows.map(function (row) {
        var owner = row.uncovered ? 'Uncovered' : '<button type="button" class="detail-link" data-ambassador-bar="' + esc(row.ambassador) + '">' + esc(row.ambassador) + '</button>';
        var action = row.uncovered
          ? '<button type="button" data-claim="' + esc(row.company) + '">Claim</button>'
          : (lead ? reassignMenu(state, row.company, names) : '');
        return '<tr><td><button type="button" class="detail-link" data-company-bar="' + esc(row.company) + '">' + esc(row.company) + '</button></td><td>' + owner + '</td><td>' + action + '</td></tr>';
      }).join('') + '</tbody></table><p class="card-foot"><button type="button" class="detail-link" data-drill="companies">View records</button></p>', '');
  }

  function reassignMenu(state, company, names) {
    var open = state.openMenu === 'reassign:' + company;
    return '<div class="multi' + (open ? ' is-open' : '') + '"><button type="button" class="multi-face" data-menu-toggle="reassign:' + esc(company) + '" aria-expanded="' + (open ? 'true' : 'false') + '">Reassign</button>' +
      '<div class="multi-pop"' + (open ? '' : ' hidden') + '>' + names.map(function (name) {
        return '<button type="button" data-reassign-company="' + esc(company) + '" data-reassign-name="' + esc(name) + '">' + esc(name) + '</button>';
      }).join('') + '</div></div>';
  }

  function foldersPage(source, state, numbers) {
    var rows = root.ABAAmbassador.deliveriesIn(source, state);
    return '<div class="kpi-row">' +
      kpi('Not started', numbers.folders['Not started'], 'not-started', 'Team total. Not tied to who owns the company.', pct(numbers.folders['Not started'], numbers.teamTotal) + ' of team', 'kpi-noshow') +
      kpi('Assigned', numbers.folders.Assigned, 'assigned', 'Assigned to a folder-team member. The ambassador stays the company owner.', pct(numbers.folders.Assigned, numbers.teamTotal) + ' of team', 'kpi-visits') +
      kpi('Delivered', numbers.folders.Delivered, 'delivered', 'Completion is recorded by the folder team and does not change the owner.', pct(numbers.folders.Delivered, numbers.teamTotal) + ' of team', 'kpi-net') +
      kpi('Named credit', numbers.credited, 'credited', 'Counted only when Completed by names the person.', (numbers.folders.Delivered ? pct(numbers.credited, numbers.folders.Delivered) + ' of delivered' : ''), 'kpi-events') +
      '</div>' + card('Folder deliveries', 'Ambassador is the current company owner. Credit goes to Completed by.',
      '<table class="drill-table"><thead><tr><th>Company</th><th>Ambassador</th><th>Assigned to</th><th>Status</th><th>Completed on</th><th>Completed by</th><th></th></tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr><td><button type="button" class="detail-link" data-company-bar="' + esc(row.company) + '">' + esc(row.company) + '</button></td><td>' +
          (row.ambassador ? '<button type="button" class="detail-link" data-ambassador-bar="' + esc(row.ambassador) + '">' + esc(row.ambassador) + '</button>' : 'Uncovered') +
          '</td><td>' + esc(row.assignedTo || '') + '</td><td><button type="button" class="detail-link" data-folder-bar="' + esc(row.status) + '">' + esc(row.status) + '</button></td><td>' +
          esc(row.completedOn || '') + '</td><td>' + esc(row.completedBy || '') + '</td><td>' +
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
