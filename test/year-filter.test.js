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
  context.globalThis = context;
  vm.createContext(context);
  ['js/dashboard-model.js', 'js/dashboard-data.js', 'js/dashboard-directory.js', 'js/dashboard-view.js'].forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  });
  return context;
}

const sandbox = load();
const dash = sandbox.ABADashboard;
const data = sandbox.ABADashboardData.placeholderSource();

function paint(view, extra) {
  return sandbox.ABADashboardView.render(Object.assign({}, view, extra || {}, {
    mobile: false,
    documents: (extra && extra.documents) || { extras: [] },
    ui: (extra && extra.ui) || {}
  }));
}

test('this fiscal year is the default and a partial year is year to date', () => {
  const home = dash.compute(data, null);
  assert.equal(home.rangeKind, 'fy');
  assert.equal(home.group, 'month');
  assert.equal(home.page, 'overview');
  assert.equal(home.contextLine, 'FY2027 year to date · Grouped by month · All event types');
  assert.equal(home.members.tag, 'as of Nov 24, 2026');
  assert.equal(home.events.tag, 'FY2027 year to date');
  assert.ok(home.noShows.signups > home.noShows.noShows);
  assert.equal(home.noShows.pct, Math.round((home.noShows.noShows / home.noShows.signups) * 100));
  assert.equal(home.eventCounts.all, home.events.value);
  assert.match(home.ytdNote, /FY2027 YTD runs through Nov 24, 2026/);
  assert.match(home.ytdNote, /Jul 1, 2025/);
  assert.equal(home.events.lastYear < 12, true);
  const fullPrior = dash.compute(data, { rangeKind: 'custom', group: 'year', years: [2026] });
  assert.equal(fullPrior.events.value, 12);
  assert.notEqual(home.events.lastYear, fullPrior.events.value);
});

test('three fiscal years sit side by side and event filters do not change membership', () => {
  const three = dash.compute(data, { rangeKind: 'last3', group: 'year' });
  assert.equal(three.contextLine, 'FY2025–FY2027 · Grouped by fiscal year · All event types');
  assert.deepEqual(Array.from(three.yearBars, (bar) => bar.label), ['FY2025', 'FY2026', 'FY2027 YTD']);
  assert.equal(new Set(Array.from(three.yearBars, (bar) => bar.color)).size, 3);
  assert.deepEqual(Array.from(new Set(Array.from(three.yearBars, (bar) => bar.pattern))), ['solid']);
  assert.equal(three.yearBars.some((bar) => bar.color === '#B84734' || bar.color === '#D01F25'), false);
  assert.equal(three.events.value, three.eventCounts.all);
  assert.equal(three.events.value, three.yearBars[0].events + three.yearBars[1].events + three.yearBars[2].events);
  const filtered = dash.compute(data, { rangeKind: 'last3', group: 'year', eventTypes: ['Lunch & Learn'], companies: ['Ada River Cafe'] });
  assert.equal(filtered.members.value, three.members.value);
  assert.equal(filtered.net.value, three.net.value);
  assert.equal(filtered.events.value, filtered.eventCounts['Lunch & Learn']);
  assert.equal(filtered.filtersActive, true);
  const html = paint(three, { ui: { openMenu: 'range' } });
  assert.match(html, /Hospitality Sign-Up/);
  assert.match(html, /Documents/);
  assert.match(html, /View membership details/);
  assert.match(html, /Members \d+ · \d+%/);
  assert.equal(html.includes('patternUnits'), false);
  const monthHtml = paint(dash.compute(data, { rangeKind: 'last3', group: 'month' }));
  assert.match(monthHtml, /<polyline /);
  assert.match(monthHtml, /one line per fiscal year/);
  assert.match(html, /Guests \d+ · \d+%/);
  assert.match(html, /Gained/);
  assert.match(html, /Lost/);
  assert.equal(html.includes('>Open'), false);
  assert.equal(html.includes('Clear selections'), false);
  const eventsHtml = paint(filtered, { page: 'events' });
  assert.match(eventsHtml, /data-type-box="Lunch &amp; Learn" checked/);
  assert.match(eventsHtml, /Clear selections/);
  assert.match(eventsHtml, /Lunch &amp; Learn/);
  assert.match(eventsHtml, /All types in this range/);
  assert.match(eventsHtml, /Events &amp; Attendance/);
  const cleared = dash.applyAction(data, { rangeKind: 'last3', group: 'year', eventTypes: ['Happy Hour'] }, { type: 'clearFilters' });
  assert.deepEqual(Array.from(cleared.eventTypes), []);
  assert.equal(cleared.rangeKind, 'last3');
});

test('the entry card is Member access and does not repeat the portal title', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /id="portal-gate-title">Member access</);
  assert.match(html, /Need access\? Contact the ABA board secretary\./);
  assert.match(html, /<h1>ABA Board &amp; Committee Portal<\/h1>/);
  assert.equal(html.includes('portal-gate-title">ABA Board'), false);
});
