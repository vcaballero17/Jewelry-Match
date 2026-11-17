/* ==========================================================
   archive.js  -  The Edit page
   ----------------------------------------------------------
   Same idea as the quiz: keep the current filters in a
   variable ("filters"), and redraw the cards whenever they
   change. The actual filtering is JM.filterItems() in match.js,
   which has its own tests.
   ========================================================== */
(function () {
  'use strict';

  var JM = window.JM;
  var el = JM.ui.el;

  var form = document.getElementById('filters');
  var grid = document.getElementById('object-grid');
  var countEl = document.getElementById('count');
  var clearBtn = document.getElementById('clear-all');
  var emptyEl = document.getElementById('empty');

  var DIM_LABEL = { placement: 'Placement', form: 'Form', material: 'Material / color', mood: 'Mood' };

  var filters = { placement: '', form: '', material: '', mood: '' };

  /* ----- Compare mode: which pieces are ticked (at most three) ----- */
  var MAX_COMPARE = 3;
  var compare = [];                 // list of ids, in the order they were ticked
  var bar = document.getElementById('compare-bar');
  var panel = document.getElementById('compare-panel');

  function itemById(id) {
    return JM.jewelry.filter(function (j) { return j.id === id; })[0];
  }

  /* ----- Start from the web address, e.g. archive.html?placement=ear.
         Every value is checked against the allowed options first. ----- */
  try {
    var params = new URLSearchParams(window.location.search);
    JM.DIMENSIONS.forEach(function (dim) {
      var value = params.get(dim);
      var allowed = JM.OPTIONS[dim].some(function (opt) { return opt.value === value; });
      if (value && allowed) filters[dim] = value;
    });
  } catch (err) { /* old browser: just start with no filters */ }

  function activeDims() {
    return JM.DIMENSIONS.filter(function (dim) { return filters[dim]; });
  }

  /* ----- Build the four filter groups once ----- */
  var chipRefs = [];     // every chip, so we can refresh its count after each change

  function buildChip(dim, value, label) {
    var input = el('input', {
      type: 'radio',
      name: 'filter-' + dim,
      id: 'filter-' + dim + '-' + (value || 'any'),
      value: value,
      checked: filters[dim] === value,
      onchange: function () {
        filters[dim] = value;
        update();
      }
    });
    var count = el('span', { class: 'chip__n' });
    chipRefs.push({ dim: dim, value: value, input: input, count: count });
    return el('label', { class: 'chip' }, [input, el('span', {}, [label + ' ', count])]);
  }

  /* How many pieces would be left if this chip were chosen, keeping the
     OTHER groups as they are now. Zero means choosing it is a dead end. */
  function countIf(dim, value) {
    var test = {};
    JM.DIMENSIONS.forEach(function (d) { test[d] = filters[d]; });
    test[dim] = value;
    return JM.filterItems(JM.jewelry, test).length;
  }

  function updateChips() {
    chipRefs.forEach(function (chip) {
      var n = countIf(chip.dim, chip.value);
      chip.count.textContent = '(' + n + ')';
      // A chip with nothing behind it is switched off, unless it is the one
      // currently chosen (so the visitor can always see and undo their choice).
      chip.input.disabled = n === 0 && !chip.input.checked;
    });
  }

  JM.DIMENSIONS.forEach(function (dim) {
    var chips = [buildChip(dim, '', 'Any')].concat(
      JM.OPTIONS[dim].map(function (opt) { return buildChip(dim, opt.value, opt.label); })
    );
    form.appendChild(el('fieldset', { class: 'filter' }, [
      el('legend', { text: DIM_LABEL[dim] }),
      el('div', { class: 'chips' }, chips)
    ]));
  });

  /* ----- Clear all ----- */
  function clearAll() {
    JM.DIMENSIONS.forEach(function (dim) {
      filters[dim] = '';
      var any = document.getElementById('filter-' + dim + '-any');
      if (any) any.checked = true;
    });
    update();
    JM.ui.announce('All filters cleared.');
  }

  clearBtn.addEventListener('click', function () {
    if (clearBtn.getAttribute('aria-disabled') === 'true') return;
    clearAll();
  });

  /* ----- Keep the address bar in step (so a filtered view can be shared) ----- */
  function syncUrl() {
    try {
      var p = new URLSearchParams();
      activeDims().forEach(function (dim) { p.set(dim, filters[dim]); });
      var query = p.toString();
      window.history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
    } catch (err) { /* some browsers block this on local files: harmless */ }
  }

  /* ----- Compare: tick box on every card ----- */
  function compareBox(item) {
    var input = el('input', {
      type: 'checkbox',
      checked: compare.indexOf(item.id) !== -1,
      onchange: function () { toggleCompare(item, input); }
    });
    return el('label', { class: 'compare-check' }, [
      input,
      el('span', { text: 'Compare' }),
      el('span', { class: 'vh', text: ' ' + item.name })
    ]);
  }

  function toggleCompare(item, input) {
    var at = compare.indexOf(item.id);
    if (at !== -1) {
      compare.splice(at, 1);
    } else if (compare.length >= MAX_COMPARE) {
      input.checked = false;
      JM.ui.announce('You can compare up to three pieces. Untick one first.');
      return;
    } else {
      compare.push(item.id);
    }
    renderBar();
  }

  /* ----- Compare: the bar at the bottom ----- */
  function renderBar() {
    bar.textContent = '';
    if (compare.length === 0) { bar.hidden = true; return; }
    bar.hidden = false;

    var ready = compare.length >= 2;
    var names = compare.map(function (id) { return itemById(id).name; }).join(', ');
    var go = el('button', {
      type: 'button',
      class: 'btn',
      'aria-disabled': ready ? false : 'true',
      onclick: function () { if (ready) openCompare(); }
    }, ['Compare ' + compare.length]);

    bar.appendChild(el('p', { class: 'compare-bar__text' }, [
      el('strong', { text: compare.length + ' of ' + MAX_COMPARE + ' selected: ' }),
      names + (ready ? '' : '. Choose at least two.')
    ]));
    bar.appendChild(el('div', { class: 'compare-bar__actions' }, [
      go,
      el('button', { type: 'button', class: 'btn btn--ghost', onclick: clearCompare }, ['Clear'])
    ]));
  }

  function clearCompare() {
    compare = [];
    closeCompare(true);
    renderBar();
    update();
    JM.ui.announce('Comparison cleared.');
  }

  /* ----- Compare: the side-by-side table ----- */
  var ROWS = [
    ['placement', 'Placement'],
    ['form', 'Form'],
    ['material', 'Material / color'],
    ['mood', 'Mood']
  ];

  function valueText(dim, item) {
    return dim === 'material' && item.materialNote ? item.materialNote : JM.labelOf(dim, item[dim]);
  }

  function openCompare() {
    var items = compare.map(itemById);

    var headRow = el('tr', {}, [el('th', { scope: 'col' }, [el('span', { class: 'vh', text: 'Feature' })])].concat(
      items.map(function (item) {
        return el('th', { scope: 'col' }, [
          JM.ui.media(item),
          el('a', { class: 'cmp__name', href: 'object.html?id=' + encodeURIComponent(item.id) + '#' + encodeURIComponent(item.id), text: item.name }),
          el('span', { class: 'meta', text: item.catalogNo })
        ]);
      })
    ));

    var bodyRows = ROWS.map(function (row) {
      var dim = row[0];
      var allSame = items.every(function (it) { return it[dim] === items[0][dim]; });
      var label = el('th', { scope: 'row' }, [row[1]].concat(
        allSame ? [el('span', { class: 'cmp__same', text: 'All the same' })] : []
      ));
      return el('tr', {}, [label].concat(
        items.map(function (item) { return el('td', { text: valueText(dim, item) }); })
      ));
    });

    panel.textContent = '';
    panel.appendChild(el('h2', { class: 'section-title', id: 'compare-heading', tabindex: '-1', text: 'Compare' }));
    panel.appendChild(el('div', { class: 'table-wrap table-wrap--wide' }, [
      el('table', { class: 'score-table cmp' }, [
        el('caption', { text: 'Side-by-side comparison of ' + items.map(function (i) { return i.name; }).join(', ') }),
        el('thead', {}, [headRow]),
        el('tbody', {}, bodyRows)
      ])
    ]));
    panel.appendChild(el('button', { type: 'button', class: 'btn btn--ghost', onclick: function () { closeCompare(false); } }, ['Close comparison']));
    panel.hidden = false;
    document.getElementById('compare-heading').focus();
    JM.ui.announce('Comparing ' + items.length + ' pieces.');
  }

  function closeCompare(quiet) {
    if (panel.hidden) return;
    panel.hidden = true;
    panel.textContent = '';
    if (!quiet) {
      var back = bar.querySelector('.btn');
      if (back) back.focus();
    }
  }

  /* ----- When nothing matches exactly: the nearest pieces.
         Same idea as the quiz: each chosen group is worth its weight in points. ----- */
  function closestItems(active) {
    var scored = JM.jewelry.map(function (item, index) {
      var matched = active.filter(function (dim) { return item[dim] === filters[dim]; });
      var score = matched.reduce(function (sum, dim) { return sum + JM.WEIGHTS[dim]; }, 0);
      return { item: item, index: index, score: score, matched: matched };
    }).filter(function (r) { return r.score > 0; });
    scored.sort(function (a, b) { return b.score - a.score || a.index - b.index; });   // ties: collection order
    return scored.slice(0, 4);
  }

  /* ----- Redraw the results ----- */
  function update() {
    var items = JM.filterItems(JM.jewelry, filters);
    var active = activeDims();

    grid.textContent = '';
    emptyEl.textContent = '';

    if (items.length === 0) {
      var summary = active.map(function (dim) {
        return DIM_LABEL[dim] + ': ' + JM.labelOf(dim, filters[dim]);
      }).join(', ');

      emptyEl.appendChild(el('div', { class: 'notice' }, [
        el('h2', { text: 'No piece has all of these' }),
        el('p', { text: 'Active filters \u2014 ' + summary + '. Try removing one.' }),
        el('div', { class: 'empty-actions' }, [
          el('button', { type: 'button', class: 'btn', onclick: clearAll }, ['Clear all'])
        ])
      ]));

      var near = closestItems(active);
      if (near.length) {
        emptyEl.appendChild(el('h2', { class: 'section-title near__title', text: 'Closest pieces' }));
        emptyEl.appendChild(el('p', { class: 'near__intro', text: 'These are the nearest we have. Each one says which of your filters it matches.' }));
        emptyEl.appendChild(el('div', { class: 'object-grid object-grid--plain' }, near.map(function (r) {
          var card = JM.ui.objectCard(r.item, {
            headingLevel: 'h3',
            note: 'Matches: ' + r.matched.map(function (d) { return DIM_LABEL[d].toLowerCase(); }).join(', ')
          });
          card.appendChild(compareBox(r.item));
          return card;
        })));
      }
    } else {
      items.forEach(function (item) {
        var card = JM.ui.objectCard(item);
        card.appendChild(compareBox(item));
        grid.appendChild(card);
      });
    }

    updateChips();
    countEl.textContent = items.length + (items.length === 1 ? ' object' : ' objects');

    if (active.length) {
      clearBtn.removeAttribute('aria-disabled');
    } else {
      clearBtn.setAttribute('aria-disabled', 'true');
    }
    syncUrl();
  }

  update();
  renderBar();
})();
