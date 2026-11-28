const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');

function load() {
  const context = { Intl, Date, JSON, Math, Number, String, Object, Array, encodeURIComponent, decodeURIComponent, isFinite, Promise };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  ['js/ambassador-model.js', 'js/ambassador-view.js'].forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  });
  return context;
}

const sandbox = load();
const api = sandbox.ABAAmbassador;
const viewApi = sandbox.ABAAmbassadorView;

function fresh() {
  return api.exampleSource();
}

test('two shifts at one event count as one event and two shifts', () => {
  const source = fresh();
  const state = Object.assign(api.defaultState(), { ambassador: 'Avery Sample' });
  const numbers = api.metrics(source, state);
  assert.equal(numbers.events, 1);
  assert.equal(numbers.shifts, 2);
  assert.equal(numbers.eventsWorked, null);
  assert.equal(numbers.attendanceVerified, false);
  const upcoming = api.lists(source, Object.assign(api.defaultState(), { ambassador: 'Blake Placeholder' }), 'upcoming');
  assert.equal(upcoming.rows.length, 1);
  assert.equal(upcoming.rows[0][0], 'Wed Dec 9 · 4:30–6:30 PM · Blake Placeholder · Networking Ambassador');
  const periods = api.shiftPeriods(source, api.defaultState()).map(function (row) { return row.name; });
  assert.deepEqual(periods, ['Nov', 'Dec']);
  assert.deepEqual(api.shiftPeriods(source, Object.assign(api.defaultState(), { group: 'quarter' })).map(function (row) { return row.name; }), ['Q4']);
  const html = viewApi.render(source, api.defaultState(), api.metrics(source, api.defaultState()), '');
  assert.match(html, /Events Worked is omitted/);
  assert.equal(html.includes('scope-note'), false);
  assert.equal(html.includes('<select'), false);
  assert.match(html, /class="pseg"/);
  assert.match(html, /class="side"/);
  assert.match(html, /Set-Up \+ Clean-Up/);
  assert.match(html, /Wed Dec 9 · 4:30–6:30 PM · Blake Placeholder · Networking Ambassador/);
  assert.equal(html.includes('2026-11'), false);
  assert.equal(html.includes('Folder status'), false);
  assert.equal(html.includes('class="share"'), false);
  const folders = viewApi.render(source, Object.assign(api.defaultState(), { page: 'folders' }), api.metrics(source, Object.assign(api.defaultState(), { page: 'folders' })), '');
  assert.match(folders, /Blake Placeholder/);
  assert.match(folders, /Assigned to/);
  assert.match(folders, /Casey Demo/);
  assert.equal(folders.includes('>Role<'), false);
  const companies = viewApi.render(source, Object.assign(api.defaultState(), { page: 'companies' }), api.metrics(source, api.defaultState()), '');
  assert.equal(companies.includes('Event type'), false);
  assert.equal(companies.includes('>Role<'), false);
  const noteAt = folders.indexOf('The folder delivery team is not named yet');
  assert.ok(noteAt > folders.lastIndexOf('class="tip"', noteAt));
  assert.equal(folders.slice(0, noteAt).lastIndexOf('<p') < folders.lastIndexOf('class="tip"', noteAt), true);
});

test('two ambassadors cannot claim the same company, including at the same time', async () => {
  const source = fresh();
  const lock = api.makeLock();
  const first = api.claimLocked(source, lock, 'Northwind Cafe', 'Avery Sample');
  const second = api.claimLocked(source, lock, 'Northwind Cafe', 'Blake Placeholder');
  const results = await Promise.all([first, second]);
  const wins = results.filter(function (result) { return result.ok; });
  assert.equal(wins.length, 1);
  assert.equal(results.filter(function (result) { return !result.ok; }).length, 1);
  assert.equal(source.owners.filter(function (row) { return row.company === 'Northwind Cafe'; }).length, 1);
  const again = api.claim(source, 'Northwind Cafe', 'Casey Demo');
  assert.equal(again.ok, false);
});

test('folder completion does not change ownership', () => {
  const source = fresh();
  const before = source.owners.map(function (row) { return row.company + ':' + row.ambassador; }).join('|');
  const recorded = api.recordDelivery(source, 'Northwind Cafe', 'Avery Sample', '2026-11-20');
  assert.equal(recorded.ok, true);
  const after = source.owners.map(function (row) { return row.company + ':' + row.ambassador; }).join('|');
  assert.equal(after, before);
  const row = source.deliveries.filter(function (item) { return item.company === 'Northwind Cafe'; })[0];
  assert.equal(row.status, 'Delivered');
  assert.equal(row.completedBy, 'Avery Sample');
  const unnamed = api.recordDelivery(source, 'Elm Goods', 'Casey Demo', '2026-11-21');
  assert.equal(unnamed.ok, false);
  const outsider = api.recordDelivery(source, 'Elm Goods', 'Blake Placeholder', '2026-11-21');
  assert.equal(outsider.ok, false);
  const lead = api.reassign(source, 'Harbor & Co.', 'Avery Sample', 'Blake Placeholder');
  assert.equal(lead.ok, false);
  const allowed = api.reassign(source, 'Harbor & Co.', 'Avery Sample', 'Avery Sample');
  assert.equal(allowed.ok, true);
  assert.equal(source.owners.filter(function (row) { return row.company === 'Harbor & Co.'; })[0].ambassador, 'Avery Sample');
  const shown = api.deliveriesIn(source, api.defaultState()).filter(function (row) { return row.company === 'Harbor & Co.'; })[0];
  assert.equal(shown.ambassador, 'Avery Sample');
  assert.equal(shown.assignedTo, 'Casey Demo');
  assert.equal(source.deliveries.filter(function (row) { return row.company === 'Northwind Cafe'; })[0].assignedTo, 'Avery Sample');
});

test('the folder ambassador is the current owner after a claim and a reassign', () => {
  const source = fresh();
  const before = api.deliveriesIn(source, api.defaultState()).filter(function (row) { return row.company === 'Harbor & Co.'; })[0];
  assert.equal(before.ambassador, 'Blake Placeholder');
  assert.equal(before.assignedTo, 'Casey Demo');
  assert.equal(api.claim(source, 'Northwind Cafe', 'Avery Sample').ok, true);
  const claimed = api.deliveriesIn(source, api.defaultState()).filter(function (row) { return row.company === 'Northwind Cafe'; })[0];
  assert.equal(claimed.ambassador, 'Avery Sample');
  assert.equal(api.reassign(source, 'Harbor & Co.', 'Drew Fictitious', 'Avery Sample').ok, true);
  const moved = api.deliveriesIn(source, api.defaultState()).filter(function (row) { return row.company === 'Harbor & Co.'; })[0];
  assert.equal(moved.ambassador, 'Drew Fictitious');
  assert.equal(moved.assignedTo, 'Casey Demo');
  assert.equal(moved.completedBy, '');
});

test('every clickable mark keeps the list equal to the card', () => {
  const source = fresh();
  const base = api.defaultState();
  const home = api.metrics(source, base);
  function check(state) {
    const numbers = api.metrics(source, state);
    assert.equal(api.lists(source, state, 'events').rows.length, numbers.events);
    assert.equal(api.lists(source, state, 'shifts').rows.length, numbers.shifts);
    assert.equal(api.lists(source, state, 'upcoming').rows.length, numbers.upcoming);
    assert.equal(api.lists(source, state, 'uncovered').rows.length, numbers.uncovered);
    const named = api.lists(source, state, 'credited').rows.length;
    assert.equal(named, numbers.credited);
    const folders = api.lists(source, state, 'folders').rows;
    assert.equal(folders.length, numbers.teamTotal);
    assert.equal(api.lists(source, state, 'not-started').rows.length, numbers.folders['Not started']);
    assert.equal(api.lists(source, state, 'assigned').rows.length, numbers.folders.Assigned);
    assert.equal(api.lists(source, state, 'delivered').rows.length, numbers.folders.Delivered);
  }
  check(base);
  const marks = [
    { type: 'ambassador', ambassador: 'Avery Sample' },
    { type: 'ambassador', ambassador: 'Blake Placeholder' },
    { type: 'eventType', eventType: 'Lunch & Learn' },
    { type: 'eventType', eventType: 'Happy Hour' },
    { type: 'role', role: 'Set-Up' },
    { type: 'role', role: 'Clean-Up' },
    { type: 'company', company: 'Northwind Cafe' },
    { type: 'folderStatus', folderStatus: 'Delivered' },
    { type: 'folderStatus', folderStatus: 'Uncovered' },
    { type: 'range', rangeKind: 'last12' }
  ];
  marks.forEach(function (action) {
    const next = api.apply(source, base, action).state;
    check(next);
    if (action.folderStatus === 'Uncovered') {
      const shown = api.lists(source, next, 'companies').rows;
      assert.ok(shown.length > 0);
      shown.forEach(function (row) { assert.equal(row[1], 'Uncovered'); });
      return;
    }
    const numbers = api.metrics(source, next);
    const changed = numbers.events !== home.events || numbers.shifts !== home.shifts || numbers.upcoming !== home.upcoming || numbers.teamTotal !== home.teamTotal || numbers.uncovered !== home.uncovered || numbers.covered !== home.covered;
    assert.equal(changed, true, JSON.stringify(action));
  });
  const html = viewApi.render(source, base, home, '');
  assert.match(html, /data-drill="events"/);
  assert.match(html, /data-drill="shifts"/);
  assert.match(html, /data-drill="upcoming"/);
  assert.match(html, /Example data/);
  assert.equal(JSON.stringify(source).includes('@'), false);
});

test('clicking every mark keeps the record list equal to the card', async () => {
  const { chromium } = require('/tmp/pw/node_modules/playwright-core');
  const browser = await chromium.launch({ executablePath: '/usr/local/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto('http://127.0.0.1:8766/ambassadors/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.example-badge');
    async function listMatches(label) {
      const card = page.locator('.card-kpi', { hasText: label }).first();
      const num = Number((await card.locator('.kpi-num').innerText()).trim());
      await card.locator('[data-drill]').last().click();
      await page.waitForSelector('.drill');
      const count = Number((await page.locator('.record-count').innerText()).replace(/[^0-9]/g, ''));
      assert.equal(count, num, label);
      await page.locator('.drill-back-btn').click();
      await page.waitForSelector('.drill', { state: 'detached' });
    }
    await listMatches('Events');
    await listMatches('Shifts');
    await listMatches('Upcoming');
    const names = await page.locator('[data-ambassador-bar]').evaluateAll(function (nodes) {
      return nodes.map(function (node) { return node.getAttribute('data-ambassador-bar'); }).filter(function (name, index, all) { return name && all.indexOf(name) === index; });
    });
    for (const name of names) {
      await page.locator('[data-ambassador-bar="' + name.replace(/"/g, '\\"') + '"]').first().click();
      await page.waitForSelector('.filter-chip');
      await listMatches('Shifts');
      await page.locator('.filter-chip').click();
    }
    const overviewScroll = await page.evaluate(function () { return document.documentElement.scrollHeight - window.innerHeight; });
    assert.ok(overviewScroll <= 0, 'overview scrolls by ' + overviewScroll);
    await page.locator('[data-event-option="Lunch & Learn"]').check();
    await listMatches('Events');
    await page.locator('[data-role-option="Set-Up"]').check();
    await listMatches('Shifts');
    await page.locator('[data-menu-toggle="range"]').click();
    await page.locator('[data-range="last12"]').check();
    await listMatches('Upcoming');
    await page.click('[data-amb-page="companies"]');
    await listMatches('Uncovered');
    await page.locator('[data-folder-option="Uncovered"]').check();
    await listMatches('Uncovered');
    await page.click('[data-amb-page="folders"]');
    await page.locator('[data-folder-option="Delivered"]').check();
    await listMatches('Delivered');
    await listMatches('Named credit');
    const overflow = await page.evaluate(function () { return document.documentElement.scrollHeight - window.innerHeight; });
    assert.ok(overflow <= 0, 'page scrolls by ' + overflow);
  } finally {
    await browser.close();
  }
});
