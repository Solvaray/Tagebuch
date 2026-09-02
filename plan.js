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

  function startDay(p) {
    var d = new Date(p.start + 'T00:00:00');
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  /* Sollwert fuer einen Tag. Vor dem Start gibt es keinen - dort waere
     jede Zahl erfunden. */
  function targetFor(date, plan) {
    var p = plan || read();
    if (!p) return null;
    var d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    var days = Math.floor((d.getTime() - startDay(p)) / DAY);
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
    return new Date(startDay(p) + steps * Number(p.stepDays) * DAY);
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
      done: soll !== null && soll <= Number(p.targetDose)
    };
  }

  window.TagebuchPlan = {
    get: read, save: save, clear: clear, isActive: isActive,
    valid: valid, targetFor: targetFor, endDate: endDate, summary: summary
  };
})();
