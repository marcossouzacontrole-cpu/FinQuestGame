import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MessageCircle, X, Send, Minimize2, Maximize2, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Sr. Coin Avatar Component
const SrCoinAvatar = ({ isThinking = false, size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };
  const iconSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };
  
  return (
    <div className={`relative ${sizes[size]} flex-shrink-0`}>
      <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 flex items-center justify-center border-2 border-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.5)] ${isThinking ? 'animate-pulse' : ''}`}>
        <span className={iconSizes[size]}>🛡️</span>
      </div>
      {isThinking && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
        </div>
      )}
      <div className="absolute inset-0 rounded-full bg-gradient-to-t from-yellow-500/20 to-transparent pointer-events-none" />
    </div>
  );
};

export default function FinancialAdvisorChat({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch chat history
  const { data: chatHistory = [] } = useQuery({
    queryKey: ['chatHistory', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.ChatHistory.filter(
        { created_by: user.email },
        '-timestamp',
        50
      );
    },
    enabled: !!user && isOpen
  });

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ userMessage, user }) => {
      setIsTyping(true);
      
      // Build comprehensive context from all financial data
      const [profiles, assets, debts, goals, budgets, userProfile] = await Promise.all([
        base44.entities.FinancialProfile.filter({ created_by: user.email }),
        base44.entities.Asset.filter({ created_by: user.email }),
        base44.entities.Debt.filter({ created_by: user.email }),
        base44.entities.Goal.filter({ created_by: user.email }),
        base44.entities.Budget.filter({ created_by: user.email }),
        base44.entities.User.filter({ email: user.email })
      ]);

      const profile = profiles[0];
      const gameProfile = userProfile[0];
      const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
      const totalDebts = debts.reduce((sum, d) => sum + d.outstanding_balance, 0);
      const netWorth = totalAssets - totalDebts;
      const activeGoals = goals.filter(g => g.status !== 'completed').length;
      const completedGoals = goals.filter(g => g.status === 'completed').length;
      const totalBudget = budgets.reduce((sum, b) => sum + b.planned_amount, 0);
      const totalSpent = budgets.reduce((sum, b) => sum + b.spent_amount, 0);
      const assetTypes = new Set(assets.map(a => a.type)).size;
      const highInterestDebts = debts.filter(d => d.interest_rate > 5).length;

      const contextInfo = `
      DADOS FINANCEIROS COMPLETOS DO USUÁRIO:
      
      Perfil:
      - Renda mensal: R$ ${profile?.monthly_income || 0}
      - Gastos fixos: R$ ${profile?.fixed_expenses || 0}
      - % Poupança mensal: ${profile?.savings_percentage || 0}%
      - Nível de conhecimento: ${profile?.financial_knowledge_level || 0}/5
      - Objetivos: ${profile?.financial_goals?.join(', ') || 'Nenhum'}
      - Preocupação principal: ${profile?.main_financial_concern || 'N/A'}
      - Interesse em investir: ${profile?.investment_interest || 'N/A'}
      
      Patrimônio:
      - Patrimônio líquido: R$ ${netWorth.toFixed(2)}
      - Total em ativos: R$ ${totalAssets.toFixed(2)} (${assets.length} ativos)
      - Total em dívidas: R$ ${totalDebts.toFixed(2)} (${debts.length} dívidas)
      ${debts.length > 0 ? `- Maior taxa de juros: ${Math.max(...debts.map(d => d.interest_rate || 0))}% a.m.` : ''}
      
      Metas:
      - Metas ativas: ${activeGoals}
      - Metas concluídas: ${completedGoals}
      ${goals.length > 0 ? `- Exemplo: ${goals[0]?.name} (${((goals[0]?.current_amount / goals[0]?.target_amount) * 100).toFixed(0)}% concluída)` : ''}
      
      Orçamento:
      - Orçamento mensal: R$ ${totalBudget.toFixed(2)}
      - Gasto atual: R$ ${totalSpent.toFixed(2)}
      - Saldo: R$ ${(totalBudget - totalSpent).toFixed(2)}
      
      Perfil de Investimento:
      - Diversificação: ${assetTypes} tipos de ativos
      - Dívidas com juros altos (>5%): ${highInterestDebts}
      - Perfil de risco declarado: ${profile?.investment_interest || 'N/A'}
      - Nível no jogo: ${gameProfile?.level || 1}
      - Classe atual: ${gameProfile?.current_class_id || 'Nenhuma'}
      `;

      const srCoinPrompt = `
Você é Sr. Coin, o Cavaleiro da Prosperidade - um conselheiro financeiro gamificado em um RPG de educação financeira.

PERSONA:
- Tom: Sábio, encorajador, formal como um cavaleiro medieval, mas acessível
- Estilo: Use metáforas de RPG/jogos para explicar conceitos financeiros
- Exemplos: "Juros compostos são como um exército que se multiplica a cada turno!", "Diversificar é não guardar todos os seus tesouros em uma única masmorra"

DIRETRIZES LEGAIS (CRÍTICO):
⚠️ NUNCA forneça recomendações financeiras específicas (ex: "compre ações X", "invista Y% em Z")
⚠️ SEMPRE deixe claro que você educa e explica conceitos, mas NÃO substitui um profissional certificado
⚠️ Para decisões importantes, SEMPRE sugira consultar um planejador financeiro qualificado
⚠️ Foque em: educação, explicação de conceitos, direcionamentos gerais, questões comportamentais

CONHECIMENTO:
- Conceitos básicos: poupança, orçamento, juros, inflação
- Investimentos gerais: renda fixa vs variável, diversificação, perfil de risco
- Comportamento: vieses cognitivos, disciplina, planejamento
- Dívidas: bola de neve, priorização, refinanciamento

CONTEXTO FINANCEIRO DETALHADO:
${contextInfo}

ANÁLISE INTELIGENTE E CONSULTORIA:
- Use os dados acima para fornecer conselhos ESPECÍFICOS e PERSONALIZADOS
- Se houver dívidas com juros altos, mencione estratégias de quitação urgentes
- Se houver metas estagnadas, ofereça motivação e dicas práticas
- Se o orçamento estiver ultrapassado, sugira ajustes comportamentais
- Conecte sua resposta aos OBJETIVOS declarados do usuário

CONSULTORIA DE INVESTIMENTOS (quando relevante):
- Baseie-se no perfil de risco e objetivos do usuário
- Se o usuário tem baixa diversificação, sugira tipos de ativos adequados ao perfil
- Se há alta concentração em ativos de baixo retorno, mencione alternativas gerais
- SEMPRE inclua o aviso: "⚠️ Consulte um profissional certificado para recomendações específicas"
- Foque em EDUCAÇÃO sobre classes de ativos, não recomendações diretas

ALERTAS PROATIVOS:
- Se detectar orçamento estourado, alerte imediatamente
- Se houver dívidas com juros >5%, priorize isso na resposta
- Se metas estiverem com <5% de progresso, mencione motivacionalmente

FORMATO DE RESPOSTA:
- Máximo 150 palavras (seja conciso!)
- Use emojis temáticos (⚔️💰🛡️📊🏰)
- Termine com uma pergunta ou call-to-action quando apropriado
- Se a pergunta for muito específica para investimentos, adicione: "⚠️ Lembre-se: busque um profissional certificado para decisões específicas!"

Pergunta do usuário: "${userMessage}"

Responda como Sr. Coin:`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: srCoinPrompt
      });

      // Save to history
      await base44.entities.ChatHistory.create({
        user_message: userMessage,
        bot_response: response,
        timestamp: new Date().toISOString(),
        context_tags: []
      });

      setIsTyping(false);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chatHistory']);
      setMessage('');
    },
    onError: (error) => {
      setIsTyping(false);
      toast.error('Erro ao enviar mensagem', {
        description: 'Sr. Coin está temporariamente indisponível.'
      });
    }
  });

  const handleSend = () => {
    if (!message.trim() || isTyping) return;
    if (!user) {
      toast.error('Usuário não identificado');
      return;
    }
    sendMessage.mutate({ userMessage: message, user });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const greetingMessage = {
    user_message: '',
    bot_response: '⚔️ Saudações, nobre aventureiro financeiro! Eu sou Sr. Coin, o Cavaleiro da Prosperidade. Estou aqui para guiá-lo em sua jornada rumo à riqueza e sabedoria financeira. Como posso auxiliá-lo hoje?',
    timestamp: new Date().toISOString()
  };

  const quickSuggestions = [
    { text: '💰 Como começar a investir?', icon: '📈' },
    { text: '🎯 Ajuda com meu orçamento', icon: '💵' },
    { text: '🏦 Como sair das dívidas?', icon: '⚡' },
    { text: '📊 Explique investimentos', icon: '💎' }
  ];

  const displayMessages = chatHistory.length === 0 ? [greetingMessage] : chatHistory;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full shadow-[0_0_30px_rgba(255,215,0,0.6)] hover:shadow-[0_0_40px_rgba(255,215,0,0.8)] flex items-center justify-center border-2 border-yellow-300 transition-all duration-300 z-[60] group"
        >
          <MessageCircle className="w-6 h-6 md:w-7 md:h-7 text-white group-hover:scale-110 transition-transform" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed z-[60] bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] rounded-2xl border-2 border-yellow-500/50 shadow-[0_0_40px_rgba(255,215,0,0.3)] flex flex-col ${
              isMinimized 
                ? 'bottom-24 right-6 w-[90vw] max-w-80 h-16' 
                : 'bottom-24 right-6 w-[90vw] max-w-md h-[600px] md:h-[650px]'
            } transition-all duration-300`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 md:p-4 border-b border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 flex-shrink-0">
              <div className="flex items-center gap-2 md:gap-3">
                <SrCoinAvatar isThinking={isTyping} size="md" />
                <div>
                  <h3 className="text-white font-bold flex items-center gap-2 text-sm md:text-base">
                    Sr. Coin
                    <Shield className="w-3 h-3 md:w-4 md:h-4 text-yellow-400" />
                  </h3>
                  <p className="text-yellow-400 text-[10px] md:text-xs">Cavaleiro da Prosperidade</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Disclaimer */}
                <div className="px-3 md:px-4 py-2 bg-red-500/10 border-b border-red-500/30 flex items-start gap-2 flex-shrink-0">
                  <Shield className="w-3 h-3 md:w-4 md:h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-[10px] md:text-xs leading-relaxed">
                    <strong>Aviso:</strong> Sr. Coin oferece educação financeira, não consultoria profissional.
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
                  {displayMessages.map((msg, idx) => (
                    <div key={idx} className="space-y-3">
                      {/* User Message */}
                      {msg.user_message && (
                        <div className="flex justify-end">
                          <div className="bg-gradient-to-r from-cyan-500/20 to-magenta-500/20 border border-cyan-500/50 rounded-2xl rounded-tr-none px-3 py-2 md:px-4 md:py-2.5 max-w-[85%]">
                            <p className="text-white text-xs md:text-sm leading-relaxed">{msg.user_message}</p>
                          </div>
                        </div>
                      )}

                      {/* Bot Response */}
                      <div className="flex gap-2 md:gap-3">
                        <SrCoinAvatar size="sm" />
                        <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-2xl rounded-tl-none px-3 py-2 md:px-4 md:py-3 max-w-[85%]">
                          <p className="text-white text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.bot_response}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex gap-2 md:gap-3">
                      <SrCoinAvatar isThinking={true} size="sm" />
                      <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-2xl rounded-tl-none px-3 py-2 md:px-4 md:py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 md:p-4 border-t-2 border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 space-y-2.5 md:space-y-3 flex-shrink-0">
                  {/* Quick Suggestions */}
                  {message === '' && chatHistory.length === 0 && (
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {quickSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => setMessage(suggestion.text)}
                          className="px-2 md:px-3 py-1 md:py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-full text-white text-[10px] md:text-xs transition-all duration-200 hover:scale-105 flex items-center gap-1 shadow-lg"
                        >
                          <span className="text-sm md:text-base">{suggestion.icon}</span>
                          <span className="hidden sm:inline">{suggestion.text.replace(/[💰🎯🏦📊] /g, '')}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input Field - MUITO MAIS VISÍVEL */}
                  <div className="relative">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="💬 Digite sua pergunta aqui..."
                      disabled={isTyping}
                      rows={2}
                      className="w-full bg-[#0a0a1a] border-2 border-yellow-500/50 focus:border-yellow-400 text-white placeholder:text-gray-400 rounded-xl px-3 md:px-4 py-2.5 md:py-3 pr-12 md:pr-14 text-xs md:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500/30 transition-all shadow-lg"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!message.trim() || isTyping}
                      className="absolute right-2 bottom-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-3 md:px-4 py-2 md:py-2.5 rounded-lg transition-all shadow-lg hover:shadow-yellow-500/50 hover:scale-105 disabled:scale-100 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </Button>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[10px] md:text-xs">
                    <p className="text-gray-500 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      <span className="hidden md:inline">Powered by AI</span>
                      <span className="md:hidden">AI</span>
                    </p>
                    <p className="text-gray-500 hidden md:block">
                      <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">Enter</kbd> envia
                    </p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}