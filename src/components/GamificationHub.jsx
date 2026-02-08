import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Zap, Trophy, Flame, Award, Users, 
  Sparkles
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const NeonCard = ({ children, glowColor = 'cyan' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    purple: 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    green: 'border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.15)]',
    gold: 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)]'
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 bg-slate-900/80 ${colors[glowColor]}`}>
      {children}
    </div>
  );
};

const AchievementBadge = ({ icon, title, unlocked = false }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className={`text-center p-4 rounded-xl border transition-all ${
      unlocked
        ? 'border-yellow-500/50 bg-yellow-500/10 cursor-pointer'
        : 'border-slate-600/30 bg-slate-800/30 opacity-50'
    }`}
  >
    <div className="text-4xl mb-2">{icon}</div>
    <p className="text-xs font-bold text-white">{title}</p>
    {unlocked && <div className="text-xs text-yellow-400 mt-1">✓ Desbloqueado</div>}
  </motion.div>
);

export default function GamificationHub() {
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: gamificationData } = useQuery({
    queryKey: ['gamification', currentUser?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke('getGamificationProfile', {});
      return response.data;
    },
    enabled: !!currentUser,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboard', 'points'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getLeaderboard', { type: 'points', limit: 10 });
      return response.data;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const achievements = [
    { id: 'first_transaction', icon: '💸', title: 'Primeiro Passo', unlocked: gamificationData?.profile?.achievements?.includes('first_transaction') },
    { id: 'goal_master', icon: '🎯', title: 'Mestre de Metas', unlocked: gamificationData?.profile?.achievements?.includes('goal_master') },
    { id: 'streak_7', icon: '🔥', title: '7 Dias em Fila', unlocked: gamificationData?.profile?.achievements?.includes('streak_7') },
    { id: 'level_10', icon: '⭐', title: 'Nível 10', unlocked: (gamificationData?.profile?.level || 0) >= 10 },
    { id: 'student', icon: '📚', title: 'Estudante', unlocked: gamificationData?.profile?.achievements?.includes('student') },
    { id: 'investor', icon: '📈', title: 'Investidor', unlocked: gamificationData?.profile?.achievements?.includes('investor') },
    { id: 'streak_30', icon: '👑', title: 'Campeão (30 dias)', unlocked: gamificationData?.profile?.achievements?.includes('streak_30') },
    { id: 'millionaire', icon: '💎', title: 'Milionário', unlocked: gamificationData?.profile?.achievements?.includes('millionaire') }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {/* Level */}
        <NeonCard glowColor="purple">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="w-6 h-6 text-purple-400" />
            <span className="text-xs text-slate-400">NÍVEL</span>
          </div>
          <p className="text-4xl font-black text-purple-400">{gamificationData?.profile?.level || 1}</p>
          <p className="text-xs text-slate-400 mt-2">
            {gamificationData?.profile?.nextLevelPoints || 0} pontos para próximo nível
          </p>
        </NeonCard>

        {/* Total Points */}
        <NeonCard glowColor="cyan">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-6 h-6 text-cyan-400" />
            <span className="text-xs text-slate-400">PONTOS</span>
          </div>
          <p className="text-4xl font-black text-cyan-400">{gamificationData?.profile?.totalPoints || 0}</p>
          <p className="text-xs text-slate-400 mt-2">Acumulados</p>
        </NeonCard>

        {/* Streak */}
        <NeonCard glowColor="green">
          <div className="flex items-center justify-between mb-2">
            <Flame className="w-6 h-6 text-green-400" />
            <span className="text-xs text-slate-400">SEQUÊNCIA</span>
          </div>
          <p className="text-4xl font-black text-green-400">{gamificationData?.profile?.streak || 0}</p>
          <p className="text-xs text-slate-400 mt-2">Dias consecutivos</p>
        </NeonCard>

        {/* Achievements */}
        <NeonCard glowColor="gold">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-6 h-6 text-yellow-400" />
            <span className="text-xs text-slate-400">CONQUISTAS</span>
          </div>
          <p className="text-4xl font-black text-yellow-400">{gamificationData?.profile?.achievements?.length || 0}</p>
          <p className="text-xs text-slate-400 mt-2">Desbloqueadas</p>
        </NeonCard>
      </motion.div>

      {/* XP Progress */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="text-white font-black text-lg">Progresso para Próximo Nível</h3>
        <NeonCard glowColor="cyan">
          <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${gamificationData?.profile?.progressPercentage || 0}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>{gamificationData?.profile?.xp || 0} XP</span>
            <span>{gamificationData?.profile?.xpToNextLevel || 0} XP</span>
          </div>
        </NeonCard>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="achievements" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="achievements" className="data-[state=active]:bg-cyan-600">
            <Award className="w-4 h-4 mr-2" /> Conquistas
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-purple-600">
            <Users className="w-4 h-4 mr-2" /> Ranking
          </TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements">
          <NeonCard glowColor="cyan">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {achievements.map((achievement) => (
                <AchievementBadge
                  key={achievement.id}
                  icon={achievement.icon}
                  title={achievement.title}
                  unlocked={achievement.unlocked}
                />
              ))}
            </div>
          </NeonCard>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <NeonCard glowColor="purple">
            <div className="space-y-2">
              {leaderboardData?.leaderboard?.map((user, idx) => (
                <motion.div
                  key={user.email}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white ${
                      idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-slate-700'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{user.name}</p>
                      <p className="text-xs text-slate-400">Nível {user.level}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-cyan-400">{user.points}</p>
                    <p className="text-xs text-slate-400">pontos</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-xs text-slate-400 mt-4">
              Sua posição: <span className="font-bold text-cyan-400">#{leaderboardData?.userRank}</span>
            </p>
          </NeonCard>
        </TabsContent>
      </Tabs>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4"
      >
        <div className="flex gap-3">
          <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-300">
            <p className="font-bold text-blue-300 mb-1">💡 Dica de Pontos</p>
            <p className="text-xs">
              Registre transações (+10 pts), crie metas (+50 pts), complete modelos de academia (+30 pts) e mantenha sua sequência diária para ganhar mais pontos!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}