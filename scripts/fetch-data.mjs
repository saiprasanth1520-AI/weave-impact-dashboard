#!/usr/bin/env node
/**
 * Fetches merged PRs from PostHog/posthog for the last 90+ days
 * using GitHub GraphQL API via `gh` CLI.
 * Outputs structured JSON for the dashboard.
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '..', 'src', 'data', 'github-data.json');

const OWNER = 'PostHog';
const REPO = 'posthog';
const DAYS_BACK = 100; // fetch 100 days to ensure full 90-day coverage

const since = new Date();
since.setDate(since.getDate() - DAYS_BACK);
const sinceISO = since.toISOString();

console.log(`Fetching merged PRs since ${sinceISO}...`);

const QUERY = `
query($cursor: String) {
  repository(owner: "${OWNER}", name: "${REPO}") {
    pullRequests(
      first: 50
      states: MERGED
      orderBy: { field: UPDATED_AT, direction: DESC }
      after: $cursor
    ) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        number
        title
        author { login }
        mergedAt
        createdAt
        additions
        deletions
        changedFiles
        labels(first: 10) {
          nodes { name }
        }
        reviews(first: 30) {
          nodes {
            author { login }
            state
            body
            comments { totalCount }
          }
        }
        reviewRequests(first: 10) {
          nodes {
            requestedReviewer {
              ... on User { login }
            }
          }
        }
        comments { totalCount }
      }
    }
  }
}
`;

function ghGraphQL(cursor = null) {
  const variables = cursor ? `-f cursor="${cursor}"` : '';
  const cmd = `gh api graphql -f query='${QUERY.replace(/'/g, "'\\''")}' ${variables} 2>&1`;

  try {
    const result = execSync(cmd, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 60000
    });
    return JSON.parse(result.toString());
  } catch (err) {
    console.error('GraphQL request failed:', err.message);
    throw err;
  }
}

async function fetchAllPRs() {
  const allPRs = [];
  let cursor = null;
  let page = 0;

  while (true) {
    page++;
    console.log(`  Page ${page}... (cursor: ${cursor ? cursor.slice(0, 10) + '...' : 'start'})`);

    const data = ghGraphQL(cursor);
    const prs = data.data.repository.pullRequests;

    if (page === 1) {
      console.log(`  Total merged PRs in repo: ${prs.totalCount}`);
    }

    let reachedCutoff = false;
    for (const pr of prs.nodes) {
      // Stop if we've gone past our date range
      const mergedAt = new Date(pr.mergedAt);
      if (mergedAt < since) {
        reachedCutoff = true;
        break;
      }
      allPRs.push(pr);
    }

    if (reachedCutoff || !prs.pageInfo.hasNextPage) {
      break;
    }

    cursor = prs.pageInfo.endCursor;
  }

  return allPRs;
}

// Run
const prs = await fetchAllPRs();

console.log(`\nFetched ${prs.length} merged PRs in the last ${DAYS_BACK} days.`);

// Process into a clean structure
const output = {
  metadata: {
    repo: `${OWNER}/${REPO}`,
    fetchedAt: new Date().toISOString(),
    periodStart: sinceISO,
    periodEnd: new Date().toISOString(),
    totalPRs: prs.length,
  },
  pullRequests: prs.map(pr => ({
    number: pr.number,
    title: pr.title,
    author: pr.author?.login || 'ghost',
    mergedAt: pr.mergedAt,
    createdAt: pr.createdAt,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changedFiles,
    labels: pr.labels.nodes.map(l => l.name),
    reviews: pr.reviews.nodes
      .filter(r => r.author?.login)
      .map(r => ({
        reviewer: r.author.login,
        state: r.state,
        bodyLength: (r.body || '').length,
        commentCount: r.comments.totalCount,
      })),
    commentCount: pr.comments.totalCount,
    timeToMergeHours: Math.round(
      (new Date(pr.mergedAt) - new Date(pr.createdAt)) / (1000 * 60 * 60) * 10
    ) / 10,
  })),
};

// Write output
writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
console.log(`\nData saved to ${OUTPUT_PATH}`);

// Quick stats
const authors = new Set(output.pullRequests.map(p => p.author));
const reviewers = new Set(output.pullRequests.flatMap(p => p.reviews.map(r => r.reviewer)));
console.log(`Unique PR authors: ${authors.size}`);
console.log(`Unique reviewers: ${reviewers.size}`);
