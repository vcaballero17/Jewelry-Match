const CHROME = require('fs').existsSync('/usr/bin/google-chrome') ? { executablePath: '/usr/bin/google-chrome' } : { channel: 'chrome' };  // use the Chrome installed on this computer
// Build your look (saved.html)
const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const BASE = 'file://' + path.resolve(__dirname, '../..') + '/';
const OUT = os.tmpdir();
let failures = 0; const problems = [];
const check = (n, ok, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok || !d ? '' : '  -> ' + d)); if (!ok) failures++; };
(async () => {
  const b = await chromium.launch({ ...CHROME, args: ['--no-sandbox'] });
  for (const w of [320, 390, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    const p = await ctx.newPage();
    p.on('console', m => { if (['error','warning'].includes(m.type())) problems.push(m.text()); });
    p.on('pageerror', e => problems.push(e.message));
    await p.goto(BASE + 'saved.html'); await p.waitForTimeout(150);
    check(`@${w} empty: hint instead of slots`, /Save a piece to start/.test(await p.textContent('.saved-section:last-child')) && (await p.locator('.look__slot').count()) === 0);

    // Save one piece per place, plus a second little-finger piece (via the real storage code)
    const ids = await p.evaluate(() => {
      const byPlace = {}; JM.jewelry.forEach(j => { (byPlace[j.placement] = byPlace[j.placement] || []).push(j.id); });
      const chosen = [byPlace['ear'][0], byPlace['neckline'][0], byPlace['little-finger'][0], byPlace['little-finger'][1]];
      chosen.forEach(id => JM.storage.toggleFavorite(id));
      return { chosen, two: byPlace['little-finger'].slice(0, 2) };
    });
    await p.reload(); await p.waitForTimeout(150);
    check(`@${w} five slots in body order`, JSON.stringify(await p.locator('.look__place').allTextContents()) === JSON.stringify(['Ear','Neckline','Across the hand','Little finger','Ankle']));
    check(`@${w} "3 of 5 places filled"`, /3 of 5 places filled/.test(await p.textContent('.look__count')));
    check(`@${w} empty slots link to filtered archive`, (await p.locator('.look__slot a[href="archive.html?placement=ankle"]').count()) === 1 && (await p.locator('.look__slot a[href="archive.html?placement=across-hand"]').count()) === 1);
    check(`@${w} choice only offered where 2+ saved`, (await p.locator('.look__choose').count()) === 1);
    const firstName = await p.locator('.look__slot', { hasText: 'Little finger' }).locator('.card__name').textContent();
    // choose the second little-finger piece with the keyboard
    const second = p.locator(`#look-little-finger-${ids.two[1]}`);
    await second.focus(); await p.keyboard.press('Space');
    await p.waitForTimeout(150);
    const afterName = await p.locator('.look__slot', { hasText: 'Little finger' }).locator('.card__name').textContent();
    check(`@${w} choosing changes the slot`, afterName !== firstName, firstName + ' / ' + afterName);
    check(`@${w} focus stays on the radio`, await p.evaluate(id => document.activeElement.id === id, `look-little-finger-${ids.two[1]}`));
    check(`@${w} announcement`, /chosen for little finger/i.test(await p.textContent('#live')));
    await p.reload(); await p.waitForTimeout(150);
    check(`@${w} choice survives reload`, (await p.locator('.look__slot', { hasText: 'Little finger' }).locator('.card__name').textContent()) === afterName);

    // un-saving the chosen piece falls back to the other one
    await p.evaluate(id => JM.storage.toggleFavorite(id), ids.two[1]);
    await p.reload(); await p.waitForTimeout(150);
    check(`@${w} unsaved choice falls back to remaining piece`, (await p.locator('.look__slot', { hasText: 'Little finger' }).locator('.card__name').textContent()) === firstName);
    check(`@${w} no radios when only one saved`, (await p.locator('.look__choose').count()) === 0);

    // corrupted / hostile stored data is ignored
    await p.evaluate(() => localStorage.setItem('jm:look:v1', JSON.stringify({ ear: 'not-a-piece', ankle: JM.jewelry[0].id, hax: '<img>' })));
    await p.reload(); await p.waitForTimeout(150);
    check(`@${w} bad stored look is ignored`, /3 of 5 places filled/.test(await p.textContent('.look__count')));
    await p.evaluate(() => localStorage.setItem('jm:look:v1', '{broken'));
    await p.reload(); await p.waitForTimeout(150);
    check(`@${w} broken JSON does not crash`, (await p.locator('.look__slot').count()) === 5);

    // removing a saved piece from the page updates the look
    const before = await p.locator('.look__slot a.card__link').count();
    await p.locator('.saved-section').nth(0).locator('button', { hasText: /remove/i }).first().click().catch(() => {});
    await p.waitForTimeout(150);
    check(`@${w} removing a saved piece empties its slot`, (await p.locator('.look__slot a.card__link').count()) === before - 1, before + ' -> ' + (await p.locator('.look__slot a.card__link').count()));
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    check(`@${w} no sideways scroll`, sw <= w, String(sw));
    if (w === 1280 || w === 390) await p.locator('.look').screenshot({ path: `${OUT}/look-${w}.png` });
    await ctx.close();
  }
  await b.close();
  console.log('\nConsole problems:', problems.length ? problems.join('\n') : 'none');
  console.log(failures || problems.length ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
  process.exit(failures || problems.length ? 1 : 0);
})();
