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
    // Bei aktiver App-Sperre steht im localStorage nur Chiffretext - die
    // entschluesselten Eintraege liegen dann im Speicher der Liste.
    if (window.TagebuchData && Array.isArray(window.TagebuchData.entries)) {
      return window.TagebuchData.entries;
    }
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
    'etizolam': 1,

    // Handelsnamen, die in Deutschland gebraeuchlich sind
    'valium': 10, 'faustan': 10, 'diazep': 10,
    'tafil': 0.5, 'xanax': 0.5,
    'rivotril': 0.5, 'antelepsin': 0.5,
    'tavor': 1, 'temesta': 1,
    'noctamid': 1,
    'rohypnol': 1,
    'lexotanil': 5.5, 'normoc': 5.5, 'bromazanil': 5.5,
    'radedorm': 10, 'mogadan': 10,
    'adumbran': 20, 'praxiten': 20,
    'planum': 20, 'remestan': 20, 'norkotral': 20,
    'frisium': 20,
    'dalmadorm': 22.5, 'staurodorm': 22.5,
    'librium': 25, 'multum': 25,
    'tranxilium': 15,
    'demetrin': 15,
    'dormicum': 10,
    'ximovan': 7.5, 'zopiclon': 7.5, 'optidorm': 7.5,
    'stilnox': 20, 'bikalm': 20, 'zolpi': 20,
    'sonata': 20
  };

  /* "Tavor 1,0", "Alprazolam (Xanax)", "diazepam " sollen alle greifen:
     erstes Wort, kleingeschrieben, ohne Ziffern und Sonderzeichen. */
  function normName(name) {
    return String(name || '').toLowerCase().trim()
      .split(/[\s,;/()\-]+/)[0]
      .replace(/[^a-zäöüß]/g, '');
  }
  function eqFactor(name) {
    var mg = DIAZEPAM_EQ[normName(name)];
    return mg ? (10 / mg) : null;
  }

  /* Damerau-Levenshtein, nur um einen Tippfehler VORZUSCHLAGEN.
     Es wird nie automatisch korrigiert - bei Wirkstoffnamen waere Raten
     gefaehrlicher als eine fehlende Zahl. */
  function editDistance(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 0; j <= n; j++) { d[0][j] = j; }
    for (i = 1; i <= m; i++) {
      for (j = 1; j <= n; j++) {
        var c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + c);
        }
      }
    }
    return d[m][n];
  }
  function suggestName(name) {
    var k = normName(name);
    if (!k || k.length < 4) return null;
    var best = null, bestD = 3;
    Object.keys(DIAZEPAM_EQ).forEach(function (cand) {
      var dd = editDistance(k, cand);
      if (dd < bestD) { bestD = dd; best = cand; }
      else if (dd === bestD) { best = null; }
    });
    return best ? best.charAt(0).toUpperCase() + best.slice(1) : null;
  }

  /* Eintraege, die im Aequivalent-Modus mit 0 zaehlen wuerden. Die muessen
     sichtbar sein - sonst fehlt Menge in der Gesamtsumme, ohne dass es
     irgendwo auffaellt. */
  function unconverted(entries) {
    var out = {};
    entries.forEach(function (e) {
      if (e.amount == null || e.amount === '' || isNaN(e.amount)) return;
      if (eqValue(e) !== null) return;
      var k = (e.name || '–') + '|' + (e.unit || '');
      if (!out[k]) {
        out[k] = {
          name: e.name || '–',
          unit: (e.unit || '').trim(),
          count: 0,
          reason: String(e.unit || '').trim().toLowerCase() !== 'mg' ? 'unit' : 'name'
        };
      }
      out[k].count++;
    });
    return Object.keys(out).map(function (k) { return out[k]; });
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

  /* Auf glatte Werte gerundete Obergrenze, damit die Achse lesbare
     Zahlen bekommt statt "36,5". */
  function niceCeil(v) {
    if (!(v > 0)) return 1;
    var exp = Math.floor(Math.log(v) / Math.LN10);
    var base = Math.pow(10, exp);
    var f = v / base;
    var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return n * base;
  }

  function barChart(series, avg, unitLabel, showAvg) {
    var W = 560, H = 250, padL = 40, padR = 10, padB = 24, padT = 20;
    var n = series.values.length;
    var peak = Math.max.apply(null, series.values.concat([0]));
    var max = niceCeil(peak);
    var innerW = W - padL - padR, innerH = H - padT - padB;
    var slot = innerW / n;
    var bw = Math.max(2, Math.min(slot - (n > 45 ? 1 : 4), 34));
    var baseY = padT + innerH;
    var labelBars = n <= 14;

    // Gitterlinien mit beschrifteter Achse
    var grid = '';
    [0, 0.5, 1].forEach(function (f) {
      var y = baseY - innerH * f;
      grid += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) +
        '" stroke="var(--border)" stroke-width="1" opacity="' + (f === 0 ? 1 : 0.45) + '"></line>' +
        '<text x="' + (padL - 6) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="10"' +
        ' fill="var(--text-dim)" font-family="JetBrains Mono, monospace">' + esc(num(max * f)) + '</text>';
    });

    var bars = '', ticks = '', values = '';
    var every = n <= 10 ? 1 : Math.ceil(n / 7);

    series.values.forEach(function (v, i) {
      var h = (v / max) * innerH;
      var x = padL + slot * i + (slot - bw) / 2;
      var y = baseY - h;
      if (v > 0) {
        bars += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) +
          '" height="' + Math.max(h, 2).toFixed(1) + '" rx="' + Math.min(3, bw / 2).toFixed(1) +
          '" fill="url(#barGrad)"></rect>';
        if (labelBars) {
          values += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 6).toFixed(1) +
            '" text-anchor="middle" font-size="10.5" fill="var(--text)"' +
            ' font-family="JetBrains Mono, monospace">' + esc(num(v)) + '</text>';
        }
      }
      if (i % every === 0 || i === n - 1) {
        ticks += '<text x="' + (padL + slot * i + slot / 2).toFixed(1) + '" y="' + (H - 6) +
          '" text-anchor="middle" font-size="10" fill="var(--text-dim)"' +
          ' font-family="JetBrains Mono, monospace">' + series.labels[i] + '</text>';
      }
    });

    var trend = '';
    if (showAvg) {
      var pts = avg.map(function (v, i) {
        return (padL + slot * i + slot / 2).toFixed(1) + ',' + (baseY - (v / max) * innerH).toFixed(1);
      }).join(' ');
      var areaPts = pts + ' ' + (padL + slot * (n - 1) + slot / 2).toFixed(1) + ',' + baseY +
        ' ' + (padL + slot / 2).toFixed(1) + ',' + baseY;
      trend = '<polygon points="' + areaPts + '" fill="url(#areaGrad)"></polygon>' +
        '<polyline points="' + pts + '" fill="none" stroke="#d9b26a" stroke-width="2"' +
        ' stroke-linejoin="round" stroke-linecap="round"></polyline>';
    }

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
      grid + trend + bars + values + ticks +
      (unitLabel ? '<text x="' + padL + '" y="11" font-size="10" fill="var(--text-dim)"' +
        ' font-family="JetBrains Mono, monospace">' + esc(unitLabel) + '</text>' : '') +
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
    var useEq = hasEq && state.metric !== 'menge' && state.metric !== 'anzahl';
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

    var showAvg = series.values.length >= 3;

    var body = sheet.querySelector('#statsBody');
    if (!all.length) {
      body.innerHTML = '<div class="stats-empty">Noch keine Einträge – sobald du welche anlegst, entstehen hier automatisch die Diagramme.</div>';
      return;
    }

    body.innerHTML =
      '<div class="chart-card">' +
        section('Tagesverlauf', '<span class="legend"><i class="l-bar"></i>' + metricWord +
          (showAvg ? ' <i class="l-line"></i>7-Tage-Schnitt' : '') + '</span>') +
        barChart(series, avg, unitLabel, showAvg) +
      '</div>' +
      '<div class="stats-cards">' + cards + '</div>' +
      (useEq ? (function () {
        var miss = unconverted(inRange);
        var warn = '';
        if (miss.length) {
          warn = '<div class="stats-warn"><strong>Nicht mitgerechnet:</strong> ' + miss.map(function (m) {
            if (m.reason === 'unit') {
              return esc(m.name) + ' (' + m.count + '×, Einheit „' + esc(m.unit || '–') + '" statt mg)';
            }
            var s = suggestName(m.name);
            return esc(m.name) + ' (' + m.count + '×, unbekannt' + (s ? ' – meintest du ' + esc(s) + '?' : '') + ')';
          }).join(', ') + '. Diese Einträge fehlen in der Summe oben. Namen im Eintrag korrigieren, dann stimmt sie.</div>';
        }
        return warn + '<div class="stats-note">Umgerechnet auf Diazepam-Äquivalent nach der Ashton-Tabelle. Näherungswerte – Quellen weichen voneinander ab. Keine Dosierungsempfehlung: Umstellen oder Ausschleichen gehört ärztlich begleitet.</div>';
      })() : '') +
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
    var active = state.metric === 'anzahl' ? 'anzahl'
      : (hasEq && state.metric !== 'menge') ? 'daeq'
      : (ui.summable ? 'menge' : 'anzahl');
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
      '.stats-warn{font-size:11.5px;color:#d99a6a;background:rgba(217,154,106,.09);border:1px solid rgba(217,154,106,.28);border-radius:10px;padding:10px 12px;margin:-6px 0 14px;line-height:1.5}' +
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
      missing: function (day) { return mode === 'eq' ? unconverted(day).length : 0; },
      fmt: num
    };
  }

  window.TagebuchStats = {
    open: open, close: close, listMetrics: listMetrics,
    getDayStart: getDayStart, setDayStart: setDayStart, logicalDate: logicalDate
  };
})();
