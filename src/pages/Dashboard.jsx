import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import IntegrationsDashboard from '../components/IntegrationsDashboard';
import { useRPGTheme } from '../hooks/useRPGTheme';
import {
  Target, Sparkles, DollarSign, Crown,
  Zap, Shield, Flame, Plus, Minus, ArrowRight, Trophy,
  AlertTriangle, CheckCircle, FileText, Users, ShoppingBag, Package,
  Scroll, Coins, Swords, Gift, Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import { createPageUrl } from '../utils';
import SkillBar from '../components/SkillBar';
import GamificationHub from '../components/GamificationHub';
import SmartFinancialAdvisor from '../components/SmartFinancialAdvisor';
import FinancialChatbot from '../components/FinancialChatbot';

export default function Dashboard() {
  const navigate = useNavigate();
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userProfileData } = useQuery({
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

  // REAL DATA QUERY
  const { data: vitalSigns, isLoading: vitalsLoading } = useQuery({
    queryKey: ['vitalSigns', currentUser?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke('getFinancialVitalSigns', {});
      return response.data;
    },
    enabled: !!currentUser,
  });

  // Activate Dynamic Theme
  useRPGTheme(vitalSigns?.vitalSigns?.player?.class);

  const { data: profileData } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.FinancialProfile.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser
  });

  const { data: missions = [] } = useQuery({
    queryKey: ['missions', currentUser?.email],
    queryFn: () => base44.entities.Mission.filter({ created_by: currentUser.email, status: 'active' }, '-created_date', 5),
    enabled: !!currentUser?.email,
    staleTime: 5 * 60 * 1000
  });

  // Bind Real Data
  const dashboardData = React.useMemo(() => {
    if (!vitalSigns?.vitalSigns) return null;
    const v = vitalSigns.vitalSigns;

    return {
      player: v.player,
      metrics: {
        monthlySafeToSpend: v.hp.value,
        powerScore: (v.hp.value > 0 ? 50 : 0) + (v.mana.value > 1000 ? 25 : 0), // Basic formula
        healthScoreTrend: v.hp.status
      },
      quickStats: {
        totalAssets: v.mana.value
      },
      activeEvent: { isActive: false },
      activeMission: null
    };
  }, [vitalSigns]);

  const dashboardLoading = vitalsLoading || !userProfileData;

  // Determinar Missão Principal (apenas ativas e incompletas)
  const mainQuest = useMemo(() => {
    if (!missions || missions.length === 0) return null;

    // Filtrar missões realmente incompletas
    const incompleteMissions = missions.filter(m => {
      if (m.status !== 'active') return false;

      // Se tem target_value, verificar progresso
      if (m.target_value) {
        const progress = m.current_progress || 0;
        return progress < m.target_value;
      }

      // Se não tem target_value, considerar incompleta se status é 'active'
      return true;
    });

    if (incompleteMissions.length === 0) return null;

    // Ordenar por tier (menor primeiro) e depois por progresso (menor primeiro)
    incompleteMissions.sort((a, b) => {
      const tierA = a.tier || 1;
      const tierB = b.tier || 1;
      if (tierA !== tierB) return tierA - tierB;

      const progressA = a.target_value ? (a.current_progress || 0) / a.target_value : 0;
      const progressB = b.target_value ? (b.current_progress || 0) / b.target_value : 0;
      return progressA - progressB;
    });

    // Prioridade 1: Daily quests não concluídas
    const dailyQuest = incompleteMissions.find(m => m.type === 'daily');
    if (dailyQuest) return { ...dailyQuest, priority: 'urgent' };

    // Prioridade 2: Weekly challenges
    const weeklyQuest = incompleteMissions.find(m => m.type === 'weekly' || m.type === 'weekly_challenge');
    if (weeklyQuest) return { ...weeklyQuest, priority: 'high' };

    // Prioridade 3: Primeira missão de campanha do tier mais baixo
    const campaignQuest = incompleteMissions.find(m => m.type === 'campaign');
    if (campaignQuest) return { ...campaignQuest, priority: 'normal' };

    // Fallback: primeira missão incompleta (já ordenada por tier e progresso)
    return { ...incompleteMissions[0], priority: 'normal' };
  }, [missions]);

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', currentUser?.email],
    queryFn: () => base44.entities.Goal.filter({ status: 'forging' }, '-created_date', 3),
    enabled: !!currentUser?.email,
    staleTime: 10 * 60 * 1000
  });

  // Calculate DRE (real data from backend)
  const dreData = useMemo(() => {
    if (!vitalSigns?.vitalSigns?.dre) return {
      grossRevenue: 0,
      totalExpenses: 0,
      netResult: 0
    };

    const dre = vitalSigns.vitalSigns.dre;
    return {
      grossRevenue: dre.income,
      totalExpenses: dre.expenses,
      netResult: dre.netResult
    };
  }, [vitalSigns]);

  useEffect(() => {
    if (profileData !== undefined && profileData.length === 0) {
      navigate(createPageUrl('Onboarding'));
    }
  }, [profileData, navigate]);

  if (dashboardLoading || !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Crown className="w-12 h-12 text-cyan-400" />
        </motion.div>
      </div>
    );
  }

  const nextMission = dashboardData.activeMission;
  const healthTrend = dashboardData.metrics.healthScoreTrend;

  const user = userProfileData;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Identity Bar - Avatar + Level + XP integrado */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-cyan-500/30 rounded-2xl p-4 sm:p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />
        <div className="relative flex flex-col md:flex-row items-center gap-4 sm:gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 blur-xl opacity-40 animate-pulse" />
            <div className="relative w-24 h-24 rounded-full border-4 border-cyan-500/50 overflow-hidden bg-slate-800">
              {user?.avatar_image_url ? (
                <img
                  src={user.avatar_image_url}
                  alt={dashboardData.player.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-4xl font-black">
                    {dashboardData.player.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border-4 border-slate-900">
              <span className="text-white font-black text-sm">{dashboardData.player.level}</span>
            </div>
          </div>

          {/* Nome e XP */}
          <div className="flex-1 text-center md:text-left w-full md:w-auto">
            <h2 className="text-white font-black text-xl sm:text-2xl mb-1 break-words">{dashboardData.player.name}</h2>
            <p className="text-cyan-400 text-xs sm:text-sm font-bold mb-3">{dashboardData.player.className} • Nível {dashboardData.player.level}</p>

            {/* XP Bar Integrada */}
            <div className="max-w-md">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{dashboardData.player.currentXp} XP</span>
                <span className="text-purple-400 font-bold">{dashboardData.player.nextLevelXp} XP</span>
              </div>
              <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-purple-500/30">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(dashboardData.player.currentXp / dashboardData.player.nextLevelXp) * 100}%` }}
                  transition={{ duration: 1.5 }}
                />
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-2 sm:gap-3 w-full md:w-auto">
            <Link to={createPageUrl('Inventory')}>
              <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-center flex-1 md:flex-none cursor-pointer hover:bg-cyan-500/10 transition-colors">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 mx-auto mb-1" />
                <p className="text-cyan-400 font-bold text-xs uppercase">Bolsa</p>
              </div>
            </Link>
            <div className="bg-slate-800/50 border border-yellow-500/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-center flex-1 md:flex-none">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-yellow-400 font-black text-lg sm:text-xl">{dashboardData.player.gold}</p>
              <p className="text-slate-400 text-[8px] sm:text-[9px] uppercase">Gold</p>
            </div>
            <div className="bg-slate-800/50 border border-orange-500/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-center flex-1 md:flex-none">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 mx-auto mb-1" />
              <p className="text-orange-400 font-black text-lg sm:text-xl">{user?.login_streak || 0}</p>
              <p className="text-slate-400 text-[8px] sm:text-[9px] uppercase">Streak</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* INVENTORY BUFFS WIDGET */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4 overflow-x-auto pb-2 no-scrollbar"
      >
        {vitalSigns?.vitalSigns?.buffs?.map((buff, idx) => (
          <div key={idx} className="flex-shrink-0 bg-slate-900 border border-cyan-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-cyan-400 text-[10px] font-black uppercase tracking-widest">{buff.type} ATIVO</span>
          </div>
        ))}
      </motion.div>

      {/* Active Event Banner */}
      {dashboardData.activeEvent?.isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
            <div>
              <h3 className="text-white font-bold text-sm uppercase">🎉 {dashboardData.activeEvent.title}</h3>
              <p className="text-purple-300 text-xs">{dashboardData.activeEvent.bonus}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* SINAIS VITAIS - HP e MANA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* HP - Orçamento Disponível */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative bg-gradient-to-br from-slate-900 to-slate-800 border-4 rounded-2xl p-4 sm:p-8 overflow-hidden"
          style={{
            borderColor: dashboardData.metrics.monthlySafeToSpend > 100 ? '#22c55e' :
              dashboardData.metrics.monthlySafeToSpend > 0 ? '#eab308' : '#ef4444'
          }}
        >
          {/* Glow Effect */}
          <div
            className="absolute inset-0 blur-3xl opacity-30"
            style={{
              background: dashboardData.metrics.monthlySafeToSpend > 100
                ? 'radial-gradient(circle at 50% 50%, #22c55e, transparent)'
                : dashboardData.metrics.monthlySafeToSpend > 0
                  ? 'radial-gradient(circle at 50% 50%, #eab308, transparent)'
                  : 'radial-gradient(circle at 50% 50%, #ef4444, transparent)'
            }}
          />

          <div className="relative text-center">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <motion.div
                animate={{
                  scale: dashboardData.metrics.monthlySafeToSpend < 0 ? [1, 1.1, 1] : [1, 1.05, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Shield className={`w-16 h-16 ${dashboardData.metrics.monthlySafeToSpend > 100 ? 'text-green-400' :
                  dashboardData.metrics.monthlySafeToSpend > 0 ? 'text-yellow-400' : 'text-red-400'
                  }`} />
              </motion.div>
            </div>

            {/* Label */}
            <h3 className="text-slate-400 text-xs uppercase tracking-[0.3em] font-bold mb-2">
              HP • ORÇAMENTO
            </h3>

            {/* Value */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className={`text-4xl sm:text-6xl md:text-7xl font-black mb-2 ${dashboardData.metrics.monthlySafeToSpend > 100 ? 'text-green-400' :
                dashboardData.metrics.monthlySafeToSpend > 0 ? 'text-yellow-400' : 'text-red-400'
                }`}
            >
              R$ {dashboardData.metrics.monthlySafeToSpend.toFixed(2)}
            </motion.div>

            {/* Description */}
            <p className="text-slate-400 text-sm mb-6">Disponível para gastar hoje</p>

            {/* Status Bar */}
            <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <motion.div
                className={`h-full ${dashboardData.metrics.monthlySafeToSpend > 100 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                  dashboardData.metrics.monthlySafeToSpend > 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                    'bg-gradient-to-r from-red-600 to-red-500 animate-pulse'
                  }`}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5 }}
              />
            </div>

            {/* Status Message */}
            <div className="mt-4 px-3 py-2 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-slate-400">
                {dashboardData.metrics.monthlySafeToSpend > 100
                  ? '✅ HP Alto: Você está seguro para gastar!'
                  : dashboardData.metrics.monthlySafeToSpend > 0
                    ? '⚠️ HP Baixo: Cuidado com gastos extras'
                    : '🔴 CRÍTICO: Orçamento estourado! Reduza despesas.'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* MANA - Reserva/Investimentos */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="relative bg-gradient-to-br from-slate-900 to-slate-800 border-4 border-purple-500/50 rounded-2xl p-4 sm:p-8 overflow-hidden"
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 blur-3xl opacity-40" />

          <div className="relative text-center">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Zap className="w-16 h-16 text-purple-400" />
              </motion.div>
            </div>

            {/* Label */}
            <h3 className="text-slate-400 text-xs uppercase tracking-[0.3em] font-bold mb-2">
              MANA • RESERVA
            </h3>

            {/* Value */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8, delay: 0.2 }}
              className="text-4xl sm:text-6xl md:text-7xl font-black text-purple-400 mb-2"
            >
              R$ {dashboardData.quickStats.totalAssets.toFixed(2)}
            </motion.div>

            {/* Description */}
            <p className="text-slate-400 text-sm">Total em ativos e investimentos</p>
          </div>
        </motion.div>
      </div>

      {/* ACTIVE QUEST FOCUS - Missão Principal do Dia */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Main Quest Card */}
        {mainQuest ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="xl:col-span-2 relative bg-gradient-to-br from-purple-900/40 to-slate-900 border-3 rounded-2xl p-4 sm:p-6 lg:p-8 overflow-hidden"
            style={{
              borderWidth: '3px',
              borderImage: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f59e0b 100%) 1'
            }}
          >
            {/* Pergaminho Background */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
              }} />
            </div>

            {/* Hologram Glow */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-yellow-500/20"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />

            <div className="relative">
              {/* Badge de Urgência */}
              {mainQuest.priority === 'urgent' && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute -top-4 -right-4 bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-full font-black text-xs uppercase shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                >
                  🔥 URGENTE
                </motion.div>
              )}

              {/* Header */}
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Scroll className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
                </motion.div>
                <div className="min-w-0 flex-1">
                  <p className="text-purple-400 text-[10px] sm:text-xs uppercase font-bold tracking-wider">
                    {mainQuest.type === 'daily' ? '📅 Quest Diária' :
                      mainQuest.type === 'weekly' ? '📆 Desafio Semanal' :
                        '⚔️ Missão de Campanha'}
                  </p>
                  <h2 className="text-white font-black text-lg sm:text-2xl break-words">{mainQuest.title}</h2>
                </div>
              </div>

              {/* Descrição */}
              <p className="text-slate-300 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">{mainQuest.description}</p>

              {/* Progresso */}
              {mainQuest.current_progress !== undefined && mainQuest.target_value && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Progresso</span>
                    <span className="text-cyan-400 font-bold">
                      {mainQuest.current_progress} / {mainQuest.target_value}
                    </span>
                  </div>
                  <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-purple-500/30">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((mainQuest.current_progress / mainQuest.target_value) * 100, 100)}%` }}
                      transition={{ duration: 1.5 }}
                    />
                  </div>
                </div>
              )}

              {/* Recompensas */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg"
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                  <span className="text-cyan-400 font-black text-sm sm:text-lg">+{mainQuest.xp_reward} XP</span>
                </motion.div>
                {mainQuest.gold_reward > 0 && (
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg"
                  >
                    <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                    <span className="text-yellow-400 font-black text-sm sm:text-lg">+{mainQuest.gold_reward} Gold</span>
                  </motion.div>
                )}
                <div className={`px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-bold uppercase ${mainQuest.difficulty === 'hard' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                  mainQuest.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                    'bg-green-500/20 text-green-400 border border-green-500/50'
                  }`}>
                  {mainQuest.difficulty}
                </div>
              </div>

              {/* Call to Action */}
              <Link to={createPageUrl('Missions')}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-500 hover:from-purple-700 hover:via-pink-700 hover:to-yellow-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                >
                  <Swords className="w-6 h-6" />
                  INICIAR MISSÃO
                  <ArrowRight className="w-6 h-6" />
                </motion.button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="xl:col-span-2 bg-slate-900/50 border border-slate-700 rounded-2xl p-6 sm:p-8 lg:p-12 text-center"
          >
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-white font-bold text-xl mb-2">Todas as Missões Completas!</h3>
            <p className="text-slate-400 mb-4">Aguarde novas missões ou crie suas próprias metas.</p>
            <Link to={createPageUrl('Vault')}>
              <button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold py-3 px-6 rounded-lg">
                Criar Nova Meta
              </button>
            </Link>
          </motion.div>
        )}

        {/* Mini-Games & Daily Grinds Widget */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3 xl:space-y-4"
        >
          {/* Daily Grinds Header */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-yellow-500/50 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-6 h-6 text-yellow-400 animate-pulse" />
              <h3 className="text-white font-bold uppercase text-sm">Daily Grinds</h3>
            </div>

            {/* Streak Check-in */}
            <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <span className="text-white font-bold text-sm">Sequência Ativa</span>
                </div>
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-orange-400 font-black text-3xl">{user?.login_streak || 0} dias</p>
              <p className="text-slate-400 text-xs mt-1">Continue voltando todo dia!</p>
            </div>

            {/* Quick Mini-Game Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Link to={createPageUrl('Vault')}>
                <button className="w-full bg-gradient-to-br from-cyan-600/20 to-blue-600/20 hover:from-cyan-600/30 hover:to-blue-600/30 border border-cyan-500/50 rounded-lg p-3 transition-all group">
                  <Trophy className="w-6 h-6 text-cyan-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-cyan-400 text-xs font-bold">Metas</p>
                </button>
              </Link>
              <Link to={createPageUrl('Shop')}>
                <button className="w-full bg-gradient-to-br from-yellow-600/20 to-orange-600/20 hover:from-yellow-600/30 hover:to-orange-600/30 border border-yellow-500/50 rounded-lg p-3 transition-all group">
                  <ShoppingBag className="w-6 h-6 text-yellow-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-yellow-400 text-xs font-bold">Loja</p>
                </button>
              </Link>
            </div>
          </div>

          {/* Missões Secundárias */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                <h4 className="text-white font-bold text-sm">Outras Missões</h4>
              </div>
              <span className="text-purple-400 font-bold text-xl">{missions.length}</span>
            </div>
            <Link to={createPageUrl('Missions')}>
              <button className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white font-bold py-2 px-4 rounded-lg transition-all text-sm flex items-center justify-center gap-2">
                Ver Todas
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          {/* Power Score */}
          <div className="bg-gradient-to-br from-yellow-900/20 to-slate-900 border-2 border-yellow-500/50 rounded-xl p-4 text-center shadow-[0_0_20px_rgba(234,179,8,0.2)]">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="w-6 h-6 text-yellow-400" />
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-slate-400 text-xs uppercase mb-2 tracking-wider">Power Score</p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="text-yellow-400 font-black text-4xl sm:text-5xl"
            >
              {Math.round(dashboardData.metrics.powerScore)}
            </motion.p>
            <div className="mt-3 pt-3 border-t border-yellow-500/30">
              <p className="text-xs text-yellow-400/70">Saúde Financeira</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* RESUMO DE LOOT - Receitas vs Despesas do Mês */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500/30 rounded-2xl p-4 sm:p-6"
      >
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Package className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
          <h2 className="text-white font-black text-base sm:text-xl uppercase">Resumo de Loot (Anual)</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Receitas */}
          <div className="text-center p-4 sm:p-6 bg-green-900/20 border border-green-500/30 rounded-xl">
            <Plus className="w-8 h-8 sm:w-10 sm:h-10 text-green-400 mx-auto mb-2 sm:mb-3" />
            <p className="text-slate-400 text-[10px] sm:text-xs uppercase mb-2">Receitas</p>
            <p className="text-green-400 font-black text-2xl sm:text-4xl">
              +R$ {dreData.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Despesas */}
          <div className="text-center p-4 sm:p-6 bg-red-900/20 border border-red-500/30 rounded-xl">
            <Minus className="w-8 h-8 sm:w-10 sm:h-10 text-red-400 mx-auto mb-2 sm:mb-3" />
            <p className="text-slate-400 text-[10px] sm:text-xs uppercase mb-2">Despesas</p>
            <p className="text-red-400 font-black text-2xl sm:text-4xl">
              -R$ {dreData.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Resultado */}
          <div className={`text-center p-4 sm:p-6 rounded-xl border-2 ${dreData.netResult >= 0
            ? 'bg-cyan-900/20 border-cyan-500/50'
            : 'bg-red-900/20 border-red-500/50'
            }`}>
            {dreData.netResult >= 0 ? (
              <CheckCircle className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
            ) : (
              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-red-400 mx-auto mb-2 sm:mb-3 animate-pulse" />
            )}
            <p className="text-slate-400 text-[10px] sm:text-xs uppercase mb-2">Resultado</p>
            <p className={`font-black text-2xl sm:text-4xl ${dreData.netResult >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
              {dreData.netResult >= 0 ? '+' : ''}R$ {dreData.netResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Metas em Destaque */}
      {goals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-magenta-900/30 to-slate-900 border-2 border-magenta-500/50 rounded-xl p-6 shadow-[0_0_30px_rgba(255,0,255,0.2)]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400 animate-pulse" />
              <h3 className="text-white font-bold uppercase">Metas Lendárias</h3>
            </div>
            <Link to={createPageUrl('Vault')} className="text-magenta-400 hover:text-magenta-300 text-xs font-semibold flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {goals.slice(0, 2).map(goal => {
              const progress = (goal.current_amount / goal.target_amount) * 100;
              return (
                <div key={goal.id} className="p-4 bg-slate-900/70 rounded-lg border border-magenta-500/20 hover:border-magenta-500/40 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{goal.icon}</span>
                    <div className="flex-1">
                      <p className="text-white font-bold">{goal.name}</p>
                      <p className="text-magenta-400 text-xs font-semibold">{goal.legendary_item}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">{progress.toFixed(0)}%</span>
                    <span className="text-magenta-400 font-bold">R$ {goal.current_amount.toFixed(0)} / {goal.target_amount.toFixed(0)}</span>
                  </div>
                  <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-magenta-500/30">
                    <motion.div
                      className="h-full bg-gradient-to-r from-magenta-500 via-purple-500 to-pink-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress, 100)}%` }}
                      transition={{ duration: 1, delay: 0.7 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* SMART FINANCIAL ADVISOR - IA Inteligente */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.62 }}
        className="space-y-3"
      >
        <h2 className="text-white font-black text-lg">💡 Insights Inteligentes</h2>
        <SmartFinancialAdvisor />
      </motion.div>

      {/* GAMIFICATION HUB - Pontos, Badges, Ranking */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.68 }}
      >
        <GamificationHub />
      </motion.div>

      {/* Financial Chatbot */}
      <FinancialChatbot />

      {/* Integrations Dashboard */}
      <IntegrationsDashboard />

      {/* BOTTOM NAVIGATION */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pb-20 sm:pb-24"
      >
        <Link to={createPageUrl('CommandCenter')}>
          <button className="w-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition-all group">
            <FileText className="w-6 h-6 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-white font-semibold text-sm">Relatórios</p>
          </button>
        </Link>
        <Link to={createPageUrl('Leaderboard')}>
          <button className="w-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition-all group">
            <Users className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-white font-semibold text-sm">Guildas</p>
          </button>
        </Link>
        <Link to={createPageUrl('Shop')}>
          <button className="w-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition-all group">
            <ShoppingBag className="w-6 h-6 text-yellow-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-white font-semibold text-sm">Shop</p>
          </button>
        </Link>
        <Link to={createPageUrl('FinancialCore')}>
          <button className="w-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border-2 border-cyan-500/50 rounded-xl p-4 transition-all group">
            <Zap className="w-6 h-6 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform animate-pulse" />
            <p className="text-white font-bold text-sm">Núcleo Estratégico</p>
          </button>
        </Link>
      </motion.div>

      {/* Skill Bar - Barra de Habilidades */}
      <SkillBar />
    </div>
  );
}