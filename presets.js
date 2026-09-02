/* Tagebuch – Vorlagen für den leeren Zustand.

   Ein Tagebuch ist erstmal nur "Zeitpunkt, Bezeichnung, Menge, Notiz".
   Was daraus wird, entscheidet der Nutzer. Die Vorlagen aendern nur die
   Vorschlaege in den Eingabefeldern - nie die Daten selbst, und man kann
   jederzeit alles frei eintippen. */
(function () {
  'use strict';

  var PRESET_KEY = 'tagebuch_preset_v1';

  var PRESETS = [
    {
      id: 'konsum', title: 'Konsum', hint: 'Substanz und Menge, mit Diazepam-Äquivalent',
      category: 'Konsum', units: ['mg', 'g', 'ml', 'Stück'],
      names: ['Alprazolam', 'Clonazepam', 'Diazepam', 'Lorazepam', 'Alkohol', 'Nikotin', 'Koffein']
    },
    {
      id: 'medis', title: 'Medikamente', hint: 'Einnahme mit Uhrzeit und Dosis',
      category: 'Medikament', units: ['mg', 'Stück', 'Tropfen', 'ml'],
      names: ['Ibuprofen', 'Paracetamol', 'Pantoprazol', 'Vitamin D']
    },
    {
      id: 'essen', title: 'Essen', hint: 'Was, wann, wie viel',
      category: 'Essen', units: ['g', 'ml', 'Portion', 'kcal'],
      names: ['Frühstück', 'Mittag', 'Abendessen', 'Snack', 'Kaffee', 'Wasser']
    },
    {
      id: 'stimmung', title: 'Stimmung', hint: 'Von 1 bis 10, dazu eine Notiz',
      category: 'Stimmung', units: ['/10'],
      names: ['Stimmung', 'Anspannung', 'Energie', 'Schlafqualität', 'Craving']
    },
    {
      id: 'training', title: 'Training', hint: 'Übung, Gewicht, Dauer',
      category: 'Training', units: ['kg', 'min', 'km', 'Sätze', 'Wdh.'],
      names: ['Bankdrücken', 'Kniebeuge', 'Kreuzheben', 'Laufen', 'Radfahren']
    },
    {
      id: 'traeume', title: 'Träume', hint: 'Direkt nach dem Aufwachen, ohne Mengen',
      category: 'Traum', units: [],
      names: ['Traum', 'Albtraum', 'Klartraum']
    },
    {
      id: 'schmerz', title: 'Schmerzen', hint: 'Stärke von 1 bis 10, wo und wann',
      category: 'Schmerz', units: ['/10'],
      names: ['Kopfschmerz', 'Rücken', 'Nacken', 'Bauch']
    },
    {
      id: 'ausgaben', title: 'Ausgaben', hint: 'Wofür und wie viel',
      category: 'Ausgabe', units: ['€'],
      names: ['Einkauf', 'Essen gehen', 'Fahrtkosten', 'Abo']
    }
  ];

  function get(id) {
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i];
    return null;
  }
  function current() { return get(localStorage.getItem(PRESET_KEY)); }
  function set(id) {
    if (id) localStorage.setItem(PRESET_KEY, id);
    else localStorage.removeItem(PRESET_KEY);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Vorschlagslisten fuellen. Bereits eingetragene Bezeichnungen stehen
     vorn - was man schon benutzt hat, ist relevanter als jede Vorlage. */
  function applySuggestions(usedNames) {
    var p = current();
    var names = (usedNames || []).slice();
    if (p) {
      p.names.forEach(function (n) { if (names.indexOf(n) === -1) names.push(n); });
    }
    var nameList = document.getElementById('nameSuggestions');
    if (nameList) {
      nameList.innerHTML = names.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
    }
    if (p) {
      var unitList = document.getElementById('unitSuggestions');
      if (unitList && p.units.length) {
        unitList.innerHTML = p.units.map(function (u) { return '<option value="' + esc(u) + '">'; }).join('');
      }
      var catList = document.getElementById('catSuggestions');
      if (catList) {
        catList.innerHTML = '<option value="' + esc(p.category) + '">';
      }
    }
  }

  function emptyStateHTML() {
    return '' +
      '<div class="welcome">' +
        '<h2>Wofür willst du es nutzen?</h2>' +
        '<p>Ein Tagebuch ist hier nur: Zeitpunkt, Bezeichnung, Menge, Notiz. Was daraus wird, entscheidest du. ' +
        'Such dir einen Startpunkt – die Vorlage füllt nur die Vorschläge, eintippen kannst du immer alles.</p>' +
        '<div class="preset-grid">' +
          PRESETS.map(function (p) {
            return '<button class="preset" data-preset="' + p.id + '">' +
              '<span class="preset-title">' + esc(p.title) + '</span>' +
              '<span class="preset-hint">' + esc(p.hint) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<button class="preset-skip" data-preset="">Ohne Vorlage anfangen</button>' +
      '</div>';
  }

  window.TagebuchPresets = {
    list: PRESETS,
    get: get,
    current: current,
    set: set,
    applySuggestions: applySuggestions,
    emptyStateHTML: emptyStateHTML
  };
})();
