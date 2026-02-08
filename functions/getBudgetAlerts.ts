import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseISO, isWithinInterval } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { start_date, end_date } = await req.json();

    if (!start_date || !end_date) {
      return Response.json({ error: 'start_date e end_date são obrigatórios' }, { status: 400 });
    }

    const [categories, transactions] = await Promise.all([
      base44.asServiceRole.entities.BudgetCategory.filter({ created_by: user.email }),
      base44.asServiceRole.entities.FinTransaction.filter({ created_by: user.email })
    ]);

    const startDateObj = parseISO(start_date);
    const endDateObj = parseISO(end_date);

    const filteredTransactions = transactions.filter(trans => {
      if (!trans.date) return false;
      const transDate = parseISO(trans.date);
      return isWithinInterval(transDate, { start: startDateObj, end: endDateObj });
    });

    const alerts = [];
    const criticalCategories = [];
    const warningCategories = [];

    categories.forEach(cat => {
      if (cat.category_type !== 'expense' || !cat.budget || cat.budget <= 0) return;

      const spent = filteredTransactions
        .filter(t => t.category === cat.name && t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.value || 0), 0);

      const percent = (spent / cat.budget) * 100;
      const remaining = cat.budget - spent;

      if (percent >= 100) {
        criticalCategories.push({
          category: cat.name,
          icon: cat.icon || '💀',
          budget: cat.budget,
          spent,
          remaining,
          percent: percent.toFixed(0),
          overspent: spent - cat.budget
        });
      } else if (percent >= 80) {
        warningCategories.push({
          category: cat.name,
          icon: cat.icon || '⚠️',
          budget: cat.budget,
          spent,
          remaining,
          percent: percent.toFixed(0)
        });
      }
    });

    return Response.json({
      success: true,
      critical: criticalCategories,
      warnings: warningCategories,
      total_alerts: criticalCategories.length + warningCategories.length
    });

  } catch (error) {
    console.error('Erro ao buscar alertas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});