/* ==========================================================
   ui.js  -  small helpers shared by every page
   ----------------------------------------------------------
   1. el()    builds HTML elements safely from JavaScript
   2. svg()   builds SVG drawings
   3. media() returns a photo or, for now, a styled placeholder
   4. announce() speaks a message to screen readers
   5. the mobile menu button and the "Your edit [03]" counter
   ========================================================== */
(function () {
  'use strict';
  var JM = window.JM;
  var ui = {};

  /* el('button', { class: 'btn', onclick: fn }, ['Hello'])
     builds <button class="btn">Hello</button>.
     It uses textContent, never innerHTML, so text can never
     be mistaken for code (a basic security habit). */
  ui.el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === false || value === null || value === undefined) return;
      if (key === 'class') {
        node.className = value;
      } else if (key === 'text') {
        node.textContent = value;
      } else if (key.slice(0, 2) === 'on' && typeof value === 'function') {
        node.addEventListener(key.slice(2), value);   // onclick -> 'click'
      } else {
        node.setAttribute(key, value === true ? '' : value);
      }
    });
    [].concat(children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  };

  // Same idea for SVG, which needs its own "namespace".
  ui.svg = function (tag, attrs, children) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    [].concat(children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  };

  /* A piece's picture. While JM.SHOW_IMAGES is false this returns a
     colored placeholder. If a real photo fails to load, it swaps itself
     for the placeholder too. Pass eager = true for the main picture on a
     page, so it loads at once; the rest load lazily as you scroll. */
  ui.media = function (item, extraClass, eager) {
    var el = ui.el;
    function placeholder() {
      return el('div', {
        class: 'placeholder placeholder--' + item.material + ' ' + (extraClass || ''),
        'aria-hidden': 'true'
      }, [
        el('span', { class: 'placeholder__no', text: item.catalogNo }),
        el('span', { class: 'placeholder__name', text: item.name })
      ]);
    }
    var first = item.images && item.images[0];
    if (!JM.SHOW_IMAGES || !first) return placeholder();

    var img = el('img', {
      class: 'media-img ' + (extraClass || ''),
      src: first.src,
      alt: first.alt,
      width: '1122',      // real pixel size: lets the browser reserve space (no layout jump)
      height: '1402',
      loading: eager ? 'eager' : 'lazy',
      decoding: 'async'
    });
    img.addEventListener('error', function () {
      if (img.parentNode) img.parentNode.replaceChild(placeholder(), img);
    });
    return img;
  };

  // Polite screen-reader message (spec: saved confirmations use aria-live).
  ui.announce = function (message) {
    var live = document.getElementById('live');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () { live.textContent = message; }, 50);
  };

  /* One Save/Remove button used on every page. It toggles the favorite,
     updates the header counter and tells screen readers what happened.
     opts.compact = short "Save" label with a heart (for small cards).
     opts.onChange(nowSaved) lets a page react (e.g. the Saved page). */
  ui.saveButton = function (item, opts) {
    opts = opts || {};
    var btn = ui.el('button', { type: 'button', class: opts.compact ? 'btn btn--ghost btn--small' : 'btn btn--ghost' });

    function paint() {
      var saved = JM.storage.isFavorite(item.id);
      var text = opts.compact
        ? (saved ? 'Remove' : 'Save')
        : (saved ? 'Remove from your edit' : 'Save to your edit');
      btn.textContent = '';
      if (opts.compact) {
        btn.appendChild(ui.el('span', { 'aria-hidden': 'true', text: saved ? '♥ ' : '♡ ' }));
      }
      btn.appendChild(document.createTextNode(text));
      btn.appendChild(ui.el('span', { class: 'vh', text: ' — ' + item.name }));
    }
    paint();

    // If the same piece is saved from another button on the page,
    // this button repaints itself too (keeps every copy in sync).
    document.addEventListener('jm:favorites', paint);

    btn.addEventListener('click', function () {
      var nowSaved = JM.storage.toggleFavorite(item.id);
      document.dispatchEvent(new CustomEvent('jm:favorites'));
      ui.updateFavCount();
      ui.announce(item.name + (nowSaved ? ' saved to your edit.' : ' removed from your edit.'));
      if (opts.onChange) opts.onChange(nowSaved);
    });
    return btn;
  };

  /* An object card: picture, catalog number, name and facts, linked to
     the Object Story, plus a Save button. Used by the archive, the
     Saved page and "Pair it with". */
  ui.objectCard = function (item, opts) {
    opts = opts || {};
    var link = ui.el('a', { class: 'card__link', href: 'object.html?id=' + encodeURIComponent(item.id) + '#' + encodeURIComponent(item.id) }, [
      ui.media(item),
      ui.el('span', { class: 'meta', text: item.catalogNo }),
      ui.el(opts.headingLevel || 'h2', { class: 'card__name', text: item.name }),
      opts.note ? ui.el('span', { class: 'card__note', text: opts.note }) : null,
      ui.el('span', { class: 'card__facts', text: JM.labelOf('placement', item.placement) + ' · ' + (item.materialNote || JM.labelOf('material', item.material)) })
    ]);
    return ui.el('article', { class: 'card' }, [
      link,
      ui.saveButton(item, { compact: true, onChange: opts.onSaveChange })
    ]);
  };

  ui.updateFavCount = function () {
    var count = JM.storage.getFavorites().length;
    var text = count < 10 ? '0' + count : String(count);
    var spots = document.querySelectorAll('[data-fav-count]');
    for (var i = 0; i < spots.length; i++) spots[i].textContent = text;
  };

  /* ----- Mobile menu: a labelled button with an explicit close state ----- */
  function setupMenu() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;

    function setOpen(open) {
      nav.setAttribute('data-open', open ? 'true' : 'false');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Close' : 'Menu';
    }
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  JM.ui = ui;
  setupMenu();
  ui.updateFavCount();
})();
