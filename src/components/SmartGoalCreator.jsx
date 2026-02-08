import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrainCircuit, Target, Sparkles, Save } from 'lucide-react';
import NeonCard from './NeonCard';
import { toast } from 'sonner';
import { differenceInMonths, parseISO } from 'date-fns';

export default function SmartGoalCreator({ onCreate, onCancel }) {
  const [step, setStep] = useState(1); // 1: Input, 2: AI Analysis, 3: Review
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    target_date: '',
    icon: '🗡️',
    legendary_item: '',
    color: '#FF00FF'
  });
  const [aiPlan, setAiPlan] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch expenses for AI analysis
  const { data: categories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list(),
  });

  const { data: profile } = useQuery({
    queryKey: ['financialProfile'],
    queryFn: async () => {
        const res = await base44.entities.FinancialProfile.list();
        return res[0];
    }
  });

  const generatePlan = async () => {
    if (!formData.name || !formData.target_amount || !formData.target_date) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setIsAnalyzing(true);
    setStep(2);

    try {
      const months = Math.max(1, differenceInMonths(parseISO(formData.target_date), new Date()));
      const monthlyNeeded = parseFloat(formData.target_amount) / months;

      const spendingSummary = categories.map(c => {
        const spent = c.expenses.reduce((acc, curr) => acc + curr.value, 0);
        return `${c.name}: Gasto Médio R$${spent} (Meta: R$${c.budget})`;
      }).join('\n');

      const prompt = `
        Atue como um estrategista financeiro de elite. O usuário quer juntar R$${formData.target_amount} para "${formData.name}" até ${formData.target_date} (${months} meses).
        Isso requer economizar aprox. R$${monthlyNeeded.toFixed(2)}/mês.

        Perfil Financeiro:
        Renda Mensal: R$${profile?.monthly_income || '?'}
        Gastos Atuais:
        ${spendingSummary}

        Crie um plano tático de 3 pontos para atingir essa meta. Identifique onde cortar gastos com base nos dados acima.
        Sugira também um nome ÉPICO de item de RPG para essa meta (ex: Escudo da Liberdade).

        Retorne JSON:
        {
          "plan_text": "Texto detalhado e motivacional com os 3 pontos táticos...",
          "suggested_cuts": ["Corte 1", "Corte 2"],
          "monthly_contribution": ${monthlyNeeded},
          "epic_item_name": "Nome do Item Sugerido",
          "feasibility": "High/Medium/Low"
        }
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
            type: "object",
            properties: {
                plan_text: { type: "string" },
                suggested_cuts: { type: "array", items: { type: "string" } },
                monthly_contribution: { type: "number" },
                epic_item_name: { type: "string" },
                feasibility: { type: "string" }
            }
        }
      });

      setAiPlan(result);
      setFormData(prev => ({ ...prev, legendary_item: result.epic_item_name }));
      setStep(3);
    } catch (error) {
      console.error(error);
      toast.error("Falha ao gerar plano. Tente novamente.");
      setStep(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreate = () => {
    onCreate({
      ...formData,
      target_amount: parseFloat(formData.target_amount),
      ai_plan: aiPlan?.plan_text,
      monthly_contribution_suggestion: aiPlan?.monthly_contribution
    });
  };

  return (
    <NeonCard glowColor="cyan" className="w-full max-w-lg relative animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-white flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-cyan-400" />
            Forja de Metas Inteligente
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-white">
            <Save className="w-5 h-5 rotate-45" /> {/* Using icon as close just for layout, functionally X usually */}
        </button>
      </div>

      {step === 1 && (
        <div className="space-y-4">
            <div>
                <Label className="text-cyan-400">Objetivo (Quest)</Label>
                <Input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Comprar Carro, Viagem..."
                    className="bg-gray-900 border-gray-700 text-white"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-cyan-400">Valor Alvo (Gold)</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                        <Input 
                            type="number"
                            value={formData.target_amount}
                            onChange={e => setFormData({...formData, target_amount: e.target.value})}
                            placeholder="10000"
                            className="bg-gray-900 border-gray-700 text-white pl-8"
                        />
                    </div>
                </div>
                <div>
                    <Label className="text-cyan-400">Prazo (Deadline)</Label>
                    <Input 
                        type="date"
                        value={formData.target_date}
                        onChange={e => setFormData({...formData, target_date: e.target.value})}
                        className="bg-gray-900 border-gray-700 text-white"
                    />
                </div>
            </div>
            <Button 
                onClick={generatePlan} 
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-bold mt-4"
            >
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Plano Estratégico com IA
            </Button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
                <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse"></div>
                <BrainCircuit className="w-16 h-16 text-cyan-400 animate-bounce" />
            </div>
            <h4 className="text-white font-bold text-lg">Analisando Finanças...</h4>
            <p className="text-gray-400 text-sm text-center max-w-xs">
                A IA está vasculhando seus gastos para encontrar o caminho mais rápido até sua meta.
            </p>
        </div>
      )}

      {step === 3 && aiPlan && (
        <div className="space-y-4">
            <div className="bg-cyan-900/20 border border-cyan-500/30 p-4 rounded-lg">
                <h4 className="text-cyan-400 font-bold flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4" />
                    Estratégia Sugerida
                </h4>
                <p className="text-gray-300 text-sm whitespace-pre-line">{aiPlan.plan_text}</p>
                
                <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-gray-400">Item Épico:</span>
                    <span className="text-purple-400 font-bold">{aiPlan.epic_item_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-400">Economia Mensal:</span>
                    <span className="text-green-400 font-bold">R$ {aiPlan.monthly_contribution.toFixed(2)}</span>
                </div>
            </div>

            <div>
                <Label className="text-gray-500 text-xs">Nome do Item Lendário (Opcional)</Label>
                <Input 
                    value={formData.legendary_item}
                    onChange={e => setFormData({...formData, legendary_item: e.target.value})}
                    className="bg-gray-900 border-gray-700 text-white text-sm"
                />
            </div>

            <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-gray-600">
                    Voltar
                </Button>
                <Button onClick={handleCreate} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold">
                    <Save className="w-4 h-4 mr-2" />
                    Aceitar Missão
                </Button>
            </div>
        </div>
      )}
    </NeonCard>
  );
}