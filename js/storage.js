/* ==========================================================
   storage.js  -  saving things in the visitor's browser
   ----------------------------------------------------------
   localStorage  = survives closing the browser (favorites, last result)
   sessionStorage = survives reloads but not closing the tab (quiz progress)

   Browsers can refuse storage (private mode) or hold broken data,
   so every read/write is wrapped in try/catch. If a stored value is
   corrupted we delete ONLY that one key and carry on (spec: JM-S02).
   ========================================================== */
(function () {
  'use strict';
  var JM = window.JM;

  var KEYS = {
    favorites: 'jm:favorites:v1',
    lastMatch: 'jm:lastMatch:v1',
    progress:  'jm:progress:v1',
    look:      'jm:look:v1'
  };

  // If the browser blocks storage entirely, we fall back to plain
  // variables so the site still works until the page is closed.
  var memory = {};

  function getStore(name) {
    try {
      var store = window[name];
      var probe = '__jm_probe__';
      store.setItem(probe, probe);
      store.removeItem(probe);
      return store;
    } catch (err) {
      return null;
    }
  }

  function read(storeName, key) {
    var store = getStore(storeName);
    if (!store) {
      return memory[key] === undefined ? null : memory[key];
    }
    try {
      var raw = store.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch (err) {
      try { store.removeItem(key); } catch (err2) { /* nothing more to do */ }
      return null;
    }
  }

  function write(storeName, key, value) {
    var store = getStore(storeName);
    if (!store) {
      memory[key] = value;
      return false;
    }
    try {
      store.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      memory[key] = value;
      return false;
    }
  }

  function remove(storeName, key) {
    var store = getStore(storeName);
    delete memory[key];
    if (store) {
      try { store.removeItem(key); } catch (err) { /* ignore */ }
    }
  }

  function knownId(id) {
    return JM.jewelry.some(function (item) { return item.id === id; });
  }

  // Keep only answers that are valid options (never trust stored data).
  function cleanAnswers(raw) {
    var clean = {};
    if (!raw || typeof raw !== 'object') return clean;
    JM.DIMENSIONS.forEach(function (dim) {
      var ok = JM.OPTIONS[dim].some(function (opt) { return opt.value === raw[dim]; });
      if (ok) clean[dim] = raw[dim];
    });
    return clean;
  }

  JM.storage = {

    /* ----- Favorites: an array of object ids ----- */
    getFavorites: function () {
      var raw = read('localStorage', KEYS.favorites);
      if (raw === null) return [];
      if (!Array.isArray(raw)) {
        remove('localStorage', KEYS.favorites);   // corrupted: clear only this key
        return [];
      }
      var seen = {};
      return raw.filter(function (id) {
        if (typeof id !== 'string' || !knownId(id) || seen[id]) return false;
        seen[id] = true;
        return true;
      });
    },

    isFavorite: function (id) {
      return JM.storage.getFavorites().indexOf(id) !== -1;
    },

    // Adds the id if missing, removes it if present. Returns true if now saved.
    toggleFavorite: function (id) {
      var list = JM.storage.getFavorites();
      var index = list.indexOf(id);
      if (index === -1) { list.push(id); } else { list.splice(index, 1); }
      write('localStorage', KEYS.favorites, list);
      return index === -1;
    },

    /* ----- Latest match result ----- */
    saveLastMatch: function (answers, rankedIds) {
      write('localStorage', KEYS.lastMatch, {
        answers: answers,
        rankedIds: rankedIds,
        savedAt: new Date().toISOString()
      });
    },

    getLastMatch: function () {
      var raw = read('localStorage', KEYS.lastMatch);
      if (!raw || typeof raw !== 'object') return null;
      var answers = cleanAnswers(raw.answers);
      if (!JM.validateAnswers(answers).valid || !Array.isArray(raw.rankedIds)) {
        remove('localStorage', KEYS.lastMatch);
        return null;
      }
      return {
        answers: answers,
        rankedIds: raw.rankedIds.filter(knownId),
        savedAt: raw.savedAt
      };
    },

    /* ----- "Build your look": which saved piece is chosen for each place.
           Stored as { ear: 'drop-study', ... }. Anything invalid is dropped. ----- */
    getLook: function () {
      var raw = read('localStorage', KEYS.look);
      var clean = {};
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
      JM.OPTIONS.placement.forEach(function (opt) {
        var id = raw[opt.value];
        var item = JM.jewelry.filter(function (j) { return j.id === id; })[0];
        if (item && item.placement === opt.value) clean[opt.value] = id;
      });
      return clean;
    },

    setLook: function (placement, id) {
      var look = JM.storage.getLook();
      var ok = JM.OPTIONS.placement.some(function (opt) { return opt.value === placement; });
      if (!ok) return;
      if (id) { look[placement] = id; } else { delete look[placement]; }
      write('localStorage', KEYS.look, look);
    },

    /* ----- In-progress quiz (sessionStorage) ----- */
    saveProgress: function (state) {
      write('sessionStorage', KEYS.progress, { step: state.step, answers: state.answers });
    },

    getProgress: function () {
      var raw = read('sessionStorage', KEYS.progress);
      if (!raw || typeof raw !== 'object') return null;
      var answers = cleanAnswers(raw.answers);
      var step = parseInt(raw.step, 10);
      if (isNaN(step) || step < 0 || step > 4) step = 0;
      // Only show results again if every answer is still valid.
      if (step === 4 && !JM.validateAnswers(answers).valid) step = 0;
      return { step: step, answers: answers };
    },

    clearProgress: function () {
      remove('sessionStorage', KEYS.progress);
    }
  };
})();
