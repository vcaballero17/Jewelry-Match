const CHROME = require('fs').existsSync('/usr/bin/google-chrome') ? { executablePath: '/usr/bin/google-chrome' } : { channel: 'chrome' };  // use the Chrome installed on this computer
// Share-link journey: sender and friend are two separate browser profiles.
const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const BASE = 'file://' + path.resolve(__dirname, '../..') + '/';
const OUT = os.tmpdir();
let failures = 0; const problems = [];
const check = (name, ok, detail) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  -> ' + detail)); if (!ok) failures++; };
const watch = page => {
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') problems.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', r => problems.push('requestfailed: ' + r.url()));
};
const answer = async (page, p, f, m, d) => {
  await page.click(`.hotspot[data-value=${p}]`); await page.click('#continue');
  await page.click(`#opt-form-${f}`, { force: true }); await page.click('#continue');
  await page.click(`#opt-material-${m}`, { force: true }); await page.click('#continue');
  await page.click(`#opt-mood-${d}`, { force: true }); await page.click('#continue');
};

(async () => {
  const browser = await chromium.launch({ ...CHROME, args: ['--no-sandbox'] });

  console.log('\nSender');
  const senderCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await senderCtx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const sender = await senderCtx.newPage(); watch(sender);
  await sender.goto(BASE + 'match.html');
  await answer(sender, 'ear', 'liquid', 'silver', 'quiet');
  check('results shown', (await sender.textContent('h1')) === 'Your edit');
  check('share section has its own heading', (await sender.textContent('#share-heading')) === 'Send your edit');
  const link = await sender.inputValue('#share-link');
  check('link ends with #edit-ear-liquid-silver-quiet', link.endsWith('#edit-ear-liquid-silver-quiet'), link);
  check('link field has an accessible label', (await sender.locator('label[for=share-link]').count()) === 1);
  check('summary line is readable', (await sender.textContent('.share__summary')) === 'Ear · Liquid · Silver · Quiet');
  const senderNames = await sender.locator('article.result .result__name').allTextContents();
  const senderScores = await sender.locator('article.result .result__score').allTextContents();

  await sender.focus('#copy-link'); await sender.keyboard.press('Enter');
  await sender.waitForFunction(() => document.getElementById('share-status').textContent.length > 0, null, { timeout: 3000 }).catch(() => {});
  const status = await sender.textContent('#share-status');
  check('Copy link by keyboard gives feedback', /copied|selected/i.test(status), status);
  const clip = await sender.evaluate(() => navigator.clipboard.readText().catch(() => null));
  console.log('        (clipboard read: ' + (clip === null ? 'not permitted in this test browser' : clip === link ? 'matches the link' : 'DIFFERENT') + ')');
  check('clipboard, when readable, holds the exact link', clip === null || clip === link);
  await sender.screenshot({ path: OUT + '/share-sender.png', fullPage: true });

  console.log('\nFriend opens the link (separate browser profile)');
  const friendCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const friend = await friendCtx.newPage(); watch(friend);
  await friend.goto(link);
  check('h1 is "Shared edit"', (await friend.textContent('h1')) === 'Shared edit');
  check('progress says "Shared with you"', (await friend.textContent('.progress__text')) === 'Shared with you');
  check('explains whose edit it is', (await friend.textContent('.shared-note')).includes('Someone sent you their edit'));
  const friendNames = await friend.locator('article.result .result__name').allTextContents();
  const friendScores = await friend.locator('article.result .result__score').allTextContents();
  check('same four pieces in the same order', JSON.stringify(friendNames) === JSON.stringify(senderNames), friendNames.join(','));
  check('same four scores', JSON.stringify(friendScores) === JSON.stringify(senderScores));
  check('friend sees the sender\'s answers', (await friend.textContent('.answers')).includes('Liquid') && (await friend.textContent('.answers')).includes('Quiet'));
  check('no Edit choices / Start over in shared view', (await friend.getByRole('button', { name: /Edit choices|Start over/ }).count()) === 0);
  check('"Find my own match" is offered', (await friend.getByRole('button', { name: 'Find my own match' }).count()) === 1);
  check('friend\'s own storage is untouched',
    (await friend.evaluate(() => [localStorage.getItem('jm:lastMatch:v1'), sessionStorage.getItem('jm:progress:v1')])).join('|') === '|');
  check('share block on shared view offers to send it on', (await friend.textContent('#share-heading')) === 'Send this edit on');
  await friend.screenshot({ path: OUT + '/share-friend.png', fullPage: true });

  await friend.locator('article.result').first().getByRole('link', { name: /View object/ }).click();
  check('object page opens without "from=match"', !friend.url().includes('from=match'), friend.url());
  check('object page does not claim a match from the friend\'s own (empty) history', (await friend.locator('#why-heading').count()) === 0);
  await friend.goBack();
  check('Back returns to the shared edit', (await friend.textContent('h1')) === 'Shared edit');

  console.log('\nFriend takes their own quiz');
  await friend.getByRole('button', { name: 'Find my own match' }).click();
  check('Body map step 1, nothing selected', (await friend.textContent('h1')) === 'Body map' && (await friend.locator('input[name=placement]:checked').count()) === 0);
  check('the #edit link part is removed from the address', !(await friend.evaluate(() => location.hash.includes('edit-'))));
  check('focus moved to the heading', (await friend.evaluate(() => document.activeElement.id)) === 'step-title');
  await answer(friend, 'ankle', 'delicate', 'emerald', 'romantic');
  check('own results shown as "Your edit"', (await friend.textContent('h1')) === 'Your edit');
  check('own share link has the friend\'s answers', (await friend.inputValue('#share-link')).endsWith('#edit-ankle-delicate-emerald-romantic'));
  check('own result now stored', (await friend.evaluate(() => localStorage.getItem('jm:lastMatch:v1'))) !== null);

  console.log('\nA shared link must not overwrite someone\'s own saved result');
  const keeper = await (await browser.newContext()).newPage(); watch(keeper);
  await keeper.goto(BASE + 'match.html');
  await answer(keeper, 'neckline', 'angular', 'silver', 'after-dark');
  const before = await keeper.evaluate(() => localStorage.getItem('jm:lastMatch:v1'));
  await keeper.goto(link); await keeper.reload();
  check('viewing a shared edit shows the shared one', (await keeper.textContent('h1')) === 'Shared edit');
  const after = await keeper.evaluate(() => localStorage.getItem('jm:lastMatch:v1'));
  check('own last match unchanged', before === after);

  console.log('\nBad links fall back to a normal quiz');
  for (const bad of ['#edit-toe-liquid-silver-quiet', '#edit-ear-liquid', '#edit-ear-liquid-silver-quiet-extra', '#edit-<script>', '#night-cross']) {
    const p = await (await browser.newContext()).newPage(); watch(p);
    await p.goto(BASE + 'match.html' + bad.replace('<script>', '%3Cscript%3E'));
    check('"' + bad + '" -> normal Body map', (await p.textContent('h1')) === 'Body map' && (await p.locator('article.result').count()) === 0);
  }

  console.log('\nResponsive');
  for (const width of [320, 375, 768, 1280]) {
    const p = await (await browser.newContext({ viewport: { width, height: 800 } })).newPage(); watch(p);
    const rows = [];
    await p.goto(link); rows.push(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
    check(width + 'px: shared view has no sideways scroll', rows.every(r => r <= 0), JSON.stringify(rows));
    if (width === 320) await p.screenshot({ path: OUT + '/share-320.png', fullPage: true });
  }

  console.log('\nConsole problems: ' + (problems.length ? '\n  ' + [...new Set(problems)].join('\n  ') : 'none'));
  if (problems.length) failures++;
  await browser.close();
  console.log('\n' + (failures ? failures + ' check(s) FAILED' : 'ALL CHECKS PASSED') + '\n');
  process.exit(failures ? 1 : 0);
})();
