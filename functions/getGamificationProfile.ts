import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let profiles = await base44.entities.User.filter({ email: user.email });
    const profile = profiles && profiles.length > 0 ? profiles[0] : null;

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    const gamification = profile.gamification || {
      totalPoints: 0,
      level: 1,
      xp: 0,
      xpToNextLevel: 1000,
      achievements: [],
      streak: 0
    };

    const progressPercentage = Math.floor((gamification.xp / gamification.xpToNextLevel) * 100);

    return Response.json({
      success: true,
      profile: {
        ...gamification,
        progressPercentage,
        nextLevelPoints: gamification.xpToNextLevel - gamification.xp
      }
    });
  } catch (error) {
    console.error('Get gamification profile error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});