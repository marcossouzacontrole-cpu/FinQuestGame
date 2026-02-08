import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export function useGamification() {
  const queryClient = useQueryClient();

  const awardXP = useMutation({
    mutationFn: async ({ amount, goldAmount = 0, reason, userId, streakType = 'streak_count' }) => {
      // Buscar usuário atual
      const user = await base44.entities.User.filter({ email: userId });
      if (!user || user.length === 0) throw new Error('Usuário não encontrado');

      const currentUser = user[0];
      const currentXP = currentUser.xp || 0;
      const currentLevel = currentUser.level || 1;
      const streakCount = currentUser[streakType] || 0;

      // Determine activity date field based on streak type
      const dateField = streakType === 'learning_streak' ? 'last_study_date' : 'last_transaction_date';
      const lastActivity = currentUser[dateField];

      // Sistema de Streak (Combo)
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let newStreak = streakCount;
      let streakMultiplier = 1;

      if (lastActivity === yesterday) {
        newStreak = streakCount + 1;
      } else if (lastActivity !== today) {
        newStreak = 1;
      }

      // Multiplier logic: +5% per day, capped at 2.0x (20 days)
      streakMultiplier = Math.min(2, 1 + (newStreak * 0.05));

      // Aplicar multiplicador de streak
      const finalXP = Math.round(amount * streakMultiplier);
      const newTotalXP = currentXP + finalXP;

      // Calcular nível e XP necessário (100 XP por nível)
      let newLevel = currentLevel;
      let remainingXP = newTotalXP;

      while (remainingXP >= (newLevel * 100)) {
        remainingXP -= (newLevel * 100);
        newLevel++;
      }

      const leveledUp = newLevel > currentLevel;

      // Atualizar usuário
      const updateData = {
        xp: remainingXP,
        level: newLevel,
        total_xp: (currentUser.total_xp || 0) + finalXP,
        gold_coins: (currentUser.gold_coins || 0) + goldAmount,
        [streakType]: newStreak,
        [dateField]: today
      };

      await base44.entities.User.update(currentUser.id, updateData);

      return {
        leveledUp,
        newLevel,
        finalXP,
        goldAmount,
        streakMultiplier,
        newStreak,
        reason
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['base44User']);
      queryClient.invalidateQueries(['currentUserProfile']);

      if (data.leveledUp) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
        toast.success(`🎉 LEVEL UP! Você alcançou o Nível ${data.newLevel}!`, {
          duration: 5000
        });
      } else {
        const streakMsg = data.streakMultiplier > 1 ? ` (${data.streakMultiplier.toFixed(2)}x Multi!)` : '';
        const goldMsg = data.goldAmount > 0 ? ` +${data.goldAmount} Gold` : '';
        const message = `+${data.finalXP} XP${streakMsg}${goldMsg} • ${data.reason}`;

        toast.success(message, {
          duration: 3000
        });

        // Emitir evento para animação de Floating Rewards
        window.dispatchEvent(new CustomEvent('finquest-reward', {
          detail: {
            amount: data.finalXP,
            type: 'xp',
            reason: data.reason
          }
        }));

        if (data.goldAmount > 0) {
          window.dispatchEvent(new CustomEvent('finquest-reward', {
            detail: {
              amount: data.goldAmount,
              type: 'gold',
              reason: 'Bônus de Ouro'
            }
          }));
        }
      }
    },
    onError: (error) => {
      console.error('Erro ao conceder XP:', error);
    }
  });

  return {
    awardXP: (paramsOrAmount, goldAmount = 0, reason = 'Conquista', userId, streakType) => {
      if (typeof paramsOrAmount === 'object' && paramsOrAmount !== null) {
        return awardXP.mutate(paramsOrAmount);
      }
      return awardXP.mutate({
        amount: paramsOrAmount,
        goldAmount,
        reason,
        userId,
        streakType
      });
    },
    isAwarding: awardXP.isPending
  };
}