/* Simpler Home, folding filters, scroll slide-in.   node tests/browser/e2e15.js */
const path = require('path'), { chromium } = require('playwright');
const BASE = 'file://' + path.resolve(__dirname, '../..') + '/';
let bad = 0; const check = (n, ok, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok || !d ? '' : '  -> ' + d)); if (!ok) bad++; };
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  // Home: one clear path
  const h = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage();
  await h.goto(BASE + 'index.html'); await h.waitForTimeout(300);
  check('home: first screen has one big start button', (await h.locator('.hero .btn--big').count()) === 1 && await h.locator('.hero .btn--big').isVisible());
  check('home: three numbered steps', (await h.locator('.steps__item').count()) === 3);
  check('home: no quick-pick row or duplicate card grid any more', (await h.locator('.quickpick, #featured').count()) === 0);
  check('sections below the fold start offset, then settle', await (async () => {
    const before = await h.evaluate(() => document.querySelectorAll('.reveal').length);
    for (let y = 0; y <= 4000; y += 300) { await h.evaluate(v => window.scrollTo(0, v), y); await h.waitForTimeout(60); } await h.waitForTimeout(900);
    const after = await h.evaluate(() => document.querySelectorAll('.reveal:not(.is-in)').length);
    return before > 0 && after === 0;
  })());
  check('content never hidden by opacity', await h.evaluate(() => [...document.querySelectorAll('[data-reveal]')].every(e => getComputedStyle(e).opacity === '1')));
  // Reduced motion: no offset at all
  const r = await (await b.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: 'reduce' })).newPage();
  await r.goto(BASE + 'index.html'); await r.waitForTimeout(300);
  check('reduced motion: nothing is offset or animated', (await r.locator('.reveal').count()) === 0 && (await r.evaluate(() => document.getAnimations().length)) === 0);
  // Archive filters
  const a = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage();
  await a.goto(BASE + 'archive.html'); await a.waitForTimeout(300);
  check('phone: filters start folded, pieces come first', !(await a.evaluate(() => document.getElementById('filters-panel').open)) && await a.locator('article.card').first().isVisible());
  check('phone: summary says none chosen', /none chosen/.test(await a.textContent('.filters-panel__summary')));
  await a.click('.filters-panel__summary'); await a.click('#filter-placement-ear'); await a.waitForTimeout(200);
  check('phone: summary counts the active filter', /1 chosen/.test(await a.textContent('.filters-panel__summary')));
  await a.goto(BASE + 'archive.html?placement=ankle'); await a.waitForTimeout(300);
  check('phone: panel opens by itself when a filter is already on', await a.evaluate(() => document.getElementById('filters-panel').open));
  const d = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await d.goto(BASE + 'archive.html'); await d.waitForTimeout(300);
  check('desktop: filters are open and the fold control is hidden', await d.evaluate(() => document.getElementById('filters-panel').open) && !(await d.locator('.filters-panel__summary').isVisible()));
  // Quiz: invitation on the body map
  const q = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await q.goto(BASE + 'match.html'); await q.waitForTimeout(400);
  check('body map: the dots animate until a place is chosen', (await q.evaluate(() => getComputedStyle(document.querySelector('.hotspot__num')).animationName)) === 'jm-ring');
  await q.click('.hotspot[data-value=ear]'); await q.waitForTimeout(200);
  check('body map: the invitation stops once a place is chosen', (await q.evaluate(() => getComputedStyle(document.querySelector('.hotspot__num')).animationName)) === 'none');
  await b.close(); process.exit(bad ? 1 : 0);
})();
