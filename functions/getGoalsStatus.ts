import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goals = await base44.asServiceRole.entities.Goal.filter({
      created_by: user.email
    });

    const goalsWithProgress = goals.map(goal => {
      const progress = goal.target_amount > 0 
        ? ((goal.current_amount || 0) / goal.target_amount) * 100 
        : 0;
      
      const remaining = goal.target_amount - (goal.current_amount || 0);

      return {
        id: goal.id,
        name: goal.name,
        legendary_item: goal.legendary_item,
        target: goal.target_amount,
        current: goal.current_amount || 0,
        remaining,
        progress: progress.toFixed(1),
        status: goal.status,
        target_date: goal.target_date,
        icon: goal.icon || '🗡️'
      };
    });

    const activeGoals = goalsWithProgress.filter(g => g.status === 'forging');
    const completedGoals = goalsWithProgress.filter(g => g.status === 'completed');

    return Response.json({
      success: true,
      active_goals: activeGoals,
      completed_goals: completedGoals,
      total_goals: goals.length,
      total_target: activeGoals.reduce((sum, g) => sum + g.target, 0),
      total_saved: activeGoals.reduce((sum, g) => sum + g.current, 0)
    });

  } catch (error) {
    console.error('Erro ao buscar metas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});