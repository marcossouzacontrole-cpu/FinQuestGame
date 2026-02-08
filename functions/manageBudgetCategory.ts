import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, category_id, category_data } = await req.json();

    if (!action) {
      return Response.json({ error: 'action é obrigatório (create/update/delete)' }, { status: 400 });
    }

    let result;

    if (action === 'create') {
      if (!category_data?.name || !category_data?.budget) {
        return Response.json({ error: 'name e budget são obrigatórios' }, { status: 400 });
      }

      result = await base44.asServiceRole.entities.BudgetCategory.create({
        name: category_data.name,
        budget: parseFloat(category_data.budget),
        color: category_data.color || '#FF00FF',
        icon: category_data.icon || '💀',
        category_type: category_data.category_type || 'expense',
        frequency: category_data.frequency || 'monthly'
      });

      return Response.json({ success: true, category: result, action: 'created' });

    } else if (action === 'update') {
      if (!category_id) {
        return Response.json({ error: 'category_id é obrigatório para update' }, { status: 400 });
      }

      const updateData = {};
      if (category_data.name) updateData.name = category_data.name;
      if (category_data.budget) updateData.budget = parseFloat(category_data.budget);
      if (category_data.color) updateData.color = category_data.color;
      if (category_data.icon) updateData.icon = category_data.icon;

      result = await base44.asServiceRole.entities.BudgetCategory.update(category_id, updateData);

      return Response.json({ success: true, category: result, action: 'updated' });

    } else if (action === 'delete') {
      if (!category_id) {
        return Response.json({ error: 'category_id é obrigatório para delete' }, { status: 400 });
      }

      await base44.asServiceRole.entities.BudgetCategory.delete(category_id);

      return Response.json({ success: true, action: 'deleted' });

    } else {
      return Response.json({ error: 'action inválido. Use: create, update ou delete' }, { status: 400 });
    }

  } catch (error) {
    console.error('Erro ao gerenciar categoria:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});