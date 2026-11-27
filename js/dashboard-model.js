/* Period math and figures for the membership and events dashboard.
   No network calls. No emails, phones, or names. */
(function (root) {
  'use strict';

  var TYPES = ['Lunch & Learn', 'Ribbon Cutting', 'Happy Hour'];
  var LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var POP = '#3F768B';
  var CLAY = '#D01F25';
  var INK = '#39393a';

  var DEFS = {
    'Portal': 'A private page for ABA board and committee members, with documents and a dashboard of membership and events.',
    'Documents': 'Links to board and committee documents. They stay in this top bar, apart from the figures below.',
    'Handbook': 'Opens the procedure manual or handbook for board and committee members.',
    'Sign-up sheet': 'Opens the volunteer sign-up sheet that feeds the internal figures on this dashboard.',
    'Bylaws': 'Opens the ABA bylaws.',
    'Board minutes': 'Opens recent board meeting minutes.',
    'Committee roster': 'Opens the committee roster.',
    'More': 'Opens any remaining documents kept in this portal.',
    'Event type': 'Limits the event numbers on this page to Lunch & Learn, Ribbon Cutting, or Happy Hour. None checked means all types. The counts beside each type are events in the selected date range.',
    'All': 'Shows Lunch & Learn, Ribbon Cutting, and Happy Hour together.',
    'Lunch & Learn': 'Shows only Lunch & Learn events in the period you selected.',
    'Ribbon Cutting': 'Shows only Ribbon Cutting events in the period you selected.',
    'Happy Hour': 'Shows only Happy Hour events in the period you selected.',
    'Date range': 'Sets which dates the numbers cover. This fiscal year runs from July 1 through today. Last 12 months is the trailing year. Last 3 fiscal years includes the two completed years and this year to date. Custom is a choice of fiscal years, dates, or both. A year that has not ended is marked year to date and is compared with the same dates last year.',
    'Group by': 'Changes how the charts are split. It does not change the totals. Month, quarter, or fiscal year. Several years grouped by year sit side by side, one solid color each.',
    'Year selector': 'Choose one or more fiscal years. A fiscal year runs from July 1 through June 30 and is named for the year it ends. The page starts with the current year and the year before it. Each selected year gets its own color. This control is not used when Last 12 months is selected.',
    'Period': 'Year keeps every total on the fiscal year chosen at the left. Quarter sets every total to the current fiscal quarter inside that year, or the last quarter of a past year. Month sets every total to the current calendar month inside that year, or the last month of a past year. The current quarter or month runs through today. Last 12 months uses the trailing 12 months and ignores the fiscal year. Each chart period is that period alone. Member Gains and Losses pairs it with the same period last fiscal year.',
    'Year': 'Sets every total to the fiscal year chosen at the left. The current year runs through today. A past year is July 1 through June 30. Member Gains and Losses shows that year beside the same dates last fiscal year.',
    'Quarter': 'The dates and the big numbers stay on the current fiscal quarter inside the year at the left, through today. A past year uses its last quarter, April through June. The charts show each quarter of that fiscal year separately, Q1 through the current quarter, each beside the same quarter last fiscal year. Later quarters are left off.',
    'Month': 'The dates and the big numbers stay on the current month inside the year at the left, through today. A past year uses June. The charts show each month of that fiscal year separately, July through the current month, each beside the same month last fiscal year. Later months are left off.',
    'Last 12 months (period)': 'Uses the trailing 12 full months ending today, and groups Member Gains and Losses by month. The Year control is not used. Comparisons use the 12 months before that.',
    'Reset filters': 'Clears every filter in one click: the year, the period, event types, companies, attendees, and a pie or bar selection. An open list refreshes to the unfiltered records.',
    'Members': 'Active member businesses at the end of the date range. This count is not changed by event type, company, or attendee. A partial year is the count as of today.',
    'New Members': 'Business members who joined during the date range. A partial year counts only through today and is compared with the same dates one year earlier.',
    'Net Gain': 'Business members who joined minus business members who left during the date range. A partial year is year to date and is compared with the same dates last year, not the full prior year.',
    'Member Gains and Losses': 'Gained is the solid bar. Lost is the pale bar. Each year has its own solid color. A year marked YTD runs through today.',
    'Membership combo': 'Teal bars are new members and red bars are cancelled members for each period in Group by. The line is the active member count at the end of that period, on its own scale at the right. The last point matches Active member businesses.',
    'Members by business type': 'Active member businesses in each directory category, largest first. A business listed in more than one category is counted in each. Other / not listed is businesses with no category.',
    'Events Held': 'How many events took place in the date range. Event type, company, and attendee change this number. The counts beside the event types are events in this same date range.',
    'Attendance': 'Event visits in the date range. A visit is one person counted at one event. The same person at two events is counted twice. This is not a count of unique people. Event type, company, and attendee change this number.',
    'No-shows': 'People who signed up and were marked no-show. The count is no-shows of sign-ups. Cancelled sign-ups are left out. A row still marked only as registered is a sign-up, not a no-show. Company and attendee filters apply when each sign-up has a status. Event totals without a status cannot be split by company.',
    'Renewal risk': 'Based on one renewal cycle (6/30/2026 deactivations); attendance mostly Lunch & Learn; shows a pattern, not a cause.',
    'Year to date': 'A fiscal year that has not ended runs through today. It is compared with the same dates one year earlier, not with the full prior year.',
    'Membership filters': 'Event type, company, and attendee change event visits. They do not change the membership numbers on this view.',
    'Attendance Distribution': 'Member visits and guest visits in the date range. The raw count comes first. The percentage is the share of visits. Choosing one limits the event numbers on this page.',
    'Visits and no-shows': 'Each percentage is that group\u2019s share of members, guests, and no-shows together: everyone who signed up and was expected. Choosing members or guests limits the event numbers on this page.',
    'Open': 'Opens the list of records behind this number. The list follows the filters already on the page.',
    'Company': 'Limits event visits on this page to the companies you select. Companies combine with OR. It does not change membership totals.',
    'Attendee': 'Limits event visits on this page to the people you select. The list shows people at the selected companies, or everyone when no company is selected. People combine with OR.',
    'Last month / quarter / year': 'On Events Held and Attendee Count, last month and last quarter are the same length of time shifted back one month or one quarter, and last year is the same dates in the prior fiscal year. On the business-member cards, the windows follow fiscal boundaries instead.',
    'Powered by Donny C. Nguyen': 'A credit line for the portal work. It is not a data measure.'
  };

  var FLAGS = {
    'Members': 'The sign-up sheet has no member roster yet, so this figure is example data until a roster source is provided.',
    'New Members': 'The sign-up sheet has no member roster yet, so this figure is example data until a roster source is provided.',
    'Net Gain': 'Uses the same open definition of who has left, and there is no member roster yet; this figure is example data.',
    'Member Gains and Losses': 'Uses the same open definition of who has left, and is example data until a member roster is provided.',
    'Attendance': 'Internal sign-up figures are current; an external attendance source has been promised but is not connected yet. Capacity rules may still be refined. Figures here are example data.',
    'Attendance Distribution': 'Guest and member attendance will be firmer once the external attendance source is connected. Figures here are example data.'
  };

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function parseISO(value) {
    var parts = String(value || '').split('-');
    return { y: Number(parts[0]), m: Number(parts[1]), d: Number(parts[2]) };
  }

  function isISO(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
    var p = parseISO(value);
    if (p.m < 1 || p.m > 12 || p.d < 1) return false;
    return p.d <= daysInMonth(p.y, p.m);
  }

  function iso(y, m, d) {
    return y + '-' + pad(m) + '-' + pad(d);
  }

  function dateUTC(value) {
    var p = parseISO(value);
    return Date.UTC(p.y, p.m - 1, p.d);
  }

  function fromUTC(ms) {
    var dt = new Date(ms);
    return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  function addDays(value, days) {
    return fromUTC(dateUTC(value) + days * 86400000);
  }

  function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }

  function addMonths(value, delta) {
    var p = parseISO(value);
    var idx = p.y * 12 + (p.m - 1) + delta;
    var y = Math.floor(idx / 12);
    var m = idx % 12;
    if (m < 0) {
      m += 12;
      y -= 1;
    }
    m += 1;
    return iso(y, m, Math.min(p.d, daysInMonth(y, m)));
  }

  function inclusiveDays(start, end) {
    return Math.round((dateUTC(end) - dateUTC(start)) / 86400000) + 1;
  }

  function shiftRange(start, end, months) {
    var end2 = addMonths(end, -months);
    var start2 = addDays(end2, -(inclusiveDays(start, end) - 1));
    return { start: start2, end: end2 };
  }

  function fiscalYearOf(value) {
    var p = parseISO(value);
    if (!p.y || !p.m) return 2027;
    return p.m >= 7 ? p.y + 1 : p.y;
  }

  function fiscalBounds(year) {
    year = Number(year);
    return { start: iso(year - 1, 7, 1), end: iso(year, 6, 30) };
  }

  function shiftYears(value, delta) {
    var p = parseISO(value);
    var y = p.y + delta;
    return iso(y, p.m, Math.min(p.d, daysInMonth(y, p.m)));
  }

  function priorYearRange(start, end) {
    return { start: shiftYears(start, -1), end: shiftYears(end, -1) };
  }

  function quarterIndex(value) {
    var p = parseISO(value);
    var fy = p.m >= 7 ? p.y + 1 : p.y;
    var q = p.m >= 10 ? 2 : (p.m >= 7 ? 1 : (p.m <= 3 ? 3 : 4));
    return fy * 4 + (q - 1);
  }

  function quarterBounds(index) {
    var fy = Math.floor(index / 4);
    var q = index % 4 + 1;
    if (q === 1) return { fy: fy, q: q, start: iso(fy - 1, 7, 1), end: iso(fy - 1, 9, 30) };
    if (q === 2) return { fy: fy, q: q, start: iso(fy - 1, 10, 1), end: iso(fy - 1, 12, 31) };
    if (q === 3) return { fy: fy, q: q, start: iso(fy, 1, 1), end: iso(fy, 3, 31) };
    return { fy: fy, q: q, start: iso(fy, 4, 1), end: iso(fy, 6, 30) };
  }

  function formatDate(value) {
    var p = parseISO(value);
    if (!p.y || !p.m || !p.d) return String(value || '');
    return MONTHS[p.m - 1] + ' ' + p.d + ', ' + p.y;
  }

  function clampWindow(start, end, today) {
    if (start > today) return null;
    return { start: start, end: end > today && start <= today ? today : end };
  }

  function quarterWindow(year, quarter, today) {
    quarter = Number(quarter);
    if (quarter < 1 || quarter > 4) quarter = quarterBounds(quarterIndex(today)).q;
    var bounds = quarterBounds(Number(year) * 4 + (quarter - 1));
    return clampWindow(bounds.start, bounds.end, today);
  }

  function monthWindow(month, today) {
    var key = String(month || '');
    if (!/^\d{4}-\d{2}$/.test(key)) key = String(today).slice(0, 7);
    var p = parseISO(key + '-01');
    var start = iso(p.y, p.m, 1);
    var end = iso(p.y, p.m, daysInMonth(p.y, p.m));
    return clampWindow(start, end, today);
  }

  function quarterForYear(year, today) {
    if (Number(year) >= fiscalYearOf(today)) return quarterBounds(quarterIndex(today)).q;
    return 4;
  }

  function monthForYear(year, today) {
    if (Number(year) >= fiscalYearOf(today)) return String(today).slice(0, 7);
    return iso(Number(year), 6, 1).slice(0, 7);
  }

  function periodRange(period, year, today) {
    var t = parseISO(today);
    var current = fiscalYearOf(today);
    year = Number(year);
    if (period === 'last12') {
      var idx = t.y * 12 + (t.m - 1) - 11;
      var y = Math.floor(idx / 12);
      var m = idx % 12;
      if (m < 0) {
        m += 12;
        y -= 1;
      }
      return { start: iso(y, m + 1, 1), end: today };
    }
    var bounds = fiscalBounds(year);
    if (year >= current) return { start: bounds.start, end: today };
    return bounds;
  }

  function groupingOf(period) {
    if (period === 'quarter') return 'quarter';
    if (period === 'year') return 'year';
    return 'month';
  }

  function clipBucket(range, start, end, label) {
    var bStart = start < range.start ? range.start : start;
    var bEnd = end > range.end ? range.end : end;
    if (bStart > bEnd) return null;
    return { id: bStart + ':' + bEnd, label: label, start: bStart, end: bEnd };
  }

  function bucketsFor(range, grouping) {
    var out = [];
    var guard = 0;
    var startP = parseISO(range.start);
    var endP = parseISO(range.end);
    if (grouping === 'year') {
      var fy = fiscalYearOf(range.start);
      var fyEnd = fiscalYearOf(range.end);
      for (; fy <= fyEnd && guard < 40; fy++) {
        var bounds = fiscalBounds(fy);
        var bucket = clipBucket(range, bounds.start, bounds.end, 'FY' + fy);
        if (bucket) out.push(bucket);
        guard += 1;
      }
      return out;
    }
    if (grouping === 'quarter') {
      var idx = quarterIndex(range.start);
      var endIdx = quarterIndex(range.end);
      var multiYear = fiscalYearOf(range.start) !== fiscalYearOf(range.end);
      while (idx <= endIdx && guard < 80) {
        var quarter = quarterBounds(idx);
        var label = 'Q' + quarter.q;
        if (multiYear) label += ' ’' + String(quarter.fy).slice(2);
        var bucketQ = clipBucket(range, quarter.start, quarter.end, label);
        if (bucketQ) out.push(bucketQ);
        idx += 1;
        guard += 1;
      }
      return out;
    }
    var monthIdx = startP.y * 12 + (startP.m - 1);
    var monthEndIdx = endP.y * 12 + (endP.m - 1);
    var spanYears = fiscalYearOf(range.start) !== fiscalYearOf(range.end);
    while (monthIdx <= monthEndIdx && guard < 240) {
      var my = Math.floor(monthIdx / 12);
      var mm = monthIdx % 12 + 1;
      var letter = MONTHS[mm - 1];
      if (spanYears) letter = letter + ' \u2019' + String(my).slice(2);
      var bucketM = clipBucket(range, iso(my, mm, 1), iso(my, mm, daysInMonth(my, mm)), letter);
      if (bucketM) out.push(bucketM);
      monthIdx += 1;
      guard += 1;
    }
    return out;
  }

  function groupKey(row) {
    return (row.audience || '') + '|' + (row.eventType || '');
  }

  function typeSelected(value, filter) {
    if (filter == null || filter === '') return true;
    if (typeof filter === 'string') return value === filter;
    if (!filter.length) return true;
    var i;
    for (i = 0; i < filter.length; i++) if (filter[i] === value) return true;
    return false;
  }

  function rowMatches(row, audience, eventType) {
    if (audience && row.audience !== audience) return false;
    if (!typeSelected(row.eventType, eventType)) return false;
    return true;
  }

  function stockAt(data, day, audience, eventType) {
    var map = {};
    function slot(row) {
      var key = groupKey(row);
      if (!map[key]) map[key] = { openingDate: '', opening: 0, changes: [] };
      return map[key];
    }
    (data.openings || []).forEach(function (row) {
      if (!rowMatches(row, audience, eventType)) return;
      if (row.date > day) return;
      var item = slot(row);
      if (!item.openingDate || row.date >= item.openingDate) {
        item.openingDate = row.date;
        item.opening = Number(row.count) || 0;
      }
    });
    (data.changes || []).forEach(function (row) {
      if (!rowMatches(row, audience, eventType)) return;
      slot(row).changes.push(row);
    });
    var total = 0;
    Object.keys(map).forEach(function (key) {
      var item = map[key];
      var n = item.opening;
      item.changes.forEach(function (row) {
        if (item.openingDate && row.date <= item.openingDate) return;
        if (row.date > day) return;
        n += (Number(row.joins) || 0) - (Number(row.losses) || 0);
      });
      total += n;
    });
    return total;
  }

  function flowBetween(data, start, end, audience, eventType) {
    var joins = 0;
    var losses = 0;
    (data.changes || []).forEach(function (row) {
      if (row.date < start || row.date > end) return;
      if (!rowMatches(row, audience, eventType)) return;
      joins += Number(row.joins) || 0;
      losses += Number(row.losses) || 0;
    });
    return { joins: joins, losses: losses, net: joins - losses };
  }

  function attendanceByEvent(data) {
    var map = {};
    (data.attendance || []).forEach(function (row) {
      if (!map[row.eventId]) map[row.eventId] = { Member: 0, Guest: 0 };
      if (row.audience !== 'Member' && row.audience !== 'Guest') return;
      map[row.eventId][row.audience] += Number(row.count) || 0;
    });
    return map;
  }

  function eventsIn(data, start, end, eventType, audience, attendance) {
    return (data.events || []).filter(function (event) {
      if (!event.date || event.date < start || event.date > end) return false;
      if (!typeSelected(event.type, eventType)) return false;
      if (audience) {
        var counts = attendance[event.id] || { Member: 0, Guest: 0 };
        if (!(counts[audience] > 0)) return false;
      }
      return true;
    });
  }

  function attendanceSum(events, attendance, audience) {
    var total = 0;
    events.forEach(function (event) {
      var counts = attendance[event.id] || { Member: 0, Guest: 0 };
      if (audience) total += counts[audience] || 0;
      else total += (counts.Member || 0) + (counts.Guest || 0);
    });
    return total;
  }

  function tone(value, lastYear) {
    if (value > lastYear) return 'up';
    if (value < lastYear) return 'down';
    return 'flat';
  }

  function headlineColor(kind) {
    if (kind === 'up') return POP;
    if (kind === 'down') return CLAY;
    return INK;
  }

  function metric(value, lastMonth, lastQuarter, lastYear) {
    return {
      value: value,
      lastMonth: lastMonth,
      lastQuarter: lastQuarter,
      lastYear: lastYear,
      tone: tone(value, lastYear),
      color: headlineColor(tone(value, lastYear))
    };
  }

  function defaultYears(data) {
    var today = isISO(data && data.asOf) ? data.asOf : '2026-11-24';
    var current = fiscalYearOf(today);
    var available = yearsOf(data || { asOf: today });
    var picked = [current - 1, current].filter(function (year) { return available.indexOf(year) !== -1; });
    if (!picked.length) picked = [available[available.length - 1] || current];
    return picked;
  }

  function normalizeYears(data, list) {
    var available = yearsOf(data);
    var picked = [];
    listOf(list).forEach(function (item) {
      var year = Number(item);
      if (available.indexOf(year) !== -1 && picked.indexOf(year) === -1) picked.push(year);
    });
    if (!picked.length) return defaultYears(data);
    picked.sort(function (a, b) { return a - b; });
    return picked;
  }

  var YEAR_COLORS = ['#3F768B', '#C4841D', '#3D5A80', '#6B4C7A', '#24785F'];

  function yearSlot(year, chosen) {
    var fromEnd = chosen.length - 1 - chosen.indexOf(Number(year));
    if (fromEnd < 0) fromEnd = 0;
    return Math.min(fromEnd, YEAR_COLORS.length - 1);
  }

  function yearColor(year, chosen) {
    return YEAR_COLORS[yearSlot(year, chosen)];
  }

  function yearPattern(year, chosen) {
    return 'solid';
  }

  function clampEnd(end, today) {
    return end > today ? today : end;
  }

  function yearsInSpan(span) {
    var list = [];
    var fy = fiscalYearOf(span.start);
    var last = fiscalYearOf(span.end);
    var guard = 0;
    for (; fy <= last && guard < 40; fy++) {
      list.push(fy);
      guard += 1;
    }
    return list;
  }

  function yearSlice(year, span) {
    var bounds = fiscalBounds(year);
    var start = bounds.start > span.start ? bounds.start : span.start;
    var end = bounds.end < span.end ? bounds.end : span.end;
    if (start > end) return null;
    var partial = end < bounds.end;
    return { year: year, start: start, end: end, partial: partial, label: 'FY' + year + (partial ? ' YTD' : '') };
  }

  function selectionOf(data, state) {
    var today = isISO(data && data.asOf) ? data.asOf : '2026-11-24';
    var current = fiscalYearOf(today);
    var available = yearsOf(data || { asOf: today });
    state = state || {};
    var rangeKind = state.rangeKind;
    if (rangeKind !== 'fy' && rangeKind !== 'last12' && rangeKind !== 'last3' && rangeKind !== 'custom') {
      if (state.period === 'last12') rangeKind = 'last12';
      else if (state.years && listOf(state.years).length) rangeKind = 'custom';
      else rangeKind = 'fy';
    }
    var group = state.group;
    if (group !== 'month' && group !== 'quarter' && group !== 'year') {
      if (state.period === 'quarter') group = 'quarter';
      else if (state.period === 'year' || rangeKind === 'last3') group = 'year';
      else group = 'month';
    }
    var page = state.page === 'membership' || state.page === 'events' ? state.page : 'overview';
    var from = isISO(state.from) ? state.from : '';
    var to = isISO(state.to) ? state.to : '';
    if (from && to && from > to) {
      var swapped = from;
      from = to;
      to = swapped;
    }
    var chosen = [];
    var span;
    if (rangeKind === 'last12') {
      span = periodRange('last12', current, today);
      chosen = yearsInSpan(span).filter(function (year) { return available.indexOf(year) !== -1; });
    } else if (rangeKind === 'last3') {
      chosen = [current - 2, current - 1, current].filter(function (year) { return available.indexOf(year) !== -1; });
      if (!chosen.length) chosen = [available[available.length - 1] || current];
      span = { start: fiscalBounds(chosen[0]).start, end: today };
    } else if (rangeKind === 'custom') {
      var picked = [];
      listOf(state.years).forEach(function (item) {
        var year = Number(item);
        if (available.indexOf(year) !== -1 && picked.indexOf(year) === -1) picked.push(year);
      });
      picked.sort(function (a, b) { return a - b; });
      if (from || to) {
        var dateSpan = {
          start: from || fiscalBounds(picked[0] || current).start,
          end: clampEnd(to || today, today)
        };
        if (dateSpan.start > dateSpan.end) dateSpan.start = dateSpan.end;
        if (picked.length) {
          var yearSpan = {
            start: fiscalBounds(picked[0]).start,
            end: clampEnd(fiscalBounds(picked[picked.length - 1]).end, today)
          };
          span = {
            start: dateSpan.start > yearSpan.start ? dateSpan.start : yearSpan.start,
            end: dateSpan.end < yearSpan.end ? dateSpan.end : yearSpan.end
          };
          if (span.start > span.end) span = dateSpan;
          chosen = picked;
        } else {
          span = dateSpan;
          chosen = yearsInSpan(span).filter(function (year) { return available.indexOf(year) !== -1; });
        }
      } else {
        chosen = picked.length ? picked : [available[available.length - 1] || current];
        span = {
          start: fiscalBounds(chosen[0]).start,
          end: clampEnd(fiscalBounds(chosen[chosen.length - 1]).end, today)
        };
      }
    } else {
      rangeKind = 'fy';
      chosen = available.indexOf(current) !== -1 ? [current] : [available[available.length - 1] || current];
      span = periodRange('year', chosen[0], today);
    }
    if (!chosen.length) chosen = [current];
    var slices = [];
    chosen.forEach(function (year) {
      var slice = yearSlice(year, span);
      if (slice) slices.push(slice);
    });
    if (!slices.length) {
      slices = [yearSlice(chosen[chosen.length - 1], { start: span.start, end: span.end }) || {
        year: chosen[chosen.length - 1], start: span.start, end: span.end, partial: true, label: 'FY' + chosen[chosen.length - 1] + ' YTD'
      }];
    }
    return {
      today: today,
      current: current,
      available: available,
      rangeKind: rangeKind,
      group: group,
      page: page,
      from: from,
      to: to,
      chosen: chosen,
      span: span,
      slices: slices
    };
  }

  function defaultState(data) {
    var today = isISO(data && data.asOf) ? data.asOf : '2026-11-24';
    var current = fiscalYearOf(today);
    var currentQuarter = quarterBounds(quarterIndex(today));
    return {
      page: 'overview',
      rangeKind: 'fy',
      group: 'month',
      from: '',
      to: '',
      year: current,
      years: [current],
      quarter: currentQuarter.q,
      month: today.slice(0, 7),
      period: 'month',
      eventType: '',
      eventTypes: [],
      companies: [],
      people: [],
      audience: '',
      bucket: ''
    };
  }

  function yearsOf(data) {
    var set = {};
    function add(value) {
      if (isISO(value)) set[fiscalYearOf(value)] = true;
    }
    (data.events || []).forEach(function (row) { add(row.date); });
    (data.changes || []).forEach(function (row) { add(row.date); });
    (data.openings || []).forEach(function (row) { add(row.date); });
    add(data.asOf);
    var max = fiscalYearOf(data.asOf || '2026-11-24');
    var years = Object.keys(set).map(Number).filter(function (year) {
      return year >= 2000 && year <= max;
    }).sort(function (a, b) { return a - b; });
    if (!years.length) years.push(max);
    return years;
  }

  function resolveView(data, state) {
    var picked = selectionOf(data, state);
    var year = picked.chosen[picked.chosen.length - 1];
    var period = picked.rangeKind === 'last12' ? 'last12' : picked.group;
    var choices = picked.available.map(function (item) {
      return { id: String(item), label: 'FY' + item, shortLabel: 'FY' + item, year: item };
    });
    var eventTypes = [];
    if (state && typeof state.eventTypes !== 'string' && state.eventTypes && state.eventTypes.length) {
      state.eventTypes.forEach(function (type) {
        if (TYPES.indexOf(type) !== -1 && eventTypes.indexOf(type) === -1) eventTypes.push(type);
      });
    } else if (state && TYPES.indexOf(state.eventType) !== -1) {
      eventTypes = [state.eventType];
    }
    var companies = listOf(state && state.companies);
    var people = listOf(state && state.people);
    var audience = state && (state.audience === 'Member' || state.audience === 'Guest') ? state.audience : '';
    return {
      today: picked.today,
      year: year,
      years: picked.available,
      chosenYears: picked.slices.map(function (slice) { return slice.year; }),
      quarter: quarterBounds(quarterIndex(picked.today)).q,
      month: picked.today.slice(0, 7),
      period: period,
      range: picked.span,
      grouping: picked.group,
      rangeKind: picked.rangeKind,
      group: picked.group,
      page: picked.page,
      from: picked.from,
      to: picked.to,
      slices: picked.slices,
      yearEnabled: picked.rangeKind !== 'last12',
      stepper: {
        id: String(year),
        label: 'Fiscal year',
        value: 'FY' + year,
        options: choices
      },
      eventType: eventTypes.length === 1 ? eventTypes[0] : '',
      eventTypes: eventTypes,
      companies: companies,
      people: people,
      audience: audience,
      bucket: state && state.bucket ? String(state.bucket) : ''
    };
  }

  function listOf(value) {
    var out = [];
    if (!value || typeof value === 'string') {
      if (value) out.push(String(value));
      return out;
    }
    value.forEach(function (item) {
      var text = String(item || '').trim();
      if (text && out.indexOf(text) === -1) out.push(text);
    });
    return out;
  }

  function copyState(state) {
    return {
      page: state.page || 'overview',
      rangeKind: state.rangeKind || '',
      group: state.group || '',
      from: state.from || '',
      to: state.to || '',
      year: state.year,
      years: listOf(state.years).map(Number),
      quarter: state.quarter,
      month: state.month || '',
      period: state.period,
      eventType: state.eventType || '',
      eventTypes: listOf(state.eventTypes),
      companies: listOf(state.companies),
      people: listOf(state.people),
      audience: state.audience || '',
      bucket: state.bucket || ''
    };
  }

  function syncPeriodSlice(data, state) {
    if (state.period !== 'quarter' && state.period !== 'month') return;
    var today = isISO(data && data.asOf) ? data.asOf : '2026-11-24';
    if (state.period === 'quarter') state.quarter = quarterForYear(state.year, today);
    if (state.period === 'month') state.month = monthForYear(state.year, today);
  }

  function applyAction(data, state, action) {
    var next = copyState(state || defaultState(data));
    action = action || {};
    if (action.type === 'reset' || action.type === 'clearFilters') {
      var cleared = copyState(next);
      cleared.eventTypes = [];
      cleared.eventType = '';
      cleared.companies = [];
      cleared.people = [];
      cleared.audience = '';
      cleared.bucket = '';
      if (action.type === 'reset') return defaultState(data);
      return cleared;
    }
    if (action.type === 'page') {
      next.page = action.page === 'membership' || action.page === 'events' ? action.page : 'overview';
      return next;
    }
    if (action.type === 'range') {
      var kind = action.rangeKind;
      if (kind !== 'fy' && kind !== 'last12' && kind !== 'last3' && kind !== 'custom') kind = 'fy';
      next.rangeKind = kind;
      next.bucket = '';
      if (kind === 'custom' && !listOf(next.years).length) next.years = [fiscalYearOf(isISO(data && data.asOf) ? data.asOf : '2026-11-24')];
      return next;
    }
    if (action.type === 'group') {
      if (action.group === 'month' || action.group === 'quarter' || action.group === 'year') next.group = action.group;
      next.bucket = '';
      return next;
    }
    if (action.type === 'dates') {
      next.rangeKind = 'custom';
      next.from = isISO(action.from) ? action.from : '';
      next.to = isISO(action.to) ? action.to : '';
      next.bucket = '';
      return next;
    }
    if (action.type === 'period') {
      next.period = action.period;
      next.bucket = '';
      syncPeriodSlice(data, next);
      return next;
    }
    if (action.type === 'year') {
      if (next.period === 'last12') return next;
      next.years = [Number(action.year)];
      next.year = Number(action.year);
      next.bucket = '';
      syncPeriodSlice(data, next);
      return next;
    }
    if (action.type === 'years') {
      next.rangeKind = 'custom';
      var incoming = listOf(action.years).map(Number).filter(function (year) { return year > 0; });
      if (!incoming.length && (isISO(next.from) || isISO(next.to))) next.years = [];
      else next.years = normalizeYears(data, incoming.length ? incoming : action.years);
      next.year = next.years.length ? next.years[next.years.length - 1] : fiscalYearOf(isISO(data && data.asOf) ? data.asOf : '2026-11-24');
      next.bucket = '';
      return next;
    }
    if (action.type === 'focus') {
      if (next.period === 'last12') return next;
      next.bucket = '';
      if (action.year) next.year = Number(action.year);
      syncPeriodSlice(data, next);
      return next;
    }
    if (action.type === 'eventType') {
      if (!action.eventType) {
        next.eventTypes = [];
        next.eventType = '';
      } else {
        var types = listOf(next.eventTypes);
        if (!types.length && next.eventType) types = [next.eventType];
        var at = types.indexOf(action.eventType);
        if (at === -1) types.push(action.eventType);
        else types.splice(at, 1);
        next.eventTypes = types;
        next.eventType = '';
      }
      next.bucket = '';
      return next;
    }
    if (action.type === 'companies') {
      next.companies = listOf(action.companies);
      if (next.companies.length && action.allowedPeople) {
        var allowed = {};
        listOf(action.allowedPeople).forEach(function (name) { allowed[name] = true; });
        next.people = listOf(next.people).filter(function (name) { return allowed[name]; });
      }
      next.bucket = '';
      return next;
    }
    if (action.type === 'people') {
      next.people = listOf(action.people);
      next.bucket = '';
      return next;
    }
    if (action.type === 'audience') {
      next.audience = next.audience === action.audience ? '' : (action.audience || '');
      return next;
    }
    if (action.type === 'bucket') {
      next.bucket = next.bucket === action.bucket ? '' : (action.bucket || '');
      return next;
    }
    return next;
  }

  function stateHash(state) {
    var parts = [
      'page=' + (state.page || 'overview'),
      'range=' + (state.rangeKind || 'fy'),
      'group=' + (state.group || 'month')
    ];
    if ((state.rangeKind || 'fy') === 'custom') {
      var fys = listOf(state.years).map(Number).filter(function (year) { return year > 0; });
      if (fys.length) parts.push('fys=' + fys.join(','));
      if (state.from) parts.push('from=' + state.from);
      if (state.to) parts.push('to=' + state.to);
    }
    var hashTypes = listOf(state.eventTypes);
    if (!hashTypes.length && state.eventType) hashTypes = [state.eventType];
    if (hashTypes.length) parts.push('type=' + hashTypes.map(encodeURIComponent).join(','));
    if (state.audience) parts.push('audience=' + encodeURIComponent(state.audience));
    if (listOf(state.companies).length) parts.push('companies=' + listOf(state.companies).map(encodeURIComponent).join(','));
    if (listOf(state.people).length) parts.push('people=' + listOf(state.people).map(encodeURIComponent).join(','));
    if (state.bucket) parts.push('bucket=' + encodeURIComponent(state.bucket));
    return parts.join('&');
  }

  function stateFromHash(hash, data) {
    var state = defaultState(data);
    var query = String(hash || '').replace(/^#/, '');
    if (!query) return state;
    var bag = {};
    query.split('&').forEach(function (pair) {
      var bits = pair.split('=');
      var key = bits[0] || '';
      try { key = decodeURIComponent(key); } catch (err) {}
      var value = bits.slice(1).join('=');
      try { value = decodeURIComponent(value); } catch (err) {}
      bag[key] = value;
    });
    if (bag.page === 'membership' || bag.page === 'events' || bag.page === 'overview') state.page = bag.page;
    if (bag.range === 'fy' || bag.range === 'last12' || bag.range === 'last3' || bag.range === 'custom') state.rangeKind = bag.range;
    if (bag.group === 'month' || bag.group === 'quarter' || bag.group === 'year') state.group = bag.group;
    if (isISO(bag.from)) state.from = bag.from;
    if (isISO(bag.to)) state.to = bag.to;
    if (bag.fys) {
      state.years = String(bag.fys).split(',').map(Number).filter(function (year) { return /^\d{4}$/.test(String(year)); });
      if (!bag.range) state.rangeKind = 'custom';
    } else if (bag.year && /^\d{4}$/.test(bag.year)) {
      state.year = Number(bag.year);
      state.years = [Number(bag.year)];
      if (!bag.range) state.rangeKind = 'custom';
    }
    if (/^[1-4]$/.test(bag.quarter)) state.quarter = Number(bag.quarter);
    if (/^\d{4}-\d{2}$/.test(bag.month)) state.month = bag.month;
    if (bag.period === 'year' || bag.period === 'quarter' || bag.period === 'month' || bag.period === 'last12') {
      state.period = bag.period;
      if (!bag.range && bag.period === 'last12') state.rangeKind = 'last12';
      if (!bag.group && bag.period === 'year') state.group = 'year';
      if (!bag.group && bag.period === 'quarter') state.group = 'quarter';
      if (!bag.group && bag.period === 'month') state.group = 'month';
    }
    if (bag.type) {
      var parsedTypes = String(bag.type).split(',').map(function (part) {
        try { return decodeURIComponent(part); } catch (err) { return part; }
      }).filter(function (type) { return TYPES.indexOf(type) !== -1; });
      state.eventTypes = parsedTypes;
      state.eventType = parsedTypes.length === 1 ? parsedTypes[0] : '';
    }
    if (bag.companies) state.companies = String(bag.companies).split(',').map(function (part) {
      try { return decodeURIComponent(part); } catch (err) { return part; }
    }).filter(Boolean);
    if (bag.people) state.people = String(bag.people).split(',').map(function (part) {
      try { return decodeURIComponent(part); } catch (err) { return part; }
    }).filter(Boolean);
    if (bag.audience === 'Member' || bag.audience === 'Guest') state.audience = bag.audience;
    if (bag.bucket && /^\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(bag.bucket)) state.bucket = bag.bucket;
    return state;
  }

  function comparisons(range, measure) {
    var lm = shiftRange(range.start, range.end, 1);
    var lq = shiftRange(range.start, range.end, 3);
    var ly = priorYearRange(range.start, range.end);
    return metric(measure(range.start, range.end), measure(lm.start, lm.end), measure(lq.start, lq.end), measure(ly.start, ly.end));
  }

  function dayBefore(value) {
    return addDays(value, -1);
  }

  function stockBoundaries(end) {
    var p = parseISO(end);
    var quarter = quarterBounds(quarterIndex(end));
    var year = fiscalBounds(fiscalYearOf(end));
    return {
      month: dayBefore(iso(p.y, p.m, 1)),
      quarter: dayBefore(quarter.start),
      fy: dayBefore(year.start)
    };
  }

  function priorMonthWindow(end) {
    var p = parseISO(end);
    var start = addMonths(iso(p.y, p.m, 1), -1);
    var sp = parseISO(start);
    return { start: start, end: iso(sp.y, sp.m, Math.min(p.d, daysInMonth(sp.y, sp.m))) };
  }

  function priorQuarterWindow(end) {
    var current = quarterBounds(quarterIndex(end));
    var prev = quarterBounds(quarterIndex(end) - 1);
    var elapsed = inclusiveDays(current.start, end) - 1;
    var stop = addDays(prev.start, elapsed);
    if (stop > prev.end) stop = prev.end;
    return { start: prev.start, end: stop };
  }

  function memberStockComparisons(range, stock) {
    var bounds = stockBoundaries(range.end);
    var result = metric(
      stock(range.start, range.end),
      stock(bounds.month, bounds.month),
      stock(bounds.quarter, bounds.quarter),
      stock(bounds.fy, bounds.fy)
    );
    result.labels = ['Month start', 'Quarter start', 'FY start'];
    return result;
  }

  function memberFlowComparisons(range, flow) {
    var lm = priorMonthWindow(range.end);
    var lq = priorQuarterWindow(range.end);
    var ly = priorYearRange(range.start, range.end);
    var result = metric(
      flow(range.start, range.end),
      flow(lm.start, lm.end),
      flow(lq.start, lq.end),
      flow(ly.start, ly.end)
    );
    result.labels = ['Last month', 'Last quarter', 'Last year'];
    return result;
  }

  function compute(data, state, directory) {
    data = data || {};
    var view = resolveView(data, state || defaultState(data));
    if (directory) view.directory = directory;
    var attendance = attendanceByEvent(data);
    var measure = view.range;
    var eventTypes = view.eventTypes;
    var pieAudience = view.audience;
    var identity = view.companies.length || view.people.length;
    var narrowed = identity && directory && directory.narrow;

    function countEvents(start, end) {
      if (narrowed) return directory.narrow.countEvents(start, end, eventTypes, pieAudience, view);
      return eventsIn(data, start, end, eventTypes, pieAudience, attendance).length;
    }
    function sumAttendance(start, end, audience) {
      if (narrowed) return directory.narrow.sumAttendance(start, end, eventTypes, audience == null ? pieAudience : audience, view);
      return attendanceSum(eventsIn(data, start, end, eventTypes, '', attendance), attendance, audience == null ? pieAudience : audience);
    }
    function memberStock(start, end) {
      return stockAt(data, end, 'Member', '');
    }
    function joins(start, end) {
      return flowBetween(data, start, end, 'Member', '').joins;
    }
    function net(start, end) {
      return flowBetween(data, start, end, 'Member', '').net;
    }
    function flowSpan(start, end) {
      return flowBetween(data, start, end, 'Member', '');
    }
    function foldedStatus(status) {
      return String(status || '').toLowerCase().replace(/[\s-]+/g, '_');
    }
    function statusIsNoShow(status) {
      var text = foldedStatus(status);
      return text === 'no_show' || text === 'noshow';
    }
    function statusIsSignUp(status) {
      var text = foldedStatus(status);
      if (!text || text.indexOf('cancel') === 0) return false;
      return text === 'attended' || text === 'registered' || statusIsNoShow(text);
    }
    var signupByEvent = {};
    (data.signups || []).forEach(function (row) {
      var id = String(row.eventId || '');
      if (!id) return;
      signupByEvent[id] = { signups: Number(row.signups) || 0, noShows: Number(row.noShows) || 0 };
    });
    var statusRows = directory && directory.attendance ? directory.attendance : [];
    var rowsHaveStatus = statusRows.some(function (row) { return row && row.status; });
    function signupWindow(start, end) {
      var booked = 0;
      var missed = 0;
      if (rowsHaveStatus) {
        statusRows.forEach(function (row) {
          if (!row.date || row.date < start || row.date > end) return;
          if (eventTypes.length && eventTypes.indexOf(row.eventType) === -1) return;
          if (pieAudience && row.audience && row.audience !== pieAudience) return;
          if (view.companies.length || view.people.length) {
            if (directory.narrow && directory.narrow.keeps && !directory.narrow.keeps(row, view)) return;
          }
          if (!statusIsSignUp(row.status)) return;
          booked += 1;
          if (statusIsNoShow(row.status)) missed += 1;
        });
      } else {
        eventsIn(data, start, end, eventTypes, pieAudience, attendance).forEach(function (event) {
          var row = signupByEvent[event.id];
          if (!row) return;
          booked += row.signups;
          missed += row.noShows;
        });
      }
      return {
        signups: booked,
        noShows: missed,
        pct: booked ? Math.round((missed / booked) * 100) : 0,
        limited: !rowsHaveStatus && !!(view.companies.length || view.people.length)
      };
    }
    var chosen = view.chosenYears || [view.year];
    var yearBars = (view.slices || []).map(function (slice) {
      var flow = flowSpan(slice.start, slice.end);
      var prior = priorYearRange(slice.start, slice.end);
      var priorFlow = flowSpan(prior.start, prior.end);
      return {
        year: slice.year,
        label: slice.label,
        partial: slice.partial,
        color: yearColor(slice.year, chosen),
        pattern: yearPattern(slice.year, chosen),
        start: slice.start,
        end: slice.end,
        joins: flow.joins,
        losses: flow.losses,
        net: flow.net,
        events: countEvents(slice.start, slice.end),
        attendance: sumAttendance(slice.start, slice.end),
        noShows: signupWindow(slice.start, slice.end).noShows,
        signups: signupWindow(slice.start, slice.end).signups,
        members: memberStock(slice.start, slice.end),
        newMembers: flow.joins,
        memberAtt: sumAttendance(slice.start, slice.end, 'Member'),
        guestAtt: sumAttendance(slice.start, slice.end, 'Guest'),
        samePoint: {
          start: prior.start,
          end: prior.end,
          net: priorFlow.net,
          events: countEvents(prior.start, prior.end),
          attendance: sumAttendance(prior.start, prior.end),
          members: memberStock(prior.start, prior.end)
        }
      };
    });
    var compareYears = view.group === 'year';
    var buckets = bucketsFor(view.range, view.group);
    var gainSeries = compareYears ? yearBars.map(function (bar) {
      return {
        id: bar.start + ':' + bar.end,
        label: bar.label,
        joins: bar.joins,
        losses: bar.losses,
        active: bar.members,
        priorJoins: 0,
        priorLosses: 0,
        color: bar.color,
        pattern: bar.pattern
      };
    }) : buckets.map(function (bucket) {
      var flow = flowSpan(bucket.start, bucket.end);
      var priorSpan = priorYearRange(bucket.start, bucket.end);
      var prior = flowSpan(priorSpan.start, priorSpan.end);
      return {
        id: bucket.id,
        label: bucket.label,
        joins: flow.joins,
        losses: flow.losses,
        active: memberStock(bucket.start, bucket.end),
        priorJoins: prior.joins,
        priorLosses: prior.losses
      };
    });
    var gainLegend = { current: 'This FY', prior: 'Last FY' };
    if (buckets.length) {
      var legendYear = fiscalYearOf(buckets[0].end);
      var oneYear = buckets.every(function (bucket) { return fiscalYearOf(bucket.end) === legendYear; });
      if (oneYear) gainLegend = { current: 'FY' + legendYear, prior: 'FY' + (legendYear - 1) };
    }
    var lineBuckets = buckets;
    var eventSeries = compareYears ? yearBars.map(function (bar) { return bar.events; }) : lineBuckets.map(function (bucket) {
      return countEvents(bucket.start, bucket.end);
    });
    var eventLastYear = compareYears ? [] : lineBuckets.map(function (bucket) {
      var shifted = priorYearRange(bucket.start, bucket.end);
      return countEvents(shifted.start, shifted.end);
    });
    var attendanceSeries = compareYears ? yearBars.map(function (bar) { return bar.attendance; }) : lineBuckets.map(function (bucket) {
      return sumAttendance(bucket.start, bucket.end);
    });
    var noShowSeries = compareYears ? yearBars.map(function (bar) { return bar.noShows; }) : lineBuckets.map(function (bucket) {
      return signupWindow(bucket.start, bucket.end).noShows;
    });
    var attendanceLastYear = compareYears ? [] : lineBuckets.map(function (bucket) {
      var shifted = priorYearRange(bucket.start, bucket.end);
      return sumAttendance(shifted.start, shifted.end);
    });
    if (compareYears) lineBuckets = yearBars.map(function (bar) {
      return { id: bar.start + ':' + bar.end, label: bar.label, start: bar.start, end: bar.end, color: bar.color, pattern: bar.pattern };
    });

    var groups = null;
    if (chosen.length > 1 && view.rangeKind !== 'last12' && (view.group === 'month' || view.group === 'quarter')) {
      var slots = view.group === 'quarter' ? [1, 2, 3, 4].map(function (quarter) {
        return {
          label: 'Q' + quarter,
          span: function (year) { return quarterWindow(year, quarter, view.today); }
        };
      }) : [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6].map(function (month, index) {
        var names = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return {
          label: names[index],
          span: function (year) {
            var calendarYear = month >= 7 ? year - 1 : year;
            return monthWindow(iso(calendarYear, month, 1).slice(0, 7), view.today);
          }
        };
      });
      groups = [];
      slots.forEach(function (slot) {
        var bars = chosen.map(function (year) {
          var span = slot.span(year);
          if (span) {
            var start = span.start < view.range.start ? view.range.start : span.start;
            var end = span.end > view.range.end ? view.range.end : span.end;
            span = start <= end ? { start: start, end: end } : null;
          }
          var flow = span ? flowSpan(span.start, span.end) : { joins: 0, losses: 0 };
          return {
            color: yearColor(year, chosen),
            pattern: yearPattern(year, chosen),
            label: 'FY' + year,
            events: span ? countEvents(span.start, span.end) : 0,
            attendance: span ? sumAttendance(span.start, span.end, '') : 0,
            joins: flow.joins,
            losses: flow.losses,
            noShows: span ? signupWindow(span.start, span.end).noShows : 0,
            signups: span ? signupWindow(span.start, span.end).signups : 0,
            skipped: !span
          };
        });
        if (bars.some(function (bar) { return !bar.skipped; })) groups.push({ label: slot.label, bars: bars });
      });
    }

    var counted = narrowed
      ? directory.narrow.events(view.range.start, view.range.end, [], pieAudience, view)
      : eventsIn(data, view.range.start, view.range.end, '', pieAudience, attendance);
    var typeCounts = { all: counted.length };
    TYPES.forEach(function (type) { typeCounts[type] = 0; });
    counted.forEach(function (event) {
      if (typeCounts[event.type] == null) typeCounts[event.type] = 0;
      typeCounts[event.type] += 1;
    });
    var pieMembers;
    var pieGuests;
    if (narrowed) {
      var pieCounts = directory.narrow.pie(view.range.start, view.range.end, eventTypes, view);
      pieMembers = pieCounts.Member;
      pieGuests = pieCounts.Guest;
    } else {
      var pieEvents = eventsIn(data, view.range.start, view.range.end, eventTypes, '', attendance);
      pieMembers = attendanceSum(pieEvents, attendance, 'Member');
      pieGuests = attendanceSum(pieEvents, attendance, 'Guest');
    }
    var pieTotal = pieMembers + pieGuests;
    var memberPct = pieTotal ? Math.round((pieMembers / pieTotal) * 100) : 0;
    var multi = yearBars.length > 1;
    var membersMetric = memberStockComparisons(measure, memberStock);
    var freshMetric = memberFlowComparisons(measure, joins);
    var netMetric = memberFlowComparisons(measure, net);
    var eventsMetric = comparisons(measure, countEvents);
    var attendanceMetric = comparisons(measure, function (start, end) { return sumAttendance(start, end); });
    if (multi) {
      function shareParts(read) {
        var total = 0;
        yearBars.forEach(function (bar) { total += read(bar); });
        return yearBars.map(function (bar) {
          var value = read(bar);
          return { label: bar.label, value: value, pct: total ? Math.round((value / total) * 100) : 0 };
        });
      }
      var latest = yearBars[yearBars.length - 1];
      var previous = yearBars[yearBars.length - 2];
      membersMetric = {
        value: latest.members,
        tone: 'flat',
        color: INK,
        labels: [],
        parts: yearBars.map(function (bar) { return { label: bar.label, value: bar.members, pct: null }; }),
        context: previous.members ? Math.round(((latest.members - previous.members) / previous.members) * 100) + '% vs ' + previous.label : ''
      };
      freshMetric = { value: yearBars.reduce(function (sum, bar) { return sum + bar.newMembers; }, 0), tone: 'flat', color: INK, labels: [], parts: shareParts(function (bar) { return bar.newMembers; }) };
      netMetric = { value: yearBars.reduce(function (sum, bar) { return sum + bar.net; }, 0), tone: 'flat', color: INK, labels: [], parts: shareParts(function (bar) { return bar.net; }) };
      eventsMetric = { value: yearBars.reduce(function (sum, bar) { return sum + bar.events; }, 0), tone: 'flat', color: INK, labels: [], parts: shareParts(function (bar) { return bar.events; }) };
      attendanceMetric = { value: yearBars.reduce(function (sum, bar) { return sum + bar.attendance; }, 0), tone: 'flat', color: INK, labels: [], parts: shareParts(function (bar) { return bar.attendance; }) };
      pieMembers = 0;
      pieGuests = 0;
      yearBars.forEach(function (bar) {
        pieMembers += bar.memberAtt;
        pieGuests += bar.guestAtt;
      });
      pieTotal = pieMembers + pieGuests;
      memberPct = pieTotal ? Math.round((pieMembers / pieTotal) * 100) : 0;
    } else if (yearBars.length === 1) {
      var only = { start: yearBars[0].start, end: yearBars[0].end };
      eventsMetric = comparisons(only, countEvents);
      attendanceMetric = comparisons(only, function (start, end) { return sumAttendance(start, end); });
      membersMetric = memberStockComparisons(only, memberStock);
      freshMetric = memberFlowComparisons(only, joins);
      netMetric = memberFlowComparisons(only, net);
      if (yearBars[0].partial) {
        var sameLabel = ['Last month', 'Last quarter', 'Same point last year'];
        freshMetric.labels = sameLabel;
        netMetric.labels = sameLabel;
        eventsMetric.labels = sameLabel;
        attendanceMetric.labels = sameLabel;
      }
    }
    var rangeTitle = view.rangeKind === 'last12' ? 'Last 12 months' : (yearBars.length === 1
      ? (yearBars[0].partial ? 'FY' + yearBars[0].year + ' year to date' : 'FY' + yearBars[0].year)
      : 'FY' + yearBars[0].year + '\u2013FY' + yearBars[yearBars.length - 1].year);
    var groupTitle = view.group === 'year' ? 'Grouped by fiscal year' : (view.group === 'quarter' ? 'Grouped by quarter' : 'Grouped by month');
    var typeTitle = eventTypes.length ? eventTypes.join(', ') : 'All event types';
    if (view.companies.length) typeTitle += view.companies.length > 2 ? ' \u00b7 ' + view.companies.length + ' companies' : ' \u00b7 ' + view.companies.join(', ');
    if (view.people.length) typeTitle += view.people.length > 2 ? ' \u00b7 ' + view.people.length + ' attendees' : ' \u00b7 ' + view.people.join(', ');
    var contextLine = rangeTitle + ' \u00b7 ' + groupTitle + ' \u00b7 ' + typeTitle;
    var partialBar = null;
    yearBars.forEach(function (bar) { if (bar.partial) partialBar = bar; });
    var ytdNote = partialBar
      ? partialBar.label + ' runs through ' + formatDate(partialBar.end) + '. It is compared with ' + formatDate(partialBar.samePoint.start) + '\u2013' + formatDate(partialBar.samePoint.end) + ', not a full fiscal year.'
      : '';
    var periodTag = rangeTitle;
    membersMetric.tag = 'as of ' + formatDate(view.range.end);
    netMetric.tag = periodTag;
    eventsMetric.tag = periodTag;
    attendanceMetric.tag = periodTag;
    var noshowRoll = signupWindow(view.range.start, view.range.end);
    var noshowParts = yearBars.length > 1 ? yearBars.map(function (bar) {
      var pct = bar.signups ? Math.round((bar.noShows / bar.signups) * 100) : 0;
      return { label: bar.label, value: bar.noShows + ' of ' + bar.signups, pct: pct };
    }) : null;
    var noShowsMetric = {
      noShows: noshowRoll.noShows,
      signups: noshowRoll.signups,
      pct: noshowRoll.pct,
      limited: noshowRoll.limited,
      tag: periodTag,
      parts: noshowParts,
      ready: noshowRoll.signups > 0 || rowsHaveStatus || !!(data.signups && data.signups.length)
    };

    return {
      example: data.example === true,
      asOf: view.today,
      year: view.year,
      years: view.years,
      quarter: view.quarter,
      month: view.month,
      stepper: view.stepper,
      period: view.period,
      yearEnabled: view.yearEnabled,
      range: view.range,
      grouping: view.grouping,
      monthBuckets: lineBuckets,
      eventType: view.eventType,
      eventTypes: eventTypes,
      companies: view.companies,
      people: view.people,
      audience: pieAudience,
      bucket: '',
      buckets: buckets,
      eventCounts: typeCounts,
      chosenYears: chosen,
      yearBars: yearBars,
      groups: groups,
      page: view.page,
      rangeKind: view.rangeKind,
      group: view.group,
      from: view.from,
      to: view.to,
      slices: view.slices,
      contextLine: contextLine,
      ytdNote: ytdNote,
      filtersActive: !!(eventTypes.length || view.companies.length || view.people.length || pieAudience),
      members: membersMetric,
      newMembers: freshMetric,
      net: netMetric,
      gains: gainSeries,
      gainLegend: gainLegend,
      businessTypes: data.businessTypes || [],
      events: eventsMetric,
      eventSeries: eventSeries,
      eventLastYear: eventLastYear,
      attendance: attendanceMetric,
      attendanceSeries: attendanceSeries,
      attendanceLastYear: attendanceLastYear,
      noShows: noShowsMetric,
      noShowSeries: noShowSeries,
      renewalRisk: data.renewalRisk || null,
      pie: {
        members: pieMembers,
        guests: pieGuests,
        memberPct: memberPct,
        guestPct: pieTotal ? 100 - memberPct : 0
      }
    };
  }

  root.ABADashboard = {
    TYPES: TYPES,
    POP: POP,
    CLAY: CLAY,
    DEFS: DEFS,
    FLAGS: FLAGS,
    isISO: isISO,
    inclusiveDays: inclusiveDays,
    shiftRange: shiftRange,
    fiscalYearOf: fiscalYearOf,
    fiscalBounds: fiscalBounds,
    priorYearRange: priorYearRange,
    periodRange: periodRange,
    formatDate: formatDate,
    defaultState: defaultState,
    resolveView: resolveView,
    applyAction: applyAction,
    stateHash: stateHash,
    stateFromHash: stateFromHash,
    compute: compute,
    stockAt: stockAt
  };
})(typeof window !== 'undefined' ? window : globalThis);
