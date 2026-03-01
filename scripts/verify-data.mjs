import { readFileSync } from 'fs';
const d = JSON.parse(readFileSync('./src/data/github-data.json', 'utf-8'));

const BOT_ACCOUNTS = new Set(["dependabot","greptile-apps","graphite-app","copilot-pull-request-reviewer","chatgpt-codex-connector","posthog-bot","ghost","mendral-app","hex-security-app"]);
function isBot(l) { return BOT_ACCOUNTS.has(l) || l.endsWith("[bot]") || l.endsWith("-bot"); }
const prs = d.pullRequests.filter(pr => !isBot(pr.author));

// Check every PR for valid numeric fields
let numIssues = 0;
prs.forEach(pr => {
  ["additions","deletions","changedFiles","timeToMergeHours","commentCount"].forEach(f => {
    if (typeof pr[f] !== "number" || isNaN(pr[f]) || !isFinite(pr[f])) {
      console.log("Bad number:", pr.number, f, pr[f]);
      numIssues++;
    }
  });
  pr.reviews.forEach(r => {
    if (typeof r.commentCount !== "number" || isNaN(r.commentCount)) {
      console.log("Bad review commentCount:", pr.number, r.reviewer);
      numIssues++;
    }
  });
});
console.log("Numeric validation:", numIssues === 0 ? "PASS (0 issues)" : `FAIL (${numIssues} issues)`);

// Verify scoring produces valid output
// Inline a minimal version of the scoring checks
const allLogins = new Set();
prs.forEach(pr => {
  allLogins.add(pr.author);
  pr.reviews.filter(r => !isBot(r.reviewer)).forEach(r => allLogins.add(r.reviewer));
});
console.log("Total engineers (after bot filter):", allLogins.size);

// Check for division-by-zero scenarios
const authoredPRCounts = {};
for (const login of allLogins) {
  const count = prs.filter(p => p.author === login).length;
  authoredPRCounts[login] = count;
}
const zeroAuthors = [...allLogins].filter(l => authoredPRCounts[l] === 0);
console.log("Engineers with 0 authored PRs (review-only):", zeroAuthors.length, "- these should still score correctly");

// Check top 5 are clearly human, active engineers
const topByPRs = Object.entries(authoredPRCounts)
  .sort((a,b) => b[1]-a[1])
  .slice(0, 10);
console.log("\nTop 10 by PR count (verify no bots):");
topByPRs.forEach(([l,c]) => console.log(`  ${l}: ${c} PRs`));

// Verify time range
const dates = prs.map(p => new Date(p.mergedAt));
const earliest = new Date(Math.min(...dates));
const latest = new Date(Math.max(...dates));
const days = Math.round((latest - earliest) / (1000*60*60*24));
console.log(`\nDate range: ${earliest.toISOString().slice(0,10)} to ${latest.toISOString().slice(0,10)} (${days} days)`);
console.log("Covers 90+ days:", days >= 90 ? "PASS" : "FAIL");
