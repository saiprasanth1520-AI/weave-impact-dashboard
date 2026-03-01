import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./src/data/github-data.json', 'utf-8'));

const BOT_ACCOUNTS = new Set(["dependabot","greptile-apps","graphite-app","copilot-pull-request-reviewer","chatgpt-codex-connector","posthog-bot","ghost","mendral-app","hex-security-app"]);
function isBot(l) { return BOT_ACCOUNTS.has(l) || l.endsWith("[bot]") || l.endsWith("-bot"); }

const prs = data.pullRequests.filter(pr => !isBot(pr.author));
console.log("Human PRs:", prs.length);

const s = {};
prs.forEach(p => {
  if (!s[p.author]) s[p.author] = {prs:0,add:0,del:0,files:0,reviews:0,subReviews:0};
  s[p.author].prs++; s[p.author].add += p.additions; s[p.author].del += p.deletions; s[p.author].files += p.changedFiles;
});

prs.forEach(p => {
  p.reviews.filter(r => !isBot(r.reviewer)).forEach(r => {
    if (!s[r.reviewer]) s[r.reviewer] = {prs:0,add:0,del:0,files:0,reviews:0,subReviews:0};
    s[r.reviewer].reviews++;
    if (r.bodyLength > 20 || r.commentCount > 0) s[r.reviewer].subReviews++;
  });
});

console.log("\nTop 15 by combined activity:");
Object.entries(s)
  .sort((a,b) => (b[1].prs+b[1].reviews) - (a[1].prs+a[1].reviews))
  .slice(0,15)
  .forEach(([l,v]) => {
    console.log(` ${l.padEnd(22)} PRs: ${String(v.prs).padStart(3)} | Reviews: ${String(v.reviews).padStart(3)} (${v.subReviews} substantive) | +/-: ${String(v.add+v.del).padStart(7)}`);
  });
