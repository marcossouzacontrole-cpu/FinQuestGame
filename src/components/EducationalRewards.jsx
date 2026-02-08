import { Gift, Lock, Star, Sparkles } from 'lucide-react';
import NeonCard from './NeonCard';

const EDUCATIONAL_REWARDS = [
  {
    id: 'advanced_strategies',
    name: 'Estratégias Avançadas',
    type: 'content',
    icon: '🎯',
    description: 'Desbloqueie guias avançados de investimento',
    requirement: 15,
    color: '#00FFFF'
  },
  {
    id: 'exclusive_tips',
    name: 'Dicas Exclusivas',
    type: 'content',
    icon: '💡',
    description: 'Acesso a dicas semanais exclusivas',
    requirement: 10,
    color: '#8A2BE2'
  },
  {
    id: 'custom_avatar',
    name: 'Avatar Personalizado',
    type: 'cosmetic',
    icon: '👤',
    description: 'Personalize seu avatar com itens especiais',
    requirement: 20,
    color: '#FFD700'
  },
  {
    id: 'title_scholar',
    name: 'Título: Estudioso',
    type: 'cosmetic',
    icon: '🎓',
    description: 'Exiba o título "Estudioso" no seu perfil',
    requirement: 25,
    color: '#39FF14'
  },
  {
    id: 'profile_border',
    name: 'Borda Dourada',
    type: 'cosmetic',
    icon: '🌟',
    description: 'Borda dourada exclusiva para seu perfil',
    requirement: 30,
    color: '#FFD700'
  },
  {
    id: 'mentor_badge',
    name: 'Badge de Mentor',
    type: 'cosmetic',
    icon: '👨‍🏫',
    description: 'Mostre que você domina educação financeira',
    requirement: 40,
    color: '#FF00FF'
  },
  {
    id: 'xp_boost',
    name: 'Boost de XP +10%',
    type: 'bonus',
    icon: '⚡',
    description: '+10% de XP em todas as atividades',
    requirement: 35,
    color: '#FF8C00'
  },
  {
    id: 'gold_boost',
    name: 'Boost de Gold +15%',
    type: 'bonus',
    icon: '💰',
    description: '+15% de Gold Coins em todas as atividades',
    requirement: 45,
    color: '#FFD700'
  }
];

export default function EducationalRewards({ completedModules = [], dailyContentsRead = 0 }) {
  const totalProgress = completedModules.length + dailyContentsRead;
  
  const rewardsStatus = EDUCATIONAL_REWARDS.map(reward => ({
    ...reward,
    unlocked: totalProgress >= reward.requirement,
    progress: Math.min((totalProgress / reward.requirement) * 100, 100)
  }));
  
  const unlocked = rewardsStatus.filter(r => r.unlocked);
  const locked = rewardsStatus.filter(r => !r.unlocked);
  
  return (
    <NeonCard glowColor="gold" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Recompensas Educacionais</h3>
              <p className="text-gray-400 text-sm">
                {unlocked.length} de {EDUCATIONAL_REWARDS.length} desbloqueadas
              </p>
            </div>
          </div>
        </div>

        {/* Unlocked Rewards */}
        {unlocked.length > 0 && (
          <div className="mb-6">
            <h4 className="text-yellow-400 font-semibold text-sm mb-3 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Desbloqueadas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {unlocked.map((reward) => (
                <div
                  key={reward.id}
                  className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-4 border-2 border-yellow-500/50 shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:scale-105 transition-transform"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-4xl drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
                      {reward.icon}
                    </span>
                    <div className="flex-1">
                      <h5 className="text-white font-bold text-sm mb-1">{reward.name}</h5>
                      <p className="text-gray-400 text-xs mb-2">{reward.description}</p>
                      <div className="flex items-center gap-2">
                        <div className="bg-yellow-500/20 rounded-lg px-2 py-1 border border-yellow-500/30">
                          <span className="text-yellow-400 text-xs font-bold uppercase">
                            {reward.type}
                          </span>
                        </div>
                        <Sparkles className="w-3 h-3 text-yellow-400" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Rewards */}
        {locked.length > 0 && (
          <div>
            <h4 className="text-gray-500 font-semibold text-sm mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Bloqueadas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {locked.map((reward) => (
                <div
                  key={reward.id}
                  className="bg-[#0a0a1a]/80 rounded-xl p-4 border border-gray-700/50"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-4xl grayscale opacity-40">{reward.icon}</span>
                    <div className="flex-1">
                      <h5 className="text-gray-500 font-bold text-sm mb-1">{reward.name}</h5>
                      <p className="text-gray-600 text-xs mb-3">{reward.description}</p>
                      
                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Progresso</span>
                          <span className="text-gray-500 font-bold">
                            {totalProgress}/{reward.requirement} conteúdos
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
                            style={{ width: `${reward.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {unlocked.length === EDUCATIONAL_REWARDS.length && (
          <div className="mt-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30">
            <p className="text-yellow-400 font-bold text-center">
              🎊 PARABÉNS! Você desbloqueou TODAS as recompensas educacionais! 🎊
            </p>
          </div>
        )}
      </div>
    </NeonCard>
  );
}