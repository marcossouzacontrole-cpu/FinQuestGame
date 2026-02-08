import { Coins, Target, Flame, TrendingUp } from 'lucide-react';
import NeonCard from './NeonCard';

export default function VaultOverviewCards({ goals, userData }) {
  const activeGoals = goals.filter(g => g.status === 'forging');
  const completedGoals = goals.filter(g => g.status === 'completed');
  
  const totalSaved = activeGoals.reduce((sum, goal) => sum + (goal.current_amount || 0), 0);
  const totalTarget = activeGoals.reduce((sum, goal) => sum + goal.target_amount, 0);
  
  const nearCompletionGoals = activeGoals.filter(goal => {
    const progress = (goal.current_amount / goal.target_amount) * 100;
    return progress >= 80;
  });
  
  const depositStreak = userData?.vault_deposit_streak || 0;
  const lastDepositDate = userData?.last_vault_deposit || null;
  
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <NeonCard glowColor="cyan" className="text-center">
        <Coins className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
        <p className="text-3xl font-black text-white mb-1">
          R$ {totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-gray-400 text-sm">Total Aportado</p>
        <p className="text-cyan-400 text-xs mt-1">
          {overallProgress.toFixed(1)}% do total
        </p>
      </NeonCard>

      <NeonCard glowColor="magenta" className="text-center">
        <Target className="w-8 h-8 text-purple-400 mx-auto mb-2" />
        <p className="text-3xl font-black text-white mb-1">{nearCompletionGoals.length}</p>
        <p className="text-gray-400 text-sm">Perto de Completar</p>
        <p className="text-purple-400 text-xs mt-1">
          {nearCompletionGoals.length > 0 ? '80%+ de progresso' : 'Continue depositando!'}
        </p>
      </NeonCard>

      <NeonCard glowColor="green" className="text-center">
        <Flame className="w-8 h-8 text-orange-400 mx-auto mb-2" />
        <p className="text-3xl font-black text-white mb-1">{depositStreak}</p>
        <p className="text-gray-400 text-sm">Dias de Streak</p>
        <p className="text-orange-400 text-xs mt-1">
          {depositStreak > 0 ? 'Continue assim!' : 'Faça um depósito hoje'}
        </p>
      </NeonCard>

      <NeonCard glowColor="gold" className="text-center">
        <TrendingUp className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
        <p className="text-3xl font-black text-white mb-1">{completedGoals.length}</p>
        <p className="text-gray-400 text-sm">Metas Completas</p>
        <p className="text-yellow-400 text-xs mt-1">
          {completedGoals.length > 0 ? 'Parabéns!' : 'Sua primeira está próxima'}
        </p>
      </NeonCard>
    </div>
  );
}