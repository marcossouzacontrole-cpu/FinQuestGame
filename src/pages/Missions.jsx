import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gamepad2, Trophy, Lock, CheckCircle, Target, Zap, RefreshCw, Loader2, Crown, Swords, Flame, Star, Sparkles, Scroll, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MiniGame52Weeks from '../components/MiniGame52Weeks';
import TreasureHuntGame from '../components/TreasureHuntGame';
import SavingsTowerGame from '../components/SavingsTowerGame';
import SeasonTimer from '../components/SeasonTimer';
import DailyWeeklyMissions from '../components/DailyWeeklyMissions';
import FinancialMilestonesPanel from '../components/FinancialMilestonesPanel';
import PerformanceScoreCard from '../components/PerformanceScoreCard';

import { toast } from 'sonner';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

// Configuração Centralizada de Temas Épicos
const TIER_THEMES = {
  1: {
    title: "O CHAMADO",
    icon: Scroll,
    color: "cyan",
    gradient: "from-cyan-900 via-slate-900 to-cyan-900",
    accent: "text-cyan-400",
    border: "border-cyan-500/50",
    glow: "shadow-[0_0_30px_rgba(6,182,212,0.2)]",
    particles: "bg-cyan-400"
  },
  2: {
    title: "A PROVAÇÃO",
    icon: Swords,
    color: "red",
    gradient: "from-red-900 via-slate-900 to-orange-900",
    accent: "text-red-400",
    border: "border-red-500/50",
    glow: "shadow-[0_0_30px_rgba(248,113,113,0.2)]",
    particles: "bg-orange-500"
  },
  3: {
    title: "A GLÓRIA",
    icon: Crown,
    color: "amber",
    gradient: "from-amber-900 via-purple-900 to-amber-900",
    accent: "text-amber-400",
    border: "border-amber-500/50",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.3)]",
    particles: "bg-yellow-300"
  }
};

const TierHeader = ({ tier, name }) => {
  const theme = TIER_THEMES[tier] || TIER_THEMES[1];
  const IconComponent = theme.icon;

  return (
    <motion.div 
      className={`relative ${theme.gradient} border-y-2 md:border-2 ${theme.border} md:rounded-3xl p-8 mb-10 overflow-hidden group`}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay" />
      <div className={`absolute inset-0 ${theme.glow} opacity-20 blur-3xl`} />
      
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-1 h-1 rounded-full ${theme.particles} blur-[1px]`}
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: "120%", 
              opacity: 0 
            }}
            animate={{ 
              y: "-20%", 
              opacity: [0, 0.8, 0],
              scale: [0, 1.5, 0]
            }}
            transition={{ 
              duration: 3 + Math.random() * 4, 
              repeat: Infinity, 
              delay: i * 0.5,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Conteúdo Centralizado */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        
        {/* Ícone Épico com Anéis Rotativos */}
        <div className="relative mb-6">
          {/* Anel Externo */}
          <motion.div 
            className={`absolute -inset-4 border border-dashed ${theme.border} rounded-full opacity-30`}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          {/* Anel Interno */}
          <motion.div 
            className={`absolute -inset-2 border border-dotted ${theme.border} rounded-full opacity-60`}
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />
          
          {/* O Ícone em Si */}
          <motion.div
            className={`relative w-20 h-20 rounded-2xl bg-slate-950 border-2 ${theme.border} flex items-center justify-center shadow-2xl`}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <IconComponent className={`w-10 h-10 ${theme.accent}`} strokeWidth={1.5} />
            
            {/* Brilho interno do ícone */}
            <div className={`absolute inset-0 ${theme.accent} opacity-20 blur-xl rounded-full`} />
          </motion.div>
          
          {/* Badge de Nível no topo do ícone */}
          <div className={`absolute -top-3 -right-3 w-8 h-8 bg-slate-900 border ${theme.border} rounded-full flex items-center justify-center`}>
            <span className={`text-xs font-black ${theme.accent}`}>{tier}</span>
          </div>
        </div>

        {/* Títulos */}
        <div className="space-y-2">
          <motion.h3 
            className={`text-sm font-bold tracking-[0.3em] uppercase ${theme.accent} opacity-80`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
          >
           — {theme.title} —
          </motion.h3>
          
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-xl">
            {name}
          </h2>
        </div>

        {/* Barra Divisória Decorativa */}
        <div className="flex items-center gap-4 mt-6 opacity-50">
          <div className={`h-px w-12 bg-gradient-to-r from-transparent to-${theme.color}-500`} />
          <Star className={`w-4 h-4 ${theme.accent} fill-current`} />
          <div className={`h-px w-12 bg-gradient-to-l from-transparent to-${theme.color}-500`} />
        </div>

      </div>
    </motion.div>
  );
};

const MissionNode = ({ mission, index, isLast, onVerify, isVerifying }) => {
  const [showParticles, setShowParticles] = useState(false);
  
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
      bg: 'bg-cyan-900/20', 
      border: 'border-cyan-500/50',
      line: 'bg-cyan-500/50',
      glow: 'shadow-[0_0_25px_rgba(6,182,212,0.4)]',
      pulse: true
    },
    completed: { 
      icon: CheckCircle, 
      color: 'text-green-400', 
      bg: 'bg-green-900/20', 
      border: 'border-green-500/50',
      line: 'bg-green-500'
    }
  };

  const config = statusConfig[mission.status] || statusConfig.locked;
  const Icon = config.icon;
  const progress = mission.target_value > 0 
    ? Math.min((mission.current_progress / mission.target_value) * 100, 100) 
    : 0;

  const handleVerifyClick = (m) => {
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), 2000);
    onVerify(m);
  };

  return (
    <div className="relative flex items-start gap-6">
      {!isLast && (
        <div className="absolute left-6 top-20 w-0.5 h-full -ml-px">
          <div className={`w-full h-full ${config.line}`} />
        </div>
      )}

      <motion.div
        className={`relative z-10 w-12 h-12 rounded-full ${config.bg} border-2 ${config.border} flex items-center justify-center ${config.pulse ? 'animate-pulse' : ''}`}
        whileHover={{ scale: 1.15, rotate: [0, -10, 10, 0] }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: index * 0.08, type: "spring", stiffness: 200 }}
      >
        <span className="text-2xl">{mission.badge_icon}</span>

        {showParticles && mission.status === 'active' && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos((i * Math.PI * 2) / 8) * 40,
                  y: Math.sin((i * Math.PI * 2) / 8) * 40,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </motion.div>

      <motion.div
        className={`flex-1 ${config.bg} border-2 ${config.border} rounded-2xl p-6 mb-6 ${config.glow || ''}`}
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.08 }}
        whileHover={mission.status === 'active' ? { scale: 1.02 } : {}}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{mission.badge_icon}</span>
            <div>
              <h4 className="text-white font-bold text-lg">{mission.title}</h4>
              <p className="text-slate-400 text-sm mt-1">{mission.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-black text-lg">+{mission.xp_reward} XP</span>
            </div>
            {mission.gold_reward > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <span className="text-orange-400 font-bold">+{mission.gold_reward}</span>
              </div>
            )}
          </div>
        </div>

        {mission.status === 'active' && mission.target_value > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400 font-semibold">Progresso</span>
              <span className="text-cyan-400 font-black">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-slate-900 rounded-full overflow-hidden border-2 border-cyan-500/30">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </div>
            <p className="text-slate-500 text-xs mt-2 font-mono">
              {mission.current_progress?.toFixed(0) || 0} / {mission.target_value?.toFixed(0)}
            </p>
          </div>
        )}

        {mission.status === 'active' && (
          <motion.button
            onClick={() => handleVerifyClick(mission)}
            disabled={isVerifying}
            className="relative w-full mt-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 overflow-hidden group"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
              animate={{
                x: ['-100%', '200%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            {isVerifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                Verificar Progresso Agora
              </>
            )}
          </motion.button>
        )}

        {mission.status === 'locked' && (
          <div className="mt-4 flex items-center gap-2 text-slate-500 text-sm bg-slate-800/50 p-3 rounded-lg">
            <Lock className="w-4 h-4" />
            <span>Complete as missões anteriores para desbloquear</span>
          </div>
        )}

        {mission.status === 'completed' && (
          <div className="mt-4 flex items-center gap-2 text-green-400 text-sm bg-green-900/20 p-3 rounded-lg border border-green-500/30">
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold">Missão Completa! Recompensas creditadas automaticamente.</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default function Missions() {
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userData } = useQuery({
    queryKey: ['currentUserProfile', currentUser?.email],
    queryFn: async () => {
      if (currentUser?.email) {
        const profiles = await base44.entities.User.filter({ email: currentUser.email });
        return profiles && profiles.length > 0 ? profiles[0] : null;
      }
      return null;
    },
    enabled: !!currentUser,
  });

  const { data: timelineData, isLoading } = useQuery({
    queryKey: ['missionTimeline', currentUser?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke('getMissionTimeline');
      return response.data;
    },
    enabled: !!currentUser
  });

  const verifyMissions = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('evaluateMissionTriggers');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['missionTimeline']);
      queryClient.invalidateQueries(['currentUserProfile']);
      
      if (data?.completed_count > 0) {
        // Efeito de confetti épico
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#00FFFF', '#FF00FF', '#FFD700', '#39FF14']
        });

        // Confetti adicional em explosões
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#00FFFF', '#FF00FF']
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#FFD700', '#39FF14']
          });
        }, 200);

        data.completed_missions.forEach((mission, idx) => {
          setTimeout(() => {
            toast.success(
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
                <div>
                  <div className="font-black text-lg">MISSÃO COMPLETA!</div>
                  <div className="text-sm">{mission.title}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-yellow-400 font-bold">⚡ +{mission.xp_reward} XP</span>
                    <span className="text-orange-400 font-bold">💰 +{mission.gold_reward} Gold</span>
                  </div>
                  {mission.leveled_up && (
                    <div className="mt-2 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-black text-xs animate-pulse">
                      🎊 LEVEL UP! Nível {mission.new_level}
                    </div>
                  )}
                </div>
              </div>,
              { duration: 5000 }
            );
            
            if (mission.unlocked_next) {
              setTimeout(() => {
                toast.info(
                  <div className="flex items-center gap-3">
                    <Star className="w-6 h-6 text-cyan-400" />
                    <div>
                      <div className="font-bold">Nova Missão Desbloqueada!</div>
                      <div className="text-sm">{mission.unlocked_next.title}</div>
                    </div>
                  </div>,
                  { duration: 4000 }
                );
              }, 1000);
            }
          }, idx * 500);
        });
      } else {
        toast.info('✓ Nenhuma missão nova completada ainda', {
          description: 'Continue progredindo!'
        });
      }
    },
    onError: (error) => {
      console.error('Error verifying missions:', error);
      toast.error('Erro ao verificar missões');
    }
  });

  const handleVerify = async (mission) => {
    setIsVerifying(true);
    await verifyMissions.mutateAsync();
    setIsVerifying(false);
  };

  const missions = (timelineData?.timeline || []).sort((a, b) => a.order_index - b.order_index);
  const userStats = timelineData?.user_stats || {};
  const hasMissions = missions.some(tier => tier.missions?.length > 0);

  const generateMissions = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generatePersonalizedMissions', { reset_mode: true });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['missionTimeline']);
      toast.success('🎯 Missões personalizadas geradas!');
    },
    onError: (error) => {
      console.error('Error generating missions:', error);
      toast.error('Erro ao gerar missões');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-12 h-12 text-cyan-400" />
        </motion.div>
      </div>
    );
  }



  return (
    <div className="space-y-8 max-w-7xl mx-auto relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl opacity-30"
            initial={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
              scale: 0 
            }}
            animate={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
              scale: [0, 1, 0],
              rotate: [0, 360]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.2
            }}
          >
            {['⚔️', '🎯', '⭐', '💎', '🔥', '⚡'][i % 6]}
          </motion.div>
        ))}
      </div>

      {/* Epic Header */}
      <motion.div 
        className="text-center relative z-10 px-2"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="relative inline-block mb-4 sm:mb-6">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-magenta-500 to-yellow-500 blur-3xl opacity-50"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <div className="relative flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Swords className="w-8 sm:w-12 md:w-16 h-8 sm:h-12 md:h-16 text-yellow-400" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-magenta-400 to-yellow-400 tracking-wider animate-pulse">
              ARENA DE MISSÕES
            </h1>
            <motion.div
              animate={{ 
                rotate: [360, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Target className="w-8 sm:w-12 md:w-16 h-8 sm:h-12 md:h-16 text-cyan-400" />
            </motion.div>
          </div>
        </div>
        <motion.p 
          className="text-cyan-400 text-sm sm:text-lg md:text-xl font-bold flex items-center justify-center gap-2 flex-wrap px-2 sm:px-4"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Flame className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="hidden sm:inline">Complete Desafios Épicos e Conquiste Glória!</span>
          <span className="sm:hidden">Complete Desafios Épicos!</span>
          <Flame className="w-5 h-5 sm:w-6 sm:h-6" />
        </motion.p>
      </motion.div>

      <Tabs defaultValue="daily" className="space-y-6 relative z-10">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <TabsList className="bg-gradient-to-r from-[#1a1a2e] via-[#2a1a3e] to-[#1a1a2e] border-2 border-cyan-500/50 p-1 grid grid-cols-2 md:grid-cols-4 gap-1 shadow-[0_0_30px_rgba(0,255,255,0.3)]">
            <TabsTrigger value="daily" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/30 data-[state=active]:to-red-500/30 data-[state=active]:shadow-[0_0_20px_rgba(249,115,22,0.6)]">
              <Zap className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Diárias</span>
            </TabsTrigger>
            <TabsTrigger value="milestones" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-amber-500/30 data-[state=active]:shadow-[0_0_20px_rgba(234,179,8,0.6)]">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Evolução Patrimonial</span>
            </TabsTrigger>
            <TabsTrigger value="battlepass" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:shadow-[0_0_20px_rgba(6,182,212,0.6)]">
              <Trophy className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Battle Pass</span>
            </TabsTrigger>
            <TabsTrigger value="games" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500/30 data-[state=active]:to-purple-500/30">
              <Gamepad2 className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Games</span>
            </TabsTrigger>
          </TabsList>
        </motion.div>

        <TabsContent value="daily" className="mt-8 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-orange-900/20 via-slate-900/50 to-red-900/20 border-2 border-orange-500/50 rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Calendar className="w-12 h-12 text-orange-400" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black text-white">Missões Recorrentes</h2>
                <p className="text-orange-400 text-sm">Complete diariamente e semanalmente para dominar suas finanças</p>
              </div>
            </div>
          </motion.div>
          <DailyWeeklyMissions />
        </TabsContent>

        <TabsContent value="milestones" className="mt-8 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-yellow-900/20 via-slate-900/50 to-amber-900/20 border-2 border-yellow-500/50 rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-4">
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  scale: [1, 1.15, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <TrendingUp className="w-12 h-12 text-yellow-400" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black text-white">📈 EVOLUÇÃO PATRIMONIAL</h2>
                <p className="text-yellow-400 text-sm">Marcos de crescimento do seu patrimônio e conquistas financeiras</p>
              </div>
            </div>
          </motion.div>
          <FinancialMilestonesPanel />
        </TabsContent>

        <TabsContent value="battlepass" className="space-y-6">
          {/* Performance Score Card */}
          <PerformanceScoreCard />
          
          {/* Stats Card - Sempre visível */}
          <motion.div 
            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-cyan-500/50 rounded-2xl p-4 sm:p-6 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5 animate-pulse" />
            <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <motion.div 
                className="text-center p-3 bg-slate-900/50 rounded-xl border border-cyan-500/30"
                whileHover={{ scale: 1.05, borderColor: 'rgba(6,182,212,0.6)' }}
              >
                <div className="text-cyan-400 text-xs uppercase mb-1 flex items-center justify-center gap-1">
                  <Crown className="w-3 h-3" />
                  Nível
                </div>
                <motion.div 
                  className="text-3xl font-black text-white"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {userStats.level || 1}
                </motion.div>
              </motion.div>
              <motion.div 
                className="text-center p-3 bg-slate-900/50 rounded-xl border border-purple-500/30"
                whileHover={{ scale: 1.05, borderColor: 'rgba(168,85,247,0.6)' }}
              >
                <div className="text-purple-400 text-xs uppercase mb-1 flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3" />
                  XP Total
                </div>
                <div className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {userStats.total_xp || 0}
                </div>
              </motion.div>
              <motion.div 
                className="text-center p-3 bg-slate-900/50 rounded-xl border border-yellow-500/30"
                whileHover={{ scale: 1.05, borderColor: 'rgba(234,179,8,0.6)' }}
              >
                <div className="text-yellow-400 text-xs uppercase mb-1 flex items-center justify-center gap-1">
                  <span className="text-sm">💰</span>
                  Gold
                </div>
                <motion.div 
                  className="text-2xl font-black text-yellow-400"
                  animate={{ textShadow: ['0 0 10px rgba(250,204,21,0.5)', '0 0 20px rgba(250,204,21,0.8)', '0 0 10px rgba(250,204,21,0.5)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {userStats.gold_coins || 0}
                </motion.div>
              </motion.div>
              <motion.div 
                className="text-center p-3 bg-slate-900/50 rounded-xl border border-green-500/30"
                whileHover={{ scale: 1.05, borderColor: 'rgba(16,185,129,0.6)' }}
              >
                <div className="text-green-400 text-xs uppercase mb-1 flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Patrimônio
                </div>
                <div className="text-xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  R$ {(userStats.net_worth || 0).toFixed(0)}
                </div>
              </motion.div>
            </div>
          </motion.div>

          {!hasMissions ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-cyan-900/20 to-purple-900/20 border-2 border-cyan-500/50 rounded-2xl p-8 text-center"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Trophy className="w-20 h-20 text-cyan-400 mx-auto mb-4" />
              </motion.div>
              <h3 className="text-3xl font-black text-white mb-3">Sua Jornada Começa Aqui!</h3>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Vamos criar missões personalizadas baseadas no seu perfil financeiro, objetivos e situação atual. Cada missão foi desenhada para melhorar seu desempenho patrimonial!
              </p>
              <Button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  await generateMissions.mutateAsync();
                  queryClient.invalidateQueries(['missionTimeline']);
                }}
                disabled={generateMissions.isPending}
                className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold py-4 px-8 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.5)] text-lg"
              >
                {generateMissions.isPending ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Gerando suas Missões...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 mr-2" />
                    Gerar Missões Personalizadas
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <>
              <SeasonTimer />

              {/* Refresh Button */}
              <div className="flex justify-end mb-4">
                <Button
                  onClick={() => queryClient.invalidateQueries(['missionTimeline'])}
                  variant="outline"
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar Timeline
                </Button>
              </div>

              <div className="max-w-4xl mx-auto">
                {missions.map(tierData => (
                  <div key={tierData.tier_id}>
                    <TierHeader 
                      tier={tierData.order_index} 
                      name={tierData.tier_name}
                    />
                    <div className="space-y-0">
                      {tierData.missions && tierData.missions.length > 0 ? (
                        tierData.missions.map((mission, index) => (
                          <MissionNode
                            key={mission.mission_id}
                            mission={mission}
                            index={index}
                            isLast={index === tierData.missions.length - 1}
                            onVerify={handleVerify}
                            isVerifying={isVerifying}
                          />
                        ))
                      ) : (
                        <motion.div 
                          className="text-center py-8 text-slate-500"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          Nenhuma missão neste tier ainda
                        </motion.div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="games" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-pink-900/20 via-slate-900/50 to-purple-900/20 border-2 border-pink-500/50 rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-4">
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Gamepad2 className="w-12 h-12 text-pink-400" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black text-white">Mini Games</h2>
                <p className="text-pink-400 text-sm">Aprenda economizando enquanto se diverte!</p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MiniGame52Weeks onComplete={(amt) => toast.success(`🏆 R$ ${amt.toFixed(2)} economizado!`)} />
            <TreasureHuntGame onComplete={(r) => { if(userData) base44.entities.User.update(userData.id, {xp: (userData.xp||0)+r.xpReward, gold_coins: (userData.gold_coins||0)+r.goldReward}).then(() => queryClient.invalidateQueries(['currentUserProfile'])); }} />
          </div>
          <SavingsTowerGame onComplete={(r) => { if(userData) base44.entities.User.update(userData.id, {xp: (userData.xp||0)+r.xpReward, gold_coins: (userData.gold_coins||0)+r.goldReward}).then(() => queryClient.invalidateQueries(['currentUserProfile'])); }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}