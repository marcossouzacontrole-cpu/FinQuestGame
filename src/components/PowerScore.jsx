import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Shield, TrendingUp, Target, Coins, Zap, Award } from 'lucide-react';
import NeonCard from './NeonCard';

export default function PowerScore({ userData, financialData }) {
  // Calculate scores (0-100)
  const scores = {
    savings: Math.min(((financialData?.savingsRate || 0) * 100) / 20, 100), // Max 20% = 100 points
    investment: Math.min(((financialData?.investmentDiversity || 0) * 100), 100),
    debtManagement: Math.max(100 - ((financialData?.debtToIncome || 0) * 100), 0),
    budgetControl: Math.min(((financialData?.budgetAdherence || 70) / 100) * 100, 100),
    consistency: Math.min(((userData?.login_streak || 0) / 30) * 100, 100),
    education: Math.min(((userData?.completed_modules?.length || 0) / 10) * 100, 100)
  };

  const radarData = [
    { subject: 'Poupança', value: scores.savings, fullMark: 100, icon: '💰' },
    { subject: 'Investimento', value: scores.investment, fullMark: 100, icon: '📈' },
    { subject: 'Dívidas', value: scores.debtManagement, fullMark: 100, icon: '🛡️' },
    { subject: 'Orçamento', value: scores.budgetControl, fullMark: 100, icon: '📊' },
    { subject: 'Consistência', value: scores.consistency, fullMark: 100, icon: '🔥' },
    { subject: 'Educação', value: scores.education, fullMark: 100, icon: '🎓' }
  ];

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) / 6;

  const getRank = (score) => {
    if (score >= 90) return { name: 'Lendário', color: 'from-yellow-500 to-orange-500', icon: '👑' };
    if (score >= 75) return { name: 'Épico', color: 'from-purple-500 to-pink-500', icon: '💎' };
    if (score >= 60) return { name: 'Raro', color: 'from-blue-500 to-cyan-500', icon: '⭐' };
    if (score >= 40) return { name: 'Comum', color: 'from-green-500 to-emerald-500', icon: '🌟' };
    return { name: 'Iniciante', color: 'from-gray-500 to-gray-600', icon: '🔰' };
  };

  const rank = getRank(totalScore);

  return (
    <NeonCard glowColor={totalScore >= 75 ? 'gold' : 'cyan'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${rank.color} flex items-center justify-center border-4 border-white/20`}>
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">Power Score Financeiro</h3>
              <p className="text-gray-400 text-sm">Sua força financeira em radar</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${rank.color} px-4 py-2 rounded-full border-2 border-white/30`}>
              <span className="text-2xl">{rank.icon}</span>
              <div>
                <p className="text-white font-bold text-lg">{totalScore.toFixed(0)}</p>
                <p className="text-white/80 text-xs">{rank.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-[#0a0a1a] rounded-xl p-4 border border-cyan-500/30">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#333" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#888', fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]}
                tick={{ fill: '#888', fontSize: 10 }}
              />
              <Radar 
                name="Score" 
                dataKey="value" 
                stroke="#00FFFF" 
                fill="#00FFFF" 
                fillOpacity={0.5}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Scores */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Poupança', value: scores.savings, icon: Coins, color: 'text-green-400' },
            { label: 'Investimento', value: scores.investment, icon: TrendingUp, color: 'text-cyan-400' },
            { label: 'Dívidas', value: scores.debtManagement, icon: Shield, color: 'text-blue-400' },
            { label: 'Orçamento', value: scores.budgetControl, icon: Target, color: 'text-purple-400' },
            { label: 'Consistência', value: scores.consistency, icon: Zap, color: 'text-orange-400' },
            { label: 'Educação', value: scores.education, icon: Award, color: 'text-yellow-400' }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-black/30 border border-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-gray-400 text-xs">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${
                        item.value >= 75 ? 'from-green-500 to-emerald-500' :
                        item.value >= 50 ? 'from-yellow-500 to-orange-500' :
                        'from-red-500 to-red-600'
                      }`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                  <span className="text-white font-bold text-sm">{item.value.toFixed(0)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tips */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
          <p className="text-cyan-400 text-xs">
            <strong>💡 Dica:</strong> {
              totalScore >= 75 ? 'Você está no topo! Continue assim e inspire outros.' :
              totalScore >= 50 ? 'Bom trabalho! Foque em melhorar suas áreas mais fracas.' :
              'Não desanime! Pequenos passos diários levam a grandes conquistas.'
            }
          </p>
        </div>
      </div>
    </NeonCard>
  );
}