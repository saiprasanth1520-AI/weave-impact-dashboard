import { readFileSync } from 'fs';
const d = JSON.parse(readFileSync('./src/data/github-data.json', 'utf-8'));
const BOT_ACCOUNTS = new Set(["dependabot","dependabot[bot]","renovate","renovate[bot]","greptile-apps","graphite-app","copilot-pull-request-reviewer","chatgpt-codex-connector","posthog-bot","ghost","mendral-app","hex-security-app"]);
function isBot(l) { return BOT_ACCOUNTS.has(l) || l.endsWith("[bot]") || l.endsWith("-bot"); }
const prs = d.pullRequests.filter(p => !isBot(p.author));

// Validate: does the top 5 make sense to a PostHog engineering leader?
const top5 = ["pauldambra", "rafaeelaudibert", "adboio", "andrewm4894", "adamleithp"];

for (const login of top5) {
  console.log(`\n=== ${login} ===`);
  const authored = prs.filter(p => p.author === login);
  console.log(`PRs Merged: ${authored.length}`);
  console.log(`Total +/-: +${authored.reduce((s,p)=>s+p.additions,0).toLocaleString()} / -${authored.reduce((s,p)=>s+p.deletions,0).toLocaleString()}`);
  console.log(`Avg files/PR: ${(authored.reduce((s,p)=>s+p.changedFiles,0) / authored.length).toFixed(1)}`);

  // Reviews given
  let totalReviews = 0, substantive = 0;
  for (const pr of prs) {
    if (pr.author === login) continue;
    for (const r of pr.reviews) {
      if (r.reviewer === login) {
        totalReviews++;
        if (r.bodyLength > 20 || r.commentCount > 0) substantive++;
      }
    }
  }
  console.log(`Reviews given: ${totalReviews} (${substantive} substantive, ${totalReviews - substantive} quick)`);

  // Collaboration
  const reviewedAuthors = new Set();
  const myReviewers = new Set();
  for (const pr of prs) {
    if (pr.author !== login && pr.reviews.some(r => r.reviewer === login)) reviewedAuthors.add(pr.author);
    if (pr.author === login) pr.reviews.filter(r => !isBot(r.reviewer) && r.reviewer !== login).forEach(r => myReviewers.add(r.reviewer));
  }
  console.log(`Collaboration: reviewed ${reviewedAuthors.size} people, reviewed by ${myReviewers.size} people`);

  // Sample PR titles
  console.log(`Sample PRs: ${authored.slice(0, 3).map(p => p.title).join(' | ')}`);
}
