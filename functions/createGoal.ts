import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, legendary_item, target_amount, target_date, icon } = await req.json();

    if (!name || !target_amount) {
      return Response.json({ error: 'name e target_amount são obrigatórios' }, { status: 400 });
    }

    const newGoal = await base44.asServiceRole.entities.Goal.create({
      name,
      legendary_item: legendary_item || `${name} Lendário`,
      target_amount: parseFloat(target_amount),
      current_amount: 0,
      target_date,
      status: 'forging',
      icon: icon || '🗡️'
    });

    return Response.json({
      success: true,
      goal: newGoal
    });

  } catch (error) {
    console.error('Erro ao criar meta:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});