import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import NeonCard from './NeonCard';
import { TrendingUp } from 'lucide-react';

export default function VaultProgressChart({ goals }) {
  const activeGoals = goals.filter(g => g.status === 'forging');
  
  if (activeGoals.length === 0) {
    return (
      <NeonCard glowColor="purple">
        <div className="text-center py-8">
          <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Crie metas para ver o progresso global</p>
        </div>
      </NeonCard>
    );
  }

  const chartData = activeGoals.map(goal => ({
    name: goal.name,
    value: goal.current_amount || 0,
    target: goal.target_amount,
    color: goal.color || '#FF00FF'
  }));

  const totalSaved = chartData.reduce((sum, item) => sum + item.value, 0);
  const totalTarget = chartData.reduce((sum, item) => sum + item.target, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <NeonCard glowColor="purple">
      <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-purple-400" />
        Progresso Global das Metas
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #8A2BE2' }}
                formatter={(value) => `R$ ${value.toFixed(2)}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">Progresso Total</p>
            <div className="relative h-4 bg-[#0a0a1a] rounded-full overflow-hidden border-2 border-purple-500/50">
              <div 
                className="absolute inset-0 bg-gradient-to-r from-purple-500 via-magenta-500 to-purple-600 transition-all duration-500"
                style={{ width: `${Math.min(overallProgress, 100)}%` }}
              />
            </div>
            <p className="text-purple-400 font-bold text-lg mt-2">{overallProgress.toFixed(1)}%</p>
          </div>

          <div className="space-y-2">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-white">{item.name}</span>
                </div>
                <span className="text-gray-400">
                  R$ {item.value.toFixed(0)} / R$ {item.target.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </NeonCard>
  );
}