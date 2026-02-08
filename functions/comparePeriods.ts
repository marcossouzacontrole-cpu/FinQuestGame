import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseISO, isWithinInterval } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { period1_start, period1_end, period2_start, period2_end } = await req.json();

    if (!period1_start || !period1_end || !period2_start || !period2_end) {
      return Response.json({ error: 'Todos os períodos são obrigatórios' }, { status: 400 });
    }

    const allTransactions = await base44.asServiceRole.entities.FinTransaction.filter({
      created_by: user.email
    });

    const filterByPeriod = (start, end) => {
      const startDate = parseISO(start);
      const endDate = parseISO(end);

      const filtered = allTransactions.filter(trans => {
        if (!trans.date) return false;
        const transDate = parseISO(trans.date);
        const isInPeriod = isWithinInterval(transDate, { start: startDate, end: endDate });
        
        const isInternalTransfer = 
          trans.category?.toLowerCase().includes('resgate') ||
          trans.category?.toLowerCase().includes('transferência') ||
          trans.category?.toLowerCase().includes('transferencia');
        
        return isInPeriod && !isInternalTransfer;
      });

      const revenue = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.value || 0), 0);
      const expenses = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.value || 0), 0);
      
      return { revenue, expenses, result: revenue - expenses };
    };

    const period1 = filterByPeriod(period1_start, period1_end);
    const period2 = filterByPeriod(period2_start, period2_end);

    const revenueDiff = period2.revenue - period1.revenue;
    const expensesDiff = period2.expenses - period1.expenses;
    const resultDiff = period2.result - period1.result;

    return Response.json({
      success: true,
      period1: { start: period1_start, end: period1_end, ...period1 },
      period2: { start: period2_start, end: period2_end, ...period2 },
      comparison: {
        revenue_change: revenueDiff,
        revenue_percent: period1.revenue > 0 ? (revenueDiff / period1.revenue) * 100 : 0,
        expenses_change: expensesDiff,
        expenses_percent: period1.expenses > 0 ? (expensesDiff / period1.expenses) * 100 : 0,
        result_change: resultDiff,
        improved: resultDiff > 0
      }
    });

  } catch (error) {
    console.error('Erro ao comparar períodos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});