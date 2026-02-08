import { Trophy, Flame } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import NeonCard from './NeonCard';

export default function VaultLeaderboard({ userData }) {
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersLeaderboard'],
    queryFn: () => base44.entities.User.list('-vault_deposit_streak', 10)
  });

  const topUsers = allUsers
    .filter(u => (u.vault_deposit_streak || 0) > 0)
    .slice(0, 10);

  const currentUserRank = topUsers.findIndex(u => u.id === userData?.id) + 1;

  const getRankIcon = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}º`;
  };

  const getRankColor = (index) => {
    if (index === 0) return 'from-yellow-500 to-orange-500';
    if (index === 1) return 'from-gray-300 to-gray-400';
    if (index === 2) return 'from-orange-400 to-orange-600';
    return 'from-cyan-500 to-blue-500';
  };

  return (
    <NeonCard glowColor="cyan" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Ranking de Streaks</h3>
              <p className="text-gray-400 text-sm">Top 10 maiores sequências de depósitos</p>
            </div>
          </div>
          
          {currentUserRank > 0 && (
            <div className="text-right">
              <p className="text-cyan-400 font-bold text-lg">{currentUserRank}º</p>
              <p className="text-gray-400 text-xs">Sua posição</p>
            </div>
          )}
        </div>

        {topUsers.length === 0 ? (
          <div className="text-center py-8 border border-cyan-500/20 rounded-xl bg-cyan-500/5">
            <Flame className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum usuário com streak ativo ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topUsers.map((user, index) => {
              const isCurrentUser = user.id === userData?.id;
              const streak = user.vault_deposit_streak || 0;
              
              return (
                <div
                  key={user.id}
                  className={`relative overflow-hidden rounded-xl p-4 border-2 transition-all duration-300 ${
                    isCurrentUser
                      ? 'border-cyan-500 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 shadow-[0_0_20px_rgba(0,255,255,0.3)]'
                      : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getRankColor(index)} flex items-center justify-center font-bold text-white text-lg shadow-lg`}>
                        {getRankIcon(index)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold ${isCurrentUser ? 'text-cyan-400' : 'text-white'}`}>
                            {user.full_name || user.email?.split('@')[0] || 'Anônimo'}
                          </p>
                          {isCurrentUser && (
                            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full border border-cyan-500/30">
                              Você
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">Nível {user.level || 1}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <Flame className="w-5 h-5 text-orange-400" />
                        <p className="text-white font-bold text-xl">{streak}</p>
                      </div>
                      <p className="text-gray-400 text-xs">dias consecutivos</p>
                    </div>
                  </div>

                  {index < 3 && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-2xl" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {currentUserRank > 10 && (
          <div className="mt-4 p-3 border border-cyan-500/30 rounded-xl bg-cyan-500/5">
            <p className="text-cyan-400 text-sm text-center">
              Continue depositando para entrar no Top 10! Você está em {currentUserRank}º lugar.
            </p>
          </div>
        )}
      </div>
    </NeonCard>
  );
}