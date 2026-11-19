/* ==========================================================
   match.js  -  the scoring brain of Jewelry Match
   ----------------------------------------------------------
   These are "pure functions": they only look at what you hand
   them and return an answer. They never touch the page, never
   use random numbers and never remember anything. That is what
   makes them easy to test and easy to explain to your teacher.
   ========================================================== */

// In the browser, data.js has already created JM. In Node (tests),
// we load data.js ourselves.
var JM = (typeof window !== 'undefined' && window.JM) || null;
if (!JM && typeof require !== 'undefined') {
  JM = require('./data.js');
}

/* ----------------------------------------------------------
   Step 1: check the answers are complete and valid.
   Returns { valid, missing: [...], invalid: [...] }
   "missing" = the user has not answered that question yet.
   "invalid" = the value is not one of the allowed options.
   ---------------------------------------------------------- */
JM.validateAnswers = function (answers) {
  var missing = [];
  var invalid = [];
  var given = answers || {};

  JM.DIMENSIONS.forEach(function (dim) {
    var value = given[dim];
    if (value === undefined || value === null || value === '') {
      missing.push(dim);
      return;
    }
    var allowed = JM.OPTIONS[dim].some(function (opt) {
      return opt.value === value;
    });
    if (!allowed) {
      invalid.push(dim);
    }
  });

  return { valid: missing.length === 0 && invalid.length === 0, missing: missing, invalid: invalid };
};

/* ----------------------------------------------------------
   Step 2: score ONE object against the answers.
   For each dimension: if the object's tag equals the answer,
   add that dimension's weight. 40 + 25 + 20 + 15 = 100, so
   the total is already a percentage.
   ---------------------------------------------------------- */
JM.scoreObject = function (item, answers) {
  var score = 0;
  var matched = [];
  var breakdown = {};

  JM.DIMENSIONS.forEach(function (dim) {
    var isMatch = item[dim] === answers[dim];
    var points = isMatch ? JM.WEIGHTS[dim] : 0;
    breakdown[dim] = points;
    score += points;
    if (isMatch) {
      matched.push(dim);
    }
  });

  return { item: item, score: score, matched: matched, breakdown: breakdown };
};

/* ----------------------------------------------------------
   Step 3: turn the matched dimensions into an honest sentence.
   It only names what truly matched. Nothing is invented.
   ---------------------------------------------------------- */
function labelFor(dim, value) {
  var found = JM.OPTIONS[dim].filter(function (opt) { return opt.value === value; })[0];
  return found ? found.label.toLowerCase() : value;
}

// Shared label helper for the pages: "little-finger" -> "Little finger".
// (labelFor above lowercases on purpose, because it is used mid-sentence.)
JM.labelOf = function (dim, value) {
  var found = JM.OPTIONS[dim].filter(function (opt) { return opt.value === value; })[0];
  return found ? found.label : value;
};

/* ----------------------------------------------------------
   Archive filtering. filters looks like
   { placement: 'ear', form: '', material: '', mood: '' }
   An empty string means "any". A piece must match EVERY chosen
   filter (AND across dimensions). Collection order is kept.
   ---------------------------------------------------------- */
JM.filterItems = function (collection, filters) {
  var list = collection || JM.jewelry;
  var chosen = filters || {};
  return list.filter(function (item) {
    return JM.DIMENSIONS.every(function (dim) {
      return !chosen[dim] || item[dim] === chosen[dim];
    });
  });
};

function phraseFor(dim, value) {
  var label = labelFor(dim, value);
  if (dim === 'placement') return label + ' placement';
  if (dim === 'form') return label + ' form';
  if (dim === 'material') return label + ' material';
  return label + ' mood';
}

function joinWithAnd(parts) {
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] + ' and ' + parts[1];
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}

JM.explain = function (result, answers) {
  var pct = result.score + '% match';

  if (result.matched.length === 0) {
    return pct + ' — none of your four choices match this piece. It appears only because the collection is small.';
  }

  var parts = result.matched.map(function (dim) {
    return phraseFor(dim, answers[dim]);
  });
  var verb = parts.length === 1 ? 'matches' : 'match';
  var sentence = pct + ' — ' + joinWithAnd(parts) + ' ' + verb + ' your selected preferences.';

  // Be honest when only placement (or only one thing) matches.
  if (result.matched.length === 1) {
    sentence += ' Only this one choice matches; change your other answers to see different pieces.';
  }
  return sentence;
};

/* ----------------------------------------------------------
   Step 4: the whole pipeline.
   validate -> score every object -> stable sort -> top four.
   Returns { ok: true, results: [...] } or { ok: false, ... }.
   We NEVER invent a result when the input is bad.
   ---------------------------------------------------------- */
JM.rank = function (answers, collection, limit) {
  var list = collection || JM.jewelry;
  var topN = limit || 4;

  var check = JM.validateAnswers(answers);
  if (!check.valid) {
    return { ok: false, missing: check.missing, invalid: check.invalid, results: [] };
  }
  if (!Array.isArray(list) || list.length === 0) {
    return { ok: false, missing: [], invalid: [], error: 'no-data', results: [] };
  }

  var scored = list.map(function (item, index) {
    var result = JM.scoreObject(item, answers);
    result.index = index; // remember the original position
    return result;
  });

  // Highest score first. If two scores are equal, the piece that
  // comes EARLIER in the collection wins. This is the stable tie-break.
  scored.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  var results = scored.slice(0, topN).map(function (result) {
    result.reason = JM.explain(result, answers);
    // Label a weaker fit when the placement (the core choice) did not match.
    result.weakFit = result.matched.indexOf('placement') === -1;
    return result;
  });

  return { ok: true, results: results };
};

/* ----------------------------------------------------------
   Share links. The four answers are written into the part of the
   web address after the # (the "hash"), in plain readable words:
     match.html#edit-ear-liquid-silver-quiet
   No server is involved: the page that opens the link reads the
   words back, checks every one against the allowed options, and
   runs the same scoring. Anything invalid returns null (no guessing).
   ---------------------------------------------------------- */
JM.SHARE_PREFIX = 'edit-';

JM.encodeShare = function (answers) {
  return JM.SHARE_PREFIX + JM.DIMENSIONS.map(function (dim) { return answers[dim]; }).join('-');
};

JM.decodeShare = function (text) {
  var t = String(text || '').replace(/^#/, '').toLowerCase();
  if (t.indexOf(JM.SHARE_PREFIX) !== 0) return null;

  var rest = t.slice(JM.SHARE_PREFIX.length);
  var answers = {};

  for (var i = 0; i < JM.DIMENSIONS.length; i++) {
    var dim = JM.DIMENSIONS[i];
    var found = null;

    // Some values contain a hyphen (little-finger, after-dark), so we
    // match whole known option values instead of splitting on every "-".
    JM.OPTIONS[dim].forEach(function (opt) {
      if (rest === opt.value || rest.indexOf(opt.value + '-') === 0) found = opt.value;
    });
    if (!found) return null;

    answers[dim] = found;
    rest = rest.slice(found.length);

    if (i < JM.DIMENSIONS.length - 1) {
      if (rest.charAt(0) !== '-') return null;
      rest = rest.slice(1);
    }
  }

  if (rest !== '') return null;                 // leftover text = not one of our links
  return JM.validateAnswers(answers).valid ? answers : null;
};

/* ----------------------------------------------------------
   Sharing a LOOK (one piece per place on the body)
   ----------------------------------------------------------
   The link carries the catalog numbers of the chosen pieces, always in
   body order: look.html#look-006-009-000-001-010
   (ear, neckline, across the hand, little finger, ankle; 000 = skipped).
   The page that opens the link checks that every number is a real piece
   AND that it belongs to its place. Anything else returns null.
   ---------------------------------------------------------- */
JM.LOOK_PLACES = ['ear', 'neckline', 'across-hand', 'little-finger', 'ankle'];
JM.LOOK_PREFIX = 'look-';

// look = { ear: 'drop-study', neckline: 'none', ... }  ->  'look-006-000-...'  (or null if nothing is chosen)
JM.encodeLook = function (look) {
  var any = false;
  var groups = JM.LOOK_PLACES.map(function (place) {
    var item = JM.jewelry.filter(function (j) { return j.id === (look || {})[place]; })[0];
    if (item && item.placement === place) {
      any = true;
      return item.catalogNo.replace('JM-', '');
    }
    return '000';
  });
  return any ? JM.LOOK_PREFIX + groups.join('-') : null;
};

// 'look-006-000-...'  ->  { ear: 'drop-study', neckline: 'none', ... }  (or null if anything is wrong)
JM.decodeLook = function (text) {
  var t = String(text || '').replace(/^#/, '').toLowerCase();
  if (t.indexOf(JM.LOOK_PREFIX) !== 0) return null;

  var parts = t.slice(JM.LOOK_PREFIX.length).split('-');
  if (parts.length !== JM.LOOK_PLACES.length) return null;

  var look = {};
  var chosen = 0;
  for (var i = 0; i < parts.length; i++) {
    var place = JM.LOOK_PLACES[i];
    if (!/^\d{3}$/.test(parts[i])) return null;
    if (parts[i] === '000') { look[place] = 'none'; continue; }
    var item = JM.jewelry.filter(function (j) { return j.catalogNo === 'JM-' + parts[i]; })[0];
    if (!item || item.placement !== place) return null;       // unknown piece, or the wrong place
    look[place] = item.id;
    chosen++;
  }
  return chosen > 0 ? look : null;
};

/* ----------------------------------------------------------
   Match profile: a short name for a set of answers.
   Mood + material make the name ("The Quiet Silver"); the form
   adds one line of attitude; the placement says where it lives.
   Pure function: same answers, same profile, and nothing is stored.
   Returns null if the answers are not valid.
   ---------------------------------------------------------- */
JM.PROFILE_LINES = {
  angular:  'Cut in hard lines.',
  liquid:   'Poured, never made.',
  delicate: 'Fine enough to forget, strong enough to remember.',
  organic:  'Grown, not drawn.'
};
JM.profile = function (answers) {
  if (!JM.validateAnswers(answers).valid) return null;
  // Capital letter on every word, so "After dark" becomes "After Dark".
  function words(text) { return text.replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }
  var mood = words(JM.labelOf('mood', answers.mood));
  var material = words(JM.labelOf('material', answers.material));
  return {
    title: 'The ' + mood + ' ' + material,
    line: JM.PROFILE_LINES[answers.form] + ' Worn at the ' + JM.labelOf('placement', answers.placement).toLowerCase() + '.'
  };
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = JM;
}
