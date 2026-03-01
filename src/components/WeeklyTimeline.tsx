import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface WeeklyTimelineProps {
  data: { week: string; prsAuthored: number; prsReviewed: number }[];
  login: string;
}

export function WeeklyTimeline({ data, login }: WeeklyTimelineProps) {
  // Format week labels to shorter form
  const formattedData = data.map(d => ({
    ...d,
    label: d.week.replace(/^\d{4}-/, ''),
  }));

  return (
    <div className="bg-white rounded-lg border border-surface-200 p-4">
      <h3 className="text-sm font-semibold text-surface-700 mb-1">
        Weekly Activity — {login}
      </h3>
      <p className="text-xs text-surface-400 mb-3">PRs authored and reviewed per week</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={formattedData} barGap={0} barSize={8}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            width={24}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar dataKey="prsAuthored" name="PRs Authored" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          <Bar dataKey="prsReviewed" name="PRs Reviewed" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
