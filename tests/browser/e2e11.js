const CHROME = require('fs').existsSync('/usr/bin/google-chrome') ? { executablePath: '/usr/bin/google-chrome' } : { channel: 'chrome' };  // use the Chrome installed on this computer
// Sharing only ONE part of the body: "just the necklace".
const path = require('path'), os = require('os');
const BASE = 'file://' + path.resolve(__dirname, '../..') + '/';
const OUT = os.tmpdir();
const { chromium } = require('playwright');
let failures = 0; const problems = [];
const check = (n, ok, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok || !d ? '' : '  -> ' + d)); if (!ok) failures++; };
(async () => {
  const b = await chromium.launch({ ...CHROME, args: ['--no-sandbox'] });
  const watch = p => { p.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(m.text()); }); p.on('pageerror', e => problems.push(e.message)); };

  console.log('\nPath 1: quiz about a necklace -> only the necklace -> send');
  const s = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); watch(s);
  await s.goto(BASE + 'match.html');
  await s.click('.hotspot[data-value=neckline]'); await s.click('#continue');
  await s.click('#opt-form-liquid', { force: true }); await s.click('#continue');
  await s.click('#opt-material-gold', { force: true }); await s.click('#continue');
  await s.click('#opt-mood-sharp', { force: true }); await s.click('#continue');
  check('Continue points at the place they chose (neckline)', (await s.getAttribute('a.btn:has-text("Continue: build your look")', 'href')) === 'look.html#neckline');
  check('text names that place', /starting with the neckline/.test(await s.textContent('.results-next')));
  await s.click('a.btn:has-text("Continue: build your look")'); await s.waitForTimeout(200);
  check('the look starts at the neckline, not the ear', (await s.textContent('h1')) === 'Neckline');
  check('best match (Melt Collar) is already selected', await s.isChecked('#piece-melt-collar'));
  check('"Finish now" is offered', (await s.locator('#finish-now').count()) === 1);
  await s.click('#finish-now'); await s.waitForTimeout(200);
  check('goes straight to the send screen', (await s.textContent('h1')) === 'Your look' && s.url().endsWith('#done'));
  check('1 of 5 places filled', /1 of 5 places filled/.test(await s.textContent('.look__count')));
  const link = await s.inputValue('#share-link');
  check('link carries only the necklace', link.endsWith('#look-000-009-000-000-000'), link);
  check('summary shows just the piece', (await s.textContent('.share__summary')) === 'Melt Collar');

  console.log('\nFriend opens a one-piece link');
  const f = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); watch(f);
  await f.goto(link); await f.waitForTimeout(250);
  check('title says "A friend’s pick"', (await f.textContent('h1')) === 'A friend’s pick');
  check('says a friend sent a piece they like', /sent you a piece they like/.test(await f.textContent('.shared-note')));
  check('shows exactly one piece: Melt Collar', JSON.stringify(await f.locator('.look--row .card__name').allTextContents()) === JSON.stringify(['Melt Collar']));
  check('block to pass it on says "Send this piece on"', (await f.textContent('#share-heading')) === 'Send this piece on');
  check('no empty or skipped places shown', (await f.locator('.look__empty').count()) === 0);
  check('photo loads', await f.evaluate(async () => { const i = document.querySelector('.look--row img'); if (!i.complete) await new Promise(r => { i.onload = i.onerror = r; }); return i.naturalWidth > 0; }));
  await f.screenshot({ path: OUT + '/single-friend.png', fullPage: true });

  console.log('\nPath 2: send one piece straight from its page');
  const o = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); watch(o);
  await o.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const expected = { 'melt-collar': '000-009-000-000-000', 'drop-study': '006-000-000-000-000', 'kite-pinky': '000-000-000-001-000', 'green-thread': '000-000-000-000-010', 'afterimage': '000-000-012-000-000' };
  for (const [id, code] of Object.entries(expected)) {
    await o.goto(BASE + 'object.html?id=' + id); await o.waitForTimeout(150);
    check(id + ': "Send this piece" link is look.html#look-' + code, (await o.inputValue('#share-link')).endsWith('/look.html#look-' + code), await o.inputValue('#share-link'));
  }
  await o.goto(BASE + 'object.html?id=melt-collar'); await o.waitForTimeout(150);
  check('section heading is "Send this piece"', (await o.textContent('#share-heading')) === 'Send this piece');
  check('link field has an accessible label', (await o.locator('label[for=share-link]').count()) === 1);
  await o.focus('#copy-link'); await o.keyboard.press('Enter');
  await o.waitForFunction(() => document.getElementById('share-status').textContent.length > 0, null, { timeout: 3000 }).catch(() => {});
  check('Copy link gives feedback', /copied|selected/i.test(await o.textContent('#share-status')));
  const pieceLink = await o.inputValue('#share-link');
  const f2 = await (await b.newContext()).newPage(); watch(f2);
  await f2.goto(pieceLink); await f2.waitForTimeout(200);
  check('a friend opening it sees that piece', (await f2.textContent('h1')) === 'A friend’s pick' && (await f2.locator('.look--row .card__name').textContent()) === 'Melt Collar');
  await o.goto(BASE + 'object.html?id=not-a-piece'); await o.waitForTimeout(100);
  check('unknown piece still shows "Not found" (no share block)', (await o.locator('#share-link').count()) === 0);

  console.log('\n"Finish now" rules');
  const n = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); watch(n);
  await n.goto(BASE + 'look.html'); await n.waitForTimeout(150);
  await n.click('#finish-now'); await n.waitForTimeout(150);
  check('nothing chosen yet -> explains, stays on the screen', /Choose at least one piece/.test(await n.textContent('#look-hint')) && (await n.textContent('h1')) === 'Ear');
  await n.locator('label.choice', { hasText: 'Drop Study' }).click();      // chosen on screen, Continue NOT pressed
  await n.click('#finish-now'); await n.waitForTimeout(200);
  check('the piece selected on this screen is kept', (await n.textContent('h1')) === 'Your look' && /1 of 5/.test(await n.textContent('.look__count')));
  check('link has just the ear piece', (await n.inputValue('#share-link')).endsWith('#look-006-000-000-000-000'));
  await n.goto(BASE + 'look.html#ankle'); await n.waitForTimeout(150);
  check('no "Finish now" on the last place (Finish does it)', (await n.locator('#finish-now').count()) === 0 && (await n.textContent('#continue')) === 'Finish');
  await n.goto(BASE + 'look.html#done'); await n.waitForTimeout(150);
  await n.click('.look__slot:has(h2:text-is("Neckline")) button'); await n.waitForTimeout(150);
  check('"Choose" on the end screen opens that place', (await n.textContent('h1')) === 'Neckline');

  console.log('\nPhones');
  for (const w of [320, 390]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 800 } })).newPage(); watch(p);
    for (const pg of ['object.html?id=melt-collar', 'look.html#neckline', link]) {
      await p.goto(pg.startsWith('http') || pg.startsWith('file') ? pg : BASE + pg); await p.waitForTimeout(200);
      check(w + 'px ' + pg.replace(BASE, '').slice(0, 30) + ': no sideways scroll', (await p.evaluate(() => document.documentElement.scrollWidth)) <= w);
    }
  }
  await b.close();
  console.log('\nConsole problems:', problems.length ? [...new Set(problems)].join('\n') : 'none');
  console.log(failures || problems.length ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
  process.exit(failures || problems.length ? 1 : 0);
})();
