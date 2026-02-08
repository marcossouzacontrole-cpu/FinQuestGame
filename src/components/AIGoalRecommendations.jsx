import { useState } from 'react';
import { Sparkles, Loader2, TrendingUp, Lightbulb, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AIGoalRecommendations({ goals, userData, onCreateGoal }) {
  const [recommendations, setRecommendations] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: financialProfile } = useQuery({
    queryKey: ['financialProfile', userData?.email],
    queryFn: async () => {
      if (userData?.email) {
        const profiles = await base44.entities.FinancialProfile.filter({ created_by: userData.email });
        return profiles && profiles.length > 0 ? profiles[0] : null;
      }
      return null;
    },
    enabled: !!userData
  });

  const generateRecommendations = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);

      const activeGoals = goals.filter(g => g.status === 'forging');
      const completedGoals = goals.filter(g => g.status === 'completed');
      
      const totalSaved = activeGoals.reduce((sum, goal) => sum + (goal.current_amount || 0), 0);
      const avgGoalValue = activeGoals.length > 0 
        ? activeGoals.reduce((sum, goal) => sum + goal.target_amount, 0) / activeGoals.length 
        : 0;

      const prompt = `
Você é um consultor financeiro especializado em criar objetivos personalizados.

Perfil do usuário:
- Nível: ${userData?.level || 1}
- XP Total: ${userData?.total_xp || 0}
- Patrimônio Total: R$ ${userData?.total_wealth || 0}
- Gold Coins: ${userData?.gold_coins || 0}
- Renda mensal: R$ ${financialProfile?.monthly_income || 0}
- Gastos fixos: R$ ${financialProfile?.fixed_expenses || 0}
- % Poupança: ${financialProfile?.savings_percentage || 0}%
- Economia atual: R$ ${financialProfile?.current_savings || 0}
- Dívidas: R$ ${financialProfile?.total_debt || 0}
- Fundo de emergência: ${financialProfile?.has_emergency_fund ? 'Sim' : 'Não'}
- Conhecimento financeiro: ${financialProfile?.financial_knowledge_level || 'Não informado'}/5
- Escolaridade: ${financialProfile?.education_level || 'Não informado'}
- Objetivos declarados: ${financialProfile?.financial_goals?.join(', ') || 'Não informado'}

Metas atuais:
- Metas ativas: ${activeGoals.length}
- Metas completas: ${completedGoals.length}
- Total guardado em metas ativas: R$ ${totalSaved.toFixed(2)}
- Valor médio de meta: R$ ${avgGoalValue.toFixed(2)}
- Metas ativas: ${activeGoals.map(g => `${g.name} (${g.target_amount})`).join(', ') || 'Nenhuma'}
- Metas completas: ${completedGoals.map(g => g.name).join(', ') || 'Nenhuma'}

IMPORTANTE: Gere EXATAMENTE 4 recomendações de conquistas/metas financeiras personalizadas e REALISTAS:

Para cada recomendação, forneça:
1. name: Nome curto e motivador da meta (ex: "Fundo de Emergência 6 meses")
2. legendary_item: Título épico relacionado (ex: "Escudo da Segurança Financeira")
3. target_amount: Valor REALISTA em R$ baseado no perfil do usuário
4. icon: Um único emoji apropriado (escolha entre: 🛡️, 💎, 🏠, 🚗, ✈️, 🎓, 💰, 🏆, 🌟, 🎯)
5. color: Cor hex neon (#FF00FF, #00FFFF, #39FF14, #8A2BE2, #FFD700)
6. reason: Explicação clara e personalizada de POR QUE esta meta é recomendada para o usuário (2-3 linhas)

Considere:
- As metas que o usuário já tem
- A capacidade financeira real do usuário
- Os objetivos declarados
- O estágio financeiro atual (dívidas, fundo de emergência, etc.)
- Priorize metas que fazem sentido para a situação atual

Os valores devem ser adequados à renda e capacidade de poupança do usuário.
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
                  name: { type: "string" },
                  legendary_item: { type: "string" },
                  target_amount: { type: "number" },
                  icon: { type: "string" },
                  color: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      setIsGenerating(false);
      setRecommendations(response.recommendations || []);
      
      toast.success('Recomendações geradas!', {
        description: `${response.recommendations?.length || 0} novas metas sugeridas pela IA`
      });
    },
    onError: () => {
      setIsGenerating(false);
      toast.error('Erro ao gerar recomendações');
    }
  });

  const handleCreateFromRecommendation = (recommendation) => {
    onCreateGoal({
      name: recommendation.name,
      legendary_item: recommendation.legendary_item,
      target_amount: recommendation.target_amount,
      icon: recommendation.icon,
      color: recommendation.color
    });
    toast.success('Meta criada a partir da recomendação!');
  };

  return (
    <NeonCard glowColor="purple" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Recomendações de IA</h3>
              <p className="text-gray-400 text-sm">Metas personalizadas baseadas no seu perfil financeiro</p>
            </div>
          </div>
          
          {!isGenerating && recommendations.length === 0 && (
            <Button
              onClick={() => generateRecommendations.mutate()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold shadow-[0_0_20px_rgba(139,0,255,0.5)]"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Recomendações
            </Button>
          )}
        </div>

        {isGenerating && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
            <p className="text-white font-semibold mb-2">Analisando seu perfil financeiro...</p>
            <p className="text-gray-400 text-sm">A IA está criando recomendações personalizadas para você</p>
          </div>
        )}

        {!isGenerating && recommendations.length === 0 && (
          <div className="text-center py-12 border border-purple-500/20 rounded-xl bg-purple-500/5">
            <Lightbulb className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <p className="text-white font-semibold mb-2">Descubra novas metas financeiras</p>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Nossa IA analisará seu perfil, histórico de conquistas e padrões de economia para sugerir metas personalizadas ideais para você
            </p>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-cyan-400 text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {recommendations.length} metas recomendadas para você
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateRecommendations.mutate()}
                disabled={isGenerating}
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Novamente
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec, index) => (
                <NeonCard 
                  key={index} 
                  glowColor="purple" 
                  className="relative overflow-hidden hover:scale-105 transition-transform duration-300"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-2xl" />
                  
                  <div className="relative space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl" style={{ filter: `drop-shadow(0 0 10px ${rec.color})` }}>
                          {rec.icon}
                        </span>
                        <div>
                          <h4 className="text-white font-bold text-lg">{rec.name}</h4>
                          <p className="text-sm font-semibold" style={{ color: rec.color }}>
                            {rec.legendary_item}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0a0a1a] rounded-lg p-3 border border-purple-500/20">
                      <p className="text-gray-300 text-sm leading-relaxed mb-2">{rec.reason}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-purple-500/20">
                        <span className="text-white font-bold text-lg">
                          R$ {rec.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-purple-400 text-xs font-semibold">Valor Alvo</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleCreateFromRecommendation(rec)}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold shadow-[0_0_15px_rgba(139,0,255,0.4)]"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Esta Meta
                    </Button>
                  </div>
                </NeonCard>
              ))}
            </div>
          </div>
        )}
      </div>
    </NeonCard>
  );
}