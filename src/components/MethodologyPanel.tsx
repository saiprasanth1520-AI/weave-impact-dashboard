const dimensions = [
  {
    name: 'Shipping Velocity',
    icon: '1',
    description: 'How effectively an engineer delivers meaningful changes. PRs are weighted by complexity (log-scaled lines changed x files touched), so a 20-file architectural change counts more than a typo fix — but massive auto-generated diffs don\'t dominate.',
  },
  {
    name: 'Review Leadership',
    icon: '2',
    description: 'How they help others ship better code. Substantive reviews (with comments or inline feedback) are weighted 2x over quick approvals. Review comment depth adds a bonus. This captures mentorship and quality gatekeeping.',
  },
  {
    name: 'Collaboration Reach',
    icon: '3',
    description: 'How widely they work across the team. Counts unique teammates they reviewed for, plus unique reviewers on their own PRs. High reach indicates a cross-team connector who multiplies others\' effectiveness.',
  },
  {
    name: 'Codebase Stewardship',
    icon: '4',
    description: 'Breadth of ownership. Measures total files changed across PRs and diversity of PR labels (feature areas). Engineers who work across many areas show architectural understanding and broad ownership.',
  },
  {
    name: 'Consistency',
    icon: '5',
    description: 'Sustained contribution over time. Counts active weeks (authoring or reviewing) out of the total period. Impact isn\'t a single burst — reliable presence week after week drives team momentum.',
  },
];

export function MethodologyPanel() {
  return (
    <div className="mt-4 bg-white rounded-lg border border-primary-200 p-5">
      <h2 className="text-base font-semibold text-surface-800 mb-1">Methodology</h2>
      <p className="text-xs text-surface-500 mb-4">
        Each dimension is normalized 0-100 using percentile ranking against all {'>'}100 active engineers.
        The overall score is an equal-weighted average of all five dimensions.
        All underlying numbers are shown transparently — click any engineer to drill down.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {dimensions.map((dim) => (
          <div key={dim.name} className="bg-surface-50 rounded-md p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                {dim.icon}
              </span>
              <span className="text-sm font-semibold text-surface-700">{dim.name}</span>
            </div>
            <p className="text-xs text-surface-500 leading-relaxed">{dim.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
