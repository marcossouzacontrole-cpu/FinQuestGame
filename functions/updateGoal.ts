import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goal_id, current_amount, name, target_amount, target_date } = await req.json();

    if (!goal_id) {
      return Response.json({ error: 'goal_id é obrigatório' }, { status: 400 });
    }

    const updateData = {};
    if (current_amount !== undefined) updateData.current_amount = parseFloat(current_amount);
    if (name) updateData.name = name;
    if (target_amount) updateData.target_amount = parseFloat(target_amount);
    if (target_date) updateData.target_date = target_date;

    // Se atingiu meta, marcar como completa
    if (current_amount !== undefined && target_amount) {
      if (parseFloat(current_amount) >= parseFloat(target_amount)) {
        updateData.status = 'completed';
        updateData.completed_date = new Date().toISOString().split('T')[0];
      }
    }

    const updatedGoal = await base44.asServiceRole.entities.Goal.update(goal_id, updateData);

    return Response.json({
      success: true,
      goal: updatedGoal
    });

  } catch (error) {
    console.error('Erro ao atualizar meta:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});