/* Tagebuch – Abdosierungsplan.

   Was dieses Modul NICHT tut: einen Plan vorschlagen. Es gibt keine
   voreingestellte Reduktionsrate, keine ausgefuellten Felder, keine
   Empfehlung. Alle Zahlen kommen von der Person, die den Plan eintraegt.
   Gerechnet wird nur, was sich aus diesen Zahlen ergibt.

   Der Grund ist nicht Vorsicht um der Vorsicht willen: Wer eine Kurve
   vorschlaegt, gibt eine Dosierung vor. Zu schnelles Reduzieren von
   Benzodiazepinen kann Krampfanfaelle ausloesen. Das gehoert aerztlich
   begleitet - die App kann nur zeigen, wie weit Ist und Soll auseinander
   liegen. */
(function () {
  'use strict';

  var KEY = 'tagebuch_plan_v1';
  var DAY = 86400000;

  /* ---------- Kalendertage ----------
     Ein Tag sind nicht immer 86.400.000 ms: in Europe/Berlin hat der
     Umstellungstag im Maerz 23 Stunden und der im Oktober 25. Wer mit
     Millisekunden rechnet, verschiebt danach jede Tagesgrenze um eine
     Stunde - und damit reihenweise Werte um einen ganzen Tag.
     Darum: Datumsteile rechnen, nie Zeitstempel addieren. */
  function dMidnight(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function dAdd(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }
  function dDiff(a, b) {            // a minus b, in Kalendertagen
    return Math.round((Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) -
                       Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / 86400000);
  }

  function read() {
    try {
      var p = JSON.parse(localStorage.getItem(KEY) || 'null');
      return valid(p) ? p : null;
    } catch (e) { return null; }
  }

  function valid(p) {
    if (!p || typeof p !== 'object') return false;
    var nums = ['startDose', 'targetDose', 'stepAmount', 'stepDays'];
    for (var i = 0; i < nums.length; i++) {
      var v = Number(p[nums[i]]);
      if (!isFinite(v) || v < 0) return false;
    }
    if (Number(p.stepDays) < 1) return false;
    if (Number(p.stepAmount) <= 0) return false;
    if (Number(p.startDose) <= Number(p.targetDose)) return false;
    if (!p.start || isNaN(new Date(p.start + 'T00:00:00').getTime())) return false;
    return true;
  }

  function save(p) {
    if (!valid(p)) return false;
    localStorage.setItem(KEY, JSON.stringify(p));
    return true;
  }

  function clear() { localStorage.removeItem(KEY); }
  function isActive() { return !!read(); }

  /* Starttag als Datum, nicht als Zeitstempel - gerechnet wird in Tagen. */
  function startDay(p) {
    return dMidnight(new Date(p.start + 'T00:00:00'));
  }

  /* Sollwert fuer einen Tag. Vor dem Start gibt es keinen - dort waere
     jede Zahl erfunden. */
  function targetFor(date, plan) {
    var p = plan || read();
    if (!p) return null;
    var days = dDiff(date, startDay(p));
    if (days < 0) return null;
    var steps = Math.floor(days / Number(p.stepDays));
    var v = Number(p.startDose) - steps * Number(p.stepAmount);
    return Math.max(Number(p.targetDose), Math.round(v * 1000) / 1000);
  }

  /* Wann waere der Zielwert erreicht? Reine Fortschreibung der eigenen
     Zahlen, keine Prognose ueber den Menschen. */
  function endDate(plan) {
    var p = plan || read();
    if (!p) return null;
    var span = Number(p.startDose) - Number(p.targetDose);
    var steps = Math.ceil(span / Number(p.stepAmount));
    return dAdd(startDay(p), steps * Number(p.stepDays));
  }

  /* Der Fahrplan: welcher Sollwert ab welchem Tag gilt. Auch das ist keine
     Empfehlung, sondern die Liste, die sich aus Startdosis, Schrittweite und
     Schrittlaenge zwangslaeufig ergibt - nur ausgeschrieben, statt dass man
     sie im Kopf fortschreibt. */
  function schedule(plan) {
    var p = plan || read();
    if (!p) return [];
    var sd = startDay(p);
    var stepDays = Number(p.stepDays);
    var from = Number(p.startDose), to = Number(p.targetDose), amt = Number(p.stepAmount);
    var steps = Math.ceil((from - to) / amt);
    var out = [];
    for (var s = 0; s <= steps; s++) {
      var dose = Math.max(to, Math.round((from - s * amt) * 1000) / 1000);
      out.push({
        step: s,
        from: dAdd(sd, s * stepDays),
        until: dAdd(sd, (s + 1) * stepDays - 1),
        dose: dose,
        last: dose <= to
      });
      if (dose <= to) break;
    }
    return out;
  }

  /* Tempo als Durchschnitt. Die Schritte sind Stufen, kein Gefaelle - der
     Mittelwert macht zwei Plaene erst vergleichbar. */
  function pace(plan) {
    var p = plan || read();
    if (!p) return null;
    var span = Number(p.startDose) - Number(p.targetDose);
    var steps = Math.ceil(span / Number(p.stepAmount));
    var days = steps * Number(p.stepDays);
    if (!(days > 0)) return null;
    return {
      days: days,
      steps: steps,
      perDay: span / days,
      perWeek: (span / days) * 7
    };
  }

  /* Wo stehe ich heute, was kommt als naechstes. */
  function position(plan) {
    var p = plan || read();
    if (!p) return null;
    var today = dMidnight(new Date());
    var sd = startDay(p);
    var stepDays = Number(p.stepDays);
    var diff = dDiff(today, sd);
    var plan_end = endDate(p);
    if (diff < 0) {
      return {
        started: false,
        startsIn: -diff,
        startDate: sd,
        target: null,
        endDate: plan_end
      };
    }
    var sched = schedule(p);
    var idx = Math.min(Math.floor(diff / stepDays), sched.length - 1);
    var cur = sched[idx];
    var next = sched[idx + 1] || null;
    var daysToNext = next ? dDiff(next.from, today) : null;
    var daysLeft = Math.max(0, dDiff(plan_end, today));
    return {
      started: true,
      target: targetFor(today, p),
      step: idx + 1,
      steps: sched.length,
      current: cur,
      next: next,
      daysToNext: daysToNext,
      daysLeft: daysLeft,
      endDate: plan_end,
      done: cur ? cur.last : false
    };
  }

  function summary() {
    var p = read();
    if (!p) return null;
    var today = new Date();
    var soll = targetFor(today, p);
    var end = endDate(p);
    return {
      plan: p,
      target: soll,
      unit: p.unit || 'mg DÄ',
      endDate: end,
      pace: pace(p),
      position: position(p),
      schedule: schedule(p),
      done: soll !== null && soll <= Number(p.targetDose)
    };
  }

  window.TagebuchPlan = {
    get: read, save: save, clear: clear, isActive: isActive,
    valid: valid, targetFor: targetFor, endDate: endDate, summary: summary,
    schedule: schedule, pace: pace, position: position
  };
})();
