/* ==========================================================
   match.test.js  -  proves the scoring is correct
   Run it with:   node tests/match.test.js
   No libraries needed: it uses Node's built-in "assert".
   ========================================================== */
var assert = require('assert');
var JM = require('../js/match.js'); // match.js loads data.js for us

var passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS  ' + name);
  } catch (err) {
    console.log('  FAIL  ' + name);
    console.log('        ' + err.message);
    process.exitCode = 1;
  }
}

function find(id) {
  return JM.jewelry.filter(function (j) { return j.id === id; })[0];
}

console.log('\nData integrity');

test('collection has exactly 12 objects', function () {
  assert.strictEqual(JM.jewelry.length, 12);
});

test('ids and catalog numbers are unique', function () {
  var ids = {}, nos = {};
  JM.jewelry.forEach(function (j) { ids[j.id] = true; nos[j.catalogNo] = true; });
  assert.strictEqual(Object.keys(ids).length, 12);
  assert.strictEqual(Object.keys(nos).length, 12);
});

test('every tag is one of the allowed options', function () {
  JM.jewelry.forEach(function (j) {
    JM.DIMENSIONS.forEach(function (dim) {
      var ok = JM.OPTIONS[dim].some(function (o) { return o.value === j[dim]; });
      assert.ok(ok, j.id + ' has invalid ' + dim + ': ' + j[dim]);
    });
  });
});

test('every object has an image, a story, a styling note and valid related ids', function () {
  JM.jewelry.forEach(function (j) {
    assert.ok(j.images.length >= 1 && j.images[0].alt, j.id + ' needs an image with alt text');
    assert.ok(j.story && j.stylingNote, j.id + ' needs story and stylingNote');
    j.relatedIds.forEach(function (rid) {
      assert.ok(find(rid), j.id + ' points to unknown related id ' + rid);
    });
  });
});

test('every image file exists, has real alt text and a credit', function () {
  var fs = require('fs');
  var path = require('path');
  JM.jewelry.forEach(function (j) {
    var img = j.images[0];
    assert.ok(fs.existsSync(path.join(__dirname, '..', img.src)), j.id + ': missing file ' + img.src);
    assert.ok(img.alt.length > 20, j.id + ': alt text too short');
    assert.ok(img.credit && img.credit !== 'TBD', j.id + ': credit missing');
  });
  assert.ok(fs.existsSync(path.join(__dirname, '..', JM.BODY_MAP_IMAGE)), 'body map photo missing');
});

test('weights add up to 100', function () {
  var total = JM.DIMENSIONS.reduce(function (sum, d) { return sum + JM.WEIGHTS[d]; }, 0);
  assert.strictEqual(total, 100);
});

console.log('\nWorked example from the spec: Kite Pinky');

var kite = find('kite-pinky');

test('User A, all four match -> 100%', function () {
  var a = { placement: 'little-finger', form: 'angular', material: 'yellow-stone', mood: 'sharp' };
  assert.strictEqual(JM.scoreObject(kite, a).score, 100);
});

test('User B, placement + material match -> 60%', function () {
  var b = { placement: 'little-finger', form: 'organic', material: 'yellow-stone', mood: 'romantic' };
  assert.strictEqual(JM.scoreObject(kite, b).score, 60);
});

test('User C, form + mood match -> 40%', function () {
  var c = { placement: 'ear', form: 'angular', material: 'silver', mood: 'sharp' };
  assert.strictEqual(JM.scoreObject(kite, c).score, 40);
});

console.log('\nAcceptance tests');

test('JM-M01: four matching answers -> four sorted results with scores and reasons', function () {
  var a = { placement: 'little-finger', form: 'angular', material: 'yellow-stone', mood: 'sharp' };
  var out = JM.rank(a);
  assert.strictEqual(out.ok, true);
  assert.strictEqual(out.results.length, 4);
  assert.strictEqual(out.results[0].item.id, 'kite-pinky');
  assert.strictEqual(out.results[0].score, 100);
  for (var i = 1; i < out.results.length; i++) {
    assert.ok(out.results[i - 1].score >= out.results[i].score, 'results must be sorted high to low');
  }
  out.results.forEach(function (r) { assert.ok(r.reason.length > 0); });
});

test('JM-M02: changing only placement changes scores by exactly 40 where the placement match changes', function () {
  var base = { placement: 'ear', form: 'angular', material: 'silver', mood: 'sharp' };
  var changed = { placement: 'neckline', form: 'angular', material: 'silver', mood: 'sharp' };
  JM.jewelry.forEach(function (j) {
    var s1 = JM.scoreObject(j, base).score;
    var s2 = JM.scoreObject(j, changed).score;
    var m1 = j.placement === 'ear' ? 1 : 0;
    var m2 = j.placement === 'neckline' ? 1 : 0;
    assert.strictEqual(s2 - s1, 40 * (m2 - m1), j.id);
  });
});

test('JM-M03: equal scores keep original collection order (stable tie-break)', function () {
  var twins = [
    { id: 'first',  placement: 'ear', form: 'liquid', material: 'silver', mood: 'quiet' },
    { id: 'second', placement: 'ear', form: 'liquid', material: 'silver', mood: 'quiet' },
    { id: 'third',  placement: 'ear', form: 'liquid', material: 'silver', mood: 'quiet' }
  ];
  var a = { placement: 'ear', form: 'liquid', material: 'silver', mood: 'quiet' };
  var out = JM.rank(a, twins);
  assert.deepStrictEqual(out.results.map(function (r) { return r.item.id; }), ['first', 'second', 'third']);
});

test('JM-M03b: running the same answers twice gives the identical order', function () {
  var a = { placement: 'across-hand', form: 'organic', material: 'gold', mood: 'quiet' };
  var ids = function () { return JM.rank(a).results.map(function (r) { return r.item.id; }); };
  assert.deepStrictEqual(ids(), ids());
});

test('JM-M04: a missing answer -> no results, and the missing step is named', function () {
  var out = JM.rank({ placement: 'ear', form: 'liquid', mood: 'quiet' });
  assert.strictEqual(out.ok, false);
  assert.deepStrictEqual(out.missing, ['material']);
  assert.strictEqual(out.results.length, 0);
});

test('invalid answer values are rejected, never guessed', function () {
  var out = JM.rank({ placement: 'toe', form: 'liquid', material: 'silver', mood: 'quiet' });
  assert.strictEqual(out.ok, false);
  assert.deepStrictEqual(out.invalid, ['placement']);
});

test('no answers at all -> all four steps reported missing', function () {
  var out = JM.rank({});
  assert.strictEqual(out.ok, false);
  assert.strictEqual(out.missing.length, 4);
});

test('missing / empty data -> error, no invented result', function () {
  var a = { placement: 'ear', form: 'liquid', material: 'silver', mood: 'quiet' };
  var out = JM.rank(a, []);
  assert.strictEqual(out.ok, false);
  assert.strictEqual(out.error, 'no-data');
});

test('JM-M05: the explanation names only dimensions that actually matched', function () {
  var b = { placement: 'little-finger', form: 'organic', material: 'yellow-stone', mood: 'romantic' };
  var r = JM.scoreObject(kite, b);
  var text = JM.explain(r, b);
  assert.ok(text.indexOf('60% match') === 0);
  assert.ok(text.indexOf('little finger placement') > -1);
  assert.ok(text.indexOf('yellow stone material') > -1);
  assert.ok(text.indexOf('organic') === -1, 'must not mention form (it did not match)');
  assert.ok(text.indexOf('romantic') === -1, 'must not mention mood (it did not match)');
});

test('placement-only match scores 40% and says so honestly', function () {
  // No ear piece is delicate / yellow-stone / after-dark, so both ear pieces
  // score exactly 40, and no other piece can reach 40 with these answers.
  var a = { placement: 'ear', form: 'delicate', material: 'yellow-stone', mood: 'after-dark' };
  var out = JM.rank(a);
  assert.strictEqual(out.results[0].score, 40);
  assert.strictEqual(out.results[1].score, 40);
  assert.ok(out.results[0].reason.indexOf('Only this one choice matches') > -1);
  // Stable order: Emerald Fold (JM-005) comes before Drop Study (JM-006)
  assert.strictEqual(out.results[0].item.id, 'emerald-fold');
  assert.strictEqual(out.results[1].item.id, 'drop-study');
});

test('fewer than four same-placement pieces -> fills with best remaining, labelled weaker fit', function () {
  var a = { placement: 'ankle', form: 'delicate', material: 'emerald', mood: 'romantic' };
  var out = JM.rank(a);
  assert.strictEqual(out.results.length, 4);
  assert.strictEqual(out.results[0].item.id, 'green-thread');
  assert.strictEqual(out.results[0].score, 100);
  // Only two ankle pieces exist. Chrome Arc (ankle only) scores 40, but Twin Line
  // and Deep V (delicate + romantic) also score 40 and come earlier in the
  // collection, so the stable tie-break lists them first. This is by the spec.
  assert.deepStrictEqual(
    out.results.map(function (r) { return r.item.id; }),
    ['green-thread', 'twin-line', 'deep-v', 'chrome-arc']
  );
  assert.deepStrictEqual(
    out.results.map(function (r) { return r.weakFit; }),
    [false, true, true, false]
  );
});

test('a result with no matches says so instead of pretending', function () {
  var none = { item: kite, score: 0, matched: [], breakdown: {} };
  var text = JM.explain(none, { placement: 'ear', form: 'liquid', material: 'silver', mood: 'quiet' });
  assert.ok(text.indexOf('none of your four choices match') > -1);
});

console.log('\nArchive filters');

test('JM-F01: no filters returns all 12 in collection order', function () {
  var all = JM.filterItems(JM.jewelry, { placement: '', form: '', material: '', mood: '' });
  assert.strictEqual(all.length, 12);
  assert.strictEqual(all[0].id, 'kite-pinky');
  assert.strictEqual(all[11].id, 'afterimage');
});

test('JM-F01: two filters keep only pieces matching both', function () {
  var out = JM.filterItems(JM.jewelry, { placement: 'neckline', material: 'gold' });
  assert.deepStrictEqual(out.map(function (j) { return j.id; }), ['deep-v', 'melt-collar']);
});

test('one filter: all three across-hand pieces', function () {
  var out = JM.filterItems(JM.jewelry, { placement: 'across-hand' });
  assert.deepStrictEqual(out.map(function (j) { return j.id; }), ['twin-line', 'vertebra-chain', 'afterimage']);
});

test('JM-F02: filters with no match return an empty list', function () {
  assert.strictEqual(JM.filterItems(JM.jewelry, { placement: 'ear', mood: 'after-dark' }).length, 0);
});

test('an unknown filter value matches nothing (never everything)', function () {
  assert.strictEqual(JM.filterItems(JM.jewelry, { placement: 'toe' }).length, 0);
});

console.log('\nShare links');

test('JM-SH01: a link round-trips for all 320 possible answer sets', function () {
  var count = 0;
  JM.OPTIONS.placement.forEach(function (p) {
    JM.OPTIONS.form.forEach(function (f) {
      JM.OPTIONS.material.forEach(function (m) {
        JM.OPTIONS.mood.forEach(function (d) {
          var a = { placement: p.value, form: f.value, material: m.value, mood: d.value };
          assert.deepStrictEqual(JM.decodeShare('#' + JM.encodeShare(a)), a, JM.encodeShare(a));
          count++;
        });
      });
    });
  });
  assert.strictEqual(count, 320);
});

test('JM-SH02: a readable example link decodes correctly', function () {
  assert.deepStrictEqual(
    JM.decodeShare('#edit-little-finger-angular-yellow-stone-after-dark'),
    { placement: 'little-finger', form: 'angular', material: 'yellow-stone', mood: 'after-dark' }
  );
  assert.strictEqual(JM.encodeShare({ placement: 'ear', form: 'liquid', material: 'silver', mood: 'quiet' }), 'edit-ear-liquid-silver-quiet');
});

test('JM-SH03: broken, partial or tampered links return null (never a guess)', function () {
  [
    '', '#', '#edit-', '#edit-ear', '#edit-ear-liquid-silver',
    '#edit-toe-liquid-silver-quiet',
    '#edit-ear-liquid-silver-quiet-extra',
    '#edit-ear-liquid-silver-quietx',
    '#edit-ear--liquid-silver-quiet',
    '#something-else', '#night-cross', '#edit-ear-liquid-silver-<script>'
  ].forEach(function (bad) {
    assert.strictEqual(JM.decodeShare(bad), null, 'should reject: ' + bad);
  });
  assert.strictEqual(JM.decodeShare(undefined), null);
  assert.strictEqual(JM.decodeShare(null), null);
});

test('JM-SH04: a decoded link gives the same ranking as the original answers', function () {
  var a = { placement: 'neckline', form: 'angular', material: 'silver', mood: 'after-dark' };
  var ids = function (x) { return JM.rank(x).results.map(function (r) { return r.item.id + ':' + r.score; }); };
  assert.deepStrictEqual(ids(JM.decodeShare(JM.encodeShare(a))), ids(a));
});

/* ----- Look links (spec extension): share the chosen pieces ----- */
test('look link: every combination of one piece per place (or skipped) round-trips', function () {
  var options = JM.LOOK_PLACES.map(function (place) {
    return JM.jewelry.filter(function (j) { return j.placement === place; }).map(function (j) { return j.id; }).concat('none');
  });
  var count = 0;
  (function walk(i, look) {
    if (i === options.length) {
      var code = JM.encodeLook(look);
      var allSkipped = JM.LOOK_PLACES.every(function (p) { return look[p] === 'none'; });
      if (allSkipped) { assert.strictEqual(code, null); return; }
      assert.deepStrictEqual(JM.decodeLook(code), look);
      count++;
      return;
    }
    options[i].forEach(function (id) {
      var next = Object.assign({}, look); next[JM.LOOK_PLACES[i]] = id;
      walk(i + 1, next);
    });
  })(0, {});
  assert.strictEqual(count, 431);          // 3*4*4*3*3 = 432 combinations, minus "everything skipped"
});

test('look link: format is look- plus five 3-digit numbers in body order', function () {
  var code = JM.encodeLook({ ear: 'drop-study', neckline: 'melt-collar', 'across-hand': 'none', 'little-finger': 'kite-pinky', ankle: 'green-thread' });
  assert.strictEqual(code, 'look-006-009-000-001-010');
});

test('look link: accepts a leading # and capital letters', function () {
  assert.ok(JM.decodeLook('#LOOK-006-009-000-001-010'));
});

test('look link: bad links return null (never guess)', function () {
  [
    '', null, undefined, 'edit-ear-liquid-silver-quiet',
    'look-', 'look-006-009-000-001', 'look-006-009-000-001-010-011',
    'look-abc-009-000-001-010', 'look-6-9-0-1-10', 'look-006-009-000-001-999',
    'look-000-000-000-000-000',                     // nothing chosen
    'look-001-000-000-000-000',                     // Kite Pinky is not an ear piece
    'look-006-009-000-001-001',                     // Kite Pinky is not an ankle piece
    'look-006-009-000-001-010<script>'
  ].forEach(function (bad) {
    assert.strictEqual(JM.decodeLook(bad), null, 'should reject: ' + bad);
  });
});

test('look link: a skipped place decodes to "none" and encodeLook ignores wrong-place pieces', function () {
  var look = JM.decodeLook('look-006-000-000-000-000');
  assert.strictEqual(look.ear, 'drop-study');
  assert.strictEqual(look.neckline, 'none');
  assert.strictEqual(JM.encodeLook({ ear: 'kite-pinky', neckline: 'melt-collar' }), 'look-000-009-000-000-000');
});

console.log('\nMatch profile');

test('a profile is named from mood and material, with a line from the form', function () {
  var pr = JM.profile({ placement: 'ear', form: 'liquid', material: 'silver', mood: 'quiet' });
  assert.strictEqual(pr.title, 'The Quiet Silver');
  assert.strictEqual(pr.line, 'Poured, never made. Worn at the ear.');
});

test('all 16 mood + material pairs give 16 different names', function () {
  var names = {};
  JM.OPTIONS.mood.forEach(function (m) { JM.OPTIONS.material.forEach(function (mat) {
    names[JM.profile({ placement: 'ankle', form: 'organic', material: mat.value, mood: m.value }).title] = true;
  }); });
  assert.strictEqual(Object.keys(names).length, 16);
});

test('two-word labels are capitalised on every word', function () {
  assert.strictEqual(JM.profile({ placement: 'ear', form: 'angular', material: 'yellow-stone', mood: 'after-dark' }).title, 'The After Dark Yellow Stone');
});

test('every form has a line, and the placement is named in lower case', function () {
  JM.OPTIONS.form.forEach(function (f) { assert.ok(JM.PROFILE_LINES[f.value], f.value); });
  assert.ok(/Worn at the across the hand\.$/.test(JM.profile({ placement: 'across-hand', form: 'angular', material: 'gold', mood: 'sharp' }).line));
});

test('incomplete or invalid answers give no profile', function () {
  assert.strictEqual(JM.profile({ placement: 'ear' }), null);
  assert.strictEqual(JM.profile({ placement: 'ear', form: 'x', material: 'silver', mood: 'quiet' }), null);
  assert.strictEqual(JM.profile(null), null);
});

console.log('\n' + passed + ' tests passed' + (process.exitCode ? ' (some FAILED)' : '') + '\n');

/* ----------------------------------------------------------
   Demonstration: the exact result for Kite Pinky, as the spec asks.
   ---------------------------------------------------------- */
console.log('Demonstration: user answers little-finger / angular / yellow-stone / sharp');
var demo = JM.rank({ placement: 'little-finger', form: 'angular', material: 'yellow-stone', mood: 'sharp' });
demo.results.forEach(function (r, i) {
  console.log('  ' + (i + 1) + '. ' + r.item.catalogNo + ' ' + r.item.name + ' — ' + r.reason + (r.weakFit ? ' [weaker fit]' : ''));
});
console.log('');
