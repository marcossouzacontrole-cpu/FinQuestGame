import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Award, TrendingUp, Shield, Target } from 'lucide-react';
import NeonCard from './NeonCard';

export default function FinancialHealthScore() {
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: healthData } = useQuery({
    queryKey: ['financialHealth', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;

      const [profile, assets, debts, budgets] = await Promise.all([
        base44.entities.FinancialProfile.filter({ created_by: currentUser.email }),
        base44.entities.Asset.filter({ created_by: currentUser.email }),
        base44.entities.Debt.filter({ created_by: currentUser.email }),
        base44.entities.Budget.filter({ created_by: currentUser.email })
      ]);

      const userProfile = profile[0];
      const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
      const totalDebts = debts.reduce((sum, d) => sum + d.outstanding_balance, 0);
      const monthlyIncome = userProfile?.monthly_income || 1;

      // 1. Taxa de Poupança (40% do score)
      const savingsRate = userProfile?.savings_percentage || 0;
      const savingsScore = Math.min((savingsRate / 30) * 400, 400); // 30% = score máximo

      // 2. Relação Dívida/Renda (40% do score)
      const debtToIncome = (totalDebts / monthlyIncome) * 100;
      let debtScore = 0;
      if (debtToIncome === 0) debtScore = 400;
      else if (debtToIncome < 30) debtScore = 400 - (debtToIncome * 8);
      else if (debtToIncome < 50) debtScore = 160 - ((debtToIncome - 30) * 5);
      else debtScore = Math.max(0, 60 - (debtToIncome - 50));

      // 3. Diversificação de Ativos (20% do score)
      const assetTypes = new Set(assets.map(a => a.type)).size;
      const diversificationScore = Math.min(assetTypes * 50, 200);

      const totalScore = Math.round(savingsScore + debtScore + diversificationScore);

      const getRank = (score) => {
        if (score >= 900) return { rank: 'Lendário', color: 'from-yellow-400 to-orange-500', icon: '👑' };
        if (score >= 750) return { rank: 'Mestre', color: 'from-purple-500 to-violet-500', icon: '🎓' };
        if (score >= 600) return { rank: 'Conquistador', color: 'from-green-500 to-emerald-500', icon: '⚔️' };
        if (score >= 400) return { rank: 'Explorador', color: 'from-blue-500 to-cyan-500', icon: '🧭' };
        return { rank: 'Novato', color: 'from-gray-500 to-gray-600', icon: '🌱' };
      };

      const rankInfo = getRank(totalScore);

      return {
        totalScore,
        savingsScore: Math.round(savingsScore),
        debtScore: Math.round(debtScore),
        diversificationScore: Math.round(diversificationScore),
        savingsRate,
        debtToIncome: debtToIncome.toFixed(1),
        assetTypes,
        ...rankInfo
      };
    },
    enabled: !!currentUser?.email
  });

  if (!healthData) {
    return null;
  }

  return (
    <NeonCard glowColor="gold" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-full blur-3xl" />
      
      <div className="relative space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${healthData.color} flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.4)]`}>
              <span className="text-3xl">{healthData.icon}</span>
            </div>
            <div>
              <h3 className="text-white font-black text-2xl">Score de Batalha</h3>
              <p className="text-gray-400 text-sm">Saúde Financeira Gamificada</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-5xl font-black bg-gradient-to-r ${healthData.color} bg-clip-text text-transparent`}>
              {healthData.totalScore}
            </p>
            <p className="text-gray-400 text-sm">/ 1000</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className={`font-bold bg-gradient-to-r ${healthData.color} bg-clip-text text-transparent`}>
              {healthData.rank}
            </span>
            <span className="text-gray-400">
              {((healthData.totalScore / 1000) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-4 bg-[#0a0a1a] rounded-full overflow-hidden border border-yellow-500/30">
            <div
              className={`h-full bg-gradient-to-r ${healthData.color} transition-all duration-500 relative overflow-hidden`}
              style={{ width: `${(healthData.totalScore / 1000) * 100}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
            </div>
          </div>
        </div>

        {/* Component Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-gray-400 text-xs">Taxa Poupança</span>
            </div>
            <p className="text-white font-bold text-lg">{healthData.savingsScore}</p>
            <p className="text-green-400 text-xs">{healthData.savingsRate}% / mês</p>
          </div>

          <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-orange-400" />
              <span className="text-gray-400 text-xs">Dívida/Renda</span>
            </div>
            <p className="text-white font-bold text-lg">{healthData.debtScore}</p>
            <p className="text-orange-400 text-xs">{healthData.debtToIncome}%</p>
          </div>

          <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-gray-400 text-xs">Diversificação</span>
            </div>
            <p className="text-white font-bold text-lg">{healthData.diversificationScore}</p>
            <p className="text-cyan-400 text-xs">{healthData.assetTypes} tipos de ativos</p>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <p className="text-yellow-400 text-xs">
            <Award className="w-4 h-4 inline mr-1" />
            <strong>Score baseado em:</strong> Taxa de Poupança (40%), Relação Dívida/Renda (40%), Diversificação de Ativos (20%)
          </p>
        </div>
      </div>
    </NeonCard>
  );
}