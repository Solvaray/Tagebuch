/* Tagebuch – Rechentests.

   Ohne Abhaengigkeiten, laeuft mit: node test/rechnen.test.js
   (aus dem Projektordner). Prueft, was gerechnet wird - Sollwerte,
   Fahrplan, Tagesbuendel, Durchschnitte - nicht wie es aussieht.

   Warum das hier liegt und nicht im Kopf: Die App rechnet mit Dosierungen.
   Ein Tag Verschiebung im Plan ist kein Schoenheitsfehler. Besonders die
   Zeitumstellung ist eine Falle - 24 Stunden sind zweimal im Jahr kein Tag.

   Die Tests laufen bewusst in Europe/Berlin. */
'use strict';

process.env.TZ = process.env.TZ || 'Europe/Berlin';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DAY = 86400000;

// ---------- Mini-Testgeruest ----------
let pass = 0;
const fails = [];
let gruppe = '';

function group(name) { gruppe = name; }
function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  fails.push(gruppe + ' › ' + name + (detail ? '\n      ' + detail : ''));
}
function eq(name, actual, expected) {
  ok(name, actual === expected, 'erwartet ' + JSON.stringify(expected) + ', war ' + JSON.stringify(actual));
}
function near(name, actual, expected, eps) {
  eps = eps === undefined ? 1e-9 : eps;
  ok(name, Math.abs(actual - expected) <= eps,
    'erwartet ' + expected + ' (±' + eps + '), war ' + actual);
}
function iso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// ---------- Module laden ----------
/* Beide Dateien sind IIFEs fuer den Browser. Zum Testen werden sie mit
   Stubs fuer window/localStorage/document ausgefuehrt; Date wird auf einen
   festen Zeitpunkt gesetzt, sonst haengt das Ergebnis am Testtag. */
function mockDate(nowMs) {
  class D extends Date {
    constructor() {
      if (arguments.length === 0) super(nowMs);
      else if (arguments.length === 1) super(arguments[0]);
      else super(arguments[0], arguments[1], arguments[2] || 1,
                 arguments[3] || 0, arguments[4] || 0, arguments[5] || 0, arguments[6] || 0);
    }
    static now() { return nowMs; }
  }
  return D;
}

function store(init) {
  const m = Object.assign({}, init || {});
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem(k, v) { m[k] = String(v); },
    removeItem(k) { delete m[k]; }
  };
}

function loadPlan(nowMs, storage) {
  const src = fs.readFileSync(path.join(ROOT, 'plan.js'), 'utf8');
  const fn = new Function('localStorage', 'Date', 'window',
    src + '\n; return window.TagebuchPlan;');
  return fn(storage || store(), mockDate(nowMs), {});
}

function loadStats(nowMs, storage) {
  const src = fs.readFileSync(path.join(ROOT, 'stats.js'), 'utf8');
  const i = src.indexOf('(function () {');
  const j = src.lastIndexOf('})();');
  const body = src.slice(i + '(function () {'.length, j);
  const fn = new Function('localStorage', 'Date', 'window', 'document',
    body + '\n; return { buildSeries: buildSeries, movingAverage: movingAverage,' +
    ' weekly: weekly, logicalDate: logicalDate, dayKey: dayKey, eqValue: eqValue,' +
    ' eqFactor: eqFactor, niceCeil: niceCeil, niceAxis: niceAxis, verlaufChart: verlaufChart, unitInfo: unitInfo, loadEntries: loadEntries };');
  return fn(
    storage || store(),
    mockDate(nowMs),
    {},
    { addEventListener() {}, getElementById() { return null; }, body: { appendChild() {} } }
  );
}

const PLAN = { start: '2026-06-01', startDose: 60, targetDose: 20, stepAmount: 4, stepDays: 14, unit: 'mg DÄ' };
const at = (y, m, d, h) => new Date(y, m - 1, d, h || 12, 0, 0, 0).getTime();

// =========================================================================
group('Sollwert (targetFor)');
{
  const P = loadPlan(at(2026, 9, 14));
  const T = (y, m, d) => P.targetFor(new Date(y, m - 1, d, 15), PLAN);

  eq('Starttag = Startdosis', T(2026, 6, 1), 60);
  eq('letzter Tag der 1. Stufe', T(2026, 6, 14), 60);
  eq('erster Tag der 2. Stufe', T(2026, 6, 15), 56);
  eq('erster Tag der 3. Stufe', T(2026, 6, 29), 52);
  eq('vor dem Start gibt es keinen Sollwert', T(2026, 5, 31), null);
  eq('nach dem Ziel bleibt es beim Zielwert', T(2027, 1, 1), 20);

  // 10 Reduktionen * 14 Tage = 140 Tage bis zum Zielwert
  eq('Zieldatum', iso(P.endDate(PLAN)), '2026-10-19');
  eq('Sollwert am Zieldatum', T(2026, 10, 19), 20);
  eq('Tag vor dem Zieldatum', T(2026, 10, 18), 24);
}

// =========================================================================
group('Nicht teilbare Spanne (Restschritt)');
{
  const P = loadPlan(at(2026, 9, 14));
  // 60 -> 20 in 7er-Schritten: 60,53,46,39,32,25,20 - der letzte Schritt ist nur 5
  const p = { start: '2026-06-01', startDose: 60, targetDose: 20, stepAmount: 7, stepDays: 10 };
  const s = P.schedule(p);
  eq('Stufenzahl (6 Reduktionen + Ziel)', s.length, 7);
  eq('Dosisfolge', s.map(x => x.dose).join(','), '60,53,46,39,32,25,20');
  eq('letzte Stufe ist als Ziel markiert', s[6].last, true);
  eq('Zieldatum = Start + 6*10 Tage', iso(P.endDate(p)), '2026-07-31');
  eq('Sollwert bleibt am Ziel gekappt', P.targetFor(new Date(2026, 6, 31, 12), p), 20);
}

// =========================================================================
group('Fahrplan deckt sich mit dem Sollwert');
{
  const P = loadPlan(at(2026, 9, 14));
  /* Zwei Rechenwege auf dieselbe Zahl: die Tabelle im Plan-Sheet und die
     Soll-Linie im Diagramm. Weichen sie ab, zeigt die App zwei Wahrheiten. */
  const faelle = [PLAN,
    { start: '2026-01-15', startDose: 30, targetDose: 2, stepAmount: 2.5, stepDays: 7 },
    { start: '2026-10-01', startDose: 12, targetDose: 0.5, stepAmount: 0.5, stepDays: 21 }];

  faelle.forEach((p, k) => {
    const s = P.schedule(p);
    let abw = 0, lueckenlos = true;
    s.forEach((stufe, i) => {
      // jeder Tag der Stufe muss denselben Sollwert liefern
      for (let t = 0; t < Number(p.stepDays); t++) {
        const d = new Date(stufe.from.getFullYear(), stufe.from.getMonth(), stufe.from.getDate() + t, 12);
        if (i === s.length - 1 && t > 0) break;     // Zielstufe laeuft unbegrenzt
        if (P.targetFor(d, p) !== stufe.dose) abw++;
      }
      if (i > 0) {
        const vor = s[i - 1];
        const naechster = new Date(vor.until.getFullYear(), vor.until.getMonth(), vor.until.getDate() + 1);
        if (iso(naechster) !== iso(stufe.from)) lueckenlos = false;
      }
    });
    eq('Fall ' + k + ': Fahrplan = Sollwert an jedem Tag', abw, 0);
    eq('Fall ' + k + ': Stufen ohne Luecke und ohne Ueberlappung', lueckenlos, true);
  });
}

// =========================================================================
group('Tempo (pace)');
{
  const P = loadPlan(at(2026, 9, 14));
  const pc = P.pace(PLAN);
  eq('Schritte', pc.steps, 10);
  eq('Dauer in Tagen', pc.days, 140);
  near('Reduktion pro Tag', pc.perDay, 40 / 140);
  near('Reduktion pro Woche', pc.perWeek, (40 / 140) * 7);
  near('Tempo * Dauer = Spanne', pc.perDay * pc.days, 40, 1e-9);
}

// =========================================================================
group('Standort im Plan (position)');
{
  const P = loadPlan(at(2026, 9, 14));
  const pos = P.position(PLAN);
  eq('gestartet', pos.started, true);
  eq('Sollwert heute', pos.target, P.targetFor(new Date(2026, 8, 14, 12), PLAN));
  eq('Stufe', pos.step, 8);                       // 105 Tage / 14 = Stufe 8
  eq('Stufen gesamt', pos.steps, 11);
  eq('aktuelle Stufe enthaelt heute', pos.current.dose, pos.target);
  eq('naechste Stufe ist 4 mg niedriger', pos.next.dose, pos.target - 4);
  eq('Tage bis zum naechsten Schritt', pos.daysToNext, 7);
  eq('Resttage bis zum Ziel', pos.daysLeft, 35);
  eq('Zieldatum stimmt mit endDate', iso(pos.endDate), iso(P.endDate(PLAN)));

  const vor = loadPlan(at(2026, 5, 20)).position(PLAN);
  eq('vor dem Start: nicht gestartet', vor.started, false);
  eq('vor dem Start: Tage bis Start', vor.startsIn, 12);
}

// =========================================================================
group('Zeitumstellung im Plan');
{
  /* In Europe/Berlin hat der 29.03.2026 nur 23 Stunden und der 25.10.2026
     hat 25. Wer Tage als 86.400.000 ms rechnet, verschiebt danach den
     ganzen Plan um einen Tag. */
  const P = loadPlan(at(2026, 11, 1));
  const fr = { start: '2026-03-01', startDose: 40, targetDose: 10, stepAmount: 5, stepDays: 10 };
  eq('Frühjahr: Tag 9 noch Stufe 1', P.targetFor(new Date(2026, 2, 10, 12), fr), 40);
  eq('Frühjahr: Tag 10 ist Stufe 2', P.targetFor(new Date(2026, 2, 11, 12), fr), 35);
  eq('Frühjahr: Tag 30 nach der Umstellung', P.targetFor(new Date(2026, 2, 31, 12), fr), 25);
  eq('Frühjahr: Tag 40', P.targetFor(new Date(2026, 3, 10, 12), fr), 20);

  const hb = { start: '2026-10-01', startDose: 40, targetDose: 10, stepAmount: 5, stepDays: 10 };
  eq('Herbst: Tag 30 nach der Umstellung', P.targetFor(new Date(2026, 9, 31, 12), hb), 25);
  eq('Herbst: Tag 31', P.targetFor(new Date(2026, 10, 1, 12), hb), 25);
  eq('Herbst: Tag 40', P.targetFor(new Date(2026, 10, 10, 12), hb), 20);

  const s = P.schedule(hb);
  eq('Herbst: Stufe 4 beginnt am richtigen Tag', iso(s[3].from), '2026-10-31');
  eq('Herbst: Stufe 5 beginnt am richtigen Tag', iso(s[4].from), '2026-11-10');
  eq('Herbst: Zieldatum', iso(P.endDate(hb)), '2026-11-30');

  const sf = P.schedule(fr);
  eq('Frühjahr: Stufe 4 beginnt am richtigen Tag', iso(sf[3].from), '2026-03-31');
  eq('Frühjahr: Zieldatum', iso(P.endDate(fr)), '2026-04-30');
}

// =========================================================================
group('Tagesreihe (buildSeries)');
{
  const eintrag = (isoTime, amount) => ({
    id: isoTime, time: isoTime, name: 'Diazepam', amount: amount, unit: 'mg', category: 'Medikament'
  });

  // 14.09.2026, 12:00 als "heute"
  const S = loadStats(at(2026, 9, 14));
  const entries = [
    eintrag('2026-09-14T10:00:00', 5),
    eintrag('2026-09-14T18:00:00', 5),
    eintrag('2026-09-13T23:30:00', 7),
    eintrag('2026-09-14T02:00:00', 3),   // vor 04:00 -> zaehlt zum 13.
    eintrag('2026-09-01T12:00:00', 9),   // ausserhalb von 7 Tagen
  ];
  const valueOf = e => Number(e.amount) || 0;
  const s = S.buildSeries(entries, 7, '*', valueOf);

  eq('7 Tage = 7 Balken', s.values.length, 7);
  eq('heute ist der letzte Balken', iso(s.dates[6]), '2026-09-14');
  eq('Tagessumme heute', s.values[6], 10);
  eq('02:00 zaehlt zum Vortag', s.values[5], 10);   // 7 + 3
  eq('Summe im Zeitraum', s.total, 20);
  eq('Balkensumme = total', s.values.reduce((a, b) => a + b, 0), s.total);
  eq('alte Einträge nicht im Zeitraum', s.values.slice(0, 5).join(','), '0,0,0,0,0');

  // Vorperiode: 7 Tage davor
  const s2 = S.buildSeries([eintrag('2026-09-05T12:00:00', 4)], 7, '*', valueOf);
  eq('Vorperiode wird getrennt gezaehlt', s2.prevTotal, 4);
  eq('Vorperiode zaehlt nicht mit', s2.total, 0);
}

// =========================================================================
group('Zeitumstellung in der Tagesreihe');
{
  /* Hier lag der zweite Fallstrick: ein Zeitraum ueber den 25.10. hinweg
     erzeugte mit ms-Arithmetik denselben Kalendertag zweimal - ein Tag
     wurde doppelt gezeigt, ein anderer verschwand samt seiner Einträge. */
  const S = loadStats(at(2026, 11, 5));
  const s = S.buildSeries([], 30, '*', () => 0);
  const keys = s.dates.map(iso);
  eq('30 Tage', keys.length, 30);
  eq('keine doppelten Tage', new Set(keys).size, 30);
  eq('letzter Tag ist heute', keys[29], '2026-11-05');
  eq('erster Tag', keys[0], '2026-10-07');
  let lueckenlos = true;
  for (let i = 1; i < s.dates.length; i++) {
    const soll = new Date(s.dates[i - 1].getFullYear(), s.dates[i - 1].getMonth(), s.dates[i - 1].getDate() + 1);
    if (iso(soll) !== keys[i]) lueckenlos = false;
  }
  eq('Tage folgen lueckenlos aufeinander', lueckenlos, true);

  const drin = S.buildSeries(
    [{ id: 'x', time: '2026-10-26T12:00:00', name: 'Diazepam', amount: 8, unit: 'mg', category: 'M' }],
    30, '*', e => Number(e.amount) || 0);
  eq('Eintrag am Tag nach der Umstellung wird gezaehlt', drin.total, 8);
  eq('und steht am richtigen Tag', iso(drin.dates[drin.values.indexOf(8)]), '2026-10-26');
}

// =========================================================================
group('Durchschnitte');
{
  const S = loadStats(at(2026, 9, 14));
  const ma = S.movingAverage([10, 20, 30, 40], 7);
  near('Schnitt fuellt sich auf', ma[0], 10);
  near('Schnitt nach zwei Werten', ma[1], 15);
  near('Schnitt nach vier Werten', ma[3], 25);

  const ma2 = S.movingAverage([1, 1, 1, 1, 1, 1, 1, 8], 7);
  near('Fenster laeuft mit (letzte 7)', ma2[7], (1 * 6 + 8) / 7);
}

// =========================================================================
group('Wochenbuendel (weekly)');
{
  const S = loadStats(at(2026, 9, 14));
  const values = [], dates = [], targets = [];
  for (let i = 0; i < 30; i++) {
    values.push(i + 1);                       // 1..30
    dates.push(new Date(2026, 7, 16 + i));
    targets.push(40 - Math.floor(i / 14) * 4);
  }
  const w = S.weekly({ values, dates, labels: [], total: 465, prevTotal: 0 }, targets);

  eq('30 Tage -> 5 Buendel (2 + 4x7)', w.series.values.length, 5);
  near('erstes Buendel = Ø der ersten 2 Tage', w.series.values[0], 1.5);
  near('zweites Buendel = Ø Tag 3..9', w.series.values[1], (3 + 4 + 5 + 6 + 7 + 8 + 9) / 7);
  near('letztes Buendel = Ø Tag 24..30', w.series.values[4], (24 + 25 + 26 + 27 + 28 + 29 + 30) / 7);
  eq('letztes Buendel beginnt 6 Tage vor heute', iso(w.series.dates[4]), iso(dates[23]));
  eq('Sollwerte gebuendelt', w.targets.length, 5);
  near('Soll im ersten Buendel', w.targets[0], 40);

  // Ø der Buendel, mit ihrer Laenge gewichtet, muss der Gesamtschnitt sein
  const laengen = [2, 7, 7, 7, 7];
  let summe = 0;
  w.series.values.forEach((v, i) => { summe += v * laengen[i]; });
  near('gewichteter Ø = Summe aller Tage', summe, 465, 1e-6);
}

// =========================================================================
group('Diazepam-Äquivalent');
{
  const S = loadStats(at(2026, 9, 14));
  const e = (name, amount, unit) => ({ name, amount, unit, category: 'M', time: '2026-09-14T12:00:00' });

  eq('Diazepam rechnet 1:1', S.eqValue(e('Diazepam', 10, 'mg')), 10);
  eq('Handelsname greift', S.eqValue(e('Tavor 1,0', 1, 'mg')) > 0, true);
  eq('ohne mg kein Äquivalent', S.eqValue(e('Diazepam', 1, 'Tablette')), null);
  eq('unbekannter Stoff zaehlt nicht', S.eqValue(e('Irgendwas', 10, 'mg')), null);

  const f = S.eqFactor('Lorazepam');
  eq('Lorazepam hat einen Faktor', typeof f === 'number' && f > 0, true);
  near('2 mg Lorazepam ueber den Faktor', S.eqValue(e('Lorazepam', 2, 'mg')), 2 * f, 1e-9);
}

// =========================================================================
group('Achsenobergrenze (niceCeil)');
{
  const S = loadStats(at(2026, 9, 14));
  [[0.4, 0.4], [7, 8], [42, 50], [61, 80], [100, 100]].forEach(([v, e]) => {
    ok('niceCeil(' + v + ') >= ' + v, S.niceCeil(v) >= v, 'war ' + S.niceCeil(v));
  });
  eq('niceCeil(0) ist nicht 0', S.niceCeil(0) > 0, true);
}

// =========================================================================
group('Achse in vier Stufen (niceAxis)');
{
  const S = loadStats(at(2026, 9, 14));

  eq('Spitze 126 -> 160 (0/40/80/120/160)', S.niceAxis(126), 160);
  eq('Spitze 1159 -> 1200 (0/300/600/900/1200)', S.niceAxis(1159), 1200);

  /* Worauf die Lesbarkeit beruht: die Achse deckt den hoechsten Wert ab,
     und jede der vier Stufen ist eine Zahl, die man an eine Achse
     schreibt - sonst bleiben Gitterlinien unbeschriftet und man muss
     Balkenhoehen schaetzen. */
  let zuKlein = 0, unrund = 0, zuViel = 0, krumm = 0;
  for (let v = 0.4; v < 5000; v *= 1.07) {
    const m = S.niceAxis(v);
    const stufe = m / 4;
    if (m < v) zuKlein++;
    // hoechstens zwei Dezimalen - bei 0,5-mg-Schritten sind welche noetig
    if (Math.abs(stufe * 100 - Math.round(stufe * 100)) > 1e-9) krumm++;
    // im mg-DAe-Bereich muessen es ganze Zahlen sein
    if (v >= 40 && stufe !== Math.round(stufe)) unrund++;
    if (m > v * 2.2) zuViel++;              // Kopffreiheit im Rahmen
  }
  eq('deckt immer den Spitzenwert ab', zuKlein, 0);
  eq('keine krummen Stufen wie 37,333', krumm, 0);
  eq('ab 40 sind die Stufen ganze Zahlen', unrund, 0);
  eq('keine uebertriebene Kopffreiheit', zuViel, 0);
}

// =========================================================================
group('Warum ein Plan nicht gilt (problem)');
{
  const P = loadPlan(at(2026, 9, 14));
  const gut = { start: '2026-06-01', startDose: 60, targetDose: 20, stepAmount: 4, stepDays: 14 };
  const mit = (aenderung) => P.problem(Object.assign({}, gut, aenderung));

  eq('vollstaendiger Plan hat kein Problem', P.problem(gut), null);
  eq('valid() und problem() sind einig', P.valid(gut), P.problem(gut) === null);

  ok('Startdatum fehlt', /Startdatum/.test(mit({ start: '' })), mit({ start: '' }));
  ok('Startdatum unbrauchbar', /Startdatum/.test(mit({ start: 'kein Datum' })), mit({ start: 'kein Datum' }));
  ok('Startdosis fehlt', /Startdosis/.test(mit({ startDose: NaN })), mit({ startDose: NaN }));
  ok('Zielwert fehlt', /Zielwert/.test(mit({ targetDose: NaN })), mit({ targetDose: NaN }));
  ok('negativer Wert wird benannt', /negativ/.test(mit({ targetDose: -1 })), mit({ targetDose: -1 }));
  ok('Schrittlaenge unter 1', /mindestens 1/.test(mit({ stepDays: 0 })), mit({ stepDays: 0 }));
  ok('Reduktion 0', /gr..er als 0/.test(mit({ stepAmount: 0 })), mit({ stepAmount: 0 }));
  ok('Zielwert nicht unter Startdosis',
    /unter der Startdosis/.test(mit({ targetDose: 60 })), mit({ targetDose: 60 }));

  /* Der entscheidende Punkt: was problem() durchlaesst, muss save()
     annehmen - sonst drueckt man Speichern, sieht keinen Grund und der
     Plan ist trotzdem nicht da. */
  let uneins = 0;
  [{}, { start: '' }, { startDose: NaN }, { targetDose: 60 }, { stepDays: 0 },
   { stepAmount: 0 }, { targetDose: -1 }, { start: 'x' }].forEach(a => {
    const p2 = Object.assign({}, gut, a);
    if ((P.problem(p2) === null) !== P.valid(p2)) uneins++;
  });
  eq('problem() und valid() nie uneins', uneins, 0);
}

// =========================================================================
group('Soll-Linie im Diagramm');
{
  const S = loadStats(at(2026, 9, 14));
  const werte = [40, 140, 160, 140, 130, 130, 120, 100, 100, 80, 80, 80, 80, 80, 40];
  const dates = werte.map((_, i) => new Date(2026, 7, 31 + i));
  const serie = { values: werte, dates: dates, labels: dates.map(() => '01.01'),
                  total: 0, prevTotal: 0 };
  const linien = svg => (svg.match(/<polyline/g) || []).length;

  /* Der Fall, der in der App auftrat: der Plan startet heute. Im
     Rueckblick hat dann nur der letzte Tag einen Sollwert - eine Strecke
     aus einem Punkt. Die wurde verworfen, und das Diagramm blieb ohne
     Soll-Linie, obwohl die Legende eine ankuendigte. */
  const einTag = werte.map((_, i) => (i === werte.length - 1 ? 60 : null));
  const svg1 = S.verlaufChart(serie, 'mg DÄ', einTag);
  ok('ein einzelner Soll-Tag wird gezeichnet', linien(svg1) > 0);
  ok('und beschriftet', svg1.indexOf('Soll') >= 0);

  // mehrere Tage: unveraendert eine Linie
  const viele = werte.map((_, i) => (i >= 10 ? 60 : null));
  ok('mehrere Soll-Tage ergeben eine Linie', linien(S.verlaufChart(serie, 'mg DÄ', viele)) > 0);

  // ohne Plan keine Linie und kein Label
  const ohne = S.verlaufChart(serie, 'mg DÄ', null);
  eq('ohne Plan keine Soll-Linie', linien(ohne), 0);
  eq('ohne Plan kein Soll-Label', ohne.indexOf('Soll'), -1);

  /* Luecke mitten im Fenster: vor dem Planstart gibt es kein Soll, danach
     schon - die Linie darf die Luecke nicht ueberbruecken. */
  const mitLuecke = werte.map((_, i) => (i < 3 ? 60 : (i > 8 ? 40 : null)));
  eq('Luecke bleibt eine Luecke', linien(S.verlaufChart(serie, 'mg DÄ', mitLuecke)), 4);
}

// ---------- Ergebnis ----------
console.log('');
if (fails.length === 0) {
  console.log('  ' + pass + ' Prüfungen, alle bestanden.');
  process.exit(0);
}
console.log('  ' + pass + ' bestanden, ' + fails.length + ' fehlgeschlagen:\n');
fails.forEach(f => console.log('   ✗ ' + f));
console.log('');
process.exit(1);
