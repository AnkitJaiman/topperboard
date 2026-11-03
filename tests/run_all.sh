#!/usr/bin/env bash
# TopperBoard functional QA regression suite (round 2: config.js-based site).
# Usage: bash tests/run_all.sh
# Needs Node + globally installed Playwright/Chromium. No real network: all http(s) is mocked or aborted.
# Round-1 suite (pre-fix code) is archived in ./round1/.
cd "$(dirname "$0")" || exit 1
echo "Site commit: $(git -C "$(dirname "$0")/.." log --oneline -1)"
fail=0
for t in t1_unconfigured.js t2_demo.js t3_live.js; do
  echo "=== $t"; node "$t" || fail=1
done
node -e '
const r=["t1_unconfigured","t2_demo","t3_live"].flatMap(n=>require("./results/"+n+".json"));
const c=k=>r.filter(x=>x.result===k).length;
console.log(`\nTOTAL ${r.length} checks: PASS ${c("PASS")}  FAIL ${c("FAIL")}  INFO ${c("INFO")}`);
r.filter(x=>x.result==="FAIL").forEach(x=>console.log("FAIL",x.id,x.feature));'
exit $fail
