import { useState } from 'react';

// Hook para gerenciar compartilhamento de conquistas
export function useAchievementShare() {
  const [shareAchievement, setShareAchievement] = useState(null);

  const promptShare = (achievement) => {
    setShareAchievement(achievement);
  };

  const closeShare = () => {
    setShareAchievement(null);
  };

  return {
    shareAchievement,
    promptShare,
    closeShare
  };
}

// Helper para criar achievements estruturados
export const createAchievement = {
  levelUp: (level) => ({
    type: 'level_up',
    title: `Subiu para o Level ${level}!`,
    description: 'Mais um passo na jornada de maestria financeira!',
    icon: '⚡',
    metadata: { level }
  }),

  goalAchieved: (goalName, value) => ({
    type: 'goal_achieved',
    title: `Meta Conquistada: ${goalName}`,
    description: 'Mais uma meta alcançada com sucesso!',
    icon: '🏆',
    metadata: { goal_name: goalName, value }
  }),

  missionCompleted: (missionTitle, xpReward) => ({
    type: 'mission_completed',
    title: `Missão Completada: ${missionTitle}`,
    description: 'Mais XP e recompensas desbloqueadas!',
    icon: '🎯',
    metadata: { mission_title: missionTitle, xp: xpReward }
  }),

  streakMilestone: (days) => ({
    type: 'streak_milestone',
    title: `${days} Dias de Sequência!`,
    description: 'Consistência é a chave para o sucesso!',
    icon: '🔥',
    metadata: { streak: days }
  }),

  achievementUnlocked: (name, description, icon) => ({
    type: 'achievement_unlocked',
    title: `Conquista Desbloqueada: ${name}`,
    description,
    icon: icon || '🏅',
    metadata: { achievement_name: name }
  }),

  purchaseMade: (itemName, price, icon) => ({
    type: 'custom',
    title: `Comprou ${itemName}!`,
    description: 'Novo item adicionado ao inventário!',
    icon: icon || '🎁',
    metadata: { item_name: itemName, value: price }
  }),

  battlePassPurchase: (seasonName) => ({
    type: 'custom',
    title: `Battle Pass ${seasonName} Ativado!`,
    description: 'Acesso total às recompensas premium desbloqueado!',
    icon: '👑',
    metadata: { season: seasonName }
  }),

  premiumPurchase: () => ({
    type: 'custom',
    title: 'Membro Premium Ativado!',
    description: 'Todos os recursos premium agora disponíveis!',
    icon: '💎',
    metadata: {}
  })
};