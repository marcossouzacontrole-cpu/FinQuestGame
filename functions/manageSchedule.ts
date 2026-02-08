import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, schedule_id, schedule_data } = await req.json();

    // Validar ação
    const validActions = ['list', 'create', 'update', 'delete'];
    if (!validActions.includes(action)) {
      return Response.json({ 
        error: 'Ação inválida. Use: list, create, update, delete' 
      }, { status: 400 });
    }

    // LISTAR
    if (action === 'list') {
      const schedules = await base44.asServiceRole.entities.ScheduledTransaction.filter({
        created_by: user.email
      }, '-created_date', 50);

      return Response.json({
        success: true,
        schedules: schedules.map(s => ({
          id: s.id,
          description: s.description,
          value: s.value,
          type: s.type,
          category: s.category,
          frequency: s.frequency,
          next_date: s.next_date,
          status: s.status
        }))
      });
    }

    // CRIAR
    if (action === 'create') {
      if (!schedule_data || !schedule_data.description || !schedule_data.value) {
        return Response.json({ 
          error: 'Dados incompletos. Necessário: description, value, type, category, frequency, next_date' 
        }, { status: 400 });
      }

      const newSchedule = await base44.asServiceRole.entities.ScheduledTransaction.create({
        description: schedule_data.description,
        value: schedule_data.value,
        type: schedule_data.type || 'expense',
        category: schedule_data.category,
        frequency: schedule_data.frequency || 'monthly',
        next_date: schedule_data.next_date,
        status: 'active',
        created_by: user.email
      });

      return Response.json({
        success: true,
        message: 'Agendamento criado',
        schedule: newSchedule
      });
    }

    // ATUALIZAR
    if (action === 'update') {
      if (!schedule_id) {
        return Response.json({ error: 'schedule_id é obrigatório' }, { status: 400 });
      }

      const updated = await base44.asServiceRole.entities.ScheduledTransaction.update(
        schedule_id,
        schedule_data
      );

      return Response.json({
        success: true,
        message: 'Agendamento atualizado',
        schedule: updated
      });
    }

    // EXCLUIR
    if (action === 'delete') {
      if (!schedule_id) {
        return Response.json({ error: 'schedule_id é obrigatório' }, { status: 400 });
      }

      await base44.asServiceRole.entities.ScheduledTransaction.delete(schedule_id);

      return Response.json({
        success: true,
        message: 'Agendamento excluído'
      });
    }

  } catch (error) {
    console.error('Erro ao gerenciar agendamento:', error);
    return Response.json({ 
      error: 'Erro ao processar operação',
      details: error.message 
    }, { status: 500 });
  }
});