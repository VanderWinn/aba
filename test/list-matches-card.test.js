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
  [
    'js/dashboard-model.js',
    'js/dashboard-data.js',
    'js/dashboard-directory.js',
    'js/dashboard-view.js',
    'js/vendor/xlsx.min.js'
  ].forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  });
  return context;
}

const sandbox = load();
const dash = sandbox.ABADashboard;
const directoryApi = sandbox.ABADirectory;
const XLSX = sandbox.XLSX;
const exampleSource = sandbox.ABADashboardData.placeholderSource();

const EVENT_TYPES = ['Lunch & Learn', 'Ribbon Cutting', 'Happy Hour'];
const PAGES = ['overview', 'membership', 'events'];
const GROUPS = ['month', 'quarter', 'year'];
const RANGES = ['fy', 'last12', 'last3', 'custom'];

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function subsets(items) {
  const out = [[]];
  items.forEach(function (item) {
    const added = out.map(function (set) { return set.concat([item]); });
    added.forEach(function (set) { out.push(set); });
  });
  return out;
}

function liveFixture() {
  return {
    asOf: '2026-11-24',
    companies: ['North Example', 'West Example', 'Cafe Example', 'Blank Example', 'Dual Example', 'Gone Example', 'Later Example', 'Break Example'],
    people: [
      { name: 'Alex Example', company: 'North Example' },
      { name: 'Blair Example', company: 'West Example' }
    ],
    attendanceRecords: [
      { name: 'Alex Example', company: 'North Example', audience: 'Member', eventType: 'Lunch & Learn', eventName: 'October Lunch Example', eventId: 'l1', date: '2026-10-08', status: 'Attended' },
      { name: 'Blair Example', company: 'West Example', audience: 'Member', eventType: 'Happy Hour', eventName: 'September Hour Example', eventId: 'h1', date: '2026-09-12', status: 'Attended' },
      { name: 'Casey Example', company: 'Cafe Example', audience: 'Guest', eventType: 'Ribbon Cutting', eventName: 'November Ribbon Example', eventId: 'r1', date: '2026-11-02', status: 'Attended' },
      { name: 'Drew Example', company: 'North Example', audience: 'Member', eventType: 'Lunch & Learn', eventName: 'October Lunch Example', eventId: 'l1', date: '2026-10-08', status: 'No-show' }
    ],
    roster: [
      { company: 'North Example', status: 'Active', joinDate: '2020-01-15', lostDate: '', categories: 'Contractors' },
      { company: 'West Example', status: 'Active', joinDate: '2026-08-10', lostDate: '', categories: ' contractors ' },
      { company: 'Cafe Example', status: 'Active', joinDate: '2024-03-01', lostDate: '', categories: 'Restaurants;Marketing' },
      { company: 'Blank Example', status: 'Active', joinDate: '2023-04-01', lostDate: '', categories: '' },
      { company: 'Dual Example', status: 'Active', joinDate: '2026-09-04', lostDate: '', categories: ['Marketing', 'Restaurants'] },
      { company: 'Gone Example', status: 'Deactivated', joinDate: '2019-01-01', lostDate: '2026-08-01', categories: 'Contractors' },
      { company: 'Later Example', status: 'Active', joinDate: '2026-12-15', lostDate: '', categories: 'Contractors' },
      { company: 'Break\nExample', status: 'Active', joinDate: '2022-02-02', lostDate: '', categories: 'Restaurants' }
    ]
  };
}

function stateFor(base, spec) {
  const next = Object.assign({}, base, {
    page: spec.page,
    rangeKind: spec.rangeKind,
    group: spec.group,
    eventTypes: spec.eventTypes.slice(),
    eventType: '',
    companies: spec.companies.slice(),
    people: spec.people.slice(),
    audience: spec.audience || '',
    selectedBusinessTypes: spec.businessTypes.slice(),
    from: spec.rangeKind === 'custom' ? '2026-08-01' : '',
    to: spec.rangeKind === 'custom' ? '2026-10-31' : ''
  });
  return next;
}

function flowOf(rows) {
  let joins = 0;
  let losses = 0;
  rows.forEach(function (row) {
    if (row.status === 'lost') losses += 1;
    else joins += 1;
  });
  return { joins: joins, losses: losses, net: joins - losses, rows: rows.length };
}

function parseCsv(text) {
  const body = String(text).replace(/^\uFEFF/, '');
  return body.split('\r\n').map(function (line) {
    const fields = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else if (ch === '"') quoted = false;
        else current += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') {
        fields.push(current);
        current = '';
      } else current += ch;
    }
    fields.push(current);
    return fields;
  });
}

function shownPack(pack, query) {
  const shown = directoryApi.queryRows(pack.rows, pack.columns, query || '', pack.columns[0] ? pack.columns[0].key : 'date', 'asc');
  return { title: pack.title, kind: pack.kind, columns: pack.columns, rows: pack.rows, shown: shown };
}

function assertExport(pack, expectedRows, stats) {
  const shown = shownPack(pack, '');
  assert.equal(shown.shown.length, expectedRows, pack.kind + ' list length');
  const table = directoryApi.exportTable(shown);
  assert.deepEqual(plain(table.headers), plain(pack.columns.map(function (column) { return column.label; })));
  assert.equal(table.rows.length, expectedRows);
  if (expectedRows > 0) {
    pack.columns.forEach(function (column, index) {
      const first = String(shown.shown[0][column.key] == null ? '' : shown.shown[0][column.key]).replace(/\r\n|\r|\n/g, ' ');
      const lastRow = shown.shown[shown.shown.length - 1];
      const last = String(lastRow[column.key] == null ? '' : lastRow[column.key]).replace(/\r\n|\r|\n/g, ' ');
      assert.equal(String(table.rows[0][index]), first);
      assert.equal(String(table.rows[table.rows.length - 1][index]), last);
    });
  }
  table.rows.forEach(function (row) {
    row.forEach(function (cell) { assert.equal(String(cell).includes('\n') || String(cell).includes('\r'), false); });
  });
  const day = '2026-11-27';
  const csvName = directoryApi.exportFileName(pack.title, 'csv', day);
  const xlsxName = directoryApi.exportFileName(pack.title, 'xlsx', day);
  assert.match(csvName, /^aba-[a-z0-9]+(?:-[a-z0-9]+)*-2026-11-27\.csv$/);
  assert.match(xlsxName, /^aba-[a-z0-9]+(?:-[a-z0-9]+)*-2026-11-27\.xlsx$/);
  const csv = directoryApi.exportCsv(shown);
  const parsed = parseCsv(csv);
  assert.deepEqual(parsed, plain([table.headers].concat(table.rows)));
  assert.equal(parsed.length, expectedRows + 1);
  const book = directoryApi.exportWorkbook(shown, XLSX);
  const sheet = book.Sheets.Records;
  const grid = plain(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }));
  assert.equal(grid.length, expectedRows + 1);
  assert.deepEqual(grid[0], plain(table.headers));
  if (expectedRows > 0) {
    assert.deepEqual(grid[1], plain(table.rows[0]));
    assert.deepEqual(grid[grid.length - 1], plain(table.rows[table.rows.length - 1]));
  }
  const span = XLSX.utils.decode_range(sheet['!ref']);
  for (let r = span.s.r; r <= span.e.r; r++) {
    for (let c = span.s.c; c <= span.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: r, c: c })];
      if (!cell) continue;
      assert.equal(cell.s.alignment.wrapText, false);
      assert.equal(cell.s.font.bold, r === 0);
      assert.equal(String(cell.v == null ? '' : cell.v).includes('\n'), false);
    }
  }
  assert.ok(sheet['!cols'] && sheet['!cols'].length === table.headers.length);
  stats.exports += 2;
  stats.lists += 1;
  if (expectedRows === 0) stats.emptyExports += 2;
  if (shown.shown.length > 1) {
    const token = String(shown.shown[0][pack.columns[0].key] == null ? '' : shown.shown[0][pack.columns[0].key]).replace(/\s+/g, ' ').trim();
    if (token) {
      const narrowed = shownPack(pack, token);
      if (narrowed.shown.length > 0 && narrowed.shown.length < shown.shown.length) {
        const narrowCsv = parseCsv(directoryApi.exportCsv(narrowed));
        const narrowBook = directoryApi.exportWorkbook(narrowed, XLSX);
        const narrowGrid = XLSX.utils.sheet_to_json(narrowBook.Sheets.Records, { header: 1, raw: false });
        assert.equal(narrowCsv.length, narrowed.shown.length + 1);
        assert.equal(narrowGrid.length, narrowed.shown.length + 1);
        stats.searches += 1;
      }
    }
  }
}

function checkLists(view, directory, stats) {
  const members = directoryApi.drill(directory, 'members', view);
  const joined = directoryApi.drill(directory, 'newMembers', view);
  const changes = directoryApi.drill(directory, 'changes', view);
  const businesses = directoryApi.drill(directory, 'businesses', view);
  const events = directoryApi.drill(directory, 'events', view);
  const visits = directoryApi.drill(directory, 'attendance', view);
  const flow = flowOf(changes.rows);
  assert.equal(members.rows.length, view.members.value);
  assert.equal(joined.rows.length, view.newMembers.value);
  assert.equal(businesses.rows.length, view.members.value);
  assert.equal(events.rows.length, view.events.value);
  assert.equal(visits.rows.length, view.attendance.value);
  assert.equal(flow.net, view.net.value);
  assert.equal(flow.rows, flow.joins + flow.losses);
  if (view.members.value > 0) assert.ok(members.rows.length > 0);
  if (view.newMembers.value > 0) assert.ok(joined.rows.length > 0);
  if (view.events.value > 0) assert.ok(events.rows.length > 0);
  if (view.attendance.value > 0) assert.ok(visits.rows.length > 0);
  if (view.net.value !== 0) assert.ok(changes.rows.length > 0);
  assertExport(members, view.members.value, stats);
  assertExport(joined, view.newMembers.value, stats);
  assertExport(changes, flow.rows, stats);
  assertExport(businesses, view.members.value, stats);
  assertExport(events, view.events.value, stats);
  assertExport(visits, view.attendance.value, stats);
  stats.combos += 1;
}

test('example membership totals stay on the shared records', () => {
  const built = directoryApi.build(exampleSource);
  const home = dash.compute(exampleSource, null, built);
  const bare = dash.compute(exampleSource, null);
  assert.equal(home.members.value, bare.members.value);
  assert.equal(home.newMembers.value, bare.newMembers.value);
  assert.equal(home.net.value, bare.net.value);
  assert.equal(home.events.value, bare.events.value);
  assert.equal(home.attendance.value, bare.attendance.value);
  assert.equal(home.members.value, 412);
  assert.equal(home.events.value, 8);
  assert.equal(home.attendance.value, 287);
  const crossed = Object.assign({}, dash.defaultState(exampleSource), {
    eventTypes: ['Lunch & Learn'],
    selectedBusinessTypes: ['Contractors']
  });
  const view = dash.compute(exampleSource, crossed, built);
  const members = directoryApi.drill(built, 'members', view);
  const joined = directoryApi.drill(built, 'newMembers', view);
  assert.equal(view.members.value, 54);
  assert.equal(members.rows.length, 54);
  assert.equal(joined.rows.length, view.newMembers.value);
  assert.ok(view.newMembers.value > 0);
  assert.equal(view.events.value, 3);
  const plain = dash.compute(exampleSource, Object.assign({}, dash.defaultState(exampleSource), {
    selectedBusinessTypes: ['Contractors']
  }), built);
  assert.equal(plain.members.value, view.members.value);
  assert.equal(plain.newMembers.value, view.newMembers.value);
  assert.equal(plain.net.value, view.net.value);
});

test('chart clicks and checkboxes set the same filter', () => {
  const source = exampleSource;
  const base = dash.defaultState(source);
  const chart = dash.applyAction(source, dash.applyAction(source, base, {
    type: 'eventType', eventType: 'Lunch & Learn'
  }), { type: 'businessType', businessType: 'Contractors' });
  const box = Object.assign({}, base, {
    eventTypes: ['Lunch & Learn'],
    eventType: '',
    selectedBusinessTypes: ['Contractors']
  });
  const built = directoryApi.build(source);
  const fromChart = dash.compute(source, chart, built);
  const fromBox = dash.compute(source, box, built);
  assert.deepEqual(plain(chart.eventTypes), ['Lunch & Learn']);
  assert.deepEqual(plain(chart.selectedBusinessTypes), ['Contractors']);
  assert.equal(fromChart.members.value, fromBox.members.value);
  assert.equal(fromChart.newMembers.value, fromBox.newMembers.value);
  assert.equal(fromChart.net.value, fromBox.net.value);
  assert.equal(fromChart.events.value, fromBox.events.value);
  assert.equal(fromChart.attendance.value, fromBox.attendance.value);
  const cleared = dash.applyAction(source, chart, { type: 'eventType', eventType: 'Lunch & Learn' });
  assert.deepEqual(plain(cleared.eventTypes), []);
  assert.deepEqual(plain(cleared.selectedBusinessTypes), ['Contractors']);
});

test('every list matches its card for every filter combination, including CSV and Excel', () => {
  const source = exampleSource;
  const directory = directoryApi.fromLive(liveFixture());
  const base = dash.defaultState(source);
  const eventSets = subsets(EVENT_TYPES);
  const businessSets = [
    [],
    ['Contractors'],
    ['Restaurants'],
    ['Marketing'],
    ['Other / not listed'],
    ['Contractors', 'Restaurants'],
    ['Not A Real Type']
  ];
  const companySets = [
    [],
    ['North Example'],
    ['Cafe Example'],
    ['North Example', 'Cafe Example'],
    ['Gone Example']
  ];
  const peopleSets = [[], ['Alex Example'], ['Blair Example']];
  const stats = { combos: 0, lists: 0, exports: 0, emptyExports: 0, searches: 0, parsedFiles: 0 };
  const audiences = ['', 'Member', 'Guest'];

  eventSets.forEach(function (eventTypes) {
    businessSets.forEach(function (businessTypes) {
      companySets.forEach(function (companies) {
        peopleSets.forEach(function (people) {
          RANGES.forEach(function (rangeKind) {
            GROUPS.forEach(function (group) {
              PAGES.forEach(function (page) {
                const state = stateFor(base, {
                  page: page,
                  rangeKind: rangeKind,
                  group: group,
                  eventTypes: eventTypes,
                  businessTypes: businessTypes,
                  companies: companies,
                  people: people
                });
                checkLists(dash.compute(source, state, directory), directory, stats);
              });
            });
          });
        });
      });
    });
  });

  eventSets.forEach(function (eventTypes) {
    const open = stateFor(base, {
      page: 'membership',
      rangeKind: 'fy',
      group: 'month',
      eventTypes: eventTypes,
      businessTypes: ['Contractors'],
      companies: [],
      people: []
    });
    const openView = dash.compute(source, open, directory);
    audiences.forEach(function (audience) {
      const state = stateFor(base, {
        page: 'events',
        rangeKind: 'fy',
        group: 'month',
        eventTypes: eventTypes,
        businessTypes: ['Contractors'],
        companies: [],
        people: [],
        audience: audience
      });
      const view = dash.compute(source, state, directory);
      assert.equal(view.members.value, openView.members.value);
      assert.equal(view.newMembers.value, openView.newMembers.value);
      assert.equal(view.net.value, openView.net.value);
      checkLists(view, directory, stats);
    });
  });

  const bug = stateFor(base, {
    page: 'membership',
    rangeKind: 'fy',
    group: 'month',
    eventTypes: ['Lunch & Learn'],
    businessTypes: ['Contractors'],
    companies: [],
    people: []
  });
  const bugView = dash.compute(source, bug, directory);
  assert.equal(bugView.members.value, 2);
  assert.equal(bugView.newMembers.value, 1);
  assert.equal(directoryApi.drill(directory, 'members', bugView).rows.length, 2);
  assert.equal(directoryApi.drill(directory, 'newMembers', bugView).rows.length, 1);

  const lunch = directoryApi.drill(directory, 'attendance', bugView);
  assert.equal(directoryApi.exportFileName(lunch.title, 'csv', '2026-11-27'), 'aba-lunch-learn-visits-2026-11-27.csv');

  const emptyMembers = directoryApi.drill(directory, 'members', dash.compute(source, stateFor(base, {
    page: 'membership', rangeKind: 'fy', group: 'month',
    eventTypes: [], businessTypes: ['Not A Real Type'], companies: [], people: []
  }), directory));
  const emptyCsv = directoryApi.exportCsv(shownPack(emptyMembers, ''));
  assert.equal(parseCsv(emptyCsv).length, 1);
  const emptyBook = directoryApi.exportWorkbook(shownPack(emptyMembers, ''), XLSX);
  const emptyBuf = XLSX.write(emptyBook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
  const emptyRead = XLSX.read(emptyBuf, { type: 'buffer', cellStyles: true });
  assert.equal(XLSX.utils.sheet_to_json(emptyRead.Sheets.Records, { header: 1 }).length, 1);

  const memberPack = shownPack(directoryApi.drill(directory, 'members', bugView), '');
  const fullBuf = XLSX.write(directoryApi.exportWorkbook(memberPack, XLSX), { type: 'buffer', bookType: 'xlsx', cellStyles: true });
  const fullRead = XLSX.read(fullBuf, { type: 'buffer', cellStyles: true });
  const fullGrid = XLSX.utils.sheet_to_json(fullRead.Sheets.Records, { header: 1, raw: false });
  assert.equal(fullGrid.length, 3);
  fs.writeFileSync('/tmp/list-match-members.xlsx', fullBuf);
  const stylesXml = require('node:child_process').execFileSync('unzip', ['-p', '/tmp/list-match-members.xlsx', 'xl/styles.xml'], { encoding: 'utf8' });
  const sheetXml = require('node:child_process').execFileSync('unzip', ['-p', '/tmp/list-match-members.xlsx', 'xl/worksheets/sheet1.xml'], { encoding: 'utf8' });
  assert.match(stylesXml, /<b\/>|<b\s*\/>|<b><\/b>/);
  assert.equal(sheetXml.includes('wrapText="1"'), false);
  assert.match(sheetXml, /customWidth="1"/);

  const token = String(memberPack.shown[0].company || '');
  const searched = shownPack(directoryApi.drill(directory, 'members', bugView), token);
  assert.ok(searched.shown.length > 0);
  assert.ok(searched.shown.length < memberPack.shown.length);
  const searchBuf = XLSX.write(directoryApi.exportWorkbook(searched, XLSX), { type: 'buffer', bookType: 'xlsx', cellStyles: true });
  const searchRead = XLSX.read(searchBuf, { type: 'buffer', cellStyles: true });
  assert.equal(XLSX.utils.sheet_to_json(searchRead.Sheets.Records, { header: 1 }).length, searched.shown.length + 1);
  const missed = shownPack(directoryApi.drill(directory, 'members', bugView), 'zzzz-no-such-record');
  assert.equal(parseCsv(directoryApi.exportCsv(missed)).length, 1);
  stats.parsedFiles = 3;

  const report = {
    combinations: stats.combos,
    lists: stats.lists,
    exports: stats.exports,
    emptyExports: stats.emptyExports,
    searchNarrowings: stats.searches,
    parsedWorkbooks: stats.parsedFiles,
    eventTypeSubsets: eventSets.length,
    businessTypeSets: businessSets.length,
    companySets: companySets.length,
    attendeeSets: peopleSets.length,
    dateRanges: RANGES.length,
    groupings: GROUPS.length,
    pages: PAGES.length,
    audiencePasses: eventSets.length * audiences.length
  };
  fs.writeFileSync('/tmp/list-match-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  assert.ok(stats.combos > 1000);
  assert.ok(stats.searches > 0);
  assert.ok(stats.emptyExports > 0);
});
