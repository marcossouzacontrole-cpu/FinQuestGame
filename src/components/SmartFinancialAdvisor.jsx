import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle, Lightbulb, Target, Zap, Loader2, Sparkles, Shield } from 'lucide-react';

export default function SmartFinancialAdvisor() {
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  // Insights automáticos (cache 1h)
  const { data: insights } = useQuery({
    queryKey: ['aiInsights', currentUser?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke('generateAIInsights', {});
      return response.data;
    },
    enabled: !!currentUser,
    refetchInterval: 60 * 60 * 1000, // 1 hora
  });

  // Previsões (cache 1h)
  const { data: predictions } = useQuery({
    queryKey: ['predictions', currentUser?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke('predictFinancialNeeds', {});
      return response.data;
    },
    enabled: !!currentUser,
    refetchInterval: 60 * 60 * 1000,
  });

  if (!insights || !predictions) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">Conselhos do Sir Coin</h2>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-1 rounded-full">
          <Shield className="w-3 h-3 text-green-400" />
          <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">IA LOCAL & PRIVADA</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {insights.insights?.some(i => i.type === 'overspending') && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-900/20 border-l-4 border-red-500 rounded-lg p-4"
        >
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-red-300 mb-1">⚠️ Alerta de Gasto</h4>
              <p className="text-sm text-slate-300">
                {insights.insights.find(i => i.type === 'overspending')?.recommendation}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Predictions */}
      {predictions.predictions?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-4"
        >
          <div className="flex gap-3">
            <Zap className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-blue-300 mb-2">📅 Próximas Despesas Previsíveis</h4>
              <div className="space-y-1 text-sm text-slate-300">
                {predictions.predictions.slice(0, 2).map((pred, idx) => (
                  <p key={idx}>
                    <span className="font-semibold">
                      {new Date(pred.predictedDate).toLocaleDateString('pt-BR')}:
                    </span>{' '}
                    ~R$ {pred.expectedExpense.toFixed(0)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Opportunities */}
      {insights.insights?.some(i => i.type === 'goal_opportunity') && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-green-900/20 border-l-4 border-green-500 rounded-lg p-4"
        >
          <div className="flex gap-3">
            <Target className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-green-300 mb-1">💡 Dica de Meta</h4>
              <p className="text-sm text-slate-300">
                {insights.insights.find(i => i.type === 'goal_opportunity')?.recommendation}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Investment Opportunity */}
      {insights.insights?.some(i => i.type === 'investment_opportunity') && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-purple-900/20 border-l-4 border-purple-500 rounded-lg p-4"
        >
          <div className="flex gap-3">
            <Lightbulb className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-purple-300 mb-1">📈 Oportunidade de Investimento</h4>
              <p className="text-sm text-slate-300">
                {insights.insights.find(i => i.type === 'investment_opportunity')?.recommendation}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Projection */}
      {insights.insights?.find(i => i.type === 'projection') && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
        >
          <h4 className="font-bold text-slate-300 mb-2">📊 Projeção Anual</h4>
          <div className="text-sm space-y-1 text-slate-400">
            <p>
              Gasto mensal: <span className="text-red-400 font-semibold">R$ {insights.insights.find(i => i.type === 'projection')?.monthlySpend.toFixed(0)}</span>
            </p>
            <p>
              Projeção anual: <span className="text-red-400 font-semibold">R$ {insights.insights.find(i => i.type === 'projection')?.yearlyProjection.toFixed(0)}</span>
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}