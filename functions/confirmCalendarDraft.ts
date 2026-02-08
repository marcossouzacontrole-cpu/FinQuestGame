import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Confirma um rascunho do Calendar e cria a transação agendada
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { draft_id, category, account_id, value } = await req.json();

    if (!draft_id || !category) {
      return Response.json({ 
        error: 'draft_id e category são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar rascunho
    const draft = await base44.entities.CalendarDraft.get(draft_id);

    if (!draft || draft.status !== 'pending') {
      return Response.json({ 
        error: 'Rascunho não encontrado ou já processado' 
      }, { status: 404 });
    }

    // Criar transação agendada
    const transaction = await base44.entities.ScheduledTransaction.create({
      description: draft.event_title,
      value: value || draft.extracted_value,
      type: draft.suggested_type,
      category,
      account_id,
      scheduled_date: draft.scheduled_date,
      google_event_id: draft.google_event_id,
      sync_status: 'synced',
      status: 'pending'
    });

    // Marcar rascunho como confirmado
    await base44.entities.CalendarDraft.update(draft_id, {
      status: 'confirmed',
      category,
      account_id,
      processed_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      transaction
    });

  } catch (error) {
    console.error('Error confirming draft:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});