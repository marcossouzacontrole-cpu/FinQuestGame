import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseISO, isBefore, addDays, format } from 'npm:date-fns';

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
      status: 'active',
      type: 'expense'
    });

    const today = new Date();
    const futureDate = addDays(today, days_ahead);

    const overdue = [];
    const upcoming = [];

    schedules.forEach(schedule => {
      if (!schedule.next_date) return;
      
      const scheduleDate = parseISO(schedule.next_date);
      
      if (isBefore(scheduleDate, today)) {
        overdue.push({
          id: schedule.id,
          description: schedule.description,
          value: Math.abs(schedule.value || 0),
          due_date: schedule.next_date,
          days_overdue: Math.floor((today - scheduleDate) / (1000 * 60 * 60 * 24)),
          category: schedule.category
        });
      } else if (isBefore(scheduleDate, futureDate)) {
        upcoming.push({
          id: schedule.id,
          description: schedule.description,
          value: Math.abs(schedule.value || 0),
          due_date: schedule.next_date,
          days_until: Math.floor((scheduleDate - today) / (1000 * 60 * 60 * 24)),
          category: schedule.category
        });
      }
    });

    const totalOverdue = overdue.reduce((sum, d) => sum + d.value, 0);
    const totalUpcoming = upcoming.reduce((sum, d) => sum + d.value, 0);

    return Response.json({
      success: true,
      overdue: overdue.sort((a, b) => b.days_overdue - a.days_overdue),
      upcoming: upcoming.sort((a, b) => a.days_until - b.days_until),
      total_overdue: totalOverdue,
      total_upcoming: totalUpcoming,
      total_count: overdue.length + upcoming.length
    });

  } catch (error) {
    console.error('Erro ao buscar contas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});