import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Trophy, Zap, Gift, TrendingUp, Check, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function EventCalendar({ user }) {
  const [filter, setFilter] = useState('all'); // all, active, upcoming, ended
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['allEvents', filter],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list('-start_date');
      const now = new Date();
      
      if (filter === 'active') {
        return allEvents.filter(e => 
          new Date(e.start_date) <= now && 
          new Date(e.end_date) >= now &&
          e.status === 'active'
        );
      }
      if (filter === 'upcoming') {
        return allEvents.filter(e => new Date(e.start_date) > now);
      }
      if (filter === 'ended') {
        return allEvents.filter(e => new Date(e.end_date) < now || e.status === 'ended');
      }
      return allEvents;
    }
  });

  const { data: participations = [] } = useQuery({
    queryKey: ['eventParticipations', user?.email],
    queryFn: () => base44.entities.EventParticipation.filter({ user_email: user.email }),
    enabled: !!user
  });

  const joinEvent = useMutation({
    mutationFn: async ({ event }) => {
      return await base44.entities.EventParticipation.create({
        event_id: event.id,
        user_email: user.email,
        joined_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['eventParticipations']);
      toast.success('🎉 Inscrito no evento!');
    }
  });

  const claimRewards = useMutation({
    mutationFn: async ({ event, participation }) => {
      // Update participation
      await base44.entities.EventParticipation.update(participation.id, {
        rewards_claimed: true
      });

      // Give rewards to user
      const rewards = event.rewards || {};
      await base44.entities.User.update(user.id, {
        xp: (user.xp || 0) + (rewards.xp || 0),
        total_xp: (user.total_xp || 0) + (rewards.xp || 0),
        gold_coins: (user.gold_coins || 0) + (rewards.gold || 0)
      });

      return rewards;
    },
    onSuccess: (rewards) => {
      queryClient.invalidateQueries(['eventParticipations']);
      queryClient.invalidateQueries(['currentUserProfile']);
      toast.success('🎁 Recompensas recebidas!', {
        description: `+${rewards.xp || 0} XP, +${rewards.gold || 0} Gold`
      });
    }
  });

  const eventIcons = {
    xp_boost: <Zap className="w-6 h-6 text-cyan-400" />,
    gold_boost: <TrendingUp className="w-6 h-6 text-yellow-400" />,
    double_rewards: <Gift className="w-6 h-6 text-magenta-400" />,
    collaborative: <Users className="w-6 h-6 text-purple-400" />,
    ranking_challenge: <Trophy className="w-6 h-6 text-yellow-400" />,
    special_shop: <Gift className="w-6 h-6 text-cyan-400" />,
    mission_rush: <Zap className="w-6 h-6 text-green-400" />
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);

    if (now < start) return 'upcoming';
    if (now > end) return 'ended';
    return 'active';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isJoined = (eventId) => {
    return participations.some(p => p.event_id === eventId);
  };

  const canClaimRewards = (event) => {
    const participation = participations.find(p => p.event_id === event.id);
    if (!participation) return false;
    if (participation.rewards_claimed) return false;
    
    const status = getEventStatus(event);
    return status === 'ended' && event.rewards && (event.rewards.xp > 0 || event.rewards.gold > 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Calendar className="w-10 h-10 text-cyan-400 animate-pulse" />
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-magenta-400">
            CALENDÁRIO DE EVENTOS
          </h2>
        </div>
        <p className="text-gray-400">
          Participe de eventos especiais e ganhe recompensas exclusivas!
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'Todos', icon: '🌟' },
          { value: 'active', label: 'Ativos', icon: '🔥' },
          { value: 'upcoming', label: 'Próximos', icon: '⏰' },
          { value: 'ended', label: 'Encerrados', icon: '✅' }
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
              filter === f.value
                ? 'bg-gradient-to-r from-cyan-500 to-magenta-500 text-white shadow-[0_0_20px_rgba(0,255,255,0.5)]'
                : 'bg-[#1a1a2e] border border-cyan-500/30 text-gray-400 hover:border-cyan-500/50'
            }`}
          >
            <span className="mr-2">{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {events.map((event, idx) => {
            const status = getEventStatus(event);
            const joined = isJoined(event.id);
            const participation = participations.find(p => p.event_id === event.id);
            const canClaim = canClaimRewards(event);

            return (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05 }}
              >
                <NeonCard 
                  glowColor={status === 'active' ? 'gold' : 'cyan'}
                  className="relative overflow-hidden h-full"
                >
                  {/* Status Badge */}
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full font-bold text-xs ${
                    status === 'active' 
                      ? 'bg-green-500/20 border border-green-500 text-green-400 animate-pulse'
                      : status === 'upcoming'
                      ? 'bg-blue-500/20 border border-blue-500 text-blue-400'
                      : 'bg-gray-500/20 border border-gray-500 text-gray-400'
                  }`}>
                    {status === 'active' ? '● ATIVO' : status === 'upcoming' ? '⏰ EM BREVE' : '✓ ENCERRADO'}
                  </div>

                  <div className="space-y-4">
                    {/* Icon & Title */}
                    <div className="flex items-start gap-4">
                      <motion.div
                        animate={status === 'active' ? { 
                          rotate: [0, -10, 10, -10, 0],
                          scale: [1, 1.1, 1]
                        } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-6xl"
                      >
                        {event.icon}
                      </motion.div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {eventIcons[event.type]}
                          <h3 className="text-white font-bold text-xl">{event.name}</h3>
                        </div>
                        <p className="text-gray-400 text-sm">{event.description}</p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-cyan-500/20">
                        <p className="text-cyan-400 text-xs mb-1">Início</p>
                        <p className="text-white text-sm font-bold">{formatDate(event.start_date)}</p>
                      </div>
                      <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-magenta-500/20">
                        <p className="text-magenta-400 text-xs mb-1">Término</p>
                        <p className="text-white text-sm font-bold">{formatDate(event.end_date)}</p>
                      </div>
                    </div>

                    {/* Bonuses */}
                    {(event.xp_multiplier > 1 || event.gold_multiplier > 1) && (
                      <div className="flex gap-2">
                        {event.xp_multiplier > 1 && (
                          <div className="flex-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                            <p className="text-cyan-400 text-xl font-black">
                              {event.xp_multiplier}x XP
                            </p>
                          </div>
                        )}
                        {event.gold_multiplier > 1 && (
                          <div className="flex-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                            <p className="text-yellow-400 text-xl font-black">
                              {event.gold_multiplier}x Gold
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Collaborative Progress */}
                    {event.type === 'collaborative' && event.collaborative_target && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-purple-400 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Progresso Global
                          </span>
                          <span className="text-white font-bold">
                            {Math.round((event.collaborative_progress / event.collaborative_target) * 100)}%
                          </span>
                        </div>
                        <div className="h-3 bg-[#0a0a1a] rounded-full overflow-hidden border border-purple-500/30">
                          <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${(event.collaborative_progress / event.collaborative_target) * 100}%` 
                            }}
                            transition={{ duration: 1 }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          {event.collaborative_progress.toLocaleString()} / {event.collaborative_target.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Rewards */}
                    {event.rewards && (event.rewards.xp > 0 || event.rewards.gold > 0) && (
                      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-3">
                        <p className="text-yellow-400 text-xs font-bold mb-2 flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          RECOMPENSAS
                        </p>
                        <div className="flex gap-4">
                          {event.rewards.xp > 0 && (
                            <span className="text-cyan-400 text-sm font-bold">+{event.rewards.xp} XP</span>
                          )}
                          {event.rewards.gold > 0 && (
                            <span className="text-yellow-400 text-sm font-bold">+{event.rewards.gold} Gold</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2">
                      {canClaim ? (
                        <Button
                          onClick={() => claimRewards.mutate({ event, participation })}
                          disabled={claimRewards.isLoading}
                          className="w-full bg-gradient-to-r from-green-500 to-cyan-500 text-white font-bold"
                        >
                          <Gift className="w-4 h-4 mr-2" />
                          Resgatar Recompensas
                        </Button>
                      ) : joined ? (
                        <div className="flex items-center justify-center gap-2 py-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                          <Check className="w-5 h-5 text-green-400" />
                          <span className="text-green-400 font-bold">Participando</span>
                        </div>
                      ) : status === 'active' ? (
                        <Button
                          onClick={() => joinEvent.mutate({ event })}
                          disabled={joinEvent.isLoading}
                          className="w-full bg-gradient-to-r from-cyan-500 to-magenta-500 text-white font-bold"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Participar Agora
                        </Button>
                      ) : status === 'upcoming' ? (
                        <div className="text-center py-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <span className="text-blue-400 text-sm">Aguardando início...</span>
                        </div>
                      ) : (
                        <div className="text-center py-3 bg-gray-500/10 border border-gray-500/30 rounded-lg">
                          <span className="text-gray-400 text-sm">Evento Encerrado</span>
                        </div>
                      )}
                    </div>
                  </div>
                </NeonCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {events.length === 0 && (
        <NeonCard glowColor="cyan">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-gray-400">Nenhum evento disponível no momento</p>
          </div>
        </NeonCard>
      )}
    </div>
  );
}