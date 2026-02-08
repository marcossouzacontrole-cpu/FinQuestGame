import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function FinancialChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'bot',
      text: '👋 Olá! Sou o Sir Coin. Pergunte-me qualquer coisa sobre finanças, gamificação ou metas!'
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const answerMutation = useMutation({
    mutationFn: async (question) => {
      const response = await base44.functions.invoke('answerFinancialQuestion', { question });
      return response.data;
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'bot',
        text: data.answer,
        cached: data.cached
      }]);
      setInput('');
    },
    onError: () => {
      toast.error('Erro ao responder. Tente novamente!');
    }
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: input
    };

    setMessages(prev => [...prev, userMessage]);
    answerMutation.mutate(input);
  };

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      {/* Chat Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.8)] transition-all"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-40 right-6 z-40 w-96 h-96 bg-gradient-to-b from-slate-900 to-slate-800 border border-cyan-500/30 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.3)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <h3 className="font-bold text-white">Sir Coin - Assistente Financeiro</h3>
            </div>

            {/* Messages - Antigas em cima, recentes em baixo */}
            <div className="flex-1 flex flex-col overflow-y-auto p-4">
              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs rounded-lg p-3 text-sm ${
                          msg.type === 'user'
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-700 text-slate-100'
                        }`}
                      >
                        <p>{msg.text}</p>
                        {msg.cached && msg.type === 'bot' && (
                          <p className="text-xs mt-1 opacity-70">💾 Resposta em cache</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {answerMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700 text-slate-100 rounded-lg p-3 flex gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Pensando...</span>
                    </div>
                  </div>
                )}
              </div>

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="border-t border-slate-700 p-3 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte qualquer coisa..."
                className="flex-1 bg-slate-700 text-white placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={answerMutation.isPending || !input.trim()}
                className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white p-2 rounded-lg transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}