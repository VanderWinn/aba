/* Ambassador activity. Example names only. No emails or phone numbers. */
(function (root) {
  'use strict';

  var AS_OF = '2026-11-28';
  // The shared portal password cannot tell these roles apart.
  // AMBASSADOR_ROLE_LISTS is the working default for the preview.
  var AMBASSADOR_ROLE_LISTS = {
    committeeLeads: ['Avery Sample'],
    folderTeam: ['Casey Demo', 'Drew Fictitious']
  };

  function exampleSource() {
    return {
      example: true,
      asOf: AS_OF,
      attendanceVerified: false,
      roles: {
        committeeLeads: AMBASSADOR_ROLE_LISTS.committeeLeads.slice(),
        folderTeam: AMBASSADOR_ROLE_LISTS.folderTeam.slice()
      },
      signups: [
        { id: 's1', name: 'Avery Sample', event: 'Lunch & Learn', eventType: 'Lunch & Learn', role: 'Set-Up', date: '2026-11-19', start: '11:00 AM', end: '11:25 AM', status: 'active' },
        { id: 's2', name: 'Avery Sample', event: 'Lunch & Learn', eventType: 'Lunch & Learn', role: 'Clean-Up', date: '2026-11-19', start: '1:00 PM', end: '1:20 PM', status: 'active' },
        { id: 's3', name: 'Blake Placeholder', event: 'Happy Hour', eventType: 'Happy Hour', role: 'Networking Ambassador', date: '2026-12-09', start: '4:30 PM', end: '6:30 PM', status: 'active' },
        { id: 's4', name: 'Casey Demo', event: 'Lunch & Learn', eventType: 'Lunch & Learn', role: 'Set-Up', date: '2026-10-15', start: '11:00 AM', end: '11:25 AM', status: 'cancelled' },
        { id: 's5', name: 'Drew Fictitious', event: 'Ribbon Cutting', eventType: 'Ribbon Cutting', role: 'Photographer', date: '2026-11-17', start: '4:15 PM', end: '5:30 PM', status: 'active' }
      ],
      companies: [
        { company: 'Northwind Cafe' },
        { company: 'Harbor & Co.' },
        { company: 'Pine Street Books' },
        { company: 'Riverlight Dental' },
        { company: 'Elm Goods' }
      ],
      owners: [
        { company: 'Harbor & Co.', ambassador: 'Blake Placeholder', claimedAt: '2026-10-02' },
        { company: 'Riverlight Dental', ambassador: 'Avery Sample', claimedAt: '2026-09-14' }
      ],
      deliveries: [
        { id: 'd1', company: 'Harbor & Co.', status: 'Assigned', ambassador: 'Casey Demo', completedOn: '', completedBy: '' },
        { id: 'd2', company: 'Pine Street Books', status: 'Delivered', ambassador: 'Drew Fictitious', completedOn: '2026-11-02', completedBy: 'Drew Fictitious' },
        { id: 'd3', company: 'Northwind Cafe', status: 'Not started', ambassador: '', completedOn: '', completedBy: '' }
      ],
      audit: []
    };
  }

  function defaultState() {
    return {
      page: 'overview',
      rangeKind: 'fy',
      group: 'month',
      ambassador: '',
      eventType: '',
      role: '',
      company: '',
      folderStatus: '',
      actor: 'Avery Sample'
    };
  }

  function fiscalYear(iso) {
    var year = Number(String(iso).slice(0, 4));
    var month = Number(String(iso).slice(5, 7));
    return month >= 7 ? year + 1 : year;
  }

  function rangeFor(state, asOf) {
    var fy = fiscalYear(asOf);
    if (state.rangeKind === 'last12') {
      return { start: addDays(asOf, -365), end: asOf, label: 'Last 12 months' };
    }
    if (state.rangeKind === 'last3') {
      return { start: (fy - 3) + '-07-01', end: asOf, label: 'Last 3 fiscal years' };
    }
    if (state.rangeKind === 'custom' && state.from && state.to) {
      return { start: state.from, end: state.to, label: state.from + ' to ' + state.to };
    }
    return { start: (fy - 1) + '-07-01', end: fy + '-06-30', label: 'FY' + fy };
  }

  function addDays(iso, days) {
    var parts = String(iso).split('-').map(Number);
    var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function cancelled(row) {
    var status = String(row.status || '').toLowerCase();
    return status === 'cancelled' || status === 'canceled';
  }

  function eventKey(row) {
    return row.eventType + '|' + row.date;
  }

  function signupsIn(source, state) {
    var range = rangeFor(state, source.asOf);
    return (source.signups || []).filter(function (row) {
      if (cancelled(row)) return false;
      if (row.date < range.start || row.date > range.end) return false;
      if (state.ambassador && row.name !== state.ambassador) return false;
      if (state.eventType && row.eventType !== state.eventType) return false;
      if (state.role && row.role !== state.role) return false;
      return true;
    });
  }

  function periodKey(date, group) {
    var iso = String(date || '');
    if (group === 'year') return iso.slice(0, 4);
    if (group === 'quarter') {
      var month = Number(iso.slice(5, 7));
      return iso.slice(0, 4) + ' Q' + (Math.floor((month - 1) / 3) + 1);
    }
    return iso.slice(0, 7);
  }

  function shiftPeriods(source, state) {
    var buckets = {};
    signupsIn(source, state).forEach(function (row) {
      var key = periodKey(row.date, state.group);
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.keys(buckets).sort().map(function (key) { return { name: key, value: buckets[key] }; });
  }

  function upcomingIn(source, state) {
    return signupsIn(source, state).filter(function (row) { return row.date >= source.asOf; });
  }

  function ownersIn(source, state) {
    return (source.companies || []).map(function (row) {
      var owner = (source.owners || []).filter(function (item) { return item.company === row.company; })[0] || null;
      return { company: row.company, ambassador: owner ? owner.ambassador : '', uncovered: !owner };
    }).filter(function (row) {
      if (state.company && row.company !== state.company) return false;
      if (state.ambassador && row.ambassador !== state.ambassador) return false;
      if (state.folderStatus === 'Uncovered' && !row.uncovered) return false;
      return true;
    });
  }

  function deliveriesIn(source, state) {
    var range = rangeFor(state, source.asOf);
    return (source.deliveries || []).filter(function (row) {
      if (state.company && row.company !== state.company) return false;
      if (state.folderStatus && state.folderStatus !== 'Uncovered' && row.status !== state.folderStatus) return false;
      if (state.ambassador && row.ambassador !== state.ambassador && row.completedBy !== state.ambassador) return false;
      if (row.status === 'Delivered' && row.completedOn && (row.completedOn < range.start || row.completedOn > range.end)) return false;
      return true;
    });
  }

  function metrics(source, state) {
    var shifts = signupsIn(source, state);
    var events = {};
    shifts.forEach(function (row) { events[eventKey(row)] = true; });
    var upcoming = upcomingIn(source, state);
    var coverage = ownersIn(source, Object.assign({}, state, { folderStatus: '' }));
    var uncovered = coverage.filter(function (row) { return row.uncovered; });
    var covered = coverage.filter(function (row) { return !row.uncovered; });
    var deliveries = deliveriesIn(source, Object.assign({}, state, { folderStatus: state.folderStatus === 'Uncovered' ? '' : state.folderStatus }));
    var byStatus = { 'Not started': 0, Assigned: 0, Delivered: 0 };
    deliveries.forEach(function (row) { if (byStatus[row.status] != null) byStatus[row.status] += 1; });
    var credited = deliveries.filter(function (row) { return row.status === 'Delivered' && row.completedBy; });
    return {
      events: Object.keys(events).length,
      shifts: shifts.length,
      upcoming: upcoming.length,
      eventsWorked: null,
      attendanceVerified: source.attendanceVerified === true,
      uncovered: uncovered.length,
      covered: covered.length,
      folders: byStatus,
      credited: credited.length,
      teamTotal: deliveries.length
    };
  }

  function lists(source, state, kind) {
    if (kind === 'events' || kind === 'shifts') {
      var rows = signupsIn(source, state);
      if (kind === 'events') {
        var seen = {};
        rows = rows.filter(function (row) {
          var key = eventKey(row);
          if (seen[key]) return false;
          seen[key] = true;
          return true;
        });
      }
      return { title: kind === 'events' ? 'Events' : 'Shifts', columns: ['Ambassador', 'Event', 'Role', 'Date', 'Time'], rows: rows.map(function (row) {
        return [row.name, row.eventType, row.role, row.date, row.start + '–' + row.end];
      }) };
    }
    if (kind === 'upcoming') {
      return { title: 'Upcoming assignments', columns: ['Ambassador', 'Event', 'Role', 'Date', 'Time'], rows: upcomingIn(source, state).map(function (row) {
        return [row.name, row.eventType, row.role, row.date, row.start + '–' + row.end];
      }) };
    }
    if (kind === 'uncovered' || kind === 'companies') {
      var wanted = kind === 'uncovered' ? ownersIn(source, Object.assign({}, state, { folderStatus: 'Uncovered' })) : ownersIn(source, state);
      return { title: kind === 'uncovered' ? 'Uncovered companies' : 'Companies', columns: ['Company', 'Owner'], rows: wanted.map(function (row) {
        return [row.company, row.ambassador || 'Uncovered'];
      }) };
    }
    if (kind === 'folders' || kind === 'credited' || kind === 'not-started' || kind === 'assigned' || kind === 'delivered') {
      var statusName = { 'not-started': 'Not started', assigned: 'Assigned', delivered: 'Delivered' }[kind];
      var deliveries = deliveriesIn(source, state).filter(function (row) {
        if (kind === 'credited') return row.status === 'Delivered' && row.completedBy;
        if (statusName) return row.status === statusName;
        return true;
      });
      return { title: statusName || (kind === 'credited' ? 'Completed by name' : 'Folder deliveries'), columns: ['Company', 'Status', 'Ambassador', 'Completed'], rows: deliveries.map(function (row) {
        return [row.company, row.status, row.completedBy || row.ambassador || '', row.completedOn || ''];
      }) };
    }
    return { title: 'Records', columns: [], rows: [] };
  }

  function roleOk(source, name, listName) {
    var list = (source.roles && source.roles[listName]) || [];
    if (!list.length) return false;
    return list.indexOf(name) !== -1;
  }

  function audit(source, actor, action, company, detail) {
    source.audit.push({ at: source.asOf, actor: actor, action: action, company: company, detail: detail || '' });
  }

  function claim(source, company, ambassador) {
    var existing = (source.owners || []).filter(function (row) { return row.company === company; })[0];
    if (existing) return { ok: false, error: 'That company already has an owner.' };
    source.owners.push({ company: company, ambassador: ambassador, claimedAt: source.asOf });
    audit(source, ambassador, 'claimCompany', company, ambassador);
    return { ok: true };
  }

  function withLock(lock, fn) {
    return lock.waitLock().then(function () {
      return Promise.resolve().then(fn).then(function (result) {
        lock.releaseLock();
        return result;
      }, function (err) {
        lock.releaseLock();
        throw err;
      });
    });
  }

  function makeLock() {
    var locked = false;
    var waiters = [];
    return {
      waitLock: function () {
        return new Promise(function (resolve) {
          if (!locked) { locked = true; resolve(); return; }
          waiters.push(resolve);
        });
      },
      releaseLock: function () {
        var next = waiters.shift();
        if (next) next();
        else locked = false;
      }
    };
  }

  function claimLocked(source, lock, company, ambassador) {
    return withLock(lock, function () {
      return claim(source, company, ambassador);
    });
  }

  function reassign(source, company, ambassador, actor) {
    if (!roleOk(source, actor, 'committeeLeads')) return { ok: false, error: 'Only a committee lead can reassign a company.' };
    var existing = (source.owners || []).filter(function (row) { return row.company === company; })[0];
    if (!existing) return { ok: false, error: 'That company is uncovered.' };
    var previous = existing.ambassador;
    existing.ambassador = ambassador;
    audit(source, actor, 'reassignCompany', company, previous + ' -> ' + ambassador);
    return { ok: true };
  }

  function recordDelivery(source, company, actor, completedOn) {
    if (!roleOk(source, actor, 'folderTeam')) return { ok: false, error: 'Only the folder delivery team can record a delivery.' };
    var row = (source.deliveries || []).filter(function (item) { return item.company === company; })[0];
    if (!row) {
      row = { id: 'd' + ((source.deliveries || []).length + 1), company: company, status: 'Not started', ambassador: '', completedOn: '', completedBy: '' };
      source.deliveries.push(row);
    }
    row.status = 'Delivered';
    row.completedOn = completedOn || source.asOf;
    row.completedBy = actor;
    if (!row.ambassador) row.ambassador = actor;
    audit(source, actor, 'recordFolderDelivery', company, row.completedOn);
    return { ok: true };
  }

  function apply(source, state, action) {
    var next = Object.assign({}, state);
    action = action || {};
    if (action.type === 'page') next.page = action.page;
    if (action.type === 'range') next.rangeKind = action.rangeKind;
    if (action.type === 'group') next.group = action.group;
    if (action.type === 'ambassador') next.ambassador = next.ambassador === action.ambassador ? '' : (action.ambassador || '');
    if (action.type === 'eventType') next.eventType = next.eventType === action.eventType ? '' : (action.eventType || '');
    if (action.type === 'role') next.role = next.role === action.role ? '' : (action.role || '');
    if (action.type === 'company') next.company = next.company === action.company ? '' : (action.company || '');
    if (action.type === 'folderStatus') next.folderStatus = next.folderStatus === action.folderStatus ? '' : (action.folderStatus || '');
    if (action.type === 'actor') next.actor = action.actor || next.actor;
    if (action.type === 'clear') return { state: defaultState(), error: '' };
    var error = '';
    if (action.type === 'claim') {
      var claimed = claim(source, action.company, next.actor);
      if (!claimed.ok) error = claimed.error;
    }
    if (action.type === 'reassign') {
      var moved = reassign(source, action.company, action.ambassador, next.actor);
      if (!moved.ok) error = moved.error;
    }
    if (action.type === 'deliver') {
      var done = recordDelivery(source, action.company, next.actor, action.completedOn);
      if (!done.ok) error = done.error;
    }
    return { state: next, error: error };
  }

  root.ABAAmbassador = {
    AMBASSADOR_ROLE_LISTS: AMBASSADOR_ROLE_LISTS,
    exampleSource: exampleSource,
    defaultState: defaultState,
    metrics: metrics,
    lists: lists,
    signupsIn: signupsIn,
    upcomingIn: upcomingIn,
    shiftPeriods: shiftPeriods,
    ownersIn: ownersIn,
    deliveriesIn: deliveriesIn,
    apply: apply,
    claim: claim,
    claimLocked: claimLocked,
    makeLock: makeLock,
    reassign: reassign,
    recordDelivery: recordDelivery,
    eventKey: eventKey,
    rangeFor: rangeFor
  };
})(typeof window !== 'undefined' ? window : globalThis);
