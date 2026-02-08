import { Trophy, Target, Zap, Coins } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import NeonCard from './NeonCard';
import CharacterAvatar from './CharacterAvatar';

const LEVEL_TITLES = {
  1: { title: 'Novato', color: 'from-gray-500 to-gray-600', icon: '🌱' },
  3: { title: 'Explorador', color: 'from-blue-500 to-cyan-500', icon: '🧭' },
  5: { title: 'Conquistador', color: 'from-green-500 to-emerald-500', icon: '⚔️' },
  8: { title: 'Mestre', color: 'from-purple-500 to-violet-500', icon: '🎓' },
  10: { title: 'Lendário', color: 'from-yellow-500 to-orange-500', icon: '👑' }
};

function getLevelTitle(level) {
  const keys = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const key of keys) {
    if (level >= key) return LEVEL_TITLES[key];
  }
  return LEVEL_TITLES[1];
}

export default function LevelProgressCard({ user }) {
  const xpToNextLevel = user.level * 100;
  const progress = (user.xp / xpToNextLevel) * 100;
  const levelData = getLevelTitle(user.level);

  // Fetch goals to calculate completion rate
  const { data: goals = [] } = useQuery({
    queryKey: ['userGoals', user.email],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      return await base44.entities.Goal.filter({ created_by: currentUser.email });
    },
    enabled: !!user?.email
  });

  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const goalsCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  return (
    <NeonCard glowColor="purple" className="relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/10 to-magenta-500/10 rounded-full blur-3xl" />
      
      <div className="relative">
        <div className="flex items-start gap-6">
          {/* Character Avatar */}
          <div className="flex-shrink-0">
            <CharacterAvatar 
              skin={user.character_skin}
              accessories={user.character_accessories}
              size="xl"
              showGlow={true}
            />
          </div>

          {/* Progress Info */}
          <div className="flex-1 space-y-4">
            {/* Level & Title */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`px-4 py-1 rounded-full bg-gradient-to-r ${levelData.color} flex items-center gap-2`}>
                  <span className="text-2xl">{levelData.icon}</span>
                  <span className="text-white font-black text-lg">Nível {user.level}</span>
                </div>
                <span className="text-cyan-400 font-bold text-xl">{levelData.title}</span>
              </div>
              <p className="text-gray-400 text-sm">
                {user.full_name || 'Jogador'} • {user.email}
              </p>
            </div>

            {/* XP Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-cyan-400 font-semibold flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  {user.xp} / {xpToNextLevel} XP
                </span>
                <span className="text-magenta-400 font-semibold">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-3 bg-[#0a0a1a] rounded-full overflow-hidden border border-cyan-500/30">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 via-magenta-500 to-cyan-500 transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-400 text-xs">Total XP</span>
                </div>
                <span className="text-white font-bold">{user.total_xp.toLocaleString()}</span>
              </div>
              
              <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-400 text-xs">Gold</span>
                </div>
                <span className="text-yellow-400 font-bold">{user.gold_coins || 0}</span>
              </div>

              <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400 text-xs">Metas</span>
                </div>
                <span className="text-green-400 font-bold text-sm">
                  {goalsCompletionRate}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NeonCard>
  );
}