import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { limit = 10, type = 'points' } = payload;

    // Fetch all users
    const allUsers = await base44.entities.User.list();

    // Build leaderboard data
    const leaderboardData = allUsers
      .filter(u => u.gamification) // Only users with gamification
      .map(u => ({
        name: u.full_name,
        email: u.email,
        points: u.gamification.totalPoints || 0,
        level: u.gamification.level || 1,
        achievements: (u.gamification.achievements || []).length,
        streak: u.gamification.streak || 0
      }))
      .sort((a, b) => {
        if (type === 'level') {
          return b.level - a.level || b.points - a.points;
        } else if (type === 'achievements') {
          return b.achievements - a.achievements;
        }
        return b.points - a.points; // default: points
      })
      .slice(0, limit);

    // Find user's position
    const userPosition = leaderboardData.findIndex(u => u.email === user.email) + 1;

    return Response.json({
      success: true,
      leaderboard: leaderboardData,
      userRank: userPosition || 'Fora do top',
      type
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});