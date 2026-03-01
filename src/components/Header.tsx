import { Info } from 'lucide-react';

interface HeaderProps {
  metadata: {
    repo: string;
    fetchedAt: string;
    periodStart: string;
    periodEnd: string;
    totalPRs: number;
  };
  totalEngineers: number;
  onToggleMethodology: () => void;
  showMethodology: boolean;
}

export function Header({ metadata, totalEngineers, onToggleMethodology, showMethodology }: HeaderProps) {
  const periodStart = new Date(metadata.periodStart).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const periodEnd = new Date(metadata.periodEnd).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <header>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            Engineering Impact Dashboard
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            <a
              href={`https://github.com/${metadata.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline font-medium"
            >
              {metadata.repo}
            </a>
            {' '}&middot;{' '}
            {periodStart} &ndash; {periodEnd}
            {' '}&middot;{' '}
            {metadata.totalPRs.toLocaleString()} merged PRs from {totalEngineers} engineers
          </p>
        </div>

        <button
          onClick={onToggleMethodology}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
            border transition-colors cursor-pointer
            ${showMethodology
              ? 'bg-primary-50 border-primary-300 text-primary-700'
              : 'bg-white border-surface-300 text-surface-600 hover:bg-surface-50'
            }
          `}
        >
          <Info size={14} />
          How this works
        </button>
      </div>
    </header>
  );
}
