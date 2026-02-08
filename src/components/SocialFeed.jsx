import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, TrendingUp, Zap, Send, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import NeonCard from './NeonCard';
import { toast } from 'sonner';

export default function SocialFeed({ user }) {
  const [commentingPostId, setCommentingPostId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [filter, setFilter] = useState('recent'); // recent, trending
  const queryClient = useQueryClient();

  const { data: posts } = useQuery({
    queryKey: ['feedPosts', filter],
    queryFn: async () => {
      const allPosts = await base44.entities.FeedPost.list(
        filter === 'trending' ? '-trending_score' : '-created_date', 
        50
      );
      return allPosts;
    }
  });

  const { data: userLikes } = useQuery({
    queryKey: ['userLikes', user.email],
    queryFn: () => base44.entities.FeedLike.filter({ user_email: user.email })
  });

  const { data: comments } = useQuery({
    queryKey: ['feedComments'],
    queryFn: () => base44.entities.FeedComment.list('-created_date', 200)
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      await base44.entities.FeedPost.create({
        ...postData,
        user_email: user.email,
        user_name: user.full_name || user.email.split('@')[0],
        trending_score: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feedPosts']);
      toast.success('📣 Post compartilhado!');
    }
  });

  const likeMutation = useMutation({
    mutationFn: async (post) => {
      const existingLike = userLikes?.find(l => l.post_id === post.id);
      
      if (existingLike) {
        // Unlike
        await base44.entities.FeedLike.delete(existingLike.id);
        await base44.entities.FeedPost.update(post.id, {
          likes_count: Math.max(0, post.likes_count - 1),
          trending_score: post.trending_score - 1
        });
      } else {
        // Like
        await base44.entities.FeedLike.create({
          post_id: post.id,
          user_email: user.email
        });
        await base44.entities.FeedPost.update(post.id, {
          likes_count: post.likes_count + 1,
          trending_score: post.trending_score + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feedPosts']);
      queryClient.invalidateQueries(['userLikes']);
    }
  });

  const commentMutation = useMutation({
    mutationFn: async ({ postId, text }) => {
      await base44.entities.FeedComment.create({
        post_id: postId,
        user_email: user.email,
        user_name: user.full_name || user.email.split('@')[0],
        comment_text: text
      });

      const post = posts.find(p => p.id === postId);
      await base44.entities.FeedPost.update(postId, {
        comments_count: post.comments_count + 1,
        trending_score: post.trending_score + 2
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feedPosts']);
      queryClient.invalidateQueries(['feedComments']);
      setCommentText('');
      setCommentingPostId(null);
      toast.success('💬 Comentário enviado!');
    }
  });

  const getPostIcon = (type) => {
    const icons = {
      goal_achieved: '🏆',
      mission_completed: '🎯',
      level_up: '⚡',
      streak_milestone: '🔥',
      achievement_unlocked: '🏅',
      custom: '📣'
    };
    return icons[type] || '🎉';
  };

  const isLikedByUser = (postId) => {
    return userLikes?.some(l => l.post_id === postId);
  };

  const getPostComments = (postId) => {
    return comments?.filter(c => c.post_id === postId) || [];
  };

  return (
    <div className="space-y-6">
      <NeonCard glowColor="cyan">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase">Feed Comunitário</h2>
            <p className="text-cyan-400">Conquistas e marcos da comunidade</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setFilter('recent')}
            variant={filter === 'recent' ? 'default' : 'outline'}
            className={filter === 'recent' ? 'bg-cyan-600' : ''}
          >
            <Zap className="w-4 h-4 mr-2" />
            Recentes
          </Button>
          <Button
            onClick={() => setFilter('trending')}
            variant={filter === 'trending' ? 'default' : 'outline'}
            className={filter === 'trending' ? 'bg-orange-600' : ''}
          >
            <Flame className="w-4 h-4 mr-2" />
            Em Alta
          </Button>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          <AnimatePresence>
            {posts?.map((post, idx) => {
              const postComments = getPostComments(post.id);
              const isLiked = isLikedByUser(post.id);
              const isCommenting = commentingPostId === post.id;

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-cyan-500/50 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xl font-bold text-white">
                        {post.user_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-white font-bold">{post.user_name}</p>
                        <p className="text-slate-400 text-xs">
                          {new Date(post.created_date).toLocaleDateString('pt-BR', { 
                            day: 'numeric', 
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    {post.trending_score > 10 && (
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                        <Flame className="w-3 h-3 mr-1" />
                        Em Alta
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{post.icon || getPostIcon(post.post_type)}</span>
                      <h3 className="text-lg font-bold text-white">{post.title}</h3>
                    </div>
                    {post.description && (
                      <p className="text-slate-300">{post.description}</p>
                    )}
                    {post.metadata && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {post.metadata.value && (
                          <Badge variant="outline" className="text-green-400">
                            💰 R$ {post.metadata.value.toLocaleString('pt-BR')}
                          </Badge>
                        )}
                        {post.metadata.level && (
                          <Badge variant="outline" className="text-cyan-400">
                            ⚡ Level {post.metadata.level}
                          </Badge>
                        )}
                        {post.metadata.streak && (
                          <Badge variant="outline" className="text-orange-400">
                            🔥 {post.metadata.streak} dias
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-6 mb-4">
                    <button
                      onClick={() => likeMutation.mutate(post)}
                      disabled={likeMutation.isPending}
                      className={`flex items-center gap-2 transition-colors ${
                        isLiked ? 'text-red-400' : 'text-slate-400 hover:text-red-400'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-400' : ''}`} />
                      <span className="font-semibold">{post.likes_count}</span>
                    </button>

                    <button
                      onClick={() => setCommentingPostId(isCommenting ? null : post.id)}
                      className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-semibold">{post.comments_count}</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {postComments.length > 0 && (
                    <div className="space-y-3 mb-4 pl-4 border-l-2 border-slate-700">
                      {postComments.slice(0, 3).map((comment) => (
                        <div key={comment.id} className="bg-slate-900/50 rounded-lg p-3">
                          <p className="text-cyan-400 font-bold text-sm mb-1">
                            {comment.user_name}
                          </p>
                          <p className="text-slate-300 text-sm">{comment.comment_text}</p>
                        </div>
                      ))}
                      {postComments.length > 3 && (
                        <p className="text-slate-500 text-xs">
                          + {postComments.length - 3} comentários
                        </p>
                      )}
                    </div>
                  )}

                  {/* Comment Input */}
                  {isCommenting && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="flex gap-2"
                    >
                      <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Escreva um comentário..."
                        className="flex-1 bg-slate-900 border-slate-700"
                        rows={2}
                      />
                      <Button
                        onClick={() => commentMutation.mutate({ postId: post.id, text: commentText })}
                        disabled={!commentText.trim() || commentMutation.isPending}
                        className="bg-cyan-600 hover:bg-cyan-700"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {(!posts || posts.length === 0) && (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum post no feed ainda</p>
              <p className="text-slate-500 text-sm">Seja o primeiro a compartilhar uma conquista!</p>
            </div>
          )}
        </div>
      </NeonCard>
    </div>
  );
}