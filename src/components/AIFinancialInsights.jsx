import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle, Lightbulb, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NeonCard from './NeonCard';
import { toast } from 'sonner';

export default function AIFinancialInsights() {
  const queryClient = useQueryClient();
  const [dismissedInsights, setDismissedInsights] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState([]);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch all financial data
  const { data: financialData } = useQuery({
    queryKey: ['financialDataForAI', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;

      const [profile, assets, debts, goals, budgets, missions, userProfile] = await Promise.all([
        base44.entities.FinancialProfile.filter({ created_by: currentUser.email }),
        base44.entities.Asset.filter({ created_by: currentUser.email }),
        base44.entities.Debt.filter({ created_by: currentUser.email }),
        base44.entities.Goal.filter({ created_by: currentUser.email }),
        base44.entities.Budget.filter({ created_by: currentUser.email }),
        base44.entities.Mission.filter({ created_by: currentUser.email }),
        base44.entities.User.filter({ email: currentUser.email })
      ]);

      return {
        profile: profile[0],
        assets,
        debts,
        goals,
        budgets,
        user: userProfile[0]
      };
    },
    enabled: !!currentUser?.email
  });

  // Generate insights mutation
  const generateInsights = useMutation({
    mutationFn: async () => {
      if (!financialData) return [];

      const { profile, assets, debts, goals, budgets, user } = financialData;

      const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
      const totalDebts = debts.reduce((sum, d) => sum + d.outstanding_balance, 0);
      const netWorth = totalAssets - totalDebts;
      const highInterestDebts = debts.filter(d => d.interest_rate > 5);
      const totalBudget = budgets.reduce((sum, b) => sum + b.planned_amount, 0);
      const totalSpent = budgets.reduce((sum, b) => sum + b.spent_amount, 0);
      const overBudgetCategories = budgets.filter(b => b.spent_amount > b.planned_amount);
      const goalsProgress = goals.map(g => (g.current_amount / g.target_amount) * 100);
      const stagnantGoals = goals.filter(g => (g.current_amount / g.target_amount) < 0.1);

      const analysisPrompt = `
Você é um AI Financial Coach analisando a situação financeira de um usuário. Gere 3-5 insights ACIONÁVEIS e PRIORIZADOS.

DADOS DO USUÁRIO:
Perfil:
- Renda mensal: R$ ${profile?.monthly_income || 0}
- Poupança mensal: ${profile?.savings_percentage || 0}%
- Conhecimento financeiro: ${profile?.financial_knowledge_level || 0}/5
- Objetivos: ${profile?.financial_goals?.join(', ') || 'Nenhum'}

Finanças:
- Patrimônio líquido: R$ ${netWorth.toFixed(2)}
- Total em ativos: R$ ${totalAssets.toFixed(2)}
- Total em dívidas: R$ ${totalDebts.toFixed(2)}
- Dívidas com juros altos (>5%): ${highInterestDebts.length}
- Metas ativas: ${goals.length} (metas estagnadas: ${stagnantGoals.length})
- Orçamento mensal: R$ ${totalBudget.toFixed(2)} (gasto: R$ ${totalSpent.toFixed(2)})
- Categorias acima do orçamento: ${overBudgetCategories.length}

INSTRUÇÕES:
1. Identifique os 3-5 insights mais CRÍTICOS e ACIONÁVEIS
2. Para cada insight, forneça:
   - Tipo: "risk" (alerta), "opportunity" (oportunidade), ou "achievement" (conquista)
   - Título (máx 60 caracteres)
   - Descrição (máx 120 caracteres)
   - Ação recomendada (máx 80 caracteres)
   - Prioridade: "high", "medium", ou "low"

3. Priorize: riscos urgentes > oportunidades de economia > conquistas motivadoras

FORMATO DE RESPOSTA (JSON):
{
  "insights": [
    {
      "type": "risk|opportunity|achievement",
      "title": "string",
      "description": "string",
      "action": "string",
      "priority": "high|medium|low"
    }
  ]
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["risk", "opportunity", "achievement"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  action: { type: "string" },
                  priority: { type: "string", enum: ["high", "medium", "low"] }
                }
              }
            }
          }
        }
      });

      return response.insights || [];
    },
    onSuccess: (newInsights) => {
      setIsGenerating(false);
      setInsights(newInsights);
      toast.success(`${newInsights.length} insights gerados!`, {
        description: 'Seu coach financeiro analisou sua situação.'
      });
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error('Erro ao gerar insights', {
        description: error.message || 'Tente novamente'
      });
    }
  });

  const handleGenerate = () => {
    if (!financialData) {
      toast.error('Carregando dados financeiros...');
      return;
    }
    setIsGenerating(true);
    generateInsights.mutate();
  };

  const visibleInsights = insights.filter(i => !dismissedInsights.includes(i.title));

  const insightConfig = {
    risk: { 
      icon: AlertTriangle, 
      color: 'from-red-500 to-orange-500',
      borderColor: 'border-red-500/50',
      bgColor: 'bg-red-500/10'
    },
    opportunity: { 
      icon: Lightbulb, 
      color: 'from-cyan-500 to-blue-500',
      borderColor: 'border-cyan-500/50',
      bgColor: 'bg-cyan-500/10'
    },
    achievement: { 
      icon: CheckCircle, 
      color: 'from-green-500 to-emerald-500',
      borderColor: 'border-green-500/50',
      bgColor: 'bg-green-500/10'
    }
  };

  if (!financialData) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-yellow-400" />
          <div>
            <h3 className="text-white font-bold text-lg">Insights do AI Coach</h3>
            <p className="text-gray-400 text-sm">Análise personalizada da sua situação financeira</p>
          </div>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-bold"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Analisando...' : 'Analisar Agora'}
        </Button>
      </div>

      {visibleInsights.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleInsights.map((insight, index) => {
            const config = insightConfig[insight.type];
            const Icon = config.icon;

            return (
              <NeonCard key={index} glowColor={insight.type === 'risk' ? 'magenta' : insight.type === 'opportunity' ? 'cyan' : 'green'}>
                <div className="relative">
                  <button
                    onClick={() => setDismissedInsights([...dismissedInsights, insight.title])}
                    className="absolute top-0 right-0 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-bold">{insight.title}</h4>
                        {insight.priority === 'high' && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                            URGENTE
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm">{insight.description}</p>
                    </div>
                  </div>

                  <div className={`${config.bgColor} border ${config.borderColor} rounded-lg p-3 mt-3`}>
                    <p className="text-sm font-semibold mb-1 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Ação Recomendada:
                    </p>
                    <p className="text-sm">{insight.action}</p>
                  </div>
                </div>
              </NeonCard>
            );
          })}
        </div>
      ) : (
        <NeonCard glowColor="purple">
          <div className="text-center py-8">
            <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">
              Clique em "Analisar Agora" para que o AI Coach analise sua situação financeira e gere insights personalizados.
            </p>
          </div>
        </NeonCard>
      )}
    </div>
  );
}