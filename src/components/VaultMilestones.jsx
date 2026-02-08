import { Trophy } from 'lucide-react';
import NeonCard from './NeonCard';

const MILESTONES = [
  { id: 'first_goal', name: 'Primeira Meta', icon: '🎯', requirement: 'complete_1_goal', xp: 100, color: 'cyan' },
  { id: 'saver_bronze', name: 'Poupador Bronze', icon: '🥉', requirement: 'save_1000', xp: 150, color: 'orange' },
  { id: 'saver_silver', name: 'Poupador Prata', icon: '🥈', requirement: 'save_5000', xp: 250, color: 'gray' },
  { id: 'saver_gold', name: 'Poupador Ouro', icon: '🥇', requirement: 'save_10000', xp: 500, color: 'gold' },
  { id: 'goal_master', name: 'Mestre das Metas', icon: '👑', requirement: 'complete_5_goals', xp: 300, color: 'purple' },
  { id: 'vault_legend', name: 'Lenda do Cofre', icon: '💎', requirement: 'save_50000', xp: 1000, color: 'magenta' }
];

export default function VaultMilestones({ goals, totalSaved, userData }) {
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const unlockedMilestones = userData?.vault_milestones || [];

  const checkMilestone = (milestone) => {
    if (unlockedMilestones.includes(milestone.id)) return true;

    switch (milestone.requirement) {
      case 'complete_1_goal':
        return completedGoals >= 1;
      case 'complete_5_goals':
        return completedGoals >= 5;
      case 'save_1000':
        return totalSaved >= 1000;
      case 'save_5000':
        return totalSaved >= 5000;
      case 'save_10000':
        return totalSaved >= 10000;
      case 'save_50000':
        return totalSaved >= 50000;
      default:
        return false;
    }
  };

  const availableMilestones = MILESTONES.map(m => ({
    ...m,
    unlocked: checkMilestone(m)
  }));

  const unlockedCount = availableMilestones.filter(m => m.unlocked).length;

  return (
    <NeonCard glowColor="gold">
      <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-400" />
        Milestones do Cofre
        <span className="text-sm text-gray-400 ml-auto">
          {unlockedCount}/{MILESTONES.length} desbloqueados
        </span>
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {availableMilestones.map((milestone) => (
          <div
            key={milestone.id}
            className={`
              relative p-4 rounded-xl border-2 text-center transition-all duration-300
              ${milestone.unlocked 
                ? `bg-${milestone.color}-500/20 border-${milestone.color}-500/50 shadow-[0_0_15px_rgba(255,215,0,0.3)]` 
                : 'bg-gray-800/30 border-gray-700 grayscale opacity-50'
              }
            `}
          >
            <span className="text-4xl mb-2 block">{milestone.icon}</span>
            <p className={`text-sm font-semibold ${milestone.unlocked ? 'text-white' : 'text-gray-500'}`}>
              {milestone.name}
            </p>
            {milestone.unlocked && (
              <div className="mt-2">
                <span className="text-xs text-green-400 font-semibold">✓ Desbloqueado</span>
                <p className="text-xs text-yellow-400 mt-1">+{milestone.xp} XP</p>
              </div>
            )}
            {!milestone.unlocked && (
              <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </NeonCard>
  );
}