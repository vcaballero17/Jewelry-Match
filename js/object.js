/* ==========================================================
   object.js  -  the Object Story template
   ----------------------------------------------------------
   1. read ?id=... from the address
   2. find that piece in the shared data
   3. build the page, or show a helpful "not found" state
   ========================================================== */
(function () {
  'use strict';

  var JM = window.JM;
  var el = JM.ui.el;
  var root = document.getElementById('object-root');

  var id = '';
  var fromMatch = false;
  try {
    var params = new URLSearchParams(window.location.search);
    id = params.get('id') || '';
    fromMatch = params.get('from') === 'match';
  } catch (err) { /* old browser: falls through to "not found" */ }

  // Backup: some hosts and previews drop the ?query part of a link, so the
  // links also carry the id after a # (object.html?id=kite-pinky#kite-pinky).
  if (!id && window.location.hash.length > 1) {
    id = decodeURIComponent(window.location.hash.slice(1));
  }

  function findItem(wanted) {
    return JM.jewelry.filter(function (item) { return item.id === wanted; })[0] || null;
  }

  var item = findItem(id);

  /* ---------- Unknown or missing id ---------- */
  if (!item) {
    document.title = 'Object not found — Jewelry Match';
    root.appendChild(el('h1', { class: 'object-title' }, ['Not found']));
    root.appendChild(el('p', { class: 'page-intro', text: 'We could not find that object. The link may be old or mistyped.' }));
    root.appendChild(el('div', { class: 'empty-actions' }, [
      el('a', { class: 'btn', href: 'archive.html' }, ['Browse The Edit']),
      el('a', { class: 'btn btn--ghost', href: 'match.html' }, ['Find your match'])
    ]));
    return;
  }

  document.title = item.name + ' — Jewelry Match';

  /* ---------- Facts list ---------- */
  function fact(label, value) {
    return [el('dt', { text: label }), el('dd', { text: value })];
  }
  var facts = el('dl', { class: 'facts' }, []
    .concat(fact('Placement', JM.labelOf('placement', item.placement)))
    .concat(fact('Material', item.materialNote || JM.labelOf('material', item.material)))
    .concat(fact('Form', JM.labelOf('form', item.form)))
    .concat(fact('Mood', JM.labelOf('mood', item.mood)))
  );

  /* ---------- Hero ---------- */
  var hero = el('div', { class: 'object-hero' }, [
    JM.ui.media(item, '', true),
    el('div', { class: 'object-info' }, [
      el('p', { class: 'meta', text: item.catalogNo }),
      el('h1', { class: 'object-title', text: item.name }),
      facts,
      el('p', { class: 'object-story', text: item.story }),
      el('div', {}, [JM.ui.saveButton(item)])
    ])
  ]);

  /* ---------- Sections ---------- */
  var sections = [];

  sections.push(el('section', { 'aria-labelledby': 'wear-heading' }, [
    el('h2', { class: 'section-title', id: 'wear-heading', text: 'How to wear it' }),
    el('p', { text: item.stylingNote })
  ]));

  // "Why it matched" only appears when you arrive from your results.
  var last = fromMatch ? JM.storage.getLastMatch() : null;
  if (last) {
    var scored = JM.scoreObject(item, last.answers);
    sections.push(el('section', { 'aria-labelledby': 'why-heading' }, [
      el('h2', { class: 'section-title', id: 'why-heading', text: 'Why it matched' }),
      el('p', { text: JM.explain(scored, last.answers) }),
      el('p', {}, [el('a', { href: 'match.html' }, ['Change your answers'])])
    ]));
  }

  // Send just this one piece. It uses the same link format as a full look
  // (look.html#look-000-007-000-000-000), with every other place left empty.
  var single = {};
  single[item.placement] = item.id;
  sections.push(JM.ui.shareBlock({
    heading: 'Send this piece',
    summary: item.name,
    text: 'Anyone with this link sees just this piece. Nothing is stored on a server.',
    url: new URL('look.html', window.location.href).href + '#' + JM.encodeLook(single),
    label: 'Link to this piece',
    shareTitle: item.name + ' \u2014 Jewelry Match',
    shareText: 'A piece I like: ' + item.name + '.'
  }));

  var related = (item.relatedIds || []).map(findItem).filter(Boolean).slice(0, 3);
  if (related.length) {
    sections.push(el('section', { 'aria-labelledby': 'pair-heading' }, [
      el('h2', { class: 'section-title', id: 'pair-heading', text: 'Pair it with' }),
      el('div', { class: 'pair-grid' }, related.map(function (rel) {
        return JM.ui.objectCard(rel, { headingLevel: 'h3' });
      }))
    ]));
  }

  // Credits matter for real photos; placeholders have nothing to credit.
  var first = item.images && item.images[0];
  if (JM.SHOW_IMAGES && first && first.credit && first.credit !== 'TBD') {
    sections.push(el('p', { class: 'credit', text: 'Image credit: ' + first.credit }));
  }

  root.appendChild(el('a', { class: 'back-link', href: 'archive.html' }, ['← The Edit']));
  root.appendChild(hero);
  root.appendChild(el('div', { class: 'object-sections' }, sections));
})();
