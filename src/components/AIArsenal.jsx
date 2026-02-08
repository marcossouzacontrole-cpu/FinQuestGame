import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, TrendingUp, Target, AlertTriangle, Zap, Brain,
  ArrowRight, LineChart, Shield, Crosshair, Flame
} from 'lucide-react';
import { toast } from 'sonner';
import { XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Area, AreaChart 
} from 'recharts';

const NeonCard = ({ children, glowColor = 'cyan', className = '' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/80',
    purple: 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-slate-900/80',
    orange: 'border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.15)] bg-slate-900/80',
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden ${colors[glowColor] || colors.cyan} ${className}`}>
      {children}
    </div>
  );
};

export default function AIArsenal({ 
  transactions, 
  dreData, 
  categoryBreakdown, 
  financialProfile,
  balanceData,
  goals 
}) {
  const [activeWeapon, setActiveWeapon] = useState(null);
  const [cashflowPrediction, setCashflowPrediction] = useState(null);
  const [budgetOptimization, setBudgetOptimization] = useState(null);
  const [anomalies, setAnomalies] = useState(null);

  // Cash Flow Prediction
  const predictCashflow = useMutation({
    mutationFn: async () => {
      const avgMonthlyIncome = financialProfile?.monthly_income || dreData.revenue;
      const avgMonthlyExpense = dreData.expenses;
      const currentBalance = balanceData.equity;

      const prompt = `
Analise o fluxo de caixa e faça previsões:

Dados Atuais:
- Saldo Atual: R$ ${currentBalance.toFixed(2)}
- Receita Mensal Média: R$ ${avgMonthlyIncome.toFixed(2)}
- Despesa Mensal Média: R$ ${avgMonthlyExpense.toFixed(2)}
- Resultado Mensal: R$ ${(avgMonthlyIncome - avgMonthlyExpense).toFixed(2)}

Categorias de Gasto (últimas):
${categoryBreakdown.slice(0, 5).map(c => `- ${c.name}: R$ ${c.expense.toFixed(2)}`).join('\n')}

GERE uma previsão de fluxo de caixa para os próximos 6 meses considerando:
1. Tendências atuais de receita e despesa
2. Sazonalidades típicas (ex: dezembro gastos maiores)
3. Possíveis riscos e oportunidades

Retorne em JSON:
{
  "projections": [
    {"month": "Mês 1", "balance": valor, "income": valor, "expense": valor},
    ...
  ],
  "insights": ["insight 1", "insight 2", "insight 3"],
  "risks": ["risco 1", "risco 2"],
  "opportunities": ["oportunidade 1"]
}
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            projections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  month: { type: "string" },
                  balance: { type: "number" },
                  income: { type: "number" },
                  expense: { type: "number" }
                }
              }
            },
            insights: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
            opportunities: { type: "array", items: { type: "string" } }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setCashflowPrediction(data);
      toast.success('🔮 Previsão de Fluxo de Caixa Gerada!');
    },
    onError: () => {
      toast.error('Erro ao prever fluxo de caixa');
    }
  });

  // Budget Optimization
  const optimizeBudget = useMutation({
    mutationFn: async () => {
      const totalBudget = financialProfile?.monthly_income || dreData.revenue;
      const currentSpending = categoryBreakdown.map(c => ({
        name: c.name,
        current: c.expense,
        percentage: totalBudget > 0 ? (c.expense / totalBudget) * 100 : 0
      }));

      const userGoals = goals.slice(0, 3).map(g => g.name).join(', ') || 'Nenhuma meta definida';

      const prompt = `
Otimize o orçamento com base nos dados:

Orçamento Total Mensal: R$ ${totalBudget.toFixed(2)}
Gastos Atuais por Categoria:
${currentSpending.slice(0, 10).map(c => `- ${c.name}: R$ ${c.current.toFixed(2)} (${c.percentage.toFixed(1)}%)`).join('\n')}

Metas do Usuário: ${userGoals}

DRE:
- Receitas: R$ ${dreData.revenue.toFixed(2)}
- Despesas: R$ ${dreData.expenses.toFixed(2)}
- Resultado: R$ ${dreData.result.toFixed(2)}

GERE recomendações de realocação inteligente:
1. Identifique categorias com gastos excessivos
2. Sugira realocações específicas (de onde para onde)
3. Propor um orçamento otimizado por categoria
4. Estimar o impacto financeiro mensal

Retorne em JSON:
{
  "recommendations": [
    {"action": "Reduzir X em Y%", "impact": "R$ economia", "priority": "alta/média/baixa"},
    ...
  ],
  "optimized_budget": [
    {"category": "nome", "current": valor, "suggested": valor, "savings": valor},
    ...
  ],
  "projected_savings": número,
  "summary": "texto resumo"
}
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  impact: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            optimized_budget: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  current: { type: "number" },
                  suggested: { type: "number" },
                  savings: { type: "number" }
                }
              }
            },
            projected_savings: { type: "number" },
            summary: { type: "string" }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setBudgetOptimization(data);
      toast.success('🎯 Otimização de Orçamento Concluída!');
    },
    onError: () => {
      toast.error('Erro ao otimizar orçamento');
    }
  });

  // Anomaly Detection
  const detectAnomalies = useMutation({
    mutationFn: async () => {
      const categoryStats = categoryBreakdown.map(c => {
        const categoryTransactions = transactions.filter(t => t.category === c.name);
        const values = categoryTransactions.map(t => Math.abs(t.value));
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const max = Math.max(...values);
        
        return {
          name: c.name,
          count: c.count,
          total: c.expense,
          avg: avg || 0,
          max: max || 0
        };
      });

      const prompt = `
Detecte anomalias e padrões incomuns nos gastos:

Estatísticas por Categoria:
${categoryStats.slice(0, 15).map(c => 
  `- ${c.name}: Total R$ ${c.total.toFixed(2)}, ${c.count} transações, Média R$ ${c.avg.toFixed(2)}, Máxima R$ ${c.max.toFixed(2)}`
).join('\n')}

Transações Recentes (amostra):
${transactions.slice(0, 20).map(t => 
  `${t.date}: ${t.description} - R$ ${Math.abs(t.value).toFixed(2)} (${t.category})`
).join('\n')}

IDENTIFIQUE:
1. Gastos muito acima da média (outliers)
2. Categorias com picos inesperados
3. Padrões de gasto preocupantes
4. Transações suspeitas ou duplicadas

Retorne em JSON:
{
  "anomalies": [
    {
      "type": "pico_categoria" | "gasto_alto" | "duplicata" | "padrão_anormal",
      "category": "nome",
      "description": "descrição detalhada",
      "severity": "crítico" | "alto" | "médio" | "baixo",
      "value": valor,
      "recommendation": "o que fazer"
    },
    ...
  ],
  "patterns": ["padrão identificado 1", "padrão 2"],
  "alerts": ["alerta 1", "alerta 2"]
}
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            anomalies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  category: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string" },
                  value: { type: "number" },
                  recommendation: { type: "string" }
                }
              }
            },
            patterns: { type: "array", items: { type: "string" } },
            alerts: { type: "array", items: { type: "string" } }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setAnomalies(data);
      toast.success('🔍 Detecção de Anomalias Completa!');
    },
    onError: () => {
      toast.error('Erro ao detectar anomalias');
    }
  });

  const weapons = [
    {
      id: 'cashflow',
      name: 'Oráculo do Fluxo',
      description: 'Previsão de saldos futuros com análise preditiva',
      icon: LineChart,
      color: 'from-cyan-500 to-blue-500',
      action: predictCashflow,
      data: cashflowPrediction
    },
    {
      id: 'optimization',
      name: 'Otimizador Tático',
      description: 'Sugestões de realocação inteligente de orçamento',
      icon: Target,
      color: 'from-purple-500 to-pink-500',
      action: optimizeBudget,
      data: budgetOptimization
    },
    {
      id: 'anomaly',
      name: 'Scanner de Ameaças',
      description: 'Detecção de gastos anormais e padrões suspeitos',
      icon: AlertTriangle,
      color: 'from-orange-500 to-red-500',
      action: detectAnomalies,
      data: anomalies
    }
  ];

  const severityColors = {
    'crítico': 'bg-red-500/20 border-red-500 text-red-400',
    'alto': 'bg-orange-500/20 border-orange-500 text-orange-400',
    'médio': 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
    'baixo': 'bg-blue-500/20 border-blue-500 text-blue-400'
  };

  const priorityColors = {
    'alta': 'bg-red-500/20 border-red-500 text-red-400',
    'média': 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
    'baixa': 'bg-green-500/20 border-green-500 text-green-400'
  };

  return (
    <div className="space-y-6">
      {/* Arsenal Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-10 h-10 text-purple-400" />
          </motion.div>
          <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 uppercase">
            ARSENAL DE IA
          </h3>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="w-10 h-10 text-cyan-400" />
          </motion.div>
        </div>
        <p className="text-slate-400 uppercase tracking-widest">
          Armas Inteligentes para Domínio Financeiro
        </p>
      </motion.div>

      {/* Weapon Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {weapons.map((weapon) => {
          const Icon = weapon.icon;
          const isActive = activeWeapon === weapon.id;
          const isLoading = weapon.action.isPending;

          return (
            <motion.div
              key={weapon.id}
              whileHover={{ scale: 1.02 }}
              className="relative"
            >
              <NeonCard 
                glowColor={isActive ? 'purple' : 'cyan'}
                className={`cursor-pointer transition-all ${
                  isActive ? 'ring-2 ring-purple-500' : ''
                }`}
              >
                <button
                  onClick={() => {
                    setActiveWeapon(weapon.id);
                    weapon.action.mutate();
                  }}
                  disabled={isLoading}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${weapon.color} rounded-xl flex items-center justify-center relative`}>
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Zap className="w-6 h-6 text-white" />
                        </motion.div>
                      ) : (
                        <Icon className="w-6 h-6 text-white" />
                      )}
                      <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-black uppercase text-sm mb-1">{weapon.name}</h4>
                      <p className="text-slate-400 text-xs">{weapon.description}</p>
                    </div>
                  </div>

                  {isActive && weapon.data && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 pt-4 border-t border-slate-700"
                    >
                      <div className="flex items-center gap-2 text-green-400 text-xs">
                        <Shield className="w-3 h-3" />
                        <span className="font-bold">ANÁLISE CONCLUÍDA</span>
                      </div>
                    </motion.div>
                  )}
                </button>
              </NeonCard>
            </motion.div>
          );
        })}
      </div>

      {/* Results Display */}
      <AnimatePresence>
        {/* Cashflow Prediction Results */}
        {activeWeapon === 'cashflow' && cashflowPrediction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <NeonCard glowColor="cyan">
              <div className="flex items-center gap-3 mb-6">
                <LineChart className="w-6 h-6 text-cyan-400" />
                <h4 className="text-white font-black uppercase text-lg">Previsão de Fluxo de Caixa (6 Meses)</h4>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cashflowPrediction.projections}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00FFFF" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#00FFFF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #06b6d4', borderRadius: '8px' }}
                    formatter={(value) => `R$ ${value.toFixed(2)}`}
                  />
                  <Area type="monotone" dataKey="balance" stroke="#00FFFF" strokeWidth={2} fill="url(#colorBalance)" />
                </AreaChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                  <h5 className="text-cyan-400 font-bold uppercase text-xs mb-2">Insights</h5>
                  <ul className="space-y-1">
                    {cashflowPrediction.insights.map((insight, idx) => (
                      <li key={idx} className="text-slate-300 text-xs flex gap-2">
                        <Sparkles className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <h5 className="text-red-400 font-bold uppercase text-xs mb-2">Riscos</h5>
                  <ul className="space-y-1">
                    {cashflowPrediction.risks.map((risk, idx) => (
                      <li key={idx} className="text-slate-300 text-xs flex gap-2">
                        <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <h5 className="text-green-400 font-bold uppercase text-xs mb-2">Oportunidades</h5>
                  <ul className="space-y-1">
                    {cashflowPrediction.opportunities.map((opp, idx) => (
                      <li key={idx} className="text-slate-300 text-xs flex gap-2">
                        <TrendingUp className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </NeonCard>
          </motion.div>
        )}

        {/* Budget Optimization Results */}
        {activeWeapon === 'optimization' && budgetOptimization && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <NeonCard glowColor="purple">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-purple-400" />
                  <h4 className="text-white font-black uppercase text-lg">Otimização de Orçamento</h4>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase">Economia Projetada</p>
                  <p className="text-2xl font-black text-green-400 font-mono">
                    +R$ {budgetOptimization.projected_savings.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl mb-6">
                <p className="text-slate-300 text-sm">{budgetOptimization.summary}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-white font-bold uppercase text-sm mb-3">Recomendações</h5>
                  <div className="space-y-2">
                    {budgetOptimization.recommendations.map((rec, idx) => (
                      <div key={idx} className={`p-3 rounded-xl border ${priorityColors[rec.priority]}`}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-white font-semibold text-sm flex-1">{rec.action}</p>
                          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-black/20">
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-xs opacity-80">{rec.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-white font-bold uppercase text-sm mb-3">Orçamento Otimizado</h5>
                  <div className="space-y-2">
                    {budgetOptimization.optimized_budget.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                        <p className="text-white font-semibold text-sm mb-2">{item.category}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-400">Atual: R$ {item.current.toFixed(2)}</span>
                          <ArrowRight className="w-3 h-3 text-cyan-400" />
                          <span className="text-cyan-400 font-bold">Sugerido: R$ {item.suggested.toFixed(2)}</span>
                        </div>
                        {item.savings > 0 && (
                          <p className="text-green-400 font-bold text-xs mt-1">
                            Economia: R$ {item.savings.toFixed(2)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </NeonCard>
          </motion.div>
        )}

        {/* Anomaly Detection Results */}
        {activeWeapon === 'anomaly' && anomalies && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <NeonCard glowColor="orange">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-6 h-6 text-orange-400 animate-pulse" />
                <h4 className="text-white font-black uppercase text-lg">Detecção de Anomalias</h4>
              </div>

              {anomalies.alerts.length > 0 && (
                <div className="mb-6 space-y-2">
                  {anomalies.alerts.map((alert, idx) => (
                    <div key={idx} className="p-3 bg-red-500/10 border-l-4 border-red-500 rounded text-red-300 text-sm flex items-start gap-2">
                      <Flame className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-white font-bold uppercase text-sm mb-3">Anomalias Detectadas</h5>
                  <div className="space-y-3">
                    {anomalies.anomalies.map((anomaly, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border ${severityColors[anomaly.severity]}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-white font-bold text-sm">{anomaly.category}</p>
                          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-black/20">
                            {anomaly.severity}
                          </span>
                        </div>
                        <p className="text-sm mb-2 opacity-90">{anomaly.description}</p>
                        <div className="flex items-center gap-2 text-xs opacity-70 mb-2">
                          <Crosshair className="w-3 h-3" />
                          <span>Valor: R$ {anomaly.value.toFixed(2)}</span>
                        </div>
                        <div className="p-2 bg-black/20 rounded text-xs">
                          <strong>Recomendação:</strong> {anomaly.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-white font-bold uppercase text-sm mb-3">Padrões Identificados</h5>
                  <div className="space-y-2">
                    {anomalies.patterns.map((pattern, idx) => (
                      <div key={idx} className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 text-slate-300 text-sm flex gap-2">
                        <Brain className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                        <span>{pattern}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </NeonCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}