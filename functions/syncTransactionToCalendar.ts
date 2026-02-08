import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Sincroniza transação agendada para o Google Calendar
 * Trigger: Criação ou atualização de ScheduledTransaction
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transaction } = await req.json();

    if (!transaction || transaction.status === 'cancelled') {
      return Response.json({ success: true, message: 'Skipped' });
    }

    // Obter token do Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Buscar categoria para emoji
    const categories = await base44.entities.BudgetCategory.filter({
      name: transaction.category
    });
    const category = categories[0];
    const emoji = category?.icon || (transaction.type === 'expense' ? '💸' : '💰');

    // Montar evento do Calendar
    const event = {
      summary: `${emoji} ${transaction.description}`,
      description: `Valor: R$ ${transaction.value.toFixed(2)}\nTipo: ${transaction.type === 'expense' ? 'Despesa' : 'Receita'}\nCategoria: ${transaction.category}\n\n🔗 Editar no FinQuest: ${Deno.env.get('BASE44_APP_URL')}/scheduled-transactions`,
      start: {
        date: transaction.scheduled_date,
        timeZone: 'America/Sao_Paulo'
      },
      end: {
        date: transaction.scheduled_date,
        timeZone: 'America/Sao_Paulo'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 }, // 24h antes
          { method: 'email', minutes: 60 }        // 1h antes
        ]
      },
      colorId: transaction.type === 'expense' ? '11' : '10' // Vermelho: 11, Verde: 10
    };

    let eventId = transaction.google_event_id;

    // Atualizar ou criar evento
    if (eventId) {
      // Atualizar evento existente
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update Calendar event: ${await response.text()}`);
      }
    } else {
      // Criar novo evento
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create Calendar event: ${await response.text()}`);
      }

      const createdEvent = await response.json();
      eventId = createdEvent.id;

      // Atualizar transação com o ID do evento
      await base44.entities.ScheduledTransaction.update(transaction.id, {
        google_event_id: eventId,
        sync_status: 'synced',
        last_sync_at: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      event_id: eventId,
      message: 'Evento sincronizado com Google Calendar'
    });

  } catch (error) {
    console.error('Error syncing to calendar:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});