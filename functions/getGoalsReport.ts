import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goals = await base44.entities.Goal.filter({
      created_by: user.email
    });

    const active = goals.filter(g => g.status === 'forging');
    const completed = goals.filter(g => g.status === 'completed');

    const report = {
      summary: {
        totalGoals: goals.length,
        activeGoals: active.length,
        completedGoals: completed.length,
        totalSaved: goals.reduce((sum, g) => sum + (g.current_amount || 0), 0),
        totalTarget: goals.reduce((sum, g) => sum + (g.target_amount || 0), 0)
      },
      activeGoals: active.map(g => {
        const progress = g.target_amount > 0 ? ((g.current_amount / g.target_amount) * 100).toFixed(1) : 0;
        const remaining = g.target_amount - g.current_amount;
        return {
          name: g.name,
          saved: g.current_amount,
          target: g.target_amount,
          progress: progress,
          remaining: remaining,
          targetDate: g.target_date,
          icon: g.icon
        };
      }),
      completedGoals: completed.map(g => ({
        name: g.name,
        amount: g.current_amount,
        completedAt: g.completed_date,
        icon: g.icon
      })).slice(0, 5)
    };

    return Response.json({ success: true, data: report });
  } catch (error) {
    console.error('Get goals report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});