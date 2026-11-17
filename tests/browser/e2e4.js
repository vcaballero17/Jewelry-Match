const CHROME = require('fs').existsSync('/usr/bin/google-chrome') ? { executablePath: '/usr/bin/google-chrome' } : { channel: 'chrome' };  // use the Chrome installed on this computer
// Browser test for Stage 4: archive, object story, saved (not part of the student project).
const { chromium } = require('playwright');

const path = require('path'), os = require('os');
const BASE = 'file://' + path.resolve(__dirname, '../..') + '/';
const OUT = os.tmpdir();
let failures = 0;
const problems = [];

function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  -> ' + detail));
  if (!ok) failures++;
}
function watch(page) {
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') problems.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', r => problems.push('requestfailed: ' + r.url()));
}
const names = page => page.locator('.object-grid .card__name').allTextContents();

(async () => {
  const browser = await chromium.launch({ ...CHROME, args: ['--no-sandbox'] });
  const fresh = async (w = 1280, h = 900) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    watch(page);
    return page;
  };

  /* ---------------- ARCHIVE ---------------- */
  console.log('\nArchive');
  let page = await fresh();
  await page.goto(BASE + 'archive.html');
  check('one h1 "The Edit"', (await page.locator('h1').count()) === 1 && (await page.textContent('h1')) === 'The Edit');
  await page.waitForLoadState('load');
  await page.evaluate(() => Promise.all([...document.images].map(i => i.loading === 'lazy' ? (i.loading = 'eager', i.decode().catch(() => {})) : 0)));
  const broken = await page.evaluate(() => [...document.images].filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.src));
  check('archive: all 12 photos load', (await page.locator('.object-grid img').count()) === 12 && broken.length === 0, broken.join(','));
  check('count says 12 objects', (await page.textContent('#count')) === '12 objects');
  check('12 cards', (await page.locator('.object-grid .card').count()) === 12);
  check('4 filter fieldsets with legends', (await page.locator('fieldset.filter legend').count()) === 4);
  check('Clear all starts aria-disabled', (await page.getAttribute('#clear-all', 'aria-disabled')) === 'true');
  await page.screenshot({ path: OUT + '/archive-desktop.png', fullPage: true });

  await page.check('#filter-placement-neckline', { force: true });
  check('neckline filter -> 3 objects', (await page.textContent('#count')) === '3 objects');
  await page.check('#filter-material-gold', { force: true });
  check('neckline + gold -> Deep V, Melt Collar (collection order)', JSON.stringify(await names(page)) === JSON.stringify(['Deep V', 'Melt Collar']), JSON.stringify(await names(page)));
  check('count says 2 objects', (await page.textContent('#count')) === '2 objects');
  check('Clear all becomes enabled', (await page.getAttribute('#clear-all', 'aria-disabled')) === null);

  check('dead-end chip (After dark) is switched off', await page.isDisabled('#filter-mood-after-dark'));
  check('dead-end chip shows a count of 0', /\(0\)/.test(await page.locator('label.chip:has(#filter-mood-after-dark)').textContent()));
  check('possible chip (Sharp) is still on and shows a count', !(await page.isDisabled('#filter-mood-sharp')) && /\(1\)/.test(await page.locator('label.chip:has(#filter-mood-sharp)').textContent()));
  // A dead end can still be reached from a link, so the empty state must still work:
  await page.goto(BASE + 'archive.html?placement=neckline&material=gold&mood=after-dark');
  check('three filters with no match -> 0 objects', (await page.textContent('#count')) === '0 objects');
  const emptyText = await page.textContent('#empty');
  check('empty state names every active filter', ['Placement: Neckline', 'Material / color: Gold', 'Mood: After dark'].every(s => emptyText.includes(s)), emptyText);
  await page.screenshot({ path: OUT + '/archive-empty.png', fullPage: true });
  await page.click('#empty >> text=Clear all');
  check('Clear all in empty state restores 12', (await page.textContent('#count')) === '12 objects');
  check('every group back on "Any"', (await page.locator('input[id$="-any"]:checked').count()) === 4);

  // Keyboard: focus a chip radio and press Space.
  await page.focus('#filter-form-liquid');
  await page.keyboard.press('Space');
  check('Space on a filter chip filters (keyboard)', (await page.textContent('#count')) === '3 objects');
  await page.click('#clear-all');
  check('toolbar Clear all works', (await page.textContent('#count')) === '12 objects');

  // Save from a card
  const firstCard = page.locator('.object-grid .card').first();
  await firstCard.getByRole('button', { name: /Save/ }).click();
  check('Save on card -> header counter 01', (await page.textContent('[data-fav-count]')) === '01');
  check('button now says Remove', (await firstCard.locator('button').textContent()).includes('Remove'));

  // Query string start
  await page.goto(BASE + 'archive.html?placement=ear&mood=bogus');
  check('?placement=ear pre-selects ear', await page.isChecked('#filter-placement-ear'));
  check('invalid ?mood=bogus is ignored (stays Any)', await page.isChecked('#filter-mood-any'));
  check('2 ear objects', (await page.textContent('#count')) === '2 objects');

  /* ---------------- OBJECT STORY ---------------- */
  console.log('\nObject story');
  page = await fresh();
  await page.goto(BASE + 'object.html?id=kite-pinky');
  check('object hero photo loaded', await page.evaluate(() => { const i = document.querySelector('.object-hero img'); return !!i && i.complete && i.naturalWidth > 0 && i.alt.length > 20; }));
  check('image credit line shown', (await page.textContent('.credit')).includes('OpenAI image generation'));
  check('h1 is Kite Pinky', (await page.textContent('h1')) === 'Kite Pinky');
  check('exactly one h1', (await page.locator('h1').count()) === 1);
  check('document title updated', (await page.title()) === 'Kite Pinky — Jewelry Match');
  const facts = await page.textContent('.facts');
  check('facts show placement, material, form, mood', ['Little finger', 'Gold / yellow diamond', 'Angular', 'Sharp'].every(s => facts.includes(s)), facts);
  check('story + styling note shown', (await page.textContent('.object-story')).length > 5 && (await page.textContent('#wear-heading')) === 'How to wear it');
  check('3 related pieces as h3 cards', (await page.locator('.pair-grid .card h3.card__name').count()) === 3);
  check('no "Why it matched" without from=match', (await page.locator('#why-heading').count()) === 0);
  await page.screenshot({ path: OUT + '/object-desktop.png', fullPage: true });

  await page.getByRole('button', { name: /Save to your edit/ }).click();
  check('Save on object page -> counter 01', (await page.textContent('[data-fav-count]')) === '01');
  await page.reload();
  check('saved state persists after reload', (await page.getByRole('button', { name: /Remove from your edit/ }).count()) === 1);

  // Why it matched: user B example from the spec -> 60%
  await page.evaluate(() => localStorage.setItem('jm:lastMatch:v1', JSON.stringify({
    answers: { placement: 'little-finger', form: 'organic', material: 'yellow-stone', mood: 'romantic' },
    rankedIds: ['kite-pinky'], savedAt: new Date().toISOString()
  })));
  await page.goto(BASE + 'object.html?id=kite-pinky&from=match');
  const why = await page.textContent('#why-heading ~ p');
  check('"Why it matched" shows the spec example: 60%', why.startsWith('60% match') && why.includes('little finger placement') && !why.includes('organic'), why);

  await page.click('.pair-grid .card__link >> nth=0');
  check('clicking a related piece opens another object', (await page.locator('h1').textContent()) !== 'Kite Pinky' && page.url().includes('object.html?id='));

  await page.goto(BASE + 'object.html?id=does-not-exist');
  check('unknown id -> Not found state with links', (await page.textContent('h1')) === 'Not found' && (await page.locator('a[href="archive.html"]').count()) >= 1);
  await page.goto(BASE + 'object.html');
  check('missing id -> Not found state', (await page.textContent('h1')) === 'Not found');
  check('no Add to cart anywhere', !(await page.content()).toLowerCase().includes('add to cart'));

  /* ---------------- SAVED ---------------- */
  console.log('\nSaved');
  page = await fresh();
  await page.goto(BASE + 'saved.html');
  check('empty state "Your edit is still empty"', (await page.textContent('#saved-root')).includes('Your edit is still empty'));
  check('empty state offers both actions', (await page.locator('#saved-root a[href="match.html"]').count()) === 1 && (await page.locator('#saved-root a[href="archive.html"]').count()) === 1);
  check('says it is saved in this browser', (await page.textContent('main')).includes('Saved in this browser'));
  await page.screenshot({ path: OUT + '/saved-empty.png', fullPage: true });

  await page.evaluate(() => {
    localStorage.setItem('jm:favorites:v1', JSON.stringify(['kite-pinky', 'deep-v', 'not-a-real-id', 'deep-v']));
    localStorage.setItem('jm:lastMatch:v1', JSON.stringify({
      answers: { placement: 'neckline', form: 'angular', material: 'silver', mood: 'after-dark' },
      rankedIds: [], savedAt: new Date().toISOString()
    }));
  });
  await page.reload();
  check('latest match section shows 4 cards with % notes', (await page.locator('.saved-section').first().locator('.card__note').allTextContents()).join(',') === '100% match,45% match,40% match,40% match',
    (await page.locator('.saved-section').first().locator('.card__note').allTextContents()).join(','));
  check('invalid/duplicate favorites ignored -> 2 saved cards', (await page.locator('#saved-heading ~ .object-grid .card').count()) === 2);
  check('header counter 02', (await page.textContent('[data-fav-count]')) === '02');
  await page.screenshot({ path: OUT + '/saved-full.png', fullPage: true });

  // Remove from saved: list shrinks, focus goes to heading, counter updates.
  await page.locator('#saved-heading ~ .object-grid .card').first().getByRole('button', { name: /Remove/ }).click();
  check('removing a saved piece leaves 1 card', (await page.locator('#saved-heading ~ .object-grid .card').count()) === 1);
  check('focus moved to "Saved pieces" heading', (await page.evaluate(() => document.activeElement.id)) === 'saved-heading');
  check('counter updated to 01', (await page.textContent('[data-fav-count]')) === '01');

  // Save from the latest-match card (Night Cross) -> appears in saved list, button stays focused.
  const nightCross = page.locator('.saved-section').first().locator('.card', { hasText: 'Night Cross' });
  await nightCross.getByRole('button', { name: /Save/ }).click();
  check('saving from latest match adds to saved list', (await page.locator('#saved-heading ~ .object-grid .card').count()) === 2);
  check('the same piece\'s button now says Remove', (await nightCross.locator('button').textContent()).includes('Remove'));

  // Remove everything -> "Nothing saved yet" (a match exists)
  await page.evaluate(() => localStorage.setItem('jm:favorites:v1', '[]'));
  await page.reload();
  check('no favorites but a match -> "Nothing saved yet"', (await page.textContent('#saved-root')).includes('Nothing saved yet'));

  // Handoff to the quiz
  await page.click('text=Change my answers');
  await page.waitForURL('**/match.html');
  check('Change my answers opens quiz at step 1 pre-filled', (await page.textContent('h1')) === 'Body map' && await page.isChecked('#opt-placement-neckline'));
  await page.goto(BASE + 'saved.html');
  await page.click('text=See full results');
  await page.waitForURL('**/match.html');
  check('See full results opens the results screen', (await page.textContent('h1')) === 'Your edit' && (await page.locator('article.result').count()) === 4);

  // Corrupt storage must not break the page
  await page.goto(BASE + 'saved.html');
  await page.evaluate(() => { localStorage.setItem('jm:favorites:v1', '{broken'); localStorage.setItem('jm:lastMatch:v1', 'nope'); });
  await page.reload();
  check('corrupt storage -> empty state, no crash', (await page.textContent('#saved-root')).includes('Your edit is still empty'));

  /* ---------------- RESPONSIVE ---------------- */
  console.log('\nResponsive: no horizontal overflow');
  page = await fresh();
  await page.goto(BASE + 'saved.html');
  await page.evaluate(() => {
    localStorage.setItem('jm:favorites:v1', JSON.stringify(['vertebra-chain', 'melt-collar']));
    localStorage.setItem('jm:lastMatch:v1', JSON.stringify({ answers: { placement: 'across-hand', form: 'organic', material: 'silver', mood: 'after-dark' }, rankedIds: [], savedAt: 'x' }));
  });
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const rows = [];
    for (const url of ['archive.html', 'archive.html?placement=ear&mood=after-dark', 'object.html?id=vertebra-chain&from=match', 'object.html?id=zzz', 'saved.html']) {
      await page.goto(BASE + url);
      rows.push([url, await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)]);
    }
    check(width + 'px: no overflow on archive / empty / object / not-found / saved', rows.every(r => r[1] <= 0), JSON.stringify(rows));
    if (width === 320) {
      await page.goto(BASE + 'archive.html'); await page.screenshot({ path: OUT + '/archive-320.png', fullPage: true });
      await page.goto(BASE + 'object.html?id=vertebra-chain&from=match'); await page.screenshot({ path: OUT + '/object-320.png', fullPage: true });
    }
  }

  console.log('\nConsole problems: ' + (problems.length ? '\n  ' + [...new Set(problems)].join('\n  ') : 'none'));
  if (problems.length) failures++;
  await browser.close();
  console.log('\n' + (failures ? failures + ' check(s) FAILED' : 'ALL CHECKS PASSED') + '\n');
  process.exit(failures ? 1 : 0);
})();
