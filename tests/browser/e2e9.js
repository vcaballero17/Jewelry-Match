const CHROME = require('fs').existsSync('/usr/bin/google-chrome') ? { executablePath: '/usr/bin/google-chrome' } : { channel: 'chrome' };  // use the Chrome installed on this computer
// Guided "Build your look" flow + continue button on the results page.
const path = require('path'), os = require('os');
const BASE = 'file://' + path.resolve(__dirname, '../..') + '/';
const OUT = os.tmpdir();
const { chromium } = require('playwright');
let failures = 0; const problems = [];
const check = (n, ok, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok || !d ? '' : '  -> ' + d)); if (!ok) failures++; };
const names = p => p.locator('.choice__label').allTextContents();
(async () => {
  const b = await chromium.launch({ ...CHROME, args: ['--no-sandbox'] });
  for (const w of [320, 390, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    const p = await ctx.newPage();
    p.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(m.text()); });
    p.on('pageerror', e => problems.push(e.message));
    const T = s => `@${w} ${s}`;

    // ---------- no quiz taken ----------
    await p.goto(BASE + 'look.html'); await p.waitForTimeout(200);
    check(T('opens on the ear'), (await p.textContent('h1')) === 'Ear');
    check(T('progress says place 1 of 5'), /Place 1 of 5/.test(await p.textContent('#progress')));
    check(T('ear shows its two pieces'), JSON.stringify((await names(p)).sort()) === JSON.stringify(['Drop Study', 'Emerald Fold']));
    check(T('nothing preselected without a quiz'), (await p.locator('input[name=look-piece]:checked').count()) === 0);
    check(T('Continue is aria-disabled'), (await p.getAttribute('#continue', 'aria-disabled')) === 'true');
    check(T('no Back button on the first place'), (await p.locator('button:text-is("Back")').count()) === 0);
    await p.click('#continue', { force: true });
    check(T('Continue with nothing chosen explains why'), /Choose a piece/.test(await p.textContent('#look-hint')) && (await p.textContent('h1')) === 'Ear');

    await p.locator('label.choice', { hasText: 'Drop Study' }).click();
    check(T('choosing enables Continue'), (await p.getAttribute('#continue', 'aria-disabled')) === null);
    await p.click('#continue'); await p.waitForTimeout(150);
    check(T('Continue moves to the neckline'), (await p.textContent('h1')) === 'Neckline' && p.url().endsWith('#neckline'));
    check(T('focus moved to the heading'), await p.evaluate(() => document.activeElement.id) === 'step-title');
    check(T('chosen piece was saved to Your Edit (header count 01)'), (await p.textContent('[data-fav-count]')) === '01');

    await p.click('button:text-is("Skip this place")'); await p.waitForTimeout(150);
    check(T('Skip moves on to across the hand'), (await p.textContent('h1')) === 'Across the hand');
    await p.click('button:text-is("Back")'); await p.waitForTimeout(150);
    check(T('Back returns to the neckline'), (await p.textContent('h1')) === 'Neckline');
    check(T('skipped neckline shows nothing selected'), (await p.locator('input[name=look-piece]:checked').count()) === 0);
    await p.goBack(); await p.waitForTimeout(150);
    check(T('browser Back button also works'), (await p.textContent('h1')) !== 'Neckline');
    await p.goto(BASE + 'look.html#across-hand'); await p.waitForTimeout(150);
    check(T('reload / direct link stays on the right place'), (await p.textContent('h1')) === 'Across the hand');

    // keyboard only: arrow keys pick, Enter continues
    await p.focus('input[name=look-piece]'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowUp');
    await p.focus('#continue'); 
    check(T('radios work with the keyboard'), (await p.locator('input[name=look-piece]:checked').count()) === 1);
    await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    check(T('Enter on Continue advances'), (await p.textContent('h1')) === 'Little finger');
    await p.locator('label.choice').first().click(); await p.click('#continue'); await p.waitForTimeout(150);
    check(T('last place button says Finish'), (await p.textContent('#continue')) === 'Finish');
    await p.click('button:text-is("Skip this place")'); await p.waitForTimeout(150);

    check(T('final screen is Your look'), (await p.textContent('h1')) === 'Your look' && p.url().endsWith('#done'));
    check(T('progress says look is ready'), /ready/i.test(await p.textContent('#progress')));
    check(T('summary: 3 of 5 filled'), /3 of 5 places filled/.test(await p.textContent('.look__count')));
    check(T('two skipped places say Skipped'), (await p.locator('.look__empty', { hasText: 'Skipped' }).count()) === 2);
    await p.click('.look__slot:has(h3:text-is("Neckline")) button'); await p.waitForTimeout(150);
    check(T('Choose on the final screen jumps to that place'), (await p.textContent('h1')) === 'Neckline');
    await p.goto(BASE + 'look.html#done'); await p.waitForTimeout(150);

    // Your Edit agrees
    await p.goto(BASE + 'saved.html'); await p.waitForTimeout(200);
    const savedNames = await p.locator('.look__slot .card__name').allTextContents();
    check(T('Your Edit shows the same three pieces'), savedNames.length === 3, savedNames.join(','));
    check(T('skipped neckline stays empty in Your Edit'), /Nothing saved for this place|Browse neckline/i.test(await p.locator('.look__slot:has(h3:text-is("Neckline"))').textContent()));
    check(T('Your Edit links to the guided flow'), (await p.locator('a[href="look.html#ear"]').count()) >= 1);

    // Start again clears
    await p.goto(BASE + 'look.html#done'); await p.waitForTimeout(150);
    await p.click('button:text-is("Start a new look")'); await p.waitForTimeout(150);
    check(T('Start a new look returns to the ear'), (await p.textContent('h1')) === 'Ear');
    const stored = await p.evaluate(() => JM.storage.getLook());
    check(T('Start a new look clears the look'), Object.keys(stored).length === 0, JSON.stringify(stored));

    // ---------- with a quiz result ----------
    await p.goto(BASE + 'match.html#edit-ankle-delicate-emerald-romantic'); await p.waitForTimeout(250);
    check(T('shared view has no Continue (it is a friend\'s edit)'), (await p.locator('a[href="look.html#ear"]').count()) === 0);
    await p.click('text=Find my own match'); await p.waitForTimeout(150);
    await p.evaluate(() => JM.storage.saveLastMatch({ placement: 'ankle', form: 'delicate', material: 'emerald', mood: 'romantic' }, []));
    await p.goto(BASE + 'look.html#ankle'); await p.waitForTimeout(200);
    check(T('with a quiz, best match comes first and is preselected'), (await names(p))[0] === 'Green Thread' && await p.isChecked('#piece-green-thread'));
    check(T('scores are shown'), /Best match · 100% match/.test(await p.textContent('.look-flow__score')));
    await p.click('button:text-is("Back")'); await p.waitForTimeout(150);
    check(T('Back from the ankle goes to the little finger'), (await p.textContent('h1')) === 'Little finger');
    await p.goto(BASE + 'look.html#ear'); await p.waitForTimeout(150);
    check(T('first screen offers a way back to the matches'), (await p.locator('a:text-is("Back to your matches")').count()) === 1);

    // results page has the Continue button
    await p.goto(BASE + 'match.html#edit-ear-liquid-silver-quiet'); await p.waitForTimeout(150);
    await p.click('text=Find my own match'); await p.waitForTimeout(100);
    await p.evaluate(() => { JM.storage.saveProgress({ step: 4, answers: { placement: 'ear', form: 'liquid', material: 'silver', mood: 'quiet' } }); });
    await p.goto(BASE + 'match.html'); await p.waitForTimeout(250);
    check(T('results page offers "Continue: build your look"'), (await p.locator('a.btn:has-text("Continue: build your look")').count()) === 1);
    await p.click('a.btn:has-text("Continue: build your look")'); await p.waitForTimeout(200);
    check(T('it opens the guided look at the ear'), (await p.textContent('h1')) === 'Ear' && p.url().includes('look.html#ear'));

    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    check(T('no sideways scroll'), sw <= w, String(sw));
    if (w === 390 || w === 1280) { await p.screenshot({ path: `${OUT}/look-flow-${w}.png`, fullPage: true }); }
    await ctx.close();
  }
  await b.close();
  console.log('\nConsole problems:', problems.length ? problems.join('\n') : 'none');
  console.log(failures || problems.length ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
  process.exit(failures || problems.length ? 1 : 0);
})();
