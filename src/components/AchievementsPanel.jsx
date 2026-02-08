import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Lock, Sparkles } from 'lucide-react';
import NeonCard from './NeonCard';
import { Badge } from '@/components/ui/badge';

export default function AchievementsPanel({ user }) {
  // Fetch achievement definitions
  const { data: achievementDefs = [] } = useQuery({
    queryKey: ['achievementDefinitions'],
    queryFn: () => base44.entities.AchievementDefinition.list()
  });

  // Fetch user achievements
  const { data: userAchievements = [] } = useQuery({
    queryKey: ['userAchievements'],
    queryFn: () => base44.entities.UserAchievement.list(),
    enabled: !!user
  });

  // Fetch progress data
  const { data: missions = [] } = useQuery({
    queryKey: ['allMissions'],
    queryFn: () => base44.entities.Mission.filter({ status: 'completed' })
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['allGoals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'completed' })
  });

  const getProgress = (achievement) => {
    let current = 0;
    switch (achievement.trigger_type) {
      case 'missions_count': current = missions.length; break;
      case 'goals_count': current = goals.length; break;
      case 'level': current = user?.level || 0; break;
      case 'xp': current = user?.total_xp || 0; break;
      case 'gold_coins': current = user?.gold_coins || 0; break;
      case 'streak': current = user?.login_streak || 0; break;
      default: current = 0;
    }
    return current;
  };

  const rarityColors = {
    common: { bg: 'from-gray-600 to-gray-800', border: 'border-gray-500', glow: 'rgba(107,114,128,0.5)' },
    rare: { bg: 'from-blue-600 to-blue-800', border: 'border-blue-500', glow: 'rgba(59,130,246,0.5)' },
    epic: { bg: 'from-purple-600 to-purple-800', border: 'border-purple-500', glow: 'rgba(168,85,247,0.5)' },
    legendary: { bg: 'from-yellow-500 to-orange-600', border: 'border-yellow-500', glow: 'rgba(251,191,36,0.5)' }
  };

  const unlockedCount = userAchievements.filter(ua => ua.unlocked).length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <NeonCard glowColor="gold" className="text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Trophy className="w-12 h-12 text-yellow-400 animate-pulse" />
          <div>
            <p className="text-4xl font-black text-yellow-400">{unlockedCount}/{achievementDefs.length}</p>
            <p className="text-gray-400 text-sm">Conquistas Desbloqueadas</p>
          </div>
        </div>
        <div className="h-3 bg-[#0a0a1a] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
            style={{ width: `${(unlockedCount / achievementDefs.length) * 100}%` }}
          />
        </div>
      </NeonCard>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievementDefs.map(achievement => {
          const userAch = userAchievements.find(ua => ua.achievement_id === achievement.id);
          const isUnlocked = userAch?.unlocked || false;
          const progress = getProgress(achievement);
          const progressPercent = Math.min((progress / achievement.trigger_value) * 100, 100);
          const rarity = rarityColors[achievement.rarity];

          return (
            <NeonCard 
              key={achievement.id}
              glowColor={achievement.rarity === 'legendary' ? 'gold' : 'purple'}
              className={`relative overflow-hidden ${isUnlocked ? `border-2 ${rarity.border}` : 'opacity-60'}`}
            >
              {isUnlocked && (
                <div 
                  className={`absolute inset-0 bg-gradient-to-br ${rarity.bg} opacity-10`}
                  style={{ 
                    boxShadow: `inset 0 0 30px ${rarity.glow}`
                  }}
                />
              )}

              <div className="relative space-y-3">
                {/* Icon & Status */}
                <div className="flex items-start justify-between">
                  <div className="text-5xl filter" style={{ 
                    filter: isUnlocked ? 'none' : 'grayscale(100%)' 
                  }}>
                    {achievement.icon}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`${rarity.bg} text-white border-0`}>
                      {achievement.rarity.toUpperCase()}
                    </Badge>
                    {isUnlocked ? (
                      <Badge className="bg-green-500/20 text-green-400 border border-green-500/50">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Desbloqueada
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-700 text-gray-400 border border-gray-600">
                        <Lock className="w-3 h-3 mr-1" />
                        Bloqueada
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">{achievement.title}</h3>
                  <p className="text-gray-400 text-sm">{achievement.description}</p>
                </div>

                {/* Progress Bar */}
                {!isUnlocked && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Progresso</span>
                      <span className="text-white font-bold">{progress}/{achievement.trigger_value}</span>
                    </div>
                    <div className="h-2 bg-[#0a0a1a] rounded-full overflow-hidden border border-cyan-500/30">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-magenta-500 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Rewards */}
                {(achievement.gold_reward > 0 || achievement.xp_reward > 0) && (
                  <div className="flex gap-2 pt-2 border-t border-cyan-500/20">
                    {achievement.xp_reward > 0 && (
                      <div className="bg-cyan-900/20 border border-cyan-500/30 rounded px-3 py-1 flex items-center gap-1">
                        <span className="text-cyan-400 text-xs font-bold">+{achievement.xp_reward} XP</span>
                      </div>
                    )}
                    {achievement.gold_reward > 0 && (
                      <div className="bg-yellow-900/20 border border-yellow-500/30 rounded px-3 py-1 flex items-center gap-1">
                        <span className="text-yellow-400 text-xs font-bold">+{achievement.gold_reward} 💰</span>
                      </div>
                    )}
                  </div>
                )}

                {isUnlocked && userAch?.unlocked_date && (
                  <p className="text-gray-500 text-xs">
                    Desbloqueada em {new Date(userAch.unlocked_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </NeonCard>
          );
        })}
      </div>
    </div>
  );
}