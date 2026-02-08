import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseISO, isWithinInterval, format } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { start_date, end_date, limit = 5 } = await req.json();

    if (!start_date || !end_date) {
      return Response.json({ error: 'start_date e end_date são obrigatórios' }, { status: 400 });
    }

    const allTransactions = await base44.asServiceRole.entities.FinTransaction.filter({
      created_by: user.email
    });

    const startDateObj = parseISO(start_date);
    const endDateObj = parseISO(end_date);

    const expenses = allTransactions.filter(trans => {
      if (!trans.date || trans.type !== 'expense') return false;
      
      const transDate = parseISO(trans.date);
      return isWithinInterval(transDate, { start: startDateObj, end: endDateObj });
    });

    // Ordenar por valor (maior primeiro)
    const sortedExpenses = expenses
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, limit);

    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.value || 0), 0);

    return Response.json({
      success: true,
      top_expenses: sortedExpenses.map((exp, index) => ({
        rank: index + 1,
        description: exp.description,
        value: Math.abs(exp.value),
        date: exp.date,
        category: exp.category,
        percent_of_total: totalExpenses > 0 ? ((Math.abs(exp.value) / totalExpenses) * 100).toFixed(1) : 0
      })),
      total_expenses: totalExpenses,
      period: { start_date, end_date }
    });

  } catch (error) {
    console.error('Erro ao buscar top gastos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});