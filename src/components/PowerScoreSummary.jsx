import NeonCard from './NeonCard';
import { Zap, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function PowerScoreSummary({ userData, netWorthData, financialProfile, goals }) {
  // Calculate individual scores
  const savingsScore = Math.min(100, ((financialProfile?.savings_percentage || 0) / 20) * 100);
  
  const totalAssets = (netWorthData?.assets || []).reduce((sum, a) => sum + a.value, 0);
  const investmentScore = Math.min(100, (totalAssets / 10000) * 100);
  
  const totalDebts = (netWorthData?.debts || []).reduce((sum, d) => sum + d.outstanding_balance, 0);
  const debtScore = Math.max(0, 100 - (totalDebts / 1000) * 10);
  
  const budgetScore = financialProfile?.expense_tracking_frequency === 'Diariamente' ? 100 
    : financialProfile?.expense_tracking_frequency === 'Semanalmente' ? 75 
    : financialProfile?.expense_tracking_frequency === 'Mensalmente' ? 50 : 25;
  
  const totalGoals = (goals || []).length;
  const completedGoals = (goals || []).filter(g => g.status === 'completed').length;
  const consistencyScore = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
  
  const educationScore = Math.min(100, ((userData?.level || 1) / 10) * 100);
  
  const overallScore = Math.round(
    (savingsScore + investmentScore + debtScore + budgetScore + consistencyScore + educationScore) / 6
  );

  // Determine rank
  const getRank = (score) => {
    if (score >= 90) return { name: 'Lendário', color: 'from-yellow-500 to-orange-500', icon: '👑' };
    if (score >= 75) return { name: 'Elite', color: 'from-purple-500 to-pink-500', icon: '💎' };
    if (score >= 60) return { name: 'Avançado', color: 'from-blue-500 to-cyan-500', icon: '⭐' };
    if (score >= 40) return { name: 'Intermediário', color: 'from-green-500 to-emerald-500', icon: '🛡️' };
    return { name: 'Iniciante', color: 'from-gray-500 to-gray-600', icon: '🌱' };
  };

  const rank = getRank(overallScore);

  // Personalized tips based on weakest areas
  const weaknesses = [
    { name: 'Poupança', score: savingsScore, tip: 'Aumente sua taxa de poupança mensal para fortalecer sua base financeira.' },
    { name: 'Investimentos', score: investmentScore, tip: 'Considere diversificar seus investimentos para crescimento de longo prazo.' },
    { name: 'Dívidas', score: debtScore, tip: 'Priorize o pagamento de dívidas com juros altos usando estratégias como avalanche.' },
    { name: 'Orçamento', score: budgetScore, tip: 'Rastreie seus gastos diariamente para maior controle financeiro.' },
    { name: 'Consistência', score: consistencyScore, tip: 'Complete mais metas financeiras para construir momentum positivo.' },
    { name: 'Educação', score: educationScore, tip: 'Continue subindo de nível para desbloquear novas habilidades financeiras.' }
  ].sort((a, b) => a.score - b.score);

  const topWeakness = weaknesses[0];

  return (
    <NeonCard glowColor="purple">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${rank.color} flex items-center justify-center`}>
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Power Score</h3>
          <p className="text-gray-400 text-sm">Saúde Financeira Total</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-4xl">{rank.icon}</span>
            <div>
              <p className="text-white font-bold text-xl">{overallScore}/100</p>
              <p className="text-gray-400 text-sm">Rank: {rank.name}</p>
            </div>
          </div>
        </div>
        
        <div className="h-4 bg-[#0a0a1a] rounded-full overflow-hidden border border-white/10">
          <div 
            className={`h-full bg-gradient-to-r ${rank.color} transition-all duration-500`}
            style={{ width: `${overallScore}%` }}
          />
        </div>
      </div>

      {/* Top Weakness Alert */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-orange-400 font-semibold text-sm mb-1">Área para Melhorar: {topWeakness.name}</p>
            <p className="text-gray-300 text-xs">{topWeakness.tip}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {weaknesses.slice(0, 3).map((w, idx) => {
          const Icon = w.score >= 70 ? CheckCircle2 : w.score >= 40 ? TrendingUp : AlertTriangle;
          const color = w.score >= 70 ? 'text-green-400' : w.score >= 40 ? 'text-yellow-400' : 'text-red-400';
          
          return (
            <div key={idx} className="bg-black/30 rounded-lg p-2 text-center border border-white/5">
              <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
              <p className="text-xs text-gray-400">{w.name}</p>
              <p className={`text-sm font-bold ${color}`}>{Math.round(w.score)}</p>
            </div>
          );
        })}
      </div>
    </NeonCard>
  );
}