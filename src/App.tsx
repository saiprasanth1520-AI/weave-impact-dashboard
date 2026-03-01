import { useState, useMemo } from 'react';
import githubData from './data/github-data.json';
import { calculateImpact, getWeeklyActivity, getTopPRs, countBots, type GitHubData } from './utils/scoring';
import { EngineerCard } from './components/EngineerCard';
import { RadarComparison } from './components/RadarComparison';
import { MethodologyPanel } from './components/MethodologyPanel';
import { WeeklyTimeline } from './components/WeeklyTimeline';
import { Header } from './components/Header';
import './index.css';

const TOP_N = 5;

function App() {
  const data = githubData as GitHubData;
  const profiles = useMemo(() => calculateImpact(data), [data]);
  const botCount = useMemo(() => countBots(data), [data]);
  const topEngineers = profiles.slice(0, TOP_N);

  const [selectedEngineer, setSelectedEngineer] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  const selectedProfile = selectedEngineer
    ? profiles.find(p => p.login === selectedEngineer) || null
    : null;

  const weeklyData = selectedEngineer
    ? getWeeklyActivity(data, selectedEngineer)
    : null;

  const topPRs = selectedEngineer
    ? getTopPRs(data, selectedEngineer, 5)
    : null;

  return (
    <div className="min-h-screen bg-surface-50 px-4 py-5 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <Header
        metadata={data.metadata}
        totalEngineers={profiles.length}
        totalBots={botCount}
        onToggleMethodology={() => setShowMethodology(!showMethodology)}
        showMethodology={showMethodology}
      />

      {showMethodology && <MethodologyPanel />}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        {/* Left column: Top 5 engineer cards */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold text-surface-800 mb-1">
            Top {TOP_N} Most Impactful Engineers
          </h2>
          {topEngineers.map((engineer, index) => (
            <EngineerCard
              key={engineer.login}
              profile={engineer}
              rank={index + 1}
              isSelected={selectedEngineer === engineer.login}
              onClick={() => setSelectedEngineer(
                selectedEngineer === engineer.login ? null : engineer.login
              )}
            />
          ))}
        </div>

        {/* Right column: Radar chart + detail panel */}
        <div className="space-y-4">
          <RadarComparison engineers={topEngineers} selectedLogin={selectedEngineer} />

          {selectedProfile && weeklyData && topPRs && (
            <div className="space-y-4">
              <WeeklyTimeline data={weeklyData} login={selectedProfile.login} />
              <TopPRsList prs={topPRs} repo={data.metadata.repo} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TopPRsList({ prs, repo }: { prs: ReturnType<typeof getTopPRs>; repo: string }) {
  if (prs.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-surface-200 p-4">
      <h3 className="text-sm font-semibold text-surface-700 mb-3">Most Impactful PRs</h3>
      <ul className="space-y-2">
        {prs.map(pr => (
          <li key={pr.number} className="text-xs">
            <a
              href={`https://github.com/${repo}/pull/${pr.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-800 hover:underline font-medium"
            >
              #{pr.number}
            </a>
            <span className="text-surface-600 ml-1.5 line-clamp-1">{pr.title}</span>
            <span className="text-surface-400 ml-1.5 whitespace-nowrap">
              +{pr.additions.toLocaleString()} / -{pr.deletions.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
