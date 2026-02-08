import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current month dates
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const currentDay = now.getDate();
    const daysRemaining = daysInMonth - currentDay;

    // Get all transactions for current month
    const transactions = await base44.asServiceRole.entities.FinTransaction.filter({
      created_by: user.email
    });

    const monthTransactions = transactions.filter(t => {
      const transDate = new Date(t.date);
      return transDate >= firstDay && transDate <= lastDay;
    });

    // Calculate income for the month
    const confirmedIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.value), 0);

    // Get budget categories
    const categories = await base44.asServiceRole.entities.BudgetCategory.filter({
      created_by: user.email
    });

    // Calculate fixed costs
    const fixedCosts = categories
      .filter(c => c.expense_type === 'fixed')
      .reduce((sum, c) => sum + (c.budget || 0), 0);

    // Calculate variable costs spent so far
    const variableSpent = monthTransactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        const cat = categories.find(c => c.name === t.category);
        return cat && cat.expense_type === 'variable';
      })
      .reduce((sum, t) => sum + Math.abs(t.value), 0);

    // Get savings goal (assume 20% if not set)
    const financialProfile = await base44.asServiceRole.entities.FinancialProfile.filter({
      created_by: user.email
    });
    const savingsRate = financialProfile[0]?.savings_percentage || 20;
    const savingsGoal = confirmedIncome * (savingsRate / 100);

    // Calculate safe to spend per day
    const available = confirmedIncome - fixedCosts - savingsGoal - variableSpent;
    const safeToSpend = daysRemaining > 0 ? available / daysRemaining : 0;

    return Response.json({
      safeToSpend: Math.max(safeToSpend, 0),
      daysRemaining,
      breakdown: {
        income: confirmedIncome,
        fixedCosts,
        savingsGoal,
        variableSpent,
        available
      }
    });

  } catch (error) {
    console.error('Error calculating safe to spend:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});