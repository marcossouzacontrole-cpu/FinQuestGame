import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Scroll, CheckCircle2, Sparkles, Loader2, Zap, X, Settings, GraduationCap, Brain, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import NeonCard from '../components/NeonCard';
import EducationalModuleCard from '../components/EducationalModuleCard';
import EducationalBadges from '../components/EducationalBadges';
import EducationalLeaderboard from '../components/EducationalLeaderboard';
import LearningJourney from '../components/LearningJourney';
import EducationalRewards from '../components/EducationalRewards';
import AcademyPreferences from '../components/AcademyPreferences';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useGamification } from '../components/useGamification';
import AcademyTutorial from '../components/AcademyTutorial';

// Modal de Leitura de Conteúdo 
const ContentModal = ({ content, onClose, onMarkAsRead }) => {
  const [rating, setRating] = React.useState(0);
  const [feedback, setFeedback] = React.useState('');
  const [showRating, setShowRating] = React.useState(false);

  React.useEffect(() => {
    if (content?.id) {
      setRating(0);
      setFeedback('');
      setShowRating(false);
    }
  }, [content?.id]);

  if (!content) return null;

  const handleMarkAsRead = () => {
    setShowRating(true);
  };

  const handleConfirm = () => {
    if (rating > 0) {
      onMarkAsRead(content, { rating, feedback });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 pb-32">
      <NeonCard glowColor="cyan" className="max-w-3xl w-full max-h-[90vh] overflow-y-auto relative mb-24">
        <Button
          onClick={onClose}
          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 h-auto w-auto rounded-full"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </Button>

        <h1 className="text-3xl font-black text-white mb-3 mt-4 pr-10">{content.title}</h1>
        <p className="text-cyan-400 font-semibold mb-6">📖 Tema: {content.theme || 'Educação Financeira'}</p>

        {/* Conteúdo Principal */}
        <div className="prose prose-invert max-w-none space-y-4">
          {content.content_text ? (
            <div className="text-gray-300 leading-relaxed text-base" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {content.content_text}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-red-400 text-lg mb-2">⚠️ Conteúdo não foi gerado corretamente</p>
              <p className="text-gray-400 text-sm">Por favor, tente gerar novamente</p>
            </div>
          )}
        </div>

        {/* Quest e Botão de Conclusão */}
        {content.quest && (
          <div className="mt-8 p-4 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <p className="text-purple-400 font-bold text-base mb-2">⚔️ QUEST DO DIA:</p>
            <p className="text-gray-300 text-base">{content.quest}</p>
          </div>
        )}

        {/* Sistema de Avaliação - Só aparece após clicar em Marcar como Lido */}
        {showRating ? (
          <>
            <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
              <h4 className="text-yellow-400 font-bold mb-3">⭐ Como foi este conteúdo para você?</h4>
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-all hover:scale-110 ${star <= rating ? 'opacity-100' : 'opacity-30'
                      }`}
                  >
                    {star <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Feedback (opcional): O que você achou? Como podemos melhorar?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-yellow-500/30 rounded-lg p-3 text-white placeholder:text-gray-500 focus:border-yellow-500 focus:outline-none text-sm"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cyan-500/30">
              <Button
                onClick={() => setShowRating(false)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={rating === 0}
                className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(0,255,255,0.5)] disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Confirmar (+{content.xp_reward || 20} XP)
              </Button>
            </div>
          </>
        ) : (
          <div className="flex justify-end mt-6 pt-4 border-t border-cyan-500/30 pb-20">
            <Button
              onClick={handleMarkAsRead}
              className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(0,255,255,0.5)] z-50 relative"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Marcar como Lido (+{content.xp_reward || 20} XP)
            </Button>
          </div>
        )}

      </NeonCard>
    </div>
  );
};

export default function Academy() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableTopics, setAvailableTopics] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const { awardXP } = useGamification();

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('finquest_academy_tutorial_seen');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
      localStorage.setItem('finquest_academy_tutorial_seen', 'true');
    }
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userData } = useQuery({
    queryKey: ['currentUserProfile', currentUser?.email],
    queryFn: async () => {
      if (currentUser?.email) {
        const profiles = await base44.entities.User.filter({ email: currentUser.email });
        return profiles && profiles.length > 0 ? profiles[0] : null;
      }
      return null;
    },
    enabled: !!currentUser,
  });
  const user = userData;

  const { data: contents = [], refetch: refetchContents } = useQuery({
    queryKey: ['dailyContent'],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.DailyContent.filter({
        created_by: currentUser.email,
        read: false
      }, '-date');
    },
    enabled: !!currentUser,
  });

  const { data: todayContent } = useQuery({
    queryKey: ['todayContent'],
    queryFn: async () => {
      if (!currentUser?.email) return null;

      const unreadContent = await base44.entities.DailyContent.filter({
        created_by: currentUser.email,
        read: false
      });
      if (unreadContent.length > 0) return unreadContent[0];

      return null;
    },
    enabled: !!currentUser
  });

  const { data: educationalModules = [] } = useQuery({
    queryKey: ['educationalModules', currentUser?.email],
    queryFn: () => base44.entities.EducationalModule.filter({ created_by: currentUser.email }, '-created_date'),
    enabled: !!currentUser?.email
  });

  // PASSO 1: Mutação para GERAR AS 3 OPÇÕES DE TEMA
  const generateTopicOptions = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();

      // Buscar feedbacks anteriores para refinar geração
      const previousContents = await base44.entities.DailyContent.filter({ created_by: currentUser.email });
      const ratedContents = previousContents.filter(c => c.rating);
      const avgRating = ratedContents.length > 0
        ? ratedContents.reduce((sum, c) => sum + c.rating, 0) / ratedContents.length
        : 0;
      const goodTopics = ratedContents.filter(c => c.rating >= 4).map(c => c.category);
      const poorTopics = ratedContents.filter(c => c.rating <= 2).map(c => c.category);

      const learningGoals = user?.academy_learning_goals || [];
      const contentStyle = user?.academy_content_style || ['practical'];
      const knowledgeLevel = user?.financial_knowledge_level || '2';

      const topicPrompt = `Você é Sir Coin, mentor financeiro gamificado. Gere exatamente 3 títulos de aulas de Educação Financeira.

PERFIL DO JOGADOR:
- Nível: ${knowledgeLevel}/5
- Objetivos: ${learningGoals.length > 0 ? learningGoals.join(', ') : 'educação financeira geral'}
- Estilo: ${contentStyle.join(', ')}
${avgRating > 0 ? `- Avaliação média anterior: ${avgRating.toFixed(1)}/5` : ''}

REGRAS:
1. Cada título deve ser CURTO (máx 50 caracteres)
2. Use linguagem gamificada e motivadora
3. Adapte a dificuldade ao nível ${knowledgeLevel}
4. Priorize categorias: ${goodTopics.length > 0 ? goodTopics.join(', ') : 'todas'}
${poorTopics.length > 0 ? `5. EVITE: ${poorTopics.join(', ')}` : ''}

EXEMPLOS de títulos:
- "⚔️ Construa seu Escudo: Fundo de Emergência"
- "💰 Orçamento Guerreiro: Regra 50-30-20"
- "📈 Primeira Batalha: Tesouro Direto"`;

      const topicsData = await base44.integrations.Core.InvokeLLM({
        prompt: topicPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  category: { type: "string" },
                  difficulty: { type: "string" }
                },
                required: ["topic", "category", "difficulty"]
              }
            }
          },
          required: ["topics"]
        }
      });

      if (!topicsData?.topics || topicsData.topics.length !== 3) {
        throw new Error("A IA não retornou 3 opções de tema válidas.");
      }
      return topicsData.topics;
    },
    onSuccess: (data) => {
      setAvailableTopics(data);
      setIsGenerating(false);
      toast.info('Três pergaminhos disponíveis! Escolha um para criar a aula.', {
        duration: 5000
      });
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error('Erro ao gerar opções de tema', {
        description: error.message || 'Tente novamente mais tarde.'
      });
    }
  });

  // PASSO 2: Mutação para FINALIZAR A GERAÇÃO DE CONTEÚDO após a escolha
  const finalizeContent = useMutation({
    mutationFn: async (selectedTopicData) => {
      setIsGeneratingContent(true);
      const today = new Date().toISOString().split('T')[0];
      const currentUser = await base44.auth.me();

      const profiles = await base44.entities.FinancialProfile.filter({ created_by: currentUser.email });
      const profile = profiles[0];

      const contentCount = (await base44.entities.DailyContent.filter({ created_by: currentUser.email })).length;
      const levelName = contentCount < 8 ? 'INICIANTE' : contentCount < 17 ? 'INTERMEDIÁRIO' : 'AVANÇADO';

      const prompt = `
      Você é Sir Coin, o mentor financeiro gamificado da FinQuest. Crie um conteúdo educacional PROGRESSIVO e envolvente.

      NÍVEL DO JOGADOR: ${levelName}
      TÓPICO SELECIONADO: "${selectedTopicData.topic}"
      DIFICULDADE ALVO: ${selectedTopicData.difficulty}
      CATEGORIA: ${selectedTopicData.category}

      ${profile ? `
      Perfil Financeiro:
      - Renda mensal: R$ ${profile.monthly_income || 'N/A'}
      - Objetivos financeiros gerais: ${profile.financial_goals?.join(', ') || 'Melhorar saúde financeira'}
      - Idade: ${profile.age_range || '21-25'}
      ` : ''}

      PREFERÊNCIAS DE APRENDIZADO:
      - Nível de conhecimento: ${user?.financial_knowledge_level || '2'}/5
      - Objetivos: ${user?.academy_learning_goals?.join(', ') || 'Educação financeira geral'}
      - Estilo preferido: ${user?.academy_content_style?.join(', ') || 'Prático e com exemplos'}
      
      ADAPTE O CONTEÚDO:
      - Se "practical" está nas preferências: Foque em ações do dia a dia
      - Se "theory" está nas preferências: Explique conceitos em profundidade
      - Se "examples" está nas preferências: Use casos reais e números concretos
      - Se "advanced" está nas preferências: Inclua estratégias mais complexas

      Crie um conteúdo educacional GAMIFICADO e PRÁTICO com:

      1. TÍTULO ÉPICO (máx 60 chars):
      - Use emojis e linguagem RPG/games
      - Exemplo: "⚔️ Desbloqueie o Escudo da Reserva!"

      2. TEMA (uma linha):
      - Frase curta explicando o assunto desta aula

      3. INTRODUÇÃO IMERSIVA (2 parágrafos curtos):
      - Use metáforas de RPG/games para contextualizar
      - Crie conexão emocional com o jogador
      - Exemplo: "Todo herói precisa de um escudo antes de enfrentar o Boss Final..."

      4. CONTEÚDO EDUCACIONAL DETALHADO (6-8 parágrafos, 500-700 palavras):
      O texto deve ser COMPLETO e EDUCATIVO, proporcionando aproximadamente 4-5 minutos de leitura.

      CADA PARÁGRAFO DEVE:
      - Explicar UM conceito financeiro específico de forma CLARA
      - Incluir EXEMPLOS REAIS com NÚMEROS (ex: "Se você guardar R$ 100/mês...")
      - Usar analogias de games quando apropriado
      - Dar DICAS PRÁTICAS e acionáveis
      - Ter aproximadamente 70-100 palavras cada

      ESTRUTURA DO CONTEÚDO (6-8 parágrafos):
      • Parágrafo 1: O QUE É (conceito básico)
      • Parágrafo 2-3: POR QUE IMPORTA (benefícios com exemplos)
      • Parágrafo 4-5: COMO FAZER (passo a passo prático)
      • Parágrafo 6: EXEMPLOS PRÁTICOS (cenários reais)
      • Parágrafo 7: ERROS COMUNS (o que evitar)
      • Parágrafo 8: PRÓXIMOS PASSOS (ação imediata)

      QUEST DO DIA (1-2 frases):
      - Uma ação ESPECÍFICA e PRÁTICA que o jogador pode fazer HOJE
      - Exemplo: "Abra uma planilha e liste todas suas despesas do último mês"

      6. CALL TO ACTION (1 frase):
      - Motivação final com linguagem de conquista
      - Exemplo: "Complete esta quest e ganhe +50 XP rumo à Independência Financeira!"

      REGRAS OBRIGATÓRIAS:
      ✓ Conteúdo 100% EDUCACIONAL (ensine conceitos de verdade)
      ✓ Linguagem gamificada mas PROFISSIONAL
      ✓ Exemplos com NÚMEROS REAIS e CÁLCULOS
      ✓ Adaptado ao nível ${levelName} do jogador
      ✓ MÍNIMO 500 palavras, MÁXIMO 700 palavras (4-5 minutos de leitura)
      ✓ Formato em português brasileiro
      ✓ Parágrafos bem estruturados e objetivos
      ✓ Seja COMPLETO mas CONCISO

      IMPORTANTE: 
      - Retorne o texto educacional no campo "content_text"
      - Seja educativo e completo sem ser prolixo
      - Foque em informações práticas e acionáveis
      `;

      const contentData = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            theme: { type: "string" },
            content_text: { type: "string" },
            quest: { type: "string" },
            category: { type: "string" }
          },
          required: ["title", "theme", "content_text", "quest", "category"]
        }
      });

      const thumbnailResponse = await base44.integrations.Core.GenerateImage({
        prompt: `Ilustração educacional para aula de finanças: ${contentData.title}. Estilo neon cyberpunk, visual moderno e motivador, tema ${contentData.category}`
      });

      const wordCount = contentData.content_text?.split(' ').length || 500;
      const readingTimeMinutes = Math.ceil(wordCount / 200);

      const newContent = {
        title: contentData.title,
        theme: contentData.theme,
        quest: contentData.quest,
        content_text: contentData.content_text,
        thumbnail_url: thumbnailResponse.url,
        category: contentData.category,
        xp_reward: 20,
        date: today,
        read: false,
        reading_time_minutes: readingTimeMinutes,
        difficulty_level: selectedTopicData.difficulty
      };

      await base44.entities.DailyContent.create(newContent);

      return contentData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dailyContent']);
      queryClient.invalidateQueries(['todayContent']);
      queryClient.invalidateQueries(['currentUserProfile']);
      setAvailableTopics(null);
      setIsGeneratingContent(false);
      toast.success('Pergaminho finalizado e criado! 📜', {
        description: 'Sua aula personalizada está pronta para leitura!'
      });
    },
    onError: (error) => {
      setIsGeneratingContent(false);
      toast.error('Erro ao finalizar o conteúdo', {
        description: error.message || 'Tente novamente mais tarde.'
      });
    }
  });

  const handleGenerateContent = () => {
    if (!user) {
      toast.error('Perfil de usuário não carregado.');
      return;
    }
    setIsGenerating(true);
    generateTopicOptions.mutate();
  };

  const handleReadContent = (content) => {
    setModalContent(content);
  };

  const handleMarkAsRead = (content, feedbackData) => {
    markAsRead.mutate({ content, user, feedbackData });
    setModalContent(null);
  };

  const markAsRead = useMutation({
    mutationFn: async ({ content, user, feedbackData }) => {
      await base44.entities.DailyContent.delete(content.id);

      // Centralized Gamification (Refactored)
      awardXP(content.xp_reward || 20, 0, 'Conteúdo absorvido', user.email, 'learning_streak');

      return { xpReward: content.xp_reward || 20, rating: feedbackData?.rating };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['dailyContent']);
      queryClient.invalidateQueries(['todayContent']);
      queryClient.invalidateQueries(['currentUserProfile']);

      const message = `+${data.xpReward} XP. Gere novo conteúdo quando quiser!`;
      toast.success(data.rating ? '⭐ Obrigado pelo feedback!' : '📜 Conteúdo absorvido!', {
        description: message
      });
    },
    onError: (error) => {
      toast.error('Erro ao ler pergaminho', {
        description: error.message || 'Falha ao concluir a leitura. Tente novamente.'
      });
    }
  });

  const completeModule = useMutation({
    mutationFn: async ({ module, user }) => {
      if (module.completed) {
        throw new Error('Módulo já foi completado');
      }

      await base44.entities.EducationalModule.update(module.id, {
        completed: true,
        completed_date: new Date().toISOString()
      });

      const xpReward = module.xp_reward || 50;
      const goldReward = module.gold_reward || 10;

      // Centralized Gamification (Refactored)
      awardXP(xpReward, goldReward, 'Módulo Completado', user.email, 'learning_streak');

      const completedModules = [...(user.completed_modules || []), module.id];

      await base44.entities.User.update(user.id, {
        completed_modules: completedModules
      });

      return { xpReward, goldReward };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['educationalModules']);
      queryClient.invalidateQueries(['currentUserProfile']);

      if (data?.leveledUp) {
        toast.success(`🎓 Level Up! Você é nível ${data.newLevel}!`, {
          description: `+${data.xpReward} XP e +${data.goldReward} Gold Coins!`
        });
      } else {
        toast.success('✅ Módulo Completado!', {
          description: `+${data.xpReward} XP e +${data.goldReward} Gold Coins!`
        });
      }
    },
    onError: (error) => {
      toast.error('Erro ao completar módulo', {
        description: error.message || 'Tente novamente'
      });
    }
  });

  const handleCompleteModule = (module) => {
    if (!user) {
      toast.error('Usuário não encontrado');
      return;
    }
    if (user.completed_modules && user.completed_modules.includes(module.id)) {
      toast.info('Este módulo já foi completado');
      return;
    }
    completeModule.mutate({ module, user });
  };

  const incompleteModules = educationalModules.filter(m => !m.completed);
  const completedModules = educationalModules.filter(m => m.completed);

  const categoryConfig = {
    savings: { name: 'Poupança', color: 'cyan', icon: '🏦' },
    investment: { name: 'Investimento', color: 'magenta', icon: '📈' },
    budget: { name: 'Orçamento', color: 'green', icon: '💰' },
    mindset: { name: 'Mentalidade', color: 'purple', icon: '🧠' }
  };

  const isDisabled = isGenerating || todayContent?.id || (availableTopics && availableTopics.length > 0);
  const buttonText = isGenerating ? (
    <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando Opções... </>
  ) : todayContent?.id ? (
    <> <Sparkles className="w-5 h-5 mr-2" /> Leia o conteúdo atual primeiro </>
  ) : availableTopics ? (
    <> <Sparkles className="w-5 h-5 mr-2" /> Escolha um Pergaminho! </>
  ) : (
    <> <Sparkles className="w-5 h-5 mr-2" /> Gerar Novo Pergaminho </>
  );

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-3xl opacity-20"
            animate={{
              x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
              y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
              rotate: [0, 360],
              scale: [0.8, 1.3, 0.8]
            }}
            transition={{
              duration: 6 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.4
            }}
          >
            {['📚', '🧠', '✨', '🎓', '⭐'][i % 5]}
          </motion.div>
        ))}
      </div>

      {/* Modal de Loading durante geração */}
      {isGeneratingContent && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <NeonCard glowColor="cyan" className="max-w-md w-full text-center">
            <div className="py-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500 to-magenta-500 flex items-center justify-center animate-pulse">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">✨ Gerando Conteúdo Personalizado</h3>
              <p className="text-gray-400 mb-2">A IA está criando sua aula exclusiva...</p>
              <p className="text-cyan-400 text-sm">Isso pode levar alguns segundos</p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-magenta-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </NeonCard>
        </div>
      )}

      <ContentModal
        content={modalContent}
        onClose={() => setModalContent(null)}
        onMarkAsRead={handleMarkAsRead}
      />

      <motion.div
        className="flex items-center justify-between mb-8 flex-wrap gap-4 relative z-10"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="relative">
          <motion.div
            className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-cyan-500/20 blur-2xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <div className="relative flex items-center gap-3">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                y: [0, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <GraduationCap className="w-12 h-12 text-purple-400" />
            </motion.div>
            <div>
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 animate-pulse">
                ACADEMIA
              </h1>
              <motion.p
                className="text-cyan-400/80 text-lg"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Brain className="w-5 h-5 inline mr-2 animate-pulse" />
                Conhecimento = <span className="text-glow-magenta">Inteligência Financeira</span>
              </motion.p>
            </div>
            <motion.div
              animate={{
                rotate: [0, 360]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Star className="w-10 h-10 text-yellow-400" />
            </motion.div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => setShowPreferences(!showPreferences)}
            variant="outline"
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
          >
            <Settings className="w-5 h-5 mr-2" />
            Preferências
          </Button>
          <Button
            onClick={handleGenerateContent}
            disabled={isDisabled}
            className="bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600 text-white font-bold shadow-[0_0_20px_rgba(0,255,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {buttonText}
          </Button>
        </div>
      </motion.div>

      {showPreferences && user && (
        <div className="mb-8">
          <AcademyPreferences user={user} />
        </div>
      )}

      {availableTopics && (
        <NeonCard glowColor="cyan" className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Scroll className="w-6 h-6 text-cyan-400" />
            Escolha Seu Pergaminho (Aula Personalizada)
          </h2>
          <p className="text-gray-400 mb-6">Selecione o tema que mais te interessa para gerar o conteúdo completo e ganhar XP:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableTopics.map((topicData, index) => (
              <NeonCard key={index} glowColor={topicData.category === 'investment' ? 'magenta' : 'green'} className="p-4 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform">
                <div>
                  <p className="text-xs uppercase font-semibold text-cyan-400 mb-1">{topicData.difficulty}</p>
                  <h3 className="text-white font-bold text-lg mb-2">{topicData.topic}</h3>
                  <p className="text-gray-400 text-sm">Categoria: {categoryConfig[topicData.category]?.name || topicData.category}</p>
                </div>
                <Button
                  onClick={() => finalizeContent.mutate(topicData)}
                  disabled={isGeneratingContent}
                  className="mt-4 w-full bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600 text-white font-bold disabled:opacity-50"
                >
                  Gerar Conteúdo
                </Button>
              </NeonCard>
            ))}
          </div>
        </NeonCard>
      )}

      {user && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <NeonCard glowColor="purple" className="mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-4 border-white/20"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <p className="text-gray-400 text-sm">Seu Progresso na Academia</p>
                  <p className="text-white font-bold text-xl">{user.completed_modules?.length || 0} módulos completados</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <motion.div whileHover={{ scale: 1.1 }}>
                  <p className="text-gray-400 text-xs">XP Total</p>
                  <p className="text-cyan-400 font-black text-lg">+{(user.completed_modules?.length || 0) * 50}</p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }}>
                  <p className="text-gray-400 text-xs">Gold Total</p>
                  <p className="text-yellow-400 font-black text-lg">+{(user.completed_modules?.length || 0) * 10}</p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }}>
                  <p className="text-gray-400 text-xs">Streak</p>
                  <p className="text-orange-400 font-black text-lg">{user.learning_streak || 0} 🔥</p>
                </motion.div>
              </div>
            </div>
          </NeonCard>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LearningJourney
          completedModules={educationalModules.filter(m => m.completed)}
          dailyContentsRead={user?.daily_contents_read?.length || 0}
        />
        <EducationalLeaderboard userData={user} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <EducationalBadges
          userData={user}
          completedModules={educationalModules.filter(m => m.completed)}
          videosWatched={user?.daily_contents_read?.length || 0}
        />
        <EducationalRewards
          completedModules={educationalModules.filter(m => m.completed)}
          dailyContentsRead={user?.daily_contents_read?.length || 0}
        />
      </div>

      {incompleteModules.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            Conteúdo Personalizado para Você
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {incompleteModules.map(module => (
              <EducationalModuleCard
                key={module.id}
                module={module}
                onComplete={handleCompleteModule}
              />
            ))}
          </div>
        </div>
      )}

      {completedModules.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-green-400" />
            Módulos Completados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {completedModules.map(module => (
              <EducationalModuleCard
                key={module.id}
                module={module}
                onComplete={handleCompleteModule}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-cyan-400" />
          Daily Knowledge Potion
        </h2>
        <p className="text-gray-400 mb-4">Absorva conhecimento financeiro personalizado em texto</p>

        {contents.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {contents.map(content => {
              const config = categoryConfig[content.category] || categoryConfig.mindset;
              return (
                <NeonCard key={content.id} glowColor={config.color} className="relative overflow-hidden">
                  <div className="relative space-y-4 cursor-pointer" onClick={() => handleReadContent(content)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-magenta-500/20 border border-cyan-500/30 flex items-center justify-center">
                          <span className="text-2xl">🧪</span>
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-lg mb-1">{content.title}</h3>
                          <p className="text-cyan-400 text-sm font-semibold">📖 Tema: {content.theme || 'Educação Financeira'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-gray-400 text-sm line-clamp-3">
                      {content.content_text?.substring(0, 150) || 'Clique para ler o conteúdo completo...'}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
                      <div className="bg-gradient-to-r from-cyan-500/20 to-magenta-500/20 rounded-lg px-3 py-1 border border-cyan-500/30">
                        <span className="text-cyan-400 font-bold text-sm">+{content.xp_reward || 20} XP</span>
                      </div>

                      <Button
                        onClick={() => handleReadContent(content)}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg shadow-[0_0_15px_rgba(255,0,255,0.4)]"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Abrir Pergaminho
                      </Button>
                    </div>
                  </div>
                </NeonCard>
              );
            })}
          </div>
        ) : (
          <NeonCard glowColor="cyan" className="w-full h-full">
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">🧪</span>
              <p className="text-gray-400 text-lg">
                Nenhum conteúdo disponível ainda.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Clique em "Gerar Novo Pergaminho" para sua próxima aula de Educação Financeira!
              </p>
            </div>
          </NeonCard>
        )}
      </div>

      <NeonCard glowColor="purple" className="mt-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-magenta-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-2">Como funciona a Academia?</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Leia conteúdo educacional gerado por IA sobre finanças, personalizado para você. Cada poção de conhecimento
              traz insights práticos e acionáveis. Após ler, clique em "Marcar como Lido" para ganhar XP. Os tópicos
              cobrem desde poupança básica até investimentos avançados, sempre com uma abordagem gamificada.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.values(categoryConfig).map(cat => (
                <div key={cat.name} className="bg-[#0a0a1a] border border-cyan-500/20 rounded-lg px-3 py-1 flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span className="text-gray-300 text-xs">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </NeonCard>

      <AcademyTutorial
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
}