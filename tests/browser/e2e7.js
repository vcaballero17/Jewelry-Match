const CHROME = require('fs').existsSync('/usr/bin/google-chrome') ? { executablePath: '/usr/bin/google-chrome' } : { channel: 'chrome' };  // use the Chrome installed on this computer
// Compare mode on The Edit
const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const BASE = 'file://' + path.resolve(__dirname, '../..') + '/';
const OUT = os.tmpdir();
let failures = 0; const problems = [];
const check = (n, ok, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok || !d ? '' : '  -> ' + d)); if (!ok) failures++; };
(async () => {
  const b = await chromium.launch({ ...CHROME, args: ['--no-sandbox'] });
  for (const w of [320, 390, 1280]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    p.on('console', m => { if (['error','warning'].includes(m.type())) problems.push(m.text()); });
    p.on('pageerror', e => problems.push(e.message));
    await p.goto(BASE + 'archive.html'); await p.waitForTimeout(200);
    const cardOf = name => p.locator('article.card', { hasText: name });
    check(`@${w} bar hidden at start`, await p.locator('#compare-bar').isHidden());
    check(`@${w} 12 compare boxes`, (await p.locator('.compare-check input').count()) === 12);
    await cardOf('Kite Pinky').locator('.compare-check input').check();
    check(`@${w} bar shows after one tick`, await p.locator('#compare-bar').isVisible());
    check(`@${w} Compare is aria-disabled with one`, (await p.locator('#compare-bar .btn').first().getAttribute('aria-disabled')) === 'true');
    await p.locator('#compare-bar .btn').first().click({ force: true });
    check(`@${w} panel stays closed with one`, await p.locator('#compare-panel').isHidden());
    await cardOf('Orbit Signet').locator('.compare-check input').check();
    check(`@${w} Compare enabled with two`, (await p.locator('#compare-bar .btn').first().getAttribute('aria-disabled')) === null);
    await cardOf('Drop Study').locator('.compare-check input').check();
    await cardOf('Deep V').locator('.compare-check input').click();
    check(`@${w} fourth tick is blocked`, !(await cardOf('Deep V').locator('.compare-check input').isChecked()));
    await p.waitForTimeout(150);
    check(`@${w} announcement for the limit`, /up to three/i.test(await p.textContent('#live')));
    await cardOf('Drop Study').locator('.compare-check input').uncheck();
    await p.locator('#compare-bar .btn').first().click();
    check(`@${w} panel opens`, await p.locator('#compare-panel').isVisible());
    check(`@${w} focus moved to Compare heading`, await p.evaluate(() => document.activeElement.id) === 'compare-heading');
    check(`@${w} two columns + feature column`, (await p.locator('#compare-panel thead th').count()) === 3);
    check(`@${w} four feature rows`, (await p.locator('#compare-panel tbody tr').count()) === 4);
    const placementRow = await p.locator('#compare-panel tbody tr').first().textContent();
    check(`@${w} placement flagged as all the same`, /All the same/.test(placementRow) && /Little finger/.test(placementRow), placementRow);
    check(`@${w} caption names the pieces`, /Kite Pinky.*Orbit Signet/.test(await p.textContent('#compare-panel caption')));
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    check(`@${w} no sideways page scroll`, sw <= w, 'scrollWidth ' + sw);
    if (w === 1280 || w === 390) await p.screenshot({ path: `${OUT}/compare-${w}.png`, fullPage: false });
    await p.locator('#compare-panel .btn').click();
    check(`@${w} panel closes`, await p.locator('#compare-panel').isHidden());
    check(`@${w} focus returns to the bar`, await p.evaluate(() => !!document.activeElement.closest('#compare-bar')));
    await p.locator('#compare-bar .btn--ghost').click();
    check(`@${w} Clear empties everything`, (await p.locator('.compare-check input:checked').count()) === 0 && await p.locator('#compare-bar').isHidden());
    // keyboard
    await cardOf('Kite Pinky').locator('.compare-check input').focus(); await p.keyboard.press('Space');
    check(`@${w} space bar ticks a box`, await cardOf('Kite Pinky').locator('.compare-check input').isChecked());
    // selection survives a filter change
    await p.click('#filter-placement-ear');
    await p.click('#filter-placement-any');
    check(`@${w} tick survives filtering`, await cardOf('Kite Pinky').locator('.compare-check input').isChecked());
    await p.close();
  }
  await b.close();
  console.log('\nConsole problems:', problems.length ? problems.join('\n') : 'none');
  console.log(failures || problems.length ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
  process.exit(failures || problems.length ? 1 : 0);
})();
