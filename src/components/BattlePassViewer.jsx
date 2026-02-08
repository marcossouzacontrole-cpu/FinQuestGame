import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Lock, Gift, Zap, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NeonCard from './NeonCard';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

export default function BattlePassViewer({ user }) {
  const queryClient = useQueryClient();
  const [selectedReward, setSelectedReward] = useState(null);

  const { data: battlePass } = useQuery({
    queryKey: ['battlePass', user?.email],
    queryFn: () => base44.entities.BattlePass.filter(
      { created_by: user?.email, status: 'active' },
      '-purchase_date',
      1
    ),
    enabled: !!user?.email,
  });

  const { data: seasonRewards = [] } = useQuery({
    queryKey: ['seasonRewards', battlePass?.[0]?.season],
    queryFn: () => battlePass?.[0]?.season 
      ? base44.entities.SeasonReward.filter({ season: battlePass[0].season })
      : Promise.resolve([]),
    enabled: !!battlePass?.[0]?.season,
  });

  const currentBP = battlePass?.[0];
  const currentTier = currentBP?.current_tier || 0;
  const nextReward = seasonRewards.find(r => r.tier === currentTier + 1);
  const rewardsClaimed = currentBP?.rewards_claimed || [];

  const claimReward = useMutation({
    mutationFn: async (rewardId) => {
      if (!currentBP) return;
      
      const newClaimed = [...rewardsClaimed, rewardId];
      await base44.entities.BattlePass.update(currentBP.id, {
        rewards_claimed: newClaimed
      });

      // Award the reward
      const reward = seasonRewards.find(r => r.id === rewardId);
      if (reward?.type === 'gold' && user?.id) {
        await base44.entities.User.update(user.id, {
          gold_coins: (user.gold_coins || 0) + reward.value
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['battlePass']);
      queryClient.invalidateQueries(['currentUserProfile']);
      toast.success('🎉 Reward coletado!');
    }
  });

  if (!currentBP) {
    return (
      <NeonCard glowColor="purple">
        <div className="text-center py-12">
          <Crown className="w-20 h-20 text-purple-400 mx-auto mb-4" />
          <h3 className="text-2xl font-black text-white mb-2">Sem Battle Pass Ativo</h3>
          <p className="text-slate-400 mb-6">Compre um Battle Pass na Loja para começar!</p>
          <Button className="bg-purple-600 hover:bg-purple-700">Ir para Loja</Button>
        </div>
      </NeonCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-purple-900/40 border-2 border-purple-500/50 p-6"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-purple-400 text-sm font-bold">SEASON {currentBP.season}</p>
              <h2 className="text-white font-black text-3xl">{currentBP.name}</h2>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 rounded-full border-4 border-purple-500/50 flex items-center justify-center bg-purple-900/30">
                <div className="text-center">
                  <p className="text-purple-400 text-xs">TIER</p>
                  <p className="text-white font-black text-3xl">{currentTier}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Progresso para Tier {currentTier + 1}</span>
              <span className="text-purple-400 font-bold">{currentTier}/100</span>
            </div>
            <Progress value={currentTier} max={100} className="h-3" />
          </div>

          {/* Dias Restantes */}
          <div className="mt-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-pink-400" />
            <p className="text-slate-400 text-sm">
              Expira em: {new Date(currentBP.end_date).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Rewards Grid */}
      <div>
        <h3 className="text-white font-black text-2xl mb-4 flex items-center gap-2">
          <Gift className="w-6 h-6 text-yellow-400" />
          Rewards Disponíveis
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {seasonRewards.map((reward, idx) => {
              const isClaimed = rewardsClaimed.includes(reward.id);
              const isLocked = reward.tier > currentTier;
              const isPremium = !reward.free && !currentBP.premium;

              return (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => !isLocked && !isClaimed && setSelectedReward(reward)}
                  className={`relative rounded-lg p-3 border-2 cursor-pointer transition-all ${
                    isClaimed
                      ? 'bg-green-900/20 border-green-500/50'
                      : isLocked
                      ? 'bg-slate-800/30 border-slate-600/30 opacity-50'
                      : isPremium
                      ? 'bg-purple-900/20 border-purple-500/50 hover:border-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                      : 'bg-cyan-900/20 border-cyan-500/50 hover:border-cyan-500 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]'
                  }`}
                >
                  {/* Tier */}
                  <p className="text-slate-400 text-xs mb-2">Tier {reward.tier}</p>

                  {/* Icon */}
                  <p className="text-3xl text-center mb-2">{reward.icon}</p>

                  {/* Name */}
                  <p className="text-white font-bold text-xs text-center mb-2 line-clamp-2">
                    {reward.name}
                  </p>

                  {/* Status */}
                  <div className="text-center">
                    {isClaimed ? (
                      <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                    ) : isLocked ? (
                      <Lock className="w-4 h-4 text-slate-400 mx-auto" />
                    ) : isPremium ? (
                      <Crown className="w-4 h-4 text-purple-400 mx-auto" />
                    ) : (
                      <Zap className="w-4 h-4 text-cyan-400 mx-auto animate-pulse" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Reward Detail Modal */}
      <AnimatePresence>
        {selectedReward && !rewardsClaimed.includes(selectedReward.id) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedReward(null)}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-purple-500/50 rounded-2xl p-6 max-w-sm w-full text-center"
            >
              <p className="text-6xl mb-4">{selectedReward.icon}</p>
              <h3 className="text-white font-black text-2xl mb-2">{selectedReward.name}</h3>
              <p className="text-slate-400 mb-4">
                {selectedReward.type === 'gold' && `+${selectedReward.value} Gold Coins`}
                {selectedReward.type === 'xp' && `+${selectedReward.value} XP`}
              </p>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => setSelectedReward(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    claimReward.mutate(selectedReward.id);
                    setSelectedReward(null);
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Coletar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}