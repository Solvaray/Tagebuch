/* Tagebuch – Statistik / Diagramme
   Eigenständig, ohne Abhängigkeiten, offline-fähig.
   Liest die Einträge direkt aus dem localStorage und rendert reines SVG. */
(function () {
  'use strict';

  var STORAGE_KEY = 'tagebuch_entries_v1';
  var DAY = 86400000;

  var state = { range: 30, focus: '*', metric: 'auto' };
  var sheet = null;

  // ---------- Daten ----------
  function loadEntries() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function dayKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function num(v) {
    return (v == null || isNaN(v)) ? '–' : Number(v).toLocaleString('de-DE', { maximumFractionDigits: 2 });
  }

  function matchesFocus(e, focus) {
    if (focus === '*') return true;
    if (focus.indexOf('c:') === 0) return (e.category || 'Sonstiges') === focus.slice(2);
    if (focus.indexOf('n:') === 0) return e.name === focus.slice(2);
    return true;
  }

  /* Einheit nur dann summierbar, wenn im Fokus genau eine Einheit vorkommt.
     Sonst würden mg + Stück zu einer sinnlosen Zahl addiert. */
  function unitInfo(entries) {
    var units = {}, withAmount = 0;
    entries.forEach(function (e) {
      if (e.amount != null && e.amount !== '' && !isNaN(e.amount)) {
        withAmount++;
        var u = (e.unit || '').trim();
        units[u] = (units[u] || 0) + 1;
      }
    });
    var keys = Object.keys(units);
    return { summable: withAmount > 0 && keys.length === 1, unit: keys.length === 1 ? keys[0] : '', withAmount: withAmount };
  }

  function buildSeries(all, days, focus, useSum) {
    var end = startOfDay(new Date());
    var start = new Date(end.getTime() - (days - 1) * DAY);
    var buckets = {}, labels = [], dates = [];
    for (var i = 0; i < days; i++) {
      var d = new Date(start.getTime() + i * DAY);
      buckets[dayKey(d)] = 0;
      dates.push(d);
      labels.push(String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0'));
    }
    var inRange = 0, prev = 0;
    var prevStart = new Date(start.getTime() - days * DAY);
    all.forEach(function (e) {
      if (!matchesFocus(e, focus)) return;
      var t = new Date(e.time);
      if (isNaN(t)) return;
      var val = useSum ? (Number(e.amount) || 0) : 1;
      var k = dayKey(t);
      if (k in buckets) { buckets[k] += val; inRange += val; }
      else if (t >= prevStart && t < start) { prev += val; }
    });
    return { values: dates.map(function (d) { return buckets[dayKey(d)]; }), labels: labels, dates: dates, total: inRange, prevTotal: prev };
  }

  function movingAverage(values, window) {
    return values.map(function (_, i) {
      var from = Math.max(0, i - window + 1), sum = 0, n = 0;
      for (var j = from; j <= i; j++) { sum += values[j]; n++; }
      return sum / n;
    });
  }

  // ---------- SVG-Bausteine ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function barChart(series, avg, unitLabel) {
    var W = 560, H = 200, padL = 6, padR = 6, padB = 22, padT = 14;
    var n = series.values.length;
    var max = Math.max.apply(null, series.values.concat([1]));
    var innerW = W - padL - padR, innerH = H - padT - padB;
    var slot = innerW / n;
    var bw = Math.max(1.5, Math.min(slot - (n > 45 ? 1 : 2), 26));
    var bars = '', ticks = '';
    var every = n <= 10 ? 1 : Math.ceil(n / 7);

    series.values.forEach(function (v, i) {
      var h = max ? (v / max) * innerH : 0;
      var x = padL + slot * i + (slot - bw) / 2;
      var y = padT + innerH - h;
      if (v > 0) {
        bars += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) +
          '" height="' + Math.max(h, 2).toFixed(1) + '" rx="' + Math.min(3, bw / 2).toFixed(1) + '" fill="var(--accent)" opacity=".85"></rect>';
      } else {
        bars += '<rect x="' + x.toFixed(1) + '" y="' + (padT + innerH - 2) + '" width="' + bw.toFixed(1) +
          '" height="2" rx="1" fill="var(--border)"></rect>';
      }
      if (i % every === 0 || i === n - 1) {
        ticks += '<text x="' + (padL + slot * i + slot / 2).toFixed(1) + '" y="' + (H - 6) +
          '" text-anchor="middle" font-size="10" fill="var(--text-dim)" font-family="JetBrains Mono, monospace">' + series.labels[i] + '</text>';
      }
    });

    var pts = avg.map(function (v, i) {
      var x = padL + slot * i + slot / 2;
      var y = padT + innerH - (max ? (v / max) * innerH : 0);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img" aria-label="Tagesverlauf">' +
      '<line x1="' + padL + '" y1="' + (padT + innerH) + '" x2="' + (W - padR) + '" y2="' + (padT + innerH) + '" stroke="var(--border)" stroke-width="1"></line>' +
      bars +
      '<polyline points="' + pts + '" fill="none" stroke="#d9b26a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity=".9"></polyline>' +
      ticks +
      '<text x="' + padL + '" y="10" font-size="10" fill="var(--text-dim)" font-family="JetBrains Mono, monospace">max ' + esc(num(max)) + (unitLabel ? ' ' + esc(unitLabel) : '') + '</text>' +
      '</svg>';
  }

  function hBars(items, unitLabel) {
    if (!items.length) return '<div class="stats-empty">Keine Daten</div>';
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    return '<div class="hbars">' + items.map(function (it) {
      var pct = (it.value / max) * 100;
      return '<div class="hbar-row">' +
        '<div class="hbar-label" title="' + esc(it.label) + '">' + esc(it.label) + '</div>' +
        '<div class="hbar-track"><div class="hbar-fill" style="width:' + pct.toFixed(1) + '%"></div></div>' +
        '<div class="hbar-val mono">' + esc(num(it.value)) + (unitLabel ? ' ' + esc(unitLabel) : '') + '</div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function miniBars(values, labels) {
    var max = Math.max.apply(null, values.concat([1]));
    return '<div class="minibars">' + values.map(function (v, i) {
      var h = Math.max(2, (v / max) * 58);
      return '<div class="minibar" title="' + esc(labels[i] + ': ' + num(v)) + '">' +
        '<div class="minibar-fill" style="height:' + h.toFixed(1) + 'px"></div>' +
        '<div class="minibar-label">' + esc(labels[i]) + '</div></div>';
    }).join('') + '</div>';
  }

  // ---------- Auswertung ----------
  function render() {
    var all = loadEntries();
    var focused = all.filter(function (e) { return matchesFocus(e, state.focus); });
    var ui = unitInfo(focused);
    var useSum = ui.summable && state.metric !== 'anzahl';
    var unitLabel = useSum ? ui.unit : '';

    var series = buildSeries(all, state.range, state.focus, useSum);
    var avg = movingAverage(series.values, 7);

    // Kennzahlen
    var activeDays = series.values.filter(function (v) { return v > 0; }).length;
    var freeDays = state.range - activeDays;
    var longestGap = 0, gap = 0;
    series.values.forEach(function (v) { if (v === 0) { gap++; longestGap = Math.max(longestGap, gap); } else { gap = 0; } });
    var perDay = series.total / state.range;
    var trend = series.prevTotal > 0 ? ((series.total - series.prevTotal) / series.prevTotal) * 100 : null;
    var arrow = trend == null ? '' : (trend > 0.5 ? '↑' : (trend < -0.5 ? '↓' : '→'));

    var metricWord = useSum ? 'Menge' : 'Einträge';

    var since = startOfDay(new Date()).getTime() - (state.range - 1) * DAY;
    var inRange = focused.filter(function (e) { var t = new Date(e.time).getTime(); return t >= since; });
    var countInRange = inRange.length;

    var cards =
      card(metricWord + ' gesamt', num(series.total) + (unitLabel ? ' <span class="unit">' + esc(unitLabel) + '</span>' : '')) +
      card('Ø pro Tag', num(Math.round(perDay * 100) / 100) + (unitLabel ? ' <span class="unit">' + esc(unitLabel) + '</span>' : '')) +
      card('Tage ohne Eintrag', freeDays + ' <span class="unit">von ' + state.range + '</span>') +
      card('Längste Pause', longestGap + ' <span class="unit">Tage</span>') +
      card('vs. Vorzeitraum', trend == null ? '–' : arrow + ' ' + num(Math.abs(Math.round(trend))) + ' <span class="unit">%</span>') +
      card('Einträge', countInRange + ' <span class="unit">in ' + state.range + ' Tagen</span>');

    // Top-Liste nach Bezeichnung
    var byName = {};
    inRange.forEach(function (e) {
      var k = e.name || '–';
      byName[k] = (byName[k] || 0) + (useSum ? (Number(e.amount) || 0) : 1);
    });
    var top = Object.keys(byName).map(function (k) { return { label: k, value: byName[k] }; })
      .filter(function (it) { return !useSum || it.value > 0; })
      .sort(function (a, b) { return b.value - a.value; }).slice(0, 8);

    // Wochentage
    var wdNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    var wd = [0, 0, 0, 0, 0, 0, 0];
    inRange.forEach(function (e) {
      var d = new Date(e.time); var idx = (d.getDay() + 6) % 7;
      wd[idx] += useSum ? (Number(e.amount) || 0) : 1;
    });

    // Tageszeit in 2h-Blöcken
    var hourLabels = [], hours = [];
    for (var h = 0; h < 24; h += 2) { hourLabels.push(String(h).padStart(2, '0')); hours.push(0); }
    inRange.forEach(function (e) {
      var d = new Date(e.time);
      hours[Math.floor(d.getHours() / 2)] += useSum ? (Number(e.amount) || 0) : 1;
    });

    var body = sheet.querySelector('#statsBody');
    if (!all.length) {
      body.innerHTML = '<div class="stats-empty">Noch keine Einträge – sobald du welche anlegst, entstehen hier automatisch die Diagramme.</div>';
      return;
    }

    body.innerHTML =
      '<div class="stats-cards">' + cards + '</div>' +
      section('Tagesverlauf', '<span class="legend"><i class="l-bar"></i>' + metricWord + ' <i class="l-line"></i>7-Tage-Schnitt</span>') +
      barChart(series, avg, unitLabel) +
      section('Top-Einträge', '') + hBars(top, unitLabel) +
      section('Nach Wochentag', '') + miniBars(wd, wdNames) +
      section('Nach Tageszeit', '') + miniBars(hours, hourLabels);
  }

  function card(label, value) {
    return '<div class="stat-card"><div class="stat-label">' + esc(label) + '</div><div class="stat-value mono">' + value + '</div></div>';
  }
  function section(title, right) {
    return '<div class="stats-section"><h3>' + esc(title) + '</h3>' + (right || '') + '</div>';
  }

  // ---------- Steuerung ----------
  function renderControls() {
    var all = loadEntries();
    var cats = {}, names = {};
    all.forEach(function (e) {
      cats[e.category || 'Sonstiges'] = true;
      names[e.name] = (names[e.name] || 0) + 1;
    });
    var topNames = Object.keys(names).sort(function (a, b) { return names[b] - names[a]; }).slice(0, 15);

    var opts = '<option value="*">Alles</option>';
    var catKeys = Object.keys(cats).sort();
    if (catKeys.length) {
      opts += '<optgroup label="Kategorie">' + catKeys.map(function (c) {
        return '<option value="c:' + esc(c) + '">' + esc(c) + '</option>';
      }).join('') + '</optgroup>';
    }
    if (topNames.length) {
      opts += '<optgroup label="Bezeichnung">' + topNames.map(function (nme) {
        return '<option value="n:' + esc(nme) + '">' + esc(nme) + '</option>';
      }).join('') + '</optgroup>';
    }

    var sel = sheet.querySelector('#statsFocus');
    sel.innerHTML = opts;
    sel.value = state.focus;
    if (sel.selectedIndex === -1) { state.focus = '*'; sel.value = '*'; }

    sheet.querySelectorAll('.range-btn').forEach(function (b) {
      b.classList.toggle('active', Number(b.dataset.range) === state.range);
    });

    // Metrik-Umschalter nur zeigen, wenn Mengen im Fokus überhaupt summierbar sind
    var ui = unitInfo(all.filter(function (e) { return matchesFocus(e, state.focus); }));
    var toggle = sheet.querySelector('#metricToggle');
    toggle.style.display = ui.summable ? '' : 'none';
    toggle.querySelectorAll('.range-btn').forEach(function (b) {
      var wanted = b.dataset.metric === 'menge' ? (state.metric !== 'anzahl') : (state.metric === 'anzahl');
      b.classList.toggle('active', wanted);
      if (b.dataset.metric === 'menge') b.textContent = 'Menge' + (ui.unit ? ' (' + ui.unit + ')' : '');
    });
  }

  function build() {
    var style = document.createElement('style');
    style.textContent =
      '.stats-controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px}' +
      '.stats-controls select{flex:1;min-width:140px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);border-radius:10px;padding:9px 10px;font-family:inherit;font-size:14px;outline:none}' +
      '.range-group{display:flex;gap:4px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:3px}' +
      '.range-btn{background:transparent;border:none;color:var(--text-dim);font-family:inherit;font-size:13px;padding:6px 10px;border-radius:7px;cursor:pointer}' +
      '.range-btn.active{background:var(--accent-dim);color:var(--accent)}' +
      '.stats-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px}' +
      '.stat-card{background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:10px 11px}' +
      '.stat-label{font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;line-height:1.3}' +
      '.stat-value{font-size:17px;margin-top:5px;color:var(--text);font-weight:500}' +
      '.stat-value .unit{font-size:11px;color:var(--text-dim)}' +
      '.stats-section{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:22px 0 8px}' +
      '.stats-section h3{font-size:13px;margin:0;font-weight:600;color:var(--text)}' +
      '.legend{font-size:10px;color:var(--text-dim);display:flex;align-items:center;gap:5px}' +
      '.legend i{display:inline-block;border-radius:2px}' +
      '.legend .l-bar{width:9px;height:9px;background:var(--accent);opacity:.85}' +
      '.legend .l-line{width:12px;height:2px;background:#d9b26a;margin-left:6px}' +
      '.chart{width:100%;height:auto;display:block}' +
      '.hbars{display:flex;flex-direction:column;gap:7px}' +
      '.hbar-row{display:flex;align-items:center;gap:9px}' +
      '.hbar-label{width:33%;font-size:13px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.hbar-track{flex:1;height:9px;background:var(--surface-2);border-radius:5px;overflow:hidden}' +
      '.hbar-fill{height:100%;background:var(--accent);opacity:.85;border-radius:5px}' +
      '.hbar-val{font-size:11px;color:var(--text-dim);white-space:nowrap;min-width:44px;text-align:right}' +
      '.minibars{display:flex;align-items:flex-end;gap:4px;height:78px}' +
      '.minibar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%}' +
      '.minibar-fill{width:100%;max-width:26px;background:var(--accent);opacity:.85;border-radius:4px 4px 0 0}' +
      '.minibar-label{font-size:9px;color:var(--text-dim);margin-top:5px;font-family:JetBrains Mono,monospace}' +
      '.stats-empty{color:var(--text-dim);font-size:13px;padding:24px 0;text-align:center;line-height:1.6}';
    document.head.appendChild(style);

    sheet = document.createElement('div');
    sheet.className = 'sheet menu-sheet';
    sheet.id = 'statsSheet';
    sheet.innerHTML =
      '<div class="sheet-handle"></div>' +
      '<h2>Statistik</h2>' +
      '<div class="stats-controls">' +
        '<select id="statsFocus"></select>' +
        '<div class="range-group">' +
          '<button class="range-btn" data-range="7">7T</button>' +
          '<button class="range-btn" data-range="30">30T</button>' +
          '<button class="range-btn" data-range="90">90T</button>' +
        '</div>' +
        '<div class="range-group" id="metricToggle">' +
          '<button class="range-btn" data-metric="menge">Menge</button>' +
          '<button class="range-btn" data-metric="anzahl">Anzahl</button>' +
        '</div>' +
      '</div>' +
      '<div id="statsBody"></div>' +
      '<div class="hint">Alles wird lokal aus deinen Einträgen berechnet – nichts verlässt dieses Gerät.</div>';
    document.body.appendChild(sheet);

    sheet.querySelector('#statsFocus').addEventListener('change', function (ev) {
      state.focus = ev.target.value; state.metric = 'auto'; renderControls(); render();
    });
    sheet.querySelectorAll('.range-group [data-range]').forEach(function (b) {
      b.addEventListener('click', function () { state.range = Number(b.dataset.range); renderControls(); render(); });
    });
    sheet.querySelectorAll('.range-group [data-metric]').forEach(function (b) {
      b.addEventListener('click', function () { state.metric = b.dataset.metric; renderControls(); render(); });
    });

    var overlay = document.getElementById('overlay');
    if (overlay) overlay.addEventListener('click', close);
  }

  function open() {
    if (!sheet) build();
    renderControls();
    render();
    var overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.add('open');
    sheet.classList.add('open');
  }
  function close() { if (sheet) sheet.classList.remove('open'); }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('statsBtn');
    if (btn) btn.addEventListener('click', open);
  });

  window.TagebuchStats = { open: open, close: close };
})();
