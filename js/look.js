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

  // Body order, top to bottom (one list for the whole site, in match.js).
  var PLACES = JM.LOOK_PLACES;

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

  /* Start a brand-new look: forget the earlier choices (the saved pieces
     stay saved) and open the first place. Used by "Start a new look" and
     by "Build my own look" in a friend's view, so both behave the same. */
  function startFresh() {
    PLACES.forEach(function (place) { JM.storage.setLook(place, null); });
    JM.ui.announce('Starting a new look.');
    go(0);
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

    // Remember the selected piece (and save it to Your Edit too).
    function commit() {
      var item = findItem(selected);
      JM.storage.setLook(place, selected);
      if (!JM.storage.isFavorite(selected)) JM.storage.toggleFavorite(selected);
      JM.ui.updateFavCount();
      JM.ui.announce(item.name + ' added to your look.');
    }

    function onContinue() {
      if (!selected) {
        hint.textContent = 'Choose a piece, or skip this place.';
        hint.className = 'hint hint--alert';
        JM.ui.announce('Choose a piece, or skip this place.');
        return;
      }
      commit();
      go(step + 1);
    }

    // "Finish now": you do not have to fill every place. Keep what is chosen
    // (including the piece selected on this screen) and jump to the send screen.
    function onFinishNow() {
      if (selected) commit();
      var look = JM.storage.getLook();
      var any = PLACES.some(function (p) { return look[p] && look[p] !== 'none'; });
      if (!any) {
        hint.textContent = 'Choose at least one piece first, then you can finish.';
        hint.className = 'hint hint--alert';
        JM.ui.announce('Choose at least one piece first.');
        return;
      }
      go(PLACES.length);
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
      'Choose the one you would wear here, or skip this place. You can also finish at any time with just what you have chosen.' }));
    root.appendChild(el('fieldset', { class: 'look-flow__fieldset' }, [
      el('legend', { class: 'vh', text: 'Choose a piece for ' + label.toLowerCase() }),
      el('div', { class: 'choices' }, options)
    ]));
    root.appendChild(el('div', { class: 'step-actions' }, [
      back,
      el('button', { type: 'button', class: 'btn btn--ghost', onclick: onSkip }, ['Skip this place']),
      continueBtn,
      // Not on the last place: there, "Finish" already does the same thing.
      step < PLACES.length - 1
        ? el('button', { type: 'button', class: 'btn btn--ghost', id: 'finish-now', onclick: onFinishNow }, ['Finish now'])
        : null,
      hint
    ]));
  }

  /* ----- A picture, a name and a link to the piece's story ----- */
  function pieceLink(item) {
    return el('a', { class: 'card__link', href: 'object.html?id=' + encodeURIComponent(item.id) + '#' + encodeURIComponent(item.id) }, [
      JM.ui.media(item),
      el('span', { class: 'meta', text: item.catalogNo }),
      el('span', { class: 'card__name', text: item.name })
    ]);
  }

  /* The link that carries the chosen pieces (see JM.encodeLook in match.js). */
  function lookUrl(code) {
    return window.location.href.split('#')[0].split('?')[0] + '#' + code;
  }

  function lookSummary(look) {
    return PLACES
      .filter(function (place) { return look[place] && look[place] !== 'none'; })
      .map(function (place) { return findItem(look[place]).name; })
      .join(' \u00b7 ');
  }

  /* ----- The last screen: your decision, ready to send ----- */
  function renderDone() {
    titleEl.textContent = 'Your look';
    var look = JM.storage.getLook();
    var filled = 0;

    var slots = PLACES.map(function (place, step) {
      var label = JM.labelOf('placement', place);
      var item = look[place] && look[place] !== 'none' ? findItem(look[place]) : null;
      if (item) filled++;

      var parts = [el('h3', { class: 'look__place', text: label })];
      parts.push(item ? pieceLink(item) : el('p', { class: 'look__empty', text: look[place] === 'none' ? 'Skipped.' : 'Not chosen yet.' }));
      parts.push(el('button', { type: 'button', class: 'btn btn--ghost btn--small', onclick: function () { go(step); } }, [
        item ? 'Change' : 'Choose', el('span', { class: 'vh', text: ' ' + label.toLowerCase() })
      ]));
      return el('li', { class: 'look__slot' }, parts);
    });

    root.appendChild(el('p', { class: 'page-intro', text: 'This is your decision. These are the pieces you chose, one for each place. Send them to your friends, or change anything first.' }));
    root.appendChild(el('p', { class: 'look__count', role: 'status' }, [
      el('strong', { text: filled + ' of ' + PLACES.length }),
      ' places filled. Every piece you chose is also saved in Your Edit.'
    ]));
    root.appendChild(el('ul', { class: 'look look--row' }, slots));

    var code = JM.encodeLook(look);
    if (code) {
      root.appendChild(JM.ui.shareBlock({
        heading: 'Send your look',
        summary: lookSummary(look),
        text: 'Anyone with this link sees the pieces you chose, side by side. Nothing is stored on a server; your choices travel inside the link.',
        url: lookUrl(code),
        label: 'Link to your look',
        shareTitle: 'My Jewelry Match look',
        shareText: 'The pieces I chose: ' + lookSummary(look) + '. Take a look:'
      }));
    } else {
      root.appendChild(el('div', { class: 'notice' }, [
        el('h2', { text: 'Nothing to send yet' }),
        el('p', { text: 'You skipped every place. Choose at least one piece, then you can send your look.' }),
        el('div', { class: 'empty-actions' }, [
          el('button', { type: 'button', class: 'btn', onclick: function () { go(0); } }, ['Choose a piece'])
        ])
      ]));
    }

    root.appendChild(el('div', { class: 'step-actions' }, [
      el('a', { class: 'btn btn--ghost', href: 'saved.html' }, ['See it in Your Edit']),
      el('button', { type: 'button', class: 'btn btn--ghost', onclick: startFresh }, ['Start a new look'])
    ]));
  }

  /* ----- A friend opened a look link: show what was chosen, in a line.
         Nothing is saved on this visitor's device. ----- */
  function renderShared(look) {
    var mine = startFresh;     // leave the shared view and begin your own look from the start

    progressEl.textContent = '';
    if (!look) {
      titleEl.textContent = 'This link does not work';
      root.appendChild(el('div', { class: 'notice', role: 'alert' }, [
        el('h2', { text: 'We could not read this look' }),
        el('p', { text: 'The link may have been cut short when it was copied. Ask your friend to send it again, or build a look of your own.' }),
        el('div', { class: 'empty-actions' }, [
          el('button', { type: 'button', class: 'btn', onclick: mine }, ['Build my own look'])
        ])
      ]));
      return;
    }

    var count = PLACES.filter(function (place) { return look[place] !== 'none'; }).length;
    titleEl.textContent = count === 1 ? 'A friend\u2019s pick' : 'A friend\u2019s look';
    progressEl.appendChild(el('span', { class: 'progress__text', text: 'Shared with you' }));

    var slots = PLACES
      .filter(function (place) { return look[place] !== 'none'; })
      .map(function (place) {
        return el('li', { class: 'look__slot' }, [
          el('h3', { class: 'look__place', text: JM.labelOf('placement', place) }),
          pieceLink(findItem(look[place]))
        ]);
      });

    root.appendChild(el('p', { class: 'page-intro shared-note', text: count === 1
      ? 'A friend sent you a piece they like.'
      : 'A friend sent you their look. These are the pieces they chose, one for each place they wanted to dress.' }));
    root.appendChild(el('ul', { class: 'look look--row' }, slots));
    root.appendChild(el('div', { class: 'step-actions' }, [
      el('button', { type: 'button', class: 'btn', onclick: mine }, ['Build my own look']),
      el('a', { class: 'btn btn--ghost', href: 'match.html' }, ['Find my match'])
    ]));
    root.appendChild(JM.ui.shareBlock({
      heading: count === 1 ? 'Send this piece on' : 'Send this look on',
      summary: lookSummary(look),
      text: count === 1
        ? 'Anyone with this link sees this same piece. Nothing is stored on a server.'
        : 'Anyone with this link sees these same pieces. Nothing is stored on a server.',
      url: window.location.href.split('?')[0],
      label: 'Link to this look',
      shareTitle: 'A Jewelry Match look',
      shareText: 'The pieces a friend chose: ' + lookSummary(look) + '. Take a look:'
    }));
  }

  /* ----- Draw the screen the address asks for ----- */
  function render(moveFocus) {
    root.textContent = '';
    var hash = window.location.hash.replace('#', '').toLowerCase();

    if (hash.indexOf(JM.LOOK_PREFIX) === 0) {
      renderShared(JM.decodeLook(hash));              // a friend's link (null if it is broken)
    } else {
      var step = currentStep();
      renderProgress(step);
      if (step >= PLACES.length) renderDone(); else renderPlace(step);
    }
    if (moveFocus) titleEl.focus();     // tell screen readers a new screen has started
  }

  window.addEventListener('hashchange', function () { render(true); });
  render(false);
})();
