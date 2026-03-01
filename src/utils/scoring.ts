/**
 * Impact Scoring Model for Engineering Contributions
 *
 * Philosophy: Raw counts (commits, LOC) don't capture impact.
 * Instead, we measure across 5 dimensions that reflect how an
 * engineer drives outcomes for their team:
 *
 * 1. SHIPPING VELOCITY — How effectively they deliver meaningful changes
 *    Weighted by complexity (not just PR count). A 20-file architectural
 *    change matters more than a typo fix.
 *
 * 2. REVIEW LEADERSHIP — How they help others ship better code
 *    Substantive reviews (with comments) weighted higher than rubber-stamp
 *    approvals. Measures mentorship and quality gatekeeping.
 *
 * 3. COLLABORATION REACH — How widely they work across the team
 *    Engineers who review many different people's work and get reviewed
 *    by many different people are cross-team connectors.
 *
 * 4. CODEBASE STEWARDSHIP — Breadth of ownership across the codebase
 *    Working across different parts of the codebase shows architectural
 *    understanding and broad ownership.
 *
 * 5. CONSISTENCY — Sustained contributions over time
 *    Impact isn't a single burst — it's showing up week after week.
 *    Measured as active weeks out of the period.
 *
 * Each dimension is normalized 0-100 relative to peers, then combined
 * with equal weights. The dashboard shows BOTH the composite and the
 * individual dimensions so leaders can understand each engineer's
 * unique contribution pattern.
 */

export interface PullRequest {
  number: number;
  title: string;
  author: string;
  mergedAt: string;
  createdAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: string[];
  reviews: Review[];
  commentCount: number;
  timeToMergeHours: number;
}

export interface Review {
  reviewer: string;
  state: string;
  bodyLength: number;
  commentCount: number;
}

export interface GitHubData {
  metadata: {
    repo: string;
    fetchedAt: string;
    periodStart: string;
    periodEnd: string;
    totalPRs: number;
  };
  pullRequests: PullRequest[];
}

export interface DimensionScore {
  raw: number;
  normalized: number; // 0-100 relative to peers
  label: string;
  description: string;
  breakdown: Record<string, number>;
}

export interface EngineerProfile {
  login: string;
  overallScore: number;
  dimensions: {
    shippingVelocity: DimensionScore;
    reviewLeadership: DimensionScore;
    collaborationReach: DimensionScore;
    codebaseStewardship: DimensionScore;
    consistency: DimensionScore;
  };
  highlights: string[];
  prsMerged: number;
  reviewsGiven: number;
}

const BOT_ACCOUNTS = new Set([
  'dependabot', 'dependabot[bot]', 'renovate', 'renovate[bot]',
  'greptile-apps', 'graphite-app', 'copilot-pull-request-reviewer',
  'chatgpt-codex-connector', 'posthog-bot', 'ghost',
  'mendral-app', 'hex-security-app',
]);

function isBot(login: string): boolean {
  return BOT_ACCOUNTS.has(login) || login.endsWith('[bot]') || login.endsWith('-bot');
}

/**
 * Calculate the "weight" of a PR based on its complexity.
 * Uses log scale so huge PRs don't dominate, but still rewards meaningful size.
 */
function prComplexityWeight(pr: PullRequest): number {
  const linesChanged = pr.additions + pr.deletions;
  const fileWeight = Math.min(pr.changedFiles, 50); // cap at 50 files
  // Log scale for lines, linear for files (capped)
  const lineScore = Math.log2(Math.max(linesChanged, 1) + 1);
  return lineScore * (1 + fileWeight * 0.05);
}

/**
 * Normalize an array of raw scores to 0-100 range.
 * Uses percentile-based normalization to handle skewed distributions.
 */
function normalizeScores(scores: Map<string, number>): Map<string, number> {
  const values = [...scores.values()].filter(v => v > 0);
  if (values.length === 0) return new Map([...scores.entries()].map(([k]) => [k, 0]));

  const sorted = [...values].sort((a, b) => a - b);
  const result = new Map<string, number>();

  for (const [login, raw] of scores) {
    if (raw === 0) {
      result.set(login, 0);
      continue;
    }
    // Percentile rank
    const rank = sorted.filter(v => v <= raw).length;
    const percentile = (rank / sorted.length) * 100;
    result.set(login, Math.round(percentile));
  }

  return result;
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
}

/** Count bot accounts found in the data */
export function countBots(data: GitHubData): number {
  const allUsers = new Set<string>();
  data.pullRequests.forEach(pr => {
    allUsers.add(pr.author);
    pr.reviews.forEach(r => allUsers.add(r.reviewer));
  });
  return [...allUsers].filter(isBot).length;
}

export function calculateImpact(data: GitHubData): EngineerProfile[] {
  const prs = data.pullRequests.filter(pr => !isBot(pr.author));

  // Collect all unique human engineers (both authors and reviewers)
  const allLogins = new Set<string>();
  prs.forEach(pr => {
    allLogins.add(pr.author);
    pr.reviews.filter(r => !isBot(r.reviewer)).forEach(r => allLogins.add(r.reviewer));
  });

  // Calculate total weeks in the period
  const allWeeks = new Set<string>();
  prs.forEach(pr => allWeeks.add(getWeekKey(pr.mergedAt)));
  const totalWeeks = Math.max(allWeeks.size, 1);

  // --- DIMENSION 1: Shipping Velocity ---
  const shippingRaw = new Map<string, number>();
  const shippingBreakdown = new Map<string, Record<string, number>>();

  for (const login of allLogins) {
    const authoredPRs = prs.filter(pr => pr.author === login);
    const totalWeight = authoredPRs.reduce((sum, pr) => sum + prComplexityWeight(pr), 0);
    shippingRaw.set(login, totalWeight);
    shippingBreakdown.set(login, {
      prsMerged: authoredPRs.length,
      totalAdditions: authoredPRs.reduce((s, p) => s + p.additions, 0),
      totalDeletions: authoredPRs.reduce((s, p) => s + p.deletions, 0),
      avgFilesPerPR: authoredPRs.length > 0
        ? Math.round(authoredPRs.reduce((s, p) => s + p.changedFiles, 0) / authoredPRs.length * 10) / 10
        : 0,
      medianTimeToMergeHrs: authoredPRs.length > 0
        ? (() => {
            const sorted = authoredPRs.map(p => p.timeToMergeHours).sort((a, b) => a - b);
            return Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10;
          })()
        : 0,
    });
  }
  const shippingNorm = normalizeScores(shippingRaw);

  // --- DIMENSION 2: Review Leadership ---
  const reviewRaw = new Map<string, number>();
  const reviewBreakdown = new Map<string, Record<string, number>>();

  for (const login of allLogins) {
    // Find all reviews this person gave (across all PRs)
    let totalReviews = 0;
    let substantiveReviews = 0; // Reviews with comments or body
    let totalReviewComments = 0;

    for (const pr of prs) {
      if (pr.author === login) continue; // Skip self-reviews
      for (const review of pr.reviews) {
        if (review.reviewer !== login || isBot(review.reviewer)) continue;
        totalReviews++;
        const isSubstantive = review.bodyLength > 20 || review.commentCount > 0;
        if (isSubstantive) substantiveReviews++;
        totalReviewComments += review.commentCount;
      }
    }

    // Score: substantive reviews worth 2x, plus comment depth bonus
    const score = substantiveReviews * 2 + (totalReviews - substantiveReviews) + totalReviewComments * 0.5;
    reviewRaw.set(login, score);
    reviewBreakdown.set(login, {
      totalReviews,
      substantiveReviews,
      quickApprovals: totalReviews - substantiveReviews,
      reviewComments: totalReviewComments,
    });
  }
  const reviewNorm = normalizeScores(reviewRaw);

  // --- DIMENSION 3: Collaboration Reach ---
  const collabRaw = new Map<string, number>();
  const collabBreakdown = new Map<string, Record<string, number>>();

  for (const login of allLogins) {
    const reviewedAuthors = new Set<string>(); // People whose PRs I reviewed
    const myReviewers = new Set<string>(); // People who reviewed my PRs

    for (const pr of prs) {
      // PRs I reviewed
      if (pr.author !== login) {
        const didReview = pr.reviews.some(r => r.reviewer === login && !isBot(r.reviewer));
        if (didReview) reviewedAuthors.add(pr.author);
      }
      // PRs I authored — who reviewed them
      if (pr.author === login) {
        pr.reviews.filter(r => !isBot(r.reviewer) && r.reviewer !== login)
          .forEach(r => myReviewers.add(r.reviewer));
      }
    }

    const uniqueConnections = new Set([...reviewedAuthors, ...myReviewers]).size;
    collabRaw.set(login, uniqueConnections);
    collabBreakdown.set(login, {
      uniqueAuthorsReviewed: reviewedAuthors.size,
      uniqueReviewersOnMyPRs: myReviewers.size,
      totalConnections: uniqueConnections,
    });
  }
  const collabNorm = normalizeScores(collabRaw);

  // --- DIMENSION 4: Codebase Breadth ---
  // Since we don't have file paths in our data (to keep API calls reasonable),
  // we use changedFiles breadth and PR label diversity as proxies
  const stewardshipRaw = new Map<string, number>();
  const stewardshipBreakdown = new Map<string, Record<string, number>>();

  for (const login of allLogins) {
    const authoredPRs = prs.filter(pr => pr.author === login);
    const uniqueLabels = new Set(authoredPRs.flatMap(pr => pr.labels));
    const totalFilesChanged = authoredPRs.reduce((s, p) => s + p.changedFiles, 0);
    // Breadth score: unique files touched (proxy) + label diversity
    const score = totalFilesChanged * 0.1 + uniqueLabels.size * 5;
    stewardshipRaw.set(login, score);
    stewardshipBreakdown.set(login, {
      totalFilesChanged,
      uniqueLabels: uniqueLabels.size,
      avgChangedFilesPerPR: authoredPRs.length > 0
        ? Math.round(totalFilesChanged / authoredPRs.length * 10) / 10
        : 0,
    });
  }
  const stewardshipNorm = normalizeScores(stewardshipRaw);

  // --- DIMENSION 5: Consistency ---
  const consistencyRaw = new Map<string, number>();
  const consistencyBreakdown = new Map<string, Record<string, number>>();

  for (const login of allLogins) {
    const authoredPRs = prs.filter(pr => pr.author === login);
    // Also count weeks where they reviewed
    const activeWeeksAuthoring = new Set(authoredPRs.map(pr => getWeekKey(pr.mergedAt)));

    const reviewWeeks = new Set<string>();
    for (const pr of prs) {
      if (pr.reviews.some(r => r.reviewer === login)) {
        reviewWeeks.add(getWeekKey(pr.mergedAt));
      }
    }

    const allActiveWeeks = new Set([...activeWeeksAuthoring, ...reviewWeeks]);
    const consistencyPct = (allActiveWeeks.size / totalWeeks) * 100;
    consistencyRaw.set(login, consistencyPct);
    consistencyBreakdown.set(login, {
      activeWeeks: allActiveWeeks.size,
      totalWeeks,
      authoringWeeks: activeWeeksAuthoring.size,
      reviewWeeks: reviewWeeks.size,
    });
  }
  const consistencyNorm = normalizeScores(consistencyRaw);

  // --- Combine into EngineerProfiles ---
  const profiles: EngineerProfile[] = [];

  for (const login of allLogins) {
    const shipping = shippingNorm.get(login) || 0;
    const review = reviewNorm.get(login) || 0;
    const collab = collabNorm.get(login) || 0;
    const stewardship = stewardshipNorm.get(login) || 0;
    const consistency = consistencyNorm.get(login) || 0;

    // Equal-weighted composite
    const overall = Math.round((shipping + review + collab + stewardship + consistency) / 5);

    const prsMerged = prs.filter(p => p.author === login).length;
    const reviewsGiven = reviewBreakdown.get(login)?.totalReviews || 0;

    // Generate comparative, insight-driven highlights (not just raw counts)
    const highlights: string[] = [];
    const dims = [
      { name: 'Shipping', score: shipping },
      { name: 'Reviews', score: review },
      { name: 'Collaboration', score: collab },
      { name: 'Stewardship', score: stewardship },
      { name: 'Consistency', score: consistency },
    ];
    const sortedDims = [...dims].sort((a, b) => b.score - a.score);
    const topDim = sortedDims[0];
    const weakDim = sortedDims[sortedDims.length - 1];

    // Top strength
    if (topDim.score >= 80) {
      highlights.push(`Top ${100 - topDim.score}% in ${topDim.name}`);
    }

    // Key differentiator — what makes them stand out
    const rb = reviewBreakdown.get(login);
    if (rb && rb.substantiveReviews > 0 && rb.totalReviews > 0) {
      const substPct = Math.round((rb.substantiveReviews / rb.totalReviews) * 100);
      if (substPct >= 70) {
        highlights.push(`${substPct}% of reviews are substantive (with comments)`);
      }
    }

    const cb = collabBreakdown.get(login);
    if (cb && cb.totalConnections >= 20) {
      highlights.push(`Works with ${cb.totalConnections} unique teammates`);
    }

    const conb = consistencyBreakdown.get(login);
    if (conb && conb.activeWeeks >= totalWeeks * 0.8) {
      highlights.push(`Active ${conb.activeWeeks} of ${conb.totalWeeks} weeks (highly consistent)`);
    } else if (conb && conb.activeWeeks > 0) {
      highlights.push(`Active ${conb.activeWeeks} of ${conb.totalWeeks} weeks`);
    }

    // Weakness indicator (only if there's a clear gap)
    if (topDim.score - weakDim.score >= 40) {
      highlights.push(`Growth area: ${weakDim.name} (${weakDim.score}th pctl)`);
    }

    // Summary stats
    if (prsMerged > 0) highlights.push(`${prsMerged} PRs merged`);
    if (reviewsGiven > 0) highlights.push(`${reviewsGiven} reviews given`);

    profiles.push({
      login,
      overallScore: overall,
      dimensions: {
        shippingVelocity: {
          raw: shippingRaw.get(login) || 0,
          normalized: shipping,
          label: 'Shipping Velocity',
          description: 'Complexity-weighted delivery of merged PRs',
          breakdown: shippingBreakdown.get(login) || {},
        },
        reviewLeadership: {
          raw: reviewRaw.get(login) || 0,
          normalized: review,
          label: 'Review Leadership',
          description: 'Quality and depth of code reviews given',
          breakdown: reviewBreakdown.get(login) || {},
        },
        collaborationReach: {
          raw: collabRaw.get(login) || 0,
          normalized: collab,
          label: 'Collaboration Reach',
          description: 'Number of unique teammates worked with',
          breakdown: collabBreakdown.get(login) || {},
        },
        codebaseStewardship: {
          raw: stewardshipRaw.get(login) || 0,
          normalized: stewardship,
          label: 'Codebase Breadth',
          description: 'How widely they work across the codebase (files changed + PR label diversity)',
          breakdown: stewardshipBreakdown.get(login) || {},
        },
        consistency: {
          raw: consistencyRaw.get(login) || 0,
          normalized: consistency,
          label: 'Consistency',
          description: 'Sustained activity over time (active weeks)',
          breakdown: consistencyBreakdown.get(login) || {},
        },
      },
      highlights,
      prsMerged,
      reviewsGiven,
    });
  }

  // Sort by overall score descending
  profiles.sort((a, b) => b.overallScore - a.overallScore);

  return profiles;
}

/** Get weekly activity data for a specific engineer */
export function getWeeklyActivity(data: GitHubData, login: string): { week: string; prsAuthored: number; prsReviewed: number }[] {
  const prs = data.pullRequests;
  const weekMap = new Map<string, { prsAuthored: number; prsReviewed: number }>();

  // Initialize all weeks
  const allWeeks = new Set<string>();
  prs.forEach(pr => allWeeks.add(getWeekKey(pr.mergedAt)));
  for (const week of allWeeks) {
    weekMap.set(week, { prsAuthored: 0, prsReviewed: 0 });
  }

  for (const pr of prs) {
    const week = getWeekKey(pr.mergedAt);
    const entry = weekMap.get(week)!;
    if (pr.author === login) entry.prsAuthored++;
    if (pr.reviews.some(r => r.reviewer === login)) entry.prsReviewed++;
  }

  return [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({ week, ...data }));
}

/** Get top PRs for an engineer (most impactful) */
export function getTopPRs(data: GitHubData, login: string, limit = 5): PullRequest[] {
  return data.pullRequests
    .filter(pr => pr.author === login)
    .sort((a, b) => prComplexityWeight(b) - prComplexityWeight(a))
    .slice(0, limit);
}
