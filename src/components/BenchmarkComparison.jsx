import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Award, Users, Shield, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import NeonCard from './NeonCard';

export default function BenchmarkComparison({ user, financialProfile }) {
  const getAgeRange = () => {
    if (!financialProfile?.age_range) return '26-35';
    return financialProfile.age_range;
  };

  const getIncomeRange = () => {
    const income = financialProfile?.monthly_income || 0;
    if (income < 2000) return '0-2k';
    if (income < 5000) return '2k-5k';
    if (income < 10000) return '5k-10k';
    if (income < 20000) return '10k-20k';
    return '20k+';
  };

  const { data: benchmark } = useQuery({
    queryKey: ['benchmark', getAgeRange(), getIncomeRange()],
    queryFn: async () => {
      const benchmarks = await base44.entities.BenchmarkData.filter({
        age_range: getAgeRange(),
        income_range: getIncomeRange()
      });
      
      // Se não houver dados, retornar médias simuladas
      if (!benchmarks || benchmarks.length === 0) {
        return {
          avg_savings_rate: 15,
          avg_debt_ratio: 35,
          avg_emergency_fund_months: 3,
          avg_net_worth: 50000,
          avg_monthly_expenses: 3000
        };
      }
      
      return benchmarks[0];
    }
  });

  // Calcular métricas do usuário
  const userSavingsRate = financialProfile?.savings_percentage || 0;
  const userDebtRatio = ((financialProfile?.total_debt || 0) / (financialProfile?.monthly_income || 1)) * 100;
  const userNetWorth = user.net_worth || 0;

  const comparisons = [
    {
      metric: 'Taxa de Poupança',
      userValue: userSavingsRate,
      avgValue: benchmark?.avg_savings_rate || 15,
      unit: '%',
      icon: Target,
      higherIsBetter: true
    },
    {
      metric: 'Razão Dívida/Renda',
      userValue: userDebtRatio,
      avgValue: benchmark?.avg_debt_ratio || 35,
      unit: '%',
      icon: Shield,
      higherIsBetter: false
    },
    {
      metric: 'Patrimônio Líquido',
      userValue: userNetWorth,
      avgValue: benchmark?.avg_net_worth || 50000,
      unit: 'R$',
      icon: TrendingUp,
      higherIsBetter: true,
      isMonetary: true
    }
  ];

  const getComparisonText = (comparison) => {
    const diff = comparison.userValue - comparison.avgValue;
    const diffPercent = ((diff / comparison.avgValue) * 100).toFixed(0);
    
    if (comparison.higherIsBetter) {
      if (diff > 0) {
        return { text: `${diffPercent}% acima da média`, color: 'text-green-400', icon: TrendingUp };
      } else {
        return { text: `${Math.abs(diffPercent)}% abaixo da média`, color: 'text-yellow-400', icon: TrendingDown };
      }
    } else {
      if (diff < 0) {
        return { text: `${Math.abs(diffPercent)}% melhor que a média`, color: 'text-green-400', icon: TrendingUp };
      } else {
        return { text: `${diffPercent}% acima da média`, color: 'text-yellow-400', icon: TrendingDown };
      }
    }
  };

  return (
    <div className="space-y-6">
      <NeonCard glowColor="purple">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase">Comparação Anônima</h2>
            <p className="text-purple-400">Como você se compara com seus pares</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-xl p-4 mb-6 border border-purple-500/30">
          <p className="text-slate-300 text-sm">
            📊 Comparando com usuários da faixa <strong className="text-purple-400">{getAgeRange()} anos</strong> e 
            renda <strong className="text-purple-400">{getIncomeRange()}</strong>
          </p>
        </div>

        {/* Comparações */}
        <div className="space-y-6">
          {comparisons.map((comparison, idx) => {
            const Icon = comparison.icon;
            const comparisonResult = getComparisonText(comparison);
            const CompIcon = comparisonResult.icon;
            
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-slate-800/50 rounded-xl p-6 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6 text-cyan-400" />
                    <h3 className="text-lg font-bold text-white">{comparison.metric}</h3>
                  </div>
                  <div className={`flex items-center gap-2 ${comparisonResult.color}`}>
                    <CompIcon className="w-5 h-5" />
                    <span className="font-bold text-sm">{comparisonResult.text}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Você</p>
                    <p className="text-2xl font-bold text-white">
                      {comparison.isMonetary 
                        ? `R$ ${comparison.userValue.toLocaleString('pt-BR')}` 
                        : `${comparison.userValue.toFixed(1)}${comparison.unit}`
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Média</p>
                    <p className="text-2xl font-bold text-slate-300">
                      {comparison.isMonetary 
                        ? `R$ ${comparison.avgValue.toLocaleString('pt-BR')}` 
                        : `${comparison.avgValue.toFixed(1)}${comparison.unit}`
                      }
                    </p>
                  </div>
                </div>

                <Progress 
                  value={(comparison.userValue / comparison.avgValue) * 100} 
                  className="h-2"
                />
              </motion.div>
            );
          })}
        </div>

        {/* Conquistas por Superação */}
        <div className="mt-6 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-xl p-6 border border-yellow-500/30">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-400" />
            Conquistas Desbloqueadas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {comparisons.filter(c => {
              if (c.higherIsBetter) return c.userValue > c.avgValue;
              return c.userValue < c.avgValue;
            }).map((achievement, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Acima da Média</p>
                  <p className="text-slate-400 text-xs">{achievement.metric}</p>
                </div>
              </div>
            ))}
            
            {comparisons.filter(c => {
              if (c.higherIsBetter) return c.userValue > c.avgValue;
              return c.userValue < c.avgValue;
            }).length === 0 && (
              <p className="text-slate-400 col-span-2 text-center py-4">
                Continue melhorando para desbloquear conquistas!
              </p>
            )}
          </div>
        </div>
      </NeonCard>
    </div>
  );
}