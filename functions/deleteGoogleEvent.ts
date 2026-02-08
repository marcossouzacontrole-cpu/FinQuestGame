import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { googleEventId } = payload;

    if (!googleEventId) {
      return Response.json({ error: 'googleEventId required' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }

    return Response.json({
      success: true,
      message: 'Evento removido do Google Calendar'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});