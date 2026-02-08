import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseISO, addDays, isBefore } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { days_ahead = 7 } = await req.json();

    const schedules = await base44.asServiceRole.entities.ScheduledTransaction.filter({
      created_by: user.email,
      status: 'active'
    });

    const today = new Date();
    const futureDate = addDays(today, days_ahead);

    const upcoming = schedules.filter(schedule => {
      if (!schedule.next_date) return false;
      const scheduleDate = parseISO(schedule.next_date);
      return isBefore(scheduleDate, futureDate) && !isBefore(scheduleDate, today);
    }).sort((a, b) => {
      const dateA = parseISO(a.next_date);
      const dateB = parseISO(b.next_date);
      return dateA - dateB;
    });

    const totalAmount = upcoming.reduce((sum, s) => sum + Math.abs(s.value || 0), 0);

    return Response.json({
      success: true,
      upcoming_schedules: upcoming.map(s => ({
        id: s.id,
        description: s.description,
        value: s.value,
        type: s.type,
        category: s.category,
        next_date: s.next_date,
        frequency: s.frequency
      })),
      total_count: upcoming.length,
      total_amount: totalAmount,
      days_range: days_ahead
    });

  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});