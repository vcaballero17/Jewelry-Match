/* ==========================================================
   look.js  -  the guided "Build your look" walk-through
   ----------------------------------------------------------
   Six screens: ear -> neckline -> hand -> little finger -> ankle -> done.
   Which screen is showing is kept in the web address (#ear, #done...),
   so the browser's Back button and a reload both work for free.
   Choosing a piece also saves it, so it appears in "Your Edit".
   ========================================================== */
(function () {
  'use strict';

  var JM = window.JM;
  var el = JM.ui.el;

  var root = document.getElementById('look-root');
  var titleEl = document.getElementById('step-title');
  var progressEl = document.getElementById('progress');

  // Body order, top to bottom. Same order as the "Your Edit" page.
  var PLACES = ['ear', 'neckline', 'across-hand', 'little-finger', 'ankle'];

  var last = JM.storage.getLastMatch();          // null if the quiz was never taken
  var answers = last ? last.answers : null;

  /* ----- Which screen? Read it from the address. ----- */
  function currentStep() {
    var hash = window.location.hash.replace('#', '');
    if (hash === 'done') return PLACES.length;
    var index = PLACES.indexOf(hash);
    return index === -1 ? 0 : index;
  }

  function go(step) {
    // Changing the hash fires "hashchange", which draws the new screen.
    window.location.hash = step >= PLACES.length ? 'done' : PLACES[step];
  }

  function findItem(id) {
    return JM.jewelry.filter(function (j) { return j.id === id; })[0] || null;
  }

  /* ----- Progress: words plus segments (never colour alone) ----- */
  function renderProgress(step) {
    var done = step >= PLACES.length;
    var text = done ? 'Your look is ready' : 'Place ' + (step + 1) + ' of ' + PLACES.length;
    var segments = PLACES.map(function (place, i) {
      return el('span', { class: 'progress__seg', 'data-done': (done || i <= step) ? 'true' : 'false' });
    });
    progressEl.textContent = '';
    progressEl.appendChild(el('span', { class: 'progress__text', text: text }));
    progressEl.appendChild(el('span', { class: 'progress__bar', 'aria-hidden': 'true' }, segments));
  }

  /* ----- One place: pick a piece, skip, or go back ----- */
  function renderPlace(step) {
    var place = PLACES[step];
    var label = JM.labelOf('placement', place);
    titleEl.textContent = label;

    var items = JM.jewelry
      .map(function (item, index) {
        var score = answers ? JM.scoreObject(item, answers).score : null;
        return { item: item, index: index, score: score };
      })
      .filter(function (r) { return r.item.placement === place; });

    // Best match first when the quiz was taken; otherwise collection order.
    items.sort(function (a, b) {
      return ((b.score || 0) - (a.score || 0)) || (a.index - b.index);
    });

    // What to show as selected: the earlier choice, or the best match.
    var look = JM.storage.getLook();
    var selected = null;
    if (look[place] && look[place] !== 'none') selected = look[place];
    else if (!look[place] && answers && items.length) selected = items[0].item.id;

    var hint = el('p', { class: 'hint', id: 'look-hint' });
    var continueBtn;

    function setSelected(id) {
      selected = id;
      continueBtn.removeAttribute('aria-disabled');
      hint.textContent = '';
    }

    var options = items.map(function (r, position) {
      var item = r.item;
      var facts = item.materialNote || JM.labelOf('material', item.material);
      var caption = facts + ' · ' + JM.labelOf('form', item.form) + ' · ' + JM.labelOf('mood', item.mood);
      var input = el('input', {
        type: 'radio', name: 'look-piece', id: 'piece-' + item.id, value: item.id,
        checked: selected === item.id,
        onchange: function () { setSelected(item.id); }
      });
      return el('label', { class: 'choice', for: 'piece-' + item.id }, [
        input,
        el('span', { class: 'choice__body' }, [
          JM.ui.media(item),
          el('span', { class: 'meta', text: item.catalogNo }),
          el('span', { class: 'choice__label', text: item.name }),
          (r.score !== null)
            ? el('span', { class: 'look-flow__score', text: (position === 0 ? 'Best match · ' : '') + r.score + '% match' })
            : null,
          el('span', { class: 'choice__caption', text: caption }),
          el('span', { class: 'choice__state', text: 'Selected' })
        ])
      ]);
    });

    function onContinue() {
      if (!selected) {
        hint.textContent = 'Choose a piece, or skip this place.';
        hint.className = 'hint hint--alert';
        JM.ui.announce('Choose a piece, or skip this place.');
        return;
      }
      var item = findItem(selected);
      JM.storage.setLook(place, selected);
      if (!JM.storage.isFavorite(selected)) JM.storage.toggleFavorite(selected);   // chosen pieces live in Your Edit too
      JM.ui.updateFavCount();
      JM.ui.announce(item.name + ' added to your look.');
      go(step + 1);
    }

    function onSkip() {
      JM.storage.setLook(place, 'none');
      JM.ui.announce(label + ' skipped.');
      go(step + 1);
    }

    continueBtn = el('button', {
      type: 'button', class: 'btn', id: 'continue',
      'aria-disabled': selected ? false : 'true',
      onclick: onContinue
    }, [step === PLACES.length - 1 ? 'Finish' : 'Continue']);

    var back = step > 0
      ? el('button', { type: 'button', class: 'btn btn--ghost', onclick: function () { go(step - 1); } }, ['Back'])
      : (last ? el('a', { class: 'btn btn--ghost', href: 'match.html' }, ['Back to your matches']) : null);

    root.appendChild(el('p', { class: 'page-intro', text:
      (answers ? 'Pieces are ordered by how well they match your answers. ' : '') +
      'Choose the one you would wear here, or skip this place.' }));
    root.appendChild(el('fieldset', { class: 'look-flow__fieldset' }, [
      el('legend', { class: 'vh', text: 'Choose a piece for ' + label.toLowerCase() }),
      el('div', { class: 'choices' }, options)
    ]));
    root.appendChild(el('div', { class: 'step-actions' }, [
      back,
      el('button', { type: 'button', class: 'btn btn--ghost', onclick: onSkip }, ['Skip this place']),
      continueBtn,
      hint
    ]));
  }

  /* ----- The last screen: the whole look ----- */
  function renderDone() {
    titleEl.textContent = 'Your look';
    var look = JM.storage.getLook();
    var filled = 0;

    var slots = PLACES.map(function (place, step) {
      var label = JM.labelOf('placement', place);
      var item = look[place] && look[place] !== 'none' ? findItem(look[place]) : null;
      if (item) filled++;

      var parts = [el('h3', { class: 'look__place', text: label })];
      if (item) {
        parts.push(el('a', { class: 'card__link', href: 'object.html?id=' + encodeURIComponent(item.id) + '#' + encodeURIComponent(item.id) }, [
          JM.ui.media(item),
          el('span', { class: 'meta', text: item.catalogNo }),
          el('span', { class: 'card__name', text: item.name })
        ]));
      } else {
        parts.push(el('p', { class: 'look__empty', text: look[place] === 'none' ? 'Skipped.' : 'Not chosen yet.' }));
      }
      parts.push(el('button', { type: 'button', class: 'btn btn--ghost btn--small', onclick: function () { go(step); } }, [
        item ? 'Change' : 'Choose', el('span', { class: 'vh', text: ' ' + label.toLowerCase() })
      ]));
      return el('li', { class: 'look__slot' }, parts);
    });

    root.appendChild(el('p', { class: 'look__count', role: 'status' }, [
      el('strong', { text: filled + ' of ' + PLACES.length }),
      ' places filled. Every piece you chose is also saved in Your Edit.'
    ]));
    root.appendChild(el('ul', { class: 'look' }, slots));
    root.appendChild(el('div', { class: 'step-actions' }, [
      el('a', { class: 'btn', href: 'saved.html' }, ['See it in Your Edit']),
      el('a', { class: 'btn btn--ghost', href: 'match.html' }, [answers ? 'Find another match' : 'Find your match']),
      el('button', { type: 'button', class: 'btn btn--ghost', onclick: function () {
        PLACES.forEach(function (place) { JM.storage.setLook(place, null); });
        JM.ui.announce('Look cleared. Starting again.');
        go(0);
      } }, ['Start again'])
    ]));
  }

  /* ----- Draw the screen the address asks for ----- */
  function render(moveFocus) {
    var step = currentStep();
    root.textContent = '';
    renderProgress(step);
    if (step >= PLACES.length) renderDone(); else renderPlace(step);
    if (moveFocus) titleEl.focus();     // tell screen readers a new screen has started
  }

  window.addEventListener('hashchange', function () { render(true); });
  render(false);
})();
