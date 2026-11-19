/* The full-outfit view: shows on the final screen and on a friend's link.  node tests/browser/e2e13.js */
const path = require('path'), { chromium } = require('playwright');
const BASE = 'file://' + path.resolve(__dirname, '../..') + '/';
let bad = 0; const check = (n, ok, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok || !d ? '' : '  -> ' + d)); if (!ok) bad++; };
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  for (const [label, vp] of [['phone 390', { width: 390, height: 800 }], ['desktop 1280', { width: 1280, height: 900 }]]) {
    const p = await (await b.newContext({ viewport: vp })).newPage();
    await p.goto(BASE + 'look.html#look-005-007-004-002-010'); await p.waitForTimeout(900);
    const T = n => label + ': ' + n;
    check(T('outfit section has a heading'), (await p.textContent('#outfit-heading')) === 'The full outfit');
    check(T('five pieces and five lines'), (await p.locator('.outfit__piece').count()) === 5 && (await p.locator('.outfit__lines line').count()) === 5);
    check(T('each piece links to its story'), (await p.locator('.outfit__link[href^="object.html?id="]').count()) === 5);
    check(T('pieces do not overlap each other'), await p.evaluate(() => { const r = [...document.querySelectorAll('.outfit__piece')].map(e => e.getBoundingClientRect()); return r.every((a, i) => r.every((c, j) => i === j || a.bottom <= c.top + 1 || c.bottom <= a.top + 1)); }));
    check(T('pieces stay inside the photo'), await p.evaluate(() => { const f = document.querySelector('.outfit__figure').getBoundingClientRect(); return [...document.querySelectorAll('.outfit__piece')].every(e => { const r = e.getBoundingClientRect(); return r.left >= f.left && r.right <= f.right + 1 && r.bottom <= f.bottom + 1; }); }));
    check(T('page does not scroll sideways'), await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.goto(BASE + 'look.html#look-005-000-000-000-000'); await p.waitForTimeout(700);
    check(T('one piece: one callout'), (await p.locator('.outfit__piece').count()) === 1);
    await p.context().close();
  }
  // the final screen of your own look shows it too
  const q = await (await b.newContext()).newPage();
  await q.goto(BASE + 'look.html#ear'); await q.waitForTimeout(300);
  await q.locator('label.choice').first().click(); await q.click('#finish-now'); await q.waitForTimeout(700);
  check('final screen shows the outfit with one piece', (await q.locator('.outfit__piece').count()) === 1 && (await q.textContent('h1')) === 'Your look');
  await b.close(); process.exit(bad ? 1 : 0);
})();
