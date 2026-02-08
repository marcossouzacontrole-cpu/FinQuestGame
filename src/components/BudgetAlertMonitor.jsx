import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, TrendingUp, Brain, Sparkles, X, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';

export default function BudgetAlertMonitor({ selectedMonth }) {
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictions, setPredictions] = useState(null);

  const { data: alerts = [] } = useQuery({
    queryKey: ['budgetAlerts'],
    queryFn: () => base44.entities.BudgetAlert.list()
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  const { data: finTransactions = [] } = useQuery({
    queryKey: ['finTransactions'],
    queryFn: () => base44.entities.FinTransaction.list('-created_date')
  });

  // Calculate spending for selected month
  const monthlySpending = useMemo(() => {
    const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
    const monthEnd = endOfMonth(parseISO(`${selectedMonth}-01`));

    const spending = {};
    finTransactions
      .filter(t => {
        if (t.type !== 'expense' || !t.date) return false;
        const transDate = parseISO(t.date);
        return isWithinInterval(transDate, { start: monthStart, end: monthEnd });
      })
      .forEach(trans => {
        const cat = trans.category;
        if (!spending[cat]) spending[cat] = 0;
        spending[cat] += Math.abs(trans.value);
      });

    return spending;
  }, [finTransactions, selectedMonth]);

  // Active alerts with current status
  const activeAlerts = useMemo(() => {
    return alerts
      .filter(a => a.is_active && !dismissedAlerts.includes(a.id))
      .map(alert => {
        const category = categories.find(c => c.name === alert.category_name);
        if (!category) return null;

        const budget = category.budget || 0;
        const spent = monthlySpending[alert.category_name] || 0;
        const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
        const isTriggered = percentUsed >= alert.alert_threshold_percent;

        return {
          ...alert,
          category,
          budget,
          spent,
          percentUsed,
          isTriggered,
          remaining: budget - spent
        };
      })
      .filter(a => a && a.isTriggered)
      .sort((a, b) => b.percentUsed - a.percentUsed);
  }, [alerts, categories, monthlySpending, dismissedAlerts]);

  // AI Prediction
  const predictFutureMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const currentDay = now.getDate();
      const daysRemaining = daysInMonth - currentDay;

      const categoriesData = categories
        .filter(c => c.category_type === 'expense')
        .map(cat => ({
          name: cat.name,
          budget: cat.budget || 0,
          spent: monthlySpending[cat.name] || 0,
          percentUsed: cat.budget > 0 ? ((monthlySpending[cat.name] || 0) / cat.budget) * 100 : 0
        }));

      const prompt = `
Analise os gastos atuais e preveja possíveis estouros de orçamento:

DIA ATUAL: ${currentDay} de ${daysInMonth} (${daysRemaining} dias restantes)

GASTOS ATÉ AGORA:
${categoriesData.map(c => `- ${c.name}: R$ ${c.spent.toFixed(2)} de R$ ${c.budget.toFixed(2)} (${c.percentUsed.toFixed(1)}%)`).join('\n')}

TAREFA:
1. Analise a velocidade de gasto (spending rate)
2. Projete o gasto final do mês para cada categoria
3. Identifique categorias em risco de estourar o orçamento
4. Calcule quanto precisa economizar nos dias restantes

Retorne em JSON:
{
  "categories_at_risk": [
    {
      "name": "nome",
      "projected_spending": valor,
      "budget": valor,
      "overage_amount": valor,
      "daily_limit_remaining": valor,
      "risk_level": "alto" | "médio" | "baixo",
      "recommendation": "ação recomendada"
    }
  ],
  "overall_status": "crítico" | "atenção" | "controlado",
  "total_projected_overage": valor
}
`;

      return await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            categories_at_risk: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  projected_spending: { type: "number" },
                  budget: { type: "number" },
                  overage_amount: { type: "number" },
                  daily_limit_remaining: { type: "number" },
                  risk_level: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            overall_status: { type: "string" },
            total_projected_overage: { type: "number" }
          }
        }
      });
    },
    onSuccess: (data) => {
      setPredictions(data);
      setIsPredicting(false);
      toast.success('🔮 Previsão concluída!');
    },
    onError: () => {
      setIsPredicting(false);
      toast.error('Erro ao gerar previsão');
    }
  });

  const handleDismiss = (alertId) => {
    setDismissedAlerts([...dismissedAlerts, alertId]);
  };

  if (activeAlerts.length === 0 && !predictions) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Active Alerts */}
      <AnimatePresence>
        {activeAlerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`p-4 rounded-xl border-2 ${
              alert.percentUsed >= 100
                ? 'bg-red-500/20 border-red-500'
                : 'bg-yellow-500/20 border-yellow-500'
            } shadow-lg`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  alert.percentUsed >= 100 ? 'bg-red-500' : 'bg-yellow-500'
                }`}>
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{alert.category.icon || '💰'}</span>
                    <h4 className="text-white font-bold">{alert.category_name}</h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      alert.percentUsed >= 100 ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
                    }`}>
                      {alert.percentUsed.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">
                    {alert.percentUsed >= 100 ? '🚨 Orçamento excedido!' : '⚠️ Orçamento próximo do limite'}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-400">
                      Gasto: <span className="text-white font-bold">R$ {alert.spent.toFixed(2)}</span>
                    </span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-400">
                      Orçamento: <span className="text-white font-bold">R$ {alert.budget.toFixed(2)}</span>
                    </span>
                    {alert.remaining < 0 && (
                      <>
                        <span className="text-slate-600">|</span>
                        <span className="text-red-400 font-bold">
                          Excesso: R$ {Math.abs(alert.remaining).toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden mt-3">
                    <motion.div
                      className={`h-full ${
                        alert.percentUsed >= 100 
                          ? 'bg-gradient-to-r from-red-500 to-red-600' 
                          : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(alert.percentUsed, 100)}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDismiss(alert.id)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* AI Prediction Button */}
      <button
        onClick={() => {
          setIsPredicting(true);
          predictFutureMutation.mutate();
        }}
        disabled={isPredicting}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50"
      >
        {isPredicting ? (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Brain className="w-5 h-5" />
            </motion.div>
            Analisando tendências...
          </>
        ) : (
          <>
            <Brain className="w-5 h-5" />
            🔮 Prever Estouros Futuros com IA
            <Sparkles className="w-5 h-5" />
          </>
        )}
      </button>

      {/* Predictions Display */}
      <AnimatePresence>
        {predictions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/50 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Brain className="w-8 h-8 text-purple-400" />
                <div>
                  <h4 className="text-white font-black uppercase">Análise Preditiva</h4>
                  <p className="text-purple-300 text-sm">Projeção até o fim do mês</p>
                </div>
              </div>
              <button
                onClick={() => setPredictions(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Overall Status */}
            <div className={`p-4 rounded-xl mb-4 ${
              predictions.overall_status === 'crítico' 
                ? 'bg-red-500/20 border-2 border-red-500' 
                : predictions.overall_status === 'atenção'
                ? 'bg-yellow-500/20 border-2 border-yellow-500'
                : 'bg-green-500/20 border-2 border-green-500'
            }`}>
              <div className="flex items-center gap-2">
                {predictions.overall_status === 'crítico' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                {predictions.overall_status === 'atenção' && <Shield className="w-5 h-5 text-yellow-400" />}
                {predictions.overall_status === 'controlado' && <TrendingUp className="w-5 h-5 text-green-400" />}
                <span className="text-white font-bold uppercase">{predictions.overall_status}</span>
              </div>
              {predictions.total_projected_overage > 0 && (
                <p className="text-sm mt-2 text-slate-300">
                  Projeção de estouro total: <span className="text-red-400 font-bold">R$ {predictions.total_projected_overage.toFixed(2)}</span>
                </p>
              )}
            </div>

            {/* Risk Categories */}
            {predictions.categories_at_risk.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-white font-bold uppercase text-sm">Categorias em Risco</h5>
                {predictions.categories_at_risk.map((cat, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border ${
                    cat.risk_level === 'alto' ? 'bg-red-500/10 border-red-500' :
                    cat.risk_level === 'médio' ? 'bg-yellow-500/10 border-yellow-500' :
                    'bg-blue-500/10 border-blue-500'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h6 className="text-white font-bold">{cat.name}</h6>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        cat.risk_level === 'alto' ? 'bg-red-500 text-white' :
                        cat.risk_level === 'médio' ? 'bg-yellow-500 text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        {cat.risk_level}
                      </span>
                    </div>
                    <div className="text-sm text-slate-300 space-y-1">
                      <p>Projeção de gasto: <span className="text-white font-bold">R$ {cat.projected_spending.toFixed(2)}</span></p>
                      <p>Orçamento: <span className="text-white font-bold">R$ {cat.budget.toFixed(2)}</span></p>
                      {cat.overage_amount > 0 && (
                        <p className="text-red-400 font-bold">Estouro previsto: R$ {cat.overage_amount.toFixed(2)}</p>
                      )}
                      <p className="text-cyan-400">Limite diário restante: R$ {cat.daily_limit_remaining.toFixed(2)}/dia</p>
                      <p className="mt-2 text-purple-300 italic">💡 {cat.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}