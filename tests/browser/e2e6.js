const CHROME = require('fs').existsSync('/usr/bin/google-chrome') ? { executablePath: '/usr/bin/google-chrome' } : { channel: 'chrome' };  // use the Chrome installed on this computer
// Home + About: overflow, quick pick handoff, featured cards, nav, console.
const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const BASE = 'file://' + path.resolve(__dirname, '../..') + '/';
const OUT = os.tmpdir();
let failures = 0; const problems = [];
const check = (n, ok, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok || !d ? '' : '  -> ' + d)); if (!ok) failures++; };
(async () => {
  const browser = await chromium.launch({ ...CHROME, args: ['--no-sandbox'] });
  for (const w of [320, 375, 768, 1024, 1440]) {
    for (const pg of ['index.html', 'about.html', 'match.html', 'archive.html', 'saved.html']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(pg + ': ' + m.text()); });
      page.on('pageerror', e => problems.push(pg + ': ' + e.message));
      page.on('requestfailed', r => problems.push('requestfailed: ' + r.url()));
      await page.goto(BASE + pg); await page.waitForTimeout(150);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      check(`${pg} @${w}px no sideways scroll`, sw <= w, 'scrollWidth ' + sw);
      if (pg === 'index.html' || pg === 'about.html') await page.screenshot({ path: `${OUT}/${pg.replace('.html','')}-${w}.png`, fullPage: true });
      await ctx.close();
    }
  }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(m.text()); });
  page.on('pageerror', e => problems.push(e.message));
  await page.goto(BASE + 'index.html');
  check('one h1', (await page.locator('h1').count()) === 1);

  check('footer present with AI disclosure', /AI-generated/.test(await page.textContent('.site-footer')));
  check('nav marks Home as current', (await page.locator('.site-nav [aria-current=page]').textContent()).trim() === 'Home');
  check('home has exactly one primary action to start', (await page.locator('.hero .btn--big').count()) === 1);
  await page.click('.hero .btn--big');
  await page.waitForURL(/match\.html/);
  await page.waitForTimeout(200);
  check('the start button opens the body map (step 1)', /body map/i.test(await page.textContent('h1')));
  await page.goto(BASE + 'about.html#scoring'); 
  check('about has one h1', (await page.locator('h1').count()) === 1);
  check('about has two tables with captions', (await page.locator('table caption').count()) === 2);
  const heads = await page.locator('h2').count();
  check('about h2 sections', heads === 5, String(heads));
  await browser.close();
  console.log('\nConsole problems:', problems.length ? problems.join('\n') : 'none');
  console.log(failures || problems.length ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
  process.exit(failures || problems.length ? 1 : 0);
})();
