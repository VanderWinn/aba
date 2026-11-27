/* Standalone membership dashboard. Opens only with the portal session. */
(function () {
  'use strict';

  var SESSION_KEY = 'aba-board-portal-password';
  var LOGIN = '../index.html?next=dashboard';
  var dash = window.ABADashboard;
  var dataApi = window.ABADashboardData;
  var viewApi = window.ABADashboardView;
  var state = null;
  var source = null;
  var directory = null;
  var documents = { extras: [] };
  var ui = { openMenu: '', companyFilter: '', personFilter: '', drill: null, exportOpen: false };
  var mobileQuery = window.matchMedia('(max-width: 800px)');

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('click', function (event) {
    if (!event.target.closest('.info') && !event.target.closest('.pseg button')) closeTips();
    if (!event.target.closest('[data-more]') && !event.target.closest('.more-pop')) closeMenus();
    if (ui && source && !event.target.closest('.multi')) {
      if (ui.openMenu) {
        ui.openMenu = '';
        paint();
      }
    }
    if (ui && ui.exportOpen && !event.target.closest('.export-menu')) {
      ui.exportOpen = false;
      paint();
    }
  });

  function boot() {
    var password = readPassword();
    if (!password) {
      window.location.replace(LOGIN);
      return;
    }
    sha256(password).then(function (digest) {
      return fetch('../portal.json', { cache: 'no-store' }).then(function (response) {
        if (!response.ok) throw new Error('portal');
        return response.json().then(function (config) {
          return String(config.passwordSha256 || '').toLowerCase() === digest;
        });
      });
    }).then(function (ok) {
      if (!ok) {
        window.location.replace(LOGIN);
        return;
      }
      var config = window.ABA_CONFIG || {};
      var options = { backendUrl: config.backendUrl || '', password: password };
      return dataApi.loadExecutiveSource(options).then(function (loaded) {
        source = loaded;
        if (!source.asOf) source.asOf = todayInDetroit();
        if (source.example) {
          directory = window.ABADirectory.build(source);
          return null;
        }
        return dataApi.loadExecutiveDrilldown(options).then(function (payload) {
          directory = window.ABADirectory.fromLive(payload || {});
        });
      }).then(function () {
        return loadDocs();
      }).then(function (docs) {
        documents = docs;
        state = dash.stateFromHash(window.location.hash, source);
        var root = document.getElementById('dash');
        root.hidden = false;
        root.addEventListener('click', onClick);
        root.addEventListener('change', onChange);
        root.addEventListener('input', onInput);
        root.addEventListener('keydown', onKey);
        document.getElementById('gate-status').hidden = true;
        if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', paint);
        else if (mobileQuery.addListener) mobileQuery.addListener(paint);
        paint();
      });
    }).catch(function () {
      window.location.replace(LOGIN);
    });
  }

  function todayInDetroit() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Detroit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  function readPassword() {
    try { return sessionStorage.getItem(SESSION_KEY) || ''; } catch (err) { return ''; }
  }

  function sha256(text) {
    var data = new TextEncoder().encode(String(text));
    return crypto.subtle.digest('SHA-256', data).then(function (buffer) {
      return Array.from(new Uint8Array(buffer)).map(function (byte) {
        return byte.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  function loadDocs() {
    return fetch('../docs.json', { cache: 'no-store' }).then(function (response) {
      if (!response.ok) return { extras: [] };
      return response.json();
    }).then(function (payload) {
      var extras = (payload && payload.documents || []).filter(function (item) {
        return item && item.title && item.url;
      });
      var procedure = '';
      extras.forEach(function (item) {
        if (!procedure && /procedure|handbook/i.test(item.title)) procedure = item.url;
      });
      return { procedure: procedure, extras: extras };
    }).catch(function () {
      return { extras: [] };
    });
  }

  function visibleNode(selector) {
    var nodes = document.querySelectorAll(selector);
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (nodes[i].offsetParent !== null) return nodes[i];
    }
    return nodes[0] || null;
  }

  function focusRestore() {
    var active = document.activeElement;
    if (!active) return null;
    if (active.hasAttribute('data-find')) {
      return { kind: 'find', menu: active.getAttribute('data-find'), caret: active.selectionStart || 0 };
    }
    if (active.hasAttribute('data-drill-search')) {
      return { kind: 'drill', caret: active.selectionStart || 0 };
    }
    return null;
  }

  function paint() {
    var restore = focusRestore();
    var view = dash.compute(source, state, directory);
    view.mobile = mobileQuery.matches;
    view.documents = documents;
    view.directory = { companies: directory.companies };
    view.personOptions = window.ABADirectory.peopleForCompanies(directory, state.companies || []);
    view.ui = ui;
    if (view.bucket) {
      (view.gains || []).forEach(function (bucket) {
        if (bucket.id === view.bucket) view.measure = { start: bucket.start, end: bucket.end };
      });
    }
    if (ui.drill) {
      var pack = window.ABADirectory.drill(directory, ui.drill.kind, view);
      pack.shown = window.ABADirectory.queryRows(pack.rows, pack.columns, ui.drill.q, ui.drill.sort, ui.drill.dir);
      ui.drill.pack = pack;
      ui.drill.exportOpen = !!ui.exportOpen;
      view.drill = ui.drill;
    }
    var dashRoot = document.getElementById('dash');
    var pageName = view.page || 'overview';
    dashRoot.classList.remove('page-overview', 'page-membership', 'page-events');
    dashRoot.classList.add('page-fit', 'page-' + pageName);
    dashRoot.innerHTML = viewApi.render(view);
    if (viewApi.fitCharts) viewApi.fitCharts(dashRoot, view);
    if (restore) {
      var node = null;
      if (restore.kind === 'find') node = visibleNode('[data-find="' + restore.menu + '"]');
      if (restore.kind === 'drill') node = visibleNode('[data-drill-search]');
      if (node) {
        node.focus();
        if (node.setSelectionRange) node.setSelectionRange(restore.caret, restore.caret);
      }
    }
    var hash = dash.stateHash(state);
    if (hash.indexOf('password') !== -1) return;
    try {
      if (String(window.location.hash || '').replace(/^#/, '') !== hash) {
        history.replaceState(null, '', '#' + hash);
      }
    } catch (err) {}
  }

  function update(action) {
    state = dash.applyAction(source, state, action);
    paint();
  }

  function closeTips() {
    document.querySelectorAll('.info.is-open, .pseg button.is-open').forEach(function (node) {
      node.classList.remove('is-open');
    });
  }

  function closeMenus() {
    document.querySelectorAll('.more-pop').forEach(function (node) {
      node.hidden = true;
    });
  }

  function allowedPeople(companies) {
    return window.ABADirectory.peopleForCompanies(directory, companies).map(function (person) { return person.name; });
  }

  function toggleValue(list, value) {
    var next = (list || []).slice();
    var index = next.indexOf(value);
    if (index === -1) next.push(value);
    else next.splice(index, 1);
    return next;
  }

  function onClick(event) {
    var info = event.target.closest('.info');
    if (info && info.classList.contains('info-hover')) return;
    if (info) {
      event.preventDefault();
      event.stopPropagation();
      var open = info.classList.contains('is-open');
      closeTips();
      if (!open) info.classList.add('is-open');
      return;
    }
    if (event.target.closest('[data-clear-filters]') || event.target.closest('[data-reset]')) {
      ui.companyFilter = '';
      ui.personFilter = '';
      ui.openMenu = '';
      update({ type: 'clearFilters' });
      return;
    }
    if (event.target.closest('[data-filters]')) {
      ui.filtersOpen = !ui.filtersOpen;
      paint();
      return;
    }
    var pageBtn = event.target.closest('[data-page]');
    if (pageBtn) {
      update({ type: 'page', page: pageBtn.getAttribute('data-page') });
      return;
    }
    var groupBtn = event.target.closest('[data-group]');
    if (groupBtn) {
      update({ type: 'group', group: groupBtn.getAttribute('data-group') });
      return;
    }
    var clearBiz = event.target.closest('[data-clear-business]');
    if (clearBiz) {
      update({ type: 'businessType', businessType: clearBiz.getAttribute('data-clear-business') });
      return;
    }
    var bizHit = event.target.closest('[data-business-type]');
    if (bizHit) {
      update({ type: 'businessType', businessType: bizHit.getAttribute('data-business-type') });
      return;
    }
    var clearType = event.target.closest('[data-clear-type]');
    if (clearType) {
      update({ type: 'eventType', eventType: clearType.getAttribute('data-clear-type') });
      return;
    }
    if (event.target.closest('[data-clear-audience]')) {
      update({ type: 'audience', audience: state.audience });
      return;
    }
    var exp = event.target.closest('[data-export]');
    if (exp && ui.drill) {
      ui.exportOpen = false;
      var exportPop = document.getElementById('export-menu');
      var exportToggle = document.querySelector('[data-export-toggle]');
      if (exportPop) exportPop.hidden = true;
      if (exportToggle) exportToggle.setAttribute('aria-expanded', 'false');
      exportShown(exp.getAttribute('data-export'));
      return;
    }
    var drillOpen = event.target.closest('[data-drill]');
    if (drillOpen && !info) {
      ui.drill = { kind: drillOpen.getAttribute('data-drill'), sort: 'date', dir: 'asc', q: '' };
      paint();
      return;
    }
    if (event.target.closest('[data-drill-close]')) {
      ui.drill = null;
      ui.exportOpen = false;
      paint();
      return;
    }
    if (event.target.closest('[data-export-toggle]')) {
      ui.exportOpen = !ui.exportOpen;
      var pop = document.getElementById('export-menu');
      var toggle = document.querySelector('[data-export-toggle]');
      if (pop) pop.hidden = !ui.exportOpen;
      if (toggle) toggle.setAttribute('aria-expanded', ui.exportOpen ? 'true' : 'false');
      if (ui.exportOpen) {
        var firstItem = document.querySelector('.export-pop [data-export]');
        if (firstItem) firstItem.focus();
      }
      return;
    }
    var sort = event.target.closest('[data-sort]');
    if (sort && ui.drill) {
      var key = sort.getAttribute('data-sort');
      ui.drill.dir = ui.drill.sort === key && ui.drill.dir === 'asc' ? 'desc' : 'asc';
      ui.drill.sort = key;
      paint();
      return;
    }
    var menuToggle = event.target.closest('[data-menu-toggle]');
    if (menuToggle) {
      var menu = menuToggle.getAttribute('data-menu-toggle');
      ui.openMenu = ui.openMenu === menu ? '' : menu;
      paint();
      return;
    }
    var selectAll = event.target.closest('[data-select-all]');
    if (selectAll) {
      var selectKind = selectAll.getAttribute('data-select-all');
      if (selectKind === 'year') {
        ui.openMenu = 'year';
        update({ type: 'years', years: dash.compute(source, state).years });
        return;
      }
      var visible = visibleOptions(selectKind);
      if (selectKind === 'company') {
        var companySet = {};
        (state.companies || []).forEach(function (name) { companySet[name] = true; });
        visible.forEach(function (name) { companySet[name] = true; });
        var nextCompanies = Object.keys(companySet);
        state = dash.applyAction(source, state, { type: 'companies', companies: nextCompanies, allowedPeople: allowedPeople(nextCompanies) });
      } else {
        var personSet = {};
        (state.people || []).forEach(function (name) { personSet[name] = true; });
        visible.forEach(function (name) { personSet[name] = true; });
        state = dash.applyAction(source, state, { type: 'people', people: Object.keys(personSet) });
      }
      paint();
      return;
    }
    var clearAll = event.target.closest('[data-clear-all]');
    if (clearAll) {
      if (clearAll.getAttribute('data-clear-all') === 'year') {
        var available = dash.compute(source, state).years || [];
        ui.openMenu = 'year';
        update({ type: 'years', years: [available[available.length - 1]] });
        return;
      }
      if (clearAll.getAttribute('data-clear-all') === 'company') {
        state = dash.applyAction(source, state, { type: 'companies', companies: [], allowedPeople: [] });
      } else state = dash.applyAction(source, state, { type: 'people', people: [] });
      paint();
      return;
    }
    var clearCompany = event.target.closest('[data-clear-company]');
    if (clearCompany) {
      var remaining = (state.companies || []).filter(function (name) { return name !== clearCompany.getAttribute('data-clear-company'); });
      state = dash.applyAction(source, state, { type: 'companies', companies: remaining, allowedPeople: allowedPeople(remaining) });
      paint();
      return;
    }
    var clearPerson = event.target.closest('[data-clear-person]');
    if (clearPerson) {
      state = dash.applyAction(source, state, { type: 'people', people: (state.people || []).filter(function (name) { return name !== clearPerson.getAttribute('data-clear-person'); }) });
      paint();
      return;
    }
    var period = event.target.closest('[data-period]');
    if (period) {
      update({ type: 'period', period: period.getAttribute('data-period') });
      return;
    }
    var step = event.target.closest('[data-year-step]');
    if (step && state.period !== 'last12') {
      var view = dash.compute(source, state);
      var options = (view.stepper && view.stepper.options) || [];
      var index = -1;
      options.forEach(function (item, i) { if (item.id === view.stepper.id) index = i; });
      var picked = options[index + Number(step.getAttribute('data-year-step'))];
      if (picked) update({ type: 'year', year: picked.year });
      return;
    }
    var type = event.target.closest('[data-type]');
    if (type) {
      update({ type: 'eventType', eventType: type.getAttribute('data-type') });
      return;
    }
    var audience = event.target.closest('[data-audience]');
    if (audience) {
      update({ type: 'audience', audience: audience.getAttribute('data-audience') });
      return;
    }
    var bucket = event.target.closest('[data-bucket]');
    if (bucket) {
      update({ type: 'bucket', bucket: bucket.getAttribute('data-bucket') });
      return;
    }
    var more = event.target.closest('[data-more]');
    if (more) {
      event.preventDefault();
      var docs = more.closest('.docs');
      var menu = docs ? docs.querySelector('.more-pop') : null;
      if (!menu) return;
      var show = menu.hidden;
      closeMenus();
      menu.hidden = !show;
    }
  }

  function visibleOptions(kind) {
    var typed = (kind === 'company' ? ui.companyFilter : ui.personFilter || '').toLowerCase();
    var options = kind === 'company' ? directory.companies : allowedPeople(state.companies || []);
    return options.filter(function (option) {
      var label = kind === 'company' ? option : option;
      if (!typed) return true;
      return String(label).toLowerCase().indexOf(typed) !== -1;
    });
  }

  function onInput(event) {
    var target = event.target;
    if (!target) return;
    if (target.hasAttribute('data-find')) {
      var menu = target.getAttribute('data-find');
      if (menu === 'company') ui.companyFilter = target.value;
      else ui.personFilter = target.value;
      ui.openMenu = menu;
      paint();
      return;
    }
    if (target.hasAttribute('data-drill-search') && ui.drill) {
      ui.drill.q = target.value;
      paint();
    }
  }

  function exportName(title, ext) {
    var slug = String(title || 'records').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'records';
    var day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Detroit', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return 'aba-' + slug + '-' + day + '.' + ext;
  }

  function oneLine(value) {
    return String(value == null ? '' : value).replace(/\r\n|\r|\n/g, ' ');
  }

  function csvField(value) {
    var text = oneLine(value);
    if (/[",\r\n]/.test(text) || /^\s|\s$/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
    return text;
  }

  function downloadBlob(name, blob) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportShown(kind) {
    if (!ui.drill || !ui.drill.pack) return;
    var pack = ui.drill.pack;
    var columns = pack.columns || [];
    var rows = pack.shown || [];
    var headers = columns.map(function (column) { return column.label; });
    var data = rows.map(function (row) {
      return columns.map(function (column) {
        return oneLine(row[column.key]);
      });
    });
    var name = exportName(pack.title, kind === 'csv' ? 'csv' : 'xlsx');
    if (kind === 'csv') {
      var lines = [headers].concat(data).map(function (row) { return row.map(csvField).join(','); });
      downloadBlob(name, new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
      return;
    }
    if (!window.XLSX) return;
    var sheet = window.XLSX.utils.aoa_to_sheet([headers].concat(data));
    sheet['!cols'] = headers.map(function (header, index) {
      var width = String(header).length;
      data.forEach(function (row) {
        var size = String(row[index] == null ? '' : row[index]).length;
        if (size > width) width = size;
      });
      return { wch: Math.max(10, width + 2) };
    });
    var range = window.XLSX.utils.decode_range(sheet['!ref']);
    var rowIndex;
    var column;
    for (rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
      for (column = range.s.c; column <= range.e.c; column++) {
        var cell = sheet[window.XLSX.utils.encode_cell({ r: rowIndex, c: column })];
        if (!cell) continue;
        cell.s = { font: { bold: rowIndex === 0 }, alignment: { wrapText: false } };
      }
    }
    var book = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(book, sheet, 'Records');
    window.XLSX.writeFile(book, name);
  }

  function onKey(event) {
    var target = event.target;
    if (!target) return;
    var hit = target.closest && (target.closest('.filter-hit') || (target.getAttribute && (target.hasAttribute('data-type') || target.hasAttribute('data-business-type') || target.hasAttribute('data-audience')) ? target : null));
    if (event.key === 'Escape' && ui.exportOpen) {
      ui.exportOpen = false;
      var exportPop = document.getElementById('export-menu');
      var exportToggle = document.querySelector('[data-export-toggle]');
      if (exportPop) exportPop.hidden = true;
      if (exportToggle) {
        exportToggle.setAttribute('aria-expanded', 'false');
        exportToggle.focus();
      }
      return;
    }
    if (hit && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      if (hit.hasAttribute('data-type')) update({ type: 'eventType', eventType: hit.getAttribute('data-type') });
      else if (hit.hasAttribute('data-business-type')) update({ type: 'businessType', businessType: hit.getAttribute('data-business-type') });
      else if (hit.hasAttribute('data-audience')) update({ type: 'audience', audience: hit.getAttribute('data-audience') });
      return;
    }
    if (event.key !== 'Enter') return;
    if (target.hasAttribute('data-find')) {
      event.preventDefault();
      var kind = target.getAttribute('data-find');
      var match = visibleOptions(kind)[0];
      if (!match) return;
      if (kind === 'company') {
        var companies = toggleValue(state.companies, match);
        if (state.companies.indexOf(match) === -1) {
          state = dash.applyAction(source, state, { type: 'companies', companies: companies, allowedPeople: allowedPeople(companies) });
        }
      } else if (state.people.indexOf(match) === -1) {
        state = dash.applyAction(source, state, { type: 'people', people: toggleValue(state.people, match) });
      }
      paint();
    }
  }

  function onChange(event) {
    var target = event.target;
    if (target && target.hasAttribute('data-company-option')) {
      var companies = toggleValue(state.companies, target.getAttribute('data-company-option'));
      ui.openMenu = 'company';
      state = dash.applyAction(source, state, { type: 'companies', companies: companies, allowedPeople: allowedPeople(companies) });
      paint();
      return;
    }
    if (target && target.hasAttribute('data-person-option')) {
      ui.openMenu = 'person';
      state = dash.applyAction(source, state, { type: 'people', people: toggleValue(state.people, target.getAttribute('data-person-option')) });
      paint();
      return;
    }
    if (target && target.hasAttribute('data-year-option')) {
      var year = Number(target.getAttribute('data-year-option'));
      var picked = (state.years || []).map(Number);
      var at = picked.indexOf(year);
      if (at === -1) picked.push(year);
      else if (picked.length > 1 || state.from || state.to) picked.splice(at, 1);
      ui.openMenu = 'range';
      update({ type: 'years', years: picked });
      return;
    }
    if (target && target.hasAttribute('data-range')) {
      ui.openMenu = 'range';
      update({ type: 'range', rangeKind: target.getAttribute('data-range') });
      return;
    }
    if (target && (target.hasAttribute('data-from') || target.hasAttribute('data-to'))) {
      ui.openMenu = 'range';
      update({
        type: 'dates',
        from: target.hasAttribute('data-from') ? target.value : state.from,
        to: target.hasAttribute('data-to') ? target.value : state.to
      });
      return;
    }
    if (target && target.hasAttribute('data-type-box')) {
      update({ type: 'eventType', eventType: target.getAttribute('data-type-box') });
      return;
    }
    if (target && target.hasAttribute('data-year-select')) {
      update({ type: 'year', year: Number(target.value) });
    }
  }
})();
