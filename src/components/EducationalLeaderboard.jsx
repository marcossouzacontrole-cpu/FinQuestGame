import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Trophy, GraduationCap, Brain } from 'lucide-react';
import NeonCard from './NeonCard';

export default function EducationalLeaderboard({ userData }) {
  const { data: topLearners = [] } = useQuery({
    queryKey: ['educationalLeaderboard'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      
      // Sort by total learning progress (modules + daily contents)
      return users
        .filter(u => (u.completed_modules?.length || 0) + (u.daily_contents_read?.length || 0) > 0)
        .sort((a, b) => {
          const aTotal = (a.completed_modules?.length || 0) + (a.daily_contents_read?.length || 0);
          const bTotal = (b.completed_modules?.length || 0) + (b.daily_contents_read?.length || 0);
          return bTotal - aTotal;
        })
        .slice(0, 10);
    },
    refetchInterval: 30000
  });

  const currentUserRank = topLearners.findIndex(u => u.email === userData?.email) + 1;

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return 'from-yellow-500 to-orange-500';
      case 2: return 'from-gray-300 to-gray-400';
      case 3: return 'from-orange-700 to-orange-800';
      default: return 'from-cyan-500/20 to-magenta-500/20';
    }
  };

  return (
    <NeonCard glowColor="cyan" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Ranking de Aprendizado</h3>
            <p className="text-gray-400 text-sm">Top 10 estudantes mais dedicados</p>
          </div>
        </div>

        <div className="space-y-3">
          {topLearners.map((user, index) => {
            const rank = index + 1;
            const isCurrentUser = user.email === userData?.email;
            const modulesCompleted = (user.completed_modules?.length || 0) + (user.daily_contents_read?.length || 0);
            
            return (
              <div
                key={user.id}
                className={`
                  bg-gradient-to-r ${getRankColor(rank)} rounded-xl p-4 border 
                  ${isCurrentUser ? 'border-cyan-500 shadow-[0_0_20px_rgba(0,255,255,0.4)]' : 'border-gray-700/50'}
                  transition-all duration-300 hover:scale-105
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-2xl font-black min-w-[3rem] text-center">
                      {getRankIcon(rank)}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">
                        {user.full_name}
                        {isCurrentUser && (
                          <span className="ml-2 text-cyan-400 text-xs">(Você)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          <Brain className="w-3 h-3 text-purple-400" />
                          <span className="text-purple-400 text-xs font-semibold">
                            {modulesCompleted} conteúdos
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-yellow-400" />
                          <span className="text-yellow-400 text-xs font-semibold">
                            Nível {user.level || 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan-400 font-black text-xl">{modulesCompleted}</p>
                    <p className="text-gray-400 text-xs">Completos</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {currentUserRank > 10 && (
          <div className="mt-4 bg-[#0a0a1a] rounded-xl p-4 border border-cyan-500/30">
            <p className="text-center text-gray-400 text-sm">
              Você está em{' '}
              <span className="text-cyan-400 font-bold">#{currentUserRank}</span> no ranking!
            </p>
            <p className="text-center text-gray-500 text-xs mt-1">
              Continue estudando para entrar no Top 10! 📚
            </p>
          </div>
        )}
      </div>
    </NeonCard>
  );
}