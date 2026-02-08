import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, CheckCircle, Target, Zap, Flame } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import BattlePassInitializer from './BattlePassInitializer';
import SeasonTimer from './SeasonTimer';

const TierHeader = ({ tier, name, icon }) => {
  const colors = {
    1: { bg: 'from-green-900/30', border: 'border-green-500/50', text: 'text-green-400', glow: 'shadow-[0_0_30px_rgba(34,197,94,0.3)]' },
    2: { bg: 'from-blue-900/30', border: 'border-blue-500/50', text: 'text-blue-400', glow: 'shadow-[0_0_30px_rgba(59,130,246,0.3)]' },
    3: { bg: 'from-purple-900/30', border: 'border-purple-500/50', text: 'text-purple-400', glow: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]' }
  };

  const style = colors[tier] || colors[1];

  return (
    <div className={`bg-gradient-to-r ${style.bg} to-slate-900 border-2 ${style.border} rounded-xl p-4 mb-6 ${style.glow}`}>
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${style.bg} border-2 ${style.border} flex items-center justify-center`}>
          <span className="text-3xl">{icon}</span>
        </div>
        <div>
          <h3 className={`${style.text} font-black text-xl uppercase tracking-wider`}>TIER {tier}</h3>
          <p className="text-white font-bold">{name}</p>
        </div>
      </div>
    </div>
  );
};

const MissionNode = ({ mission, index, isLast, onClaim }) => {
  const statusConfig = {
    locked: { 
      icon: Lock, 
      color: 'text-slate-600', 
      bg: 'bg-slate-800/30', 
      border: 'border-slate-700/50',
      line: 'bg-slate-700/30'
    },
    active: { 
      icon: Target, 
      color: 'text-cyan-400', 
      bg: 'bg-cyan-900/30', 
      border: 'border-cyan-500/50',
      line: 'bg-cyan-500/30',
      pulse: true
    },
    completed: { 
      icon: CheckCircle, 
      color: 'text-green-400', 
      bg: 'bg-green-900/30', 
      border: 'border-green-500/50',
      line: 'bg-green-500'
    },
    claimed: { 
      icon: Trophy, 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-900/30', 
      border: 'border-yellow-500/50',
      line: 'bg-yellow-500'
    }
  };

  const config = statusConfig[mission.status] || statusConfig.locked;
  const Icon = config.icon;
  const progress = mission.target_value > 0 
    ? Math.min((mission.current_progress / mission.target_value) * 100, 100) 
    : 0;

  return (
    <div className="relative flex items-start gap-6">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-6 top-16 w-0.5 h-full -ml-px">
          <div className={`w-full h-full ${config.line}`} />
        </div>
      )}

      {/* Node Icon */}
      <motion.div
        className={`relative z-10 w-12 h-12 rounded-full ${config.bg} border-2 ${config.border} flex items-center justify-center ${config.pulse ? 'animate-pulse' : ''}`}
        whileHover={{ scale: 1.1 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.1 }}
      >
        <Icon className={`w-6 h-6 ${config.color}`} />
      </motion.div>

      {/* Mission Card */}
      <motion.div
        className={`flex-1 ${config.bg} border ${config.border} rounded-xl p-4 mb-6`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{mission.badge_icon}</span>
            <div>
              <h4 className="text-white font-bold">{mission.title}</h4>
              <p className="text-slate-400 text-xs mt-1">{mission.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm">+{mission.xp_reward} XP</span>
            </div>
            {mission.gold_reward > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <span className="text-orange-400 font-bold text-sm">+{mission.gold_reward}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {mission.status === 'active' && mission.target_value > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Progresso</span>
              <span className="text-cyan-400 font-bold">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/30">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1 }}
              />
            </div>
            <p className="text-slate-500 text-xs mt-1">
              {mission.current_progress?.toFixed(0) || 0} / {mission.target_value?.toFixed(0)}
            </p>
          </div>
        )}

        {/* Claim Button */}
        {mission.status === 'completed' && (
          <motion.button
            onClick={() => onClaim(mission)}
            className="w-full mt-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-2 rounded-lg transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Trophy className="w-4 h-4 inline mr-2" />
            Resgatar Recompensa
          </motion.button>
        )}

        {mission.status === 'locked' && (
          <div className="mt-3 flex items-center gap-2 text-slate-500 text-xs">
            <Lock className="w-3 h-3" />
            <span>Complete as missões anteriores para desbloquear</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default function BattlePassTimeline() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me()
  });

  const { data: timelineData, isLoading } = useQuery({
    queryKey: ['battlePassMissions', currentUser?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke('getMissionTimeline');
      return response.data;
    },
    enabled: !!currentUser,
    refetchInterval: 30000
  });

  const missions = timelineData?.timeline || [];
  const userStats = timelineData?.user_stats || {};

  const claimMission = useMutation({
    mutationFn: async (mission) => {
      await base44.entities.Mission.update(mission.id, {
        status: 'claimed'
      });
      return mission;
    },
    onSuccess: (mission) => {
      queryClient.invalidateQueries(['battlePassMissions']);
      queryClient.invalidateQueries(['currentUserProfile']);
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast.success(`🎉 Recompensa resgatada!`, {
        description: `+${mission.xp_reward} XP e +${mission.gold_reward} Gold Coins!`
      });
    }
  });

  // Verificar missões automaticamente
  useEffect(() => {
    if (!currentUser) return;

    const verifyMissions = async () => {
      try {
        const response = await base44.functions.invoke('evaluateMissionTriggers');
        if (response.data?.completed_count > 0) {
          queryClient.invalidateQueries(['battlePassMissions']);
          
          response.data.completed_missions.forEach(mission => {
            toast.success(`✅ Missão Completa: ${mission.title}`, {
              description: `+${mission.xp_reward} XP, +${mission.gold_reward} Gold!`
            });
            
            if (mission.unlocked_next) {
              toast.info(`🔓 Nova Missão: ${mission.unlocked_next.title}`, {
                description: 'Desbloqueada!'
              });
            }
          });
        }
      } catch (error) {
        console.error('Error verifying missions:', error);
      }
    };

    verifyMissions();
    const interval = setInterval(verifyMissions, 30000);

    return () => clearInterval(interval);
  }, [currentUser, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Flame className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Se não há missões, mostrar inicializador
  if (!missions || missions.length === 0) {
    return <BattlePassInitializer />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Season Timer */}
      <SeasonTimer />

      {/* User Stats Summary */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-4 text-center">
          <div className="text-cyan-400 text-xs uppercase mb-1">Nível</div>
          <div className="text-3xl font-black text-white">{userStats.level || 1}</div>
        </div>
        <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-4 text-center">
          <div className="text-purple-400 text-xs uppercase mb-1">XP Total</div>
          <div className="text-2xl font-black text-white">{userStats.total_xp || 0}</div>
        </div>
        <div className="bg-slate-900 border border-yellow-500/30 rounded-xl p-4 text-center">
          <div className="text-yellow-400 text-xs uppercase mb-1">Gold Coins</div>
          <div className="text-2xl font-black text-white">{userStats.gold_coins || 0}</div>
        </div>
        <div className="bg-slate-900 border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-green-400 text-xs uppercase mb-1">Net Worth</div>
          <div className="text-xl font-black text-white">R$ {(userStats.net_worth || 0).toFixed(0)}</div>
        </div>
      </div>

      {missions.map(tierData => (
        <div key={tierData.tier}>
          <TierHeader 
            tier={tierData.tier} 
            name={tierData.name}
            icon={tierData.icon}
          />
          <div className="space-y-0">
            {tierData.missions.map((mission, index) => (
              <MissionNode
                key={mission.id}
                mission={mission}
                index={index}
                isLast={index === tierData.missions.length - 1}
                onClaim={(m) => claimMission.mutate(m)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}