import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { actionType, points = 0, achievement = null } = payload;

    // Get or create user's gamification profile
    let profiles = await base44.entities.User.filter({ email: user.email });
    const profile = profiles && profiles.length > 0 ? profiles[0] : null;

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Initialize gamification data if not exists
    const gamification = profile.gamification || {
      totalPoints: 0,
      level: 1,
      xp: 0,
      xpToNextLevel: 1000,
      achievements: [],
      streak: 0,
      lastActionDate: null
    };

    // Points mapping for actions
    const pointsMap = {
      'transaction_created': 10,
      'schedule_created': 15,
      'goal_created': 50,
      'goal_deposit': points || 20,
      'academy_completed': 50,
      'mission_completed': points || 25,
      'first_balance_check': 5,
      'first_dre_view': 5,
      'first_balanço_view': 5,
      'streak_7_days': 100,
      'streak_30_days': 500,
      'boss_defeated': points || 150,
      'quest_completed': 30,
      'insight_viewed': 10,
      'custom': points || 0
    };

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    if (gamification.lastActionDate === today) {
      // Already acted today, don't increment streak
    } else if (gamification.lastActionDate) {
      const lastDate = new Date(gamification.lastActionDate);
      const todayDate = new Date(today);
      const daysDiff = (todayDate - lastDate) / (1000 * 60 * 60 * 24);

      if (daysDiff === 1) {
        gamification.streak += 1;
        // Check for streak milestones
        if (gamification.streak === 7) {
          gamification.achievements.push('streak_7');
        }
        if (gamification.streak === 30) {
          gamification.achievements.push('streak_30');
        }
      } else {
        gamification.streak = 1;
      }
    } else {
      gamification.streak = 1;
    }

    gamification.lastActionDate = today;

    // Apply streak multiplier to XP rewards
    const multiplier =
      gamification.streak >= 30 ? 1.5 :
        gamification.streak >= 7 ? 1.25 :
          gamification.streak >= 3 ? 1.1 : 1.0;

    const actionPoints = Math.floor((pointsMap[actionType] || 0) * multiplier);
    gamification.totalPoints += actionPoints;
    gamification.xp += actionPoints;

    // Level up logic
    while (gamification.xp >= gamification.xpToNextLevel) {
      gamification.xp -= gamification.xpToNextLevel;
      gamification.level += 1;
      gamification.xpToNextLevel = Math.floor(gamification.xpToNextLevel * 1.15);
    }

    // Attribute Evolution (Skill Directive D)
    const attributes = profile.attributes || {
      financial_intelligence: 0,
      discipline: 0,
      power: 0
    };

    if (actionType === 'academy_completed') {
      attributes.financial_intelligence += 1;
    }
    if (gamification.streak > 1 || actionType === 'goal_deposit') {
      attributes.discipline += 1;
    }
    if (actionType === 'boss_defeated' || actionType === 'transaction_created') {
      attributes.power += 1;
    }

    // Update user
    await base44.auth.updateMe({
      gamification,
      attributes
    });

    return Response.json({
      success: true,
      points: actionPoints,
      totalPoints: gamification.totalPoints,
      level: gamification.level,
      xp: gamification.xp,
      xpToNextLevel: gamification.xpToNextLevel,
      levelUp: actionPoints > 0 && gamification.xp < actionPoints + 10,
      achievement: achievement || null,
      streak: gamification.streak
    });
  } catch (error) {
    console.error('Add points error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});