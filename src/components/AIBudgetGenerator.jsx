import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AIBudgetGenerator({ transactionHistory, currentProfile, onGenerate }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const generateBudgetMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);

      // Analisar histórico de transações para criar orçamentos inteligentes
      const analysisPrompt = `
Analise o seguinte perfil financeiro e histórico de transações para gerar um orçamento mensal otimizado:

PERFIL DO USUÁRIO:
- Renda mensal: R$ ${currentProfile?.monthly_income || 0}
- Despesas fixas: R$ ${currentProfile?.fixed_expenses || 0}
- Taxa de poupança atual: ${currentProfile?.savings_percentage || 0}%
- Objetivo financeiro: ${currentProfile?.main_financial_concern || 'Não definido'}

HISTÓRICO DE TRANSAÇÕES (últimas):
${JSON.stringify(transactionHistory.slice(0, 50), null, 2)}

TAREFA:
1. Identifique as principais categorias de gastos do usuário
2. Calcule a média de gasto por categoria nos últimos meses
3. Sugira um orçamento otimizado que:
   - Respeite a renda mensal do usuário
   - Reserve pelo menos 10-20% para poupança
   - Mantenha despesas essenciais (moradia, alimentação, saúde)
   - Reduza gastos supérfluos de forma realista
4. Para cada categoria, sugira:
   - Nome da categoria
   - Orçamento recomendado (valor mensal em R$)
   - Justificativa breve
   - Dica para economia (se aplicável)

RESPONDA EM JSON com o seguinte formato:
{
  "recommended_savings_rate": 15,
  "monthly_budget_total": 5000,
  "categories": [
    {
      "name": "Alimentação",
      "budget": 1000,
      "frequency": "monthly",
      "category_type": "expense",
      "icon": "🍽️",
      "color": "#10B981",
      "justification": "Baseado na média dos últimos 3 meses",
      "saving_tip": "Considere preparar mais refeições em casa"
    }
  ],
  "insights": [
    "Você gasta 30% da renda com alimentação - a média recomendada é 15-20%",
    "Seus gastos com lazer aumentaram 40% no último mês"
  ],
  "action_plan": [
    "Reduza gastos com delivery em 20%",
    "Estabeleça limite de R$ 500 para lazer mensal"
  ]
}
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_savings_rate: { type: "number" },
            monthly_budget_total: { type: "number" },
            categories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  budget: { type: "number" },
                  frequency: { type: "string" },
                  category_type: { type: "string" },
                  icon: { type: "string" },
                  color: { type: "string" },
                  justification: { type: "string" },
                  saving_tip: { type: "string" }
                }
              }
            },
            insights: { type: "array", items: { type: "string" } },
            action_plan: { type: "array", items: { type: "string" } }
          }
        }
      });

      return response;
    },
    onSuccess: async (result) => {
      // Criar categorias de orçamento no sistema
      const categories = result.categories || [];
      
      for (const cat of categories) {
        try {
          await base44.entities.BudgetCategory.create({
            name: cat.name,
            budget: cat.budget,
            frequency: cat.frequency || 'monthly',
            category_type: cat.category_type || 'expense',
            color: cat.color || '#00FFFF',
            icon: cat.icon || '📊',
            keywords: [],
            expenses: []
          });
        } catch (error) {
          console.log(`Categoria ${cat.name} já existe ou erro:`, error);
        }
      }

      queryClient.invalidateQueries(['budgetCategories']);
      
      toast.success('🧠 Orçamento Inteligente Gerado!', {
        description: `${categories.length} categorias criadas com IA`,
        duration: 5000
      });

      if (onGenerate) onGenerate(result);
      setIsGenerating(false);
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error('Erro ao gerar orçamento: ' + error.message);
    }
  });

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => generateBudgetMutation.mutate()}
      disabled={isGenerating || !transactionHistory || transactionHistory.length === 0}
      className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:from-purple-500 hover:via-pink-400 hover:to-orange-400 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(168,85,247,0.4)] disabled:shadow-none"
    >
      {isGenerating ? (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Analisando com IA...</span>
        </>
      ) : (
        <>
          <Brain className="w-5 h-5" />
          <span>Gerar Orçamento Inteligente com IA</span>
          <Sparkles className="w-5 h-5 animate-pulse" />
        </>
      )}
    </motion.button>
  );
}