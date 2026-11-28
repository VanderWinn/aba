/* Concept 2b markup. Returns HTML; the page binds events. */
(function (root) {
  'use strict';

  var model = root.ABADashboard;
  var TEAL = '#3F768B';
  var YTD = '#C4841D';
  var CORAL = '#B84734';
  var MUTED = '#7D949C';
  var PRIOR_LOSS = '#8A9094';
  var CLAY = '#D01F25';
  var INK = '#39393a';
  var exampleFlags = true;

  function markOpen(on, label, attrs) {
    return '<g class="filter-hit" tabindex="0" role="button" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' + escapeHtml(label) + '" ' + attrs + '>';
  }

  function markClose() {
    return '</g>';
  }

  function periodOn(view, id, flow) {
    if (!view || !view.bucket || view.bucket !== id) return false;
    return (view.flow || '') === (flow || '');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function hint(label, key, iconOnly, extra) {
    var def = ((model.DEFS && model.DEFS[key]) || '') + (extra || '');
    var flag = exampleFlags && model.FLAGS && model.FLAGS[key] ? model.FLAGS[key] : '';
    var body = escapeHtml(def);
    if (flag) body += '<span class="tip-flag">' + escapeHtml(flag) + '</span>';
    var heading = (!iconOnly && label) ? label : key;
    var icon = '<span class="info" tabindex="0" role="button" aria-label="About ' + escapeHtml(heading) + '">ⓘ<span class="tip" role="tooltip"><strong>' +
      escapeHtml(heading) + '</strong>' + body + '</span></span>';
    if (iconOnly) return icon;
    return escapeHtml(label) + icon;
  }

  function signed(n) {
    if (n > 0) return '+' + n;
    if (n < 0) return '−' + Math.abs(n);
    return '0';
  }

  function headline(text, tone, sizeClass, drill, context) {
    return '<button type="button" class="big ' + sizeClass + ' tone-' + tone + '" data-drill="' + drill + '">' + text + '</button>' +
      (context ? '<p class="share-line">' + escapeHtml(context) + '</p>' : '');
  }

  function card(title, key, body, extra, drill, linkLabel, tipExtra) {
    var link = '';
    if (linkLabel) {
      var jump = String(drill || '');
      var attr = jump.indexOf('page:') === 0
        ? 'data-page="' + jump.slice(5) + '"'
        : 'data-drill="' + escapeHtml(jump) + '"';
      link = '<div class="card-foot"><button type="button" class="detail-link" ' + attr + '>' + escapeHtml(linkLabel) + '</button></div>';
    }
    var icon = key ? hint('', key, true, tipExtra) : '';
    return '<section class="card' + (extra || '') + '"><div class="hd"><h2 class="ttl">' + escapeHtml(title) + icon +
      '</h2></div><div class="bodycol">' + body + '</div>' + link + '</section>';
  }

  function niceMax(values) {
    var max = 0;
    values.forEach(function (value) { if (value > max) max = value; });
    if (max <= 3) return 3;
    if (max <= 5) return 5;
    if (max <= 10) return 10;
    return Math.ceil(max * 1.2 / 10) * 10;
  }

  function yearLegend(parts, items, gainedLost) {
    var legendFont = 'font-size="11" fill="#3d4c50" font-family="Montserrat, Raleway, sans-serif"';
    var x = 8;
    if (gainedLost) {
      parts.push('<text x="' + x + '" y="14" ' + legendFont + ' font-weight="700">Gained</text>');
      x += 54;
      parts.push('<rect x="' + x + '" y="5" width="10" height="10" fill="#3F768B" opacity="0.4"/>');
      parts.push('<text x="' + (x + 14) + '" y="14" ' + legendFont + ' font-weight="700">Lost</text>');
      x += 46;
    }
    items.forEach(function (item, index) {
      parts.push('<rect x="' + x + '" y="5" width="10" height="10" rx="1" fill="' + (item.color || TEAL) + '"/>');
      parts.push('<text x="' + (x + 14) + '" y="14" ' + legendFont + '>' + escapeHtml(item.label) + '</text>');
      x += 14 + String(item.label || '').length * 6.4 + 12;
    });
  }

  function yearGainSvg(series, view, w, h) {
    w = w || 520;
    h = h || 220;
    var maxUp = 1;
    var maxDown = 1;
    series.forEach(function (bar) {
      maxUp = Math.max(maxUp, bar.joins || 0);
      maxDown = Math.max(maxDown, bar.losses || 0);
    });
    var mid = 118;
    var sc = Math.min((mid - 36) / maxUp, (h - mid - 28) / maxDown);
    var n = series.length;
    var gap = 18;
    var bw = Math.max(18, Math.min(48, (w - 40 - gap * (n - 1)) / n));
    var total = n * bw + (n - 1) * gap;
    var x0 = (w - total) / 2;
    var parts = ['<line x1="8" y1="' + mid + '" x2="' + (w - 8) + '" y2="' + mid + '" stroke="#9aa6a9"/>'];
    series.forEach(function (bar, index) {
      var x = x0 + index * (bw + gap);
      var up = (bar.joins || 0) * sc;
      var down = (bar.losses || 0) * sc;
      var gainOn = periodOn(view, bar.id, 'new');
      var lossOn = periodOn(view, bar.id, 'lost');
      var gainDim = view && view.bucket && !gainOn ? ' opacity="0.35"' : '';
      var lossOpacity = view && view.bucket && !lossOn ? '0.2' : '0.4';
      parts.push(markOpen(gainOn, 'New members ' + bar.label, 'data-period="' + escapeHtml(bar.id || '') + '" data-flow="new"'));
      parts.push('<rect x="' + x.toFixed(1) + '" y="' + (mid - up).toFixed(1) + '" width="' + bw + '" height="' + Math.max(up, 2).toFixed(1) + '" fill="' + bar.color + '"' + gainDim + (gainOn ? ' stroke="#243033" stroke-width="3"' : '') + '><title>' + escapeHtml(bar.label) + ' gained ' + (bar.joins || 0) + '</title></rect>' + markClose());
      parts.push(markOpen(lossOn, 'Cancelled members ' + bar.label, 'data-period="' + escapeHtml(bar.id || '') + '" data-flow="lost"'));
      parts.push('<rect x="' + x.toFixed(1) + '" y="' + mid + '" width="' + bw + '" height="' + Math.max(down, 2).toFixed(1) + '" fill="' + bar.color + '" opacity="' + lossOpacity + '"' + (lossOn ? ' stroke="#243033" stroke-width="3"' : '') + '><title>' + escapeHtml(bar.label) + ' lost ' + (bar.losses || 0) + '</title></rect>' + markClose());
      parts.push('<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (mid - up - 6).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + INK + '" font-family="Montserrat, Raleway, sans-serif">' + (bar.joins || 0) + '</text>');
      if (bar.losses) parts.push('<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (mid + down + 14).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + INK + '" font-family="Montserrat, Raleway, sans-serif">' + bar.losses + '</text>');
      parts.push('<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (h - 4) + '" text-anchor="middle" font-size="12" fill="#3d4c50" font-family="Montserrat, Raleway, sans-serif">' + escapeHtml(bar.label) + '</text>');
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Member gains and losses by fiscal year">' + parts.join('') + '</svg>';
  }

  function yearCountSvg(bars, kind, view, w, h) {
    w = w || 420;
    h = h || 132;
    var max = 1;
    bars.forEach(function (bar) { max = Math.max(max, bar.value || 0); });
    var n = bars.length;
    var gap = 16;
    var bw = Math.max(22, Math.min(54, (w - 40 - gap * (n - 1)) / n));
    var total = n * bw + (n - 1) * gap;
    var x0 = (w - total) / 2;
    var base = Math.max(48, h - 22);
    var plot = Math.max(36, base - 24);
    var parts = [];
    bars.forEach(function (bar, index) {
      var height = ((bar.value || 0) / max) * plot;
      var x = x0 + index * (bw + gap);
      var y = base - height;
      var on = periodOn(view, bar.id, '');
      var dim = view && view.bucket && !on ? ' opacity="0.35"' : '';
      parts.push(markOpen(on, bar.label + ' ' + kind, 'data-period="' + escapeHtml(bar.id || '') + '"'));
      parts.push('<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw + '" height="' + Math.max(height, 2).toFixed(1) + '" fill="' + bar.color + '"' + dim + (on ? ' stroke="#243033" stroke-width="3"' : '') + '><title>' + escapeHtml(bar.label) + ' ' + (bar.value || 0) + '</title></rect>' + markClose());
      parts.push('<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + INK + '" font-family="Montserrat, Raleway, sans-serif">' + (bar.value || 0) + '</text>');
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + escapeHtml(kind) + ' by fiscal year">' + parts.join('') + '</svg>';
  }

  function groupedSvg(groups, key, kind, view) {
    var sample = (groups[0] && groups[0].bars) || [];
    var w = Math.max(420, groups.length * (sample.length * 16 + 28));
    var h = 150;
    var max = 1;
    groups.forEach(function (group) {
      group.bars.forEach(function (bar) { max = Math.max(max, bar[key] || 0); });
    });
    var base = 128;
    var plot = 82;
    var slot = (w - 16) / groups.length;
    var bw = Math.max(6, Math.min(16, (slot - 10) / sample.length));
    var parts = [];
    groups.forEach(function (group, index) {
      var left = 8 + index * slot + (slot - bw * group.bars.length) / 2;
      group.bars.forEach(function (bar, barIndex) {
        if (bar.skipped) return;
        var height = ((bar[key] || 0) / max) * plot;
        var x = left + barIndex * bw;
        var y = base - height;
        var on = periodOn(view, bar.start && bar.end ? bar.start + ':' + bar.end : '', '');
        var dim = view && view.bucket && !on ? ' opacity="0.35"' : '';
        parts.push(markOpen(on, bar.label + ' ' + group.label, 'data-period="' + escapeHtml(bar.start && bar.end ? bar.start + ':' + bar.end : '') + '"'));
        parts.push('<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(bw - 2, 4).toFixed(1) + '" height="' + Math.max(height, 2).toFixed(1) + '" fill="' + (bar.color || TEAL) + '"' + dim + (on ? ' stroke="#243033" stroke-width="2"' : '') + '><title>' + escapeHtml(bar.label + ' ' + group.label) + ' ' + (bar[key] || 0) + '</title></rect>' + markClose());
      });
      parts.push('<text x="' + (8 + index * slot + slot / 2).toFixed(1) + '" y="' + (h - 4) + '" text-anchor="middle" font-size="11" fill="#555" font-family="Montserrat, Raleway, sans-serif">' + escapeHtml(group.label) + '</text>');
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + escapeHtml(kind) + ' by fiscal year">' + parts.join('') + '</svg>';
  }

  function gainsSvg(series, view, w, h) {
    var showLabels = true;
    var legend = (view && view.gainLegend) || { current: 'This FY', prior: 'Last FY' };
    if (series && series.length && series[0].color) return yearGainSvg(series, view, w, h);
    var any = false;
    (series || []).forEach(function (bucket) {
      if (bucket.joins || bucket.losses || bucket.priorJoins || bucket.priorLosses) any = true;
    });
    if (!series || !series.length || !any) {
      return emptyChart(showLabels ? 'is-gains' : 'is-gains-short');
    }
    legend = legend || { current: 'This FY', prior: 'Last FY' };
    w = w || 520;
    h = h || (showLabels ? 240 : 220);
    var labelValues = !!showLabels || series.length <= 6;
    var maxUp = 1;
    var maxDown = 1;
    series.forEach(function (bucket) {
      maxUp = Math.max(maxUp, bucket.joins || 0, bucket.priorJoins || 0);
      maxDown = Math.max(maxDown, bucket.losses || 0, bucket.priorLosses || 0);
    });
    var mid = Math.round(h * (showLabels ? 0.56 : 0.55));
    var topInset = labelValues ? (showLabels ? 34 : 26) : 18;
    var botInset = showLabels ? 36 : 20;
    var sc = Math.min((mid - topInset) / maxUp, (h - mid - botInset) / maxDown);
    var n = series.length || 1;
    var cw = (w - 20) / n;
    var gap = n > 8 ? 2 : 4;
    var maxPair = n <= 1 ? 132 : (n <= 4 ? 96 : (showLabels ? 52 : 36));
    var pair = Math.min(cw * 0.78, maxPair);
    var bw = Math.max(4, (pair - gap) / 2);
    var font = 12;
    var parts = ['<line x1="6" y1="' + mid + '" x2="' + (w - 6) + '" y2="' + mid + '" stroke="#9aa6a9"/>'];
    function valueText(x, y, value, weight) {
      return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + font + '" text-anchor="middle" fill="' + INK + '" font-weight="' + weight + '" font-family="Montserrat, Raleway, sans-serif">' + value + '</text>';
    }
    function bars(x, joins, losses, upColor, downColor, periodId) {
      var up = joins * sc;
      var down = losses * sc;
      var gainOn = periodOn(view, periodId, 'new');
      var lossOn = periodOn(view, periodId, 'lost');
      var gainDim = view && view.bucket && !gainOn ? ' opacity="0.35"' : '';
      var lossDim = view && view.bucket && !lossOn ? ' opacity="0.35"' : '';
      parts.push(markOpen(gainOn, 'New members ' + periodId, 'data-period="' + escapeHtml(periodId || '') + '" data-flow="new"'));
      parts.push('<rect x="' + x.toFixed(1) + '" y="' + (mid - up).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(up, 2).toFixed(1) + '" fill="' + upColor + '"' + gainDim + (gainOn ? ' stroke="#243033" stroke-width="2"' : '') + '/>' + markClose());
      parts.push(markOpen(lossOn, 'Cancelled members ' + periodId, 'data-period="' + escapeHtml(periodId || '') + '" data-flow="lost"'));
      parts.push('<rect x="' + x.toFixed(1) + '" y="' + mid + '" width="' + bw.toFixed(1) + '" height="' + Math.max(down, 2).toFixed(1) + '" fill="' + downColor + '"' + lossDim + (lossOn ? ' stroke="#243033" stroke-width="2"' : '') + '/>' + markClose());
      if (!labelValues) return;
      var cx = x + bw / 2;
      if (joins || !losses) parts.push(valueText(cx, mid - up - 4, joins, '700'));
      if (losses) parts.push(valueText(cx, mid + down + 14, losses, '700'));
    }
    series.forEach(function (bucket, index) {
      var slot = 10 + index * cw + (cw - (bw * 2 + gap)) / 2;
      bars(slot, bucket.priorJoins || 0, bucket.priorLosses || 0, MUTED, PRIOR_LOSS, bucket.priorId);
      var currentX = slot + bw + gap;
      var currentUp = index === series.length - 1 ? YTD : TEAL;
      bars(currentX, bucket.joins || 0, bucket.losses || 0, currentUp, CLAY, bucket.id);
      var labelSize = font;
      if (n <= 16 || index % 2 === 0) {
        parts.push('<text x="' + (slot + bw + gap / 2).toFixed(1) + '" y="' + (h - 4) + '" font-size="' + labelSize + '" text-anchor="middle" fill="#555" font-family="Montserrat, Raleway, sans-serif">' + escapeHtml(bucket.label) + '</text>');
      }
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Member gains and losses, this fiscal year beside last fiscal year">' + parts.join('') + '</svg>';
  }

function pairSvg(current, prior, kind, legend) {
    legend = legend || { current: 'This FY', prior: 'Last FY' };
    current = Number(current) || 0;
    prior = Number(prior) || 0;
    var w = 420;
    var h = 112;
    var max = Math.max(1, current, prior);
    var padTop = 32;
    var baseline = h - 6;
    var plotH = baseline - padTop;
    var bw = 42;
    var gap = 14;
    var x0 = (w - (bw * 2 + gap)) / 2;
    var parts = [];
    var legendFont = 'font-size="11" fill="#555" font-family="Montserrat, Raleway, sans-serif"';
    var currentWidth = legend.current.length * 6.4;
    var priorWidth = legend.prior.length * 6.4;
    var legendRight = w - 8;
    parts.push('<text x="' + legendRight.toFixed(1) + '" y="14" text-anchor="end" ' + legendFont + '>' + escapeHtml(legend.current) + '</text>');
    parts.push('<rect x="' + (legendRight - currentWidth - 14).toFixed(1) + '" y="6" width="9" height="9" rx="1" fill="' + TEAL + '"/>');
    var priorRight = legendRight - currentWidth - 26;
    parts.push('<text x="' + priorRight.toFixed(1) + '" y="14" text-anchor="end" ' + legendFont + '>' + escapeHtml(legend.prior) + '</text>');
    parts.push('<rect x="' + (priorRight - priorWidth - 14).toFixed(1) + '" y="6" width="9" height="9" rx="1" fill="' + MUTED + '"/>');
    function bar(x, value, color) {
      var height = (value / max) * plotH;
      var y = baseline - height;
      parts.push('<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw + '" height="' + Math.max(height, 0).toFixed(1) + '" fill="' + color + '"/>');
      parts.push('<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 5).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + INK + '" font-family="Montserrat, Raleway, sans-serif">' + value + '</text>');
    }
    bar(x0, prior, MUTED);
    bar(x0 + bw + gap, current, TEAL);
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + escapeHtml(kind) + ', ' + prior + ' last year, ' + current + ' this year">' + parts.join('') + '</svg>';
  }

  function lineSvg(values, lastYear, labels, kind, narrow) {
  var n = values.length || 1;
  var w = n > 16 ? 640 : 420;
  var h = 112;
  narrow = !!narrow || n > 14;
    var padX = 12;
    var padTop = narrow ? 22 : 16;
    var padBot = 18;
    var yZero = h - padBot - 7;
    var plotH = yZero - padTop;
    var ymax = niceMax(values.concat(lastYear));
    var cw = (w - 2 * padX) / n;
    function xx(i) { return padX + (i + 0.5) * cw; }
    function yy(v) { return yZero - (v / ymax) * plotH; }
    var parts = [];
    var ly = lastYear.map(function (value, index) { return xx(index).toFixed(1) + ',' + yy(value).toFixed(1); }).join(' ');
    var cur = values.map(function (value, index) { return xx(index).toFixed(1) + ',' + yy(value).toFixed(1); }).join(' ');
    parts.push('<polyline points="' + ly + '" fill="none" stroke="' + MUTED + '" stroke-width="1.6" stroke-dasharray="3 3" stroke-linejoin="round" stroke-linecap="round"/>');
    parts.push('<polyline points="' + cur + '" fill="none" stroke="' + TEAL + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>');
    values.forEach(function (value, index) {
      var x = xx(index);
      var y = yy(value);
      parts.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5" fill="' + TEAL + '"/>');
      var showValue = n <= 16;
      if (showValue) {
        var lift = narrow && n > 8 && index % 2 ? 16 : 8;
        parts.push('<text x="' + x.toFixed(1) + '" y="' + (y - lift).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + INK + '" font-family="Montserrat, Raleway, sans-serif">' + value + '</text>');
      }
      var showLabel = n <= 16 || index % 2 === 0 || index === n - 1;
      if (showLabel) {
        parts.push('<text x="' + x.toFixed(1) + '" y="' + (h - 3) + '" text-anchor="middle" font-size="12" fill="#555" font-family="Montserrat, Raleway, sans-serif">' + escapeHtml(labels[index] || '') + '</text>');
      }
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + escapeHtml(kind) + '">' + parts.join('') + '</svg>';
  }

  function emptyChart(kind) {
    return '<p class="chart-empty ' + kind + '" role="img" aria-label="No records">No records</p>';
  }

  function fullSlice(title, count, color, audience) {
    return '<svg class="pie" viewBox="0 0 176 176" role="img" aria-label="' + title + ' ' + count + ', 100%">' +
      '<circle data-audience="' + audience + '" cx="88" cy="88" r="80" fill="' + color + '"/>' +
      '<text x="88" y="78" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="Montserrat, Raleway, sans-serif">' + title + '</text>' +
      '<text x="88" y="98" text-anchor="middle" font-size="18" font-weight="800" fill="#fff" font-family="Montserrat, Raleway, sans-serif">' + count + '</text>' +
      '<text x="88" y="116" text-anchor="middle" font-size="12" fill="#fff" font-family="Montserrat, Raleway, sans-serif">100%</text></svg>';
  }

  function pieSvg(pie, selected) {
    var size = 176;
    var members = pie.members;
    var guests = pie.guests;
    var total = members + guests;
    if (!total) return emptyChart('is-pie');
    if (!guests) return fullSlice('Attendees', members, TEAL, 'Member');
    if (!members) return fullSlice('Guests', guests, CORAL, 'Guest');
    var r = size / 2 - 8;
    var cx = size / 2;
    var cy = size / 2;
    var a0 = -Math.PI / 2;
    var a1 = a0 + 2 * Math.PI * (members / total);
    var a2 = a0 + 2 * Math.PI;
    function point(angle, radius) {
      return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    }
    function slice(start, end, color, audience) {
      var p1 = point(start, r);
      var p2 = point(end, r);
      var large = (end - start) > Math.PI ? 1 : 0;
      var dim = selected && selected !== audience ? ' opacity="0.38"' : '';
      var ring = selected === audience ? ' stroke="#1a333c" stroke-width="3"' : '';
      return '<path data-audience="' + audience + '" d="M ' + cx + ' ' + cy + ' L ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) +
        ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + ' Z" fill="' + color + '"' + dim + ring + '/>';
    }
    function label(start, end, title, count, pct) {
      var mid = (start + end) / 2;
      var pos = point(mid, r * 0.58);
      return '<text x="' + pos[0].toFixed(1) + '" y="' + (pos[1] - 7).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="Montserrat, Raleway, sans-serif">' + title + '</text>' +
        '<text x="' + pos[0].toFixed(1) + '" y="' + (pos[1] + 11).toFixed(1) + '" text-anchor="middle" font-size="18" font-weight="800" fill="#fff" font-family="Montserrat, Raleway, sans-serif">' + count + '</text>' +
        '<text x="' + pos[0].toFixed(1) + '" y="' + (pos[1] + 26).toFixed(1) + '" text-anchor="middle" font-size="12" fill="#fff">' + pct + '%</text>';
    }
    var memberGroup = members ? '<g data-audience="Member">' + slice(a0, a1, TEAL, 'Member') + label(a0, a1, 'Attendees', members, pie.memberPct) + '</g>' : '';
    var guestStart = members ? a1 : a0;
    var guestGroup = guests ? '<g data-audience="Guest">' + slice(guestStart, a2, CORAL, 'Guest') + label(guestStart, a2, 'Guests', guests, pie.guestPct) + '</g>' : '';
    return '<svg class="pie" viewBox="0 0 176 176" role="img" aria-label="Attendee distribution, attendees ' + members + ', guests ' + guests + '">' +
      memberGroup + guestGroup + '</svg>';
  }

function fiscalLabel(year) {
  return 'FY' + year;
}

function stepControl(step, enabled, compact, attrs) {
  var index = -1;
  (step.options || []).forEach(function (item, i) { if (item.id === step.id) index = i; });
  var atStart = index <= 0;
  var atEnd = index < 0 || index >= (step.options || []).length - 1;
  var options = (step.options || []).map(function (item) {
    return '<option value="' + escapeHtml(item.id) + '"' + (item.id === step.id ? ' selected' : '') + '>' + escapeHtml(item.label) + '</option>';
  }).join('');
  var noun = step.label === 'Quarter' ? 'quarter' : (step.label === 'Month' ? 'month' : 'fiscal year');
  var cls = 'ystep' + (attrs.extraClass ? ' ' + attrs.extraClass : '') + (compact ? ' compact' : '') + (enabled ? '' : ' is-off');
  return '<div class="' + cls + '"' + (enabled ? '' : ' aria-disabled="true"') + '>' +
    '<button type="button" ' + attrs.step + '="-1" aria-label="Previous ' + noun + '"' + (enabled && !atStart ? '' : ' disabled') + '>◂</button>' +
    '<b>' + escapeHtml(step.value) + '</b>' +
    '<button type="button" ' + attrs.step + '="1" aria-label="Next ' + noun + '"' + (enabled && !atEnd ? '' : ' disabled') + '>▸</button>' +
    '<label class="ycaret"><span class="sr-only">Choose a ' + noun + '</span><select ' + attrs.select + ' aria-label="' + escapeHtml(step.label) + '"' +
    (enabled ? '' : ' disabled') + '>' + options + '</select></label></div>';
}


  function docsOf(view) {
    var found = view.documents || {};
    function byTitle(pattern) {
      var match = '';
      (found.extras || []).forEach(function (item) {
        if (!match && pattern.test(item.title || '')) match = item.url;
      });
      return match;
    }
    return {
      handbook: found.procedure || byTitle(/procedure|handbook/i),
      bylaws: byTitle(/bylaw/i),
      minutes: byTitle(/minute/i),
      roster: byTitle(/roster/i),
      extras: found.extras || []
    };
  }

  function docItem(label, href) {
    if (!href) return '<p class="doc-missing">' + escapeHtml(label) + ' <span>Not listed yet</span></p>';
    return '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(label) + '</a>';
  }

  function documentsMenu(view) {
    var docs = docsOf(view);
    var seen = {};
    var items = [
      docItem('Handbook', docs.handbook),
      docItem('Bylaws', docs.bylaws),
      docItem('Board minutes', docs.minutes),
      docItem('Committee roster', docs.roster)
    ];
    if (docs.handbook) seen[docs.handbook] = true;
    if (docs.bylaws) seen[docs.bylaws] = true;
    if (docs.minutes) seen[docs.minutes] = true;
    if (docs.roster) seen[docs.roster] = true;
    (docs.extras || []).forEach(function (item) {
      if (!item || !item.url || seen[item.url]) return;
      seen[item.url] = true;
      items.push(docItem(item.title, item.url));
    });
    return '<div class="docs-menu"><button type="button" class="nav-link" data-more aria-haspopup="true">Documents</button><div class="more-pop" hidden>' + items.join('') + '</div></div>';
  }

  function docbar(view) {
    var signup = 'https://vanderwinn.github.io/aba-hospitality-signup/';
    var badge = view.example ? '<span class="example-badge">Example data</span>' : '';
    var mark = '<a class="mark" href="https://adabusinessassociation.com/" target="_blank" rel="noopener noreferrer" aria-label="Ada Business Association website">' +
      '<img src="../assets/aba-logo.png" alt="Ada Business Association website"></a>';
    var onDash = ' class="nav-link on" aria-current="page"';
    return '<header class="docbar"><div class="brand-wrap">' + mark +
      '<a class="brand" href="../"><span class="brand-full">Board &amp; Committee Portal</span><span class="brand-short">Board portal</span></a>' +
      badge + '</div><nav class="topnav" aria-label="Portal">' +
      '<button type="button" data-page="overview"' + onDash + '>Dashboard</button>' +
      '<a class="nav-link" href="' + signup + '" target="_blank" rel="noopener noreferrer">Hospitality Sign-Up</a>' +
      documentsMenu(view) + '</nav></header>';
  }

  function viewTabs(view) {
    var tabs = [['overview', 'Overview'], ['membership', 'Membership'], ['events', 'Events &amp; Attendance']];
    return '<div class="view-tabs" role="tablist" aria-label="Dashboard views">' + tabs.map(function (tab) {
      var on = (view.page || 'overview') === tab[0];
      return '<button type="button" role="tab" data-page="' + tab[0] + '"' + (on ? ' class="on" aria-selected="true"' : ' aria-selected="false"') + '>' +
        (on ? '<span class="tick" aria-hidden="true">✓</span> ' : '') + tab[1] + '</button>';
    }).join('') + '</div>';
  }

  function rangeLabel(view) {
    if (view.rangeKind === 'last12') return 'Last 12 months';
    if (view.rangeKind === 'last3') return 'Last 3 fiscal years';
    if (view.rangeKind === 'custom') {
      if (view.from || view.to) {
        return (view.from ? model.formatDate(view.from) : 'Start') + ' – ' + (view.to ? model.formatDate(view.to) : 'Today');
      }
      var years = view.chosenYears || [];
      if (!years.length) return 'Custom';
      if (years.length > 2) return years.length + ' fiscal years';
      return years.map(function (year) { return 'FY' + year; }).join(', ');
    }
    var slice = (view.slices || [])[0];
    return slice && slice.partial ? 'This fiscal year (YTD)' : 'This fiscal year';
  }

  function rangeMenu(view) {
    var open = (view.ui || {}).openMenu === 'range';
    var kinds = [['fy', 'This fiscal year'], ['last12', 'Last 12 months'], ['last3', 'Last 3 fiscal years'], ['custom', 'Custom']];
    var radios = kinds.map(function (item) {
      var on = view.rangeKind === item[0];
      return '<label class="check"><input type="radio" name="date-range" data-range="' + item[0] + '"' + (on ? ' checked' : '') + '> ' + item[1] + (on ? ' <span class="tick">✓</span>' : '') + '</label>';
    }).join('');
    var custom = '';
    if (view.rangeKind === 'custom') {
      var boxes = (view.years || []).map(function (year) {
        var on = (view.chosenYears || []).indexOf(year) !== -1;
        return '<label class="check"><input type="checkbox" data-year-option="' + year + '"' + (on ? ' checked' : '') + '> FY' + year + '</label>';
      }).join('');
      custom = '<div class="custom-range"><p class="custom-label">Fiscal years</p>' + boxes +
        '<label class="date-field">From <input type="date" data-from value="' + escapeHtml(view.from || '') + '" aria-label="From date"></label>' +
        '<label class="date-field">To <input type="date" data-to value="' + escapeHtml(view.to || '') + '" aria-label="To date"></label></div>';
    }
    return '<div class="multi range-menu' + (open ? ' is-open' : '') + '" data-menu="range">' +
      '<button type="button" class="multi-face" data-menu-toggle="range" aria-expanded="' + (open ? 'true' : 'false') + '" aria-label="Date range">' + escapeHtml(rangeLabel(view)) + '</button>' +
      '<div class="multi-pop"' + (open ? '' : ' hidden') + '><p class="custom-label">Date range</p>' + radios + custom + '</div></div>';
  }

  function groupControl(view) {
    var items = [['month', 'Month'], ['quarter', 'Quarter'], ['year', 'Year']];
    return '<div class="pseg" role="group" aria-label="Group by">' + items.map(function (item) {
      var on = view.group === item[0];
      return '<button type="button" data-group="' + item[0] + '"' + (on ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' +
        (on ? '<span class="tick" aria-hidden="true">✓</span> ' : '') + item[1] + '</button>';
    }).join('') + '</div>';
  }

  function controls(view) {
    var clear = view.filtersActive ? '<button type="button" class="clear-filters" data-clear-filters>Clear selections</button>' : '';
    return '<div class="controls"><div class="dgroup"><span class="lab">Date range</span>' + rangeMenu(view) + '</div>' +
      '<div class="dgroup"><span class="lab">Group by</span>' + groupControl(view) + '</div>' + activeChips(view) + clear + '</div>';
  }

  function periodChipLabel(view, id) {
    var found = '';
    (view.buckets || []).concat(view.monthBuckets || []).concat(view.gains || []).forEach(function (bucket) {
      if (bucket && (bucket.id === id || bucket.priorId === id)) found = bucket.id === id ? bucket.label : found;
    });
    var start = String(id || '').split(':')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return found || id;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var dated = months[Number(start.slice(5, 7)) - 1] + ' ' + start.slice(0, 4);
    if (!found) return dated;
    if (/\d/.test(found)) return found;
    return found + ' ' + start.slice(0, 4);
  }

  function activeChips(view) {
    var chips = [];
    (view.eventTypes || []).forEach(function (type) {
      chips.push('<button type="button" class="filter-chip" data-clear-type="' + escapeHtml(type) + '">Event type: ' + escapeHtml(type) + ' <span aria-hidden="true">×</span><span class="sr-only"> Remove</span></button>');
    });
    (view.selectedBusinessTypes || []).forEach(function (type) {
      chips.push('<button type="button" class="filter-chip" data-clear-business="' + escapeHtml(type) + '">Business type: ' + escapeHtml(type) + ' <span aria-hidden="true">×</span><span class="sr-only"> Remove</span></button>');
    });
    (view.companies || []).forEach(function (name) {
      chips.push('<button type="button" class="filter-chip" data-clear-company="' + escapeHtml(name) + '">Company: ' + escapeHtml(name) + ' <span aria-hidden="true">×</span><span class="sr-only"> Remove</span></button>');
    });
    (view.people || []).forEach(function (name) {
      chips.push('<button type="button" class="filter-chip" data-clear-person="' + escapeHtml(name) + '">Attendee: ' + escapeHtml(name) + ' <span aria-hidden="true">×</span><span class="sr-only"> Remove</span></button>');
    });
    if (view.audience === 'Member' || view.audience === 'Guest' || view.audience === 'No-show') {
      var label = view.audience === 'Member' ? 'Members' : (view.audience === 'Guest' ? 'Guests' : 'No-shows');
      chips.push('<button type="button" class="filter-chip" data-clear-audience>Visits: ' + label + ' <span aria-hidden="true">×</span><span class="sr-only"> Remove</span></button>');
    }
    if (view.bucket) {
      chips.push('<button type="button" class="filter-chip" data-clear-period>Period: ' + escapeHtml(periodChipLabel(view, view.bucket)) + ' <span aria-hidden="true">×</span><span class="sr-only"> Remove</span></button>');
    }
    if (view.flow === 'new' || view.flow === 'lost') {
      chips.push('<button type="button" class="filter-chip" data-clear-flow>Change: ' + (view.flow === 'new' ? 'New' : 'Cancelled') + ' <span aria-hidden="true">×</span><span class="sr-only"> Remove</span></button>');
    }
    if (view.renewalTenure) {
      var tenureLabel = view.renewalTenure === 'newer' ? (view.renewalRisk && view.renewalRisk.newerLabel) : (view.renewalTenure === 'longer' ? (view.renewalRisk && view.renewalRisk.longerLabel) : 'Other');
      chips.push('<button type="button" class="filter-chip" data-clear-tenure>Renewal risk: ' + escapeHtml(tenureLabel || view.renewalTenure) + ' <span aria-hidden="true">×</span><span class="sr-only"> Remove</span></button>');
    }
    if (view.renewalBand) {
      chips.push('<button type="button" class="filter-chip" data-clear-band>Renewal risk: ' + escapeHtml(view.renewalBand) + ' visits <span aria-hidden="true">×</span><span class="sr-only"> Remove</span></button>');
    }
    if (!chips.length) return '';
    return '<div class="filter-chips" aria-label="Active filters">' + chips.join('') + '</div>';
  }

  function chipsFor(items, kind) {
    return '';
  }

  function multiMenu(view, kind) {
    var ui = view.ui || {};
    var open = ui.openMenu === kind;
    var typed = kind === 'company' ? (ui.companyFilter || '') : (ui.personFilter || '');
    var selected = kind === 'company' ? (view.companies || []) : (view.people || []);
    var options = kind === 'company' ? ((view.directory && view.directory.companies) || []) : ((view.personOptions) || []);
    var visible = options.filter(function (option) {
      var label = kind === 'company' ? option : option.name;
      if (!typed) return true;
      return String(label).toLowerCase().indexOf(typed.toLowerCase()) !== -1;
    });
    var summary = !selected.length ? (kind === 'company' ? 'All companies' : 'All attendees') : (selected.length > 2 ? selected.length + ' selected' : selected.join(', '));
    var boxes = visible.map(function (option) {
      var label = kind === 'company' ? option : option.name;
      var folded = String(label || '').trim().replace(/\s+/g, ' ').toLowerCase();
      var on = selected.some(function (item) {
        return item === label || String(item || '').trim().replace(/\s+/g, ' ').toLowerCase() === folded;
      });
      return '<label class="check"><input type="checkbox" data-' + kind + '-option="' + escapeHtml(label) + '"' + (on ? ' checked' : '') + '> ' + escapeHtml(label) + (on ? ' <span class="tick">✓</span>' : '') + '</label>';
    }).join('') || '<p class="empty-opt">' + (kind === 'company' ? 'No matches' : 'No attendees') + '</p>';
    var listName = kind === 'company' ? 'company' : 'attendee';
    return '<div class="multi' + (open ? ' is-open' : '') + '" data-menu="' + kind + '">' +
      '<button type="button" class="multi-face" data-menu-toggle="' + kind + '" aria-expanded="' + (open ? 'true' : 'false') + '" aria-label="' + (kind === 'company' ? 'Company' : 'Attendee') + '">' + escapeHtml(summary) + '</button>' +
      '<div class="multi-pop"' + (open ? '' : ' hidden') + '>' +
      '<input class="multi-find" data-find="' + kind + '" value="' + escapeHtml(typed) + '" placeholder="Type a name" aria-label="Filter ' + listName + ' list">' +
      '<div class="multi-list">' + boxes + '</div></div></div>';
  }

  function eventFilters(view) {
    var rows = (model.TYPES || []).map(function (type) {
      var on = (view.eventTypes || []).indexOf(type) !== -1;
      var count = (view.eventCounts && view.eventCounts[type]) || 0;
      return '<label class="check tog-check"><input type="checkbox" data-type-box="' + escapeHtml(type) + '"' + (on ? ' checked' : '') + '> <span class="tog-label">' + escapeHtml(type) + '</span>' +
        (on ? ' <span class="tick">✓</span>' : '') + ' <span class="n">' + count + '</span></label>';
    }).join('');
    var allCount = (view.eventCounts && view.eventCounts.all) || 0;
    var allLine = (view.eventTypes || []).length ? '' : '<p class="all-types"><span class="tick">✓</span> All event types, none checked</p>';
    return '<div class="rail-block"><div class="h">' + hint('Event type', 'Event type') + '</div>' +
      '<p class="range-count">All types in this range <b>' + allCount + '</b></p>' + allLine + rows + '</div>' +
      '<div class="rail-block"><div class="h">' + hint('Company', 'Company') + '</div>' + multiMenu(view, 'company') + '</div>' +
      '<div class="rail-block"><div class="h">' + hint('Attendee', 'Attendee') + '</div>' + multiMenu(view, 'person') + '</div>';
  }

  function visitSplit(view, w, h) {
    var pie = view.pie || { members: 0, guests: 0 };
    var members = pie.members || 0;
    var guests = pie.guests || 0;
    var showMissed = !!(view.noShows && view.noShows.ready);
    var missed = (view.noShows && view.noShows.noShows) || 0;
    var missedPct = (view.noShows && view.noShows.pct) || 0;
    var total = members + guests + missed;
    function share(count) { return total ? Math.round((count / total) * 100) : 0; }
    var memberPct = share(members);
    var guestPct = share(guests);
    if (!showMissed && total) guestPct = Math.max(0, 100 - memberPct);
    w = w || 420;
    h = h || 160;
    var barH = 56;
    var y = Math.round((h - barH) / 2);
    var rows = [
      { audience: 'Member', count: members, pct: memberPct, fill: '#3F768B', ink: '#fff', text: 'Members ' + members + ' \u00b7 ' + memberPct + '%', where: 'in' }
    ];
    rows.push({ audience: 'Guest', count: guests, pct: guestPct, fill: '#7D949C', ink: '#243033', text: 'Guests ' + guests + ' \u00b7 ' + guestPct + '%', where: 'in' });
    if (showMissed) {
      rows.push({ audience: 'No-show', count: missed, pct: missedPct, fill: CLAY, ink: '#fff', text: 'No-shows ' + missed + ' \u00b7 ' + missedPct + '%', where: 'above' });
    }
    var parts = [];
    var x = 0;
    rows.forEach(function (row) {
      var width = total ? (row.count / total) * w : w / rows.length;
      if (width <= 0) return;
      var need = row.text.length * 6.15;
      var inside = row.where === 'in' && width >= need;
      var on = row.audience && view.audience === row.audience;
      var dim = view.audience && row.audience !== view.audience ? ' opacity="0.35"' : '';
      var visitLabel = row.audience === 'Member' ? 'Members' : (row.audience === 'Guest' ? 'Guests' : 'No-shows');
      var click = ' class="filter-hit" data-audience="' + row.audience + '" tabindex="0" role="button" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="Visits: ' + visitLabel + '"';
      parts.push('<g' + click + '><rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + width.toFixed(1) + '" height="' + barH + '" fill="' + row.fill + '"' + dim +
        (on ? ' stroke="#243033" stroke-width="3"' : '') + '><title>' + escapeHtml(row.text) + (on ? ', selected' : '') + '</title></rect>');
      var tx = x + width / 2;
      var ty = y + barH / 2 + 4;
      var fill = row.ink;
      var anchor = 'middle';
      if (!inside) {
        fill = '#243033';
        if (row.where === 'above') {
          ty = y - 8;
          tx = Math.min(w - 4, x + width);
          anchor = 'end';
        } else {
          ty = y + barH + 16;
          var half = need / 2;
          if (tx < half) { tx = 4; anchor = 'start'; }
          else if (tx > w - half) { tx = w - 4; anchor = 'end'; }
        }
      }
      parts.push('<text x="' + tx.toFixed(1) + '" y="' + ty + '" text-anchor="' + anchor + '" font-size="12" font-weight="700" fill="' + fill + '" font-family="Montserrat, Raleway, sans-serif" pointer-events="none">' + escapeHtml(row.text) + '</text></g>');
      x += width;
    });
    var label = rows.map(function (row) { return row.text; }).join('. ');
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + escapeHtml(label) + '">' + parts.join('') + '</svg>';
  }

  function visitDonut(view) {
    var pie = view.pie || { members: 0, guests: 0, memberPct: 0, guestPct: 0 };
    var members = pie.members || 0;
    var guests = pie.guests || 0;
    var total = members + guests;
    var memberColor = '#3F768B';
    var guestColor = '#7D949C';
    var radius = 46;
    var circ = 2 * Math.PI * radius;
    var memberLen = total ? (members / total) * circ : 0;
    var svg = total
      ? '<svg class="donut" viewBox="0 0 140 140" role="img" aria-label="Member visits ' + members + ', ' + pie.memberPct + ' percent. Guest visits ' + guests + ', ' + pie.guestPct + ' percent.">' +
        '<circle cx="70" cy="70" r="' + radius + '" fill="none" stroke="' + guestColor + '" stroke-width="22"/>' +
        (members ? '<circle cx="70" cy="70" r="' + radius + '" fill="none" stroke="' + memberColor + '" stroke-width="22" stroke-dasharray="' + memberLen.toFixed(2) + ' ' + (circ - memberLen).toFixed(2) + '" transform="rotate(-90 70 70)"/>' : '') +
        '</svg>'
      : emptyChart('is-pie');
    function row(audience, label, count, pct, color) {
      var on = view.audience === audience;
      return '<button type="button" class="donut-label' + (on ? ' is-on' : '') + '" data-audience="' + audience + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        '<span class="swatch" style="background:' + color + '" aria-hidden="true"></span>' +
        escapeHtml(label) + ' ' + count + ' · ' + pct + '%' + (on ? ' <span class="tick">✓ Selected</span>' : '') + '</button>';
    }
    return '<div class="visit-donut">' + svg + '<div class="chart-key donut-labels">' +
      row('Member', 'Member visits', members, pie.memberPct, memberColor) +
      row('Guest', 'Guest visits', guests, pie.guestPct, guestColor) + '</div></div>';
  }

  function axisLabelOn(index, count, compact) {
    if (count <= 6) return true;
    if (!compact) return true;
    return index % 2 === 0 || index === count - 1;
  }

  function solidLineSvg(values, labels, kind, color, compact, w, h, ids, view) {
    var n = values.length || 1;
    w = w || (n > 8 ? Math.max(520, n * (compact ? 36 : 48)) : 420);
    h = h || (n > 6 ? (compact ? 180 : 200) : 150);
    var padX = 22;
    var padTop = 36;
    var yZero = h - 26;
    var plotH = yZero - padTop;
    var ymax = niceMax(values);
    var cw = (w - 2 * padX) / n;
    var lastIndex = n - 1;
    var maxIndex = 0;
    values.forEach(function (value, index) {
      if ((value || 0) >= (values[maxIndex] || 0)) maxIndex = index;
    });
    function xx(i) { return padX + (i + 0.5) * cw; }
    function yy(v) { return yZero - ((v || 0) / ymax) * plotH; }
    var parts = ['<line x1="' + padX + '" y1="' + yZero + '" x2="' + (w - padX) + '" y2="' + yZero + '" stroke="#d5dee2"/>'];
    var points = values.map(function (value, index) { return xx(index).toFixed(1) + ',' + yy(value).toFixed(1); }).join(' ');
    parts.push('<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>');
    values.forEach(function (value, index) {
      var x = xx(index);
      var y = yy(value);
      var tip = escapeHtml((labels[index] || '') + ' ' + value);
      var periodId = (ids && ids[index]) || '';
      var on = periodOn(view, periodId, '');
      parts.push(markOpen(on, (labels[index] || kind) + ' ' + value, 'data-period="' + escapeHtml(periodId) + '"'));
      parts.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="11" fill="transparent"' + (on ? ' stroke="#243033" stroke-width="2"' : '') + '><title>' + tip + '</title></circle>');
      parts.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.4" fill="' + color + '"' + (view && view.bucket && !on ? ' opacity="0.35"' : '') + '/>' + markClose());
      var crowded = n > 6;
      if (!crowded || index === lastIndex || index === maxIndex) {
        parts.push('<text x="' + x.toFixed(1) + '" y="' + (y - 14).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + INK + '" font-family="Montserrat, Raleway, sans-serif">' + value + '</text>');
      }
      if (axisLabelOn(index, n, compact)) {
        parts.push('<text x="' + x.toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="12" fill="#3d4c50" font-family="Montserrat, Raleway, sans-serif">' + escapeHtml(labels[index] || '') + '</text>');
      }
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + escapeHtml(kind) + '">' + parts.join('') + '</svg>';
  }

  function multiLineSvg(groups, key, kind, compact, view, w, h) {
    var sample = (groups[0] && groups[0].bars) || [];
    var n = groups.length || 1;
    w = w || Math.max(compact ? 420 : 560, n * (compact ? 34 : 46));
    h = h || (n > 6 ? (compact ? 200 : 220) : 180);
    var padX = 28;
    var yZero = h - 28;
    var plotTop = 36;
    var plotH = yZero - plotTop;
    var max = 1;
    groups.forEach(function (group) {
      (group.bars || []).forEach(function (bar) {
        if (!bar.skipped) max = Math.max(max, bar[key] || 0);
      });
    });
    var ymax = niceMax([max]);
    var cw = (w - 2 * padX) / n;
    function xx(i) { return padX + (i + 0.5) * cw; }
    function yy(v) { return yZero - ((v || 0) / ymax) * plotH; }
    var parts = ['<line x1="' + padX + '" y1="' + yZero + '" x2="' + (w - 12) + '" y2="' + yZero + '" stroke="#d5dee2"/>'];
    sample.forEach(function (seriesBar, seriesIndex) {
      var segment = [];
      var lastIndex = -1;
      var maxIndex = -1;
      var maxVal = -1;
      groups.forEach(function (group, index) {
        var bar = (group.bars || [])[seriesIndex];
        if (!bar || bar.skipped) return;
        lastIndex = index;
        if ((bar[key] || 0) >= maxVal) {
          maxVal = bar[key] || 0;
          maxIndex = index;
        }
      });
      function flush() {
        if (segment.length) {
          parts.push('<polyline points="' + segment.join(' ') + '" fill="none" stroke="' + seriesBar.color + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>');
        }
        segment = [];
      }
      groups.forEach(function (group, index) {
        var bar = (group.bars || [])[seriesIndex];
        if (!bar || bar.skipped) {
          flush();
          return;
        }
        var x = xx(index);
        var y = yy(bar[key]);
        segment.push(x.toFixed(1) + ',' + y.toFixed(1));
        var tip = escapeHtml(bar.label + ' ' + group.label + ' ' + (bar[key] || 0));
        var periodId = bar.start && bar.end ? bar.start + ':' + bar.end : '';
        var on = periodOn(view, periodId, '');
        parts.push(markOpen(on, bar.label + ' ' + group.label + ' ' + (bar[key] || 0), 'data-period="' + escapeHtml(periodId) + '"'));
        parts.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="11" fill="transparent"' + (on ? ' stroke="#243033" stroke-width="2"' : '') + '><title>' + tip + '</title></circle>');
        parts.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.2" fill="' + seriesBar.color + '"' + (view && view.bucket && !on ? ' opacity="0.35"' : '') + '/>' + markClose());
        var crowded = n > 6 || sample.length > 1;
        if (!crowded || index === lastIndex || index === maxIndex) {
          var dx = (seriesIndex - (sample.length - 1) / 2) * 16;
          parts.push('<text x="' + (x + dx).toFixed(1) + '" y="' + (y - 14).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + seriesBar.color + '" font-family="Montserrat, Raleway, sans-serif">' + (bar[key] || 0) + '</text>');
        }
      });
      flush();
    });
    groups.forEach(function (group, index) {
      if (!axisLabelOn(index, n, compact)) return;
      parts.push('<text x="' + xx(index).toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" font-size="12" fill="#3d4c50" font-family="Montserrat, Raleway, sans-serif">' + escapeHtml(group.label) + '</text>');
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + escapeHtml(kind) + ', one line per fiscal year">' + parts.join('') + '</svg>';
  }

  function groupedGainSvg(groups, compact, view, w, h) {
    var sample = (groups[0] && groups[0].bars) || [];
    var n = groups.length || 1;
    var seriesCount = Math.max(sample.length, 1);
    w = w || Math.max(compact ? 420 : 560, n * (compact ? 40 : 52));
    h = h || (compact ? 280 : 230);
    var labelSize = 12;
    var mid = Math.round(h * 0.52);
    var maxUp = 1;
    var maxDown = 1;
    groups.forEach(function (group) {
      (group.bars || []).forEach(function (bar) {
        if (bar.skipped) return;
        maxUp = Math.max(maxUp, bar.joins || 0);
        maxDown = Math.max(maxDown, bar.losses || 0);
      });
    });
    var sc = Math.min((mid - (compact ? 36 : 28)) / maxUp, (h - mid - (compact ? 44 : 32)) / maxDown);
    var slot = (w - 20) / n;
    var gap = 3;
    var bw = Math.max(8, Math.min(16, (slot - 12 - gap * (seriesCount - 1)) / seriesCount));
    var parts = ['<line x1="8" y1="' + mid + '" x2="' + (w - 8) + '" y2="' + mid + '" stroke="#9aa6a9"/>'];
    groups.forEach(function (group, index) {
      var totalW = seriesCount * bw + (seriesCount - 1) * gap;
      var left = 10 + index * slot + (slot - totalW) / 2;
      (group.bars || []).forEach(function (bar, barIndex) {
        if (bar.skipped) return;
        var x = left + barIndex * (bw + gap);
        var up = (bar.joins || 0) * sc;
        var down = (bar.losses || 0) * sc;
        var tip = escapeHtml(bar.label + ' ' + group.label + ' gained ' + (bar.joins || 0) + ', lost ' + (bar.losses || 0));
        var periodId = bar.start && bar.end ? bar.start + ':' + bar.end : '';
        var gainOn = periodOn(view, periodId, 'new');
        var lossOn = periodOn(view, periodId, 'lost');
        parts.push(markOpen(gainOn, 'New members ' + bar.label + ' ' + group.label, 'data-period="' + escapeHtml(periodId) + '" data-flow="new"'));
        parts.push('<rect x="' + x.toFixed(1) + '" y="' + (mid - up).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(up, 2).toFixed(1) + '" fill="' + (bar.color || TEAL) + '"' + (view && view.bucket && !gainOn ? ' opacity="0.35"' : '') + (gainOn ? ' stroke="#243033" stroke-width="2"' : '') + '><title>' + tip + '</title></rect>' + markClose());
        parts.push(markOpen(lossOn, 'Cancelled members ' + bar.label + ' ' + group.label, 'data-period="' + escapeHtml(periodId) + '" data-flow="lost"'));
        parts.push('<rect x="' + x.toFixed(1) + '" y="' + mid + '" width="' + bw.toFixed(1) + '" height="' + Math.max(down, 2).toFixed(1) + '" fill="' + (bar.color || TEAL) + '" opacity="' + (view && view.bucket && !lossOn ? '0.2' : '0.4') + '"' + (lossOn ? ' stroke="#243033" stroke-width="2"' : '') + '><title>' + tip + '</title></rect>' + markClose());
        if (bar.joins) parts.push('<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (mid - up - 4).toFixed(1) + '" text-anchor="middle" font-size="' + labelSize + '" font-weight="700" fill="' + INK + '" font-family="Montserrat, Raleway, sans-serif">' + bar.joins + '</text>');
        if (bar.losses) parts.push('<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (mid + down + labelSize).toFixed(1) + '" text-anchor="middle" font-size="' + labelSize + '" font-weight="700" fill="' + INK + '" font-family="Montserrat, Raleway, sans-serif">' + bar.losses + '</text>');
      });
      if (axisLabelOn(index, n, false)) {
        parts.push('<text x="' + (10 + index * slot + slot / 2).toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" font-size="' + labelSize + '" fill="#3d4c50" font-family="Montserrat, Raleway, sans-serif">' + escapeHtml(group.label) + '</text>');
      }
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Member gains above the line and losses below, by month">' + parts.join('') + '</svg>';
  }

  function eventTypeBars(view, w, h) {
    var counts = view.eventCounts || {};
    var selected = view.eventTypes || [];
    var names = ['Lunch & Learn', 'Ribbon Cutting', 'Happy Hour'];
    var rows = names.map(function (name) {
      return { name: name, value: counts[name] || 0 };
    });
    rows.sort(function (a, b) {
      if (b.value !== a.value) return b.value - a.value;
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
    w = w || 420;
    h = h || 150;
    var max = 1;
    rows.forEach(function (row) { if (row.value > max) max = row.value; });
    var labelW = 112;
    var countW = 32;
    var gap = 12;
    var barH = Math.max(16, Math.min(28, Math.floor((h - gap * (rows.length - 1)) / rows.length) - 4));
    var totalH = rows.length * barH + (rows.length - 1) * gap;
    var y0 = Math.max(4, Math.round((h - totalH) / 2));
    var plotW = Math.max(24, w - labelW - countW - 10);
    var parts = [];
    rows.forEach(function (row, index) {
      var y = y0 + index * (barH + gap);
      var bw = max ? (row.value / max) * plotW : 0;
      var cy = y + barH / 2 + 4;
      var on = selected.indexOf(row.name) !== -1;
      var dim = selected.length && !on ? ' opacity="0.35"' : '';
      var stroke = on ? ' stroke="#243033" stroke-width="3"' : '';
      parts.push('<g class="filter-hit" data-type="' + escapeHtml(row.name) + '" tabindex="0" role="button" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="Event type: ' + escapeHtml(row.name) + '">');
      parts.push('<text x="' + (labelW - 8) + '" y="' + cy + '" text-anchor="end" font-size="12" fill="#3d4c50" font-family="Montserrat, Raleway, sans-serif"' + dim + '>' + escapeHtml(row.name) + '</text>');
      if (bw > 0) {
        parts.push('<rect x="' + labelW + '" y="' + y + '" width="' + bw.toFixed(1) + '" height="' + barH + '" rx="2" fill="#3F768B"' + dim + stroke + '><title>' + escapeHtml(row.name) + ' ' + row.value + '</title></rect>');
      }
      parts.push('<text x="' + (labelW + bw + 6).toFixed(1) + '" y="' + cy + '" text-anchor="start" font-size="12" font-weight="700" fill="#243033" font-family="Montserrat, Raleway, sans-serif"' + dim + '>' + row.value + '</text></g>');
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Events held by event type">' + parts.join('') + '</svg>';
  }

  function chartFor(view, kind, w, h) {
    var title = kind === 'events' ? 'Events held' : (kind === 'noshows' ? 'No-shows' : 'Event visits');
    var key = kind === 'events' ? 'events' : (kind === 'noshows' ? 'noShows' : 'attendance');
    if (view.group === 'month' || view.group === 'quarter') {
      if (view.groups && view.groups.length) return multiLineSvg(view.groups, key, title, view.mobile, view, w, h);
      var values = kind === 'events' ? (view.eventSeries || []) : (kind === 'noshows' ? (view.noShowSeries || []) : (view.attendanceSeries || []));
      var labels = (view.monthBuckets || []).map(function (bucket) { return bucket.label; });
      var ids = (view.monthBuckets || []).map(function (bucket) { return bucket.id; });
      var color = (view.yearBars && view.yearBars[0] && view.yearBars[0].color) || TEAL;
      return solidLineSvg(values, labels, title, color, view.mobile, w, h, ids, view);
    }
    if (view.group === 'year' && view.yearBars) {
      return yearCountSvg(view.yearBars.map(function (bar) {
        return { label: bar.label, value: bar[key], color: bar.color, id: bar.start + ':' + bar.end };
      }), title, view, w, h);
    }
    if (view.groups) return groupedSvg(view.groups, key, title, view);
    var fallback = kind === 'events' ? (view.eventSeries || []) : (kind === 'noshows' ? (view.noShowSeries || []) : (view.attendanceSeries || []));
    var fallbackLabels = (view.monthBuckets || []).map(function (bucket) { return bucket.label; });
    var fallbackIds = (view.monthBuckets || []).map(function (bucket) { return bucket.id; });
    return solidLineSvg(fallback, fallbackLabels, title, TEAL, view.mobile, w, h, fallbackIds, view);
  }

  function membershipCombo(view, w, h) {
    var series = (view.gains || []).map(function (bucket) {
      return {
        id: bucket.id || '',
        label: bucket.label || '',
        joins: bucket.joins || 0,
        losses: bucket.losses || 0,
        active: bucket.active || 0
      };
    });
    if (series.length && view.members && view.members.value != null && !(view.focus && view.bucket)) series[series.length - 1].active = view.members.value;
    if (view.openingActive != null) {
      series.unshift({ id: '', label: 'Start', joins: 0, losses: 0, active: view.openingActive, opening: true });
    }
    if (!series.length) return emptyChart('is-gains');
    var n = series.length;
    w = w || 640;
    h = h || 240;
    var padL = 12;
    var padR = 16;
    var monthBand = 18;
    var plotBottom = h - monthBand;
    var lineTop = 16;
    var usable = Math.max(48, plotBottom - lineTop);
    var lineSpan = Math.max(28, Math.round(usable * 0.3));
    var lineBot = lineTop + lineSpan;
    var barCeiling = lineBot + 20;
    var maxBar = 1;
    var minAct = series[0].active;
    var maxAct = series[0].active;
    series.forEach(function (bucket) {
      maxBar = Math.max(maxBar, bucket.joins, bucket.losses);
      if (bucket.active < minAct) minAct = bucket.active;
      if (bucket.active > maxAct) maxAct = bucket.active;
    });
    var lossLabel = 14;
    var base = Math.round((barCeiling + plotBottom - lossLabel) / 2);
    if (base < barCeiling + 18) base = barCeiling + 18;
    var upRoom = Math.max(12, base - barCeiling);
    var downRoom = Math.max(12, plotBottom - lossLabel - base);
    var barScale = Math.min(upRoom, downRoom) / maxBar;
    var actPad = Math.max(1, Math.round((maxAct - minAct) * 0.35) || 1);
    var actMin = minAct - actPad;
    var actMax = maxAct + actPad;
    if (actMax <= actMin) actMax = actMin + 1;
    var slot = (w - padL - padR) / n;
    var gap = 4;
    var bw = Math.max(8, Math.min(22, (slot * 0.62 - gap) / 2));
    var parts = [
      '<line x1="' + padL + '" y1="' + base + '" x2="' + (w - padR) + '" y2="' + base + '" stroke="#9aa6a9"/>',
      '<line x1="' + (w - 8) + '" y1="' + lineTop + '" x2="' + (w - 8) + '" y2="' + lineBot + '" stroke="#c5d0d4"/>'
    ];
    function cxOf(index) { return padL + index * slot + slot / 2; }
    function barH(value) { return Math.max(value ? 2 : 0, value * barScale); }
    function lineY(value) { return lineBot - ((value - actMin) / (actMax - actMin)) * (lineBot - lineTop); }
    var points = [];
    series.forEach(function (bucket, index) {
      var cx = cxOf(index);
      var xNew = cx - gap / 2 - bw;
      var xCan = cx + gap / 2;
      var up = barH(bucket.joins);
      var down = barH(bucket.losses);
      if (!bucket.opening) {
        var gainOn = periodOn(view, bucket.id, 'new');
        var lossOn = periodOn(view, bucket.id, 'lost');
        parts.push(markOpen(gainOn, 'New members ' + bucket.label, 'data-period="' + escapeHtml(bucket.id) + '" data-flow="new"'));
        parts.push('<rect x="' + xNew.toFixed(1) + '" y="' + (base - up).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(up, 2).toFixed(1) + '" fill="' + TEAL + '"' + (view.bucket && !gainOn ? ' opacity="0.35"' : '') + (gainOn ? ' stroke="#243033" stroke-width="2"' : '') + '><title>New ' + bucket.joins + '</title></rect>' + markClose());
        parts.push(markOpen(lossOn, 'Cancelled members ' + bucket.label, 'data-period="' + escapeHtml(bucket.id) + '" data-flow="lost"'));
        parts.push('<rect x="' + xCan.toFixed(1) + '" y="' + base + '" width="' + bw.toFixed(1) + '" height="' + Math.max(down, 2).toFixed(1) + '" fill="' + CLAY + '"' + (view.bucket && !lossOn ? ' opacity="0.35"' : '') + (lossOn ? ' stroke="#243033" stroke-width="2"' : '') + '><title>Cancelled ' + bucket.losses + '</title></rect>' + markClose());
        parts.push('<text x="' + (xNew + bw / 2).toFixed(1) + '" y="' + (base - up - 4).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + INK + '" font-family="Montserrat, Raleway, sans-serif">' + bucket.joins + '</text>');
        parts.push('<text x="' + (xCan + bw / 2).toFixed(1) + '" y="' + (base + down + 12).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + INK + '" font-family="Montserrat, Raleway, sans-serif">' + bucket.losses + '</text>');
      }
      var y = lineY(bucket.active);
      points.push(cx.toFixed(1) + ',' + y.toFixed(1));
      parts.push('<text x="' + cx.toFixed(1) + '" y="' + (h - 4) + '" text-anchor="middle" font-size="12" fill="#3d4c50" font-family="Montserrat, Raleway, sans-serif">' + escapeHtml(bucket.label) + '</text>');
    });
    parts.push('<polyline points="' + points.join(' ') + '" fill="none" stroke="#243033" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>');
    series.forEach(function (bucket, index) {
      var cx = cxOf(index);
      var y = lineY(bucket.active);
      var pointOn = !bucket.opening && periodOn(view, bucket.id, '');
      var pointLabel = bucket.opening ? 'Opening stock ' + bucket.active : 'End of ' + bucket.label + ', ' + bucket.active + ' active members';
      var pointAttrs = bucket.opening ? '' : 'data-period="' + escapeHtml(bucket.id) + '"';
      parts.push(bucket.opening ? '<g>' : markOpen(pointOn, pointLabel, pointAttrs));
      parts.push('<circle cx="' + cx.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="11" fill="transparent"' + (pointOn ? ' stroke="#243033" stroke-width="2"' : '') + '><title>' + escapeHtml(pointLabel) + '</title></circle>');
      parts.push('<circle cx="' + cx.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.4" fill="#243033"' + (view.bucket && !bucket.opening && !pointOn ? ' opacity="0.35"' : '') + '/>' + (bucket.opening ? '</g>' : markClose()));
      var valueY = pointOn ? y - 22 : y - 14;
      if (valueY < 12) valueY = y + 18;
      parts.push('<text x="' + cx.toFixed(1) + '" y="' + valueY.toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#243033" font-family="Montserrat, Raleway, sans-serif">' + bucket.active + '</text>');
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="New and cancelled members by period, with active members ending at ' + series[series.length - 1].active + '">' + parts.join('') + '</svg>';
  }

  function businessTypeRows(view) {
    var otherName = 'Other / not listed';
    var other = null;
    var rows = [];
    (view.businessTypes || []).forEach(function (row) {
      var name = row.label || row.category || '';
      var value = row.count || 0;
      if (!name || !value) return;
      if (name === otherName) other = { name: name, value: value };
      else rows.push({ name: name, value: value });
    });
    rows.sort(function (a, b) {
      if (b.value !== a.value) return b.value - a.value;
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
    if (other) rows.push(other);
    return rows;
  }

  function businessTypeBars(view, w, slotH) {
    var rows = businessTypeRows(view);
    if (!rows.length) return '';
    var barH = 16;
    var gap = 8;
    var pitch = barH + gap;
    if (slotH && slotH >= pitch) {
      var fit = Math.max(1, Math.floor((slotH - 4) / pitch));
      var other = rows[rows.length - 1].name === 'Other / not listed' ? rows[rows.length - 1] : null;
      var named = other ? rows.slice(0, -1) : rows;
      if (other && fit >= 2) rows = named.slice(0, fit - 1).concat([other]);
      else rows = named.slice(0, fit);
    }
    w = w || 320;
    var longest = 0;
    rows.forEach(function (row) { if (row.name.length > longest) longest = row.name.length; });
    var labelW = Math.min(Math.round(longest * 6.35) + 10, Math.max(120, w - 88));
    var countW = 36;
    var h = 8 + rows.length * pitch;
    var max = 1;
    rows.forEach(function (row) { if (row.value > max) max = row.value; });
    var plotW = Math.max(24, w - labelW - countW - 8);
    var picked = view.selectedBusinessTypes || [];
    var parts = [];
    rows.forEach(function (row, index) {
      var y = 6 + index * (barH + gap);
      var bw = max ? (row.value / max) * plotW : 0;
      var cy = y + barH / 2 + 4;
      var on = picked.indexOf(row.name) !== -1;
      var dim = picked.length && !on ? ' opacity="0.35"' : '';
      var stroke = on ? ' stroke="#243033" stroke-width="3"' : '';
      parts.push('<g class="filter-hit" data-business-type="' + escapeHtml(row.name) + '" tabindex="0" role="button" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="Business type: ' + escapeHtml(row.name) + '">');
      parts.push('<text x="' + (labelW - 8) + '" y="' + cy + '" text-anchor="end" font-size="12" fill="#3d4c50" font-family="Montserrat, Raleway, sans-serif"' + dim + '>' + escapeHtml(row.name) + '</text>');
      if (bw > 0) parts.push('<rect x="' + labelW + '" y="' + y + '" width="' + Math.max(bw, 2).toFixed(1) + '" height="' + barH + '" rx="2" fill="#3F768B"' + dim + stroke + '><title>' + escapeHtml(row.name) + ' ' + row.value + '</title></rect>');
      parts.push('<text x="' + (labelW + Math.max(bw, 2) + 6).toFixed(1) + '" y="' + cy + '" text-anchor="start" font-size="12" font-weight="700" fill="#243033" font-family="Montserrat, Raleway, sans-serif"' + dim + '>' + row.value + '</text></g>');
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Members by business type">' + parts.join('') + '</svg>';
  }

  function membershipComboKey() {
    return '<div class="chart-key"><span class="key-item"><i style="background:' + TEAL + '"></i>New</span>' +
      '<span class="key-item"><i style="background:' + CLAY + '"></i>Cancelled</span>' +
      '<span class="key-item"><i class="key-line"></i>Active members</span></div>';
  }

  function gainsChart(view, w, h) {
    if (view.group === 'year') return gainsSvg(view.gains, view, w, h);
    if (view.groups) return groupedGainSvg(view.groups, !!view.mobile, view, w, h);
    return gainsSvg(view.gains, view, w, h);
  }

  function ytdLine(view) {
    return view.ytdNote ? '<p class="ytd-note">' + escapeHtml(view.ytdNote) + '</p>' : '';
  }

  function periodTag(metric) {
    return '<p class="period-tag">' + (metric && metric.tag ? escapeHtml(metric.tag) : '\u00a0') + '</p>';
  }

  function legendItems(view) {
    if (view.group !== 'year' && view.groups && view.groups[0] && view.groups[0].bars && view.groups[0].bars.length) {
      return view.groups[0].bars;
    }
    return view.yearBars || [];
  }

  function chartKey(items, gainedLost) {
    var list = items || [];
    if (!gainedLost && list.length < 2) return '';
    var lead = gainedLost
      ? '<span class="key-item"><i class="key-gained"></i>Gained</span><span class="key-item"><i class="key-lost"></i>Lost</span>'
      : '';
    var shown = gainedLost && list.length < 2 ? [] : list;
    return '<div class="chart-key">' + lead + shown.map(function (item) {
      return '<span class="key-item"><i style="background:' + (item.color || '#3F768B') + '"></i>' + escapeHtml(item.label) + '</span>';
    }).join('') + '</div>';
  }

  function gainPairKey(view) {
    var legend = view.gainLegend || { current: 'This FY', prior: 'Last FY' };
    return '<div class="chart-key"><span class="key-item"><i style="background:' + TEAL + '"></i>' + escapeHtml(legend.current) + '</span>' +
      '<span class="key-item"><i style="background:' + MUTED + '"></i>' + escapeHtml(legend.prior) + '</span></div>';
  }

  function gainsCard(view) {
    var legend = view.group === 'year' ? chartKey(legendItems(view)) : gainPairKey(view);
    return card('Member gains and losses', 'Member Gains and Losses',
      '<div class="chart-slot" data-chart="gains">' + gainsChart(view) + '</div>' + legend,
      ' card-gains', 'changes', 'View the member list');
  }

  function overview(view) {
    var netTone = view.net.value > 0 ? 'up' : view.net.value < 0 ? 'down' : 'flat';
    var showMissed = !!(view.noShows && view.noShows.ready && view.noShows.noShows > 0);
    var visitTitle = showMissed ? 'Visits and no-shows' : 'Member and guest visits';
    return '<div class="kpi-row">' +
      card('Active member businesses', 'Members', '<p class="kpi-num">' + view.members.value + '</p>' + periodTag(view.members), ' card-kpi kpi-members', 'page:membership', 'View membership details') +
      card('Net membership change', 'Net Gain', '<p class="kpi-num tone-' + netTone + '">' + signed(view.net.value) + '</p>', ' card-kpi kpi-net', 'page:membership', 'View membership details') +
      card('Events held', 'Events Held', '<p class="kpi-num">' + view.events.value + '</p>', ' card-kpi kpi-events', 'page:events', 'View events and attendance') +
      card('Total event visits', 'Attendance', '<p class="kpi-num">' + view.attendance.value + '</p>', ' card-kpi kpi-visits', 'page:events', 'View events and attendance') +
      '</div><div class="chart-grid">' + gainsCard(view) +
      card('Events held', 'Events Held', '<div class="chart-slot" data-chart="event-types">' + eventTypeBars(view) + '</div>', ' card-events', 'page:events', 'View events and attendance') +
      card('Total event visits', 'Attendance', '<div class="chart-slot" data-chart="visits">' + chartFor(view, 'visits') + '</div>' + chartKey(legendItems(view)), ' card-attendance', 'page:events', 'View events and attendance') +
      card(visitTitle, visitTitle === 'Visits and no-shows' ? 'Visits and no-shows' : 'Attendance Distribution', '<div class="chart-slot" data-chart="split">' + visitSplit(view) + '</div>', ' card-pie', 'attendance', 'View the visit list') +
      '</div>';
  }

  function numberBlock(text, tone) {
    return '<p class="kpi-num tone-' + tone + '">' + text + '</p>';
  }

  function membership(view) {
    return '<div class="detail-grid">' +
      card('Active member businesses', 'Members', numberBlock(String(view.members.value), 'flat') + periodTag(view.members), ' card-members kpi-members', 'members', 'View the member list') +
      card('New members', 'New Members', numberBlock(String(view.newMembers.value), view.newMembers.tone), ' kpi-members', 'newMembers', 'View who joined') +
      card('Net membership change', 'Net Gain', numberBlock(signed(view.net.value), view.net.tone), ' kpi-net', 'changes', 'View membership change') +
      card('Member gains and losses', 'Membership combo', '<div class="chart-slot" data-chart="combo">' + membershipCombo(view) + '</div>' + membershipComboKey(), ' card-gains', 'changes', 'View the member list') +
      (businessTypeRows(view).length ? card('Members by business type', 'Members by business type', '<div class="chart-slot" data-chart="types">' + businessTypeBars(view) + '</div>', ' card-types', 'businesses', 'View the member list') : '') +
      '</div>';
  }

  function noShowCard(view) {
    var metric = view.noShows || { noShows: 0, signups: 0, pct: 0, tag: '', parts: null, ready: false, limited: false };
    if (!metric.ready) {
      return card('No-shows', 'No-shows', '<p class="period-tag">Sign-up status is not in this feed yet.</p>', ' card-noshow kpi-noshow', '', '');
    }
    var tag = '<p class="period-tag">of ' + metric.signups + ' sign-ups · ' + metric.pct + '%</p>';
    return card('No-shows', 'No-shows',
      '<p class="kpi-num">' + metric.noShows + '</p>' + tag +
      '<div class="chart-slot" data-chart="noshows">' + chartFor(view, 'noshows') + '</div>' + chartKey(legendItems(view)),
      ' card-noshow kpi-noshow', 'noshows', 'View the no-show list');
  }

  function shortNewerLabel(label) {
    var match = String(label || '').match(/(\d{4})\s*[\u2013-]\s*(\d{4})/);
    if (!match) return 'Joined 2022\u201325';
    return 'Joined ' + match[1] + '\u2013' + match[2].slice(2);
  }

  function shortLongerLabel(label) {
    var match = String(label || '').match(/(\d{4})/);
    if (!match) return 'Joined 2021 or earlier';
    return 'Joined ' + match[1] + ' or earlier';
  }

  function lapseChart(bands, view, w, h) {
    var rows = bands && bands.length ? bands : [];
    w = w || 420;
    h = h || 150;
    var max = 1;
    rows.forEach(function (row) { if ((row.members || 0) > max) max = row.members; });
    var n = rows.length || 1;
    var col = w / n;
    var bw = Math.max(18, Math.min(48, col * 0.42));
    var base = h - 20;
    var plot = Math.max(8, base - 22);
    var parts = ['<line x1="8" y1="' + base + '" x2="' + (w - 8) + '" y2="' + base + '" stroke="#d5dee2"/>'];
    rows.forEach(function (row, index) {
      var members = row.members || 0;
      var lapsed = row.lapsed || 0;
      var pct = members ? Math.round((lapsed / members) * 100) : 0;
      var tip = members + ' members, ' + lapsed + ' lapsed \u00b7 ' + pct + '%';
      var height = (members / max) * plot;
      var barH = Math.max(height, members ? 2 : 2);
      var cx = (index + 0.5) * col;
      var x = Math.max(4, cx - bw / 2);
      var y = base - barH;
      var color = members ? '#3F768B' : '#7D949C';
      var bandOn = view && view.renewalBand === row.band;
      var bandDim = view && view.renewalBand && !bandOn ? ' opacity="0.35"' : '';
      var label = String(members);
      parts.push(markOpen(bandOn, 'Renewal risk: ' + row.band + ' visits', 'data-renewal-band="' + escapeHtml(row.band || '') + '"'));
      parts.push('<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + barH.toFixed(1) + '" fill="' + color + '"' + bandDim + (bandOn ? ' stroke="#243033" stroke-width="3"' : '') + '><title>' + escapeHtml(tip) + '</title></rect>' + markClose());
      parts.push('<text x="' + cx.toFixed(1) + '" y="' + Math.max(14, y - 6).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + INK + '" font-family="Montserrat, Raleway, sans-serif">' + label + '</text>');
      var estimate = String(row.band).length * 7.2;
      var squeeze = estimate > col - 8 ? ' textLength="' + Math.max(12, col - 8).toFixed(1) + '" lengthAdjust="spacingAndGlyphs"' : '';
      parts.push('<text x="' + cx.toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="12" fill="#3d4c50" font-family="Montserrat, Raleway, sans-serif"' + squeeze + '>' + escapeHtml(row.band) + '</text>');
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Lapses by events attended">' + parts.join('') + '</svg>';
  }

  function renewalCard(view) {
    var risk = view.renewalRisk;
    if (!risk) {
      return card('Renewal risk', 'Renewal risk', '<p class="period-tag">These totals are not in this feed yet.</p>', ' card-renewal kpi-renewal', '', '');
    }
    var active = risk.cohort != null ? risk.cohort : (view.members && view.members.value != null ? view.members.value : 0);
    var pct = risk.pct != null ? risk.pct : (active ? Math.round((risk.zeroAttendance / active) * 100) : 0);
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    var tenure = risk.byTenure || {};
    var unknown = tenure.unknown || 0;
    var thisYear = tenure.thisYear || 0;
    var other = unknown + thisYear;
    var cycle = 0;
    (risk.lapseByBand || []).forEach(function (row) { cycle += row.members || 0; });
    function tenureButton(key, label, value, riskClass) {
      var on = view.renewalTenure === key;
      return '<button type="button" class="filter-hit tenure-hit' + (on ? ' is-on' : '') + '" data-renewal-tenure="' + key + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        '<div class="pl">' + escapeHtml(label) + '</div><div class="pv' + (riskClass ? ' is-risk' : '') + '">' + value + '</div></button>';
    }
    var parts = '<div class="pr">' +
      tenureButton('newer', shortNewerLabel(risk.newerLabel), tenure.newer || 0, true) +
      tenureButton('longer', shortLongerLabel(risk.longerLabel), tenure.longer || 0, false) +
      tenureButton('other', 'Other', other, false) + '</div>';
    var tip = ' Other is ' + unknown + ' with no join date and ' + thisYear + ' who joined this fiscal year. Last renewal year: ' + cycle + ' members, by events attended.';
    return card('Renewal risk', 'Renewal risk',
      '<p class="kpi-num">' + risk.zeroAttendance + '</p>' +
      '<p class="period-tag">of ' + active + ' members · ' + pct + '%</p>' +
      parts +
      '<div class="chart-slot" data-chart="lapse">' + lapseChart(risk.lapseByBand, view) + '</div>',
      ' card-renewal kpi-renewal', 'renewal', 'View the member list', tip);
  }

  function eventsPage(view) {
    var showMissed = !!(view.noShows && view.noShows.ready && view.noShows.noShows > 0);
    var visitTitle = showMissed ? 'Visits and no-shows' : 'Member and guest visits';
    return '<div class="detail-grid">' +
      card('Events held', 'Events Held', numberBlock(String(view.events.value), view.events.tone) + '<div class="chart-slot" data-chart="event-types">' + eventTypeBars(view) + '</div>', ' card-events kpi-events', 'events', 'View the event list') +
      card('Total event visits', 'Attendance', numberBlock(String(view.attendance.value), view.attendance.tone) + '<div class="chart-slot" data-chart="visits">' + chartFor(view, 'visits') + '</div>' + chartKey(legendItems(view)), ' card-attendance kpi-visits', 'attendance', 'View the visit list') +
      noShowCard(view) +
      renewalCard(view) +
      card(visitTitle, visitTitle === 'Visits and no-shows' ? 'Visits and no-shows' : 'Attendance Distribution', '<div class="chart-slot" data-chart="split">' + visitSplit(view) + '</div>', ' card-pie', 'attendance', 'View the visit list') +
      '</div>';
  }

  function drillPanel(view) {
    var drill = view.drill;
    if (!drill) return '';
    var pack = drill.pack || { columns: [], rows: [], title: 'Records' };
    var shown = pack.shown || pack.rows || [];
    var count = shown.length;
    var heads = (pack.columns || []).map(function (column) {
      var mark = drill.sort === column.key ? (drill.dir === 'desc' ? ' ▼' : ' ▲') : '';
      return '<th><button type="button" data-sort="' + escapeHtml(column.key) + '">' + escapeHtml(column.label) + mark + '</button></th>';
    }).join('');
    var body = shown.map(function (row) {
      return '<tr>' + (pack.columns || []).map(function (column) {
        return '<td>' + escapeHtml(row[column.key] == null ? '' : row[column.key]) + '</td>';
      }).join('') + '</tr>';
    }).join('') || '<tr><td colspan="' + Math.max(1, (pack.columns || []).length) + '">No matches</td></tr>';
    var badge = view.example ? '<span class="example-badge">Example data</span>' : '';
    return '<div class="drill-back" data-drill-close></div><section class="drill" role="dialog" aria-label="' + escapeHtml(pack.title) + '">' +
      '<header class="drill-bar"><button type="button" class="drill-back-btn" data-drill-close>Back</button><h2>' + escapeHtml(pack.title) + '</h2>' + badge + '</header>' +
      '<div class="drill-tools"><input data-drill-search value="' + escapeHtml(drill.q || '') + '" placeholder="Search these records" aria-label="Search these records">' +
      '<div class="export-menu"><button type="button" class="drill-export" data-export-toggle aria-haspopup="menu" aria-expanded="' + (drill.exportOpen ? 'true' : 'false') + '" aria-controls="export-menu">Export</button>' +
      '<div class="export-pop" id="export-menu" role="menu"' + (drill.exportOpen ? '' : ' hidden') + '>' +
      '<button type="button" role="menuitem" data-export="csv">CSV</button>' +
      '<button type="button" role="menuitem" data-export="xlsx">Excel</button></div></div>' +
      '<p class="record-count">' + count + ' records</p></div>' +
      '<div class="drill-scroll"><table class="drill-table"><thead><tr>' + heads + '</tr></thead><tbody>' + body + '</tbody></table></div></section>';
  }

  function render(view) {
    exampleFlags = view.example === true;
    var page = view.page === 'membership' || view.page === 'events' ? view.page : 'overview';
    var filtersOpen = !!(view.ui && view.ui.filtersOpen);
    var side = page === 'events'
      ? '<aside class="side' + (filtersOpen ? ' is-open' : '') + '" id="filters">' + eventFilters(view) + '</aside>'
      : '';
    var filterBtn = page === 'events'
      ? '<button type="button" class="filters-btn" data-filters aria-expanded="' + (filtersOpen ? 'true' : 'false') + '" aria-controls="filters">Filters' + (view.filtersActive ? ' <span class="tick">✓</span>' : '') + '</button>'
      : '';
    var emptyNote = '';
    if (view.filtersActive && page === 'events' && view.events && view.events.value === 0) emptyNote = '<p class="no-matches" role="status">No matches</p>';
    if (view.filtersActive && page === 'membership' && view.members && view.members.value === 0) emptyNote = '<p class="no-matches" role="status">No matches</p>';
    var body = emptyNote + (page === 'membership' ? membership(view) : (page === 'events' ? eventsPage(view) : overview(view)));
    var tipExtra = '';
    if (view.ytdNote) tipExtra += ' ' + view.ytdNote;
    if (page === 'membership') tipExtra += ' Event type, company, and attendee do not change these membership numbers. Business type, renewal risk, and a joined or cancelled selection do. A guest visit counts when that visit’s company matches a selected member business.';
    var contextTip = tipExtra ? hint('', view.ytdNote ? 'Year to date' : 'Membership filters', true, tipExtra) : '';
    return docbar(view) + '<div class="shell">' + viewTabs(view) + controls(view) +
      '<p class="context-line">' + escapeHtml(view.contextLine || '') + contextTip + '</p>' + filterBtn +
      '<div class="body">' + side + '<div class="main" id="content">' + body + '</div></div></div>' +
      '<footer class="sig"><span class="credit">Powered by Donny C. Nguyen</span></footer>' + drillPanel(view);
  }

  var chartObserver = null;

  function fitCharts(root, view) {
    if (!root || !view) return;
    if (chartObserver) chartObserver.disconnect();
    var hosts = root.querySelectorAll('[data-chart]');
    function draw(host) {
      var w = Math.floor(host.clientWidth);
      var h = Math.floor(host.clientHeight);
      var kind = host.getAttribute('data-chart');
      if (kind === 'types') {
        if (w < 40 || h < 24) return;
        if (host._chartW === w && host._chartH === h) return;
        host._chartW = w;
        host._chartH = h;
        host.innerHTML = businessTypeBars(view, w, h);
        return;
      }
      if (w < 40 || h < 40) return;
      if (host._chartW === w && host._chartH === h) return;
      host._chartW = w;
      host._chartH = h;
      var svg = '';
      if (kind === 'gains') svg = gainsChart(view, w, h);
      else if (kind === 'combo') svg = membershipCombo(view, w, h);
      else if (kind === 'lapse') svg = lapseChart((view.renewalRisk && view.renewalRisk.lapseByBand) || [], view, w, h);
      else if (kind === 'event-types') svg = eventTypeBars(view, w, h);
      else if (kind === 'split') svg = visitSplit(view, w, h);
      else svg = chartFor(view, kind, w, h);
      host.innerHTML = svg;
    }
    Array.prototype.forEach.call(hosts, draw);
    if (typeof ResizeObserver === 'function') {
      chartObserver = new ResizeObserver(function (entries) {
        entries.forEach(function (entry) { draw(entry.target); });
      });
      Array.prototype.forEach.call(hosts, function (host) { chartObserver.observe(host); });
    }
  }

  root.ABADashboardView = { render: render, escapeHtml: escapeHtml, fitCharts: fitCharts };
})(typeof window !== 'undefined' ? window : globalThis);
