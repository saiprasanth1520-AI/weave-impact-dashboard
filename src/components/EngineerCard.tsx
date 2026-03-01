import { ChevronDown, ChevronUp, GitPullRequest, MessageSquare, Users, FolderTree, CalendarCheck } from 'lucide-react';
import type { EngineerProfile } from '../utils/scoring';

interface EngineerCardProps {
  profile: EngineerProfile;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
}

const RANK_COLORS = [
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-slate-100 text-slate-700 border-slate-300',
  'bg-orange-100 text-orange-800 border-orange-300',
  'bg-surface-100 text-surface-600 border-surface-200',
  'bg-surface-100 text-surface-600 border-surface-200',
];

const DIMENSION_ICONS = {
  shippingVelocity: GitPullRequest,
  reviewLeadership: MessageSquare,
  collaborationReach: Users,
  codebaseStewardship: FolderTree,
  consistency: CalendarCheck,
};

function ScoreBar({ value, label, color, description }: { value: number; label: string; color: string; description: string }) {
  return (
    <div className="flex items-center gap-2" title={description}>
      <span className="text-xs text-surface-500 w-[110px] shrink-0 text-right">{label}</span>
      <div className="flex-1 h-2.5 bg-surface-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-surface-600 w-14 text-right">{value}th pctl</span>
    </div>
  );
}

export function EngineerCard({ profile, rank, isSelected, onClick }: EngineerCardProps) {
  const dims = profile.dimensions;
  const dimEntries = [
    { key: 'shippingVelocity' as const, dim: dims.shippingVelocity, color: 'bg-blue-500' },
    { key: 'reviewLeadership' as const, dim: dims.reviewLeadership, color: 'bg-violet-500' },
    { key: 'collaborationReach' as const, dim: dims.collaborationReach, color: 'bg-emerald-500' },
    { key: 'codebaseStewardship' as const, dim: dims.codebaseStewardship, color: 'bg-amber-500' },
    { key: 'consistency' as const, dim: dims.consistency, color: 'bg-rose-500' },
  ];

  return (
    <div
      className={`bg-white rounded-lg border transition-all cursor-pointer ${
        isSelected ? 'border-primary-400 shadow-md ring-1 ring-primary-200' : 'border-surface-200 hover:border-surface-300 hover:shadow-sm'
      }`}
      onClick={onClick}
    >
      {/* Main row — always visible */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Rank badge */}
        <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold border ${RANK_COLORS[rank - 1]}`}>
          {rank}
        </div>

        {/* Avatar + name */}
        <img
          src={`https://github.com/${profile.login}.png?size=64`}
          alt={profile.login}
          className="w-9 h-9 rounded-full border border-surface-200"
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <a
              href={`https://github.com/${profile.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-surface-800 hover:text-primary-600 hover:underline"
              onClick={e => e.stopPropagation()}
            >
              {profile.login}
            </a>
            <span className="text-xs text-surface-400">
              {profile.prsMerged} PRs merged &middot; {profile.reviewsGiven} reviews given
            </span>
          </div>
          {/* Mini dimension bars */}
          <div className="flex items-center gap-1 mt-1.5">
            {dimEntries.map(({ key, dim, color }) => {
              const Icon = DIMENSION_ICONS[key];
              return (
                <div key={key} className="flex items-center gap-0.5" title={`${dim.label}: ${dim.normalized}/100`}>
                  <Icon size={10} className="text-surface-400" />
                  <div className="w-12 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${dim.normalized}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overall score */}
        <div className="text-right shrink-0" title="Average percentile rank across all 5 dimensions, relative to all active engineers">
          <div className="text-xl font-bold text-surface-800">{profile.overallScore}<span className="text-xs font-normal text-surface-400">th</span></div>
          <div className="text-[10px] text-surface-400 uppercase tracking-wider">percentile</div>
        </div>

        {/* Expand/collapse icon */}
        <div className="text-surface-400">
          {isSelected ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded detail */}
      {isSelected && (
        <div className="border-t border-surface-100 px-4 py-3 space-y-3">
          {/* Dimension breakdown bars */}
          <div className="space-y-1.5">
            {dimEntries.map(({ dim, color }) => (
              <ScoreBar
                key={dim.label}
                value={dim.normalized}
                label={dim.label}
                color={color}
                description={dim.description}
              />
            ))}
          </div>

          {/* Detailed breakdown tables */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <BreakdownCard
              title="Shipping"
              items={[
                { label: 'PRs Merged', value: dims.shippingVelocity.breakdown.prsMerged },
                { label: 'Total Additions', value: `+${(dims.shippingVelocity.breakdown.totalAdditions || 0).toLocaleString()}` },
                { label: 'Total Deletions', value: `-${(dims.shippingVelocity.breakdown.totalDeletions || 0).toLocaleString()}` },
                { label: 'Avg Files/PR', value: dims.shippingVelocity.breakdown.avgFilesPerPR },
                { label: 'Median TTM (hrs)', value: dims.shippingVelocity.breakdown.medianTimeToMergeHrs },
              ]}
            />
            <BreakdownCard
              title="Reviews"
              items={[
                { label: 'Total Reviews', value: dims.reviewLeadership.breakdown.totalReviews },
                { label: 'Substantive', value: dims.reviewLeadership.breakdown.substantiveReviews },
                { label: 'Quick Approvals', value: dims.reviewLeadership.breakdown.quickApprovals },
                { label: 'Review Comments', value: dims.reviewLeadership.breakdown.reviewComments },
              ]}
            />
            <BreakdownCard
              title="Collaboration"
              items={[
                { label: 'Authors Reviewed', value: dims.collaborationReach.breakdown.uniqueAuthorsReviewed },
                { label: 'My Reviewers', value: dims.collaborationReach.breakdown.uniqueReviewersOnMyPRs },
                { label: 'Total Connections', value: dims.collaborationReach.breakdown.totalConnections },
              ]}
            />
          </div>

          {/* Highlights */}
          {profile.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {profile.highlights.map((h, i) => (
                <span key={i} className="text-xs bg-surface-100 text-surface-600 px-2 py-0.5 rounded-full">
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BreakdownCard({ title, items }: { title: string; items: { label: string; value: number | string }[] }) {
  return (
    <div className="bg-surface-50 rounded-md px-3 py-2">
      <h4 className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">{title}</h4>
      <div className="space-y-0.5">
        {items.map(({ label, value }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-surface-500">{label}</span>
            <span className="font-medium text-surface-700">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
