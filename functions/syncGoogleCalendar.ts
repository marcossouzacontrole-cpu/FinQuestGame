import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
    const payload = await req.json();
    const { action } = payload;

    if (action === 'sync') {
      // Fetch all scheduled transactions
      const scheduledTransactions = await base44.entities.ScheduledTransaction.filter({
        created_by: user.email
      });

      // Fetch Google Calendar events
      const calendarRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const calendarData = await calendarRes.json();
      const googleEvents = calendarData.items || [];

      // Find deleted transactions (in FinQuest but not in Google)
      const deletedInFinQuest = googleEvents.filter(event => {
        const finquestEvent = scheduledTransactions.find(t => t.google_event_id === event.id);
        return !finquestEvent && event.description?.includes('[FinQuest]');
      });

      // Delete from Google Calendar
      for (const event of deletedInFinQuest) {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
      }

      // Find deleted events (in Google but not in FinQuest)
      const deletedInGoogle = scheduledTransactions.filter(t => {
        if (!t.google_event_id) return false;
        const googleEvent = googleEvents.find(e => e.id === t.google_event_id);
        return !googleEvent;
      });

      // Delete from FinQuest
      for (const transaction of deletedInGoogle) {
        await base44.entities.ScheduledTransaction.delete(transaction.id);
      }

      return Response.json({
        success: true,
        deletedFromGoogle: deletedInFinQuest.length,
        deletedFromFinQuest: deletedInGoogle.length,
        message: `Sincronização concluída. ${deletedInFinQuest.length} eventos removidos do Google, ${deletedInGoogle.length} do FinQuest.`
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});