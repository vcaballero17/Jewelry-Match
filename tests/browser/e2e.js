const CHROME = require('fs').existsSync('/usr/bin/google-chrome') ? { executablePath: '/usr/bin/google-chrome' } : { channel: 'chrome' };  // use the Chrome installed on this computer
const path = require('path'), os = require('os');
// Browser test for the Jewelry Match quiz journey (not part of the student project).
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file://' + path.resolve(__dirname, '../..') + '/match.html';
const OUT = os.tmpdir();

let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  -> ' + detail));
  if (!ok) failures++;
}

(async () => {
  const browser = await chromium.launch({ ...CHROME, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const problems = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') problems.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', r => problems.push('requestfailed: ' + r.url()));

  await page.goto(URL);

  console.log('\nStep 1: Body map');
  check('h1 is "Body map"', (await page.textContent('h1')) === 'Body map');
  check('progress text "1 of 4"', (await page.textContent('.progress__text')).startsWith('1 of 4'));
  check('exactly one h1', (await page.locator('h1').count()) === 1);
  check('body map shows the PHOTO (loaded)', await page.evaluate(() => { const i = document.querySelector('.bodymap__photo'); return !!i && i.complete && i.naturalWidth > 0; }));
  check('5 radios + 5 hotspots', (await page.locator('input[name=placement]').count()) === 5 && (await page.locator('.hotspot').count()) === 5);
  check('Continue starts aria-disabled', (await page.getAttribute('#continue', 'aria-disabled')) === 'true');
  await page.screenshot({ path: OUT + '/s1-desktop.png', fullPage: true });

  await page.click('#continue', { force: true });
  check('Continue with no choice shows an alert and stays on step 1',
    (await page.textContent('#continue-hint')).includes('Please choose') && (await page.textContent('h1')) === 'Body map');

  // Keyboard: focus a radio and press Space.
  await page.focus('#opt-placement-little-finger');
  await page.keyboard.press('Space');
  check('Space selects the radio', await page.isChecked('#opt-placement-little-finger'));
  check('hotspot syncs to radio', (await page.getAttribute('.hotspot[data-value=little-finger]', 'aria-pressed')) === 'true');
  check('Continue becomes enabled', (await page.getAttribute('#continue', 'aria-disabled')) === null);

  // Hotspot click changes the radio.
  await page.click('.hotspot[data-value=neckline]');
  check('hotspot click checks matching radio', await page.isChecked('#opt-placement-neckline'));
  check('previous radio unchecked', !(await page.isChecked('#opt-placement-little-finger')));
  check('previous hotspot no longer pressed', (await page.getAttribute('.hotspot[data-value=little-finger]', 'aria-pressed')) === 'false');

  console.log('\nSteps 2-4 by keyboard');
  await page.focus('#continue'); await page.keyboard.press('Enter');
  check('step 2 title "Form"', (await page.textContent('h1')) === 'Form');
  check('focus moved to the heading', (await page.evaluate(() => document.activeElement.id)) === 'step-title');
  check('progress "2 of 4"', (await page.textContent('.progress__text')).startsWith('2 of 4'));
  await page.screenshot({ path: OUT + '/s2-desktop.png', fullPage: true });

  await page.click('text=Back');
  check('Back returns to step 1 and keeps neckline', (await page.textContent('h1')) === 'Body map' && await page.isChecked('#opt-placement-neckline'));
  await page.click('#continue');

  await page.focus('#opt-form-angular'); await page.keyboard.press('Space');
  await page.focus('#continue'); await page.keyboard.press('Enter');
  check('step 3 title "Material"', (await page.textContent('h1')) === 'Material');
  await page.focus('#opt-material-silver'); await page.keyboard.press('Space');
  await page.focus('#continue'); await page.keyboard.press('Enter');
  check('step 4 title "Mood"', (await page.textContent('h1')) === 'Mood');
  check('last button says See my edit', (await page.textContent('#continue')).includes('See my edit'));
  await page.focus('#opt-mood-after-dark'); await page.keyboard.press('Space');
  await page.focus('#continue'); await page.keyboard.press('Enter');

  console.log('\nResults');
  check('h1 is "Your edit"', (await page.textContent('h1')) === 'Your edit');
  await page.waitForLoadState('load');
  await page.evaluate(() => Promise.all([...document.images].map(i => (i.loading = 'eager', i.decode().catch(() => {})))));
  const imgs = await page.evaluate(() => [...document.querySelectorAll('article.result img')].map(i => i.complete && i.naturalWidth > 0));
  check('result photos loaded (4 images, none broken)', imgs.length === 4 && imgs.every(Boolean), JSON.stringify(imgs));
  check('four result cards', (await page.locator('article.result').count()) === 4);
  const first = page.locator('article.result').first();
  check('first result is Night Cross at 100%',
    (await first.locator('.result__name').textContent()) === 'Night Cross' && (await first.locator('.result__score').textContent()).includes('100%'));
  check('first card has hero class', (await first.getAttribute('class')).includes('result--hero'));

  // Displayed scores must equal the tested scoring function.
  const mismatch = await page.evaluate(() => {
    const answers = { placement: 'neckline', form: 'angular', material: 'silver', mood: 'after-dark' };
    const expected = JM.rank(answers).results;
    const cards = document.querySelectorAll('article.result');
    const bad = [];
    expected.forEach((r, i) => {
      const name = cards[i].querySelector('.result__name').textContent;
      const score = cards[i].querySelector('.result__score strong').textContent;
      const reason = cards[i].querySelector('.result__reason').textContent;
      if (name !== r.item.name || score !== r.score + '%' || reason !== r.reason) bad.push(i + ':' + name + '/' + score);
    });
    return bad;
  });
  check('every card equals JM.rank() output (name, score, reason)', mismatch.length === 0, mismatch.join(', '));

  await first.locator('summary').click();
  const bd = await first.locator('.breakdown li').allTextContents();
  check('"Why this?" shows four breakdown rows', bd.length === 4 && bd[0].includes('+40 of 40'), bd.join(' | '));
  await page.screenshot({ path: OUT + '/results-desktop.png', fullPage: true });

  console.log('\nSave and storage');
  await first.getByRole('button', { name: /Save to your edit/ }).click();
  check('header counter shows 01', (await page.textContent('[data-fav-count]')) === '01');
  check('button now offers Remove', (await first.locator('.result__actions button').textContent()).includes('Remove from your edit'));
  await page.waitForFunction(() => document.getElementById('live').textContent.length > 0, null, { timeout: 2000 }).catch(() => {});
  check('live region announced the save', (await page.textContent('#live')).includes('saved to your edit'), await page.textContent('#live'));

  await page.reload();
  check('reload restores the results screen', (await page.textContent('h1')) === 'Your edit');
  check('favorite persists after reload', (await page.textContent('[data-fav-count]')) === '01');

  // Corrupt storage must not break anything (JM-S02).
  await page.evaluate(() => { localStorage.setItem('jm:favorites:v1', '{not json'); localStorage.setItem('unrelated', 'keep me'); });
  await page.reload();
  check('corrupt favorites: page still works, counter 00', (await page.textContent('[data-fav-count]')) === '00');
  check('corrupt key cleared, unrelated key untouched',
    (await page.evaluate(() => [localStorage.getItem('jm:favorites:v1'), localStorage.getItem('unrelated')])).join('|') === '|keep me' ||
    (await page.evaluate(() => localStorage.getItem('unrelated'))) === 'keep me');

  // Start over -> step 1 with no answers.
  await page.click('text=Start over');
  check('Start over returns to step 1 with nothing selected',
    (await page.textContent('h1')) === 'Body map' && (await page.locator('input[name=placement]:checked').count()) === 0);

  console.log('\nResponsive: no horizontal overflow');
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(URL);
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    const results = [];
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    results.push(['step1', await overflow()]);
    if (width === 320 || width === 1024) await page.screenshot({ path: OUT + '/s1-' + width + '.png', fullPage: true });
    await page.click('.hotspot[data-value=ear]'); await page.click('#continue');
    results.push(['form', await overflow()]);
    await page.click('#opt-form-liquid', { force: true }); await page.click('#continue');
    results.push(['material', await overflow()]);
    await page.click('#opt-material-emerald', { force: true }); await page.click('#continue');
    results.push(['mood', await overflow()]);
    await page.click('#opt-mood-quiet', { force: true }); await page.click('#continue');
    results.push(['results', await overflow()]);
    if (width === 320 || width === 768) await page.screenshot({ path: OUT + '/results-' + width + '.png', fullPage: true });
    check(width + 'px: no overflow on any step', results.every(r => r[1] <= 0), JSON.stringify(results));
  }

  console.log('\nMobile menu at 320px');
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(URL);
  check('menu button visible, nav hidden', (await page.isVisible('.nav-toggle')) && !(await page.isVisible('#site-nav')));
  await page.click('.nav-toggle');
  check('menu opens, button says Close', (await page.isVisible('#site-nav')) && (await page.textContent('.nav-toggle')) === 'Close');
  await page.keyboard.press('Escape');
  check('Escape closes the menu', !(await page.isVisible('#site-nav')));

  console.log('\nConsole problems: ' + (problems.length ? '\n  ' + problems.join('\n  ') : 'none'));
  if (problems.length) failures++;

  await browser.close();
  console.log('\n' + (failures ? failures + ' check(s) FAILED' : 'ALL CHECKS PASSED') + '\n');
  process.exit(failures ? 1 : 0);
})();
