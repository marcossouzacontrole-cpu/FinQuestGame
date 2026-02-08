import { useState, useEffect } from 'react';
import { Award, Lock, Sparkles } from 'lucide-react';
import NeonCard from './NeonCard';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const BADGES = [
  { id: 'first_deposit', name: 'Primeira Aportação', icon: '💰', requirement: 'Fazer primeiro depósito', xp: 50, color: '#00FFFF' },
  { id: 'r1000_saved', name: 'Economizador Bronze', icon: '🥉', requirement: 'Economizar R$ 1.000', xp: 100, color: '#CD7F32' },
  { id: 'r5000_saved', name: 'Economizador Prata', icon: '🥈', requirement: 'Economizar R$ 5.000', xp: 200, color: '#C0C0C0' },
  { id: 'r10000_saved', name: 'Economizador Ouro', icon: '🥇', requirement: 'Economizar R$ 10.000', xp: 500, color: '#FFD700' },
  { id: 'first_goal', name: 'Primeira Conquista', icon: '🎯', requirement: 'Completar primeira meta', xp: 150, color: '#FF00FF' },
  { id: '3_goals', name: 'Conquistador', icon: '🏆', requirement: 'Completar 3 metas', xp: 300, color: '#39FF14' },
  { id: '5_goals', name: 'Mestre das Metas', icon: '👑', requirement: 'Completar 5 metas', xp: 600, color: '#FFD700' },
  { id: 'streak_7', name: 'Consistência Bronze', icon: '🔥', requirement: '7 dias de streak', xp: 100, color: '#FF6B35' },
  { id: 'streak_30', name: 'Consistência Prata', icon: '⚡', requirement: '30 dias de streak', xp: 300, color: '#00FFFF' },
  { id: 'streak_90', name: 'Consistência Ouro', icon: '✨', requirement: '90 dias de streak', xp: 800, color: '#FFD700' },
  { id: 'quick_saver', name: 'Poupador Rápido', icon: '⏱️', requirement: 'Completar meta em menos de 3 meses', xp: 250, color: '#8A2BE2' },
];

export default function VaultBadges({ goals, userData }) {
  const queryClient = useQueryClient();
  const [earnedBadges, setEarnedBadges] = useState(userData?.vault_badges || []);
  const [newBadges, setNewBadges] = useState([]);

  const updateBadges = useMutation({
    mutationFn: async (badges) => {
      await base44.entities.User.update(userData.id, {
        vault_badges: badges,
        xp: (userData.xp || 0) + newBadges.reduce((sum, b) => sum + b.xp, 0),
        total_xp: (userData.total_xp || 0) + newBadges.reduce((sum, b) => sum + b.xp, 0)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUserProfile']);
      if (newBadges.length > 0) {
        newBadges.forEach(badge => {
          toast.success(`🏅 Badge Desbloqueado: ${badge.name}!`, {
            description: `+${badge.xp} XP • ${badge.requirement}`
          });
        });
        setNewBadges([]);
      }
    }
  });

  useEffect(() => {
    if (!userData || !goals) return;

    const completedGoals = goals.filter(g => g.status === 'completed');
    const totalSaved = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
    const streak = userData.vault_deposit_streak || 0;
    
    const toEarn = [];

    // Check first deposit
    if (totalSaved > 0 && !earnedBadges.includes('first_deposit')) {
      toEarn.push(BADGES.find(b => b.id === 'first_deposit'));
    }

    // Check savings milestones
    if (totalSaved >= 1000 && !earnedBadges.includes('r1000_saved')) {
      toEarn.push(BADGES.find(b => b.id === 'r1000_saved'));
    }
    if (totalSaved >= 5000 && !earnedBadges.includes('r5000_saved')) {
      toEarn.push(BADGES.find(b => b.id === 'r5000_saved'));
    }
    if (totalSaved >= 10000 && !earnedBadges.includes('r10000_saved')) {
      toEarn.push(BADGES.find(b => b.id === 'r10000_saved'));
    }

    // Check goal completions
    if (completedGoals.length >= 1 && !earnedBadges.includes('first_goal')) {
      toEarn.push(BADGES.find(b => b.id === 'first_goal'));
    }
    if (completedGoals.length >= 3 && !earnedBadges.includes('3_goals')) {
      toEarn.push(BADGES.find(b => b.id === '3_goals'));
    }
    if (completedGoals.length >= 5 && !earnedBadges.includes('5_goals')) {
      toEarn.push(BADGES.find(b => b.id === '5_goals'));
    }

    // Check streaks
    if (streak >= 7 && !earnedBadges.includes('streak_7')) {
      toEarn.push(BADGES.find(b => b.id === 'streak_7'));
    }
    if (streak >= 30 && !earnedBadges.includes('streak_30')) {
      toEarn.push(BADGES.find(b => b.id === 'streak_30'));
    }
    if (streak >= 90 && !earnedBadges.includes('streak_90')) {
      toEarn.push(BADGES.find(b => b.id === 'streak_90'));
    }

    // Check quick saver (goal completed in less than 90 days)
    if (!earnedBadges.includes('quick_saver')) {
      const quickGoal = completedGoals.find(g => {
        if (!g.completed_date || !g.created_date) return false;
        const days = (new Date(g.completed_date) - new Date(g.created_date)) / (1000 * 60 * 60 * 24);
        return days < 90;
      });
      if (quickGoal) {
        toEarn.push(BADGES.find(b => b.id === 'quick_saver'));
      }
    }

    if (toEarn.length > 0) {
      const newBadgeIds = [...earnedBadges, ...toEarn.map(b => b.id)];
      setEarnedBadges(newBadgeIds);
      setNewBadges(toEarn);
      updateBadges.mutate(newBadgeIds);
    }
  }, [goals, userData]);

  return (
    <NeonCard glowColor="gold" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Coleção de Badges</h3>
            <p className="text-gray-400 text-sm">
              {earnedBadges.length} de {BADGES.length} conquistados
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {BADGES.map(badge => {
            const isEarned = earnedBadges.includes(badge.id);
            
            return (
              <div
                key={badge.id}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                  isEarned
                    ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 hover:scale-105'
                    : 'border-gray-700 bg-gray-900/50 opacity-60'
                }`}
              >
                <div className="text-center">
                  <div className="relative inline-block mb-2">
                    <span 
                      className="text-4xl block" 
                      style={{ 
                        filter: isEarned ? `drop-shadow(0 0 10px ${badge.color})` : 'grayscale(100%)',
                        opacity: isEarned ? 1 : 0.3
                      }}
                    >
                      {badge.icon}
                    </span>
                    {!isEarned && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <p className={`font-bold text-sm mb-1 ${isEarned ? 'text-white' : 'text-gray-500'}`}>
                    {badge.name}
                  </p>
                  <p className="text-xs text-gray-400">{badge.requirement}</p>
                  {isEarned && (
                    <div className="mt-2 flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-yellow-400" />
                      <span className="text-yellow-400 font-semibold text-xs">+{badge.xp} XP</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {earnedBadges.length === BADGES.length && (
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-xl text-center">
            <p className="text-yellow-400 font-bold text-lg mb-1">🎉 Coleção Completa!</p>
            <p className="text-gray-300 text-sm">Você conquistou todos os badges disponíveis!</p>
          </div>
        )}
      </div>
    </NeonCard>
  );
}