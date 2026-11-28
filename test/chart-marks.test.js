const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');

function load() {
  const context = {
    Intl, Date, JSON, Math, Number, String, Object, Array,
    encodeURIComponent, decodeURIComponent, isFinite, Promise
  };
  context.window = context;
  context.self = context;
  context.global = context;
  context.globalThis = context;
  context.navigator = {};
  vm.createContext(context);
  ['js/dashboard-model.js', 'js/dashboard-data.js', 'js/dashboard-directory.js', 'js/dashboard-view.js', 'js/vendor/xlsx.min.js'].forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  });
  return context;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const sandbox = load();
const dash = sandbox.ABADashboard;
const directoryApi = sandbox.ABADirectory;
const source = sandbox.ABADashboardData.placeholderSource();

function liveDirectory() {
  return directoryApi.fromLive({
    roster: [
      { company: 'New Co', email: 'new@example.com', status: 'Active', joinDate: '2024-08-01', categories: 'Contractors' },
      { company: 'Old Co', email: 'old@example.com', status: 'Active', joinDate: '2018-01-01', categories: 'Restaurants' },
      { company: 'Mystery Co', status: 'Active', categories: '' },
      { company: 'This Year Co', email: 'year@example.com', status: 'Active', joinDate: '2026-08-01', categories: 'Marketing' },
      { company: 'Later Co', email: 'later@example.com', status: 'Active', joinDate: '2026-11-26', categories: 'Contractors' },
      { company: 'Gone Co', email: 'gone@example.com', status: 'Deactivated', joinDate: '2019-01-01', lostDate: '2026-06-30', categories: 'Contractors' }
    ],
    attendanceRecords: [
      { name: 'New Person', company: 'New Co', email: 'new@example.com', audience: 'Member', eventType: 'Lunch & Learn', event: 'Lunch', eventId: 'l', date: '2026-10-08', status: 'attended' },
      { name: 'Old Person', company: 'Old Co', email: 'old@example.com', audience: 'Member', eventType: 'Lunch & Learn', event: 'Lunch', eventId: 'o', date: '2025-11-01', status: 'attended' },
      { name: 'Guest Person', company: 'New Co', audience: 'Guest', eventType: 'Happy Hour', event: 'Hour', eventId: 'h', date: '2026-09-12', status: 'attended' },
      { name: 'Miss Person', company: 'Old Co', audience: 'Member', eventType: 'Lunch & Learn', event: 'Lunch', eventId: 'm', date: '2026-10-08', status: 'no_show', registration_status: 'registered' }
    ]
  });
}

test('a visit counts only when attended is explicit', () => {
  const directory = directoryApi.fromLive({
    roster: [{ company: 'Blank Co', status: 'Active', joinDate: '2020-01-01' }],
    attendanceRecords: [
      { name: 'Ada Example', company: 'Blank Co', audience: 'Member', eventType: 'Lunch & Learn', event: 'Lunch', eventId: 'blank', date: '2026-10-08', status: '' },
      { name: 'Bea Example', company: 'Blank Co', audience: 'Member', eventType: 'Lunch & Learn', event: 'Lunch', eventId: 'marked', date: '2026-10-08', status: ' Attended ' },
      { name: 'Cy Example', company: 'Blank Co', audience: 'Guest', eventType: 'Happy Hour', event: 'Hour', eventId: 'reg', date: '2026-09-01', registration_status: 'Attended' },
      { name: 'Dee Example', company: 'Blank Co', audience: 'Member', eventType: 'Ribbon Cutting', event: 'Cut', eventId: 'none', date: '2026-11-01' }
    ]
  });
  const view = dash.compute(source, null, directory);
  assert.equal(view.attendance.value, 2);
  assert.equal(view.events.value, 2);
  assert.equal(view.noShows.noShows, 0);
  assert.equal(directoryApi.drill(directory, 'attendance', view).rows.length, 2);
  const built = directoryApi.build(source);
  built.attendance.forEach(function (row) {
    const mark = String(row.status || '').trim().toLowerCase();
    assert.ok(mark === 'attended' || mark === 'no_show');
  });
});

test('unfiltered renewal matches the live feed formula', () => {
  const directory = liveDirectory();
  const view = dash.compute(source, null, directory);
  const risk = view.renewalRisk;
  assert.equal(risk.cohort, 4);
  assert.equal(risk.zeroAttendance, 3);
  assert.equal(risk.pct, 75);
  assert.equal(risk.byTenure.newer, 0);
  assert.equal(risk.byTenure.longer, 1);
  assert.equal(risk.byTenure.unknown, 1);
  assert.equal(risk.byTenure.thisYear, 1);
  assert.equal(risk.byTenure.newer + risk.byTenure.longer + risk.byTenure.unknown + risk.byTenure.thisYear, risk.zeroAttendance);
  assert.equal(risk.newerLabel, 'Joined 2022–2025');
  assert.equal(risk.longerLabel, 'Joined 2021 or earlier');
  assert.equal(risk.lapseByBand.reduce(function (sum, band) { return sum + band.members; }, 0), risk.cohort);
  assert.equal(risk.lapseByBand[0].members, risk.zeroAttendance);
  assert.equal(directoryApi.drill(directory, 'renewal', view).rows.length, risk.zeroAttendance);
  assert.ok(risk.zeroAttendance <= risk.cohort);
  assert.ok(risk.pct >= 0 && risk.pct <= 100);
});

test('filtered renewal and no-shows use one population', () => {
  const directory = liveDirectory();
  const view = dash.compute(source, Object.assign({}, dash.defaultState(source), {
    selectedBusinessTypes: ['Contractors']
  }), directory);
  const risk = view.renewalRisk;
  assert.equal(risk.cohort, 1);
  assert.equal(risk.zeroAttendance, 0);
  assert.equal(risk.pct, 0);
  assert.ok(risk.zeroAttendance <= risk.cohort);
  assert.equal(directoryApi.drill(directory, 'renewal', view).rows.length, 0);
  assert.equal(view.events.value, 2);
  assert.equal(directoryApi.drill(directory, 'events', view).rows.length, 2);
  assert.equal(view.attendance.value, 2);
  const visits = directoryApi.drill(directory, 'attendance', view).rows;
  assert.equal(visits.length, 2);
  assert.ok(visits.some(function (row) { return row.audience === 'Guest'; }));
  const noshow = view.noShows;
  assert.ok(noshow.noShows <= noshow.signups);
  assert.ok(noshow.pct >= 0 && noshow.pct <= 100);
  assert.equal(directoryApi.drill(directory, 'noshows', view).rows.length, noshow.noShows);
  const restaurants = dash.compute(source, Object.assign({}, dash.defaultState(source), {
    selectedBusinessTypes: ['Restaurants']
  }), directory);
  assert.equal(restaurants.events.value, 0);
  assert.equal(restaurants.noShows.noShows, 1);
  assert.ok(restaurants.noShows.noShows <= restaurants.noShows.signups);
});

test('the active-member line reconciles with the net card', () => {
  const built = directoryApi.build(source);
  const ranges = ['fy', 'last12', 'last3', 'custom'];
  const groups = ['month', 'quarter', 'year'];
  const filters = [
    {},
    { eventTypes: ['Lunch & Learn'] },
    { selectedBusinessTypes: ['Contractors'] },
    { audience: 'Member' },
    { renewalTenure: 'longer' }
  ];
  let checks = 0;
  ranges.forEach(function (rangeKind) {
    groups.forEach(function (group) {
      filters.forEach(function (filter) {
        const state = Object.assign({}, dash.defaultState(source), filter, {
          rangeKind: rangeKind,
          group: group,
          from: rangeKind === 'custom' ? '2026-08-01' : '',
          to: rangeKind === 'custom' ? '2026-10-31' : ''
        });
        const view = dash.compute(source, state, built);
        const gains = view.gains || [];
        const joins = gains.reduce(function (sum, bar) { return sum + (bar.joins || 0); }, 0);
        const losses = gains.reduce(function (sum, bar) { return sum + (bar.losses || 0); }, 0);
        const last = gains.length ? gains[gains.length - 1].active : 0;
        assert.equal(last - view.openingActive, view.net.value, rangeKind + ' ' + group);
        assert.equal(joins - losses, view.net.value, rangeKind + ' ' + group);
        assert.equal(last, view.members.value, rangeKind + ' ' + group);
        const endsToday = view.range.end === view.asOf;
        if (endsToday) assert.equal(last, view.members.value);
        checks += 1;
      });
    });
  });
  const home = dash.compute(source, null, built);
  const lunch = dash.compute(source, Object.assign({}, dash.defaultState(source), { eventTypes: ['Happy Hour'] }), built);
  assert.equal(lunch.members.value, home.members.value);
  assert.equal(lunch.net.value, home.net.value);
  assert.ok(checks >= 60);
  fs.writeFileSync('/tmp/line-identity.json', JSON.stringify({ checks: checks }, null, 2));
});

test('every chart mark is a shared filter', () => {
  const built = directoryApi.build(source);
  const pages = ['overview', 'membership', 'events'];
  const groups = ['month', 'quarter', 'year'];
  const found = {};
  function add(kind, count) {
    found[kind] = (found[kind] || 0) + count;
  }
  pages.forEach(function (page) {
    groups.forEach(function (group) {
      const view = dash.compute(source, Object.assign({}, dash.defaultState(source), { page: page, group: group }), built);
      const html = sandbox.ABADashboardView.render(Object.assign({}, view, {
        mobile: false,
        documents: { extras: [] },
        ui: {}
      }));
      add('period', (html.match(/data-period="/g) || []).length);
      add('flow', (html.match(/data-flow="/g) || []).length);
      add('type', (html.match(/data-type="/g) || []).length);
      add('business', (html.match(/data-business-type="/g) || []).length);
      add('audience', (html.match(/data-audience="/g) || []).length);
      add('tenure', (html.match(/data-renewal-tenure="/g) || []).length);
      add('band', (html.match(/data-renewal-band="/g) || []).length);
      add('noshow-segment', (html.match(/data-audience="No-show"/g) || []).length);
    });
  });
  assert.ok(found.period > 0);
  assert.ok(found.flow > 0);
  assert.ok(found.type > 0);
  assert.ok(found.business > 0);
  assert.ok(found.audience > 0);
  assert.ok(found.tenure > 0);
  assert.ok(found.band > 0);
  assert.ok(found['noshow-segment'] > 0);
  const base = dash.defaultState(source);
  const period = dash.applyAction(source, base, { type: 'bucket', period: '2026-10-01:2026-10-31', flow: 'new' });
  assert.equal(period.bucket, '2026-10-01:2026-10-31');
  assert.equal(period.flow, 'new');
  const tenure = dash.applyAction(source, base, { type: 'renewalTenure', tenure: 'longer' });
  assert.equal(tenure.renewalTenure, 'longer');
  const band = dash.applyAction(source, base, { type: 'renewalBand', band: '0' });
  assert.equal(band.renewalBand, '0');
  const cleared = dash.applyAction(source, period, { type: 'clearFilters' });
  assert.equal(cleared.bucket, '');
  assert.equal(cleared.flow, '');
  const narrowed = dash.compute(source, period, built);
  assert.equal(directoryApi.drill(built, 'members', narrowed).rows.length, narrowed.members.value);
  assert.equal(directoryApi.drill(built, 'newMembers', narrowed).rows.length, narrowed.newMembers.value);
  const pack = directoryApi.drill(built, 'renewal', dash.compute(source, band, liveDirectory()));
  const csv = directoryApi.exportCsv({ columns: pack.columns, shown: pack.rows });
  assert.equal(csv.replace(/^\uFEFF/, '').split('\r\n').length, pack.rows.length + 1);
  fs.writeFileSync('/tmp/chart-marks.json', JSON.stringify(found, null, 2));
  console.log(JSON.stringify(found));
});

test('every card list matches after each period mark', () => {
  const built = directoryApi.build(source);
  const bases = [
    { rangeKind: 'fy', group: 'month' },
    { rangeKind: 'last12', group: 'month' },
    { rangeKind: 'fy', group: 'year' },
    { rangeKind: 'fy', group: 'month', selectedBusinessTypes: ['Contractors'] },
    { rangeKind: 'fy', group: 'month', eventTypes: ['Lunch & Learn'] }
  ];
  let checks = 0;
  bases.forEach(function (base) {
    const home = dash.compute(source, Object.assign({}, dash.defaultState(source), base), built);
    const marks = [];
    (home.gains || []).forEach(function (bar) {
      assert.match(String(bar.start || ''), /^\d{4}-\d{2}-\d{2}$/);
      assert.match(String(bar.end || ''), /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(bar.id, bar.start + ':' + bar.end);
      marks.push({ period: bar.id, flow: '' });
      marks.push({ period: bar.id, flow: 'new' });
      marks.push({ period: bar.id, flow: 'lost' });
      if (bar.priorId) {
        assert.match(String(bar.priorStart || ''), /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(bar.priorId, bar.priorStart + ':' + bar.priorEnd);
        marks.push({ period: bar.priorId, flow: 'new' });
        marks.push({ period: bar.priorId, flow: '' });
      }
    });
    (home.monthBuckets || []).forEach(function (bucket) {
      if (bucket && bucket.id) marks.push({ period: bucket.id, flow: '' });
    });
    marks.forEach(function (mark) {
      const state = Object.assign({}, dash.defaultState(source), base, { bucket: mark.period, flow: mark.flow });
      const view = dash.compute(source, state, built);
      assert.equal(view.measure.start, mark.period.split(':')[0]);
      assert.equal(view.measure.end, mark.period.split(':')[1]);
      function rows(kind) { return directoryApi.drill(built, kind, view).rows.length; }
      assert.equal(rows('members'), view.members.value);
      assert.equal(rows('newMembers'), view.newMembers.value);
      var typeSum = ['Lunch & Learn', 'Ribbon Cutting', 'Happy Hour'].reduce(function (sum, name) {
        return sum + ((view.eventCounts && view.eventCounts[name]) || 0);
      }, 0);
      assert.equal(typeSum, view.events.value);
      if (view.audience !== 'No-show') assert.equal((view.pie.members || 0) + (view.pie.guests || 0), view.attendance.value);
      assert.equal(view.pie.noShows, view.noShows.noShows);
      var bizSum = (view.businessTypes || []).reduce(function (sum, row) { return sum + (row.count || 0); }, 0);
      assert.equal(bizSum, view.members.value);
      if (!mark.flow && view.renewalRisk) {
        var bandSum = view.renewalRisk.lapseByBand.reduce(function (sum, band) { return sum + band.members; }, 0);
        assert.equal(bandSum, view.renewalRisk.cohort);
      }
      assert.equal(rows('events'), view.events.value);
      assert.equal(rows('attendance'), view.attendance.value);
      assert.equal(rows('noshows'), view.noShows.noShows);
      if (view.renewalRisk) assert.equal(rows('renewal'), view.renewalRisk.zeroAttendance);
      const businessRows = rows('businesses');
      if (mark.flow === 'new') assert.equal(businessRows, view.newMembers.value);
      else if (mark.flow === 'lost') assert.equal(businessRows, rows('members'));
      else assert.equal(businessRows, view.members.value);
      view.measure = { start: undefined, end: undefined };
      assert.equal(directoryApi.drill(built, 'members', view).rows.length, view.members.value);
      assert.equal(directoryApi.drill(built, 'events', view).rows.length, view.events.value);
      checks += 1;
    });
  });
  assert.ok(checks > 20);
  const aug = dash.compute(source, Object.assign({}, dash.defaultState(source), { bucket: '2026-08-01:2026-08-31' }), built);
  const zeroBand = aug.renewalRisk.lapseByBand[0];
  assert.ok(zeroBand.members > 0);
  assert.equal(aug.renewalRisk.lapseByBand.reduce(function (sum, band) { return sum + band.members; }, 0), aug.renewalRisk.cohort);
  const chosen = dash.compute(source, Object.assign({}, dash.defaultState(source), {
    bucket: '2026-08-01:2026-08-31',
    renewalBand: '0'
  }), built);
  assert.equal(chosen.members.value, zeroBand.members);
  assert.equal(directoryApi.drill(built, 'members', chosen).rows.length, zeroBand.members);
  const person = (built.attendance || []).filter(function (row) {
    return row.date >= '2026-07-01' && row.status === 'attended';
  })[0].name;
  const started = Date.now();
  const picked = dash.compute(source, Object.assign({}, dash.defaultState(source), { people: [person] }), built);
  const listed = directoryApi.drill(built, 'attendance', picked).rows.length;
  assert.ok(listed > 0);
  assert.equal(listed, picked.attendance.value);
  assert.ok(Date.now() - started < 1500);
  console.log(JSON.stringify({ periodChecks: checks, personRows: listed, personMs: Date.now() - started }));
});
