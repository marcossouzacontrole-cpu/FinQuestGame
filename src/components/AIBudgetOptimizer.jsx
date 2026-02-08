import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BrainCircuit, Check, TrendingDown, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AIBudgetOptimizer({ categories }) {
  const [step, setStep] = useState('idle'); // idle, analyzing, reviewing, completed
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState({});
  const queryClient = useQueryClient();

  // Fetch debts for context
  const { data: debts = [] } = useQuery({ 
    queryKey: ['debts'],
    queryFn: () => base44.entities.Debt.list(),
  });

  const analyzeBudgets = async () => {
    setStep('analyzing');
    try {
      // Prepare data for AI
      const categoryData = categories.map(c => {
        const expenses = c.expenses || [];
        const totalSpent = expenses.reduce((acc, curr) => acc + curr.value, 0);
        const avgSpent = expenses.length > 0 ? totalSpent : 0; 
        
        return {
          id: c.id,
          name: c.name,
          currentBudget: c.budget,
          totalSpent: totalSpent,
          expenseCount: expenses.length,
          recentExpenses: expenses.slice(0, 5).map(e => `${e.description}: ${e.value}`).join(', ')
        };
      });

            const debtsSummary = debts.map(d => 
        `- ${d.creditor}: Devedor R$${d.outstanding_balance} (Vencimento: ${d.due_date}, Juros: ${d.interest_rate}%)`
      ).join('\n');

      const prompt = `
        Atue como um consultor financeiro pessoal de elite.
        Analise as categorias de orçamento do usuário e sugira otimizações para economizar dinheiro e atingir metas.
        O usuário possui DÍVIDAS (Inimigos) que precisam ser priorizadas para evitar juros.
        
        DADOS DO USUÁRIO (Categorias):
        ${JSON.stringify(categoryData, null, 2)}

        DÍVIDAS ATUAIS (Prioridade Máxima):
        ${debtsSummary || "Nenhuma dívida registrada."}

        INSTRUÇÕES:
        1. Para cada categoria, analise se o orçamento atual está adequado, muito alto (desperdício) ou muito baixo (irrealista).
        2. Sugira um NOVO orçamento mensal otimizado.
        3. SE houver dívidas, SUGIRA OU CRIE uma categoria "Pagamento de Dívidas" com um valor agressivo (cortando de Lazer/Outros) para quitá-las rapidamente.
           - Se a categoria "Pagamento de Dívidas" não existir nos dados, sugira criar com ID "new_debt_category".
        4. Forneça uma justificativa curta e persuasiva (1 frase).
        5. Foco em REDUZIR gastos supérfluos (Lazer, Outros, Compras) e MANTER essenciais (Moradia, Saúde) mas com eficiência.

        RETORNE UM JSON com a lista de sugestões:
        [
          {
            "categoryId": "id_existente" ou "new_debt_category",
            "suggestedBudget": 123.00,
            "reason": "Justificativa...",
            "potentialSavings": 50.00 (diferença positiva se reduzir, ou 0),
            "isNew": boolean (true se for sugerir criar categoria de dívida)
          }
        ]
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  categoryId: { type: "string" },
                  suggestedBudget: { type: "number" },
                  reason: { type: "string" },
                  potentialSavings: { type: "number" },
                  isNew: { type: "boolean" }
                },
                required: ["categoryId", "suggestedBudget", "reason"]
              }
            }
          }
        }
      });

      if (result && result.suggestions) {
        setSuggestions(result.suggestions);
        const initialSelection = {};
        let hasChanges = false;
        result.suggestions.forEach(s => {
          const cat = categories.find(c => c.id === s.categoryId);
          if (cat && Math.abs(cat.budget - s.suggestedBudget) > 1) {
             initialSelection[s.categoryId] = true;
             hasChanges = true;
          }
        });
        setSelectedSuggestions(initialSelection);
        if (!hasChanges) {
            setStep('no_changes');
        } else {
            setStep('reviewing');
        }
      } else {
        toast.error("Não foi possível gerar sugestões no momento.");
        setStep('idle');
      }

    } catch (error) {
      console.error(error);
      toast.error("Erro na análise de IA.");
      setStep('idle');
    }
  };

  const updateBudgetMutation = useMutation({
    mutationFn: async (updates) => {
      return Promise.all(updates.map(u => base44.entities.BudgetCategory.update(u.id, u.data)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetCategories']);
      toast.success('Orçamentos otimizados com sucesso!');
      setStep('completed');
    },
    onError: () => toast.error('Erro ao aplicar mudanças.')
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.BudgetCategory.create(data),
    onSuccess: () => {
        queryClient.invalidateQueries(['budgetCategories']);
        toast.success('Categoria de Dívida criada!');
    }
  });

  const handleApply = async () => {
    const updates = [];
    const newCategories = [];

    for (const catId of Object.keys(selectedSuggestions)) {
      if (selectedSuggestions[catId]) {
        const suggestion = suggestions.find(s => s.categoryId === catId);
        if (suggestion) {
          if (suggestion.isNew && catId === 'new_debt_category') {
             newCategories.push({
                name: "Pagamento de Dívidas",
                budget: suggestion.suggestedBudget,
                color: "#FF0000", // Red for enemies/debt
                keywords: ["divida", "emprestimo", "juros", "parcela", "nubank", "banco"],
                expenses: []
             });
          } else {
             updates.push({
                id: catId,
                data: { budget: suggestion.suggestedBudget }
             });
          }
        }
      }
    }

    try {
        if (newCategories.length > 0) {
            await Promise.all(newCategories.map(c => createCategoryMutation.mutateAsync(c)));
        }
        if (updates.length > 0) {
            updateBudgetMutation.mutate(updates);
        } else if (newCategories.length === 0) {
            setStep('idle');
        }
    } catch (e) {
        console.error(e);
        toast.error("Erro ao aplicar algumas sugestões");
    }
  };

  const toggleSelection = (id) => {
    setSelectedSuggestions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const reset = () => {
    setStep('idle');
    setSuggestions([]);
    setSelectedSuggestions({});
  };

  return (
    <div className="w-full relative flex flex-col min-h-[200px]">
        {step === 'idle' && (
             <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
                <div className="relative w-20 h-20 group">
                    <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-pulse group-hover:bg-cyan-500/30 transition-all" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <BrainCircuit className="w-10 h-10 text-cyan-400 group-hover:scale-110 transition-transform" />
                    </div>
                </div>
                <div className="max-w-md">
                    <h4 className="text-white font-bold text-lg mb-2">Inteligência Orçamentária</h4>
                    <p className="text-gray-400 text-sm mb-6">
                        Nossa IA analisa seus padrões de gastos para encontrar desperdícios e sugerir orçamentos mais eficientes.
                    </p>
                    <Button 
                        onClick={analyzeBudgets} 
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-[0_0_15px_rgba(0,255,255,0.3)] w-full sm:w-auto"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Iniciar Análise
                    </Button>
                </div>
             </div>
        )}

        {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-t-4 border-cyan-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-4 border-t-4 border-purple-500 rounded-full animate-spin reverse"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <BrainCircuit className="w-8 h-8 text-white opacity-50" />
                    </div>
                </div>
                <div className="text-center">
                    <h4 className="text-white font-bold text-lg mb-2">Calibrando Estratégia...</h4>
                    <p className="text-gray-400 text-sm max-w-md animate-pulse">
                        Processando transações e identificando padrões...
                    </p>
                </div>
            </div>
        )}

        {step === 'reviewing' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-white font-bold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        Sugestões Encontradas
                    </h4>
                    <span className="text-xs text-gray-500">Selecione para aplicar</span>
                </div>

                <div className="grid gap-3">
                    {suggestions.map(suggestion => {
                        let category = categories.find(c => c.id === suggestion.categoryId);
                        let isNew = false;
                        
                        if (suggestion.isNew && suggestion.categoryId === 'new_debt_category') {
                            category = { id: 'new_debt_category', name: 'Pagamento de Dívidas (Nova)', budget: 0 };
                            isNew = true;
                        }

                        if (!category) return null;

                        const isSelected = selectedSuggestions[category.id];
                        const diff = suggestion.suggestedBudget - category.budget;
                        const isReduction = diff < 0;
                        const isIncrease = diff > 0;
                        const noChange = diff === 0 && !isNew;

                        if (noChange) return null;

                        return (
                            <div 
                                key={category.id} 
                                className={`
                                    relative border rounded-xl p-4 transition-all cursor-pointer
                                    ${isSelected 
                                        ? 'bg-cyan-900/20 border-cyan-500/50 shadow-[0_0_10px_rgba(0,255,255,0.1)]' 
                                        : 'bg-[#0a0a1a]/50 border-gray-800 hover:border-gray-700'
                                    }
                                `}
                                onClick={() => toggleSelection(category.id)}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div 
                                            className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-600'}`}
                                        >
                                            {isSelected && <Check className="w-3 h-3 text-black" />}
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-base">{category.name}</h4>
                                            <p className="text-gray-400 text-sm mt-0.5 leading-relaxed">{suggestion.reason}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 pl-8 sm:pl-0">
                                        <div className="text-right">
                                            <span className="text-gray-500 text-[10px] block uppercase">Atual</span>
                                            <span className="text-gray-400 font-mono text-sm line-through decoration-red-500/50">R$ {category.budget}</span>
                                        </div>
                                        
                                        <ArrowRight className="w-4 h-4 text-gray-600" />

                                        <div className="text-right min-w-[80px]">
                                            <span className="text-gray-500 text-[10px] block uppercase">Sugerido</span>
                                            <span className={`font-mono font-bold text-lg ${isReduction ? 'text-green-400' : 'text-yellow-400'}`}>
                                                R$ {suggestion.suggestedBudget}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {isReduction && (
                                    <div className="absolute -top-2 right-4 flex items-center gap-1 bg-green-900/80 px-2 py-0.5 rounded-full text-[10px] font-bold text-green-400 border border-green-500/30 shadow-sm backdrop-blur-md">
                                        <TrendingDown className="w-3 h-3" />
                                        Economia: R$ {Math.abs(diff)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="pt-4 mt-4 border-t border-gray-800 flex justify-end gap-3">
                    <Button variant="ghost" onClick={reset} className="text-gray-400 hover:text-white">
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleApply} 
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                        disabled={Object.keys(selectedSuggestions).filter(k => selectedSuggestions[k]).length === 0}
                    >
                        Aplicar Otimizações
                    </Button>
                </div>
            </div>
        )}

        {step === 'no_changes' && (
             <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                </div>
                <h4 className="text-white font-bold text-lg">Orçamento Otimizado!</h4>
                <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                    Seu orçamento atual está perfeitamente alinhado com seus padrões de gastos. Nenhuma mudança necessária.
                </p>
                <Button variant="outline" onClick={reset} className="border-gray-700">
                    Voltar
                </Button>
            </div>
        )}

        {step === 'completed' && (
             <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in">
                <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-cyan-400" />
                </div>
                <h4 className="text-white font-bold text-lg">Ajustes Aplicados!</h4>
                <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                    Seus novos limites de orçamento foram definidos. Continue monitorando para garantir o sucesso.
                </p>
                <Button onClick={reset} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    Concluir
                </Button>
            </div>
        )}
    </div>
  );
}