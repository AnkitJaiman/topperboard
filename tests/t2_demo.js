// Mode 2 (round 2): demo — file:///home/user/topperboard/index.html?demo
const fs = require('fs');
const path = require('path');
const { chromium, record, newPage, errs, save, buildSite, SITE } = require('./lib');
const BASE = `file://${SITE}/index.html?demo`;
const inr = n => '₹' + Number(n).toLocaleString('en-IN');
const MAX = 100000;

(async () => {
  const browser = await chromium.launch();
  const allErrors = [];
  const done = p => allErrors.push(...errs(p));

  // ---------- Initial render ----------
  let { page } = await newPage(browser);
  let dialogs = 0; page.on('dialog', d => { dialogs++; d.dismiss(); });
  await page.goto(BASE); await page.waitForTimeout(400);
  const banner = await page.$eval('#topBanner', e => [e.hidden, e.textContent]);
  record('D-1', 'Demo banner says sample data', 'visible "Preview with sample data…"', JSON.stringify(banner), !banner[0] && /sample data/.test(banner[1]));
  const k = await page.$$eval('#kpis .kpi .v', vs => vs.map(v => v.textContent));
  const demoTotal = 42000 + 18500 + 9999 + 2100 + 499 + 25000 + 12000 + 15000 + 8800 + 6500 + 3100 + 5100;
  record('D-2', 'Demo KPIs', `${inr(demoTotal)} / 12 / ₹42,000`, k.join(' / '), k[0] === inr(demoTotal) && k[1] === '12' && k[2] === '₹42,000');
  const throne = await page.$$eval('#throne .trow', rs => rs.map(r => r.innerText.replace(/\s+/g, ' ').trim()));
  record('D-3', 'Throne = top 6 categories by #1 bid', 'Vidya 42k, Riya 25k, HisaabBook 15k, Desi 8.8k, Team Toofan 6.5k, Meena 5.1k', throne.join(' | '),
    throne.length === 6 && /Vidya/.test(throne[0]) && /Riya/.test(throne[1]) && /HisaabBook/.test(throne[2]) && /Desi/.test(throne[3]) && /Toofan/.test(throne[4]) && /Meena/.test(throne[5]));
  const pay = await page.evaluate(() => [fBtn.disabled, fBtn.textContent, formNotice.hidden, formNotice.textContent]);
  record('D-29', 'Demo: submit disabled with notice', 'disabled "Payments off in preview"; notice shown', JSON.stringify(pay), pay[0] && /Payments off/.test(pay[1]) && !pay[2]);

  // ---------- Tabs ----------
  const expCounts = { influencer: 2, creator: 1, gaming: 1, startup: 1, d2c: 0, music: 0, college: 0, coaching: 5, teacher: 1, fitness: 0, food: 1, local: 0 };
  let tabFails = [];
  for (const [c, n] of Object.entries(expCounts)) {
    await page.click(`#cats [data-cat="${c}"]`);
    const st = await page.evaluate(c => {
      const t = document.querySelector(`#cats [data-cat="${c}"]`);
      const firstOpen = document.querySelectorAll('#podium .pc.empty button');
      return { aria: t.getAttribute('aria-selected'), tabindex: t.tabIndex, count: t.querySelector('small').textContent, hash: location.hash, fCat: fCat.value, filled: document.querySelectorAll('#podium .pc:not(.empty)').length, empty: document.querySelectorAll('#podium .pc.empty').length, claimBtns: firstOpen.length, list: document.querySelectorAll('#list .li').length, sel: document.querySelectorAll('#cats [aria-selected="true"]').length, panel: boardPanel.getAttribute('aria-labelledby') };
    }, c);
    const ok = st.aria === 'true' && st.tabindex === 0 && st.count === String(n) && st.hash === '#' + c && st.fCat === c && st.filled === Math.min(n, 3) && st.empty === 3 - Math.min(n, 3) && st.claimBtns === (n < 3 ? 1 : 0) && st.list === Math.max(0, n - 3) && st.sel === 1 && st.panel === 'tab-' + c;
    if (!ok) tabFails.push(c + ':' + JSON.stringify(st));
  }
  record('D-4', 'Category tabs (all 12): aria-selected, roving tabindex, count, hash, fCat sync, podium/list, one Claim btn on first open slot', 'all consistent', tabFails.join(' ; ') || 'all 12 OK', tabFails.length === 0);
  // Keyboard
  await page.click('#cats [data-cat="influencer"]'); await page.focus('#tab-influencer');
  const kb = [];
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'End', 'Home', 'ArrowLeft']) { await page.keyboard.press(key); kb.push(await page.evaluate(() => document.activeElement.dataset.cat + '/' + document.querySelector('#cats [aria-selected="true"]').dataset.cat)); }
  record('R-1', 'Tabs keyboard: arrows/Home/End move selection + focus (wraps)', 'creator,gaming,creator,local,influencer,local', kb.join(','), kb.join(',') === 'creator/creator,gaming/gaming,creator/creator,local/local,influencer/influencer,local/local');
  // Form category change switches board
  await page.selectOption('#fCat', 'teacher');
  const fc = await page.evaluate(() => [document.querySelector('#cats [aria-selected="true"]').dataset.cat, location.hash, document.querySelector('#podium h3')?.textContent]);
  record('R-2', 'Changing form category switches the board', 'teacher tab, #teacher, Meena', JSON.stringify(fc), fc[0] === 'teacher' && fc[1] === '#teacher' && /Meena/.test(fc[2]));

  await page.click('#cats [data-cat="coaching"]');
  const board = await page.evaluate(() => ({
    pod: [...document.querySelectorAll('#podium .pc')].map(p => p.querySelector('h3').textContent + '=' + p.querySelector('.amt').firstChild.textContent),
    list: [...document.querySelectorAll('#list .li')].map(l => l.querySelector('.rk').textContent + ' ' + l.querySelector('b').textContent + ' ' + l.querySelector('.am').firstChild.textContent),
    locked: document.querySelector('#list .locked')?.textContent, listLinks: document.querySelectorAll('#list a').length,
  }));
  record('D-5', 'Coaching podium & list ordering', 'Vidya 42k, Shiksha 18.5k, BrightPath 9,999; #4 Gyan; #5 Pioneer; locked; no links', JSON.stringify(board),
    board.pod.join() === 'Vidya Point Academy=₹42,000,Shiksha Kendra=₹18,500,BrightPath Classes=₹9,999' && board.list.join() === '#4 Gyan Ganga Institute ₹2,100,#5 Pioneer Tutorials ₹499' && /Links unlock/.test(board.locked) && board.listLinks === 0);
  const visits = await page.$$eval('#podium a.visit', as => as.map(a => ({ href: a.getAttribute('href'), target: a.target, rel: a.rel, label: a.getAttribute('aria-label') })));
  record('D-6', 'Visit links href/target/rel', 'https://example.com/N, _blank, sponsored noopener nofollow', JSON.stringify(visits),
    visits.length === 3 && visits.every(v => /^https:\/\/example\.com\/\d$/.test(v.href) && v.target === '_blank' && v.rel.split(' ').sort().join() === 'nofollow,noopener,sponsored'));
  const popupPromise = page.context().waitForEvent('page', { timeout: 3000 }).catch(() => null);
  await page.click('#podium a.visit');
  const pop = await popupPromise;
  record('D-7', 'Visit opens new tab', 'new page', pop ? pop.url() : 'no popup', !!pop);
  if (pop) await pop.close();

  // Chase
  const chaseTxt = await page.$eval('#chase', e => e.textContent);
  await page.click('#chase'); await page.waitForTimeout(800);
  const ch = await page.evaluate(() => ({ amt: fAmt.value, cat: fCat.value, hash: location.hash, focus: document.activeElement.id, rank: pRank.textContent, inView: fName.getBoundingClientRect().top < innerHeight && fName.getBoundingClientRect().top > 0 }));
  record('D-8', 'Chase button (coaching)', '"Take #1 for ₹42,001 →"; 42001, coaching, focus name, #1, form in view', chaseTxt + ' ' + JSON.stringify(ch),
    chaseTxt === 'Take #1 for ₹42,001 →' && ch.amt === '42001' && ch.cat === 'coaching' && ch.focus === 'fName' && ch.rank === '#1' && ch.inView);
  await page.click('#cats [data-cat="fitness"]');
  const ch2 = await page.$eval('#chase', e => e.textContent + ' v=' + e.dataset.v);
  record('D-9', 'Chase button empty category', 'Be the first #1 for ₹99 → v=99', ch2, ch2 === 'Be the first #1 for ₹99 → v=99');
  // Claim
  await page.click('#cats [data-cat="creator"]');
  const claimSlots = await page.$$eval('#podium .pc.empty', ps => ps.map(p => p.className.match(/r\d/)[0] + ':' + (p.querySelector('button')?.textContent || '-')));
  await page.click('#podium .pc.empty button'); await page.waitForTimeout(400);
  const cl = await page.evaluate(() => [fAmt.value, fCat.value, pRank.textContent]);
  record('D-10', '"Claim #N" only on first open slot; prefills ₹99; preview matches label', 'creator: r2 "Claim #2", r3 no button; click -> 99/creator/#2', JSON.stringify(claimSlots) + ' ' + JSON.stringify(cl), claimSlots.join() === 'r2:Claim #2,r3:-' && cl.join() === '99,creator,#2');

  // Quick amounts
  await page.click('#cats [data-cat="coaching"]');
  const quick = await page.$$eval('#quick button', bs => bs.map(b => b.textContent + '|' + b.dataset.v));
  const qres = [];
  for (let i = 0; i < quick.length; i++) { await page.click(`#quick button:nth-child(${i + 1})`); qres.push(await page.evaluate(() => fAmt.value + '->' + pRank.textContent)); }
  record('D-11', 'Quick-amount buttons (coaching)', 'Minimum ₹99 ->#6, Top 3 ₹10,000 ->#3, 👑 #1 ₹42,001 ->#1', JSON.stringify(quick) + ' ' + qres.join(', '),
    quick.join() === 'Minimum · ₹99|99,Top 3 · ₹10,000|10000,👑 #1 · ₹42,001|42001' && qres.join() === '99->#6,10000->#3,42001->#1');

  // Rank preview math
  const coach = [42000, 18500, 9999, 2100, 499];
  const expRank = (b, a) => b.filter(x => x >= a).length + 1;
  const expect = (b, raw) => {
    const t = raw.trim();
    if (!t) return ['—', 'Enter your bid (minimum ₹99)'];
    if (!/^\d+$/.test(t)) return ['—', 'Use whole rupees only (numbers, no decimals)'];
    const a = parseInt(t, 10);
    if (a < 99) return ['—', 'Minimum bid is ₹99'];
    if (a > MAX) return ['—', 'Maximum bid is ₹1,00,000'];
    const r = expRank(b, a);
    return ['#' + r, r === 1 ? "👑 You'd hold the top spot" : r <= 3 ? `Top 3 · add ${inr(b[r - 2] - a + 1)} to move up` : `Add ${inr(b[2] - a + 1)} to enter the top 3`];
  };
  const amounts = ['98', '99', '100', '498', '499', '500', '2100', '2101', '9998', '9999', '10000', '18499', '18500', '18501', '41999', '42000', '42001', '100000', '100001', '-5', '150.5', '', '0', ' 250 ', '1e5', 'abc', '१००', '0099'];
  const mathFails = [], rows = [];
  for (const v of amounts) {
    await page.fill('#fAmt', v);
    const got = await page.evaluate(() => [fAmt.value, pRank.textContent, pNote.textContent, fBtn.textContent]);
    const e = expect(coach, got[0]);
    rows.push(`${JSON.stringify(v)}(${JSON.stringify(got[0])})=>${got[1]} "${got[2]}"`);
    if (got[1] !== e[0] || got[2] !== e[1]) mathFails.push(`${v}: got ${got[1]} "${got[2]}" exp ${e}`);
  }
  record('D-12', 'Rank preview math + amount validation (28 inputs incl. ties, #1, #1+1, MAX, MAX+1, -5, 150.5, empty, 1e5, letters, Devanagari digits, leading zeros)', 'per spec', rows.join(' ; '), mathFails.length === 0, mathFails.join(' ; '));
  // "add X" advice
  const semFails = [];
  for (const a of [99, 500, 2101, 9999, 10000, 18500, 18501, 42000]) { await page.fill('#fAmt', String(a)); const n = await page.$eval('#pNote', e => e.textContent); const m = n.match(/add ₹([\d,]+)/i); if (m) { const add = +m[1].replace(/,/g, ''); const r0 = expRank(coach, a), r1 = expRank(coach, a + add); if (/move up/.test(n) ? !(r1 < r0) : r1 > 3) semFails.push(`${a}+${add}:${r0}->${r1}`); } }
  record('D-13', '"add ₹X" advice achieves promised rank', 'verified', semFails.join(';') || 'all verified', semFails.length === 0);
  await page.fill('#fAmt', '100001');
  const over = await page.evaluate(() => [pRank.textContent, pNote.textContent]);
  record('D-14', 'Preview above max', '"Maximum bid is ₹1,00,000"', JSON.stringify(over), /Maximum bid is ₹1,00,000/.test(over[1]));
  await page.fill('#fAmt', '150.5');
  const dec = await page.evaluate(() => { const [d] = validate(); return [pNote.textContent, fErr.textContent, !!d]; });
  record('D-15', 'Decimal 150.5 rejected', '"whole rupees" message; validate() fails', JSON.stringify(dec), /whole rupees/.test(dec[0]) && !dec[2]);
  await page.fill('#fAmt', ''); await page.click('#fAmt'); await page.keyboard.type('abc');
  const let1 = await page.evaluate(() => [fAmt.value, pNote.textContent]);
  record('D-16', 'Letters in bid field', 'rejected with message', JSON.stringify(let1), /whole rupees/.test(let1[1]) || let1[0] === '');
  await page.fill('#fAmt', '1e5');
  const exp1 = await page.evaluate(() => [fAmt.value, pNote.textContent]);
  record('D-17', '"1e5"', 'rejected (not silently 1)', JSON.stringify(exp1), /whole rupees/.test(exp1[1]));
  await page.fill('#fAmt', '12345678');
  const ml = await page.$eval('#fAmt', e => e.value);
  record('R-3', 'Bid field maxlength 6', 'cannot exceed 6 digits', ml, ml.length <= 6);

  // Ties + MAX edges
  const tie = await page.evaluate(() => {
    all = [{ category: 'local', name: 'A', url: 'https://a.in', tagline: '', amount: 500, t: 1 }, { category: 'local', name: 'B', url: 'https://b.in', tagline: '', amount: 500, t: 2 }, { category: 'local', name: 'C', url: 'https://c.in', tagline: '', amount: 300, t: 3 }, { category: 'local', name: 'D', url: 'https://d.in', tagline: '', amount: 300, t: 4 }, { category: 'local', name: 'E', url: 'https://e.in', tagline: '', amount: 200, t: 5 }];
    cat = 'local'; render();
    const out = {};
    for (const v of [500, 501, 300, 301]) { fAmt.value = v; preview(); out[v] = pRank.textContent + ' ' + pNote.textContent; }
    out.order = [...document.querySelectorAll('#podium h3')].map(h => h.textContent).join('');
    return out;
  });
  record('D-18', 'Ties', '500->#3 add ₹1; 501->#1; 300->#5 add ₹1; 301->#3; order ABC', JSON.stringify(tie),
    tie[500].startsWith('#3 Top 3 · add ₹1') && tie[501].startsWith('#1') && tie[300] === '#5 Add ₹1 to enter the top 3' && tie[301].startsWith('#3') && tie.order === 'ABC');
  const mx = await page.evaluate(() => { all = [{ category: 'local', name: 'Max', url: 'https://a.in', tagline: '', amount: 100000, t: 1 }]; render(); fAmt.value = '100000'; preview(); return [chase.textContent, chase.disabled, [...document.querySelectorAll('#quick button')].map(b => b.textContent).join(' / '), pRank.textContent, pNote.textContent]; });
  record('D-19', '#1 already at MAX', 'chase disabled "#1 is at the maximum bid"; no quick > MAX', JSON.stringify(mx), mx[1] === true && /maximum/.test(mx[0]) && !/1,00,001/.test(mx.join()),
    'Note: at ₹1,00,000 the preview says "#2 · add ₹1 to move up" -> ₹1,00,001 which is impossible');
  record('R-4', 'Preview when #1 is at MAX and you bid MAX', 'no impossible "add ₹1" advice (e.g. "#1 is at the maximum; you would be #2")', mx[3] + ' ' + mx[4], !/add ₹1 to move up/.test(mx[4]), 'preview() L495 suggests add ₹1 -> ₹1,00,001 which validate() rejects');
  const emo = await page.evaluate(() => { all = [{ category: 'local', name: '🔥 Fit Club', url: 'https://a.in', tagline: '', amount: 999, t: 1 }]; render(); return document.querySelector('#podium .av').textContent; });
  record('D-20', 'Avatar initial for emoji-first name', '🔥', emo, emo === '🔥');
  const en = await page.evaluate(() => { all = [{ category: 'local', name: '', url: 'https://a.in', tagline: '', amount: 999, t: 1 }]; try { render(); return 'ok:' + document.querySelector('#podium .av').textContent } catch (e) { return String(e) } });
  record('D-21', 'Render with empty name row', 'no crash ("?")', en, en === 'ok:?');

  // XSS
  const xss = await page.evaluate(() => {
    window.__xss = 0;
    const P = '<img src=x onerror="window.__xss++">';
    all = [
      { category: 'local', name: P, url: 'javascript:window.__xss++', tagline: P, amount: 9000, t: 1 },
      { category: 'local', name: '"onmouseover="window.__xss++" x="', url: 'https://e.com/"onmouseover="window.__xss++"', tagline: "'onmouseover='window.__xss++'", amount: 8000, t: 2 },
      { category: 'local', name: '</script><script>window.__xss++</script>', url: ' JAVASCRIPT:window.__xss++', tagline: '<svg onload=window.__xss++>', amount: 7000, t: 3 },
      { category: 'local', name: P + 'L', url: 'data:text/html,<script>parent.__xss++</script>', tagline: P, amount: 600, t: 4 },
    ];
    cat = 'local'; render();
    return { hrefs: [...document.querySelectorAll('#podium a.visit')].map(x => x.getAttribute('href')), imgs: document.querySelectorAll('#podium img,#list img,#throne img,#podium svg,#list svg').length, attrs: [...document.querySelectorAll('#podium *,#list *,#throne *,#cats *')].filter(e => [...e.attributes].some(at => /^on/i.test(at.name))).length, labels: [...document.querySelectorAll('#podium a.visit')].map(a => a.getAttribute('aria-label')) };
  });
  await page.hover('#podium .pc.r2 h3').catch(() => { }); await page.hover('#podium .pc.r2 a.visit').catch(() => { });
  await page.waitForTimeout(400);
  const xcount = await page.evaluate(() => window.__xss);
  record('D-22', 'XSS: names/taglines/urls (incl. aria-label) via all[] + render()', 'no exec/injection; javascript:/data: -> #', JSON.stringify(xss) + ' __xss=' + xcount + ' dialogs=' + dialogs,
    xcount === 0 && dialogs === 0 && xss.imgs === 0 && xss.attrs === 0 && xss.hrefs[0] === '#' && xss.hrefs[2] === '#');

  // Modal behaviour (open via app's own openModal)
  await page.click('#fName');
  await page.evaluate(() => openModal(document.getElementById('upiModal')));
  const f1 = await page.evaluate(() => document.activeElement.closest('#upiModal') !== null);
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
  const f2 = await page.evaluate(() => document.activeElement.closest('#upiModal') !== null);
  await page.keyboard.press('Shift+Tab'); const f3 = await page.evaluate(() => document.activeElement.closest('#upiModal') !== null);
  await page.keyboard.press('Escape');
  const esc1 = await page.evaluate(() => [upiModal.classList.contains('open'), document.activeElement.id]);
  await page.evaluate(() => openModal(document.getElementById('upiModal')));
  await page.mouse.click(5, 5);
  const esc2 = await page.$eval('#upiModal', m => m.classList.contains('open'));
  record('D-33', 'Modal: focus moves in, Tab trapped, Esc closes + restores focus, backdrop closes', 'all true', JSON.stringify({ focusIn: f1, trapTab: f2, trapShiftTab: f3, afterEsc: esc1, openAfterBackdrop: esc2 }), f1 && f2 && f3 && !esc1[0] && esc1[1] === 'fName' && !esc2);
  done(page); await page.context().close();

  // ---------- Hash deep links ----------
  const hashCases = [['#coaching', 'coaching'], ['#zzz', 'influencer'], ['#bid', 'influencer'], ['#Coaching', 'influencer'], ['#food', 'food'], ['#d2c', 'd2c'], ['#clinic', 'influencer']];
  for (const [h, expCat] of hashCases) {
    ({ page } = await newPage(browser));
    await page.goto(BASE + h); await page.waitForTimeout(400);
    const st = await page.evaluate(() => ({ on: document.querySelector('#cats [aria-selected="true"]').dataset.cat, fCat: fCat.value, pCat: pCat.textContent }));
    record('D-23' + h, `Hash deep link ${h}`, `tab, form & preview = ${expCat}`, JSON.stringify(st) + (errs(page).length ? ' ERR ' + errs(page).join(';') : ''), st.on === expCat && st.fCat === expCat && errs(page).length === 0);
    done(page); await page.context().close();
  }
  // Malformed percent-encoding in hash
  for (const h of ['#%E0%A4%A', '#%']) {
    ({ page } = await newPage(browser));
    await page.goto(BASE + h); await page.waitForTimeout(400);
    const st = await page.evaluate(() => ({ tabs: document.querySelectorAll('#cats .cat').length, kpis: document.querySelector('#kpis').textContent.trim().slice(0, 30) }));
    record('R-5' + h, `Malformed hash ${h} (e.g. truncated shared link)`, 'page renders normally, default category', JSON.stringify(st) + ' errors: ' + (errs(page).join(' ; ') || 'none'), st.tabs === 12 && errs(page).length === 0,
      'fromHash() calls decodeURIComponent() at top level (L405-406); URIError aborts the whole script -> empty page (no tabs, KPIs, form). Wrap in try/catch.');
    await page.context().close();
  }
  // hashchange
  ({ page } = await newPage(browser));
  await page.goto(BASE); await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = 'coaching'; }); await page.waitForTimeout(300);
  const hc = await page.evaluate(() => [document.querySelector('#cats [aria-selected="true"]').dataset.cat, fCat.value]);
  await page.goBack(); await page.waitForTimeout(300);
  const hb = await page.evaluate(() => document.querySelector('#cats [aria-selected="true"]').dataset.cat);
  record('D-24', 'Hash change after load + Back button', 'switches to coaching (tab+form); Back -> influencer', JSON.stringify(hc) + ' back=' + hb, hc.join() === 'coaching,coaching' && hb === 'influencer');
  done(page); await page.context().close();

  // ---------- Nav anchors ----------
  ({ page } = await newPage(browser));
  await page.goto(BASE); await page.waitForTimeout(300);
  const navRes = [];
  for (const sel of ['.nav ul a[href="#boards"]', '.nav ul a[href="#how"]', '.nav ul a[href="#faq"]', '.nav ul a[href="#about"]', '.nav > a.btn[href="#bid"]', '.cta-band a[href="#bid"]']) {
    await page.click(sel); await page.waitForTimeout(1200);
    navRes.push(await page.evaluate(sel => { const id = document.querySelector(sel).getAttribute('href').slice(1); const h2 = document.querySelector('#' + id + ' h2'); return { id, hash: location.hash, h2top: Math.round(h2.getBoundingClientRect().top), headerBottom: Math.round(document.querySelector('header').getBoundingClientRect().bottom) }; }, sel));
  }
  record('D-25', 'Nav/CTA anchors: heading visible below sticky header', 'h2top >= header bottom', JSON.stringify(navRes), navRes.every(r => r.hash === '#' + r.id && r.h2top >= r.headerBottom));
  await page.click('.logo'); await page.waitForTimeout(1200);
  const top = await page.evaluate(() => [Math.round(scrollY), location.hash]);
  record('D-26', 'Logo link (#top) scrolls to top', 'scrollY ~0', JSON.stringify(top), top[0] <= 80);
  const faq = await page.evaluate(() => document.querySelectorAll('#faq details').length);
  const fr = [];
  for (let i = 1; i <= faq; i++) {
    await page.click(`#faq details:nth-of-type(${i}) summary`); const o1 = await page.$eval(`#faq details:nth-of-type(${i})`, d => d.open);
    await page.click(`#faq details:nth-of-type(${i}) summary`); const o2 = await page.$eval(`#faq details:nth-of-type(${i})`, d => d.open);
    fr.push(o1 && !o2);
  }
  const faqLinks = await page.$$eval('#faq a', as => as.map(a => a.getAttribute('href')));
  record('D-27', 'FAQ accordions', 'all toggle; links resolve', faq + ' ' + JSON.stringify(fr) + ' links ' + faqLinks, faq >= 6 && fr.every(Boolean) && faqLinks.every(l => l.startsWith('#') || fs.existsSync(path.join(SITE, l.split('#')[0]))));
  const yr = await page.$eval('#yr', e => e.textContent);
  record('D-28', 'Footer year', String(new Date().getFullYear()), yr, yr === String(new Date().getFullYear()));
  const repLink = await page.$eval('footer a[data-cfg-mail]', a => [a.getAttribute('href'), a.textContent]);
  record('R-6', 'Footer "Report a listing" with empty EMAIL', 'not a dead link (hidden or explains)', JSON.stringify(repLink), repLink[0] !== null || !/Report/.test(repLink[1]), 'with EMAIL="" the anchor has no href: looks like a link but does nothing (config-dependent; fine once EMAIL is filled)');

  // Validation matrix (call validate() directly; button is disabled in demo)
  const V = [
    ['', 'x.com', '500', 'Please enter a name or brand'], ['   ', 'x.com', '500', 'Please enter a name or brand'], ['A', '', '500', 'Please enter a valid web link starting with https://'],
    ['A', 'abc', '500', 'Please enter a valid web link starting with https://'], ['A', 'http://localhost', '500', 'Please enter a valid web link starting with https://'], ['A', 'javascript:alert(1)', '500', 'Please enter a web link (https://…), not an email, phone or app link'],
    ['A', 'insta gram.com', '500', 'Please enter a valid web link starting with https://'], ['A', 'x.com', '98', 'Minimum bid is ₹99'], ['A', 'x.com', '100001', 'Maximum bid is ₹1,00,000'],
    ['A', 'x.com', '-1', 'Use whole rupees only (numbers, no decimals)'], ['A', 'x.com', '', 'Enter your bid (minimum ₹99)'], ['A', 'x.com', '100000', 'VALID'], ['A', 'HTTPS://X.COM', '99', 'VALID'],
    ['A', 'ftp://files.example.com', '99', 'Please enter a web link (https://…), not an email, phone or app link'], ['A', 'https://x', '99', 'Please enter a valid web link starting with https://'],
    ['A', 'mailto:a@b.com', '99', 'Please enter a web link (https://…), not an email, phone or app link'], ['A', 'instagram.com/x', '99', 'VALID'],
  ];
  const vf = [];
  for (const [n, u, a, exp] of V) {
    await page.fill('#fName', n); await page.fill('#fUrl', u); await page.fill('#fAmt', a);
    const r = await page.evaluate(() => { const [d] = validate(); return { e: fErr.textContent, url: d && d.url, inv: document.querySelector('[aria-invalid="true"]')?.id || null }; });
    const got = r.e || 'VALID';
    if (got !== exp) vf.push(`${JSON.stringify([n, u, a])}: got "${got}" (url=${r.url}) exp "${exp}"`);
  }
  record('D-30', 'Form validation matrix (17 cases)', 'messages per rule', vf.join(' ; ') || 'all as expected', vf.length === 0);
  await page.fill('#fName', ''); await page.fill('#fUrl', 'x.com'); await page.fill('#fAmt', '200');
  const inv = await page.evaluate(() => { validate(); return [document.activeElement.id, fName.getAttribute('aria-invalid')]; });
  record('R-7', 'Invalid field gets focus + aria-invalid', 'fName,true', JSON.stringify(inv), inv.join() === 'fName,true');
  await page.fill('#fName', 'A'); await page.fill('#fUrl', 'a'.repeat(295) + '.com'); await page.fill('#fAmt', '99');
  const lr = await page.evaluate(() => { const [d] = validate(); return [fErr.textContent || 'VALID', d && d.url.length]; });
  record('D-31', 'URL >300 after https:// prefix', 'rejected client-side', JSON.stringify(lr), lr[0] !== 'VALID');
  await page.fill('#fName', 'x'.repeat(45));
  const nmv = await page.$eval('#fName', e => e.value.length);
  record('D-32', 'Name maxlength 40', '<=40', nmv, nmv <= 40);
  done(page); await page.context().close();

  // ---------- Mobile ----------
  ({ page } = await newPage(browser, { viewport: { width: 375, height: 740 } }));
  await page.goto(BASE); await page.waitForTimeout(300);
  const mob = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, navVisible: getComputedStyle(document.querySelector('.nav ul')).display !== 'none', mnav: (()=>{const m=document.querySelector('.mnav');return !!m&&getComputedStyle(m).display!=='none'&&['#boards','#how','#faq'].every(h=>m.querySelector(`a[href="${h}"]`))})(), footerHasHowFaq: [...document.querySelectorAll('footer a')].map(a => a.getAttribute('href')).filter(h => ['#boards', '#how', '#faq'].includes(h)) }));
  record('D-34', 'Mobile 375px: no h-scroll; way to reach Leaderboards/How/FAQ', 'scrollWidth<=375 and nav reachable', JSON.stringify(mob), mob.sw <= 375 && (mob.navVisible || mob.mnav || mob.footerHasHowFaq.length === 3), '.nav ul still display:none <760px; no menu (L67)');
  done(page); await page.context().close();

  // ---------- Legal pages (shipped empty config + filled config copy) ----------
  const CFG = { LEGAL_NAME: 'Test Legal Pvt Ltd', CITY: 'Dehradun', ADDRESS: '12 Test Road, Dehradun 248001', EMAIL: 'help@test.in', PHONE: '+91 90000 00000', WHATSAPP: '919000000000', GRIEVANCE_OFFICER: 'Asha Test', GSTIN: '05ABCDE1234F1Z5' };
  const filledBase = buildSite('site_filled', CFG).replace('index.html', '');
  for (const [label, base] of [['empty-config', `file://${SITE}/`], ['filled-config', filledBase]]) {
    ({ page } = await newPage(browser));
    const res = [];
    for (const f of ['terms.html', 'privacy.html', 'refund.html', 'contact.html']) {
      await page.goto(base + f); await page.waitForTimeout(150);
      const info = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')), tba: (document.body.innerText.match(/\[to be added\]/g) || []).length, ph: document.body.innerHTML.includes('YOUR_EMAIL'), deadMail: [...document.querySelectorAll('a[data-cfg-mail]')].filter(a => !a.getAttribute('href')).length, mails: [...document.querySelectorAll('a[href^="mailto:"]')].map(a => a.getAttribute('href')), cfgText: [...document.querySelectorAll('[data-cfg]')].filter(e => !e.closest('[hidden]')).map(e => e.textContent) }));
      const dir = base.replace('file://', '');
      info.broken = info.links.filter(l => !/^(mailto:|https?:|#|tel:)/.test(l)).filter(l => !fs.existsSync(path.join(dir, l.split('#')[0])));
      res.push(f + ':' + JSON.stringify({ h1: info.h1, broken: info.broken, tba: info.tba, ph: info.ph, deadMail: info.deadMail, mails: [...new Set(info.mails)], cfg: [...new Set(info.cfgText)] }));
      if (label === 'empty-config') record(`D-35-${f}`, `Legal ${f} loads, links resolve`, 'h1, 0 broken', `h1="${info.h1}" broken=${JSON.stringify(info.broken)}`, !!info.h1 && info.broken.length === 0);
      if (label === 'filled-config') record(`R-8-${f}`, `Legal ${f} with filled config.js`, 'no "[to be added]", mailto:help@test.in, values shown', `tba=${info.tba} mails=${[...new Set(info.mails)]} cfg=${[...new Set(info.cfgText)].join('|')} errors=${errs(page).join(';') || 'none'}`, info.tba === 0 && !info.ph && info.deadMail === 0 && info.mails.length > 0 && info.mails.every(m => m.startsWith('mailto:help@test.in')) && errs(page).length === 0);
      if (label === 'empty-config' && f === 'contact.html') record('D-36', 'Legal contact details (shipped config.js)', 'real email/name/address', `"[to be added]" x${info.tba}, ${info.deadMail} mail links without href — OWNER MUST FILL config.js`, info.tba === 0 && info.deadMail === 0);
    }
    done(page); await page.context().close();
  }
  // index with filled config: about/footer
  ({ page } = await newPage(browser));
  await page.goto(filledBase + 'index.html?demo'); await page.waitForTimeout(300);
  const ab = await page.evaluate(() => ({ about: document.querySelector('#about .about').innerText.replace(/\s+/g, ' ').slice(0, 220), rep: document.querySelector('footer a[data-cfg-mail]').getAttribute('href'), footer: document.querySelector('footer').innerText.replace(/\s+/g, ' ') }));
  record('R-9', 'index About/footer with filled config', 'operator name, city, email link; report link mailto with subject', JSON.stringify(ab), /Test Legal Pvt Ltd/.test(ab.about) && /Dehradun/.test(ab.about) && ab.rep === 'mailto:help@test.in?subject=Report%20a%20listing' && /Operated by Test Legal/.test(ab.footer));
  done(page); await page.context().close();

  const dedup = [...new Set(allErrors)];
  record('D-39', 'Console/page errors across demo-mode run', 'none', dedup.join(' ; ') || 'none', dedup.length === 0);
  await browser.close();
  save('t2_demo');
})().catch(e => { console.error(e); process.exit(1); });
