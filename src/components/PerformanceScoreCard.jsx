import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Shield, Target, Flame, Zap } from 'lucide-react';

export default function PerformanceScoreCard() {
  const { data: user } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me()
  });

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['performanceScore', user?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke('calculatePerformanceScore');
      return response.data;
    },
    enabled: !!user
  });

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500/30 rounded-2xl p-6 animate-pulse">
        <div className="h-20 bg-slate-700 rounded" />
      </div>
    );
  }

  const score = performanceData?.total_score || 0;
  const metrics = performanceData?.metrics || {};
  const insights = performanceData?.insights || [];
  const rank = performanceData?.rank || 'Iniciante';

  const getRankColor = (rank) => {
    switch (rank) {
      case 'Lendário': return 'from-yellow-400 to-orange-500';
      case 'Épico': return 'from-purple-500 to-pink-500';
      case 'Raro': return 'from-blue-500 to-cyan-500';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-cyan-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500/50 rounded-2xl p-6 relative overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-xl flex items-center justify-center"
            >
              <Shield className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h3 className="text-xl font-black text-white uppercase">Performance Score</h3>
              <p className="text-cyan-400 text-sm">Seu desempenho financeiro atual</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-5xl font-black ${getScoreColor(score)}`}>{score}</div>
            <div className="text-xs text-slate-400">/ 100</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-4 bg-slate-800 rounded-full overflow-hidden border-2 border-cyan-500/30">
            <motion.div
              className={`h-full bg-gradient-to-r ${score >= 80 ? 'from-green-500 to-emerald-500' : score >= 60 ? 'from-cyan-500 to-blue-500' : score >= 40 ? 'from-yellow-500 to-orange-500' : 'from-red-500 to-orange-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Rank Badge */}
        <div className="flex items-center justify-center mb-6">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`px-6 py-3 bg-gradient-to-r ${getRankColor(rank)} rounded-xl shadow-lg border-2 border-white/20`}
          >
            <div className="text-white font-black text-center">
              <div className="text-2xl">{rank}</div>
              <div className="text-xs opacity-80">Classificação Atual</div>
            </div>
          </motion.div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              {metrics.net_worth_growth >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className="text-slate-400 text-xs">Crescimento PL</span>
            </div>
            <div className={`text-lg font-bold ${metrics.net_worth_growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.net_worth_growth >= 0 ? '+' : ''}{metrics.net_worth_growth?.toFixed(1) || 0}%
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-slate-400 text-xs">Metas Ativas</span>
            </div>
            <div className="text-lg font-bold text-purple-400">
              {metrics.active_goals || 0}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-slate-400 text-xs">Sequência</span>
            </div>
            <div className="text-lg font-bold text-orange-400">
              {metrics.streak || 0} dias
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-slate-400 text-xs">Saúde Orç.</span>
            </div>
            <div className={`text-lg font-bold ${metrics.budget_health >= 70 ? 'text-green-400' : metrics.budget_health >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {metrics.budget_health?.toFixed(0) || 0}%
            </div>
          </div>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-cyan-400 uppercase mb-2">📊 Insights Principais</div>
            {insights.slice(0, 3).map((insight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2 text-sm text-slate-300"
              >
                {insight}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}