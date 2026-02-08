import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Brain, AlertTriangle, Lightbulb, Target, Zap, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

const COLORS = ['#00FFFF', '#FF00FF', '#39FF14', '#FFD700', '#FF6B6B'];

export default function AIFinancialInsightsAdvanced({ 
  transactions, 
  budgetCategories, 
  financialProfile,
  netWorthData 
}) {
  const [insights, setInsights] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeWithAI = useMutation({
    mutationFn: async () => {
      setIsAnalyzing(true);

      const prompt = `
Você é um analista financeiro especializado. Analise os dados abaixo e gere insights acionáveis:

PERFIL:
${JSON.stringify(financialProfile, null, 2)}

TRANSAÇÕES RECENTES:
${JSON.stringify(transactions.slice(0, 100), null, 2)}

CATEGORIAS DE ORÇAMENTO:
${JSON.stringify(budgetCategories, null, 2)}

PATRIMÔNIO:
- Ativos: R$ ${netWorthData?.assets?.reduce((sum, a) => sum + a.value, 0) || 0}
- Passivos: R$ ${netWorthData?.debts?.reduce((sum, d) => sum + d.outstanding_balance, 0) || 0}

GERE:
1. Análise de saúde financeira (score 0-100)
2. Top 3 oportunidades de economia
3. Alertas importantes (gastos anormais, tendências negativas)
4. Recomendações personalizadas
5. Dados para gráficos:
   - Gastos por categoria (últimos 30 dias)
   - Tendência de gastos (últimos 6 meses)
   - Comparativo orçado vs real

JSON formato:
{
  "financial_health_score": 75,
  "health_analysis": "Sua saúde financeira está boa, mas há espaço para melhorias",
  "savings_opportunities": [
    { "category": "Alimentação", "potential_savings": 300, "tip": "..." }
  ],
  "alerts": [
    { "level": "warning", "message": "...", "action": "..." }
  ],
  "recommendations": ["...", "..."],
  "charts": {
    "spending_by_category": [
      { "name": "Alimentação", "value": 1500 }
    ],
    "spending_trend": [
      { "month": "Jun", "spending": 3000, "budget": 3500 }
    ],
    "budget_vs_actual": [
      { "category": "Alimentação", "budget": 1000, "actual": 1200 }
    ]
  }
}
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            financial_health_score: { type: "number" },
            health_analysis: { type: "string" },
            savings_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  potential_savings: { type: "number" },
                  tip: { type: "string" }
                }
              }
            },
            alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  level: { type: "string" },
                  message: { type: "string" },
                  action: { type: "string" }
                }
              }
            },
            recommendations: { type: "array", items: { type: "string" } },
            charts: {
              type: "object",
              properties: {
                spending_by_category: { type: "array" },
                spending_trend: { type: "array" },
                budget_vs_actual: { type: "array" }
              }
            }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setInsights(data);
      setIsAnalyzing(false);
    },
    onError: () => {
      setIsAnalyzing(false);
    }
  });

  // Auto-analyze on mount
  React.useEffect(() => {
    if (transactions.length > 0 && !insights) {
      analyzeWithAI.mutate();
    }
  }, [transactions.length]);

  if (isAnalyzing) {
    return (
      <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl p-8 text-center">
        <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
        <p className="text-white font-bold text-xl mb-2">Analisando seus dados...</p>
        <p className="text-slate-400">A IA está processando milhares de pontos de dados</p>
      </div>
    );
  }

  if (!insights) {
    return (
      <button
        onClick={() => analyzeWithAI.mutate()}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3"
      >
        <Brain className="w-5 h-5" />
        Gerar Análise Inteligente
        <Sparkles className="w-5 h-5" />
      </button>
    );
  }

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-black text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            Saúde Financeira
          </h3>
          <button
            onClick={() => analyzeWithAI.mutate()}
            className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <Zap className="w-4 h-4" />
            Atualizar
          </button>
        </div>
        
        <div className="text-center mb-4">
          <div className={`text-7xl font-black ${getHealthColor(insights.financial_health_score)}`}>
            {insights.financial_health_score}
          </div>
          <div className="h-4 bg-slate-800 rounded-full mt-4 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-1000"
              style={{ width: `${insights.financial_health_score}%` }}
            />
          </div>
        </div>
        
        <p className="text-slate-300 text-center">{insights.health_analysis}</p>
      </motion.div>

      {/* Alerts */}
      {insights.alerts.length > 0 && (
        <div className="space-y-3">
          {insights.alerts.map((alert, idx) => (
            <motion.div
              key={idx}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-4 rounded-xl border ${
                alert.level === 'critical' 
                  ? 'bg-red-900/20 border-red-500/50' 
                  : 'bg-orange-900/20 border-orange-500/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                  alert.level === 'critical' ? 'text-red-400' : 'text-orange-400'
                }`} />
                <div className="flex-1">
                  <p className="text-white font-bold mb-1">{alert.message}</p>
                  <p className="text-slate-400 text-sm">{alert.action}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Savings Opportunities */}
      {insights.savings_opportunities.length > 0 && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-green-400" />
            Oportunidades de Economia
          </h3>
          <div className="space-y-3">
            {insights.savings_opportunities.map((opp, idx) => (
              <div key={idx} className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-bold">{opp.category}</span>
                  <span className="text-green-400 font-mono font-bold">
                    -R$ {opp.potential_savings.toFixed(2)}
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{opp.tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category */}
        {insights.charts?.spending_by_category && (
          <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-6">
            <h4 className="text-white font-bold mb-4">Gastos por Categoria</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={insights.charts.spending_by_category}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {insights.charts.spending_by_category.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Budget vs Actual */}
        {insights.charts?.budget_vs_actual && (
          <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-6">
            <h4 className="text-white font-bold mb-4">Orçado vs Real</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={insights.charts.budget_vs_actual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="budget" fill="#00FFFF" name="Orçado" />
                <Bar dataKey="actual" fill="#FF00FF" name="Real" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            Recomendações Personalizadas
          </h3>
          <ul className="space-y-2">
            {insights.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-300">
                <span className="text-cyan-400 mt-1">✦</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}