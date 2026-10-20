const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
(async () => {
  const browser = await chromium.launch({channel:process.env.PW_CHANNEL || 'msedge',headless:true});
  try {
    for (const [date, variant] of [['2026-10-20T00:00:00Z','a'],['2026-10-20T14:59:59Z','a'],['2026-10-20T15:00:00Z','b'],['2026-10-22T00:00:00Z','a'],['2026-10-31T00:00:00Z','b'],['2026-11-01T00:00:00Z','a']]) {
      const page = await browser.newPage({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'});
      await page.clock.setFixedTime(new Date(date));
      await page.goto('http://127.0.0.1:4173/#home');
      const img = page.locator('.admissions-scroll img');
      assert.equal(await img.getAttribute('src'), `./assets/admissions-2027-${variant}.png`);
      await img.evaluate(i=>i.decode());
      assert.equal(await page.locator('.admissions-footer a').getAttribute('href'),await img.getAttribute('src'));
      assert(await page.locator('dialog').evaluate(d=>d.open && d.getBoundingClientRect().right <= innerWidth && d.getBoundingClientRect().bottom <= innerHeight));
      await page.locator('#admissions-hide').check();
      await page.locator('.admissions-done').click();
      await page.locator('dialog').waitFor({state:'detached'});
      await page.reload();
      assert.equal(await page.locator('dialog').count(),0);
      await page.clock.setFixedTime(new Date(Date.parse(date)+86400000));
      await page.reload();
      assert.equal(await page.locator('.admissions-scroll img').getAttribute('src'), `./assets/admissions-2027-${variant==='a'?'b':'a'}.png`);
      await page.keyboard.press('Escape');
      await page.locator('dialog').waitFor({state:'detached'});
      await page.close();
    }
    console.log('PASS: Korean midnight, month boundary, alternating posters, image links, mobile bounds, daily dismissal, and Escape');
  } finally {await browser.close();}
})();
