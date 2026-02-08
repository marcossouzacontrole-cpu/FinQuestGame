import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Trophy, Lock, Star, Sparkles, TrendingUp } from 'lucide-react';

export default function FinancialMilestonesPanel() {
  const { data: user } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me()
  });

  const { data: allMilestones = [] } = useQuery({
    queryKey: ['financialMilestones'],
    queryFn: () => base44.entities.FinancialMilestone.list('order_index')
  });

  // Remover duplicatas baseado no title
  const milestones = useMemo(() => {
    const uniqueMap = new Map();
    allMilestones.forEach(m => {
      if (!uniqueMap.has(m.title)) {
        uniqueMap.set(m.title, m);
      }
    });
    return Array.from(uniqueMap.values());
  }, [allMilestones]);

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.filter({ created_by: user?.email }),
    enabled: !!user
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['debts'],
    queryFn: () => base44.entities.Debt.filter({ created_by: user?.email }),
    enabled: !!user
  });

  const { data: userData } = useQuery({
    queryKey: ['userData', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.User.filter({ email: user.email });
      return profiles[0];
    },
    enabled: !!user
  });

  const currentMetrics = useMemo(() => {
    const totalAssets = assets.reduce((sum, a) => sum + (a.value || 0), 0);
    const totalDebts = debts.reduce((sum, d) => sum + (d.outstanding_balance || 0), 0);
    const netWorth = totalAssets - totalDebts;
    const investments = assets.filter(a => a.type === 'investment').reduce((sum, a) => sum + a.value, 0);
    const savings = assets.filter(a => a.type === 'cash').reduce((sum, a) => sum + a.value, 0);
    const streak = userData?.login_streak || 0;

    return { netWorth, investments, savings, totalDebts, streak };
  }, [assets, debts, userData]);

  const groupedMilestones = useMemo(() => {
    const groups = {
      investment: [],
      net_worth: [],
      savings: [],
      debt_free: [],
      streak: []
    };

    milestones.forEach(m => {
      if (groups[m.milestone_type]) {
        groups[m.milestone_type].push(m);
      }
    });

    return groups;
  }, [milestones]);

  const calculateProgress = (milestone) => {
    let current = 0;
    switch (milestone.milestone_type) {
      case 'investment':
        current = currentMetrics.investments;
        break;
      case 'net_worth':
        current = currentMetrics.netWorth;
        break;
      case 'savings':
        current = currentMetrics.savings;
        break;
      case 'debt_free':
        current = currentMetrics.totalDebts;
        return currentMetrics.totalDebts === 0 ? 100 : 0;
      case 'streak':
        current = currentMetrics.streak;
        break;
    }
    return Math.min((current / milestone.target_value) * 100, 100);
  };

  const rarityColors = {
    common: 'from-slate-500 to-slate-600',
    rare: 'from-blue-500 to-purple-500',
    epic: 'from-purple-500 to-pink-500',
    legendary: 'from-yellow-400 to-orange-500'
  };

  const rarityGlow = {
    common: 'shadow-[0_0_15px_rgba(148,163,184,0.5)]',
    rare: 'shadow-[0_0_20px_rgba(139,92,246,0.6)]',
    epic: 'shadow-[0_0_25px_rgba(236,72,153,0.7)]',
    legendary: 'shadow-[0_0_30px_rgba(251,191,36,0.8)]'
  };

  const MilestoneCard = ({ milestone }) => {
    const progress = calculateProgress(milestone);
    const isAchieved = milestone.achieved || progress >= 100;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: isAchieved ? 1.05 : 1.02 }}
        className={`relative p-4 rounded-xl border backdrop-blur-xl transition-all ${
          isAchieved
            ? `bg-gradient-to-br ${rarityColors[milestone.rarity]} ${rarityGlow[milestone.rarity]} border-transparent`
            : 'bg-slate-900/80 border-slate-700'
        }`}
      >
        {isAchieved && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute top-2 right-2"
          >
            <Sparkles className="w-5 h-5 text-yellow-300" />
          </motion.div>
        )}

        <div className="flex items-start gap-3 mb-3">
          <div className={`text-4xl ${isAchieved ? 'animate-bounce' : 'opacity-50'}`}>
            {milestone.badge_icon}
          </div>
          <div className="flex-1">
            <h4 className={`font-bold ${isAchieved ? 'text-white' : 'text-slate-400'}`}>
              {milestone.title}
            </h4>
            <p className={`text-xs ${isAchieved ? 'text-white/80' : 'text-slate-500'}`}>
              {milestone.description}
            </p>
          </div>
          {!isAchieved && <Lock className="w-5 h-5 text-slate-500" />}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={isAchieved ? 'text-white font-bold' : 'text-slate-400'}>
              {milestone.rarity === 'legendary' && '👑 '}
              {milestone.rarity === 'epic' && '💎 '}
              {milestone.rarity === 'rare' && '⭐ '}
              {milestone.rarity.toUpperCase()}
            </span>
            <span className={`font-bold ${isAchieved ? 'text-yellow-300' : 'text-cyan-400'}`}>
              +{milestone.xp_reward} XP
            </span>
          </div>

          {!isAchieved && (
            <div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1 text-center">
                {progress.toFixed(0)}%
              </p>
            </div>
          )}

          {isAchieved && (
            <div className="flex items-center justify-center gap-1 text-yellow-300 font-bold text-sm">
              <Trophy className="w-4 h-4" />
              CONQUISTADO
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 uppercase mb-2">
          Marcos Financeiros Lendários
        </h2>
        <p className="text-slate-400">Conquiste badges épicas por suas realizações financeiras</p>
      </div>

      {/* Investimentos */}
      {groupedMilestones.investment.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-400" />
            💎 Jornada do Investidor
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {groupedMilestones.investment.map(m => (
              <MilestoneCard key={m.id} milestone={m} />
            ))}
          </div>
        </div>
      )}

      {/* Patrimônio Líquido */}
      {groupedMilestones.net_worth.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-cyan-400" />
            🏰 Construção de Patrimônio
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedMilestones.net_worth.map(m => (
              <MilestoneCard key={m.id} milestone={m} />
            ))}
          </div>
        </div>
      )}

      {/* Poupança */}
      {groupedMilestones.savings.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Star className="w-6 h-6 text-pink-400" />
            🐷 Mestre da Poupança
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedMilestones.savings.map(m => (
              <MilestoneCard key={m.id} milestone={m} />
            ))}
          </div>
        </div>
      )}

      {/* Livre de Dívidas */}
      {groupedMilestones.debt_free.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            🦅 Libertação Financeira
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {groupedMilestones.debt_free.map(m => (
              <MilestoneCard key={m.id} milestone={m} />
            ))}
          </div>
        </div>
      )}

      {/* Streak */}
      {groupedMilestones.streak.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-orange-400" />
            🔥 Disciplina Inabalável
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {groupedMilestones.streak.map(m => (
              <MilestoneCard key={m.id} milestone={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}