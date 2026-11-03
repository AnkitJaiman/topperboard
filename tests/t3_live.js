// Mode 3 (round 2): live mode with a MOCKED backend (no real Supabase/Razorpay traffic; all non-mocked http(s) is aborted)
const fs = require('fs');
const path = require('path');
const { chromium, record, newPage, errs, save, buildSite, QA } = require('./lib');

const SB = 'https://fake.supabase.co';
const URL_SB = buildSite('live_sb', { SUPABASE_URL: SB, SUPABASE_ANON_KEY: 'anon' });
const URL_RZP = buildSite('live_rzp', { SUPABASE_URL: SB, SUPABASE_ANON_KEY: 'anon', RAZORPAY_KEY_ID: 'rzp_test_x', EMAIL: 'help@test.in' });
const URL_UPI = buildSite('live_upi', { SUPABASE_URL: SB, SUPABASE_ANON_KEY: 'anon', UPI_ID: 'test@upi' });
// Convenience copy requested by coordinator: qa/live.html (+ config.js, qrcode.js beside it) = Razorpay variant
fs.copyFileSync(path.join(QA, 'live_rzp', 'index.html'), path.join(QA, 'live.html'));
fs.copyFileSync(path.join(QA, 'live_rzp', 'config.js'), path.join(QA, 'config.js'));
fs.copyFileSync(path.join(QA, 'live_rzp', 'qrcode.js'), path.join(QA, 'qrcode.js'));

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const ROWS = [
  { id: '1', category: 'coaching', name: 'Alpha Classes', url: 'https://alpha.in', tagline: 'Top JEE', amount: 5000, paid_at: '2026-11-01T10:00:00Z' },
  { id: '2', category: 'coaching', name: 'Beta Tutorials', url: 'https://beta.in', tagline: null, amount: 3000, paid_at: '2026-11-01T11:00:00Z' },
  { id: '3', category: 'startup', name: 'Gamma App', url: 'https://gamma.app', tagline: 'Billing', amount: 1200, paid_at: '2026-11-02T09:00:00Z' },
];
const RZP_STUB = `window.__rzpLoads=(window.__rzpLoads||0)+1;
window.Razorpay=class{constructor(o){this.o=o;this.h={};window.__rzpOpts=o;}
on(e,cb){this.h[e]=cb;}
open(){window.__rzpOpened=(window.__rzpOpened||0)+1;const m=window.__rzpMode||'success';
setTimeout(()=>{if(m==='success')this.o.handler({razorpay_payment_id:'pay_TEST',razorpay_order_id:this.o.order_id,razorpay_signature:'sig'});else if(m==='dismiss')this.o.modal.ondismiss();else if(m==='failed'&&this.h['payment.failed'])this.h['payment.failed']({error:{description:'declined'}});},10);}};`;

async function mock(page, state) {
  state.gets = 0; state.posts = []; state.orders = [];
  await page.route('https://checkout.razorpay.com/v1/checkout.js', r => state.checkoutFail ? r.abort('failed') : r.fulfill({ status: 200, contentType: 'application/javascript', body: RZP_STUB }));
  await page.route(`${SB}/rest/v1/**`, async r => {
    const q = r.request();
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    if (q.method() === 'GET') {
      state.gets++; state.lastGet = { url: q.url(), headers: q.headers() };
      if (state.getMode === 'fail500') return r.fulfill({ status: 500, headers: CORS, body: '{"message":"boom"}' });
      if (state.getMode === 'network') return r.abort('failed');
      return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(state.rows || ROWS) });
    }
    if (q.method() === 'POST') {
      state.posts.push({ url: q.url(), headers: q.headers(), body: q.postData() });
      if (state.postDelay) await new Promise(res => setTimeout(res, state.postDelay));
      if (state.postMode === 'network') return r.abort('failed');
      const st = state.postStatus || 201;
      return r.fulfill({ status: st, headers: CORS, body: st === 201 ? '' : JSON.stringify({ code: '23514', message: 'new row violates check constraint' }) });
    }
    return r.fulfill({ status: 405, headers: CORS });
  });
  await page.route(`${SB}/functions/v1/create-order`, async r => {
    const q = r.request();
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    state.orders.push({ headers: q.headers(), body: q.postData() });
    if (state.orderDelay) await new Promise(res => setTimeout(res, state.orderDelay));
    const m = state.orderMode || 'ok';
    if (m === 'network') return r.abort('failed');
    if (m === 'ok') { const d = JSON.parse(q.postData()); return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ order_id: 'order_TEST1', amount: d.amount * 100, ref: 'TBREF00001' }) }); }
    if (m === '400') return r.fulfill({ status: 400, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Please enter a valid web link (max 300 characters)' }) });
    if (m === '500json') return r.fulfill({ status: 500, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Could not save listing, try again' }) });
    if (m === '500text') return r.fulfill({ status: 500, headers: CORS, body: 'Internal Server Error' });
    if (m === '401jwt') return r.fulfill({ status: 401, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ code: 401, message: 'Invalid JWT' }) });
    if (m === '200noorder') return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: '{}' });
    if (m === '502nocors') return r.fulfill({ status: 502, body: 'Bad gateway' });
  });
}

async function fillForm(page, { cat = 'coaching', name = 'Test Academy', url = 'testacademy.in', tag = 'Best tests', amt = '4000' } = {}) {
  await page.selectOption('#fCat', cat); await page.fill('#fName', name); await page.fill('#fUrl', url); await page.fill('#fTag', tag); await page.fill('#fAmt', amt);
}
const ui = page => page.evaluate(() => ({ err: fErr.textContent, btnDisabled: fBtn.disabled, btnText: fBtn.textContent, toast: document.getElementById('toast').textContent, toastShown: document.getElementById('toast').classList.contains('show'), upiOpen: upiModal.classList.contains('open'), okOpen: okModal.classList.contains('open') }));
const settle = async (page, clock, ms = 600) => { if (clock) { for (let i = 0; i < 6; i++) { await page.clock.runFor(100); await page.waitForTimeout(80); } } else await page.waitForTimeout(ms); };

(async () => {
  const browser = await chromium.launch();
  const allErr = [];

  // ===================== A. Supabase-only =====================
  {
    const { page } = await newPage(browser); const S = {}; await mock(page, S);
    await page.clock.install();
    await page.goto(URL_SB); await page.clock.runFor(500); await page.waitForTimeout(300);
    const exp = `${SB}/rest/v1/listings?select=id,category,name,url,tagline,amount,paid_at&status=eq.paid&order=amount.desc&limit=1000`;
    record('L-1', 'GET listings URL', exp, S.lastGet && S.lastGet.url, S.lastGet && S.lastGet.url === exp);
    const h = S.lastGet.headers;
    record('L-2', 'GET headers', 'apikey=anon, authorization=Bearer anon', JSON.stringify({ apikey: h.apikey, authorization: h.authorization }), h.apikey === 'anon' && h.authorization === 'Bearer anon');
    const st = await page.evaluate(() => ({ k: [...document.querySelectorAll('#kpis .kpi .v')].map(v => v.textContent), th: document.querySelector('#throne .trow').innerText.replace(/\s+/g, ' '), counts: [...document.querySelectorAll('#cats .cat small')].map(s => s.textContent).join(',') }));
    record('L-3', 'Listings & KPIs from GET', '₹9,200 / 3 / ₹5,000; throne Alpha; counts', JSON.stringify(st), st.k.join() === '₹9,200,3,₹5,000' && /Alpha Classes/.test(st.th) && st.counts === '0,0,0,1,0,0,0,2,0,0,0,0');
    await page.click('#cats [data-cat="coaching"]');
    const pod = await page.$$eval('#podium .pc', ps => ps.map(p => p.innerText.replace(/\s+/g, ' ')));
    record('L-4', 'Live board renders rows (null tagline ok)', 'Alpha ₹5,000, Beta ₹3,000, slot 3 open', pod.join(' || '), /Alpha Classes.*₹5,000/.test(pod[0]) && /Beta Tutorials.*₹3,000/.test(pod[1]) && /Spot #3 is open/.test(pod[2]) && !/null/.test(pod[1]));
    const g0 = S.gets; await page.clock.runFor(20000); await page.waitForTimeout(200);
    const g1 = S.gets; await page.clock.runFor(20000); await page.waitForTimeout(200);
    const g2 = S.gets;
    await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }));
    await page.clock.runFor(40000); await page.waitForTimeout(200);
    const g3 = S.gets;
    await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }));
    await page.evaluate(() => openModal(document.getElementById('upiModal')));
    await page.clock.runFor(40000); await page.waitForTimeout(200);
    const g4 = S.gets;
    await page.keyboard.press('Escape');
    record('L-5', 'Auto-refresh every 20s; paused when hidden or a modal is open', '+1/20s, +0 hidden, +0 modal open', `start=${g0} +20s=${g1} +40s=${g2} hidden+40s=${g3} modal+40s=${g4}`, g1 === g0 + 1 && g2 === g0 + 2 && g3 === g2 && g4 === g3);
    await page.fill('#fName', 'Typing...'); await page.fill('#fAmt', '777');
    S.rows = [...ROWS, { id: '4', category: 'coaching', name: 'Delta', url: 'https://delta.in', tagline: '', amount: 9000, paid_at: '2026-11-03T00:00:00Z' }];
    await page.clock.runFor(20000); await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({ top: document.querySelector('#podium h3').textContent, name: fName.value, amt: fAmt.value, rank: pRank.textContent }));
    record('L-6', 'Auto-refresh picks up new listing & keeps input', 'Delta #1; inputs kept; 777 -> #4', JSON.stringify(after), after.top === 'Delta' && after.name === 'Typing...' && after.amt === '777' && after.rank === '#4');
    S.getMode = 'fail500'; await page.clock.runFor(20000); await page.waitForTimeout(200);
    const stale = await page.evaluate(() => [document.querySelector('#podium h3')?.textContent, document.querySelectorAll('#kpis .kpi .v')[1].textContent, !loadErr.hidden]);
    record('L-7', 'GET 500 after data loaded', 'keeps data; shows load-error notice', JSON.stringify(stale), stale[0] === 'Delta' && stale[1] === '4' && stale[2] === true);
    S.getMode = null;
    const sbOnly = await page.evaluate(() => ({ banner: topBanner.hidden ? null : topBanner.textContent, btn: [fBtn.disabled, fBtn.textContent], notice: formNotice.hidden ? null : formNotice.textContent }));
    record('L-8', 'Supabase set but no RAZORPAY_KEY_ID/UPI_ID', 'banner + disabled button + notice; no POST', JSON.stringify(sbOnly) + ' posts=' + S.posts.length, !!sbOnly.banner && sbOnly.btn[0] && !!sbOnly.notice && S.posts.length === 0);
    allErr.push(...errs(page).filter(e => !/load failed|500/.test(e)));
    await page.context().close();
  }

  // Initial GET fails, then Retry
  for (const mode of ['fail500', 'network']) {
    const { page } = await newPage(browser); const S = { getMode: mode }; await mock(page, S);
    await page.goto(URL_UPI); await page.waitForTimeout(800);
    const st = await page.evaluate(() => ({ err: loadErr.hidden ? null : loadErr.innerText.trim(), podium: document.querySelector('#podium .pc').innerText.replace(/\s+/g, ' '), chase: [chase.textContent, chase.disabled], claimBtns: document.querySelectorAll('#podium button').length, pNote: pNote.textContent, k: document.querySelector('#kpis').innerText.replace(/\s+/g, ' ') }));
    record('L-10-' + mode, `Initial GET failure (${mode})`, 'alert + Retry; no "open spot/₹99" claims; chase disabled', JSON.stringify(st), !!st.err && /Loading/.test(st.podium) && st.chase[1] === true && st.claimBtns === 0);
    await fillForm(page); await page.click('#fBtn'); await page.waitForTimeout(600);
    const u = await ui(page);
    record('L-10b-' + mode, 'Submit while rankings failed to load', 'blocked with message; no POST', JSON.stringify({ err: u.err, btn: u.btnDisabled }) + ' posts=' + S.posts.length, /couldn't load the latest rankings/.test(u.err) && !u.btnDisabled && S.posts.length === 0);
    S.getMode = null; await page.click('#retry'); await page.waitForTimeout(600);
    const r = await page.evaluate(() => [loadErr.hidden, document.querySelector('#cats [data-cat="coaching"] small').textContent]);
    record('L-10c-' + mode, 'Retry button reloads', 'error hidden; data shown', JSON.stringify(r), r[0] === true && r[1] === '2');
    await page.context().close();
  }

  // Tie-break with paid_at NULL
  {
    const { page } = await newPage(browser); const S = {}; await mock(page, S);
    S.rows = [
      { id: 'a', category: 'local', name: 'Early Razorpay', url: 'https://a.in', tagline: '', amount: 500, paid_at: '2026-11-01T10:00:00Z' },
      { id: 'b', category: 'local', name: 'Later UPI (paid_at null)', url: 'https://b.in', tagline: '', amount: 500, paid_at: null },
    ];
    await page.goto(URL_SB + '#local'); await page.waitForTimeout(600);
    const order = await page.$$eval('#podium h3', hs => hs.map(h => h.textContent));
    record('L-11', 'Tie-break with paid_at NULL (frontend)', 'earlier payment first (NULL should not win)', JSON.stringify(order), order[0] === 'Early Razorpay',
      'Root cause fixed in DB (trigger stamps paid_at), but frontend still maps NULL -> t=0 (wins ties). Defensive: use Infinity.');
    await page.context().close();
  }

  // ===================== B. UPI =====================
  {
    const { page } = await newPage(browser); const S = {}; await mock(page, S);
    await page.goto(URL_UPI); await page.waitForTimeout(500);
    const upiTxt = await page.evaluate(() => [payMethods.textContent, pLive.textContent, topBanner.hidden, fBtn.disabled]);
    record('R-10', 'UPI mode copy', 'UPI pay methods + manual verification note; no banner; enabled', JSON.stringify(upiTxt), /UPI/.test(upiTxt[0]) && /verify/.test(upiTxt[1]) && upiTxt[2] && !upiTxt[3]);
    await page.click('#cats [data-cat="coaching"]');
    await fillForm(page, { tag: '', amt: '4000' });
    const lbl = await page.$eval('#fBtn', b => b.textContent);
    const g0 = S.gets;
    await page.click('#fBtn'); await page.waitForTimeout(700);
    const p = S.posts[0]; const body = p && JSON.parse(p.body);
    record('R-11', 'Submit reloads rankings before paying; button shows amount+rank', 'GET +1 before POST; label "Pay ₹4,000 & claim #2"', `label="${lbl}" gets ${g0}->${S.gets}`, lbl === 'Pay ₹4,000 & claim #2' && S.gets === g0 + 1);
    record('L-12', 'UPI POST URL & headers', 'apikey, Bearer, Prefer return=minimal', p && JSON.stringify({ url: p.url, apikey: p.headers.apikey, auth: p.headers.authorization, prefer: p.headers.prefer }), p && p.url === `${SB}/rest/v1/listings` && p.headers.apikey === 'anon' && p.headers.authorization === 'Bearer anon' && p.headers.prefer === 'return=minimal');
    record('L-13', 'UPI POST body = granted columns only', 'amount,category,name,ref,tagline,url', JSON.stringify(body), body && Object.keys(body).sort().join() === 'amount,category,name,ref,tagline,url' && body.url === 'https://testacademy.in' && body.tagline === null && body.amount === 4000 && /^TB[A-Z0-9]{6}$/.test(body.ref));
    const m = await page.evaluate(() => ({ open: upiModal.classList.contains('open'), amt: mAmt.textContent, amt2: mAmt2.textContent, for: mFor.textContent, ref: mRef.textContent, href: mUpi.getAttribute('href'), focus: document.activeElement.id }));
    const qs = new URLSearchParams(m.href.split('?')[1]);
    record('L-14', 'UPI link params', 'pa=test@upi, pn, am=4000, cu=INR, tn=ref', m.href, m.open && qs.get('pa') === 'test@upi' && qs.get('am') === '4000' && qs.get('cu') === 'INR' && qs.get('tn') === body.ref && qs.get('pn') === 'TopperBoard');
    const qrOk = await page.evaluate(h => { const q = qrcode(0, 'M'); q.addData(h); q.make(); const dv = document.createElement('div'); dv.innerHTML = q.createSvgTag({ scalable: true, margin: 0 }); const r = qrBox.querySelector('svg').getBoundingClientRect(); return dv.innerHTML === qrBox.innerHTML && r.width > 150; }, m.href);
    record('L-15', 'UPI modal: QR, amounts, ref, rank, focus', 'QR == link; ₹4,000 x2; ref; "rank #2 right now"; focus on Open UPI app', JSON.stringify({ qrOk, ...m, href: undefined }), qrOk && m.amt === '₹4,000' && m.amt2 === '₹4,000' && m.ref === body.ref && /rank #2 right now/.test(m.for) && m.focus === 'mUpi');
    const after = await page.evaluate(() => ({ name: fName.value, amt: fAmt.value, fCat: fCat.value, boardCat: document.querySelector('#cats [aria-selected="true"]').dataset.cat, pCat: pCat.textContent, btn: [fBtn.disabled, fBtn.textContent] }));
    record('L-16', 'UPI success: reset, category kept, button restored', 'cleared; 99; coaching; "Pay ₹99 & claim #3"', JSON.stringify(after), after.name === '' && after.amt === '99' && after.fCat === 'coaching' && after.boardCat === 'coaching' && !after.btn[0] && after.btn[1] === 'Pay ₹99 & claim #3');
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => [upiModal.classList.contains('open'), document.activeElement.id]);
    record('L-17', 'UPI modal Esc closes, focus restored', 'closed', JSON.stringify(closed), !closed[0]);

    for (const [mode, label] of [[400, 'HTTP 400'], [500, 'HTTP 500'], ['network', 'network failure']]) {
      S.posts = []; S.postStatus = typeof mode === 'number' ? mode : 201; S.postMode = mode === 'network' ? 'network' : null;
      await fillForm(page); await page.click('#fBtn'); await page.waitForTimeout(700);
      const u = await ui(page);
      record('L-18-' + mode, `UPI POST ${label}`, 'friendly error, recovery, no modal, form kept', JSON.stringify({ err: u.err, dis: u.btnDisabled, txt: u.btnText, upi: u.upiOpen }) + ' name=' + await page.$eval('#fName', e => e.value),
        /nothing was saved/.test(u.err) && !u.btnDisabled && !u.upiOpen && (await page.$eval('#fName', e => e.value)) === 'Test Academy');
    }
    S.postStatus = 201; S.postMode = null;
    S.posts = []; S.postDelay = 1500;
    await fillForm(page);
    await page.click('#fBtn'); await page.waitForTimeout(250);
    const mid = await ui(page);
    await page.click('#fBtn', { force: true }).catch(() => { }); await page.focus('#fName'); await page.keyboard.press('Enter');
    await page.evaluate(() => document.getElementById('form').requestSubmit());
    await page.waitForTimeout(2200);
    record('L-19', 'UPI double-submit (2 clicks + Enter + requestSubmit)', '1 POST; button disabled "Saving…"', `posts=${S.posts.length} mid=${JSON.stringify({ d: mid.btnDisabled, t: mid.btnText })}`, S.posts.length === 1 && mid.btnDisabled && mid.btnText === 'Saving…');
    S.postDelay = 0; await page.keyboard.press('Escape');

    // Rank changed between preview and pay
    S.posts = []; S.rows = ROWS; await page.evaluate(() => load()); await page.waitForTimeout(300);
    await fillForm(page, { amt: '4000' });
    const shown = await page.$eval('#pRank', e => e.textContent);
    S.rows = [...ROWS, { id: 'z', category: 'coaching', name: 'Sneaky', url: 'https://s.in', tagline: '', amount: 4500, paid_at: '2026-11-03T02:00:00Z' }];
    await page.click('#fBtn'); await page.waitForTimeout(700);
    const rc = await ui(page);
    const posts1 = S.posts.length;
    record('R-12', 'Rank changed before payment → warning, needs 2nd press', `shown ${'#2'}; after reload #3 → "Heads up… now gets #3", no POST`, `shown=${shown} err="${rc.err}" upiOpen=${rc.upiOpen} posts=${posts1}`, shown === '#2' && /rankings just changed.*#3/.test(rc.err) && posts1 === 0,
      'submit handler (L561) reads shownRank AFTER await load(); load()->render()->preview() already overwrote shownRank with the new rank, so before===now always and the warning never fires. Capture `const before=shownRank` before busy()/load().');
    await page.keyboard.press('Escape');
    allErr.push(...errs(page).filter(e => !/Failed to load resource|HTTP 4|HTTP 5|Failed to fetch|ERR_FAILED/.test(e)));
    await page.context().close();
  }

  // ===================== C. Razorpay =====================
  {
    const { page } = await newPage(browser); const S = {}; await mock(page, S);
    await page.clock.install();
    await page.goto(URL_RZP); await page.clock.runFor(300); await page.waitForTimeout(300);
    await page.click('#cats [data-cat="coaching"]');
    await fillForm(page, { amt: '6000' });
    await page.click('#fBtn'); await settle(page, true);
    const o = S.orders[0]; const ob = o && JSON.parse(o.body);
    record('L-21', 'create-order headers', 'apikey + Bearer + JSON', o && JSON.stringify({ apikey: o.headers.apikey, auth: o.headers.authorization, ct: o.headers['content-type'] }), o && o.headers.apikey === 'anon' && o.headers.authorization === 'Bearer anon');
    record('L-22', 'create-order body', 'category,name,url,tagline,amount', JSON.stringify(ob), ob && Object.keys(ob).sort().join() === 'amount,category,name,tagline,url' && ob.amount === 6000 && ob.url === 'https://testacademy.in');
    const opts = await page.evaluate(() => window.__rzpOpts && { key: __rzpOpts.key, order_id: __rzpOpts.order_id, amount: __rzpOpts.amount, currency: __rzpOpts.currency, notes: __rzpOpts.notes, opened: window.__rzpOpened });
    record('L-23', 'Razorpay checkout options', 'rzp_test_x, order_TEST1, 600000, INR, notes.ref', JSON.stringify(opts), opts && opts.key === 'rzp_test_x' && opts.order_id === 'order_TEST1' && opts.amount === 600000 && opts.currency === 'INR' && opts.notes.ref === 'TBREF00001' && opts.opened === 1);
    const s1 = await page.evaluate(() => ({ ok: okModal.classList.contains('open'), title: okTitle.textContent, msg: okMsg.textContent, ref: okRef.textContent, name: fName.value, amt: fAmt.value, fCat: fCat.value, pRank: pRank.textContent, btnTxt: fBtn.textContent, focusIn: !!document.activeElement.closest('#okModal') }));
    record('L-24', 'Success modal (title/msg/ref) + form reset', 'open; ref TBREF00001; cleared; 99; coaching; focus in modal', JSON.stringify(s1), s1.ok && s1.ref === 'TBREF00001' && /about a minute/.test(s1.msg) && s1.name === '' && s1.amt === '99' && s1.fCat === 'coaching' && s1.focusIn);
    record('L-24b', 'Preview/button right after success', 'preview & button reflect ₹99 (#3)', `pRank=${s1.pRank} btn="${s1.btnTxt}" (amount field=${s1.amt})`, s1.pRank === '#3' && /₹99/.test(s1.btnTxt),
      'handler (L588-592) resets the form but does not call preview(); stale until the first poll (3 s). Hidden behind the modal, so low impact.');
    const g0 = S.gets;
    await page.clock.runFor(3000); await page.waitForTimeout(150); await page.clock.runFor(3000); await page.waitForTimeout(150);
    const g1 = S.gets;
    S.rows = [...ROWS, { id: '9', category: 'coaching', name: 'Test Academy', url: 'https://testacademy.in', tagline: 'Best tests', amount: 6000, paid_at: '2026-11-03T00:00:00Z' }];
    await page.clock.runFor(3000); await page.waitForTimeout(200);
    const t = await ui(page);
    record('L-25', 'Polling every 3s; toast with rank when own listing appears', '2 GETs/6s; "on the board at #1"', `gets ${g0}->${g1}; toast="${t.toast}"`, g1 - g0 === 2 && /on the board at #1/.test(t.toast));
    const board = await page.$$eval('#podium h3', hs => hs.map(h => h.textContent));
    record('L-26', 'New listing on board after poll', 'Test Academy #1', board.join(','), board[0] === 'Test Academy');
    await page.click('#okModal [data-close]'); await page.waitForTimeout(200);
    const hz = await page.evaluate(() => [okModal.classList.contains('open'), location.hash, document.querySelector('#cats [aria-selected="true"]').dataset.cat]);
    record('L-27', 'Success modal close -> board of that category', 'closed, #coaching', JSON.stringify(hz), !hz[0] && hz[2] === 'coaching');

    // Unrelated listing appears during polling; own never appears -> fallback text after 12 polls
    S.rows = ROWS;
    await fillForm(page, { amt: '200' }); await page.click('#fBtn'); await settle(page, true);
    // Board changed since the preview (L-26 row removed) -> the page now warns first (QA-76 fix); confirm with a second press.
    const warn = await page.$eval('#fErr', e => e.textContent);
    record('L-28a', 'Rank-changed warning before payment (QA-76)', 'warning shown, second press pays', warn, /rankings just changed/.test(warn));
    if (/rankings just changed/.test(warn)) { await page.click('#fBtn'); await settle(page, true); }
    S.rows = [...ROWS, { id: 'x', category: 'food', name: 'Someone Else', url: 'https://x.in', tagline: '', amount: 150, paid_at: '2026-11-03T01:00:00Z' }];
    await page.clock.runFor(3000); await page.waitForTimeout(200);
    const fp = await ui(page);
    record('L-30', 'Poll detection specific to buyer', 'no success toast for unrelated listing', `toast="${fp.toast}" shown=${fp.toastShown}`, !(fp.toastShown && /on the board/.test(fp.toast)));
    for (let i = 0; i < 14; i++) { await page.clock.runFor(3000); await page.waitForTimeout(300); }
    const msg = await page.$eval('#okMsg', e => e.textContent);
    record('L-28', 'Polling gives up (12 tries) with fallback text incl. email', '"Payment received ✔ … Email help@test.in …"', msg, /Payment received/.test(msg) && /help@test\.in/.test(msg));
    await page.keyboard.press('Escape');
    await fillForm(page, { amt: '300' }); await page.click('#fBtn'); await settle(page, true);
    const msg2 = await page.$eval('#okMsg', e => e.textContent);
    record('L-29', 'Success text reset for next payment', 'default "about a minute"', msg2, /about a minute/.test(msg2));
    await page.keyboard.press('Escape');
    for (let i = 0; i < 13; i++) { await page.clock.runFor(3000); await page.waitForTimeout(40); }

    await page.evaluate(() => window.__rzpMode = 'dismiss');
    await fillForm(page, { amt: '250' }); await page.click('#fBtn'); await settle(page, true);
    const d = await ui(page);
    record('L-31', 'Razorpay dismissed', 'toast "Payment cancelled. No money was taken."; enabled; form kept', JSON.stringify({ toast: d.toast, dis: d.btnDisabled }) + ' name=' + await page.$eval('#fName', e => e.value), /Payment cancelled/.test(d.toast) && !d.btnDisabled && (await page.$eval('#fName', e => e.value)) === 'Test Academy');
    await page.evaluate(() => window.__rzpMode = 'failed');
    await page.clock.runFor(4000);
    await fillForm(page, { amt: '250' }); await page.click('#fBtn'); await settle(page, true);
    const pf = await ui(page);
    record('L-31b', 'payment.failed event', 'toast "Payment failed…"', pf.toast, /Payment failed/.test(pf.toast));
    await page.evaluate(() => window.__rzpMode = 'success');

    const generic = /couldn't start the payment\. No money was taken.*help@test\.in/;
    const cases = [['400', /^Please enter a valid web link/], ['500json', generic], ['500text', generic], ['network', generic], ['502nocors', generic], ['401jwt', generic], ['200noorder', generic]];
    for (const [mode, re] of cases) {
      S.orderMode = mode; await fillForm(page, { amt: '250' }); await page.click('#fBtn'); await settle(page, true);
      const u = await ui(page);
      record('L-32-' + mode, `create-order ${mode}`, `friendly (${re}); recovered; no checkout`, JSON.stringify({ err: u.err, btn: [u.btnDisabled, u.btnText] }), re.test(u.err) && !u.btnDisabled && !u.okOpen);
    }
    S.orderMode = 'ok';

    S.orders = []; S.orderDelay = 1500; await page.evaluate(() => window.__rzpOpened = 0);
    await fillForm(page, { amt: '260' }); await page.click('#fBtn'); await settle(page, true);
    const mid = await ui(page);
    await page.click('#fBtn', { force: true }).catch(() => { }); await page.focus('#fUrl'); await page.keyboard.press('Enter');
    await page.evaluate(() => document.getElementById('form').requestSubmit());
    await page.waitForTimeout(1900); await settle(page, true);
    const opened = await page.evaluate(() => window.__rzpOpened);
    record('L-33', 'Razorpay double-submit', '1 order, 1 checkout; busy label', `orders=${S.orders.length} opened=${opened} mid=${JSON.stringify({ d: mid.btnDisabled, t: mid.btnText })}`, S.orders.length === 1 && opened === 1 && mid.btnDisabled && /Opening secure payment|Checking latest/.test(mid.btnText));
    S.orderDelay = 0;
    await page.keyboard.press('Escape');
    record('L-34', 'Razorpay flow console output (informational)', '-', [...new Set(errs(page))].slice(0, 6).join(' ; '), null);
    await page.context().close();
  }
  {
    const { page } = await newPage(browser); const S = { checkoutFail: true }; await mock(page, S);
    await page.goto(URL_RZP); await page.waitForTimeout(400);
    await fillForm(page); await page.click('#fBtn'); await page.waitForTimeout(700);
    const u = await ui(page);
    record('L-35', 'checkout.js blocked', 'message; enabled; no order', JSON.stringify({ err: u.err, btn: u.btnDisabled }) + ' orders=' + S.orders.length, !u.btnDisabled && S.orders.length === 0 && /couldn't start the payment/.test(u.err));
    S.checkoutFail = false; await page.click('#fBtn'); await page.waitForTimeout(900);
    const r = await page.evaluate(() => [window.__rzpOpened, document.querySelectorAll('script[src*="checkout.razorpay"]').length]);
    record('L-36', 'Retry after checkout.js failure', 'opens; failed <script> removed', JSON.stringify(r), r[0] === 1 && r[1] === 1);
    await page.context().close();
  }
  record('L-37', 'Unexpected console/page errors in live happy paths', 'none', [...new Set(allErr)].join(' ; ') || 'none', allErr.length === 0);
  await browser.close();
  save('t3_live');
})().catch(e => { console.error(e); process.exit(1); });
