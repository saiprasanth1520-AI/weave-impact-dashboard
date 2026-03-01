const dimensions = [
  {
    name: 'Shipping Velocity',
    icon: '1',
    what: 'Complexity-weighted PRs merged',
    how: 'Each PR scored as log2(lines changed) x (1 + files x 0.05). A 100-line, 3-file PR scores ~7. A 2,000-line, 20-file PR scores ~13. Typo fixes score ~1.',
    why: 'Rewards meaningful changes without letting massive auto-generated diffs dominate.',
  },
  {
    name: 'Review Leadership',
    icon: '2',
    what: 'Quality and depth of code reviews',
    how: 'Substantive reviews (with comments or body >20 chars) count 2x. Quick approvals count 1x. Each review comment adds 0.5x bonus.',
    why: 'A reviewer who leaves thoughtful feedback is helping the team more than someone rubber-stamping approvals.',
  },
  {
    name: 'Collaboration Reach',
    icon: '3',
    what: 'Unique teammates worked with',
    how: 'Count of unique PR authors reviewed for + unique reviewers on own PRs. Deduplicated.',
    why: 'Engineers who connect across teams multiply others\' effectiveness and reduce knowledge silos.',
  },
  {
    name: 'Codebase Breadth',
    icon: '4',
    what: 'How widely they work across the codebase',
    how: 'Total files changed across all PRs (x0.1) + unique PR label categories (x5). Proxy for breadth of ownership.',
    why: 'Engineers who touch many areas demonstrate architectural understanding. Note: this is a proxy — file paths aren\'t tracked to keep API calls efficient.',
  },
  {
    name: 'Consistency',
    icon: '5',
    what: 'Sustained activity over time',
    how: 'Count of weeks with at least one PR authored or reviewed, divided by total weeks in the period.',
    why: 'Impact isn\'t a single burst. Reliable, week-over-week presence drives team momentum.',
  },
];

export function MethodologyPanel() {
  return (
    <div className="mt-4 bg-white rounded-lg border border-primary-200 p-5">
      <h2 className="text-base font-semibold text-surface-800 mb-1">How Scores Are Calculated</h2>

      {/* Formula overview */}
      <div className="bg-surface-50 rounded-md p-3 mb-4 text-xs text-surface-600 space-y-1">
        <p><strong>Step 1:</strong> For each dimension, calculate a raw score for every engineer using the formula below.</p>
        <p><strong>Step 2:</strong> Percentile-rank each raw score against all active engineers. If you score higher than 92% of engineers on a dimension, you get 92.</p>
        <p><strong>Step 3:</strong> Average the 5 percentile scores with equal weight to get the overall score.</p>
        <p className="text-surface-500 pt-1">Percentile ranking handles skewed distributions — a few prolific engineers don't distort the scale for everyone else.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {dimensions.map((dim) => (
          <div key={dim.name} className="bg-surface-50 rounded-md p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                {dim.icon}
              </span>
              <span className="text-sm font-semibold text-surface-700">{dim.name}</span>
            </div>
            <p className="text-xs text-surface-700 font-medium mb-1">{dim.what}</p>
            <p className="text-xs text-surface-500 leading-relaxed mb-1.5">{dim.how}</p>
            <p className="text-[10px] text-surface-400 italic">{dim.why}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
