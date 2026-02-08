import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import NeonCard from './NeonCard';
import { Zap, Trophy, Users, Gift, Clock, TrendingUp } from 'lucide-react';

export default function ActiveEventBanner() {
  const { data: events = [] } = useQuery({
    queryKey: ['activeEvents'],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list('-start_date');
      const now = new Date();
      return allEvents.filter(event => 
        new Date(event.start_date) <= now && 
        new Date(event.end_date) >= now &&
        event.status === 'active'
      );
    },
    refetchInterval: 60000 // Recheck every minute
  });

  if (events.length === 0) return null;

  const eventIcons = {
    xp_boost: <Zap className="w-5 h-5" />,
    gold_boost: <TrendingUp className="w-5 h-5" />,
    double_rewards: <Gift className="w-5 h-5" />,
    collaborative: <Users className="w-5 h-5" />,
    ranking_challenge: <Trophy className="w-5 h-5" />,
    special_shop: <Gift className="w-5 h-5" />,
    mission_rush: <Zap className="w-5 h-5" />
  };

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {events.map((event, idx) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <NeonCard 
            glowColor={event.type === 'xp_boost' ? 'cyan' : event.type === 'gold_boost' ? 'gold' : 'purple'}
            className="relative overflow-hidden"
          >
            {/* Animated background */}
            <motion.div
              className="absolute inset-0 opacity-20"
              style={{ 
                background: `radial-gradient(circle at 50% 50%, ${event.color}40 0%, transparent 70%)`
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.3, 0.2]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />

            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  className="text-5xl"
                  animate={{ 
                    rotate: [0, -10, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {event.icon}
                </motion.div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {eventIcons[event.type]}
                    <h3 className="text-white font-black text-xl">{event.name}</h3>
                    <motion.div
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="px-2 py-1 bg-red-500/20 border border-red-500 rounded text-red-400 text-xs font-bold"
                    >
                      ATIVO
                    </motion.div>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">{event.description}</p>
                  
                  {/* Multipliers */}
                  <div className="flex gap-3 flex-wrap">
                    {event.xp_multiplier > 1 && (
                      <div className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded-lg">
                        <span className="text-cyan-400 text-xs font-bold">
                          🔥 XP {event.xp_multiplier}x
                        </span>
                      </div>
                    )}
                    {event.gold_multiplier > 1 && (
                      <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                        <span className="text-yellow-400 text-xs font-bold">
                          💰 Gold {event.gold_multiplier}x
                        </span>
                      </div>
                    )}
                    {event.type === 'collaborative' && (
                      <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-lg">
                        <span className="text-purple-400 text-xs font-bold">
                          👥 {event.participants_count} jogadores
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/50 rounded-lg px-4 py-2">
                  <Clock className="w-4 h-4 text-red-400 animate-pulse" />
                  <span className="text-red-400 font-bold">{getTimeRemaining(event.end_date)}</span>
                </div>
                
                {event.type === 'collaborative' && event.collaborative_target && (
                  <div className="w-48">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Progresso Global</span>
                      <span className="text-purple-400 font-bold">
                        {Math.round((event.collaborative_progress / event.collaborative_target) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-[#0a0a1a] rounded-full overflow-hidden border border-purple-500/30">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${(event.collaborative_progress / event.collaborative_target) * 100}%` 
                        }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {event.collaborative_progress.toLocaleString()} / {event.collaborative_target.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </NeonCard>
        </motion.div>
      ))}
    </div>
  );
}