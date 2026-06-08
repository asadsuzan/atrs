import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export function DonutChart({ data }: { data: { features: number, improvements: number, bugFixes: number } }) {
  const chartData = [
    { name: 'Features', value: data.features || 0, color: '#3b82f6' },
    { name: 'Improvements', value: data.improvements || 0, color: '#a855f7' },
    { name: 'Bug Fixes', value: data.bugFixes || 0, color: '#ef4444' },
  ].filter(item => item.value > 0);

  if (chartData.length === 0) return <div className="text-muted-foreground text-center py-8">No data available</div>;

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          <Legend iconType="circle" verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
