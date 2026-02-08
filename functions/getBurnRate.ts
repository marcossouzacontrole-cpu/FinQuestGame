import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseISO, subDays, differenceInDays } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { days_analysis = 30 } = await req.json();

    const [accounts, transactions] = await Promise.all([
      base44.asServiceRole.entities.Account.filter({ created_by: user.email }),
      base44.asServiceRole.entities.FinTransaction.filter({ created_by: user.email })
    ]);

    const currentBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    
    const analysisStartDate = subDays(new Date(), days_analysis);
    const recentExpenses = transactions.filter(t => {
      if (t.type !== 'expense' || !t.date) return false;
      const transDate = parseISO(t.date);
      return transDate >= analysisStartDate;
    });

    const totalSpent = recentExpenses.reduce((sum, t) => sum + Math.abs(t.value || 0), 0);
    const dailyBurnRate = totalSpent / days_analysis;
    const monthlyBurnRate = dailyBurnRate * 30;

    // Runway: quantos dias até saldo zero
    const runway = currentBalance > 0 ? Math.floor(currentBalance / dailyBurnRate) : 0;

    return Response.json({
      success: true,
      daily_burn_rate: dailyBurnRate,
      monthly_burn_rate: monthlyBurnRate,
      current_balance: currentBalance,
      runway_days: runway,
      will_survive_month: runway >= 30,
      analysis_period_days: days_analysis,
      total_spent_in_period: totalSpent
    });

  } catch (error) {
    console.error('Erro ao calcular burn rate:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});