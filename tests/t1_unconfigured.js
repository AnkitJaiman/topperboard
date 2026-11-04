// Mode 1 (round 2): unconfigured — file:///home/user/topperboard/index.html with shipped (empty) config.js
const { chromium, record, newPage, errs, save, SITE } = require('./lib');
(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await page.goto(`file://${SITE}/index.html`);
  await page.waitForTimeout(500);

  const banner = await page.$eval('#topBanner', e => ({ hidden: e.hidden, text: e.textContent, vis: e.offsetHeight > 0 }));
  record('U-1', 'Setup banner visible', 'banner "Opening soon" shown', JSON.stringify(banner), !banner.hidden && banner.vis && /Opening soon/.test(banner.text));

  const k = await page.$$eval('#kpis .kpi', ks => ks.map(x => x.innerText.replace(/\s+/g, ' ')));
  record('U-2', 'KPIs empty state', '12 Categories / ₹99 Starting bid / Top 3', k.join(' | '), k.length === 3 && /^12 /.test(k[0]) && /₹99/.test(k[1]) && /Top 3/.test(k[2]));

  const throne = await page.evaluate(() => ({ h: throneH.textContent, rows: [...document.querySelectorAll('#throne .trow')].map(r => r.innerText.replace(/\s+/g, ' ')) }));
  record('U-3', 'Throne empty state', '"Every #1 spot is open"; 6 rows "Open · be the first … from ₹99"', JSON.stringify(throne), /Every #1 spot is open/.test(throne.h) && throne.rows.length === 6 && throne.rows.every(t => /Open · be the first/.test(t) && /from ₹99/.test(t)));

  const tabs = await page.$$eval('#cats .cat', bs => bs.map(b => b.dataset.cat + ':' + b.querySelector('small').textContent));
  record('U-4', 'Category tabs (12, count 0)', '12 tabs incl. gaming,d2c,music,college; no clinic; all 0', tabs.join(' '), tabs.length === 12 && tabs.every(t => /:0$/.test(t)) && !tabs.some(t => t.startsWith('clinic')) && ['gaming', 'd2c', 'music', 'college'].every(c => tabs.some(t => t.startsWith(c + ':'))));

  const pod = await page.$$eval('#podium .pc', ps => ps.map(p => p.innerText.replace(/\s+/g, ' ') + (p.querySelector('button') ? ' [btn]' : '')));
  record('U-5', 'Podium empty state', '#1 "up for grabs" + Claim #1; #2/#3 "Waiting for challengers" without buttons', pod.join(' || '), pod.length === 3 && /up for grabs/.test(pod[0]) && /Claim #1 \[btn\]/.test(pod[0]) && pod.slice(1).every(p => /Waiting for challengers/.test(p) && !/\[btn\]/.test(p)));

  const listHidden = await page.$eval('#list', e => e.hidden || getComputedStyle(e).display === 'none');
  record('U-6', 'List hidden when <4 listings', 'hidden', listHidden, listHidden);

  const chase = await page.$eval('#chase', e => e.textContent);
  record('U-7', 'Chase button empty board', 'Be the first #1 for ₹99 →', chase, chase === 'Be the first #1 for ₹99 →');

  const prev = await page.evaluate(() => [pCat.textContent, pRank.textContent, pNote.textContent, [...document.querySelectorAll('#quick button')].map(b => b.textContent)]);
  record('U-8', 'Preview empty board ₹99', '#1, top spot', JSON.stringify(prev), prev[1] === '#1' && /top spot/.test(prev[2]));

  const st = await page.evaluate(() => ({ dis: fBtn.disabled, txt: fBtn.textContent, notice: formNotice.hidden ? null : formNotice.textContent }));
  record('U-9', 'Submit disabled + notice when unconfigured', 'button disabled "Bidding opens soon"; #formNotice visible', JSON.stringify(st), st.dis && st.txt === 'Bidding opens soon' && !!st.notice);
  // Force a submit anyway (Enter in field, and programmatic requestSubmit)
  await page.fill('#fName', 'Test Co'); await page.fill('#fUrl', 'example.com'); await page.press('#fName', 'Enter');
  await page.evaluate(() => document.getElementById('form').requestSubmit());
  const e1 = await page.$eval('#fErr', e => e.textContent);
  const net0 = page._requests.filter(r => !/fonts/.test(r.url)).length;
  record('U-10', 'Forced submit unconfigured', 'no network; no payment', `fErr="${e1}" requests=${net0}`, net0 === 0);
  await page.fill('#fAmt', '500');
  const lbl = await page.evaluate(() => [fBtn.disabled, fBtn.textContent]);
  record('U-11', 'Button stays disabled/labelled after typing an amount', 'disabled "Bidding opens soon"', JSON.stringify(lbl), lbl[0] && lbl[1] === 'Bidding opens soon');

  await page.waitForTimeout(21000);
  const net = page._requests.filter(r => !/fonts/.test(r.url));
  record('U-12', 'No auto-refresh calls when unconfigured', '0 requests after 21s', net.length, net.length === 0);

  const cfgFill = await page.evaluate(() => [...document.querySelectorAll('[data-cfg-if]')].map(e => ({ k: e.dataset.cfgIf, ok: e.hidden === !window.TB_CONFIG[e.dataset.cfgIf] })));
  record('U-15', 'Config-dependent bits shown only when that setting is filled ([data-cfg-if])', 'hidden iff empty', JSON.stringify(cfgFill), cfgFill.every(x => x.ok));

  const E = errs(page);
  record('U-13', 'Console/page errors (unconfigured)', 'none', E.length ? E.join(' ; ') : 'none', E.length === 0);
  record('U-14', 'No leaked external requests', 'none', page._leaked.join(',') || 'none', page._leaked.length === 0);

  await browser.close();
  save('t1_unconfigured');
})().catch(e => { console.error(e); process.exit(1); });
