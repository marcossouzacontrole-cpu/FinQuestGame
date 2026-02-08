import { Brain, TrendingUp, Target, Zap } from 'lucide-react';
import NeonCard from './NeonCard';

export default function VaultSmartRecommendations({ goals, userData }) {
  const activeGoals = goals.filter(g => g.status === 'forging');
  
  if (activeGoals.length === 0) {
    return (
      <NeonCard glowColor="purple">
        <div className="text-center py-6">
          <Brain className="w-10 h-10 text-purple-400 mx-auto mb-3" />
          <p className="text-gray-400">Crie uma meta para receber recomendações inteligentes!</p>
        </div>
      </NeonCard>
    );
  }

  const avgMonthlyDeposit = userData?.avg_monthly_vault_deposit || 500;

  const recommendations = activeGoals.map(goal => {
    const remaining = goal.target_amount - (goal.current_amount || 0);
    const progress = ((goal.current_amount || 0) / goal.target_amount) * 100;
    
    const recommendedDeposit = Math.min(remaining * 0.2, avgMonthlyDeposit);
    const monthsToComplete = recommendedDeposit > 0 ? Math.ceil(remaining / recommendedDeposit) : 0;
    
    let urgency = 'low';
    let message = '';
    
    if (progress >= 80) {
      urgency = 'high';
      message = `Faltam apenas ${(100 - progress).toFixed(0)}%! Um depósito de R$ ${remaining.toFixed(2)} completa esta meta! 🎯`;
    } else if (progress >= 50) {
      urgency = 'medium';
      message = `Você está na metade do caminho! Sugestão: deposite R$ ${recommendedDeposit.toFixed(2)} por mês. ⚡`;
    } else {
      urgency = 'low';
      message = `Progresso: ${progress.toFixed(0)}%. Deposite R$ ${recommendedDeposit.toFixed(2)}/mês para completar em ${monthsToComplete} meses. 📈`;
    }

    return {
      goal,
      recommendedDeposit,
      monthsToComplete,
      urgency,
      message,
      remaining
    };
  });

  const sortedRecommendations = recommendations.sort((a, b) => {
    const urgencyOrder = { high: 3, medium: 2, low: 1 };
    return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
  });

  const urgencyColors = {
    high: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: Target },
    medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: Zap },
    low: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: TrendingUp }
  };

  return (
    <NeonCard glowColor="purple">
      <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5 text-purple-400" />
        Recomendações Inteligentes
      </h3>

      <div className="space-y-3">
        {sortedRecommendations.slice(0, 3).map((rec) => {
          const colors = urgencyColors[rec.urgency];
          const Icon = colors.icon;
          
          return (
            <div
              key={rec.goal.id}
              className={`${colors.bg} border ${colors.border} rounded-lg p-4`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${colors.text} mt-0.5`} />
                <div className="flex-1">
                  <p className="text-white font-semibold mb-1">{rec.goal.name}</p>
                  <p className={`${colors.text} text-sm mb-2`}>{rec.message}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Falta: R$ {rec.remaining.toFixed(2)}</span>
                    <span>•</span>
                    <span>Sugestão: R$ {rec.recommendedDeposit.toFixed(2)}/mês</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </NeonCard>
  );
}