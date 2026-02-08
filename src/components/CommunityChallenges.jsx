import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Target, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import NeonCard from './NeonCard';
import { toast } from 'sonner';

export default function CommunityChallenges({ user }) {
  const queryClient = useQueryClient();

  const { data: challenges } = useQuery({
    queryKey: ['communityChallenges'],
    queryFn: () => base44.entities.CommunityChallenge.filter({ status: 'active' })
  });

  const participateMutation = useMutation({
    mutationFn: async (challenge) => {
      // Lógica de participação seria implementada aqui
      toast.success('🎯 Você entrou no desafio!');
    }
  });

  const getChallengeIcon = (type) => {
    const icons = {
      savings_total: '💰',
      transactions_count: '📊',
      missions_completed: '🎯',
      goals_achieved: '🏆'
    };
    return icons[type] || '⚡';
  };

  const getChallengeLabel = (type) => {
    const labels = {
      savings_total: 'Economia Total',
      transactions_count: 'Transações Registradas',
      missions_completed: 'Missões Completadas',
      goals_achieved: 'Metas Alcançadas'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <NeonCard glowColor="cyan">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase">Desafios Comunitários</h2>
            <p className="text-cyan-400">Toda a comunidade trabalhando junta</p>
          </div>
        </div>

        <div className="grid gap-6">
          {challenges?.map((challenge) => {
            const progressPercent = (challenge.current_progress / challenge.target_value) * 100;
            const daysLeft = Math.ceil((new Date(challenge.end_date) - new Date()) / (1000 * 60 * 60 * 24));

            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-6 border border-cyan-500/30"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{challenge.icon}</div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{challenge.title}</h3>
                      <p className="text-slate-400 text-sm">{challenge.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full">
                          {getChallengeLabel(challenge.challenge_type)}
                        </span>
                        <span className="text-xs text-slate-500">
                          <Users className="w-3 h-3 inline mr-1" />
                          {challenge.participants_count} participantes
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-bold">{daysLeft}d restantes</span>
                    </div>
                    <div className="text-green-400 text-xs">
                      +{challenge.reward_xp} XP / +{challenge.reward_gold}G
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Progresso Global</span>
                    <span className="text-white font-bold">
                      {challenge.current_progress.toLocaleString('pt-BR')} / {challenge.target_value.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                  <p className="text-center text-cyan-400 font-bold text-lg">
                    {progressPercent.toFixed(1)}% completo
                  </p>
                </div>

                {/* Action */}
                <Button
                  onClick={() => participateMutation.mutate(challenge)}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Participar do Desafio
                </Button>
              </motion.div>
            );
          })}

          {(!challenges || challenges.length === 0) && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum desafio ativo no momento</p>
              <p className="text-slate-500 text-sm">Novos desafios toda semana!</p>
            </div>
          )}
        </div>
      </NeonCard>
    </div>
  );
}