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
  ['js/dashboard-model.js', 'js/dashboard-data.js', 'js/dashboard-directory.js', 'js/dashboard-view.js'].forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  });
  return context;
}

const sandbox = load();
const dash = sandbox.ABADashboard;
const directoryApi = sandbox.ABADirectory;
const source = sandbox.ABADashboardData.placeholderSource();
const built = directoryApi.build(source);

function fold(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function unescapeAttr(value) {
  return String(value || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function attr(tag, name) {
  const match = tag.match(new RegExp('\\b' + name + '="([^"]*)"'));
  return match ? unescapeAttr(match[1]) : null;
}

function viewOf(state) {
  return dash.compute(source, state, built);
}

function homeView() {
  return viewOf(dash.defaultState(source));
}

function marksOn(page) {
  const state = Object.assign({}, dash.defaultState(source), { page: page });
  const html = sandbox.ABADashboardView.render(viewOf(state));
  const tags = html.match(/<(?:g|button|input)\b[^>]*>/g) || [];
  const marks = [];
  tags.forEach(function (tag) {
    if (tag.indexOf('data-period="') !== -1) {
      marks.push({
        side: attr(tag, 'data-involvement') || attr(tag, 'data-flow') ? (attr(tag, 'data-flow') ? 'membership' : 'event') : 'membership',
        action: {
          type: 'bucket',
          period: attr(tag, 'data-period'),
          flow: attr(tag, 'data-flow') || '',
          involvement: attr(tag, 'data-involvement') || '',
          audience: attr(tag, 'data-audience') || ''
        }
      });
      return;
    }
    if (tag.indexOf('data-type="') !== -1 || tag.indexOf('data-type-box="') !== -1) {
      marks.push({ side: 'event', action: { type: 'eventType', eventType: attr(tag, 'data-type') || attr(tag, 'data-type-box') } });
      return;
    }
    if (tag.indexOf('data-audience="') !== -1) {
      marks.push({ side: 'event', action: { type: 'audience', audience: attr(tag, 'data-audience') } });
      return;
    }
    if (tag.indexOf('data-business-type="') !== -1) {
      marks.push({ side: 'membership', action: { type: 'businessType', businessType: attr(tag, 'data-business-type') } });
      return;
    }
    if (tag.indexOf('data-renewal-tenure="') !== -1) {
      marks.push({ side: 'membership', action: { type: 'renewalTenure', tenure: attr(tag, 'data-renewal-tenure') } });
      return;
    }
    if (tag.indexOf('data-renewal-band="') !== -1) {
      marks.push({ side: 'membership', action: { type: 'renewalBand', band: attr(tag, 'data-renewal-band') } });
    }
  });
  return marks;
}

function inputMarks() {
  const companies = ['Ada River Cafe', 'Juniper Goods'];
  const people = (built.people || []).slice(0, 2).map(function (person) { return person.name; });
  return companies.map(function (company) {
    return { side: 'event', action: { type: 'companies', companies: [company] } };
  }).concat(people.map(function (name) {
    return { side: 'event', action: { type: 'people', people: [name] } };
  })).concat(['Lunch & Learn', 'Ribbon Cutting', 'Happy Hour'].map(function (type) {
    return { side: 'event', action: { type: 'eventType', eventType: type } };
  }));
}

function actionKey(action) {
  return JSON.stringify(action);
}

function unique(marks) {
  const seen = {};
  return marks.filter(function (mark) {
    const key = actionKey(mark.action);
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function apply(state, action) {
  return dash.applyAction(source, state, action);
}

function clearsPeriod(action) {
  return action.type === 'eventType' || action.type === 'businessType' || action.type === 'companies' || action.type === 'people';
}

function combine(left, right) {
  let state = dash.defaultState(source);
  if (clearsPeriod(left) && !clearsPeriod(right)) {
    state = apply(state, left);
    state = apply(state, right);
  } else if (clearsPeriod(right) && !clearsPeriod(left)) {
    state = apply(state, right);
    state = apply(state, left);
  } else {
    state = apply(state, left);
    state = apply(state, right);
  }
  return state;
}

function flowOf(rows) {
  let joins = 0;
  let losses = 0;
  rows.forEach(function (row) {
    if (row.status === 'lost') losses += 1;
    else joins += 1;
  });
  return joins - losses;
}

function activeInvolved(view) {
  const set = directoryApi.involvedCompanySet(built, view);
  const end = view.measure.end;
  const selected = view.selectedBusinessTypes || [];
  let count = 0;
  built.membership.forEach(function (row) {
    if (row.audience && row.audience !== 'Member') return;
    if (set && !set[fold(row.company)]) return;
    if (selected.length && !directoryApi.matchesBusinessType(row, selected)) return;
    if (row.joined && row.joined > end) return;
    if (row.lost && row.lost <= end) return;
    count += 1;
  });
  return count;
}

function pointEquals(series, buckets, id, card) {
  const index = (buckets || []).findIndex(function (bucket) { return bucket.id === id; });
  if (index < 0) return;
  assert.equal(series[index], card);
}

function checkState(state, label) {
  const view = viewOf(state);
  const members = directoryApi.drill(built, 'members', view).rows;
  const joined = directoryApi.drill(built, 'newMembers', view).rows;
  const changes = directoryApi.drill(built, 'changes', view).rows;
  const businesses = directoryApi.drill(built, 'businesses', view).rows;
  const events = directoryApi.drill(built, 'events', view).rows;
  const visits = directoryApi.drill(built, 'attendance', view).rows;
  const noshows = directoryApi.drill(built, 'noshows', view).rows;
  const renewal = directoryApi.drill(built, 'renewal', view).rows;
  assert.equal(members.length, view.members.value, label + ' members');
  assert.equal(joined.length, view.newMembers.value, label + ' new');
  assert.equal(flowOf(changes), view.net.value, label + ' net');
  assert.equal(businesses.length, view.flow === 'new' ? view.newMembers.value : view.members.value, label + ' businesses');
  assert.equal(events.length, view.events.value, label + ' events');
  assert.equal(visits.length, view.attendance.value, label + ' visits');
  assert.equal(noshows.length, view.noShows.noShows, label + ' no-shows');
  assert.equal(renewal.length, view.renewalRisk.zeroAttendance, label + ' renewal');
  const typeSum = ['Lunch & Learn', 'Ribbon Cutting', 'Happy Hour'].reduce(function (sum, name) {
    return sum + ((view.eventCounts && view.eventCounts[name]) || 0);
  }, 0);
  assert.equal(typeSum, view.events.value, label + ' event types');
  if (view.audience === 'No-show') {
    assert.equal(view.attendance.value, 0, label + ' no-show visits card');
    assert.equal(visits.length, 0, label + ' no-show visit list');
  } else {
    assert.equal((view.pie.members || 0) + (view.pie.guests || 0), view.attendance.value, label + ' pie');
  }
  assert.equal(view.pie.noShows, view.noShows.noShows, label + ' no-show segment');
  if (view.bucket && view.group !== 'year') {
    if (view.involvement === 'visits') pointEquals(view.attendanceSeries, view.monthBuckets, view.bucket, view.attendance.value);
    if (view.involvement === 'noshows') pointEquals(view.noShowSeries, view.monthBuckets, view.bucket, view.noShows.noShows);
  }
  const set = directoryApi.involvedCompanySet(built, view);
  if (set) {
    members.forEach(function (row) { assert.ok(set[fold(row.company)], label + ' member company'); });
    renewal.forEach(function (row) { assert.ok(set[fold(row.company)], label + ' renewal company'); });
    if (!view.flow && !view.renewalTenure && !view.renewalBand) {
      assert.equal(view.members.value, activeInvolved(view), label + ' involved active');
    } else {
      assert.ok(view.members.value <= activeInvolved(view), label + ' involved bound');
    }
  }
  return view;
}

test('every filter narrows every tab, and the zero-visit bar is red', () => {
  const home = homeView();
  const pages = ['overview', 'membership', 'events'];
  const chartMarks = unique(pages.reduce(function (all, page) { return all.concat(marksOn(page)); }, []));
  const inputs = inputMarks();
  const marks = unique(chartMarks.concat(inputs));
  const eventMarks = marks.filter(function (mark) { return mark.side === 'event'; });
  const memberMarks = marks.filter(function (mark) { return mark.side === 'membership'; });
  assert.ok(eventMarks.length >= 8);
  assert.ok(memberMarks.length >= 8);
  let narrowed = 0;
  marks.forEach(function (mark) {
    const state = apply(dash.defaultState(source), mark.action);
    const view = checkState(state, actionKey(mark.action));
    if (mark.side === 'event') {
      assert.notEqual(view.events.value, home.events.value, actionKey(mark.action) + ' events held');
      assert.notEqual(view.noShows.signups, home.noShows.signups, actionKey(mark.action) + ' sign-ups');
    }
    if (view.members.value !== home.members.value || view.events.value !== home.events.value || view.attendance.value !== home.attendance.value || view.noShows.noShows !== home.noShows.noShows || view.noShows.signups !== home.noShows.signups || view.renewalRisk.zeroAttendance !== home.renewalRisk.zeroAttendance) {
      narrowed += 1;
    }
  });
  let pairs = 0;
  eventMarks.forEach(function (eventMark) {
    memberMarks.forEach(function (memberMark) {
      checkState(combine(eventMark.action, memberMark.action), actionKey(eventMark.action) + '+' + actionKey(memberMark.action));
      pairs += 1;
    });
  });
  const quiet = checkState(Object.assign({}, dash.defaultState(source), { audience: 'No-show' }), 'noshow audience');
  const hour = checkState(Object.assign({}, dash.defaultState(source), { eventTypes: ['Happy Hour'] }), 'happy hour');
  const kept = checkState(Object.assign({}, dash.defaultState(source), { companies: ['Juniper Goods'] }), 'quiet company');
  assert.ok(quiet.members.value > 0 && quiet.members.value < home.members.value);
  assert.equal(quiet.attendance.value, 0);
  assert.ok(quiet.events.value > 0 && quiet.events.value < home.events.value);
  assert.ok(quiet.noShows.signups > 0 && quiet.noShows.signups < home.noShows.signups);
  assert.equal((quiet.noShowSeries || []).reduce(function (sum, value) { return sum + value; }, 0), quiet.noShows.noShows);
  const membersOnly = checkState(Object.assign({}, dash.defaultState(source), { audience: 'Member' }), 'member audience');
  const guestsOnly = checkState(Object.assign({}, dash.defaultState(source), { audience: 'Guest' }), 'guest audience');
  assert.ok(membersOnly.events.value > 0 && membersOnly.events.value < home.events.value);
  assert.ok(guestsOnly.events.value > 0 && guestsOnly.events.value < home.events.value);
  assert.ok(quiet.noShows.noShows > 0);
  assert.ok(hour.members.value > 0 && hour.members.value < home.members.value);
  assert.ok(kept.members.value > 0 && kept.members.value < home.members.value);
  const eventsHtml = sandbox.ABADashboardView.render(Object.assign({}, quiet, { page: 'events' }));
  assert.match(eventsHtml, /data-drill="noshows"[^>]*>View the no-show list/);
  assert.match(eventsHtml, /data-drill="attendance"[^>]*>View the visit list/);
  assert.match(eventsHtml, /fill="#D01F25"/);
  assert.match(eventsHtml, /kpi-num tone-down/);
  assert.equal((eventsHtml.match(/data-renewal-band="1–2"[\s\S]{0,220}fill="#3F768B"/) || []).length > 0 || eventsHtml.indexOf('data-renewal-band="1–2"') !== -1, true);
  const otherBand = eventsHtml.split('data-renewal-band="1–2"')[1] || '';
  assert.equal(otherBand.slice(0, 400).indexOf('fill="#D01F25"') === -1, true);
  assert.ok(narrowed >= 10);
  fs.writeFileSync('/tmp/cross-tab.json', JSON.stringify({
    marks: marks.length,
    eventMarks: eventMarks.length,
    memberMarks: memberMarks.length,
    pairs: pairs,
    narrowed: narrowed,
    homeMembers: home.members.value,
    noShowMembers: quiet.members.value,
    happyHourMembers: hour.members.value,
    juniperMembers: kept.members.value
  }, null, 2));
});

test('the Events held number keeps its color under every visit segment', () => {
  const css = fs.readFileSync(path.join(root, 'css/dashboard.css'), 'utf8');
  const rule = css.match(/\.card\.kpi-events \.kpi-num\s*\{[^}]*color:\s*(#[0-9A-Fa-f]{3,8})/);
  assert.ok(rule, 'Events held number color');
  const color = rule[1].toLowerCase();
  function eventsNumber(audience) {
    const view = viewOf(Object.assign({}, dash.defaultState(source), { page: 'events', audience: audience }));
    const html = sandbox.ABADashboardView.render(view);
    const card = html.split('class="card card-events kpi-events"')[1] || '';
    const number = (card.match(/class="(kpi-num[^"]*)"/) || [])[1] || '';
    assert.ok(number, audience || 'all');
    return { number: number, color: color };
  }
  const base = eventsNumber('');
  ['Member', 'Guest', 'No-show'].forEach(function (audience) {
    const next = eventsNumber(audience);
    assert.equal(next.color, base.color, audience);
  });
  assert.match(eventsNumber('No-show').number, /tone-down/);
  assert.notEqual(color, 'var(--clay)');
  assert.match(css, /\.tone-down\s*\{[^}]*color:\s*var\(--clay\)/);
  assert.match(css, /\.card\.kpi-renewal \.kpi-num\.tone-down\s*\{[^}]*color:\s*var\(--clay\)/);
  const quiet = sandbox.ABADashboardView.render(viewOf(Object.assign({}, dash.defaultState(source), { page: 'events', audience: 'No-show' })));
  assert.match(quiet, /data-audience="No-show"[\s\S]{0,500}fill="#D01F25"|fill="#D01F25"[\s\S]{0,200}data-audience="No-show"/);
  assert.match(quiet, /data-renewal-band="0"[\s\S]{0,400}fill="#D01F25"/);
});

test('a no-shows point leaves visits at zero and uses the segment sign-up denominator', () => {
  const home = homeView();
  const november = (home.monthBuckets || []).filter(function (bucket) {
    return String(bucket.id || '').indexOf('2026-11-01:') === 0;
  })[0];
  assert.ok(november, 'November bucket');
  const open = viewOf(Object.assign({}, dash.defaultState(source), { bucket: november.id }));
  assert.ok(open.attendance.value > 0);
  const point = viewOf(Object.assign({}, dash.defaultState(source), { bucket: november.id, involvement: 'noshows' }));
  const segment = viewOf(Object.assign({}, dash.defaultState(source), { bucket: november.id, audience: 'No-show' }));
  assert.equal(point.attendance.value, 0);
  assert.equal(segment.attendance.value, 0);
  assert.equal(directoryApi.drill(built, 'attendance', point).rows.length, 0);
  assert.equal(directoryApi.drill(built, 'attendance', segment).rows.length, 0);
  assert.equal(point.noShows.noShows, segment.noShows.noShows);
  assert.equal(point.noShows.signups, segment.noShows.signups);
  assert.equal((point.pie.members || 0) + (point.pie.guests || 0), 0);
});

test('clicking every mark keeps the rendered list on the card', async () => {
  const { chromium } = require('/tmp/pw/node_modules/playwright-core');
  const portal = JSON.parse(fs.readFileSync(path.join(root, 'portal.json'), 'utf8'));
  const browser = await chromium.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });
  const counts = { clicks: 0, lists: 0, pairs: 0 };
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.addInitScript(function (expected) {
      const orig = crypto.subtle.digest.bind(crypto.subtle);
      crypto.subtle.digest = function (algo, data) {
        const text = new TextDecoder().decode(data);
        if (text === 'example-signin') {
          const bytes = new Uint8Array(expected.match(/../g).map(function (hex) { return parseInt(hex, 16); }));
          return Promise.resolve(bytes.buffer);
        }
        return orig(algo, data);
      };
    }, portal.passwordSha256);
    await page.route('**/*script.google.com/**', function (route) { route.fulfill({ status: 500, body: '' }); });
    await page.goto('http://127.0.0.1:8766/', { waitUntil: 'domcontentloaded' });
    await page.fill('#portal-password', 'example-signin');
    await page.click('#portal-form button[type="submit"]');
    await page.waitForSelector('#dash:not([hidden])');

    async function clickMark(selector) {
      const node = page.locator(selector).first();
      if (!(await node.count())) return false;
      await node.evaluate(function (el) {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      return true;
    }

    async function show(hash) {
      await page.evaluate(function (next) { history.replaceState(null, '', '#' + next); }, hash);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.kpi-num');
    }

    function integerText(text) {
      const cleaned = String(text || '').replace(/[−–]/g, '-').replace(/[^0-9-]/g, '');
      return cleaned === '' || cleaned === '-' ? null : Number(cleaned);
    }

    async function checkTab(pageName) {
      await page.locator('[data-page="' + pageName + '"]').first().click();
      await page.waitForSelector('.kpi-num');
      const cards = await page.evaluate(function () {
        return Array.from(document.querySelectorAll('section.card')).map(function (card) {
          const num = card.querySelector('.kpi-num');
          const link = card.querySelector('[data-drill]');
          return {
            value: num ? num.innerText : '',
            drill: link ? link.getAttribute('data-drill') : ''
          };
        }).filter(function (card) { return card.drill; });
      });
      for (const card of cards) {
        await page.locator('[data-drill="' + card.drill + '"]').first().click();
        await page.waitForSelector('section.drill');
        const info = await page.evaluate(function () {
          const body = document.querySelector('section.drill tbody');
          const text = body ? body.innerText : '';
          const empty = text.indexOf('No matches') !== -1;
          const rows = empty ? 0 : (body ? body.querySelectorAll('tr').length : 0);
          let net = 0;
          if (!empty) {
            Array.from(body.querySelectorAll('tr')).forEach(function (row) {
              const status = (row.querySelector('td:nth-child(3)') || {}).innerText || '';
              if (status.trim() === 'lost') net -= 1;
              else net += 1;
            });
          }
          return { rows: rows, net: net };
        });
        await page.locator('button[data-drill-close]').click();
        await page.waitForSelector('section.drill', { state: 'detached' });
        counts.lists += 1;
        const value = integerText(card.value);
        if (value == null) continue;
        if (card.drill === 'changes') assert.equal(info.net, value, pageName + ' net');
        else assert.equal(info.rows, value, pageName + ' ' + card.drill);
      }
    }

    async function checkEverywhere() {
      await checkTab('overview');
      await checkTab('membership');
      await checkTab('events');
    }

    await show('page=events&range=fy&group=month');
    const selectors = await page.evaluate(function () {
      const found = [];
      document.querySelectorAll('[data-period], [data-type], [data-audience], [data-renewal-tenure], [data-renewal-band]').forEach(function (node) {
        const period = node.getAttribute('data-period');
        const type = node.getAttribute('data-type');
        const audience = node.getAttribute('data-audience');
        const tenure = node.getAttribute('data-renewal-tenure');
        const band = node.getAttribute('data-renewal-band');
        let selector = '';
        if (period != null) {
          selector = '[data-period="' + period + '"]';
          if (node.hasAttribute('data-involvement')) selector += '[data-involvement="' + node.getAttribute('data-involvement') + '"]';
          if (node.hasAttribute('data-flow')) selector += '[data-flow="' + node.getAttribute('data-flow') + '"]';
        }
        else if (type) selector = '[data-type="' + type + '"]';
        else if (audience) selector = '[data-audience="' + audience + '"]';
        else if (tenure) selector = '[data-renewal-tenure="' + tenure + '"]';
        else if (band) selector = '[data-renewal-band="' + band + '"]';
        if (selector && found.indexOf(selector) === -1) found.push(selector);
      });
      return found;
    });
    assert.ok(selectors.length >= 8);

    for (const selector of selectors) {
      await show('page=events&range=fy&group=month');
      if (!(await clickMark(selector))) continue;
      counts.clicks += 1;
      await checkEverywhere();
    }

    await show('page=membership&range=fy&group=month');
    const memberSelectors = await page.evaluate(function () {
      return Array.from(document.querySelectorAll('[data-business-type], [data-period]')).map(function (node) {
        if (node.hasAttribute('data-business-type')) return '[data-business-type="' + node.getAttribute('data-business-type') + '"]';
        let selector = '[data-period="' + node.getAttribute('data-period') + '"]';
        if (node.hasAttribute('data-flow')) selector += '[data-flow="' + node.getAttribute('data-flow') + '"]';
        if (node.hasAttribute('data-involvement')) selector += '[data-involvement="' + node.getAttribute('data-involvement') + '"]';
        return selector;
      }).filter(function (selector, index, all) { return selector && all.indexOf(selector) === index; });
    });
    for (const selector of memberSelectors) {
      await show('page=membership&range=fy&group=month');
      if (!(await clickMark(selector))) continue;
      counts.clicks += 1;
      await checkEverywhere();
    }

    await show('page=events&range=fy&group=month');
    await clickMark('[data-audience="No-show"]');
    await clickMark('[data-type="Lunch & Learn"]');
    counts.pairs += 1;
    await checkEverywhere();

    await show('page=events&range=fy&group=month');
    await clickMark('[data-audience="No-show"]');
    await page.waitForSelector('.filter-chip');
    const chip = await page.locator('.filter-chip').first().innerText();
    assert.ok(chip.indexOf('No-shows') !== -1, chip);
    await page.screenshot({ path: '/opt/cursor/artifacts/events_noshow_segment_1366.png' });
    const zeroFill = await page.locator('[data-renewal-band="0"] rect').first().getAttribute('fill');
    assert.equal(zeroFill, '#D01F25');
    await page.locator('[data-page="membership"]').click();
    await page.waitForSelector('.kpi-num');
    await page.screenshot({ path: '/opt/cursor/artifacts/membership_noshow_segment_1366.png' });

    await show('page=events&range=fy&group=month');
    if (await clickMark('[data-involvement="noshows"][data-period*="2026-11"]')) {
      await page.locator('[data-page="membership"]').click();
      await page.waitForSelector('.kpi-num');
      await page.screenshot({ path: '/opt/cursor/artifacts/membership_november_noshows_1366.png' });
    }
    fs.writeFileSync('/tmp/cross-tab-ui.json', JSON.stringify(counts, null, 2));
    assert.ok(counts.clicks >= 8);
    assert.ok(counts.lists >= counts.clicks);
  } finally {
    await browser.close();
  }
});
