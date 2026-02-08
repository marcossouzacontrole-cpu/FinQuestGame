import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { schedule_id } = await req.json();

    if (!schedule_id) {
      return Response.json({ error: 'schedule_id é obrigatório' }, { status: 400 });
    }

    const schedules = await base44.asServiceRole.entities.ScheduledTransaction.filter({
      created_by: user.email
    });

    const schedule = schedules.find(s => s.id === schedule_id);

    if (!schedule) {
      return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    // Chamar função de sync existente
    const syncResult = await base44.functions.invoke('syncTransactionToCalendar', {
      transaction_id: schedule_id,
      transaction_type: 'scheduled'
    });

    return Response.json({
      success: true,
      synced: true,
      schedule_id,
      message: 'Agendamento sincronizado com Google Calendar'
    });

  } catch (error) {
    console.error('Erro ao sincronizar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});