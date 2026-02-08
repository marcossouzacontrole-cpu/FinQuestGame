import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Trophy, Zap, Target, Crown, Medal, Award, Coins, Flame, Filter, ChevronDown, Star, Eye } from 'lucide-react';
import NeonCard from '../components/NeonCard';
import AvatarDisplay from '../components/AvatarDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('total_xp');
  const [timeFilter, setTimeFilter] = useState('all_time');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list('-total_xp');
      return allUsers;
    }
  });

  // Fetch current user
  const { data: currentUserData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      const userData = await base44.entities.User.filter({ created_by: currentUser.email });
      return userData[0];
    }
  });

  // Fetch missions count per user
  const { data: missionsData = [] } = useQuery({
    queryKey: ['allMissionsCompleted'],
    queryFn: async () => {
      const missions = await base44.entities.Mission.filter({ status: 'completed' });
      const missionsByUser = {};
      
      missions.forEach(mission => {
        if (!missionsByUser[mission.created_by]) {
          missionsByUser[mission.created_by] = 0;
        }
        missionsByUser[mission.created_by]++;
      });
      
      return missionsByUser;
    }
  });

  // Fetch goals count per user
  const { data: goalsData = [] } = useQuery({
    queryKey: ['allGoalsCompleted'],
    queryFn: async () => {
      const goals = await base44.entities.Goal.filter({ status: 'completed' });
      const goalsByUser = {};
      
      goals.forEach(goal => {
        if (!goalsByUser[goal.created_by]) {
          goalsByUser[goal.created_by] = 0;
        }
        goalsByUser[goal.created_by]++;
      });
      
      return goalsByUser;
    }
  });

  // Fetch weekly challenges
  const { data: weeklyChallenges = [] } = useQuery({
    queryKey: ['weeklyChallenges'],
    queryFn: () => base44.entities.WeeklyChallenge.filter({ status: 'active' }, '-created_date')
  });

  // Fetch challenge participants
  const { data: allParticipants = [] } = useQuery({
    queryKey: ['allChallengeParticipants'],
    queryFn: () => base44.entities.ChallengeParticipant.list('-score'),
    enabled: weeklyChallenges.length > 0
  });

  // Filter users by time period
  const getFilteredUsers = () => {
    if (timeFilter === 'all_time') return users;
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return users.map(user => {
      const userDate = new Date(user.created_date);
      if (timeFilter === 'this_week' && userDate < weekAgo) {
        return { ...user, filtered_xp: 0, filtered_gold: 0 };
      }
      if (timeFilter === 'this_month' && userDate < monthAgo) {
        return { ...user, filtered_xp: 0, filtered_gold: 0 };
      }
      return user;
    });
  };

  // Sort by different metrics
  const filteredUsers = getFilteredUsers();
  
  const sortByXP = [...filteredUsers].sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0));
  const sortByLevel = [...filteredUsers].sort((a, b) => (b.level || 0) - (a.level || 0));
  const sortByGold = [...filteredUsers].sort((a, b) => (b.gold_coins || 0) - (a.gold_coins || 0));
  const sortByMissions = [...filteredUsers].sort((a, b) => {
    const aMissions = missionsData[a.created_by] || 0;
    const bMissions = missionsData[b.created_by] || 0;
    return bMissions - aMissions;
  });
  const sortByGoals = [...filteredUsers].sort((a, b) => {
    const aGoals = goalsData[a.created_by] || 0;
    const bGoals = goalsData[b.created_by] || 0;
    return bGoals - aGoals;
  });

  const getSortedUsers = () => {
    switch(sortBy) {
      case 'total_xp': return sortByXP;
      case 'level': return sortByLevel;
      case 'gold_coins': return sortByGold;
      case 'missions': return sortByMissions;
      case 'goals': return sortByGoals;
      default: return sortByXP;
    }
  };

  const getRankIcon = (index) => {
    if (index === 0) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-300" />;
    if (index === 2) return <Award className="w-6 h-6 text-orange-400" />;
    return <span className="text-gray-500 font-bold">#{index + 1}</span>;
  };

  const getRankGlow = (index) => {
    if (index === 0) return 'gold';
    if (index === 1) return 'cyan';
    if (index === 2) return 'magenta';
    return 'purple';
  };

  const getMetricValue = (user, metric) => {
    switch(metric) {
      case 'total_xp': return user.total_xp || 0;
      case 'level': return user.level || 0;
      case 'gold_coins': return user.gold_coins || 0;
      case 'missions': return missionsData[user.created_by] || 0;
      case 'goals': return goalsData[user.created_by] || 0;
      default: return 0;
    }
  };

  const getMetricLabel = (metric) => {
    switch(metric) {
      case 'total_xp': return 'XP Total';
      case 'level': return 'Nível';
      case 'gold_coins': return 'Gold Coins';
      case 'missions': return 'Missões';
      case 'goals': return 'Metas';
      default: return '';
    }
  };

  const LeaderboardList = ({ sortedUsers }) => {
    const getCurrentUserRank = () => {
      if (!currentUserData) return null;
      const rank = sortedUsers.findIndex(u => u.created_by === currentUserData.created_by);
      return rank >= 0 ? rank + 1 : null;
    };

    const currentRank = getCurrentUserRank();

    return (
      <div className="space-y-3">
        {/* Current User Highlight */}
        {currentRank && currentRank > 3 && (
          <NeonCard glowColor="green" className="mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500/50">
                <span className="text-green-400 font-bold">#{currentRank}</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold">Sua Posição</p>
                <p className="text-gray-400 text-sm">Continue subindo no ranking!</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-400">
                  {getMetricValue(currentUserData, sortBy).toLocaleString()}
                </p>
              </div>
            </div>
          </NeonCard>
        )}

        {/* Top rankings */}
        {sortedUsers.slice(0, 50).map((user, index) => {
          const isCurrentUser = currentUserData?.created_by === user.created_by;
          const value = getMetricValue(user, sortBy);

          return (
            <NeonCard 
              key={user.id} 
              glowColor={index < 3 ? getRankGlow(index) : 'cyan'}
              className={`${isCurrentUser ? 'border-green-500/50 shadow-[0_0_30px_rgba(57,255,20,0.4)]' : ''} ${index < 3 ? 'scale-105' : ''}`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="flex items-center justify-center w-12 h-12">
                  {getRankIcon(index)}
                </div>

                {/* Avatar */}
                <AvatarDisplay user={user} size="sm" showEquipment />

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {!isCurrentUser ? (
                      <button
                        onClick={() => navigate(createPageUrl('PlayerProfile') + `?email=${user.email}`)}
                        className="text-white font-bold hover:text-cyan-400 transition-colors cursor-pointer"
                      >
                        {user.full_name || 'Jogador'}
                      </button>
                    ) : (
                      <p className="text-white font-bold">{user.full_name || 'Jogador'}</p>
                    )}
                    {isCurrentUser && (
                      <span className="bg-green-500/20 border border-green-500/50 rounded-full px-2 py-0.5 text-green-400 text-xs font-semibold">
                        VOCÊ
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">Nível {user.level || 1}</p>
                </div>

                {/* Metric Value */}
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-magenta-400">
                      {value.toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-xs uppercase">
                      {getMetricLabel(sortBy)}
                    </p>
                  </div>
                  {!isCurrentUser && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(createPageUrl('PlayerProfile') + `?email=${user.email}`)}
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </NeonCard>
          );
        })}

        {sortedUsers.length === 0 && !isLoading && (
          <NeonCard glowColor="cyan">
            <p className="text-gray-400 text-center py-8">
              Nenhum jogador no ranking ainda. Seja o primeiro!
            </p>
          </NeonCard>
        )}
      </div>
    );
  };

  const ChallengeLeaderboard = ({ challenge }) => {
    const participants = allParticipants
      .filter(p => p.challenge_id === challenge.id)
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    return (
      <NeonCard glowColor="gold" className="mb-6">
        <div className="space-y-4">
          {/* Challenge Header */}
          <div className="flex items-center justify-between border-b border-yellow-500/20 pb-4">
            <div>
              <h3 className="text-white font-bold text-xl mb-1">{challenge.challenge_name}</h3>
              <p className="text-gray-400 text-sm">{challenge.description}</p>
            </div>
            <Flame className="w-10 h-10 text-orange-400 animate-pulse" />
          </div>

          {/* Participants */}
          <div className="space-y-2">
            {participants.length > 0 ? (
              participants.slice(0, 10).map((participant, index) => (
                <div 
                  key={participant.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-900/40 to-black/50 border-2 border-yellow-500/50' :
                    index === 1 ? 'bg-gradient-to-r from-gray-700/40 to-black/50 border border-gray-500/50' :
                    index === 2 ? 'bg-gradient-to-r from-orange-900/40 to-black/50 border border-orange-500/50' :
                    'bg-[#0a0a1a] border border-cyan-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-orange-500 text-white' :
                      'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{participant.user_name || 'Anônimo'}</p>
                      {participant.user_email === currentUserData?.created_by && (
                        <span className="text-green-400 text-xs font-bold">Você</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-lg">{participant.score?.toFixed(0) || 0}</p>
                    <p className="text-gray-400 text-xs">pontos</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum participante ainda</p>
            )}
          </div>
        </div>
      </NeonCard>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto relative overflow-hidden">
      {/* Epic Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl"
            initial={{ opacity: 0 }}
            animate={{ 
              x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
              y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
              opacity: [0, 0.3, 0],
              rotate: [0, 360],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 5 + Math.random() * 3,
              repeat: Infinity,
              delay: i * 0.4
            }}
          >
            {['🏆', '👑', '⭐', '🔥'][i % 4]}
          </motion.div>
        ))}
      </div>

      {/* Epic Header */}
      <motion.div 
        className="text-center relative z-10"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="relative inline-block mb-6">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 blur-3xl opacity-50"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 360]
            }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <div className="relative flex items-center gap-4">
            <motion.div
              animate={{ 
                rotate: [0, -20, 20, -20, 0],
                y: [0, -10, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Crown className="w-16 h-16 text-yellow-400" />
            </motion.div>
            <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 tracking-wider">
              HALL DA FAMA
            </h1>
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 360]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Trophy className="w-16 h-16 text-yellow-400" />
            </motion.div>
          </div>
        </div>
        <motion.p 
          className="text-yellow-400 text-xl font-bold flex items-center justify-center gap-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Star className="w-6 h-6 animate-pulse" />
          Guerreiros Financeiros em Destaque
          <Star className="w-6 h-6 animate-pulse" />
        </motion.p>
      </motion.div>

      {/* Epic Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div whileHover={{ scale: 1.05, y: -5 }}>
          <NeonCard glowColor="cyan" className="text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-10 h-10 text-cyan-400 mx-auto mb-2" />
            </motion.div>
            <p className="text-4xl font-black text-white mb-1">{users.length}</p>
            <p className="text-gray-400 text-sm">Jogadores Ativos</p>
          </NeonCard>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05, y: -5 }}>
          <NeonCard glowColor="magenta" className="text-center">
            <Target className="w-10 h-10 text-magenta-400 mx-auto mb-2 animate-pulse" />
            <p className="text-4xl font-black text-white mb-1">
              {Object.values(missionsData).reduce((a, b) => a + b, 0)}
            </p>
            <p className="text-gray-400 text-sm">Missões Concluídas</p>
          </NeonCard>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05, y: -5 }}>
          <NeonCard glowColor="purple" className="text-center">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Trophy className="w-10 h-10 text-purple-400 mx-auto mb-2" />
            </motion.div>
            <p className="text-4xl font-black text-white mb-1">
              {Object.values(goalsData).reduce((a, b) => a + b, 0)}
            </p>
            <p className="text-gray-400 text-sm">Metas Forjadas</p>
          </NeonCard>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <NeonCard glowColor="purple">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-bold">Filtros & Ordenação</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-purple-400 hover:text-purple-300"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top duration-300">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Ordenar Por</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-[#0a0a1a] border-purple-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total_xp">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      XP Total
                    </div>
                  </SelectItem>
                  <SelectItem value="level">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-400" />
                      Nível
                    </div>
                  </SelectItem>
                  <SelectItem value="gold_coins">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      Gold Coins
                    </div>
                  </SelectItem>
                  <SelectItem value="missions">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-magenta-400" />
                      Missões Completas
                    </div>
                  </SelectItem>
                  <SelectItem value="goals">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-purple-400" />
                      Metas Forjadas
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Período</label>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="bg-[#0a0a1a] border-purple-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_time">Todo o Tempo</SelectItem>
                  <SelectItem value="this_week">Esta Semana</SelectItem>
                  <SelectItem value="this_month">Este Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </NeonCard>

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="global" className="space-y-6">
        <TabsList className="bg-[#1a1a2e] border border-cyan-500/30 p-1 grid grid-cols-2">
          <TabsTrigger 
            value="global"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-magenta-500/20 data-[state=active]:border data-[state=active]:border-cyan-500/50 data-[state=active]:text-white text-gray-400"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Ranking Global
          </TabsTrigger>
          <TabsTrigger 
            value="challenges"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/20 data-[state=active]:to-orange-500/20 data-[state=active]:border data-[state=active]:border-yellow-500/50 data-[state=active]:text-white text-gray-400"
          >
            <Flame className="w-4 h-4 mr-2" />
            Desafios Semanais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <LeaderboardList sortedUsers={getSortedUsers()} />
        </TabsContent>

        <TabsContent value="challenges">
          {weeklyChallenges.length > 0 ? (
            <div className="space-y-6">
              {weeklyChallenges.map(challenge => (
                <ChallengeLeaderboard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          ) : (
            <NeonCard glowColor="gold">
              <div className="text-center py-12">
                <Flame className="w-16 h-16 text-orange-400 mx-auto mb-4 animate-pulse" />
                <h3 className="text-white font-bold text-xl mb-2">Nenhum Desafio Ativo</h3>
                <p className="text-gray-400">Aguarde o próximo desafio semanal!</p>
              </div>
            </NeonCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}