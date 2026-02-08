import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseISO, isWithinInterval, subMonths, startOfMonth, endOfMonth } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions = await base44.asServiceRole.entities.FinTransaction.filter({
      created_by: user.email
    });

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const analyzeMonth = (start, end) => {
      const filtered = transactions.filter(trans => {
        if (!trans.date) return false;
        const transDate = parseISO(trans.date);
        return isWithinInterval(transDate, { start, end });
      });

      const revenue = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.value || 0), 0);
      const expenses = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.value || 0), 0);
      
      return { revenue, expenses, result: revenue - expenses };
    };

    const currentMonth = analyzeMonth(currentMonthStart, currentMonthEnd);
    const lastMonth = analyzeMonth(lastMonthStart, lastMonthEnd);

    const expensesChange = currentMonth.expenses - lastMonth.expenses;
    const expensesChangePercent = lastMonth.expenses > 0 ? (expensesChange / lastMonth.expenses) * 100 : 0;

    const revenueChange = currentMonth.revenue - lastMonth.revenue;
    const revenueChangePercent = lastMonth.revenue > 0 ? (revenueChange / lastMonth.revenue) * 100 : 0;

    const resultChange = currentMonth.result - lastMonth.result;

    return Response.json({
      success: true,
      current_month: currentMonth,
      last_month: lastMonth,
      trends: {
        expenses_change: expensesChange,
        expenses_change_percent: expensesChangePercent.toFixed(1),
        expenses_trend: expensesChange > 0 ? 'increasing' : expensesChange < 0 ? 'decreasing' : 'stable',
        revenue_change: revenueChange,
        revenue_change_percent: revenueChangePercent.toFixed(1),
        revenue_trend: revenueChange > 0 ? 'increasing' : revenueChange < 0 ? 'decreasing' : 'stable',
        result_change: resultChange,
        improved: resultChange > 0
      }
    });

  } catch (error) {
    console.error('Erro ao analisar tendências:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});