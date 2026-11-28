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

  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-amb-page], [data-clear], [data-drill], [data-drill-close], [data-claim], [data-deliver], [data-ambassador-bar], [data-company-bar], [data-folder-bar]');
    if (!target) return;
    if (target.hasAttribute('data-drill-close')) { openDrill = ''; paint(); return; }
    if (target.hasAttribute('data-drill')) { openDrill = target.getAttribute('data-drill'); paint(); return; }
    if (target.hasAttribute('data-amb-page')) {
      var result = model.apply(source, state, { type: 'page', page: target.getAttribute('data-amb-page') });
      state = result.state;
      message = '';
      paint();
      return;
    }
    if (target.hasAttribute('data-clear')) {
      var key = target.getAttribute('data-clear');
      if (key === 'all') state = model.defaultState();
      else {
        var blank = { type: key };
        if (key === 'ambassador') blank.ambassador = state.ambassador;
        if (key === 'eventType') blank.eventType = state.eventType;
        if (key === 'role') blank.role = state.role;
        if (key === 'company') blank.company = state.company;
        if (key === 'folderStatus') blank.folderStatus = state.folderStatus;
        state = model.apply(source, state, blank).state;
      }
      message = '';
      paint();
      return;
    }
    if (target.hasAttribute('data-ambassador-bar')) {
      state = model.apply(source, state, { type: 'ambassador', ambassador: target.getAttribute('data-ambassador-bar') }).state;
      message = '';
      paint();
      return;
    }
    if (target.hasAttribute('data-company-bar')) {
      state = model.apply(source, state, { type: 'company', company: target.getAttribute('data-company-bar') }).state;
      message = '';
      paint();
      return;
    }
    if (target.hasAttribute('data-folder-bar')) {
      state = model.apply(source, state, { type: 'folderStatus', folderStatus: target.getAttribute('data-folder-bar') }).state;
      message = '';
      paint();
      return;
    }
    if (target.hasAttribute('data-claim')) {
      var claimResult = model.apply(source, state, { type: 'claim', company: target.getAttribute('data-claim') });
      state = claimResult.state;
      message = claimResult.error;
      paint();
      return;
    }
    if (target.hasAttribute('data-deliver')) {
      var delivery = model.apply(source, state, { type: 'deliver', company: target.getAttribute('data-deliver') });
      state = delivery.state;
      message = delivery.error;
      paint();
    }
  });

  document.addEventListener('change', function (event) {
    var node = event.target;
    var action = null;
    if (node.hasAttribute('data-range')) action = { type: 'range', rangeKind: node.value };
    if (node.hasAttribute('data-group')) action = { type: 'group', group: node.value };
    if (node.hasAttribute('data-ambassador')) action = { type: 'ambassador', ambassador: node.value };
    if (node.hasAttribute('data-event-type')) action = { type: 'eventType', eventType: node.value };
    if (node.hasAttribute('data-role')) action = { type: 'role', role: node.value };
    if (node.hasAttribute('data-company')) action = { type: 'company', company: node.value };
    if (node.hasAttribute('data-folder-status')) action = { type: 'folderStatus', folderStatus: node.value };
    if (node.hasAttribute('data-actor')) action = { type: 'actor', actor: node.value };
    if (node.hasAttribute('data-reassign') && node.value) action = { type: 'reassign', company: node.getAttribute('data-reassign'), ambassador: node.value };
    if (!action) return;
    var result = model.apply(source, state, action);
    state = result.state;
    message = result.error;
    paint();
  });
})();
