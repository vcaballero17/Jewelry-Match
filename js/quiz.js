/* ==========================================================
   quiz.js  -  the interface for the four-step match journey
   ----------------------------------------------------------
   The scoring lives in match.js. THIS file only:
     - remembers the answers  ("state")
     - draws the current step on the page ("render")
     - reacts to clicks and keys
   Idea to remember: state changes -> we redraw from the state.
   ========================================================== */
(function () {
  'use strict';

  var JM = window.JM;
  var el = JM.ui.el;
  var svg = JM.ui.svg;

  var root = document.getElementById('quiz-root');
  var titleEl = document.getElementById('step-title');
  var progressEl = document.getElementById('progress');

  /* ---------- Content for each step ---------- */
  var STEPS = [
    { dim: 'placement', title: 'Body map', question: 'Where should it live?',
      intro: 'Choose one place. We will build the rest.',
      hint: 'Choose one place to continue.', alert: 'Please choose one place before continuing.' },
    { dim: 'form', title: 'Form', question: 'Which shape are you drawn to?',
      intro: 'Choose one form.',
      hint: 'Choose one form to continue.', alert: 'Please choose one form before continuing.' },
    { dim: 'material', title: 'Material', question: 'Which metal or stone?',
      intro: 'Choose one material or color.',
      hint: 'Choose one material to continue.', alert: 'Please choose one material before continuing.' },
    { dim: 'mood', title: 'Mood', question: 'What atmosphere do you want?',
      intro: 'Choose one mood.',
      hint: 'Choose one mood to see your edit.', alert: 'Please choose one mood before continuing.' }
  ];

  var DIM_LABEL = { placement: 'Placement', form: 'Form', material: 'Material / color', mood: 'Mood' };

  var CAPTIONS = {
    angular: 'Hard edges, folds and facets.',
    liquid: 'Poured, melted, reflective.',
    delicate: 'Fine lines and thin chains.',
    organic: 'Soft, lumpy, hand-shaped.',
    silver: 'Cool, bright chrome.',
    gold: 'Warm, soft shine.',
    emerald: 'Deep green stone.',
    'yellow-stone': 'A flash of yellow diamond.',
    quiet: 'Calm and understated.',
    sharp: 'Precise and edgy.',
    romantic: 'Soft, close, intimate.',
    'after-dark': 'Made for night and low light.'
  };

  // Where each numbered hotspot sits on the figure (SVG units, 340 x 420).
  var HOTSPOTS = [
    { value: 'ear',           n: 1, x: 196, y: 36,  px: 36.4, py: 10.6, side: 'right', label: 'Ear' },
    { value: 'little-finger', n: 2, x: 112, y: 248, px: 50.5, py: 57.5, side: 'right', label: 'Little finger' },
    { value: 'across-hand',   n: 3, x: 228, y: 200, px: 46,   py: 49,   side: 'right', label: 'Across hand' },
    { value: 'neckline',      n: 4, x: 170, y: 92,  px: 33,   py: 23.5, side: 'right', label: 'Neckline' },
    { value: 'ankle',         n: 5, x: 192, y: 385, px: 18.3, py: 92,   side: 'right', label: 'Ankle' }
  ];
  var MAP_W = 340;
  var MAP_H = 420;

  /* ---------- State: everything the page needs to know ----------
     step 0-3 = the four questions, step 4 = results. */
  var state = { step: 0, answers: {}, shared: false };   // shared = opened from a friend's link

  function labelOf(dim, value) {
    var found = JM.OPTIONS[dim].filter(function (o) { return o.value === value; })[0];
    return found ? found.label : value;
  }

  /* ---------- Title and progress ---------- */
  function setTitleAndProgress() {
    var onResults = state.step === 4;
    var step = STEPS[state.step];
    var title = onResults ? (state.shared ? 'Shared edit' : 'Your edit') : step.title;

    titleEl.textContent = title;
    document.title = title + ' — Jewelry Match';

    var text = onResults ? (state.shared ? 'Shared with you' : '4 of 4 — Complete') : (state.step + 1) + ' of 4 — ' + step.title;
    var segments = [];
    for (var i = 0; i < 4; i++) {
      var done = onResults || i <= state.step;
      segments.push(el('span', { class: 'progress__seg', 'data-done': done ? 'true' : 'false' }));
    }
    progressEl.textContent = '';
    progressEl.appendChild(el('span', { class: 'progress__text', text: text }));
    progressEl.appendChild(el('span', { class: 'progress__bar', 'aria-hidden': 'true' }, segments));
  }

  /* ---------- Moving between steps ---------- */
  function goTo(step, moveFocus) {
    state.step = step;
    if (!state.shared) JM.storage.saveProgress(state);
    render();
    if (moveFocus) {
      // Moving focus to the new heading tells screen-reader users the
      // screen changed, and keeps keyboard users at the top of it.
      titleEl.focus({ preventScroll: false });
    }
  }

  function render() {
    setTitleAndProgress();
    root.textContent = '';
    if (state.step === 4) {
      renderResults();
    } else {
      renderStep();
    }
  }

  /* ---------- Choosing an answer ---------- */
  function choose(dim, value) {
    state.answers[dim] = value;
    JM.storage.saveProgress(state);

    // Keep the hotspots in sync with the text list.
    var spots = root.querySelectorAll('.hotspot');
    for (var i = 0; i < spots.length; i++) {
      spots[i].setAttribute('aria-pressed', spots[i].getAttribute('data-value') === value ? 'true' : 'false');
    }

    // Enable Continue and clear the hint.
    var next = document.getElementById('continue');
    var hint = document.getElementById('continue-hint');
    if (next) next.removeAttribute('aria-disabled');
    if (hint) { hint.textContent = ''; hint.className = 'hint'; }
  }

  /* ---------- Option visuals for steps 2 and 3 ---------- */
  function formShape(value) {
    var attrs = { viewBox: '0 0 100 60', 'aria-hidden': 'true', focusable: 'false' };
    var fill = { fill: 'currentColor' };
    var line = { fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' };

    if (value === 'angular') {
      return svg('svg', attrs, [svg('polygon', { points: '10,50 40,8 90,22 62,52', fill: 'currentColor' })]);
    }
    if (value === 'liquid') {
      return svg('svg', attrs, [svg('path', { d: 'M12 38 C 8 14, 40 6, 55 22 S 92 30, 86 46 S 40 58, 12 38 Z', fill: 'currentColor' })]);
    }
    if (value === 'delicate') {
      return svg('svg', attrs, [svg('path', Object.assign({ d: 'M8 42 C 30 8, 50 56, 92 18' }, line))]);
    }
    // organic: overlapping soft lobes
    return svg('svg', attrs, [
      svg('circle', Object.assign({ cx: '30', cy: '34', r: '14' }, fill)),
      svg('circle', Object.assign({ cx: '52', cy: '26', r: '16' }, fill)),
      svg('circle', Object.assign({ cx: '72', cy: '38', r: '12' }, fill))
    ]);
  }

  function visualFor(dim, value, index) {
    if (dim === 'placement') {
      return el('span', { class: 'meta', text: '00' + (index + 1) });
    }
    if (dim === 'form') {
      return el('span', { class: 'choice__visual', 'aria-hidden': 'true' }, [formShape(value)]);
    }
    if (dim === 'material') {
      return el('span', { class: 'swatch swatch--' + value, 'aria-hidden': 'true' });
    }
    return null; // mood is type-led
  }

  function buildChoice(dim, option, index) {
    var checked = state.answers[dim] === option.value;
    var input = el('input', {
      type: 'radio',
      name: dim,
      value: option.value,
      id: 'opt-' + dim + '-' + option.value,
      checked: checked,
      onchange: function () { choose(dim, option.value); }
    });
    var body = el('span', { class: 'choice__body' }, [
      visualFor(dim, option.value, index),
      el('span', { class: 'choice__label', text: option.label }),
      CAPTIONS[option.value] && dim !== 'placement'
        ? el('span', { class: 'choice__caption', text: CAPTIONS[option.value] })
        : null,
      el('span', { class: 'choice__state', text: '✓ Selected' })
    ]);
    return el('label', { class: 'choice' }, [input, body]);
  }

  /* ---------- The simple standing figure with 5 hotspots ---------- */
  function buildBodyMap() {
    var S = function (tag, attrs) { return svg(tag, Object.assign({ 'class': 'body-shape' }, attrs)); };
    var limb = function (x1, y1, x2, y2, w) {
      return S('line', { x1: x1, y1: y1, x2: x2, y2: y2, 'stroke-width': w, 'stroke-linecap': 'round' });
    };

    var figure = svg('svg', {
      viewBox: '0 0 ' + MAP_W + ' ' + MAP_H,
      'class': 'bodymap__svg',
      'aria-hidden': 'true',
      focusable: 'false'
    }, [
      S('ellipse', { cx: 170, cy: 40, rx: 19, ry: 25 }),
      S('rect', { x: 164, y: 62, width: 12, height: 24 }),
      S('path', { d: 'M128 98 C 150 84, 190 84, 212 98 L 206 220 L 134 220 Z' }),
      limb(128, 100, 112, 225, 15),
      limb(212, 100, 228, 225, 15),
      S('circle', { cx: 112, cy: 233, r: 8 }),
      S('circle', { cx: 228, cy: 233, r: 8 }),
      limb(150, 220, 148, 395, 24),
      limb(190, 220, 192, 395, 24),
      S('ellipse', { cx: 146, cy: 406, rx: 14, ry: 6 }),
      S('ellipse', { cx: 194, cy: 406, rx: 14, ry: 6 })
    ]);

    var buttons = HOTSPOTS.map(function (spot) {
      return el('button', {
        type: 'button',
        class: 'hotspot' + (spot.side === 'left' ? ' hotspot--left' : ''),
        'data-value': spot.value,
        'aria-pressed': state.answers.placement === spot.value ? 'true' : 'false',
        onclick: function () {
          // Clicking a hotspot checks the matching radio in the text list.
          var radio = document.getElementById('opt-placement-' + spot.value);
          if (radio) radio.checked = true;
          choose('placement', spot.value);
        }
      }, [
        el('span', { class: 'hotspot__dot' }, [el('span', { class: 'hotspot__num', text: String(spot.n) })]),
        el('span', { class: 'hotspot__label', text: spot.label })
      ]);
    });

    var wrap = el('div', { class: 'bodymap__figure' });

    // Place every hotspot on the picture. The photo and the drawing are
    // different pictures, so each has its own coordinates.
    function place(usePhoto) {
      buttons.forEach(function (btn, i) {
        var spot = HOTSPOTS[i];
        var left = usePhoto ? spot.px : spot.x / MAP_W * 100;
        var top = usePhoto ? spot.py : spot.y / MAP_H * 100;
        btn.style.left = left + '%';
        btn.style.top = top + '%';
      });
    }

    function showDrawing() {
      wrap.className = 'bodymap__figure';
      wrap.textContent = '';
      wrap.appendChild(figure);
      buttons.forEach(function (btn) { wrap.appendChild(btn); });
      place(false);
    }

    function showPhoto() {
      var photo = el('img', {
        class: 'bodymap__photo',
        src: JM.BODY_MAP_IMAGE,
        alt: '',                 // decorative: the five places are named by the buttons and the list
        width: '1122',
        height: '1402',
        decoding: 'async'
      });
      // If the photo is missing, quietly fall back to the drawing.
      photo.addEventListener('error', showDrawing);
      wrap.className = 'bodymap__figure bodymap__figure--photo';
      wrap.textContent = '';
      wrap.appendChild(photo);
      buttons.forEach(function (btn) { wrap.appendChild(btn); });
      place(true);
    }

    if (JM.SHOW_IMAGES && JM.BODY_MAP_IMAGE) { showPhoto(); } else { showDrawing(); }
    return wrap;
  }

  /* ---------- One question screen ---------- */
  function renderStep() {
    var step = STEPS[state.step];
    var current = state.answers[step.dim];

    var choices = el('div', { class: 'choices' },
      JM.OPTIONS[step.dim].map(function (option, index) {
        return buildChoice(step.dim, option, index);
      })
    );

    var fieldset = el('fieldset', { class: 'question' }, [
      el('legend', { text: step.question }),
      el('p', { class: 'question__intro', text: step.intro }),
      choices
    ]);

    var content = fieldset;
    if (step.dim === 'placement') {
      content = el('div', { class: 'bodymap' }, [buildBodyMap(), fieldset]);
    }

    var isLast = state.step === 3;

    var hint = el('p', {
      class: 'hint',
      id: 'continue-hint',
      role: 'status',
      text: current ? '' : step.hint
    });

    var continueBtn = el('button', {
      type: 'button',
      class: 'btn',
      id: 'continue',
      'aria-disabled': current ? false : 'true',
      'aria-describedby': 'continue-hint',
      onclick: function () {
        // aria-disabled keeps the button focusable so we can explain WHY.
        if (!state.answers[step.dim]) {
          hint.textContent = step.alert;
          hint.className = 'hint hint--alert';
          return;
        }
        goTo(state.step + 1, true);
      }
    }, [isLast ? 'See my edit' : 'Continue', ' →']);

    var actions = el('div', { class: 'step-actions' }, [
      state.step > 0
        ? el('button', { type: 'button', class: 'btn btn--ghost', onclick: function () { goTo(state.step - 1, true); } },
            ['← Back'])
        : null,
      continueBtn,
      hint
    ]);

    root.appendChild(content);
    root.appendChild(actions);
  }

  /* ---------- Results ---------- */
  function resultCard(result, index) {
    var item = result.item;
    var isHero = index === 0;

    // The shared Save button (defined once in ui.js, used on every page).
    var saveBtn = JM.ui.saveButton(item);

    // One row per choice: a sentence (for everyone, including screen readers)
    // and a bar whose width is "points earned / points possible".
    var breakdown = JM.DIMENSIONS.map(function (dim) {
      var points = result.breakdown[dim];
      var max = JM.WEIGHTS[dim];
      var matched = points > 0;
      var fill = el('span', { class: 'bd__fill' });
      fill.style.width = Math.round(points / max * 100) + '%';   // set through JS, not an inline attribute
      return el('li', { class: 'bd' + (matched ? ' bd--match' : '') }, [
        el('span', { class: 'bd__text', text:
          DIM_LABEL[dim] + ': you chose ' + labelOf(dim, state.answers[dim]) +
          ', this piece is ' + labelOf(dim, item[dim]) + ' \u2014 ' +
          (matched ? 'match, +' + points : 'no match, +0') + ' of ' + max }),
        el('span', { class: 'bd__bar', 'aria-hidden': 'true' }, [fill])
      ]);
    });

    var materialText = item.materialNote || labelOf('material', item.material);

    var body = el('div', { class: 'result__body' }, [
      el('p', { class: 'meta', text: '00' + (index + 1) + ' — ' + item.catalogNo }),
      el('h3', { class: 'result__name', text: item.name }),
      el('p', { class: 'result__score' }, [el('strong', { text: result.score + '%' }), ' match']),
      el('p', { class: 'result__facts', text: labelOf('placement', item.placement) + ' · ' + materialText }),
      el('p', { class: 'result__reason', text: result.reason }),
      result.weakFit ? el('p', { class: 'result__weak', text: 'Weaker fit — placement differs from your choice' }) : null,
      el('details', isHero ? { open: '' } : {}, [
        el('summary', { text: 'Why this?' }),
        el('ul', { class: 'breakdown' }, breakdown)
      ]),
      el('div', { class: 'result__actions' }, [
        // object.html is built in the next stage.
        el('a', { class: 'btn', href: 'object.html?id=' + encodeURIComponent(item.id) + (state.shared ? '' : '&from=match') + '#' + encodeURIComponent(item.id) }, [
          'View object', el('span', { class: 'vh', text: ' — ' + item.name })
        ]),
        saveBtn
      ])
    ]);

    return el('article', { class: 'result' + (isHero ? ' result--hero' : '') }, [
      JM.ui.media(item, '', isHero),
      body
    ]);
  }

  function renderResults() {
    var out = JM.rank(state.answers);

    /* Error state: never invent a result (spec section 04). */
    if (!out.ok) {
      var message = out.error === 'no-data'
        ? 'The jewelry data could not be loaded.'
        : 'We are missing: ' + out.missing.concat(out.invalid).map(function (d) { return DIM_LABEL[d].toLowerCase(); }).join(', ') + '.';

      root.appendChild(el('div', { class: 'notice', role: 'alert' }, [
        el('h2', { text: 'We could not build your edit' }),
        el('p', { text: message }),
        el('div', { class: 'step-actions' }, [
          el('button', { type: 'button', class: 'btn', onclick: function () {
            var missing = out.missing.concat(out.invalid);
            var first = missing.length ? JM.DIMENSIONS.indexOf(missing[0]) : 4;
            goTo(first, true);
          } }, ['Retry']),
          el('a', { class: 'btn btn--ghost', href: 'archive.html' }, ['View full archive'])
        ])
      ]));
      return;
    }

    if (!state.shared) {
      JM.storage.saveLastMatch(state.answers, out.results.map(function (r) { return r.item.id; }));
    }

    var summary = el('dl', { class: 'answers' }, JM.DIMENSIONS.map(function (dim) {
      return el('div', {}, [
        el('dt', { text: DIM_LABEL[dim] }),
        el('dd', { text: labelOf(dim, state.answers[dim]) })
      ]);
    }));

    var head = state.shared
      ? el('div', { class: 'results-head' }, [
          el('button', { type: 'button', class: 'btn', onclick: startOwn }, ['Find my own match'])
        ])
      : el('div', { class: 'results-head' }, [
          el('button', { type: 'button', class: 'btn btn--ghost', onclick: function () { goTo(0, true); } }, ['Edit choices']),
          el('button', { type: 'button', class: 'btn btn--ghost', onclick: function () {
            state.answers = {};
            JM.storage.clearProgress();
            goTo(0, true);
          } }, ['Start over'])
        ]);

    var grid = el('div', { class: 'results-grid' }, out.results.map(resultCard));

    root.appendChild(el('section', { 'aria-labelledby': 'answers-heading' }, [
      el('h2', { id: 'answers-heading', class: 'vh', text: state.shared ? 'Their answers' : 'Your answers' }),
      state.shared
        ? el('p', { class: 'page-intro shared-note', text: 'Someone sent you their edit. These are the four pieces that match what they chose.' })
        : null,
      summary,
      head
    ]));
    root.appendChild(el('section', { 'aria-labelledby': 'results-heading' }, [
      el('h2', { id: 'results-heading', class: 'vh', text: state.shared ? 'Their four matches' : 'Your four matches' }),
      grid
    ]));
    if (!state.shared) {
      root.appendChild(el('div', { class: 'results-next' }, [
        el('p', { text: 'Next: choose one piece for each place on the body.' }),
        el('a', { class: 'btn', href: 'look.html#ear' }, ['Continue: build your look \u2192'])
      ]));
    }
    root.appendChild(buildShare());
  }

  /* ---------- Sharing ----------
     The link is this page's address plus #edit-<four answers>.
     Anyone who opens it sees the same four matches. */
  function shareUrl() {
    var base = window.location.href.split('#')[0].split('?')[0];
    return base + '#' + JM.encodeShare(state.answers);
  }

  function shareSummary() {
    return JM.DIMENSIONS.map(function (dim) { return labelOf(dim, state.answers[dim]); }).join(' \u00B7 ');
  }

  function copyLink(input, status, url) {
    function done(message) { status.textContent = message; status.className = 'hint'; }
    function fallback() {
      // Older browsers or blocked clipboard: select the text so the person can copy it.
      input.focus();
      input.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      done(ok ? 'Link copied.' : 'Link selected. Press Ctrl+C (Cmd+C on a Mac) to copy it.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { done('Link copied.'); }, fallback);
    } else {
      fallback();
    }
  }

  function buildShare() {
    var url = shareUrl();

    var input = el('input', {
      type: 'text',
      class: 'share__input',
      id: 'share-link',
      value: url,
      readonly: true,
      onfocus: function () { input.select(); }
    });
    var status = el('p', { class: 'hint', id: 'share-status', role: 'status' });

    var buttons = [
      el('button', { type: 'button', class: 'btn', id: 'copy-link', onclick: function () { copyLink(input, status, url); } }, ['Copy link'])
    ];

    // Phones and some browsers have a built-in share sheet (Messages, WhatsApp...).
    if (navigator.share) {
      buttons.push(el('button', { type: 'button', class: 'btn btn--ghost', id: 'share-native', onclick: function () {
        navigator.share({
          title: 'My Jewelry Match edit',
          text: 'My edit: ' + shareSummary() + '. See the four pieces that match:',
          url: url
        }).catch(function () { /* the person closed the share sheet: nothing to do */ });
      } }, ['Share\u2026']));
    }

    return el('section', { class: 'share', 'aria-labelledby': 'share-heading' }, [
      el('h2', { class: 'section-title', id: 'share-heading', text: state.shared ? 'Send this edit on' : 'Send your edit' }),
      el('p', { class: 'share__summary', text: shareSummary() }),
      el('p', { class: 'share__text', text: 'Anyone with this link sees these four matches and what was chosen. Nothing is stored on a server; the choices travel inside the link.' }),
      el('div', { class: 'share__row' }, [
        el('label', { class: 'vh', for: 'share-link', text: 'Link to this edit' }),
        input
      ]),
      el('div', { class: 'share__buttons' }, buttons),
      status
    ]);
  }

  /* ---------- Leaving a shared edit to take your own quiz ---------- */
  function startOwn() {
    state.shared = false;
    state.answers = {};
    JM.storage.clearProgress();
    try {
      window.history.replaceState(null, '', window.location.href.split('#')[0]);
    } catch (err) {
      window.location.hash = '';
    }
    goTo(0, true);
  }

  /* ---------- Start ---------- */
  var sharedAnswers = JM.decodeShare(window.location.hash);
  if (sharedAnswers) {
    // Someone opened a friend's link: show their edit and leave this
    // visitor's own saved progress and results untouched.
    state.shared = true;
    state.answers = sharedAnswers;
    state.step = 4;
  } else {
    var saved = JM.storage.getProgress();
    if (saved) {
      state.answers = saved.answers;
      state.step = saved.step;
    }
  }
  render();
})();
