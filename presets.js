/* Tagebuch – Themen.

   Ein Tagebuch ist im Kern nur "Zeitpunkt, Bezeichnung, Menge, Notiz". Themen
   sind kein Modus und keine Identitaet der App, sondern nur Vorschlaege fuer
   die Eingabefelder. Deshalb: mehrere gleichzeitig, jederzeit aenderbar,
   eigene erlaubt. Die Daten selbst beruehrt das nie. */
(function () {
  'use strict';

  var TOPICS_KEY = 'tagebuch_topics_v1';
  var LEGACY_KEY = 'tagebuch_preset_v1';

  /* Ein Thema bestimmt, WELCHE Felder es gibt - nicht nur, was in ihnen
     vorgeschlagen wird. Feldtypen:
       menge  Zahl mit Einheit (Einheit kommt vom Thema)
       skala  1 bis 10 als Schieberegler; gespeichert als Menge mit Einheit "/10"
       dauer  zusaetzliches Ende; gespeichert als endTime
       text   grosses Textfeld statt kleiner Notiz

     Wichtig: Alle Feldtypen bilden auf die bestehenden Felder ab
     (time, name, amount, unit, category, note). Nur "dauer" ergaenzt endTime.
     Dadurch bleiben alte Eintraege und der Sync unveraendert gueltig. */
  var BUILTIN = [
    { id: 'konsum', title: 'Konsum',
      hint: 'Substanzen und Dosis – mit Diazepam-Äquivalent',
      category: 'Konsum', fields: ['menge'], unit: 'mg',
      units: ['mg', 'g', 'ml', 'Stück'],
      names: ['Alprazolam', 'Clonazepam', 'Diazepam', 'Lorazepam', 'Bromazepam',
              'Oxazepam', 'Temazepam', 'Lormetazepam', 'Nitrazepam', 'Flunitrazepam',
              'Midazolam', 'Clobazam', 'Chlordiazepoxid', 'Triazolam', 'Etizolam',
              'Zopiclon', 'Zolpidem',
              'Alkohol', 'Codein', 'Nikotin', 'Cannabis', 'Ketamin'] },

    { id: 'medis', title: 'Medikamente',
      hint: 'Verordnetes und Rezeptfreies, ohne Konsumbezug',
      category: 'Medikament', fields: ['menge'], unit: 'mg',
      units: ['mg', 'Stück', 'Tropfen', 'ml', 'µg'],
      names: ['Ibuprofen', 'Paracetamol', 'Novaminsulfon', 'Pantoprazol',
              'Vitamin D', 'Antibiotikum', 'Blutdrucktablette'] },

    { id: 'stimmung', title: 'Stimmung', hint: 'Von 1 bis 10, dazu eine Notiz',
      category: 'Stimmung', fields: ['skala'], scaleLabel: 'Wie stark?',
      units: [], names: ['Stimmung', 'Anspannung', 'Energie', 'Craving'] },

    { id: 'traeume', title: 'Träume', hint: 'Großes Textfeld, keine Mengen',
      category: 'Traum', fields: ['text'], textLabel: 'Traum',
      units: [], names: ['Traum', 'Albtraum', 'Klartraum'] },

    { id: 'essen', title: 'Essen', hint: 'Was, wann, wie viel',
      category: 'Essen', fields: ['menge'], unit: 'g',
      units: ['g', 'ml', 'Portion', 'kcal'],
      names: ['Frühstück', 'Mittag', 'Abendessen', 'Snack', 'Kaffee', 'Wasser'] },

    { id: 'schlaf', title: 'Schlaf', hint: 'Von wann bis wann, plus Qualität',
      category: 'Schlaf', fields: ['dauer', 'skala'], scaleLabel: 'Qualität',
      units: [], names: ['Schlaf', 'Nickerchen'] },

    { id: 'schmerz', title: 'Schmerzen', hint: 'Stärke von 1 bis 10, wo und wann',
      category: 'Schmerz', fields: ['skala'], scaleLabel: 'Stärke',
      units: [], names: ['Kopfschmerz', 'Rücken', 'Nacken', 'Bauch', 'Zahn'] },

    { id: 'periode', title: 'Periode', hint: 'Beginn und Ende, Stärke',
      category: 'Periode', fields: ['dauer', 'skala'], scaleLabel: 'Stärke',
      units: [], names: ['Periode', 'Zwischenblutung', 'Schmierblutung'] },

    { id: 'ausgaben', title: 'Ausgaben', hint: 'Wofür und wie viel, in Euro',
      category: 'Ausgabe', fields: ['menge'], unit: '€', units: ['€'],
      names: ['Einkauf', 'Essen gehen', 'Fahrtkosten', 'Abo', 'Miete'] }
  ];

  var FALLBACK = { id: '', title: 'Sonstiges', category: '', fields: ['menge'],
                   unit: '', units: ['mg', 'g', 'ml', 'Stück', '€'], names: [] };

  // ---------- Speicherung ----------
  /* Gespeichert werden nur die IDs (und eigene Themen komplett). Die
     Definition kommt immer aus dem Code - sonst behalten Leute, die frueher
     gewaehlt haben, fuer immer die alten Feldlisten und Vorschlaege. */
  function resolve(raw) {
    var out = [];
    (raw || []).forEach(function (item) {
      var id = typeof item === 'string' ? item : item && item.id;
      if (!id) return;
      var b = BUILTIN.filter(function (t) { return t.id === id; })[0];
      if (b) { if (out.indexOf(b) === -1) out.push(b); }
      else if (typeof item === 'object' && item.custom) {
        if (!item.fields) item.fields = ['menge'];
        out.push(item);
      }
    });
    return out;
  }

  function load() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(TOPICS_KEY) || 'null'); } catch (e) { raw = null; }
    if (Array.isArray(raw)) return resolve(raw);

    // Aus der alten Einzelauswahl uebernehmen, damit niemand neu waehlen muss
    var old = localStorage.getItem(LEGACY_KEY);
    if (old) {
      var one = BUILTIN.filter(function (t) { return t.id === old; });
      if (one.length) { save(one); return one; }
    }
    return [];
  }
  function save(list) {
    var slim = list.map(function (t) { return t.custom ? t : t.id; });
    try { localStorage.setItem(TOPICS_KEY, JSON.stringify(slim)); } catch (e) {}
    localStorage.removeItem(LEGACY_KEY);
  }
  function chosen() { return load(); }
  function isChosen(id) { return load().some(function (t) { return t.id === id; }); }

  function toggle(id) {
    var list = load();
    var idx = list.findIndex(function (t) { return t.id === id; });
    if (idx >= 0) { list.splice(idx, 1); }
    else {
      var b = BUILTIN.filter(function (t) { return t.id === id; })[0];
      if (b) list.push(b);
    }
    save(list);
    return list;
  }
  function addCustom(title, unit) {
    title = String(title || '').trim();
    if (!title) return null;
    var list = load();
    var id = 'eigen:' + title.toLowerCase();
    if (list.some(function (t) { return t.id === id; })) return list;
    list.push({
      id: id, title: title, hint: 'Eigenes Thema', category: title,
      fields: ['menge'], unit: unit ? String(unit).trim() : '',
      units: unit ? [String(unit).trim()] : [], names: [], custom: true
    });
    save(list);
    return list;
  }
  function removeTopic(id) {
    save(load().filter(function (t) { return t.id !== id; }));
  }

  /* Welches Thema gehoert zu dieser Kategorie? Danach richtet sich, welche
     Felder das Formular zeigt. Unbekannte Kategorie -> Standardfelder. */
  function byCategory(cat) {
    cat = String(cat || '').trim().toLowerCase();
    if (!cat) return FALLBACK;
    var all = load().concat(BUILTIN);
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].category || '').toLowerCase() === cat) return all[i];
    }
    return FALLBACK;
  }
  function fallback() { return FALLBACK; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Vorschlaege ----------
  function applySuggestions(usedNames) {
    var list = load();
    var names = (usedNames || []).slice();
    var units = [], cats = [];
    list.forEach(function (t) {
      t.names.forEach(function (n) { if (names.indexOf(n) === -1) names.push(n); });
      t.units.forEach(function (u) { if (units.indexOf(u) === -1) units.push(u); });
      if (cats.indexOf(t.category) === -1) cats.push(t.category);
    });
    function fill(id, values) {
      var el = document.getElementById(id);
      if (el && values.length) {
        el.innerHTML = values.map(function (v) { return '<option value="' + esc(v) + '">'; }).join('');
      }
    }
    fill('nameSuggestions', names);
    fill('unitSuggestions', units);
    fill('catSuggestions', cats);
  }

  /* Genau eine Kategorie vorbelegen ergibt nur Sinn, wenn es auch nur ein
     Thema gibt - sonst raet die App, und Raten nervt mehr als ein leeres Feld. */
  function defaultCategory() {
    var list = load();
    return list.length === 1 ? list[0].category : '';
  }

  // ---------- Auswahl-Oberflaeche ----------
  function pickerHTML(opts) {
    opts = opts || {};
    var sel = load();
    var selIds = sel.map(function (t) { return t.id; });
    var customs = sel.filter(function (t) { return t.custom; });

    var cards = BUILTIN.map(function (t) {
      var on = selIds.indexOf(t.id) >= 0;
      return '<button class="topic' + (on ? ' on' : '') + '" data-topic="' + t.id + '" aria-pressed="' + on + '">' +
        '<span class="topic-mark" aria-hidden="true"></span>' +
        '<span class="topic-title">' + esc(t.title) + '</span>' +
        '<span class="topic-hint">' + esc(t.hint) + '</span>' +
      '</button>';
    }).join('');

    var customList = customs.map(function (t) {
      return '<span class="own"><b>' + esc(t.title) + '</b>' +
        (t.units[0] ? '<i>' + esc(t.units[0]) + '</i>' : '') +
        '<button class="own-x" data-remove="' + esc(t.id) + '" aria-label="Entfernen">×</button></span>';
    }).join('');

    return '<div class="topics">' +
      (opts.heading ? '<h2>' + esc(opts.heading) + '</h2>' : '') +
      (opts.intro ? '<p class="topics-intro">' + opts.intro + '</p>' : '') +
      '<div class="topic-grid">' + cards + '</div>' +
      '<div class="own-box">' +
        '<div class="own-row">' +
          '<input type="text" class="own-name" placeholder="Eigenes Thema, z.B. Wasser">' +
          '<input type="text" class="own-unit" placeholder="Einheit">' +
          '<button class="own-add" type="button">+</button>' +
        '</div>' +
        (customList ? '<div class="own-list">' + customList + '</div>' : '') +
      '</div>' +
      (opts.cta ? '<button class="topics-go" type="button">' + esc(opts.cta) + '</button>' : '') +
    '</div>';
  }

  /* Ereignisse an einen Container haengen. onChange wird nach jeder Aenderung
     gerufen, damit der Aufrufer neu zeichnen kann. */
  /* Wer den Namen eintippt und direkt auf den Abschluss-Knopf geht, hat ihn
     sonst umsonst getippt. Das ist eine Falle, kein Bedienfehler - also
     uebernehmen wir ihn an dieser Stelle automatisch. */
  function commitPending(root) {
    var n = root.querySelector('.own-name');
    var u = root.querySelector('.own-unit');
    if (n && n.value.trim()) { addCustom(n.value, u ? u.value : ''); return true; }
    return false;
  }

  function bindPicker(root, onChange, onDone) {
    root.querySelectorAll('[data-topic]').forEach(function (el) {
      el.addEventListener('click', function () { toggle(el.dataset.topic); onChange(); });
    });
    root.querySelectorAll('[data-remove]').forEach(function (el) {
      el.addEventListener('click', function () { removeTopic(el.dataset.remove); onChange(); });
    });
    var add = root.querySelector('.own-add');
    if (add) {
      var run = function () {
        var n = root.querySelector('.own-name');
        var u = root.querySelector('.own-unit');
        if (!n.value.trim()) { n.focus(); return; }
        addCustom(n.value, u.value);
        onChange();
      };
      add.addEventListener('click', run);
      ['.own-name', '.own-unit'].forEach(function (sel) {
        root.querySelector(sel).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
      });
    }
    var go = root.querySelector('.topics-go');
    if (go && onDone) go.addEventListener('click', function () { commitPending(root); onDone(); });
  }

  function welcomeHTML() {
    return pickerHTML({
      heading: 'Was möchtest du festhalten?',
      intro: 'Ein Eintrag ist hier nur: Zeitpunkt, Bezeichnung, Menge, Notiz. Wähl aus, was zu dir passt – <strong>mehreres geht</strong>, und ändern kannst du es später jederzeit unter ⋯. Themen füllen nur die Vorschläge, eintippen kannst du immer alles.',
      cta: 'Los geht’s'
    });
  }

  // ---------- Styles ----------
  var style = document.createElement('style');
  style.textContent =
    '.topics{padding:22px 2px 8px}' +
    '.topics h2{font-size:19px;margin:0 0 8px;font-weight:700}' +
    '.topics-intro{font-size:13.5px;color:var(--text-dim);line-height:1.55;margin:0 0 18px}' +
    '.topic-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}' +
    '.topic{position:relative;text-align:left;background:var(--surface);border:1px solid var(--border);' +
      'color:var(--text);border-radius:13px;padding:13px 34px 14px 13px;cursor:pointer;font-family:inherit;' +
      'display:flex;flex-direction:column;gap:4px;min-height:78px}' +
    '.topic:active{background:var(--surface-2)}' +
    '.topic.on{border-color:var(--accent);background:var(--accent-dim)}' +
    '.topic-title{font-size:14.5px;font-weight:600}' +
    '.topic-hint{font-size:11.5px;color:var(--text-dim);line-height:1.4}' +
    '.topic-mark{position:absolute;top:12px;right:12px;width:17px;height:17px;border-radius:50%;' +
      'border:1.5px solid var(--border)}' +
    '.topic.on .topic-mark{border-color:var(--accent);background:var(--accent);}' +
    '.topic.on .topic-mark::after{content:"";position:absolute;left:5px;top:2px;width:4px;height:9px;' +
      'border:solid #14161a;border-width:0 2px 2px 0;transform:rotate(45deg)}' +
    '.own-box{margin-top:14px}' +
    '.own-row{display:flex;gap:7px}' +
    '.own-row input{flex:1;min-width:0;background:var(--surface-2);border:1px solid var(--border);' +
      'color:var(--text);border-radius:10px;padding:11px 12px;font-family:inherit;font-size:14px;outline:none}' +
    '.own-row input:focus{border-color:var(--accent)}' +
    '.own-row .own-unit{flex:0 0 88px}' +
    '.own-add{flex:0 0 44px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);' +
      'border-radius:10px;font-size:20px;cursor:pointer;font-family:inherit}' +
    '.own-add:active{background:var(--border)}' +
    '.own-list{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}' +
    '.own{display:inline-flex;align-items:center;gap:7px;background:var(--accent-dim);' +
      'border:1px solid var(--accent);border-radius:999px;padding:5px 6px 5px 12px;font-size:13px;color:var(--accent)}' +
    '.own i{font-style:normal;font-family:"JetBrains Mono",monospace;font-size:11px;opacity:.75}' +
    '.own-x{background:none;border:none;color:var(--accent);font-size:16px;line-height:1;cursor:pointer;padding:0 4px}' +
    '.topics-go{width:100%;margin-top:18px;background:var(--accent);color:#0f1210;border:none;border-radius:10px;' +
      'padding:13px;font-family:inherit;font-weight:600;font-size:15px;cursor:pointer}' +
    '.topics-go:active{transform:translateY(1px)}';
  document.head.appendChild(style);

  window.TagebuchPresets = {
    chosen: chosen, isChosen: isChosen, toggle: toggle,
    addCustom: addCustom, removeTopic: removeTopic,
    applySuggestions: applySuggestions, defaultCategory: defaultCategory,
    byCategory: byCategory, fallback: fallback, all: BUILTIN,
    pickerHTML: pickerHTML, welcomeHTML: welcomeHTML, bindPicker: bindPicker,
    commitPending: commitPending
  };
})();
