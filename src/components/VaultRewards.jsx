import { Gift, Lock, Sparkles, Unlock } from 'lucide-react';
import NeonCard from './NeonCard';

const REWARDS = [
  { 
    id: 'icons_bronze', 
    name: 'Ícones Bronze', 
    type: 'icons', 
    icons: ['💼', '🎒', '🏡', '🚙'],
    requirement: 'Economizar R$ 500',
    requiredAmount: 500,
    color: '#CD7F32'
  },
  { 
    id: 'icons_silver', 
    name: 'Ícones Prata', 
    type: 'icons', 
    icons: ['✈️', '🏖️', '🎓', '💍'],
    requirement: 'Economizar R$ 2.000',
    requiredAmount: 2000,
    color: '#C0C0C0'
  },
  { 
    id: 'icons_gold', 
    name: 'Ícones Ouro', 
    type: 'icons', 
    icons: ['🏰', '🚁', '💎', '👑'],
    requirement: 'Economizar R$ 5.000',
    requiredAmount: 5000,
    color: '#FFD700'
  },
  { 
    id: 'tip_emergency', 
    name: 'Dica: Fundo de Emergência', 
    type: 'tip', 
    tip: 'Mantenha de 3 a 6 meses de despesas em um fundo de emergência líquido e de fácil acesso. Isso te protege de imprevistos sem precisar recorrer a dívidas.',
    requirement: 'Completar 1 meta',
    requiredGoals: 1,
    color: '#00FFFF'
  },
  { 
    id: 'tip_compound', 
    name: 'Dica: Juros Compostos', 
    type: 'tip', 
    tip: 'Os juros compostos são a magia da matemática financeira! Quanto mais cedo você começar a investir, mais tempo seu dinheiro terá para crescer exponencialmente.',
    requirement: 'Completar 2 metas',
    requiredGoals: 2,
    color: '#39FF14'
  },
  { 
    id: 'tip_diversification', 
    name: 'Dica: Diversificação', 
    type: 'tip', 
    tip: 'Não coloque todos os ovos na mesma cesta! Diversifique seus investimentos entre diferentes ativos (renda fixa, ações, fundos) para reduzir riscos.',
    requirement: 'Completar 3 metas',
    requiredGoals: 3,
    color: '#FF00FF'
  },
  { 
    id: 'theme_cyberpunk', 
    name: 'Tema Cyberpunk', 
    type: 'theme', 
    preview: '🌃',
    requirement: '30 dias de streak',
    requiredStreak: 30,
    color: '#FF00FF'
  },
  { 
    id: 'theme_nature', 
    name: 'Tema Natureza', 
    type: 'theme', 
    preview: '🌿',
    requirement: '60 dias de streak',
    requiredStreak: 60,
    color: '#39FF14'
  },
];

export default function VaultRewards({ goals, userData }) {
  const totalSaved = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const streak = userData?.vault_deposit_streak || 0;

  const isRewardUnlocked = (reward) => {
    if (reward.requiredAmount) return totalSaved >= reward.requiredAmount;
    if (reward.requiredGoals) return completedGoals >= reward.requiredGoals;
    if (reward.requiredStreak) return streak >= reward.requiredStreak;
    return false;
  };

  const unlockedRewards = REWARDS.filter(isRewardUnlocked);
  const lockedRewards = REWARDS.filter(r => !isRewardUnlocked(r));

  return (
    <NeonCard glowColor="magenta" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-magenta-500/20 to-purple-500/20 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-magenta-500 to-purple-500 flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Recompensas</h3>
              <p className="text-gray-400 text-sm">
                {unlockedRewards.length} de {REWARDS.length} desbloqueadas
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Unlocked Rewards */}
          {unlockedRewards.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Unlock className="w-5 h-5 text-green-400" />
                <h4 className="text-white font-bold">Desbloqueadas</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {unlockedRewards.map(reward => (
                  <div
                    key={reward.id}
                    className="p-4 rounded-xl border-2 border-green-500/50 bg-gradient-to-br from-green-500/20 to-cyan-500/20"
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ 
                          backgroundColor: `${reward.color}20`,
                          border: `2px solid ${reward.color}50`
                        }}
                      >
                        {reward.type === 'icons' ? reward.icons[0] : reward.type === 'tip' ? '💡' : reward.preview}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold mb-1">{reward.name}</p>
                        <p className="text-gray-400 text-xs mb-2">{reward.requirement}</p>
                        
                        {reward.type === 'icons' && (
                          <div className="flex gap-1">
                            {reward.icons.map((icon, i) => (
                              <span key={i} className="text-2xl">{icon}</span>
                            ))}
                          </div>
                        )}
                        
                        {reward.type === 'tip' && (
                          <p className="text-cyan-400 text-sm leading-relaxed mt-2 p-2 bg-[#0a0a1a] rounded-lg border border-cyan-500/20">
                            {reward.tip}
                          </p>
                        )}
                        
                        {reward.type === 'theme' && (
                          <p className="text-magenta-400 text-sm">Tema visual desbloqueado!</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked Rewards */}
          {lockedRewards.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-5 h-5 text-gray-500" />
                <h4 className="text-white font-bold">Bloqueadas</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {lockedRewards.map(reward => (
                  <div
                    key={reward.id}
                    className="relative p-4 rounded-xl border-2 border-gray-700 bg-gray-900/50 opacity-70"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-800 border-2 border-gray-700 flex items-center justify-center relative">
                        <Lock className="w-6 h-6 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-300 font-bold mb-1">{reward.name}</p>
                        <p className="text-gray-500 text-xs">{reward.requirement}</p>
                        
                        {reward.requiredAmount && (
                          <div className="mt-2">
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-cyan-500 to-magenta-500"
                                style={{ width: `${Math.min((totalSaved / reward.requiredAmount) * 100, 100)}%` }}
                              />
                            </div>
                            <p className="text-gray-500 text-xs mt-1">
                              R$ {totalSaved.toFixed(2)} / R$ {reward.requiredAmount}
                            </p>
                          </div>
                        )}
                        
                        {reward.requiredGoals && (
                          <p className="text-gray-500 text-xs mt-2">
                            {completedGoals} / {reward.requiredGoals} metas completadas
                          </p>
                        )}
                        
                        {reward.requiredStreak && (
                          <p className="text-gray-500 text-xs mt-2">
                            {streak} / {reward.requiredStreak} dias de streak
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {unlockedRewards.length === REWARDS.length && (
          <div className="mt-6 p-4 bg-gradient-to-r from-magenta-500/20 to-purple-500/20 border border-magenta-500/50 rounded-xl text-center">
            <Sparkles className="w-8 h-8 text-magenta-400 mx-auto mb-2" />
            <p className="text-magenta-400 font-bold text-lg mb-1">🎉 Todas as Recompensas Desbloqueadas!</p>
            <p className="text-gray-300 text-sm">Você conquistou tudo que estava disponível!</p>
          </div>
        )}
      </div>
    </NeonCard>
  );
}