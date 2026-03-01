import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { EngineerProfile } from '../utils/scoring';

interface RadarComparisonProps {
  engineers: EngineerProfile[];
  selectedLogin: string | null;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
const DIM_SHORT_LABELS: Record<string, string> = {
  shippingVelocity: 'Shipping',
  reviewLeadership: 'Reviews',
  collaborationReach: 'Collab',
  codebaseStewardship: 'Breadth',
  consistency: 'Consistency',
};

export function RadarComparison({ engineers, selectedLogin }: RadarComparisonProps) {
  const dimKeys = Object.keys(DIM_SHORT_LABELS) as (keyof typeof DIM_SHORT_LABELS)[];

  const chartData = dimKeys.map(key => {
    const entry: Record<string, string | number> = { dimension: DIM_SHORT_LABELS[key] };
    engineers.forEach(eng => {
      entry[eng.login] = eng.dimensions[key as keyof typeof eng.dimensions].normalized;
    });
    return entry;
  });

  return (
    <div className="bg-white rounded-lg border border-surface-200 p-4">
      <h3 className="text-sm font-semibold text-surface-700 mb-1">Dimension Comparison</h3>
      <p className="text-xs text-surface-400 mb-3">
        {selectedLogin ? `Highlighting ${selectedLogin}` : 'Click an engineer to highlight'}
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fontSize: 11, fill: '#64748b' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickCount={5}
          />
          {engineers.map((eng, i) => {
            const isSelected = selectedLogin === eng.login;
            const isNoneSelected = !selectedLogin;
            const opacity = isNoneSelected ? 0.3 : isSelected ? 0.8 : 0.08;
            const strokeWidth = isSelected ? 2.5 : 1;
            return (
              <Radar
                key={eng.login}
                name={eng.login}
                dataKey={eng.login}
                stroke={COLORS[i]}
                fill={COLORS[i]}
                fillOpacity={opacity * 0.3}
                strokeOpacity={isNoneSelected ? 0.6 : isSelected ? 1 : 0.15}
                strokeWidth={strokeWidth}
              />
            );
          })}
          <Tooltip
            contentStyle={{
              fontSize: 12,
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '8px 12px',
            }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
        {engineers.map((eng, i) => (
          <div key={eng.login} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
            <span className={`text-xs ${
              selectedLogin === eng.login ? 'font-semibold text-surface-800' : 'text-surface-500'
            }`}>
              {eng.login}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
