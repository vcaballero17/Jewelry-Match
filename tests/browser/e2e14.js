/* Home mosaic and match profile.   node tests/browser/e2e14.js */
const path = require('path'), { chromium } = require('playwright');
const BASE = 'file://' + path.resolve(__dirname, '../..') + '/';
let bad = 0; const check = (n, ok, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok || !d ? '' : '  -> ' + d)); if (!ok) bad++; };
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  for (const [label, vp] of [['phone 390', { width: 390, height: 800 }], ['desktop 1280', { width: 1280, height: 900 }]]) {
    const p = await (await b.newContext({ viewport: vp })).newPage();
    await p.goto(BASE + 'index.html'); await p.waitForTimeout(400);
    const T = n => label + ': ' + n;
    check(T('mosaic has a heading and five tiles'), (await p.textContent('#mosaic-heading')) === 'Up close' && (await p.locator('.mosaic__tile').count()) === 5);
    check(T('every tile names its piece (visible text) and links to its page'), await p.evaluate(() => [...document.querySelectorAll('.mosaic__tile a')].every(a => /^JM-\d{3}\s+\S/.test(a.textContent.trim()) && /^object\.html\?id=/.test(a.getAttribute('href')))));
    check(T('tiles are not clipped sideways and the page does not scroll sideways'), await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check(T('tag text is readable: dark on paper'), await p.evaluate(() => { const t = getComputedStyle(document.querySelector('.mosaic__tag')); return t.color === 'rgb(10, 10, 10)' && t.backgroundColor === 'rgb(245, 241, 234)'; }));
    await p.locator('.mosaic__tile a').nth(1).click(); await p.waitForTimeout(300);
    check(T('a tile opens the right piece page'), (await p.textContent('h1')).trim().toLowerCase() === 'emerald fold');
    await p.context().close();
  }
  const q = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage();
  await q.goto(BASE + 'match.html#edit-ankle-organic-gold-after-dark'); await q.waitForTimeout(500);
  check('profile name on a shared edit', (await q.textContent('.profile__name')) === 'The After Dark Gold');
  check('profile line', (await q.textContent('.profile__line')) === 'Grown, not drawn. Worn at the ankle.');
  check('shared edit says "Their match profile"', (await q.textContent('.profile .meta')) === 'Their match profile');
  check('page does not scroll sideways on a phone', await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await b.close(); process.exit(bad ? 1 : 0);
})();
