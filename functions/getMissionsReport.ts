import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const missions = await base44.entities.Mission.filter({
      created_by: user.email
    });

    const active = missions.filter(m => m.status === 'active');
    const completed = missions.filter(m => m.status === 'completed');
    const totalXp = missions.filter(m => m.status === 'completed').reduce((sum, m) => sum + (m.xp_reward || 0), 0);

    const report = {
      summary: {
        totalMissions: missions.length,
        activeMissions: active.length,
        completedMissions: completed.length,
        totalXpEarned: totalXp,
        completionRate: missions.length > 0 ? ((completed.length / missions.length) * 100).toFixed(1) : 0
      },
      activeMissions: active.map(m => ({
        title: m.title,
        xp: m.xp_reward,
        difficulty: m.difficulty,
        progress: m.current_progress,
        target: m.target_value
      })).slice(0, 5),
      recentCompleted: completed.sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date)).slice(0, 5).map(m => ({
        title: m.title,
        xp: m.xp_reward,
        completedAt: m.completed_date
      }))
    };

    return Response.json({ success: true, data: report });
  } catch (error) {
    console.error('Get missions report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});