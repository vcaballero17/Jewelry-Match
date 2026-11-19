const CHROME = require('fs').existsSync('/usr/bin/google-chrome') ? { executablePath: '/usr/bin/google-chrome' } : { channel: 'chrome' };  // use the Chrome installed on this computer
// The whole journey: quiz -> look steps -> share screen -> a friend opens the link.
const path = require('path'), os = require('os');
const BASE = 'file://' + path.resolve(__dirname, '../..') + '/';
const OUT = os.tmpdir();
const { chromium } = require('playwright');
let failures = 0; const problems = [];
const check = (n, ok, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok || !d ? '' : '  -> ' + d)); if (!ok) failures++; };
const pick = async (p, name) => { await p.locator('label.choice', { hasText: name }).click(); await p.click('#continue'); await p.waitForTimeout(120); };
(async () => {
  const b = await chromium.launch({ ...CHROME, args: ['--no-sandbox'] });
  const watch = p => { p.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(m.text()); }); p.on('pageerror', e => problems.push(e.message)); };

  console.log('\nSender: quiz -> look -> share');
  const sCtx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await sCtx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const s = await sCtx.newPage(); watch(s);
  await s.goto(BASE + 'match.html');
  await s.click('.hotspot[data-value=ear]'); await s.click('#continue');
  await s.click('#opt-form-liquid', { force: true }); await s.click('#continue');
  await s.click('#opt-material-silver', { force: true }); await s.click('#continue');
  await s.click('#opt-mood-quiet', { force: true }); await s.click('#continue');
  await s.click('a.btn:has-text("Continue: build your look")'); await s.waitForTimeout(200);
  check('ear screen, best match (Drop Study) already selected', (await s.textContent('h1')) === 'Ear' && await s.isChecked('#piece-drop-study'));
  await s.click('#continue'); await s.waitForTimeout(120);                       // ear: accept the suggestion
  await pick(s, 'Melt Collar');                                                   // neckline
  await s.click('button:text-is("Skip this place")'); await s.waitForTimeout(120); // across the hand: skip
  await pick(s, 'Kite Pinky');                                                    // little finger
  await pick(s, 'Green Thread');                                                  // ankle (Finish)
  check('journey ends on one clear screen: "Your look"', (await s.textContent('h1')) === 'Your look' && s.url().endsWith('#done'));
  check('says it is the person\'s decision', /This is your decision/.test(await s.textContent('.page-intro')));
  check('share block is on that same screen', (await s.textContent('#share-heading')) === 'Send your look');
  const link = await s.inputValue('#share-link');
  check('link carries the four chosen pieces in body order', link.endsWith('#look-006-009-000-001-010'), link);
  check('summary names the pieces', (await s.textContent('.share__summary')) === 'Drop Study · Melt Collar · Kite Pinky · Green Thread');
  check('link field has an accessible label', (await s.locator('label[for=share-link]').count()) === 1);
  await s.waitForTimeout(700);   // let the fade-in animation finish before measuring positions
  check('the pieces appear in one line', await s.evaluate(() => { const t = [...document.querySelectorAll('.look--row .look__slot')].map(e => Math.round(e.getBoundingClientRect().top)); return t.length === 5 && new Set(t).size === 1; }));
  check('no "go back and repeat" button as the main choice (no Find another match)', (await s.locator('a:text-is("Find another match")').count()) === 0);
  check('"Start a new look" is available but secondary', (await s.locator('button:text-is("Start a new look")').count()) === 1);
  await s.focus('#copy-link'); await s.keyboard.press('Enter');
  await s.waitForFunction(() => document.getElementById('share-status').textContent.length > 0, null, { timeout: 3000 }).catch(() => {});
  check('Copy link by keyboard gives feedback', /copied|selected/i.test(await s.textContent('#share-status')));
  const clip = await s.evaluate(() => navigator.clipboard.readText().catch(() => null));
  check('clipboard, when readable, holds the exact link', clip === null || clip === link);
  await s.screenshot({ path: OUT + '/journey-end.png', fullPage: true });

  console.log('\nFriend opens the link (separate browser profile)');
  const fCtx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const f = await fCtx.newPage(); watch(f);
  await f.goto(link); await f.waitForTimeout(250);
  check('title says it is a friend\'s look', (await f.textContent('h1')) === 'A friend’s look');
  check('progress says "Shared with you"', (await f.textContent('.progress__text')) === 'Shared with you');
  check('explains what they are looking at', /A friend sent you their look/.test(await f.textContent('.shared-note')));
  const names = await f.locator('.look--row .card__name').allTextContents();
  check('exactly the four chosen pieces, in body order', JSON.stringify(names) === JSON.stringify(['Drop Study', 'Melt Collar', 'Kite Pinky', 'Green Thread']), names.join(','));
  check('the skipped place is not shown', (await f.locator('.look__place', { hasText: 'Across the hand' }).count()) === 0);
  await f.waitForTimeout(700);
  check('all in one line', await f.evaluate(() => { const t = [...document.querySelectorAll('.look--row .look__slot')].map(e => Math.round(e.getBoundingClientRect().top)); return t.length === 4 && new Set(t).size === 1; }));
  check('photos load', await f.evaluate(async () => { const imgs = [...document.querySelectorAll('.look--row img')]; await Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); return imgs.length === 4 && imgs.every(i => i.naturalWidth > 0); }));
  check('friend\'s own storage is untouched', await f.evaluate(() => JM.storage.getFavorites().length === 0 && Object.keys(JM.storage.getLook()).length === 0 && localStorage.getItem('jm:lastMatch:v1') === null));
  check('can pass it on', (await f.textContent('#share-heading')) === 'Send this look on');
  check('no Back / Change buttons in a friend\'s view', (await f.locator('button:text-is("Back"), button:has-text("Change")').count()) === 0);
  await f.screenshot({ path: OUT + '/journey-friend.png', fullPage: true });
  await f.locator('.look--row .card__link').nth(2).click();
  check('a piece opens its story', /object\.html\?id=kite-pinky/.test(f.url()));
  await f.goBack(); await f.waitForTimeout(200);
  check('Back returns to the friend\'s look', (await f.textContent('h1')) === 'A friend’s look');
  await f.click('button:text-is("Build my own look")'); await f.waitForTimeout(200);
  check('"Build my own look" starts at the ear', (await f.textContent('h1')) === 'Ear' && f.url().endsWith('#ear'));
  check('...and nothing was saved from the friend\'s look', await f.evaluate(() => JM.storage.getFavorites().length === 0 && Object.keys(JM.storage.getLook()).length === 0));

  console.log('\nSomeone who already started a look opens a friend\'s link, then taps "Build my own look"');
  const old = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); watch(old);
  await old.goto(BASE + 'look.html');
  await old.evaluate(() => { JM.storage.setLook('ear', 'emerald-fold'); JM.storage.setLook('neckline', 'night-cross'); JM.storage.setLook('ankle', 'none'); });
  await old.goto(link); await old.waitForTimeout(150);
  await old.reload(); await old.waitForTimeout(200);
  check('they see the friend\'s look, not their own', (await old.textContent('h1')) === 'A friend’s look');
  await old.click('button:text-is("Build my own look")'); await old.waitForTimeout(200);
  check('starts at the beginning (ear)', (await old.textContent('h1')) === 'Ear' && old.url().endsWith('#ear'));
  check('nothing from before is selected', (await old.locator('input[name=look-piece]:checked').count()) === 0);
  check('Continue is off until they choose', (await old.getAttribute('#continue', 'aria-disabled')) === 'true');
  check('earlier choices were cleared', await old.evaluate(() => Object.keys(JM.storage.getLook()).length === 0));
  await old.locator('label.choice', { hasText: 'Emerald Fold' }).click(); await old.click('#continue'); await old.waitForTimeout(150);
  check('neckline also starts empty', (await old.textContent('h1')) === 'Neckline' && (await old.locator('input[name=look-piece]:checked').count()) === 0);

  console.log('\n"Start a new look" on your own final screen does the same');
  const again = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); watch(again);
  await again.goto(link.split('#')[0]);
  await again.evaluate(() => { JM.storage.setLook('ear', 'drop-study'); JM.storage.setLook('neckline', 'melt-collar'); });
  await again.goto(link.split('#')[0] + '#done'); await again.waitForTimeout(150); await again.reload(); await again.waitForTimeout(200);
  await again.click('button:text-is("Start a new look")'); await again.waitForTimeout(200);
  check('goes to the ear with nothing selected', (await again.textContent('h1')) === 'Ear' && (await again.locator('input[name=look-piece]:checked').count()) === 0);
  check('earlier choices cleared', await again.evaluate(() => Object.keys(JM.storage.getLook()).length === 0));

  console.log('\nBroken links are explained, never guessed');
  for (const bad of ['#look-xyz', '#look-006-009-000-001', '#look-999-009-000-001-010', '#look-000-000-000-000-000', '#look-001-000-000-000-000', '#look-006-009-000-001-010-011']) {
    const p = await (await b.newContext()).newPage(); watch(p);
    await p.goto(BASE + 'look.html' + bad); await p.waitForTimeout(150);
    check('"' + bad + '" -> clear message and a way forward', (await p.textContent('h1')) === 'This link does not work' && (await p.locator('button:text-is("Build my own look")').count()) === 1 && (await p.locator('.look--row').count()) === 0);
  }

  console.log('\nSkipping everything: nothing to send');
  const e = await (await b.newContext()).newPage(); watch(e);
  await e.goto(BASE + 'look.html');
  for (let i = 0; i < 5; i++) { await e.click('button:text-is("Skip this place")'); await e.waitForTimeout(100); }
  check('all skipped -> no share link, a way back', (await e.locator('#share-link').count()) === 0 && (await e.locator('button:text-is("Choose a piece")').count()) === 1);

  console.log('\nPhones');
  for (const w of [320, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
    const p = await ctx.newPage(); watch(p);
    await p.goto(link); await p.waitForTimeout(250);
    const m = await p.evaluate(() => ({ page: document.documentElement.scrollWidth, row: document.querySelector('.look--row').scrollWidth, box: document.querySelector('.look--row').clientWidth }));
    check(w + 'px: page does not scroll sideways', m.page <= w, JSON.stringify(m));
    check(w + 'px: the line of pieces scrolls inside its own box', m.row > m.box, JSON.stringify(m));
    await p.screenshot({ path: OUT + '/journey-friend-' + w + '.png', fullPage: false });
    await ctx.close();
  }

  await b.close();
  console.log('\nConsole problems:', problems.length ? [...new Set(problems)].join('\n') : 'none');
  console.log(failures || problems.length ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
  process.exit(failures || problems.length ? 1 : 0);
})();
