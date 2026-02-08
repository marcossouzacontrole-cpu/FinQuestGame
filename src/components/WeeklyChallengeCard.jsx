import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Clock, Flame } from 'lucide-react';
import NeonCard from './NeonCard';

export default function WeeklyChallengeCard({ challenge, onJoin, userEmail }) {
  // Fetch leaderboard
  const { data: participants = [] } = useQuery({
    queryKey: ['challengeParticipants', challenge.id],
    queryFn: async () => {
      const data = await base44.entities.ChallengeParticipant.filter({ 
        challenge_id: challenge.id 
      });
      return data.sort((a, b) => (b.score || 0) - (a.score || 0));
    }
  });

  const userParticipant = participants.find(p => p.user_email === userEmail);
  const topThree = participants.slice(0, 3);
  const daysLeft = challenge.end_date ? 
    Math.ceil((new Date(challenge.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  const metricLabels = {
    savings: '💰 Economia',
    budget_adherence: '🎯 Orçamento',
    expense_tracking: '📊 Controle',
    goal_progress: '🏆 Metas'
  };

  return (
    <NeonCard glowColor="gold" className="relative overflow-hidden">
      {/* Challenge Badge */}
      <div className="absolute top-0 right-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 w-32 h-32 rounded-bl-full" />
      
      <div className="space-y-4 relative">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
              <span className="text-orange-400 text-xs font-bold uppercase">Desafio Semanal</span>
            </div>
            <h3 className="text-white font-black text-xl mb-1">{challenge.challenge_name}</h3>
            <p className="text-gray-400 text-sm">{challenge.description}</p>
          </div>
          <Trophy className="w-10 h-10 text-yellow-400 animate-pulse" />
        </div>

        {/* Challenge Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-purple-900/30 to-black/50 rounded-lg p-3 border border-purple-500/30">
            <p className="text-purple-400 text-xs mb-1">Métrica</p>
            <p className="text-white font-bold text-sm">{metricLabels[challenge.target_metric]}</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-900/30 to-black/50 rounded-lg p-3 border border-cyan-500/30">
            <p className="text-cyan-400 text-xs mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Tempo Restante
            </p>
            <p className="text-white font-bold text-sm">{daysLeft} dias</p>
          </div>
        </div>

        {/* Leaderboard Preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-yellow-400">
            <Trophy className="w-4 h-4" />
            <span className="font-bold text-sm">Top 3 Ranking</span>
          </div>
          
          {topThree.length > 0 ? (
            <div className="space-y-2">
              {topThree.map((participant, idx) => (
                <div 
                  key={participant.id}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    idx === 0 ? 'bg-gradient-to-r from-yellow-900/40 to-black/50 border-2 border-yellow-500/50' :
                    idx === 1 ? 'bg-gradient-to-r from-gray-700/40 to-black/50 border border-gray-500/50' :
                    'bg-gradient-to-r from-orange-900/40 to-black/50 border border-orange-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      'bg-orange-500 text-white'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {participant.user_name || 'Anônimo'}
                      </p>
                      {participant.user_email === userEmail && (
                        <span className="text-cyan-400 text-xs font-bold">Você</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{participant.score?.toFixed(0) || 0}</p>
                    <p className="text-gray-400 text-xs">pontos</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">Ninguém participando ainda</p>
          )}
        </div>

        {/* User Status & Action */}
        <div className="pt-3 border-t border-yellow-500/20">
          {userParticipant ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Sua Posição:</span>
                <span className="text-white font-bold">#{userParticipant.rank || participants.findIndex(p => p.id === userParticipant.id) + 1}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Seus Pontos:</span>
                <span className="text-cyan-400 font-bold">{userParticipant.score?.toFixed(0) || 0}</span>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => onJoin(challenge)}
              className="w-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 text-white font-black shadow-[0_0_30px_rgba(255,215,0,0.6)] animate-pulse"
            >
              <Users className="w-4 h-4 mr-2" />
              Participar do Desafio
            </Button>
          )}
        </div>

        {/* Rewards Info */}
        <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg p-3 border border-yellow-500/30">
          <p className="text-yellow-400 text-xs font-bold mb-2">🏆 RECOMPENSAS</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <p className="text-yellow-300 font-bold">1º</p>
              <p className="text-white">+{challenge.xp_reward_first || 500} XP</p>
            </div>
            <div className="text-center">
              <p className="text-gray-300 font-bold">2º</p>
              <p className="text-white">+{challenge.xp_reward_second || 300} XP</p>
            </div>
            <div className="text-center">
              <p className="text-orange-300 font-bold">3º</p>
              <p className="text-white">+{challenge.xp_reward_third || 200} XP</p>
            </div>
          </div>
        </div>
      </div>
    </NeonCard>
  );
}