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

test('the year filter defaults to the prior and current fiscal years', () => {
  const home = dash.compute(data, null);
  assert.deepEqual(Array.from(home.chosenYears), [2026, 2027]);
  assert.deepEqual(Array.from(home.gains, (bar) => bar.label), ['FY2026', 'FY2027']);
  assert.equal(home.events.value, home.yearBars[0].events + home.yearBars[1].events);
  assert.equal(home.members.value, home.yearBars[1].members);
  assert.equal(home.events.parts[0].pct + home.events.parts[1].pct, 100);
  const html = sandbox.ABADashboardView.render(Object.assign({}, home, { mobile: false, documents: { extras: [] }, ui: { openMenu: 'year' } }));
  assert.match(html, /data-year-option="2026" checked/);
  assert.match(html, /data-year-option="2027" checked/);
  assert.equal((html.match(/data-year-option="/g) || []).length >= 3, true);
});

test('one selected year draws a single bar and three years sit side by side', () => {
  const one = dash.compute(data, { years: [2027], period: 'year' });
  assert.deepEqual(Array.from(one.gains, (bar) => bar.label), ['FY2027']);
  assert.equal(one.yearBars.length, 1);
  assert.equal(one.events.parts, undefined);
  const three = dash.compute(data, { years: [2025, 2026, 2027], period: 'year' });
  assert.deepEqual(Array.from(three.yearBars, (bar) => bar.label), ['FY2025', 'FY2026', 'FY2027']);
  assert.equal(new Set(Array.from(three.yearBars, (bar) => bar.color)).size, 3);
  const html = sandbox.ABADashboardView.render(Object.assign({}, three, { mobile: false, documents: { extras: [] } }));
  assert.match(html, /by fiscal year/);
  assert.equal(html.includes('┅'), false);
  const reset = dash.applyAction(data, { years: [2025], period: 'month' }, { type: 'reset' });
  assert.deepEqual(Array.from(reset.years), [2026, 2027]);
});
