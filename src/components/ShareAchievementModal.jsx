import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ShareAchievementModal({ achievement, user, onClose }) {
  const [customMessage, setCustomMessage] = useState('');
  const [visibility, setVisibility] = useState('public');
  const queryClient = useQueryClient();

  const shareMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.FeedPost.create({
        user_email: user.email,
        user_name: user.full_name || user.email.split('@')[0],
        post_type: achievement.type,
        title: achievement.title,
        description: customMessage || achievement.description,
        icon: achievement.icon,
        metadata: achievement.metadata || {},
        visibility,
        trending_score: 0,
        likes_count: 0,
        comments_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feedPosts']);
      toast.success('🎉 Conquista compartilhada no feed!');
      onClose();
    },
    onError: () => {
      toast.error('Erro ao compartilhar conquista');
    }
  });

  if (!achievement) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(0,255,255,0.3)] max-w-md w-full p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase">Compartilhar</h3>
                <p className="text-cyan-400 text-sm">Mostre sua conquista!</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Achievement Preview */}
          <div className="bg-slate-900/50 rounded-xl p-4 mb-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{achievement.icon}</span>
              <div>
                <h4 className="text-white font-bold">{achievement.title}</h4>
                <p className="text-slate-400 text-sm">{achievement.description}</p>
              </div>
            </div>

            {achievement.metadata && (
              <div className="flex gap-2 flex-wrap">
                {achievement.metadata.value && (
                  <Badge className="bg-green-500/20 text-green-400">
                    💰 R$ {achievement.metadata.value.toLocaleString('pt-BR')}
                  </Badge>
                )}
                {achievement.metadata.level && (
                  <Badge className="bg-cyan-500/20 text-cyan-400">
                    ⚡ Level {achievement.metadata.level}
                  </Badge>
                )}
                {achievement.metadata.item_name && (
                  <Badge className="bg-purple-500/20 text-purple-400">
                    🎁 {achievement.metadata.item_name}
                  </Badge>
                )}
                {achievement.metadata.streak && (
                  <Badge className="bg-orange-500/20 text-orange-400">
                    🔥 {achievement.metadata.streak} dias
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Custom Message */}
          <div className="mb-6">
            <label className="text-white font-semibold mb-2 block">
              Adicione uma mensagem (opcional)
            </label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Conte como você conseguiu essa conquista..."
              className="bg-slate-900 border-slate-700 text-white"
              rows={3}
              maxLength={280}
            />
            <p className="text-slate-500 text-xs mt-1">
              {customMessage.length}/280 caracteres
            </p>
          </div>

          {/* Visibility */}
          <div className="mb-6">
            <label className="text-white font-semibold mb-2 block">Visibilidade</label>
            <div className="flex gap-2">
              <button
                onClick={() => setVisibility('public')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  visibility === 'public'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                🌍 Público
              </button>
              <button
                onClick={() => setVisibility('friends')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  visibility === 'friends'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                👥 Amigos
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Agora não
            </Button>
            <Button
              onClick={() => shareMutation.mutate()}
              disabled={shareMutation.isPending}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {shareMutation.isPending ? (
                'Compartilhando...'
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Compartilhar
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}