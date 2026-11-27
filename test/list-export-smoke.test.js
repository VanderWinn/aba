const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const outDir = '/tmp/list-smoke';
const shot = '/opt/cursor/artifacts/membership_contractors_lunch_1366.png';

function loadXlsx() {
  const context = {};
  context.window = context;
  context.self = context;
  context.global = context;
  context.navigator = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/vendor/xlsx.min.js'), 'utf8'), context, { filename: 'xlsx.min.js' });
  return context.XLSX;
}

function parseCsv(text) {
  const body = String(text).replace(/^\uFEFF/, '');
  return body.split('\r\n').filter(function (line, index, all) {
    return line.length > 0 || index < all.length - 1;
  }).map(function (line) {
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

function integerText(text) {
  const cleaned = String(text || '').replace(/,/g, '').trim();
  return /^\d+$/.test(cleaned) ? Number(cleaned) : null;
}

test('served dashboard exports every list with and without two filters', async () => {
  const { chromium } = require('/tmp/pw/node_modules/playwright-core');
  const XLSX = loadXlsx();
  const portal = JSON.parse(fs.readFileSync(path.join(root, 'portal.json'), 'utf8'));
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.dirname(shot), { recursive: true });
  const browser = await chromium.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars']
  });
  const results = [];
  const pageErrors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    page.on('pageerror', function (err) { pageErrors.push(err.message); });
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
    await page.route('**/*script.google.com/**', function (route) {
      route.fulfill({ status: 500, body: '' });
    });
    await page.goto('http://127.0.0.1:8766/', { waitUntil: 'domcontentloaded' });
    await page.fill('#portal-password', 'example-signin');
    await page.click('#portal-form button[type="submit"]');
    await page.waitForSelector('#dash:not([hidden])', { timeout: 20000 });
    await page.waitForSelector('.kpi-num');

    async function fit() {
      return page.evaluate(function () {
        return {
          scrollHeight: document.documentElement.scrollHeight,
          innerHeight: window.innerHeight
        };
      });
    }

    async function openTab(name) {
      await page.locator('[role="tab"][data-page="' + name + '"]').click();
      await page.waitForTimeout(50);
    }

    async function readPanel() {
      return page.evaluate(function () {
        const headers = Array.from(document.querySelectorAll('.drill-table thead th')).map(function (cell) {
          return cell.innerText.replace(/[▲▼]/g, '').replace(/\s+/g, ' ').trim();
        });
        const rows = Array.from(document.querySelectorAll('.drill-table tbody tr')).map(function (row) {
          return Array.from(row.children).map(function (cell) { return cell.innerText.replace(/\s+/g, ' ').trim(); });
        }).filter(function (row) { return row.join(' ') !== 'No matches'; });
        const countText = (document.querySelector('.record-count') || {}).textContent || '';
        const title = (document.querySelector('.drill h2') || {}).textContent || '';
        return { headers: headers, rows: rows, countText: countText.trim(), title: title.trim() };
      });
    }

    async function download(kind) {
      await page.locator('[data-export-toggle]').click();
      await page.waitForSelector('#export-menu:not([hidden])');
      const pending = page.waitForEvent('download');
      await page.locator('[data-export="' + kind + '"]').click();
      const file = await pending;
      const name = file.suggestedFilename();
      const saved = path.join(outDir, Date.now() + '-' + kind + '-' + name);
      await file.saveAs(saved);
      return { name: name, saved: saved };
    }

    async function checkExport(panel, file) {
      assert.match(file.name, /^aba-[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}-\d{2}-\d{2}\.(csv|xlsx)$/);
      if (file.name.endsWith('.csv')) {
        const grid = parseCsv(fs.readFileSync(file.saved, 'utf8'));
        assert.deepEqual(grid[0], panel.headers);
        assert.equal(grid.length, panel.rows.length + 1);
        if (panel.rows.length) {
          assert.deepEqual(grid[1], panel.rows[0]);
          assert.deepEqual(grid[grid.length - 1], panel.rows[panel.rows.length - 1]);
        }
        grid.forEach(function (row) {
          row.forEach(function (cell) { assert.equal(String(cell).includes('\n'), false); });
        });
        return grid.length - 1;
      }
      const book = XLSX.read(fs.readFileSync(file.saved), { type: 'buffer', cellStyles: true });
      const grid = JSON.parse(JSON.stringify(XLSX.utils.sheet_to_json(book.Sheets.Records, { header: 1, raw: false })));
      assert.deepEqual(grid[0], panel.headers);
      assert.equal(grid.length, panel.rows.length + 1);
      if (panel.rows.length) {
        assert.deepEqual(grid[1].map(String), panel.rows[0].map(String));
        assert.deepEqual(grid[grid.length - 1].map(String), panel.rows[panel.rows.length - 1].map(String));
      }
      const styles = execFileSync('unzip', ['-p', file.saved, 'xl/styles.xml'], { encoding: 'utf8' });
      const sheetXml = execFileSync('unzip', ['-p', file.saved, 'xl/worksheets/sheet1.xml'], { encoding: 'utf8' });
      if (panel.rows.length) assert.match(styles, /<b\/>|<b\s*\/>|<b><\/b>/);
      assert.equal(sheetXml.includes('wrapText="1"'), false);
      return grid.length - 1;
    }

    async function walk(label) {
      const tabs = ['overview', 'membership', 'events'];
      for (const tab of tabs) {
        await openTab(tab);
        const fitted = await fit();
        assert.equal(fitted.scrollHeight, fitted.innerHeight, tab + ' ' + label);
        const buttons = await page.locator('[data-drill]').count();
        for (let index = 0; index < buttons; index++) {
          const meta = await page.locator('[data-drill]').nth(index).evaluate(function (node) {
            const card = node.closest('section.card');
            const title = card ? (card.querySelector('h2') || {}).textContent || '' : '';
            const kpi = card ? (card.querySelector('.kpi-num') || {}).textContent || '' : '';
            return {
              kind: node.getAttribute('data-drill'),
              label: node.textContent.replace(/\s+/g, ' ').trim(),
              title: title.replace(/\s+/g, ' ').trim(),
              kpi: kpi.replace(/\s+/g, ' ').trim()
            };
          });
          await page.locator('[data-drill]').nth(index).click();
          await page.waitForSelector('.drill-table');
          const panel = await readPanel();
          const count = Number((panel.countText.match(/\d+/) || ['0'])[0]);
          assert.equal(panel.rows.length, count, meta.title);
          const cardNumber = integerText(meta.kpi);
          const comparable = cardNumber != null && !/No-shows|Renewal risk|Net membership/.test(meta.title);
          if (comparable) assert.equal(count, cardNumber, meta.title + ' ' + meta.kind);
          const csv = await download('csv');
          const xlsx = await download('xlsx');
          const csvRows = await checkExport(panel, csv);
          const xlsxRows = await checkExport(panel, xlsx);
          assert.equal(csvRows, count);
          assert.equal(xlsxRows, count);
          results.push({
            filters: label,
            tab: tab,
            card: meta.title,
            kind: meta.kind,
            cardNumber: meta.kpi,
            listRows: count,
            csvRows: csvRows,
            xlsxRows: xlsxRows,
            csvFile: csv.name,
            xlsxFile: xlsx.name,
            comparedToCard: comparable
          });
          await page.locator('.drill-back-btn').click();
          await page.waitForSelector('.drill', { state: 'detached' });
        }
      }
    }

    await walk('none');

    await openTab('overview');
    await page.locator('[data-type="Lunch & Learn"]').first().click();
    await openTab('membership');
    await page.locator('[data-business-type="Contractors"]').first().click();
    const chips = await page.locator('.filter-chip').allInnerTexts();
    assert.ok(chips.some(function (text) { return text.indexOf('Event type: Lunch & Learn') !== -1; }));
    assert.ok(chips.some(function (text) { return text.indexOf('Business type: Contractors') !== -1; }));
    const memberCard = page.locator('section.card', { hasText: 'Active member businesses' }).first();
    const memberNumber = integerText(await memberCard.locator('.kpi-num').innerText());
    await memberCard.locator('[data-drill="members"]').click();
    await page.waitForSelector('.drill-table tbody tr');
    const openPanel = await readPanel();
    assert.equal(openPanel.rows.length, memberNumber);
    assert.ok(memberNumber > 0);
    await page.screenshot({ path: shot, fullPage: false });
    const beforeSearch = openPanel.rows.length;
    await page.locator('[data-drill-search]').fill('Example 1');
    await page.waitForTimeout(50);
    const searched = await readPanel();
    assert.ok(searched.rows.length > 0);
    assert.ok(searched.rows.length < beforeSearch);
    const searchedCsv = await download('csv');
    const searchedXlsx = await download('xlsx');
    assert.equal(await checkExport(searched, searchedCsv), searched.rows.length);
    assert.equal(await checkExport(searched, searchedXlsx), searched.rows.length);
    await page.locator('[data-drill-search]').fill('zzzz-no-such-record');
    await page.waitForTimeout(50);
    const emptyPanel = await readPanel();
    assert.equal(emptyPanel.rows.length, 0);
    const emptyCsv = await download('csv');
    const emptyXlsx = await download('xlsx');
    assert.equal(await checkExport(emptyPanel, emptyCsv), 0);
    assert.equal(await checkExport(emptyPanel, emptyXlsx), 0);
    await page.locator('[data-export-toggle]').click();
    await page.waitForSelector('#export-menu:not([hidden])');
    await page.locator('.drill-back-btn').click();

    await walk('Lunch & Learn × Contractors');

    const report = {
      panels: results.length,
      exports: results.length * 2,
      searchNarrowedFrom: beforeSearch,
      searchNarrowedTo: searched.rows.length,
      emptyExportHeaderOnly: true,
      screenshot: shot,
      pageErrors: pageErrors
    };
    fs.writeFileSync('/tmp/list-smoke-report.json', JSON.stringify({ report: report, results: results }, null, 2));
    console.log(JSON.stringify(report));
    assert.equal(pageErrors.length, 0);
    assert.ok(results.length >= 12);
  } finally {
    await browser.close();
  }
});
