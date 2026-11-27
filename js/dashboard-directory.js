/* Fake example people for the placeholder dashboard. Real names, emails, and
   phone numbers are never stored here. Emails and phones are added only when
   an attendance drill-down is opened. */
(function (root) {
  'use strict';

  var COMPANIES = [
    'Ada River Cafe',
    'Brookside Bakery',
    'Cedar & Co.',
    'Driftwood Dental',
    'Elm Street Books',
    'Fulton Fitness',
    'Garden Gate Nursery',
    'Harbor Light Inn',
    'Iris Studio',
    'Juniper Goods'
  ];
  var GUEST_COMPANY = 'Visitor Co.';
  var FIRST = ['Avery', 'Blake', 'Casey', 'Drew', 'Ellis', 'Finley', 'Gray', 'Harper', 'Indigo', 'Jules', 'Kai', 'Logan', 'Morgan', 'Noah', 'Oakley', 'Parker', 'Quinn', 'Riley', 'Sage', 'Taylor'];
  var LAST = ['Sample', 'Placeholder', 'Example', 'Demo', 'Fictitious', 'Mock', 'Testcase', 'Notreal', 'Standin', 'Imaginary', 'Specimen', 'Prototype'];

  function personName(index) {
    var size = FIRST.length * LAST.length;
    var cycle = Math.floor(index / size);
    var first = FIRST[index % FIRST.length];
    var last = LAST[Math.floor(index / FIRST.length) % LAST.length];
    return cycle ? first + ' ' + last + ' ' + (cycle + 1) : first + ' ' + last;
  }

  function phoneOf(index) {
    var n = 1000 + (index % 8000);
    return '555-' + n;
  }

  function emailOf(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') + '@example.com';
  }

  function typeOk(value, types) {
    if (!types || !types.length) return true;
    var i;
    for (i = 0; i < types.length; i++) if (types[i] === value) return true;
    return false;
  }

  function tidyLabel(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function foldLabel(value) {
    return tidyLabel(value).toLowerCase();
  }

  function labelRank(label) {
    var letters = String(label || '').replace(/[^A-Za-z]/g, '');
    if (!letters) return 0;
    var upper = (letters.match(/[A-Z]/g) || []).length;
    if (upper && upper < letters.length) return 2;
    if (upper === 0) return 1;
    return 0;
  }

  function chooseLabel(counts) {
    var best = '';
    var bestCount = -1;
    var bestRank = -1;
    Object.keys(counts).forEach(function (label) {
      var count = counts[label];
      var rank = labelRank(label);
      var better = count > bestCount ||
        (count === bestCount && rank > bestRank) ||
        (count === bestCount && rank === bestRank && label.length > best.length) ||
        (count === bestCount && rank === bestRank && label.length === best.length && (best === '' || label < best));
      if (better) {
        best = label;
        bestCount = count;
        bestRank = rank;
      }
    });
    return best;
  }

  function tally(counts, value) {
    var label = tidyLabel(value);
    if (!label) return;
    counts[label] = (counts[label] || 0) + 1;
  }

  function consolidateLabels(labels) {
    var groups = {};
    (labels || []).forEach(function (label) {
      var tidy = tidyLabel(label);
      var key = foldLabel(tidy);
      if (!key) return;
      if (!groups[key]) groups[key] = {};
      groups[key][tidy] = (groups[key][tidy] || 0) + 1;
    });
    var names = Object.keys(groups).map(function (key) { return chooseLabel(groups[key]); });
    names.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
    return names;
  }

  function labelSelected(selected, value) {
    var key = foldLabel(value);
    var i;
    for (i = 0; i < selected.length; i++) {
      if (selected[i] === value || foldLabel(selected[i]) === key) return true;
    }
    return false;
  }

  function personRecord(rows) {
    var names = {};
    var companies = {};
    var audiences = {};
    var keys = {};
    var emails = {};
    rows.forEach(function (row) {
      tally(names, row.name);
      tally(companies, row.company);
      tally(audiences, row.audience);
      var nameKey = foldLabel(row.name);
      if (nameKey) keys[nameKey] = true;
      var email = foldLabel(row.email);
      if (email) emails[email] = true;
    });
    var companyNames = consolidateLabels(Object.keys(companies).reduce(function (list, label) {
      var n;
      for (n = 0; n < companies[label]; n++) list.push(label);
      return list;
    }, []));
    return {
      name: chooseLabel(names),
      company: companyNames[0] || '',
      companies: companyNames,
      audience: chooseLabel(audiences),
      keys: Object.keys(keys),
      emails: Object.keys(emails)
    };
  }

  function consolidatePeople(rows) {
    var parent = [];
    function find(index) {
      while (parent[index] !== index) {
        parent[index] = parent[parent[index]];
        index = parent[index];
      }
      return index;
    }
    function unite(left, right) {
      var a = find(left);
      var b = find(right);
      if (a !== b) parent[b] = a;
    }
    rows.forEach(function (row, index) { parent[index] = index; });
    var byName = {};
    var byEmail = {};
    rows.forEach(function (row, index) {
      var name = foldLabel(row.name);
      if (name) {
        if (byName[name] != null) unite(index, byName[name]);
        else byName[name] = index;
      }
      var email = foldLabel(row.email);
      if (email) {
        if (byEmail[email] != null) unite(index, byEmail[email]);
        else byEmail[email] = index;
      }
    });
    var groups = {};
    rows.forEach(function (row, index) {
      var root = find(index);
      if (!groups[root]) groups[root] = [];
      groups[root].push(row);
    });
    var people = Object.keys(groups).map(function (key) { return personRecord(groups[key]); });
    people.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
    return people;
  }

  function selectedPerson(selected, entry) {
    if (selected.indexOf(entry.name) !== -1) return true;
    var i;
    for (i = 0; i < selected.length; i++) {
      if (foldLabel(selected[i]) === foldLabel(entry.name)) return true;
      if ((entry.keys || []).indexOf(foldLabel(selected[i])) !== -1) return true;
    }
    return false;
  }

  function personSelected(selected, row, view) {
    var people = (view.directory && view.directory.people) || [];
    var name = foldLabel(row.name);
    var email = foldLabel(row.email);
    var i;
    for (i = 0; i < people.length; i++) {
      if (!selectedPerson(selected, people[i])) continue;
      if (name && (people[i].keys || [foldLabel(people[i].name)]).indexOf(name) !== -1) return true;
      if (email && (people[i].emails || []).indexOf(email) !== -1) return true;
    }
    for (i = 0; i < selected.length; i++) {
      if (foldLabel(selected[i]) === name) return true;
    }
    return false;
  }

  function identityOk(row, view) {
    var companies = view.companies || [];
    var people = view.people || [];
    if (companies.length && !labelSelected(companies, row.company)) return false;
    if (people.length && !personSelected(people, row, view)) return false;
    return true;
  }

  function exampleBusinesses(types) {
    var list = [];
    var seq = 0;
    (types || []).forEach(function (type) {
      var label = type.label || type.category || '';
      var count = type.count || 0;
      var other = label === 'Other / not listed';
      var i;
      for (i = 0; i < count; i++) {
        seq += 1;
        var month = 7 + (seq % 5);
        var joined = seq % 5 === 0 ? ('2026-' + (month < 10 ? '0' : '') + month + '-10') : '2025-08-15';
        list.push({
          company: other ? ('Example Business ' + seq) : (label + ' Example ' + (i + 1)),
          categories: other ? [] : [label],
          joined: joined,
          lost: ''
        });
      }
    });
    return list;
  }

  function build(source) {
    var people = [];
    var seq = 0;
    var companyCursor = 0;
    function memberCompany() {
      var name = COMPANIES[companyCursor % COMPANIES.length];
      companyCursor += 1;
      return name;
    }
    function addPerson(audience, eventType, joined) {
      var company = audience === 'Member' ? memberCompany() : (seq % 3 === 0 ? GUEST_COMPANY : memberCompany());
      var person = {
        name: personName(seq),
        company: company,
        audience: audience,
        eventType: eventType,
        joined: joined,
        lost: ''
      };
      seq += 1;
      people.push(person);
      return person;
    }
    (source.openings || []).forEach(function (row) {
      var i;
      for (i = 0; i < row.count; i++) addPerson(row.audience, row.eventType, row.date);
    });
    var changes = (source.changes || []).slice().sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });
    changes.forEach(function (row) {
      var i;
      for (i = 0; i < row.joins; i++) addPerson(row.audience, row.eventType, row.date);
      for (i = 0; i < row.losses; i++) {
        var victim = null;
        people.forEach(function (person) {
          if (victim) return;
          if (person.audience !== row.audience || person.eventType !== row.eventType) return;
          if (person.lost || person.joined > row.date) return;
          victim = person;
        });
        if (victim) victim.lost = row.date;
      }
    });

    var members = people.filter(function (person) { return person.audience === 'Member'; });
    var guests = [];
    var g;
    for (g = 0; g < 24; g++) {
      guests.push({
        name: personName(seq),
        company: g % 4 === 0 ? GUEST_COMPANY : COMPANIES[g % COMPANIES.length],
        audience: 'Guest'
      });
      seq += 1;
    }
    var attendance = [];
    var memberCursor = 0;
    var guestCursor = 0;
    var visit = 0;
    (source.events || []).forEach(function (event) {
      var memberCount = 0;
      var guestCount = 0;
      (source.attendance || []).forEach(function (row) {
        if (row.eventId !== event.id) return;
        if (row.audience === 'Member') memberCount += row.count;
        if (row.audience === 'Guest') guestCount += row.count;
      });
      var i;
      for (i = 0; i < memberCount; i++) {
        var member = members[memberCursor % members.length];
        memberCursor += 1;
        visit += 1;
        attendance.push({
          name: member.name,
          company: member.company,
          audience: 'Member',
          event: event.type,
          eventType: event.type,
          eventId: event.id,
          date: event.date,
          status: 'attended'
        });
      }
      for (i = 0; i < guestCount; i++) {
        var guest = guests[guestCursor % guests.length];
        guestCursor += 1;
        visit += 1;
        attendance.push({
          name: guest.name,
          company: guest.company,
          audience: 'Guest',
          event: event.type,
          eventType: event.type,
          eventId: event.id,
          date: event.date,
          status: 'attended'
        });
      }
      var missed = 0;
      (source.signups || []).forEach(function (row) {
        if (row.eventId === event.id) missed = row.noShows || 0;
      });
      var n;
      for (n = 0; n < missed; n++) {
        var missedGuest = guests[(guestCursor + n) % guests.length];
        attendance.push({
          name: missedGuest.name,
          company: missedGuest.company,
          audience: 'Guest',
          event: event.type,
          eventType: event.type,
          eventId: event.id,
          date: event.date,
          status: 'no_show'
        });
      }
    });

    var directoryPeople = [];
    var seen = {};
    function remember(person) {
      if (!person || !person.name || seen[person.name]) return;
      seen[person.name] = true;
      directoryPeople.push({ name: person.name, company: person.company || '', audience: person.audience || '' });
    }
    people.forEach(remember);
    guests.forEach(remember);
    directoryPeople.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });

    return {
      companies: COMPANIES.slice(),
      guestCompany: GUEST_COMPANY,
      people: directoryPeople,
      membership: people,
      attendance: attendance,
      businesses: exampleBusinesses(source.businessTypes),
      narrow: narrow
    };
  }

  function peopleForCompanies(directory, companies) {
    var selected = companies || [];
    return (directory.people || []).filter(function (person) {
      if (!selected.length) return true;
      var names = person.companies && person.companies.length ? person.companies : [person.company];
      var i;
      for (i = 0; i < names.length; i++) {
        if (labelSelected(selected, names[i])) return true;
      }
      return false;
    });
  }

  var ALLOWED = { 'Lunch & Learn': true, 'Ribbon Cutting': true, 'Happy Hour': true };

  function countedVisit(row) {
    if (row.eventType && !ALLOWED[row.eventType]) return false;
    if (row.status && String(row.status).toLowerCase() !== 'attended') return false;
    return true;
  }

  function outcomeOf(row) {
    return String((row && row.status) || '').toLowerCase().replace(/[\s-]+/g, '_');
  }

  function registrationOf(row) {
    return String((row && (row.registration_status || row.registrationStatus)) || '').toLowerCase().replace(/[\s-]+/g, '_');
  }

  function isNoShowText(text) {
    return text === 'no_show' || text === 'noshow';
  }

  function rowIsNoShow(row) {
    var status = outcomeOf(row);
    if (isNoShowText(status)) return true;
    if (!status) return isNoShowText(registrationOf(row));
    return false;
  }

  function rowIsSignUp(row) {
    var status = outcomeOf(row) || registrationOf(row);
    if (!status || status.indexOf('cancel') === 0) return false;
    return status === 'attended' || status === 'registered' || isNoShowText(status);
  }

  function outcomesPresent(directory) {
    return (directory.attendance || []).some(function (row) {
      return outcomeOf(row) || registrationOf(row);
    });
  }

  function isoDate(value) {
    var text = String(value || '');
    return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : '';
  }

  function fiscalYear(iso) {
    if (!iso) return 0;
    var year = Number(iso.slice(0, 4));
    var month = Number(iso.slice(5, 7));
    if (!year || !month) return 0;
    return month >= 7 ? year + 1 : year;
  }

  function shiftYear(iso, delta) {
    var year = Number(iso.slice(0, 4)) + delta;
    var month = Number(iso.slice(5, 7));
    var day = Number(iso.slice(8, 10));
    var dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day > dim) day = dim;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return year + '-' + pad(month) + '-' + pad(day);
  }

  function focusWindow(view) {
    var bucket = view && view.bucket ? String(view.bucket) : '';
    var bits = bucket.split(':');
    if (bits.length === 2 && /^\d{4}-\d{2}-\d{2}$/.test(bits[0]) && /^\d{4}-\d{2}-\d{2}$/.test(bits[1]) && bits[0] <= bits[1]) {
      return { start: bits[0], end: bits[1], chosen: true };
    }
    var range = view && (view.focus || view.range) || {};
    return { start: range.start || '', end: range.end || '9999-12-31', chosen: false };
  }

  function bandFor(count) {
    if (count <= 0) return '0';
    if (count <= 2) return '1–2';
    if (count <= 5) return '3–5';
    return '6+';
  }

  function tenureKey(joined, cohortYear, newerStart) {
    var joinedFy = fiscalYear(joined);
    if (!joined || !joinedFy) return 'unknown';
    if (joinedFy >= cohortYear) return 'thisYear';
    if (joinedFy >= newerStart && joinedFy < cohortYear) return 'newer';
    return 'longer';
  }

  function buildCensus(directory, asOf, period, sourceRows) {
    var cohortYear = fiscalYear(asOf);
    var empty = { rows: [], asOf: asOf, cohortYear: cohortYear, labels: {} };
    if (!cohortYear || !/^\d{4}-\d{2}-\d{2}$/.test(String(asOf || ''))) return empty;
    var last12Start = shiftYear(asOf, -1);
    var renewalDate = (cohortYear - 1) + '-06-30';
    var cycleStart = (cohortYear - 2) + '-07-01';
    var newerStart = cohortYear - 4;
    var recentStart = last12Start;
    var recentEnd = asOf;
    var cycleLo = cycleStart;
    var cycleHi = renewalDate;
    if (period && period.chosen) {
      if (period.start > recentStart) recentStart = period.start;
      if (period.end < recentEnd) recentEnd = period.end;
      if (period.start > cycleLo) cycleLo = period.start;
      if (period.end < cycleHi) cycleHi = period.end;
    }
    var stockDate = period && period.chosen ? period.end : asOf;
    var recent = {};
    var cycle = {};
    function addHit(bucket, key) {
      if (!key) return;
      bucket[key] = (bucket[key] || 0) + 1;
    }
    (directory.attendance || []).forEach(function (row) {
      if (!row.eventType || !ALLOWED[row.eventType]) return;
      var status = outcomeOf(row);
      if (status && status !== 'attended') return;
      var date = isoDate(row.date);
      if (!date) return;
      var email = foldLabel(row.email);
      var company = foldLabel(row.company);
      if (date > recentStart && date <= recentEnd) {
        if (email) addHit(recent, 'e:' + email);
        if (company) addHit(recent, 'c:' + company);
      }
      if (cycleLo <= cycleHi && date >= cycleLo && date <= cycleHi) {
        if (email) addHit(cycle, 'e:' + email);
        if (company) addHit(cycle, 'c:' + company);
      }
    });
    function visitsFor(email, company, bucket) {
      if (email) return bucket['e:' + email] || 0;
      return company ? (bucket['c:' + company] || 0) : 0;
    }
    var rows = [];
    (sourceRows || directory.membership || []).forEach(function (row) {
      if (row.audience && row.audience !== 'Member') return;
      var company = tidyLabel(row.company || '');
      if (!company) return;
      var joined = isoDate(row.joined);
      var lost = isoDate(row.lost);
      var status = String(row.statusText || row.status || '').toLowerCase();
      var email = foldLabel(row.email);
      var companyKey = foldLabel(company);
      var recentVisits = visitsFor(email, companyKey, recent);
      var cycleVisits = visitsFor(email, companyKey, cycle);
      var current = (!lost || lost > stockDate) && status !== 'deactivated' && (!joined || joined <= stockDate);
      var inCycle = (!joined || joined < cycleStart) && (!lost || lost >= cycleStart);
      rows.push({
        row: row,
        company: company,
        email: email,
        joined: joined,
        lost: lost,
        recentVisits: recentVisits,
        cycleVisits: cycleVisits,
        current: current,
        inCycle: inCycle,
        lapsed: lost === renewalDate,
        tenure: tenureKey(joined, cohortYear, newerStart),
        band: bandFor(cycleVisits),
        zero: current && !recentVisits
      });
    });
    return {
      rows: rows,
      asOf: asOf,
      cohortYear: cohortYear,
      labels: {
        newer: 'Joined ' + (newerStart - 1) + '–' + (cohortYear - 2),
        longer: 'Joined ' + (newerStart - 2) + ' or earlier',
        thisYear: 'Joined this fiscal year'
      }
    };
  }

  function census(directory, view) {
    var asOf = (view && (view.asOf || view.today)) || '2026-11-24';
    var period = focusWindow(view);
    var businessKey = ((view && view.selectedBusinessTypes) || []).join(',');
    var key = asOf + '|' + (period.chosen ? period.start + ':' + period.end : '') + '|' + businessKey;
    if (view && view._censusKey === key && view._census) return view._census;
    var sourceRows = memberUniverse(directory, view).filter(function (row) {
      if (row.audience && row.audience !== 'Member') return false;
      return matchesBusinessType(row, (view && view.selectedBusinessTypes) || []);
    });
    var built = buildCensus(directory || { membership: [], attendance: [] }, asOf, period, sourceRows);
    if (view) {
      view._census = built;
      view._censusKey = key;
    }
    return built;
  }

  function tenureMatch(profile, tenure) {
    if (!tenure) return true;
    if (tenure === 'other') return profile.tenure === 'unknown' || profile.tenure === 'thisYear';
    return profile.tenure === tenure;
  }

  function inRenewalSlice(profile, view) {
    var tenure = view && view.renewalTenure || '';
    var band = view && view.renewalBand || '';
    if (!tenure && !band) return true;
    if (tenure && !tenureMatch(profile, tenure)) return false;
    if (tenure && !band && !profile.zero) return false;
    if (band && (profile.band !== band || !profile.inCycle)) return false;
    return true;
  }

  function baseProfile(profile, view) {
    if (!matchesBusinessType(profile.row, (view && view.selectedBusinessTypes) || [])) return false;
    var flow = view && view.flow || '';
    if (!flow) return true;
    var focus = focusWindow(view);
    if (flow === 'new') return !!(profile.joined && profile.joined >= focus.start && profile.joined <= focus.end);
    if (flow === 'lost') return !!(profile.lost && profile.lost >= focus.start && profile.lost <= focus.end);
    return true;
  }

  function companySet(directory, view) {
    var business = (view && view.selectedBusinessTypes) || [];
    var flow = view && view.flow || '';
    var renewal = view && (view.renewalTenure || view.renewalBand);
    if (!business.length && !flow && !renewal) return null;
    var key = business.join('|') + '~' + flow + '~' + (view.renewalTenure || '') + '~' + (view.renewalBand || '') + '~' + (view.bucket || '');
    if (view && view._companyKey === key) return view._companySet;
    var set = {};
    census(directory, view).rows.forEach(function (profile) {
      if (!baseProfile(profile, view)) return;
      if (renewal && !inRenewalSlice(profile, view)) return;
      if (!flow && !renewal && !profile.current) return;
      if (profile.company) set[foldLabel(profile.company)] = true;
    });
    if (view) {
      view._companyKey = key;
      view._companySet = set;
    }
    return set;
  }

  function companyAllowed(row, directory, view) {
    var set = companySet(directory, view);
    if (!set) return true;
    return !!set[foldLabel(row && row.company)];
  }

  function attendanceRows(directory, start, end, eventTypes, audience, view) {
    var wantNoShow = audience === 'No-show';
    return (directory.attendance || []).filter(function (row) {
      if (row.date < start || row.date > end) return false;
      if (!typeOk(row.eventType, eventTypes)) return false;
      if (wantNoShow) {
        if (!rowIsNoShow(row)) return false;
      } else if (!countedVisit(row)) return false;
      if (audience && audience !== 'No-show' && row.audience !== audience) return false;
      if (view && !identityOk(row, view)) return false;
      if (view && !companyAllowed(row, directory, view)) return false;
      return true;
    });
  }

  function noShowSummary(directory, view, start, end) {
    if (!outcomesPresent(directory)) return null;
    var rows = [];
    var signups = 0;
    var audience = view && view.audience || '';
    (directory.attendance || []).forEach(function (row) {
      if (!row.date || row.date < start || row.date > end) return;
      if (view && !typeOk(row.eventType, view.eventTypes || [])) return;
      if (view && !identityOk(row, view)) return;
      if (view && !companyAllowed(row, directory, view)) return;
      if ((audience === 'Member' || audience === 'Guest') && row.audience !== audience) return;
      if (!rowIsSignUp(row)) return;
      signups += 1;
      if (rowIsNoShow(row)) rows.push(row);
    });
    var pct = signups ? Math.round((rows.length / signups) * 100) : 0;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    return { noShows: rows.length, signups: signups, rows: rows, pct: pct };
  }

  function renewalStats(directory, view) {
    var profiles = census(directory, view).rows.filter(function (profile) {
      return baseProfile(profile, view);
    });
    var current = [];
    var zero = [];
    var tenure = { newer: 0, longer: 0, unknown: 0, thisYear: 0 };
    var bands = {
      '0': { band: '0', members: 0, lapsed: 0 },
      '1–2': { band: '1–2', members: 0, lapsed: 0 },
      '3–5': { band: '3–5', members: 0, lapsed: 0 },
      '6+': { band: '6+', members: 0, lapsed: 0 }
    };
    profiles.forEach(function (profile) {
      if (profile.current) {
        current.push(profile);
        if (!profile.recentVisits) {
          zero.push(profile);
          tenure[profile.tenure] += 1;
        }
      }
      if (profile.inCycle && bands[profile.band]) {
        bands[profile.band].members += 1;
        if (profile.lapsed) bands[profile.band].lapsed += 1;
      }
    });
    var tenureName = view && view.renewalTenure || '';
    var bandName = view && view.renewalBand || '';
    var headline = zero;
    var denom = current.length;
    if (bandName && tenureName) {
      headline = profiles.filter(function (profile) {
        return profile.inCycle && profile.band === bandName && tenureMatch(profile, tenureName);
      });
      denom = profiles.filter(function (profile) {
        return profile.inCycle && tenureMatch(profile, tenureName);
      }).length;
    } else if (bandName) {
      headline = profiles.filter(function (profile) {
        return profile.inCycle && profile.band === bandName;
      });
      denom = profiles.filter(function (profile) { return profile.inCycle; }).length;
    } else if (tenureName) {
      headline = current.filter(function (profile) {
        return !profile.recentVisits && tenureMatch(profile, tenureName);
      });
      denom = current.filter(function (profile) { return tenureMatch(profile, tenureName); }).length;
    }
    if (headline.length > denom) denom = headline.length;
    var pct = denom ? Math.round((headline.length / denom) * 100) : 0;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    var info = census(directory, view);
    return {
      zeroAttendance: headline.length,
      cohort: denom,
      pct: pct,
      byTenure: tenure,
      newerLabel: info.labels.newer || '',
      longerLabel: info.labels.longer || '',
      thisYearLabel: info.labels.thisYear || '',
      lapseByBand: [bands['0'], bands['1–2'], bands['3–5'], bands['6+']],
      rows: headline
    };
  }

  function liveMembershipOk(person, view) {
    if ((view.companies || []).length && !labelSelected(view.companies, person.company)) return false;
    var selected = view.people || [];
    if (!selected.length) return true;
    var wanted = {};
    (view.directory.people || []).forEach(function (entry) {
      if (!selectedPerson(selected, entry)) return;
      var names = entry.companies && entry.companies.length ? entry.companies : [entry.company];
      names.forEach(function (company) { wanted[foldLabel(company)] = true; });
    });
    return !!wanted[foldLabel(person.company)];
  }

  var narrow = {
    keeps: identityOk,
    countEvents: function (start, end, eventTypes, audience, view) {
      var ids = {};
      attendanceRows(view.directory, start, end, eventTypes, audience, view).forEach(function (row) {
        ids[row.eventId] = true;
      });
      return Object.keys(ids).length;
    },
    sumAttendance: function (start, end, eventTypes, audience, view) {
      return attendanceRows(view.directory, start, end, eventTypes, audience, view).length;
    },
    events: function (start, end, eventTypes, audience, view) {
      var map = {};
      attendanceRows(view.directory, start, end, eventTypes, audience, view).forEach(function (row) {
        if (!map[row.eventId]) {
          map[row.eventId] = { id: row.eventId, date: row.date, type: row.eventType, name: row.event };
        }
      });
      return Object.keys(map).map(function (id) { return map[id]; });
    },
    pie: function (start, end, eventTypes, view) {
      var rows = attendanceRows(view.directory, start, end, eventTypes, '', view);
      var counts = { Member: 0, Guest: 0 };
      rows.forEach(function (row) {
        if (counts[row.audience] != null) counts[row.audience] += 1;
      });
      return counts;
    },
    stock: function (end, eventTypes, audience, view) {
      var total = 0;
      var live = view.directory && view.directory.live;
      (view.directory.membership || []).forEach(function (person) {
        if (audience && person.audience !== audience) return;
        if (!typeOk(person.eventType, eventTypes)) return;
        if (person.joined > end) return;
        if (person.lost && person.lost <= end) return;
        if (live ? !liveMembershipOk(person, view) : !identityOk(person, view)) return;
        total += 1;
      });
      return total;
    },
    flow: function (start, end, eventTypes, audience, view) {
      var joins = 0;
      var losses = 0;
      var live = view.directory && view.directory.live;
      (view.directory.membership || []).forEach(function (person) {
        if (audience && person.audience !== audience) return;
        if (!typeOk(person.eventType, eventTypes)) return;
        if (live ? !liveMembershipOk(person, view) : !identityOk(person, view)) return;
        if (person.joined >= start && person.joined <= end) joins += 1;
        if (person.lost && person.lost >= start && person.lost <= end) losses += 1;
      });
      return { joins: joins, losses: losses, net: joins - losses };
    }
  };

  function withContacts(rows) {
    return (rows || []).map(function (row, index) {
      return {
        name: row.name,
        audience: row.audience,
        event: row.event,
        date: row.date,
        email: emailOf(row.name),
        phone: phoneOf(index + 1),
        company: row.company || '',
        notes: 'Example visit'
      };
    });
  }

  function categoriesOf(row) {
    var value = row && (row.categories != null ? row.categories : row.category);
    var parts = Array.isArray(value) ? value : String(value || '').split(';');
    var out = [];
    parts.forEach(function (part) {
      var text = String(part || '').trim().replace(/\s+/g, ' ');
      if (text && out.indexOf(text) === -1) out.push(text);
    });
    return out;
  }

  function matchesBusinessType(row, selected) {
    if (!selected || !selected.length) return true;
    var cats = categoriesOf(row);
    var i;
    var j;
    if (!cats.length) {
      for (i = 0; i < selected.length; i++) {
        if (foldLabel(selected[i]) === 'other / not listed') return true;
      }
      return false;
    }
    for (i = 0; i < cats.length; i++) {
      for (j = 0; j < selected.length; j++) {
        if (foldLabel(cats[i]) === foldLabel(selected[j])) return true;
      }
    }
    return false;
  }

  function memberUniverse(directory, view) {
    var selected = (view && view.selectedBusinessTypes) || [];
    if (selected.length && directory.businesses && directory.businesses.length) return directory.businesses;
    if (directory.membership && directory.membership.length) return directory.membership;
    return directory.businesses || [];
  }

  function memberLine(row, status, date) {
    var cats = categoriesOf(row);
    return {
      name: row.name || row.company || '',
      company: row.company || '',
      status: status,
      date: date || '',
      category: cats.length ? cats.join(', ') : 'Other / not listed'
    };
  }

  function sliceProfiles(directory, view) {
    return census(directory, view).rows.filter(function (profile) {
      if (!baseProfile(profile, view)) return false;
      if ((view.renewalTenure || view.renewalBand) && !inRenewalSlice(profile, view)) return false;
      return true;
    });
  }

  function memberRecords(directory, view, range, mode) {
    var selected = (view && view.selectedBusinessTypes) || [];
    var start = range && range.start || '';
    var end = range && range.end || '9999-12-31';
    var useFlow = !!(range && range.useFlow && view && view.flow);
    var renewalRows = null;
    if (view && (view.renewalTenure || view.renewalBand)) {
      renewalRows = {};
      sliceProfiles(directory, view).forEach(function (profile) {
        if (view.renewalBand && !(profile.inCycle && profile.band === view.renewalBand)) return;
        if (!view.renewalBand && !(profile.current && profile.zero)) return;
        renewalRows[profile.row] = true;
      });
    }
    var rows = [];
    memberUniverse(directory, view).forEach(function (row) {
      if (row.audience && row.audience !== 'Member') return;
      if (!matchesBusinessType(row, selected)) return;
      if (renewalRows && !renewalRows[row]) return;
      var joined = row.joined || '';
      var lost = row.lost || '';
      if (useFlow && view.flow === 'lost' && mode === 'joined') return;
      if (useFlow && view.flow === 'new' && mode === 'active') {
        if (!joined || joined < start || joined > end) return;
        if (lost && lost <= end) return;
        rows.push(memberLine(row, 'member', joined));
        return;
      }
      if (useFlow && view.flow === 'lost' && mode === 'active') {
        if (!(lost && lost >= start && lost <= end)) return;
        rows.push(memberLine(row, 'lost', lost));
        return;
      }
      if (mode === 'joined') {
        if (!joined || joined < start || joined > end) return;
        rows.push(memberLine(row, 'new', joined));
        return;
      }
      if (mode === 'changes') {
        if ((!useFlow || view.flow === 'new') && joined && joined >= start && joined <= end) rows.push(memberLine(row, 'new', joined));
        if ((!useFlow || view.flow === 'lost') && lost && lost >= start && lost <= end) rows.push(memberLine(row, 'lost', lost));
        return;
      }
      if (joined && joined > end) return;
      if (lost && lost <= end) return;
      rows.push(memberLine(row, 'member', joined));
    });
    return rows;
  }

  function drill(directory, kind, view) {
    var range = view.measure || view.range;
    var eventTypes = view.eventTypes || [];
    var audience = view.audience || '';
    if (kind === 'attendance' || kind === 'distribution') {
      var found = attendanceRows(directory, range.start, range.end, eventTypes, audience, view);
      var rows = directory.live ? found : withContacts(found);
      var visitTitle = 'Event visits';
      if (eventTypes.length === 1) visitTitle = eventTypes[0] + ' visits';
      else if (eventTypes.length > 1) visitTitle = eventTypes.join(', ') + ' visits';
      else if (audience === 'Member') visitTitle = 'Member visits';
      else if (audience === 'Guest') visitTitle = 'Guest visits';
      else if (audience === 'No-show') visitTitle = 'No-shows';
      else if (kind === 'distribution') visitTitle = 'Member and guest visits';
      return {
        title: visitTitle,
        kind: kind,
        columns: columnList(rows, ['name', 'audience', 'event', 'date', 'email', 'phone']),
        rows: rows
      };
    }
    if (kind === 'businesses') {
      var wanted = (view.selectedBusinessTypes || []);
      var bizRows = memberRecords(directory, view, range, 'active').map(function (row) {
        return { company: row.company, category: row.category, joined: row.date };
      });
      bizRows.sort(function (a, b) { return a.company < b.company ? -1 : a.company > b.company ? 1 : 0; });
      var bizTitle = wanted.length === 1 ? wanted[0] + ' members' : 'Active member businesses';
      return {
        title: bizTitle,
        kind: kind,
        columns: [
          { key: 'company', label: 'Company' },
          { key: 'category', label: 'Business type' },
          { key: 'joined', label: 'Joined' }
        ],
        rows: bizRows
      };
    }
    if (kind === 'events') {
      var map = {};
      attendanceRows(directory, range.start, range.end, eventTypes, audience, view).forEach(function (row) {
        if (!map[row.eventId]) {
          map[row.eventId] = { event: row.event, type: row.eventType, date: row.date, attendance: 0 };
        }
        map[row.eventId].attendance += 1;
      });
      var eventRows = Object.keys(map).map(function (id) { return map[id]; });
      eventRows.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      var eventTitle = eventTypes.length === 1 ? eventTypes[0] + ' events' : 'Events held';
      return {
        title: eventTitle,
        kind: kind,
        columns: [
          { key: 'event', label: 'Event' },
          { key: 'type', label: 'Type' },
          { key: 'date', label: 'Date' },
          { key: 'attendance', label: 'Visits' }
        ],
        rows: eventRows
      };
    }
    if (kind === 'noshows') {
      var missed = noShowSummary(directory, view, range.start, range.end);
      var missedRows = (missed && missed.rows) || [];
      return {
        title: 'No-shows',
        kind: kind,
        columns: columnList(missedRows, ['name', 'audience', 'company', 'event', 'date']),
        rows: missedRows
      };
    }
    if (kind === 'renewal') {
      var riskRows = renewalStats(directory, view).rows.map(function (profile) {
        return {
          company: profile.company,
          category: categoriesOf(profile.row).join(', ') || 'Other / not listed',
          tenure: profile.tenure,
          visits: profile.recentVisits,
          band: profile.band
        };
      });
      return {
        title: 'Renewal risk',
        kind: kind,
        columns: [
          { key: 'company', label: 'Company' },
          { key: 'category', label: 'Business type' },
          { key: 'tenure', label: 'Tenure' },
          { key: 'visits', label: 'Visits' },
          { key: 'band', label: 'Visit band' }
        ],
        rows: riskRows
      };
    }
    var mode = kind === 'newMembers' ? 'joined' : (kind === 'members' ? 'active' : 'changes');
    var memberRows = memberRecords(directory, view, { start: range.start, end: range.end, useFlow: true }, mode);
    var titles = { members: 'Business Members', newMembers: 'New Members', changes: 'Membership records', gains: 'Member Gains and Losses' };
    return {
      title: titles[kind] || 'Membership',
      kind: kind,
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'company', label: 'Company' },
        { key: 'status', label: 'Status' },
        { key: 'date', label: 'Date' }
      ],
      rows: memberRows
    };
  }

  function columnList(rows, preferred) {
    var labels = {
      name: 'Name',
      audience: 'Member or Guest',
      event: 'Event',
      date: 'Date',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      notes: 'Notes'
    };
    var seen = {};
    var keys = [];
    preferred.forEach(function (key) {
      seen[key] = true;
      keys.push(key);
    });
    (rows || []).forEach(function (row) {
      Object.keys(row).forEach(function (key) {
        if (seen[key]) return;
        seen[key] = true;
        keys.push(key);
      });
    });
    return keys.map(function (key) {
      var label = labels[key] || key.replace(/_/g, ' ');
      return { key: key, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
  }

  function exportFileName(title, ext, day) {
    var slug = String(title || 'records').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'records';
    return 'aba-' + slug + '-' + day + '.' + ext;
  }

  function exportTable(pack) {
    var columns = (pack && pack.columns) || [];
    var rows = (pack && (pack.shown || pack.rows)) || [];
    return {
      headers: columns.map(function (column) { return column.label; }),
      rows: rows.map(function (row) {
        return columns.map(function (column) {
          return String(row[column.key] == null ? '' : row[column.key]).replace(/\r\n|\r|\n/g, ' ');
        });
      })
    };
  }

  function csvField(value) {
    var text = String(value == null ? '' : value).replace(/\r\n|\r|\n/g, ' ');
    if (/[",\r\n]/.test(text) || /^\s|\s$/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
    return text;
  }

  function exportCsv(pack) {
    var table = exportTable(pack);
    var lines = [table.headers].concat(table.rows).map(function (row) {
      return row.map(csvField).join(',');
    });
    return '\uFEFF' + lines.join('\r\n');
  }

  function exportWorkbook(pack, XLSX) {
    if (!XLSX) throw new Error('xlsx');
    var table = exportTable(pack);
    var sheet = XLSX.utils.aoa_to_sheet([table.headers].concat(table.rows));
    sheet['!cols'] = table.headers.map(function (header, index) {
      var width = String(header).length;
      table.rows.forEach(function (row) {
        var size = String(row[index] == null ? '' : row[index]).length;
        if (size > width) width = size;
      });
      return { wch: Math.max(10, width + 2) };
    });
    if (sheet['!ref']) {
      var range = XLSX.utils.decode_range(sheet['!ref']);
      var rowIndex;
      var column;
      for (rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
        for (column = range.s.c; column <= range.e.c; column++) {
          var cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: column })];
          if (!cell) continue;
          cell.s = { font: { bold: rowIndex === 0 }, alignment: { wrapText: false } };
        }
      }
    }
    var book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Records');
    return book;
  }

  function queryRows(rows, columns, query, sortKey, dir) {
    var q = String(query || '').toLowerCase();
    var list = (rows || []).filter(function (row) {
      if (!q) return true;
      var i;
      for (i = 0; i < columns.length; i++) {
        if (String(row[columns[i].key] == null ? '' : row[columns[i].key]).toLowerCase().indexOf(q) !== -1) return true;
      }
      return false;
    });
    var key = sortKey || 'date';
    var direction = dir === 'desc' ? -1 : 1;
    list.sort(function (a, b) {
      var av = a[key] == null ? '' : a[key];
      var bv = b[key] == null ? '' : b[key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * direction;
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
      if (av < bv) return -1 * direction;
      if (av > bv) return 1 * direction;
      return 0;
    });
    return list;
  }

  function fromLive(payload) {
    payload = payload || {};
    var attendance = [];
    (payload.attendanceRecords || []).forEach(function (row) {
      var type = ALLOWED[row.eventType] ? row.eventType : '';
      if (!type) return;
      var date = String(row.date || row.event_date || '').slice(0, 10);
      var name = String(row.name || '').trim();
      if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      var copy = {};
      Object.keys(row).forEach(function (key) { copy[key] = row[key]; });
      copy.name = name;
      copy.date = date;
      copy.eventType = type;
      copy.event = row.event || row.event_name || type;
      copy.eventId = String(row.eventId || row.event_id || '');
      copy.audience = row.audience || '';
      copy.company = row.company || '';
        copy.status = String(row.status || '').toLowerCase();
        copy.email = String(row.email || '');
        copy.registration_status = String(row.registration_status || row.registrationStatus || '');
      attendance.push(copy);
    });
    var people = consolidatePeople(attendance);
    var membership = (payload.roster || []).map(function (row) {
      var company = String(row.company || '').trim();
      if (!company) return null;
      var deactivated = String(row.status || '').toLowerCase() === 'deactivated';
      var categories = categoriesOf(row);
      return {
        name: '',
        company: company,
        audience: 'Member',
        eventType: '',
        categories: categories,
        email: String(row.email || ''),
        statusText: String(row.status || ''),
        joined: row.joinDate || row.join_date || '',
        lost: (function () {
          var dated = row.lostDate || row.lost_date || '';
          if (/^\d{4}-\d{2}-\d{2}$/.test(String(dated))) return String(dated).slice(0, 10);
          return deactivated ? '1970-01-01' : '';
        })()
      };
    }).filter(Boolean);
    var businesses = membership.map(function (row) {
      return { company: row.company, categories: row.categories || [], joined: row.joined, lost: row.lost, name: row.name || '' };
    });
    var companies = consolidateLabels(payload.companies || []);
    if (!companies.length) {
      var rosterNames = [];
      membership.forEach(function (row) {
        if (!row.lost) rosterNames.push(row.company);
      });
      companies = consolidateLabels(rosterNames);
    }
    return {
      companies: companies,
      guestCompany: '',
      people: people,
      membership: membership,
      attendance: attendance,
      businesses: businesses,
      live: true,
      narrow: narrow
    };
  }

  root.ABADirectory = {
    COMPANIES: COMPANIES,
    build: build,
    fromLive: fromLive,
    peopleForCompanies: peopleForCompanies,
    attendanceRows: attendanceRows,
    withContacts: withContacts,
    drill: drill,
    memberRecords: memberRecords,
    renewalStats: renewalStats,
    noShowSummary: noShowSummary,
    rowIsNoShow: rowIsNoShow,
    categoriesOf: categoriesOf,
    matchesBusinessType: matchesBusinessType,
    exportFileName: exportFileName,
    exportTable: exportTable,
    exportCsv: exportCsv,
    exportWorkbook: exportWorkbook,
    queryRows: queryRows,
    narrow: narrow,
    emailOf: emailOf,
    phoneOf: phoneOf
  };
})(typeof window !== 'undefined' ? window : globalThis);
