import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const achievements = await base44.entities.Achievement.filter({
      created_by: user.email
    });

    const unlocked = achievements.filter(a => a.unlocked);
    const locked = achievements.filter(a => !a.unlocked);

    const report = {
      summary: {
        totalAchievements: achievements.length,
        unlockedAchievements: unlocked.length,
        lockedAchievements: locked.length,
        completionRate: achievements.length > 0 ? ((unlocked.length / achievements.length) * 100).toFixed(1) : 0
      },
      unlockedByRarity: {
        common: unlocked.filter(a => a.rarity === 'common').length,
        rare: unlocked.filter(a => a.rarity === 'rare').length,
        epic: unlocked.filter(a => a.rarity === 'epic').length,
        legendary: unlocked.filter(a => a.rarity === 'legendary').length
      },
      recentUnlocked: unlocked.sort((a, b) => new Date(b.unlocked_date) - new Date(a.unlocked_date)).slice(0, 5).map(a => ({
        title: a.title,
        rarity: a.rarity,
        icon: a.icon,
        unlockedAt: a.unlocked_date
      })),
      nextToUnlock: locked.slice(0, 3).map(a => ({
        title: a.title,
        description: a.description,
        rarity: a.rarity,
        icon: a.icon
      }))
    };

    return Response.json({ success: true, data: report });
  } catch (error) {
    console.error('Get achievements report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});