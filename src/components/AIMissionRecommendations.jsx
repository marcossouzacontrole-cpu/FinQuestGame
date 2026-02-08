import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2, Brain, TrendingUp, Target, BookOpen, Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NeonCard from './NeonCard';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function AIMissionRecommendations({ user }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch completed missions with reflections
  const { data: completedMissions = [] } = useQuery({
    queryKey: ['completedMissionsWithReflections', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const missions = await base44.entities.Mission.filter({ 
        created_by: user.email,
        status: 'completed'
      }, '-completed_date', 20);
      return missions.filter(m => m.mission_reflection && m.mission_reflection.trim().length > 0);
    },
    enabled: !!user
  });

  // Fetch financial profile
  const { data: financialProfile } = useQuery({
    queryKey: ['financialProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.FinancialProfile.filter({ created_by: user.email });
      return profiles && profiles.length > 0 ? profiles[0] : null;
    },
    enabled: !!user
  });

  // Fetch existing recommendations
  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['aiRecommendations', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      // Store recommendations in a simple entity or use ChatHistory
      const recs = await base44.entities.ChatHistory.filter({ 
        created_by: user.email,
        type: 'mission_recommendation'
      }, '-created_date', 5);
      return recs;
    },
    enabled: !!user
  });

  // Generate recommendations
  const generateRecommendations = useMutation({
    mutationFn: async () => {
      if (!user || completedMissions.length === 0) {
        throw new Error('Não há reflexões suficientes para gerar recomendações');
      }

      const reflections = completedMissions
        .map(m => `${m.title}: ${m.mission_reflection}`)
        .join('\n\n');

      const prompt = `
Você é um consultor financeiro especializado em análise comportamental.

PERFIL DO USUÁRIO:
- Nível: ${user.level || 1}
- Missões completadas: ${completedMissions.length}
- Renda mensal: R$ ${financialProfile?.monthly_income || 'N/A'}
- Gastos fixos: R$ ${financialProfile?.fixed_expenses || 'N/A'}
- Objetivos: ${financialProfile?.financial_goals?.join(', ') || 'N/A'}

REFLEXÕES DAS ÚLTIMAS MISSÕES:
${reflections}

Com base nas reflexões acima, analise os padrões de comportamento financeiro do usuário e gere:

1. 3 MISSÕES PERSONALIZADAS próximas etapas práticas baseadas no que o usuário já fez
2. 3 INSIGHTS FINANCEIROS dicas valiosas relacionadas aos temas das missões

Seja específico, prático e motivador. Use os dados reais das reflexões para personalizar.
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            missions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  reasoning: { type: "string" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                  xp_reward: { type: "integer" }
                }
              }
            },
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  category: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Save recommendations
      await base44.entities.ChatHistory.create({
        type: 'mission_recommendation',
        message: JSON.stringify(response),
        metadata: {
          generated_at: new Date().toISOString(),
          based_on_missions: completedMissions.length
        }
      });

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['aiRecommendations']);
      toast.success('Recomendações geradas com sucesso!');
      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao gerar recomendações');
      setIsGenerating(false);
    }
  });

  // Create mission from recommendation
  const createMission = useMutation({
    mutationFn: async (missionData) => {
      await base44.entities.Mission.create({
        title: missionData.title,
        description: missionData.description,
        difficulty: missionData.difficulty || 'medium',
        xp_reward: missionData.xp_reward || 100,
        gold_reward: Math.floor((missionData.xp_reward || 100) / 5),
        type: 'campaign',
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allMissions']);
      toast.success('Missão adicionada!');
    }
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    generateRecommendations.mutate();
  };

  const latestRecommendation = recommendations[0];
  const parsedData = latestRecommendation 
    ? JSON.parse(latestRecommendation.message) 
    : null;

  if (isLoading) {
    return (
      <NeonCard glowColor="purple">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </NeonCard>
    );
  }

  return (
    <NeonCard glowColor="purple" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="w-8 h-8 text-purple-400" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-black text-white">IA Financeira</h2>
            <p className="text-gray-400 text-sm">Sugestões baseadas nas suas reflexões</p>
          </div>
        </div>
        
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || completedMissions.length === 0}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Novas
            </>
          )}
        </Button>
      </div>

      {completedMissions.length === 0 && (
        <div className="bg-yellow-900/20 border-l-4 border-yellow-500 rounded-r-lg p-4">
          <p className="text-yellow-300 text-sm">
            Complete algumas missões e escreva suas reflexões para receber recomendações personalizadas!
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {parsedData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Suggested Missions */}
            {parsedData.missions && parsedData.missions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-cyan-400" />
                  Próximas Missões Sugeridas
                </h3>
                <div className="space-y-3">
                  {parsedData.missions.map((mission, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-[#0a0a1a] rounded-xl p-4 border border-cyan-500/30 hover:border-cyan-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="text-white font-bold mb-1">{mission.title}</h4>
                          <p className="text-gray-400 text-sm mb-2">{mission.description}</p>
                          <p className="text-purple-400 text-xs italic">
                            💡 {mission.reasoning}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-cyan-400 text-xs">+{mission.xp_reward} XP</span>
                            <span className="text-gray-600">•</span>
                            <span className="text-yellow-400 text-xs">{mission.difficulty}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => createMission.mutate(mission)}
                          className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Insights */}
            {parsedData.insights && parsedData.insights.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-magenta-400" />
                  Insights Financeiros
                </h3>
                <div className="space-y-3">
                  {parsedData.insights.map((insight, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 + 0.3 }}
                      className="bg-gradient-to-r from-magenta-500/10 to-purple-500/10 rounded-xl p-4 border border-magenta-500/30"
                    >
                      <div className="flex items-start gap-3">
                        <Zap className="w-5 h-5 text-magenta-400 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-white font-bold mb-1">{insight.title}</h4>
                          <p className="text-gray-300 text-sm">{insight.content}</p>
                          <span className="inline-block mt-2 px-2 py-1 bg-magenta-500/20 border border-magenta-500/30 rounded text-magenta-400 text-xs">
                            {insight.category}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!parsedData && completedMissions.length > 0 && (
        <div className="text-center py-8">
          <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            Clique em "Gerar Novas" para receber sugestões personalizadas
          </p>
        </div>
      )}
    </NeonCard>
  );
}