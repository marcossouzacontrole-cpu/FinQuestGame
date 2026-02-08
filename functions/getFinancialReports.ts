import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval, format } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { period } = await req.json();
    // period pode ser: 'current_month', 'last_month', ou { start_date, end_date }

    let startDate, endDate;

    if (period === 'current_month') {
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
    } else if (period === 'last_month') {
      const lastMonth = subMonths(new Date(), 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
    } else if (period?.start_date && period?.end_date) {
      startDate = parseISO(period.start_date);
      endDate = parseISO(period.end_date);
    } else {
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
    }

    // Buscar todas as transações do usuário
    const allTransactions = await base44.asServiceRole.entities.FinTransaction.filter({
      created_by: user.email
    });

    // Filtrar transações no período
    const transactions = allTransactions.filter(trans => {
      if (!trans.date) return false;
      const transDate = parseISO(trans.date);
      return isWithinInterval(transDate, { start: startDate, end: endDate });
    });

    // Calcular DRE
    const revenue = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (t.value || 0), 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.value || 0), 0);

    const result = revenue - expenses;

    // Buscar dados patrimoniais
    const [assets, debts, accounts] = await Promise.all([
      base44.asServiceRole.entities.Asset.filter({ created_by: user.email }),
      base44.asServiceRole.entities.Debt.filter({ created_by: user.email }),
      base44.asServiceRole.entities.Account.filter({ created_by: user.email })
    ]);

    const totalAssets = (assets || []).reduce((sum, a) => sum + (a.value || 0), 0);
    const totalDebts = (debts || []).reduce((sum, d) => sum + (d.outstanding_balance || 0), 0);
    const accountsBalance = (accounts || []).reduce((sum, acc) => sum + (acc.balance || 0), 0);

    const netWorth = totalAssets - totalDebts;

    // Calcular Power Score simplificado
    const savingsRate = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0;
    const powerScore = Math.max(0, Math.min(100, Math.round(
      (savingsRate * 0.4) + 
      (netWorth > 0 ? 30 : 0) +
      (result > 0 ? 30 : 0)
    )));

    return Response.json({
      success: true,
      period: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
        label: period === 'current_month' ? 'Mês Atual' : period === 'last_month' ? 'Mês Anterior' : 'Período Personalizado'
      },
      dre: {
        revenue,
        expenses,
        result,
        efficiency: revenue > 0 ? ((result / revenue) * 100).toFixed(1) : 0
      },
      balance_sheet: {
        assets: totalAssets,
        debts: totalDebts,
        net_worth: netWorth,
        liquid_balance: accountsBalance
      },
      metrics: {
        power_score: powerScore,
        savings_rate: savingsRate.toFixed(1),
        transaction_count: transactions.length
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return Response.json({ 
      error: 'Erro ao gerar relatório financeiro',
      details: error.message 
    }, { status: 500 });
  }
});