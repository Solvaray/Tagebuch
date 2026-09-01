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

  /* Tagesbeginn: Eintraege vor dieser Uhrzeit zaehlen zum Vortag.
     Um 00:45 etwas zu nehmen gehoert erlebnismaessig zum Abend davor,
     nicht zu einem neuen Tag - sonst zerreisst Mitternacht jede Nacht
     in zwei Tage und verfaelscht Tagessummen und konsumfreie Tage. */
  var DAYSTART_KEY = 'tagebuch_daystart_v1';
  function getDayStart() {
    var v = parseInt(localStorage.getItem(DAYSTART_KEY), 10);
    return (isNaN(v) || v < 0 || v > 12) ? 4 : v;
  }
  function setDayStart(h) { localStorage.setItem(DAYSTART_KEY, String(h)); }
  function logicalDate(d) {
    var x = new Date(d.getTime() - getDayStart() * 3600000);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  function num(v) {
    return (v == null || isNaN(v)) ? '–' : Number(v).toLocaleString('de-DE', { maximumFractionDigits: 2 });
  }


  /* Diazepam-Aequivalente nach der Ashton-Tabelle (Prof. Heather Ashton,
     "Benzodiazepines: How They Work and How to Withdraw", Aequivalenzen-Kapitel).
     Wert = Menge in mg, die ungefaehr 10 mg Diazepam entspricht.
     Bewusst als offene Tabelle: Werte sind Naeherungen, verschiedene Quellen
     weichen ab. Zum Pruefen und Ergaenzen gedacht, nicht als Dosierhilfe. */
  var DIAZEPAM_EQ = {
    'diazepam': 10,
    'alprazolam': 0.5,
    'clonazepam': 0.5,
    'triazolam': 0.5,
    'lorazepam': 1,
    'lormetazepam': 1,
    'flunitrazepam': 1,
    'bromazepam': 5.5,
    'nitrazepam': 10,
    'nordazepam': 10,
    'medazepam': 10,
    'midazolam': 10,
    'oxazepam': 20,
    'temazepam': 20,
    'clobazam': 20,
    'flurazepam': 22.5,
    'chlordiazepoxid': 25,
    'chlordiazepoxide': 25,
    'dikaliumclorazepat': 15,
    'clorazepat': 15,
    'prazepam': 15,
    'zopiclon': 7.5,
    'zolpidem': 20,
    'zaleplon': 20,
    'etizolam': 1
  };

  function eqFactor(name) {
    var key = String(name || '').trim().toLowerCase();
    var mg = DIAZEPAM_EQ[key];
    return mg ? (10 / mg) : null;
  }

  /* Nur sinnvoll, wenn die Menge auch in mg erfasst ist. */
  function eqValue(e) {
    if (e.amount == null || e.amount === '' || isNaN(e.amount)) return null;
    if (String(e.unit || '').trim().toLowerCase() !== 'mg') return null;
    var f = eqFactor(e.name);
    return f === null ? null : Number(e.amount) * f;
  }

  function eqAvailable(entries) {
    for (var i = 0; i < entries.length; i++) { if (eqValue(entries[i]) !== null) return true; }
    return false;
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
    /* Gross-/Kleinschreibung ignorieren: "mg" und "Mg" sind dieselbe Einheit.
       Vorher galten sie als zwei verschiedene und die Summe fiel still auf Anzahl zurueck. */
    var units = {}, withAmount = 0;
    entries.forEach(function (e) {
      if (e.amount != null && e.amount !== '' && !isNaN(e.amount)) {
        withAmount++;
        var raw = (e.unit || '').trim();
        var key = raw.toLowerCase();
        if (!units[key]) units[key] = { count: 0, spellings: {} };
        units[key].count++;
        units[key].spellings[raw] = (units[key].spellings[raw] || 0) + 1;
      }
    });
    var keys = Object.keys(units);
    var unit = '';
    if (keys.length === 1) {
      var sp = units[keys[0]].spellings;
      unit = Object.keys(sp).sort(function (a, b) { return sp[b] - sp[a]; })[0] || '';
    }
    return { summable: withAmount > 0 && keys.length === 1, unit: unit, withAmount: withAmount };
  }

  function buildSeries(all, days, focus, valueOf) {
    var end = logicalDate(new Date());
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
      var raw = new Date(e.time);
      if (isNaN(raw)) return;
      var t = logicalDate(raw);
      var val = valueOf(e);
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
    var W = 560, H = 250, padL = 6, padR = 6, padB = 24, padT = 18;
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
          '" height="' + Math.max(h, 2).toFixed(1) + '" rx="' + Math.min(3, bw / 2).toFixed(1) + '" fill="url(#barGrad)"></rect>';
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

    var baseY = padT + innerH;
    var areaPts = pts + ' ' + (W - padR - (slot - bw) / 2).toFixed(1) + ',' + baseY + ' ' + (padL + (slot - bw) / 2).toFixed(1) + ',' + baseY;

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img" aria-label="Tagesverlauf">' +
      '<defs>' +
        '<linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#8fab98" stop-opacity="1"></stop>' +
          '<stop offset="100%" stop-color="#7c9885" stop-opacity=".32"></stop>' +
        '</linearGradient>' +
        '<linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#d9b26a" stop-opacity=".20"></stop>' +
          '<stop offset="100%" stop-color="#d9b26a" stop-opacity="0"></stop>' +
        '</linearGradient>' +
      '</defs>' +
      '<line x1="' + padL + '" y1="' + baseY + '" x2="' + (W - padR) + '" y2="' + baseY + '" stroke="var(--border)" stroke-width="1"></line>' +
      '<polygon points="' + areaPts + '" fill="url(#areaGrad)"></polygon>' +
      bars +
      '<polyline points="' + pts + '" fill="none" stroke="#d9b26a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>' +
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
    var hasEq = eqAvailable(focused);
    var useEq = hasEq && state.metric === 'daeq';
    var useSum = !useEq && ui.summable && state.metric !== 'anzahl';

    var valueOf = useEq
      ? function (e) { var v = eqValue(e); return v === null ? 0 : v; }
      : (useSum ? function (e) { return Number(e.amount) || 0; } : function () { return 1; });

    var unitLabel = useEq ? 'mg DÄ' : (useSum ? ui.unit : '');

    var series = buildSeries(all, state.range, state.focus, valueOf);

    /* Zeitraum am ersten Eintrag abschneiden. Tage davor sind keine konsumfreien
       Tage, sondern schlicht keine Daten - sonst behauptet die App Abstinenz,
       wo einfach noch nichts erfasst war, und der Schnitt pro Tag wird zu klein. */
    var firstT = null;
    focused.forEach(function (e) {
      var ts = new Date(e.time).getTime();
      if (!isNaN(ts) && (firstT === null || ts < firstT)) firstT = ts;
    });
    if (firstT !== null) {
      var firstDay = logicalDate(new Date(firstT)).getTime();
      var startIdx = 0;
      for (var si = 0; si < series.dates.length; si++) {
        if (series.dates[si].getTime() >= firstDay) { startIdx = si; break; }
      }
      if (startIdx > 0) {
        series.values = series.values.slice(startIdx);
        series.labels = series.labels.slice(startIdx);
        series.dates = series.dates.slice(startIdx);
      }
    }
    var trackedDays = series.values.length || 1;
    var truncated = trackedDays < state.range;

    // erst jetzt, sonst mittelt der Schnitt ueber Tage vor dem ersten Eintrag
    var avg = movingAverage(series.values, 7);

    // Kennzahlen
    var activeDays = series.values.filter(function (v) { return v > 0; }).length;
    var freeDays = trackedDays - activeDays;
    var longestGap = 0, gap = 0;
    series.values.forEach(function (v) { if (v === 0) { gap++; longestGap = Math.max(longestGap, gap); } else { gap = 0; } });
    var perDay = series.total / trackedDays;
    var trend = series.prevTotal > 0 ? ((series.total - series.prevTotal) / series.prevTotal) * 100 : null;
    var arrow = trend == null ? '' : (trend > 0.5 ? '↑' : (trend < -0.5 ? '↓' : '→'));

    var metricWord = useEq ? 'Diazepam-Äquivalent' : (useSum ? 'Menge' : 'Einträge');

    var since = logicalDate(new Date()).getTime() - (state.range - 1) * DAY;
    var inRange = focused.filter(function (e) { return logicalDate(new Date(e.time)).getTime() >= since; });
    var countInRange = inRange.length;

    var cards =
      card((useEq ? 'Diaz.-Äquiv. gesamt' : metricWord + ' gesamt'), num(series.total) + (unitLabel ? ' <span class="unit">' + esc(unitLabel) + '</span>' : '')) +
      card('Ø pro Tag', num(Math.round(perDay * 100) / 100) + (unitLabel ? ' <span class="unit">' + esc(unitLabel) + '</span>' : '')) +
      card('Tage ohne Eintrag', freeDays + ' <span class="unit">von ' + trackedDays + '</span>') +
      card('Längste Pause', longestGap + ' <span class="unit">Tage</span>') +
      card('vs. Vorzeitraum', trend == null ? '–' : arrow + ' ' + num(Math.abs(Math.round(trend))) + ' <span class="unit">%</span>') +
      card('Einträge', countInRange + ' <span class="unit">in ' + trackedDays + (trackedDays === 1 ? ' Tag' : ' Tagen') + '</span>');

    // Top-Liste nach Bezeichnung
    var byName = {};
    inRange.forEach(function (e) {
      var k = e.name || '–';
      byName[k] = (byName[k] || 0) + valueOf(e);
    });
    var top = Object.keys(byName).map(function (k) { return { label: k, value: byName[k] }; })
      .filter(function (it) { return (!useSum && !useEq) || it.value > 0; })
      .sort(function (a, b) { return b.value - a.value; }).slice(0, 8);

    // Wochentage
    var wdNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    var wd = [0, 0, 0, 0, 0, 0, 0];
    inRange.forEach(function (e) {
      var d = logicalDate(new Date(e.time)); var idx = (d.getDay() + 6) % 7;
      wd[idx] += valueOf(e);
    });

    // Tageszeit in 2h-Blöcken
    var hourLabels = [], hours = [];
    for (var h = 0; h < 24; h += 2) { hourLabels.push(String(h).padStart(2, '0')); hours.push(0); }
    inRange.forEach(function (e) {
      var d = new Date(e.time);
      hours[Math.floor(d.getHours() / 2)] += valueOf(e);
    });

    var body = sheet.querySelector('#statsBody');
    if (!all.length) {
      body.innerHTML = '<div class="stats-empty">Noch keine Einträge – sobald du welche anlegst, entstehen hier automatisch die Diagramme.</div>';
      return;
    }

    body.innerHTML =
      '<div class="chart-card">' +
        section('Tagesverlauf', '<span class="legend"><i class="l-bar"></i>' + metricWord + ' <i class="l-line"></i>7-Tage-Schnitt</span>') +
        barChart(series, avg, unitLabel) +
      '</div>' +
      '<div class="stats-cards">' + cards + '</div>' +
      (useEq ? '<div class="stats-note">Umgerechnet auf Diazepam-Äquivalent nach der Ashton-Tabelle. Näherungswerte – Quellen weichen voneinander ab, und Einträge ohne mg oder ohne bekannten Wirkstoff zählen mit 0. Keine Dosierungsempfehlung: Umstellen oder Ausschleichen gehört ärztlich begleitet.</div>' : '') +
      (truncated ? '<div class="stats-note">Erfasst seit ' + esc(series.labels[0]) + ' – ausgewertet werden ' + trackedDays + (trackedDays === 1 ? ' Tag' : ' Tage') + ', nicht ' + state.range + '.</div>' : '') +
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
    var focusedAll = all.filter(function (e) { return matchesFocus(e, state.focus); });
    var ui = unitInfo(focusedAll);
    var hasEq = eqAvailable(focusedAll);
    var toggle = sheet.querySelector('#metricToggle');
    toggle.style.display = (ui.summable || hasEq) ? '' : 'none';
    var active = state.metric === 'anzahl' ? 'anzahl' : (state.metric === 'daeq' && hasEq ? 'daeq' : (ui.summable ? 'menge' : 'anzahl'));
    toggle.querySelectorAll('.range-btn').forEach(function (b) {
      var m = b.dataset.metric;
      b.style.display = (m === 'daeq' && !hasEq) || (m === 'menge' && !ui.summable) ? 'none' : '';
      b.classList.toggle('active', m === active);
      if (m === 'menge') b.textContent = 'Menge' + (ui.unit ? ' (' + ui.unit + ')' : '');
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
      '.stats-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(98px,1fr));gap:8px;margin-bottom:20px}' +
      '.stat-card{background:linear-gradient(160deg,var(--surface-2),rgba(35,39,45,.35));border:1px solid var(--border);border-radius:12px;padding:11px 12px}' +
      '.stat-label{font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;line-height:1.3}' +
      '.stat-value{font-size:17px;margin-top:5px;color:var(--text);font-weight:500}' +
      '.stat-value .unit{font-size:11px;color:var(--text-dim)}' +
      '.stats-section{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:22px 0 8px}' +
      '.chart-card{background:linear-gradient(170deg,rgba(124,152,133,.07),rgba(27,30,35,0));border:1px solid var(--border);border-radius:16px;padding:2px 12px 10px;margin-bottom:16px}' +
      '.chart-card .stats-section{margin-top:12px}' +
      '#statsSheet{max-height:94vh}' +
      '#statsSheet h2{margin-bottom:14px}' +
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
      '.hbar-fill{height:100%;background:linear-gradient(90deg,rgba(124,152,133,.55),var(--accent));border-radius:5px}' +
      '.hbar-val{font-size:11px;color:var(--text-dim);white-space:nowrap;min-width:44px;text-align:right}' +
      '.minibars{display:flex;align-items:flex-end;gap:4px;height:78px}' +
      '.minibar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%}' +
      '.minibar-fill{width:100%;max-width:26px;background:linear-gradient(180deg,#8fab98,rgba(124,152,133,.35));border-radius:5px 5px 0 0}' +
      '.minibar-label{font-size:9px;color:var(--text-dim);margin-top:5px;font-family:JetBrains Mono,monospace}' +
      '.stats-note{font-size:11px;color:var(--text-dim);margin:-10px 0 18px;line-height:1.5}' +
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
          '<button class="range-btn" data-metric="daeq">Diazepam-Äq.</button>' +
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

  /* Wird von der Liste in index.html benutzt, damit Tagessumme und Tagesband
     dieselbe Logik verwenden wie die Statistik: Diazepam-Aequivalent wenn
     moeglich, sonst Menge bei einheitlicher Einheit, sonst Anzahl.

     Bandfarben: entsaettigte Toene rund um das Salbeigruen, vergeben nach
     Gesamtanteil - der haeufigste Wirkstoff bekommt immer dieselbe Farbe,
     damit sie ueber Tage hinweg stabil bleibt. */
  var BAND_COLORS = ['#7c9885', '#5f8f9a', '#9a8f5f', '#8a7c9d', '#9a7c7c', '#6f9a72', '#5a6169'];

  function listMetrics(entries) {
    var hasEq = eqAvailable(entries);
    var ui = unitInfo(entries);
    var mode = hasEq ? 'eq' : (ui.summable ? 'sum' : 'count');
    var unit = hasEq ? 'mg DÄ' : (ui.summable ? ui.unit : '');

    function valueOf(e) {
      if (mode === 'eq') { var v = eqValue(e); return v === null ? 0 : v; }
      if (mode === 'sum') return Number(e.amount) || 0;
      return 1;
    }

    var totals = {}, sum = 0, first = null;
    entries.forEach(function (e) {
      var k = e.name || '–';
      var v = valueOf(e);
      totals[k] = (totals[k] || 0) + v;
      sum += v;
      var ts = new Date(e.time).getTime();
      if (!isNaN(ts) && (first === null || ts < first)) first = ts;
    });

    var colorOf = {};
    Object.keys(totals).sort(function (a, b) { return totals[b] - totals[a]; })
      .forEach(function (n, i) { colorOf[n] = BAND_COLORS[Math.min(i, BAND_COLORS.length - 1)]; });

    // Schnitt ueber die erfassten Tage, nicht ueber den Kalender
    var days = 1;
    if (first !== null) {
      days = Math.round((logicalDate(new Date()).getTime() - logicalDate(new Date(first)).getTime()) / DAY) + 1;
      if (days < 1) days = 1;
    }

    function dayTotal(day) {
      var s = 0;
      day.forEach(function (e) { s += valueOf(e); });
      return s;
    }

    return {
      mode: mode,
      unit: unit,
      average: entries.length ? sum / days : null,
      total: dayTotal,
      label: function (day) {
        var s = dayTotal(day);
        if (mode === 'count') return s + (s === 1 ? ' Eintrag' : ' Einträge');
        return num(s) + (unit ? ' ' + unit : '');
      },
      breakdown: function (day) {
        var by = {};
        day.forEach(function (e) { var k = e.name || '–'; by[k] = (by[k] || 0) + valueOf(e); });
        return Object.keys(by).filter(function (k) { return by[k] > 0; })
          .sort(function (a, b) { return by[b] - by[a]; })
          .map(function (k) { return { name: k, value: by[k], color: colorOf[k] || BAND_COLORS[BAND_COLORS.length - 1] }; });
      },
      colorOf: function (n) { return colorOf[n] || BAND_COLORS[BAND_COLORS.length - 1]; },
      fmt: num
    };
  }

  window.TagebuchStats = {
    open: open, close: close, listMetrics: listMetrics,
    getDayStart: getDayStart, setDayStart: setDayStart, logicalDate: logicalDate
  };
})();
