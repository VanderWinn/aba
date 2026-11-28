/* Ambassador activity page. Example data stays in memory. No emails are stored. */
(function () {
  'use strict';
  var model = window.ABAAmbassador;
  var viewApi = window.ABAAmbassadorView;
  var source = model.exampleSource();
  var state = model.defaultState();
  var message = '';
  var openDrill = '';

  document.addEventListener('DOMContentLoaded', paint);

  function paint() {
    var root = document.getElementById('amb');
    var numbers = model.metrics(source, state);
    var pack = openDrill ? model.lists(source, state, openDrill) : null;
    root.innerHTML = viewApi.render(source, state, numbers, message) + viewApi.drill(pack);
  }

  function setFilter(action) {
    var result = model.apply(source, state, action);
    state = result.state;
    message = result.error || '';
    paint();
  }

  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-amb-page], [data-clear], [data-drill], [data-drill-close], [data-claim], [data-deliver], [data-ambassador-bar], [data-company-bar], [data-folder-bar], [data-event-bar], [data-group], [data-menu-toggle], [data-reassign-name]');
    if (!target) return;
    if (target.hasAttribute('data-drill-close')) { openDrill = ''; paint(); return; }
    if (target.hasAttribute('data-drill')) { openDrill = target.getAttribute('data-drill'); paint(); return; }
    if (target.hasAttribute('data-menu-toggle')) {
      setFilter({ type: 'menu', menu: target.getAttribute('data-menu-toggle') });
      return;
    }
    if (target.hasAttribute('data-group')) {
      setFilter({ type: 'group', group: target.getAttribute('data-group') });
      return;
    }
    if (target.hasAttribute('data-reassign-name')) {
      setFilter({ type: 'reassign', company: target.getAttribute('data-reassign-company'), ambassador: target.getAttribute('data-reassign-name') });
      return;
    }
    if (target.hasAttribute('data-amb-page')) {
      setFilter({ type: 'page', page: target.getAttribute('data-amb-page') });
      return;
    }
    if (target.hasAttribute('data-clear')) {
      var key = target.getAttribute('data-clear');
      if (key === 'all') {
        var actor = state.actor;
        state = model.defaultState();
        state.actor = actor;
        message = '';
        paint();
        return;
      }
      if (key === 'range') { setFilter({ type: 'range', rangeKind: 'fy' }); return; }
      var blank = { type: key, assign: true };
      setFilter(blank);
      return;
    }
    if (target.hasAttribute('data-ambassador-bar')) {
      setFilter({ type: 'ambassador', ambassador: target.getAttribute('data-ambassador-bar') });
      return;
    }
    if (target.hasAttribute('data-event-bar')) {
      setFilter({ type: 'eventType', eventType: target.getAttribute('data-event-bar') });
      return;
    }
    if (target.hasAttribute('data-company-bar')) {
      setFilter({ type: 'company', company: target.getAttribute('data-company-bar') });
      return;
    }
    if (target.hasAttribute('data-folder-bar')) {
      setFilter({ type: 'folderStatus', folderStatus: target.getAttribute('data-folder-bar') });
      return;
    }
    if (target.hasAttribute('data-claim')) {
      setFilter({ type: 'claim', company: target.getAttribute('data-claim') });
      return;
    }
    if (target.hasAttribute('data-deliver')) setFilter({ type: 'deliver', company: target.getAttribute('data-deliver') });
  });

  document.addEventListener('change', function (event) {
    var node = event.target;
    var action = null;
    if (node.hasAttribute('data-range')) action = { type: 'range', rangeKind: node.getAttribute('data-range') };
    if (node.hasAttribute('data-ambassador-option')) action = { type: 'ambassador', ambassador: node.checked ? node.getAttribute('data-ambassador-option') : '', assign: true };
    if (node.hasAttribute('data-event-option')) action = { type: 'eventType', eventType: node.checked ? node.getAttribute('data-event-option') : '', assign: true };
    if (node.hasAttribute('data-role-option')) action = { type: 'role', role: node.checked ? node.getAttribute('data-role-option') : '', assign: true };
    if (node.hasAttribute('data-company-option')) action = { type: 'company', company: node.checked ? node.getAttribute('data-company-option') : '', assign: true };
    if (node.hasAttribute('data-folder-option')) action = { type: 'folderStatus', folderStatus: node.checked ? node.getAttribute('data-folder-option') : '', assign: true };
    if (node.hasAttribute('data-actor')) action = { type: 'actor', actor: node.getAttribute('data-actor') };
    if (!action) return;
    setFilter(action);
  });
})();
