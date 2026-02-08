import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NeonCard from './NeonCard';
import { toast } from 'sonner';

export default function GuildChat({ guildId }) {
  const [message, setMessage] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: guild } = useQuery({
    queryKey: ['guild', guildId],
    queryFn: async () => {
      const guilds = await base44.entities.Guild.filter({ id: guildId });
      return guilds[0];
    },
    enabled: !!guildId
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['guildMessages', guildId],
    queryFn: async () => {
      if (!guildId) return [];
      return await base44.entities.ChatHistory.filter(
        { context_tags: [guildId] },
        '-timestamp',
        50
      );
    },
    enabled: !!guildId,
    refetchInterval: 5000
  });

  const sendMessage = useMutation({
    mutationFn: async (messageText) => {
      await base44.entities.ChatHistory.create({
        user_message: messageText,
        bot_response: '',
        timestamp: new Date().toISOString(),
        context_tags: [guildId, currentUser.email]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['guildMessages']);
      setMessage('');
    }
  });

  const requestAIAdvice = useMutation({
    mutationFn: async () => {
      setIsAIThinking(true);

      const prompt = `
Você é Sir Coin, conselheiro da Guilda "${guild.name}".

Analise as últimas mensagens da Guilda e forneça um conselho financeiro coletivo.

Mensagens recentes:
${messages.slice(0, 5).map(m => `- ${m.user_message}`).join('\n')}

Forneça:
1. Um resumo dos tópicos discutidos
2. Um conselho prático para o grupo
3. Uma sugestão de meta ou missão cooperativa

Resposta (máx 150 palavras, tom encorajador):`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });

      await base44.entities.ChatHistory.create({
        user_message: '[Sir Coin convocado pela Guilda]',
        bot_response: response,
        timestamp: new Date().toISOString(),
        context_tags: [guildId, 'sir_coin_advice']
      });

      setIsAIThinking(false);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['guildMessages']);
      toast.success('Sir Coin compartilhou sua sabedoria! 🛡️');
    },
    onError: () => {
      setIsAIThinking(false);
      toast.error('Sir Coin está indisponível no momento');
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!guild) return null;

  return (
    <NeonCard glowColor="purple">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-bold">{guild.name}</h3>
          <span className="text-gray-400 text-sm">({guild.members?.length || 0} membros)</span>
        </div>
        <Button
          onClick={() => requestAIAdvice.mutate()}
          disabled={isAIThinking}
          size="sm"
          className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-xs"
        >
          <Sparkles className="w-3 h-3 mr-1" />
          {isAIThinking ? 'Pensando...' : 'Convocar Sir Coin'}
        </Button>
      </div>

      <div className="h-96 overflow-y-auto mb-4 space-y-3 bg-[#0a0a1a] rounded-lg p-4 border border-purple-500/30">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma mensagem ainda. Seja o primeiro!</p>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={msg.bot_response ? 'space-y-2' : ''}>
              {msg.user_message && !msg.user_message.includes('[Sir Coin') && (
                <div className="flex justify-end">
                  <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-lg px-3 py-2 max-w-[80%]">
                    <p className="text-white text-sm">{msg.user_message}</p>
                  </div>
                </div>
              )}
              {msg.bot_response && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🛡️</span>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 max-w-[80%]">
                    <p className="text-white text-sm whitespace-pre-wrap">{msg.bot_response}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && message.trim() && sendMessage.mutate(message)}
          placeholder="Digite sua mensagem..."
          className="bg-[#0a0a1a] border-purple-500/30 text-white"
        />
        <Button
          onClick={() => message.trim() && sendMessage.mutate(message)}
          disabled={!message.trim()}
          className="bg-gradient-to-r from-purple-500 to-pink-500"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </NeonCard>
  );
}