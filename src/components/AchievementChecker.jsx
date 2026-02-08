import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import LevelUpCelebration from './LevelUpCelebration';
import { playSound } from './SoundManager';

export default function AchievementChecker({ user }) {
  const queryClient = useQueryClient();
  const [levelUpData, setLevelUpData] = useState(null);
  const [previousLevel, setPreviousLevel] = useState(user?.level || 0);

  // Fetch achievement definitions
  const { data: achievementDefs = [] } = useQuery({
    queryKey: ['achievementDefinitions'],
    queryFn: () => base44.entities.AchievementDefinition.list()
  });

  // Fetch user achievements
  const { data: userAchievements = [] } = useQuery({
    queryKey: ['userAchievements'],
    queryFn: () => base44.entities.UserAchievement.list(),
    enabled: !!user
  });

  // Fetch missions for count
  const { data: missions = [] } = useQuery({
    queryKey: ['allMissions'],
    queryFn: () => base44.entities.Mission.filter({ status: 'completed' })
  });

  // Fetch goals for count
  const { data: goals = [] } = useQuery({
    queryKey: ['allGoals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'completed' })
  });

  // Unlock achievement mutation
  const unlockAchievement = useMutation({
    mutationFn: async ({ achievement, currentProgress }) => {
      // Create or update user achievement
      const existing = userAchievements.find(ua => ua.achievement_id === achievement.id);
      
      if (existing && !existing.unlocked) {
        await base44.entities.UserAchievement.update(existing.id, {
          unlocked: true,
          unlocked_date: new Date().toISOString(),
          progress: currentProgress
        });
      } else if (!existing) {
        await base44.entities.UserAchievement.create({
          achievement_id: achievement.id,
          unlocked: true,
          unlocked_date: new Date().toISOString(),
          progress: currentProgress
        });
      }

      // Give rewards
      if (achievement.gold_reward || achievement.xp_reward) {
        const newGold = (user.gold_coins || 0) + (achievement.gold_reward || 0);
        const newXP = (user.xp || 0) + (achievement.xp_reward || 0);
        const newTotalXP = (user.total_xp || 0) + (achievement.xp_reward || 0);

        await base44.entities.User.update(user.id, {
          gold_coins: newGold,
          xp: newXP,
          total_xp: newTotalXP
        });
      }

      return achievement;
    },
    onSuccess: (achievement) => {
      queryClient.invalidateQueries(['userAchievements']);
      queryClient.invalidateQueries(['currentUserProfile']);
      
      playSound('success');
      
      toast.success('🏆 Conquista Desbloqueada!', {
        description: `${achievement.title} - ${achievement.description}`,
        duration: 5000
      });
    }
  });

  // Check achievements
  useEffect(() => {
    if (!user || !achievementDefs.length) return;

    achievementDefs.forEach(achievement => {
      const userAch = userAchievements.find(ua => ua.achievement_id === achievement.id);
      if (userAch?.unlocked) return; // Already unlocked

      let currentProgress = 0;
      let shouldUnlock = false;

      switch (achievement.trigger_type) {
        case 'missions_count':
          currentProgress = missions.length;
          shouldUnlock = currentProgress >= achievement.trigger_value;
          break;
        case 'goals_count':
          currentProgress = goals.length;
          shouldUnlock = currentProgress >= achievement.trigger_value;
          break;
        case 'level':
          currentProgress = user.level || 0;
          shouldUnlock = currentProgress >= achievement.trigger_value;
          break;
        case 'xp':
          currentProgress = user.total_xp || 0;
          shouldUnlock = currentProgress >= achievement.trigger_value;
          break;
        case 'gold_coins':
          currentProgress = user.gold_coins || 0;
          shouldUnlock = currentProgress >= achievement.trigger_value;
          break;
        case 'streak':
          currentProgress = user.login_streak || 0;
          shouldUnlock = currentProgress >= achievement.trigger_value;
          break;
        default:
          break;
      }

      if (shouldUnlock) {
        unlockAchievement.mutate({ achievement, currentProgress });
      }
    });
  }, [user, achievementDefs, userAchievements, missions, goals]);

  // Detectar level up
  useEffect(() => {
    if (!user) return;

    const currentLevel = user.level || 0;
    
    if (currentLevel > previousLevel && previousLevel > 0) {
      // Level up detectado!
      const skillPoints = Math.floor(currentLevel / 5);
      const goldCoins = currentLevel * 10;
      
      setLevelUpData({
        newLevel: currentLevel,
        rewards: {
          skillPoints,
          goldCoins,
          unlockedFeature: currentLevel % 10 === 0 ? `Nova Tier de Missões Desbloqueada!` : null
        }
      });
    }
    
    setPreviousLevel(currentLevel);
  }, [user?.level]);

  return (
    <>
      <LevelUpCelebration
        isOpen={!!levelUpData}
        onClose={() => setLevelUpData(null)}
        newLevel={levelUpData?.newLevel}
        rewards={levelUpData?.rewards}
      />
    </>
  );
}