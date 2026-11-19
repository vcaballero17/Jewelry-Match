const CHROME = require('fs').existsSync('/usr/bin/google-chrome') ? { executablePath: '/usr/bin/google-chrome' } : { channel: 'chrome' };  // use the Chrome installed on this computer
/* ==========================================================
   Accessibility audit (WCAG 2.1/2.2 AA), run with:   node tests/browser/a11y.js
   Needs:  npm i -g axe-core playwright
   A. axe-core on every page and important state
   B. 200% and 400% zoom (reflow): no sideways scrolling, no clipped text
   C. WCAG text-spacing override: nothing is cut off
   D. target size: every button/link/field is easy to hit (44 px goal, 24 px is the WCAG 2.2 minimum)
   E. keyboard: every stop shows a visible focus ring; the skip link works
   F. a sticky bar never hides the item that has focus
   G. reduced motion is respected
   H. colour contrast of the palette itself
   ========================================================== */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const ROOT = path.resolve(__dirname, '../..');
const BASE = 'file://' + ROOT + '/';
let failures = 0;
const check = (n, ok, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok || !d ? '' : '  -> ' + d)); if (!ok) failures++; };

const seedLook = async p => { await p.evaluate(() => { ['drop-study','melt-collar','kite-pinky','orbit-signet'].forEach(i => JM.storage.toggleFavorite(i)); JM.storage.saveLastMatch({placement:'ear',form:'liquid',material:'silver',mood:'quiet'},[]); JM.storage.setLook('ear','drop-study'); JM.storage.setLook('neckline','none'); }); await p.reload(); };
const STATES = [
  ['Home', 'index.html'], ['About', 'about.html'],
  ['Quiz: body map', 'match.html'],
  ['Quiz: form step', 'match.html', async p => { await p.click('.hotspot[data-value=ear]'); await p.click('#continue'); }],
  ['Quiz: shared results', 'match.html#edit-ear-liquid-silver-quiet'],
  ['The Edit', 'archive.html'], ['The Edit: nothing matches', 'archive.html?placement=ankle&form=organic'],
  ['The Edit: compare open', 'archive.html', async p => { for (const n of ['Kite Pinky', 'Orbit Signet']) await p.locator('article.card', { hasText: n }).locator('.compare-check input').check(); await p.click('#compare-bar .btn'); }],
  ['Piece page', 'object.html?id=kite-pinky'], ['Piece not found', 'object.html?id=zzz'],
  ['Your Edit: empty', 'saved.html'], ['Your Edit: with look', 'saved.html', seedLook],
  ['Look: a place', 'look.html#neckline'], ['Look: final screen', 'look.html#done', seedLook],
  ['Look: friend view', 'look.html#look-006-009-000-001-010'], ['Look: broken link', 'look.html#look-xyz'],
];
async function open(b, [name, url, setup], vp) {
  const ctx = await b.newContext({ viewport: vp || { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + url);
  await p.waitForTimeout(200);
  if (setup) { await setup(p); await p.waitForTimeout(250); }
  await p.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager'));
  await p.waitForTimeout(250);
  return { ctx, p };
}
// elements whose text is cut off by their own box
const clipped = () => [...document.querySelectorAll('body *')].filter(e => {
  const cs = getComputedStyle(e);
  if (cs.display === 'none' || cs.visibility === 'hidden' || e.closest('.vh, .look--row, .table-wrap, .mosaic__tile')) return false;
  if (!e.textContent.trim() || e.children.length > 3) return false;
  const hiddenX = ['hidden', 'clip'].includes(cs.overflowX) && e.scrollWidth > e.clientWidth + 1;
  const hiddenY = ['hidden', 'clip'].includes(cs.overflowY) && e.scrollHeight > e.clientHeight + 1;
  return hiddenX || hiddenY;
}).map(e => e.tagName.toLowerCase() + '.' + e.className).slice(0, 5);

(async () => {
  const b = await chromium.launch({ ...CHROME, args: ['--no-sandbox'] });

  console.log('\nA. axe-core (WCAG 2.0, 2.1, 2.2 A and AA, plus best practices)');
  for (const st of STATES) {
    const { ctx, p } = await open(b, st);
    await p.evaluate(AXE);
    const r = await p.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
    check(st[0] + ' (' + r.passes.length + ' rules passed)', r.violations.length === 0, r.violations.map(v => v.id + ' ' + v.nodes.map(n => n.target.join(' ')).slice(0, 2).join(' ; ')).join(' | '));
    await ctx.close();
  }

  console.log('\nB. Zoom 200% (640 px wide) and 400% (320 px wide): content must reflow');
  for (const [w, h, label] of [[640, 450, '200%'], [320, 256, '400%']]) {
    for (const st of STATES) {
      const { ctx, p } = await open(b, st, { width: w, height: h });
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      const cut = await p.evaluate(clipped);
      check(label + ' ' + st[0], sw <= w && cut.length === 0, 'scrollWidth ' + sw + (cut.length ? ' clipped: ' + cut.join(', ') : ''));
      await ctx.close();
    }
  }

  console.log('\nC. Text-spacing override (WCAG 1.4.12): line 1.5, letters .12em, words .16em, paragraphs 2em');
  for (const st of STATES) {
    const { ctx, p } = await open(b, st, { width: 390, height: 800 });
    await p.addStyleTag({ content: '*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p{margin-bottom:2em !important}' });
    await p.waitForTimeout(150);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    const cut = await p.evaluate(clipped);
    check(st[0], sw <= 390 && cut.length === 0, 'scrollWidth ' + sw + (cut.length ? ' clipped: ' + cut.join(', ') : ''));
    await ctx.close();
  }

  console.log('\nD. Target size (goal 44 px, WCAG 2.2 minimum 24 px; links inside sentences are exempt)');
  for (const [w, h] of [[390, 800], [1280, 900]]) {
    let small = [], tiny = [];
    for (const st of STATES) {
      const { ctx, p } = await open(b, st, { width: w, height: h });
      const r = await p.evaluate(() => {
        const out = [];
        document.querySelectorAll('a[href], button, input:not([type=hidden]), select, summary, textarea').forEach(e => {
          const cs = getComputedStyle(e);
          if (cs.display === 'none' || cs.visibility === 'hidden' || e.closest('.vh')) return;
          if (e.tagName === 'A' && cs.display === 'inline') return;                       // inline text link
          const box = (e.tagName === 'INPUT' && (e.closest('label') || e)) || e;           // a checkbox's target is its label
          const rc = box.getBoundingClientRect();
          if (rc.width === 0 || rc.height === 0) return;
          out.push([Math.round(rc.width), Math.round(rc.height), (e.textContent || e.name || e.id || e.tagName).trim().slice(0, 24)]);
        });
        return out;
      });
      r.forEach(([ww, hh, n]) => { if (Math.min(ww, hh) < 24) tiny.push(st[0] + ': ' + n + ' ' + ww + 'x' + hh); else if (Math.min(ww, hh) < 44) small.push(st[0] + ': ' + n + ' ' + ww + 'x' + hh); });
      await ctx.close();
    }
    check(w + 'px: nothing smaller than 24 px', tiny.length === 0, tiny.slice(0, 5).join(' ; '));
    check(w + 'px: everything at least 44 px (our own goal)', small.length === 0, small.slice(0, 6).join(' ; '));
  }

  console.log('\nE. Keyboard: visible focus ring on every Tab stop, working skip link');
  const KEYS = [['Home', 'index.html'], ['Quiz', 'match.html'], ['The Edit', 'archive.html'], ['Piece page', 'object.html?id=kite-pinky'], ['Your Edit', 'saved.html', seedLook], ['Look: place', 'look.html#neckline'], ['Look: final', 'look.html#done', seedLook], ['Friend view', 'look.html#look-006-009-000-001-010']];
  for (const st of KEYS) {
    const { ctx, p } = await open(b, st);
    await p.keyboard.press('Tab');
    const first = await p.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { skip: a.classList.contains('skip-link'), visible: r.top >= 0 && r.height > 0 }; });
    check(st[0] + ': first Tab is the skip link and it is visible', first.skip && first.visible);
    await p.keyboard.press('Enter'); await p.keyboard.press('Tab');
    check(st[0] + ': after the skip link, focus is inside the main content', await p.evaluate(() => !!document.activeElement.closest('main')));
    await p.evaluate(() => document.body.focus()); await p.goto(p.url()); await p.waitForTimeout(150);
    const bad = []; let stops = 0, reachedFooter = false;
    for (let i = 0; i < 160; i++) {
      await p.keyboard.press('Tab');
      const r = await p.evaluate(() => {
        const a = document.activeElement; if (!a || a === document.body) return null;
        const ring = x => x && getComputedStyle(x).outlineStyle !== 'none' && parseFloat(getComputedStyle(x).outlineWidth) > 0;
        const ok = ring(a) || ring(a.nextElementSibling) || ring(a.closest('label')) || ring(a.closest('summary')) || (getComputedStyle(a).boxShadow !== 'none');
        return { ok, name: a.tagName + '.' + a.className + ' ' + (a.textContent || a.id).trim().slice(0, 20), footer: !!a.closest('footer') };
      });
      if (!r) break;
      stops++; if (!r.ok) bad.push(r.name); if (r.footer) reachedFooter = true;
    }
    check(st[0] + ': ' + stops + ' Tab stops, all show a focus ring', bad.length === 0 && stops > 5, bad.slice(0, 3).join(' ; '));
    check(st[0] + ': keyboard can reach the footer (no trap)', reachedFooter);
    await ctx.close();
  }

  console.log('\nF. The sticky compare bar never hides the item that has focus');
  {
    const { ctx, p } = await open(b, ['The Edit', 'archive.html']);
    for (const n of ['Kite Pinky', 'Orbit Signet']) await p.locator('article.card', { hasText: n }).locator('.compare-check input').check();
    let covered = [];
    await p.focus('article.card:first-child a');
    for (let i = 0; i < 40; i++) {
      await p.keyboard.press('Tab'); await p.waitForTimeout(30);
      const c = await p.evaluate(() => {
        const a = document.activeElement, bar = document.getElementById('compare-bar');
        if (!a || bar.hidden || bar.contains(a)) return false;
        const r = a.closest('label,button,a') ? a.closest('label,button,a').getBoundingClientRect() : a.getBoundingClientRect(), k = bar.getBoundingClientRect();
        const overlap = Math.max(0, Math.min(r.bottom, k.bottom) - Math.max(r.top, k.top));
        return overlap >= r.height - 1 ? (a.tagName + ' ' + (a.textContent || '').trim().slice(0, 20)) : false;
      });
      if (c) covered.push(c);
    }
    check('no focused element is completely covered by the bar', covered.length === 0, covered.slice(0, 3).join(' ; '));
    await ctx.close();
  }

  console.log('\nG. Reduced motion');
  for (const st of [['Home', 'index.html'], ['Quiz', 'match.html'], ['The Edit', 'archive.html']]) {
    const ctx = await b.newContext({ reducedMotion: 'reduce' });
    const p = await ctx.newPage(); await p.goto(BASE + st[1]); await p.waitForTimeout(200);
    const r = await p.evaluate(() => ({ anims: document.getAnimations().length, dur: parseFloat(getComputedStyle(document.querySelector('.btn') || document.body).transitionDuration) }));
    check(st[0] + ': no running animations, transitions are instant', r.anims === 0 && r.dur < 0.01, JSON.stringify(r));
    await ctx.close();
  }

  console.log('\nH. Colour contrast of the palette (text needs 4.5:1, interface parts 3:1)');
  const css = fs.readFileSync(path.join(ROOT, 'css/tokens.css'), 'utf8');
  const tok = n => (css.match(new RegExp('--' + n + ':\\s*(#[0-9a-fA-F]{6})')) || [])[1];
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const ratio = (a, b2) => { const [x, y] = [lum(a), lum(b2)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
  const pairs = [['black', 'paper', 4.5, 'body text'], ['ink-muted', 'paper', 4.5, 'small grey text'], ['ink-muted', '#ECE6DB', 4.5, 'grey text on hovered card'], ['oxblood', 'paper', 4.5, 'oxblood text / focus ring'], ['paper', 'black', 4.5, 'button text'], ['paper', 'oxblood', 4.5, 'hovered button text'], ['black', 'yellow', 4.5, 'selected card text'], ['black', 'chrome', 3, 'progress segments vs ink']];
  pairs.forEach(([f, g, min, what]) => { const fa = f.startsWith('#') ? f : tok(f), ga = g.startsWith('#') ? g : tok(g); const r = ratio(fa, ga); check(what + ': ' + f + ' on ' + g + ' = ' + r.toFixed(2) + ':1 (needs ' + min + ')', r >= min); });
  check('focus ring (oxblood) against paper is a strong 3:1+ interface colour', ratio(tok('oxblood'), tok('paper')) >= 3);

  await b.close();
  console.log('\n' + (failures ? failures + ' check(s) FAILED' : 'ALL ACCESSIBILITY CHECKS PASSED') + '\n');
  process.exit(failures ? 1 : 0);
})();
