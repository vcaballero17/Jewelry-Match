/* Regression: "Finish now" after picking one ear piece must show ONE piece, even if
   an older look was saved on this device.   node tests/browser/e2e12.js */
const path = require('path'), { chromium } = require('playwright');
const BASE = 'file://' + path.resolve(__dirname, '../..') + '/';
let bad = 0; const check = (n, ok) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) bad++; };
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext()).newPage();
  await p.goto(BASE + 'look.html#ear');
  await p.evaluate(() => { JM.storage.setLook('ear','emerald-fold'); JM.storage.setLook('neckline','deep-v'); JM.storage.setLook('hand','vertebra-chain'); JM.storage.setLook('finger','orbit-signet'); JM.storage.setLook('ankle','green-thread'); });
  await p.goto(BASE + 'saved.html'); await p.click('a:text("Build it step by step")'); await p.waitForTimeout(300);
  check('old choices are not preselected', (await p.locator('input[name=look-piece]:checked').count()) === 0);
  await p.locator('label.choice').first().click();
  await p.click('#finish-now'); await p.waitForTimeout(300);
  check('final screen: 1 of 5 filled', /1 of 5/.test(await p.textContent('.look__count')));
  check('only one piece card', (await p.locator('.look__slot .card__name').count()) === 1);
  check('link carries one piece', /#look-\d{3}(-000){4}$/.test(await p.inputValue('#share-link')));
  await b.close(); process.exit(bad ? 1 : 0);
})();
