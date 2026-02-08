import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, schedule_id, schedule_data } = await req.json();

    // LIST - Listar agendamentos
    if (action === 'list') {
      const schedules = await base44.asServiceRole.entities.ScheduledTransaction.filter({
        created_by: user.email
      }, '-scheduled_date', 50);

      return Response.json({
        success: true,
        schedules: schedules || []
      });
    }

    // CREATE - Criar agendamento
    if (action === 'create') {
      if (!schedule_data) {
        return Response.json({ error: 'schedule_data é obrigatório' }, { status: 400 });
      }

      const newSchedule = await base44.entities.ScheduledTransaction.create(schedule_data);

      return Response.json({
        success: true,
        schedule: newSchedule,
        message: 'Agendamento criado com sucesso'
      });
    }

    // UPDATE - Atualizar agendamento
    if (action === 'update') {
      if (!schedule_id || !schedule_data) {
        return Response.json({ error: 'schedule_id e schedule_data são obrigatórios' }, { status: 400 });
      }

      const updated = await base44.entities.ScheduledTransaction.update(schedule_id, schedule_data);

      return Response.json({
        success: true,
        schedule: updated,
        message: 'Agendamento atualizado'
      });
    }

    // DELETE - Excluir agendamento
    if (action === 'delete') {
      if (!schedule_id) {
        return Response.json({ error: 'schedule_id é obrigatório' }, { status: 400 });
      }

      await base44.entities.ScheduledTransaction.delete(schedule_id);

      return Response.json({
        success: true,
        message: 'Agendamento excluído'
      });
    }

    // EXECUTE - Executar agendamento manualmente
    if (action === 'execute') {
      if (!schedule_id) {
        return Response.json({ error: 'schedule_id é obrigatório' }, { status: 400 });
      }

      const schedule = await base44.asServiceRole.entities.ScheduledTransaction.filter({
        id: schedule_id,
        created_by: user.email
      });

      if (!schedule || schedule.length === 0) {
        return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
      }

      const scheduleData = schedule[0];

      // Criar transação
      await base44.entities.FinTransaction.create({
        date: new Date().toISOString().split('T')[0],
        description: scheduleData.description,
        value: scheduleData.value,
        type: scheduleData.type,
        category: scheduleData.category,
        account_id: scheduleData.account_id
      });

      // Atualizar status
      await base44.entities.ScheduledTransaction.update(schedule_id, {
        status: 'executed',
        executed_at: new Date().toISOString()
      });

      return Response.json({
        success: true,
        message: 'Agendamento executado e transação criada'
      });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('Erro ao gerenciar agendamentos:', error);
    return Response.json({ 
      error: 'Erro ao gerenciar agendamentos',
      details: error.message 
    }, { status: 500 });
  }
});