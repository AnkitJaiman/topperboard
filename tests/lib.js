// Shared helpers for TopperBoard QA scripts. Run any test with: node <file>.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SITE = require('path').resolve(__dirname, '..');
const QA = __dirname;
const RESULTS = [];

function record(id, feature, expected, actual, pass, details = '') {
  const r = { id, feature, expected, actual: String(actual), result: pass === null ? 'INFO' : (pass ? 'PASS' : 'FAIL'), details };
  RESULTS.push(r);
  console.log(`[${r.result}] ${id} ${feature} :: ${r.actual}${details ? ' | ' + details : ''}`);
  return pass;
}

// Creates a page that: captures console errors/warnings + pageerrors, stubs Google Fonts
// (blocked in sandbox; would otherwise add noise) and ABORTS any other non-file request
// unless the test registered its own route first. Never lets real traffic out.
async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page._console = []; page._errors = []; page._requests = []; page._leaked = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) page._console.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => page._errors.push(String(e && e.stack || e)));
  page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) page._requests.push({ method: r.method(), url: r.url(), headers: r.headers(), body: r.postData() }); });
  // Catch-all: registered first => lowest priority (Playwright: last registered route wins).
  await ctx.route(/^https?:\/\//, r => { page._leaked.push(r.request().url()); return r.abort('blockedbyclient'); });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  return { ctx, page };
}

function errs(page) {
  return [...page._console, ...page._errors.map(e => 'pageerror: ' + e)];
}

function save(name) {
  fs.mkdirSync(path.join(QA, 'results'), { recursive: true });
  fs.writeFileSync(path.join(QA, 'results', name + '.json'), JSON.stringify(RESULTS, null, 2));
  const f = RESULTS.filter(r => r.result === 'FAIL').length;
  console.log(`\n${name}: ${RESULTS.length} checks, ${f} FAIL`);
}

// Build a site copy in qa/<dir>/ with its own config.js (round 2: CONFIG lives in config.js).
// cfg keys are TB_CONFIG keys; unspecified keys stay "" (as in the shipped config.js).
function buildSite(dir, cfg = {}, files = ['index.html', 'qrcode.js', 'terms.html', 'privacy.html', 'refund.html', 'contact.html']) {
  const out = path.join(QA, dir);
  fs.mkdirSync(out, { recursive: true });
  for (const f of files) fs.copyFileSync(path.join(SITE, f), path.join(out, f));
  let c = fs.readFileSync(path.join(SITE, 'config.js'), 'utf8');
  for (const [k, v] of Object.entries(cfg)) {
    const re = new RegExp('(\\n\\s*' + k + ':\\s*)"[^"]*"');
    if (!re.test(c)) throw new Error('config key not found: ' + k);
    c = c.replace(re, '$1' + JSON.stringify(v));
  }
  fs.writeFileSync(path.join(out, 'config.js'), c);
  return 'file://' + path.join(out, 'index.html');
}

module.exports = { chromium, record, newPage, errs, save, buildSite, SITE, QA, RESULTS };
