/* ==========================================================
   saved.js  -  the Saved / Your Edit page
   ----------------------------------------------------------
   Two sections, both built from browser storage:
     1. Latest match  (recomputed from the saved ANSWERS, so
        it always agrees with the current data and scoring)
     2. Saved pieces  (the hearted objects)
   ========================================================== */
(function () {
  'use strict';

  var JM = window.JM;
  var el = JM.ui.el;
  var root = document.getElementById('saved-root');

  var DIM_LABEL = { placement: 'Placement', form: 'Form', material: 'Material / color', mood: 'Mood' };

  var last = JM.storage.getLastMatch();
  var savedHolder = el('div', { class: 'saved-section' });
  var lookHolder = el('div', { class: 'saved-section' });

  // Body order, top to bottom. Each place gets exactly one slot.
  var LOOK_SLOTS = ['ear', 'neckline', 'across-hand', 'little-finger', 'ankle'];

  /* Open the quiz pre-filled with the saved answers.
     step 0 = start of the quiz, step 4 = straight to the results. */
  function openQuiz(step) {
    JM.storage.saveProgress({ step: step, answers: last.answers });
    window.location.href = 'match.html';
  }

  function emptyState() {
    return el('div', { class: 'notice' }, [
      el('h2', { text: 'Your edit is still empty' }),
      el('p', { text: 'Take the match to get four pieces, or browse the collection and save what you like.' }),
      el('div', { class: 'empty-actions' }, [
        el('a', { class: 'btn', href: 'match.html' }, ['Find your match']),
        el('a', { class: 'btn btn--ghost', href: 'archive.html' }, ['Browse The Edit'])
      ])
    ]);
  }

  /* ----- Section 2: saved pieces. Rebuilt whenever something changes. ----- */
  function renderSaved(moveFocus) {
    var ids = JM.storage.getFavorites();
    var items = ids.map(function (id) {
      return JM.jewelry.filter(function (j) { return j.id === id; })[0];
    }).filter(Boolean);

    savedHolder.textContent = '';

    var heading = el('h2', { class: 'section-title', id: 'saved-heading', tabindex: '-1', text: 'Saved pieces' });
    savedHolder.appendChild(heading);

    if (items.length) {
      savedHolder.appendChild(el('div', { class: 'object-grid object-grid--plain' }, items.map(function (item) {
        return JM.ui.objectCard(item, {
          headingLevel: 'h3',
          onSaveChange: function () { renderSaved(true); }
        });
      })));
    } else if (last) {
      savedHolder.appendChild(el('p', { text: 'Nothing saved yet. Use Save on any piece to keep it here.' }));
    } else {
      savedHolder.appendChild(emptyState());
    }

    // After removing a card its button disappears, so we put focus
    // on the section heading rather than letting it fall to the page top.
    if (moveFocus) heading.focus();
    renderLook();       // the look is built from the saved pieces, so keep it in step
  }

  /* ----- Section 3: Build your look -----
     One slot per place on the body, filled from the pieces you saved.
     If you saved several pieces for one place, you choose which one
     is part of your look (that choice is remembered). ----- */
  function savedItems() {
    return JM.storage.getFavorites().map(function (id) {
      return JM.jewelry.filter(function (j) { return j.id === id; })[0];
    }).filter(Boolean);
  }

  function lookSlot(place, options, pick) {
    var label = JM.labelOf('placement', place);
    var parts = [el('h3', { class: 'look__place', text: label })];

    if (pick) {
      parts.push(el('a', { class: 'card__link', href: 'object.html?id=' + encodeURIComponent(pick.id) + '#' + encodeURIComponent(pick.id) }, [
        JM.ui.media(pick),
        el('span', { class: 'meta', text: pick.catalogNo }),
        el('span', { class: 'card__name', text: pick.name })
      ]));
    } else {
      parts.push(el('p', { class: 'look__empty', text: 'Nothing saved for this place yet.' }));
      parts.push(el('a', { class: 'btn btn--ghost btn--small', href: 'archive.html?placement=' + encodeURIComponent(place) }, [
        'Browse ', label.toLowerCase(), el('span', { class: 'vh', text: ' pieces' })
      ]));
    }

    if (options.length > 1) {
      parts.push(el('fieldset', { class: 'look__choose' }, [
        el('legend', { text: 'Choose for ' + label.toLowerCase() }),
        el('div', {}, options.map(function (item) {
          var id = 'look-' + place + '-' + item.id;
          return el('label', { class: 'look__option', for: id }, [
            el('input', {
              type: 'radio', name: 'look-' + place, id: id, value: item.id,
              checked: pick && pick.id === item.id,
              onchange: function () {
                JM.storage.setLook(place, item.id);
                renderLook();
                var again = document.getElementById(id);      // keep keyboard focus where it was
                if (again) again.focus();
                JM.ui.announce(item.name + ' chosen for ' + label.toLowerCase() + '.');
              }
            }),
            el('span', { text: item.name })
          ]);
        }))
      ]));
    }
    return el('li', { class: 'look__slot' }, parts);
  }

  function renderLook() {
    var items = savedItems();
    lookHolder.textContent = '';
    lookHolder.appendChild(el('h2', { class: 'section-title', text: 'Build your look' }));

    if (!items.length) {
      lookHolder.appendChild(el('p', { text: 'Save a piece to start building your look. You can wear one piece in each of five places.' }));
      lookHolder.appendChild(el('p', { class: 'look__start' }, [el('a', { class: 'btn', href: 'look.html#ear' }, ['Build it step by step'])]));
      return;
    }

    var chosen = JM.storage.getLook();
    var filled = 0;
    var slots = LOOK_SLOTS.map(function (place) {
      var options = items.filter(function (i) { return i.placement === place; });
      var pick = chosen[place] === 'none'
        ? null                                   // skipped on purpose in the guided look
        : (options.filter(function (i) { return i.id === chosen[place]; })[0] || options[0] || null);
      if (pick) filled++;
      return lookSlot(place, options, pick);
    });

    lookHolder.appendChild(el('p', { class: 'look__count', role: 'status' }, [
      el('strong', { text: filled + ' of ' + LOOK_SLOTS.length }), ' places filled. One piece for each place on the body, chosen from your saved pieces.'
    ]));
    lookHolder.appendChild(el('ul', { class: 'look' }, slots));
    lookHolder.appendChild(el('p', { class: 'look__start' }, [el('a', { class: 'btn btn--ghost', href: 'look.html#ear' }, ['Build it step by step'])]));
  }

  /* ----- Section 1: latest match ----- */
  if (last) {
    var out = JM.rank(last.answers);

    var summary = el('dl', { class: 'answers' }, JM.DIMENSIONS.map(function (dim) {
      return el('div', {}, [
        el('dt', { text: DIM_LABEL[dim] }),
        el('dd', { text: JM.labelOf(dim, last.answers[dim]) })
      ]);
    }));

    var parts = [
      el('h2', { class: 'section-title', text: 'Latest match' }),
      summary,
      el('div', { class: 'results-head' }, [
        el('button', { type: 'button', class: 'btn btn--ghost', onclick: function () { openQuiz(0); } }, ['Change my answers']),
        el('button', { type: 'button', class: 'btn btn--ghost', onclick: function () { openQuiz(4); } }, ['See full results'])
      ])
    ];

    if (out.ok) {
      parts.push(el('div', { class: 'object-grid object-grid--plain' }, out.results.map(function (r) {
        return JM.ui.objectCard(r.item, {
          headingLevel: 'h3',
          note: r.score + '% match',
          onSaveChange: function () { renderSaved(false); }
        });
      })));
    }

    root.appendChild(el('section', { class: 'saved-section' }, parts));
  }

  root.appendChild(savedHolder);
  root.appendChild(lookHolder);
  renderSaved(false);
})();
