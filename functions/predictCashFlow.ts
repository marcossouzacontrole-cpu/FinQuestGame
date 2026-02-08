import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseISO, subDays, addDays, format } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { days_ahead = 30 } = await req.json();

    const [accounts, transactions, schedules] = await Promise.all([
      base44.asServiceRole.entities.Account.filter({ created_by: user.email }),
      base44.asServiceRole.entities.FinTransaction.filter({ created_by: user.email }),
      base44.asServiceRole.entities.ScheduledTransaction.filter({ created_by: user.email, status: 'active' })
    ]);

    // Saldo atual
    const currentBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // Calcular gasto médio diário dos últimos 30 dias
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentExpenses = transactions.filter(t => {
      if (t.type !== 'expense' || !t.date) return false;
      const transDate = parseISO(t.date);
      return transDate >= thirtyDaysAgo;
    });

    const dailyAverage = recentExpenses.length > 0
      ? recentExpenses.reduce((sum, t) => sum + Math.abs(t.value || 0), 0) / 30
      : 0;

    // Projetar próximos dias
    const today = new Date();
    const projection = [];
    let projectedBalance = currentBalance;

    for (let i = 0; i < days_ahead; i++) {
      const date = addDays(today, i);
      
      // Aplicar gasto médio diário
      projectedBalance -= dailyAverage;

      // Aplicar agendamentos para este dia
      const scheduledForDay = schedules.filter(s => {
        if (!s.next_date) return false;
        const scheduleDate = parseISO(s.next_date);
        return format(scheduleDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      });

      scheduledForDay.forEach(s => {
        if (s.type === 'income') {
          projectedBalance += Math.abs(s.value || 0);
        } else {
          projectedBalance -= Math.abs(s.value || 0);
        }
      });

      projection.push({
        date: format(date, 'yyyy-MM-dd'),
        balance: Math.round(projectedBalance * 100) / 100,
        is_negative: projectedBalance < 0
      });
    }

    const minBalance = Math.min(...projection.map(p => p.balance));
    const criticalDays = projection.filter(p => p.is_negative).length;

    return Response.json({
      success: true,
      current_balance: currentBalance,
      daily_average_expense: dailyAverage,
      projection_days: days_ahead,
      min_balance: minBalance,
      critical_days: criticalDays,
      will_go_negative: minBalance < 0,
      first_negative_date: projection.find(p => p.is_negative)?.date || null
    });

  } catch (error) {
    console.error('Erro ao prever saldo:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});