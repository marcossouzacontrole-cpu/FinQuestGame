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
      return Response.json({ 
        error: 'start_date e end_date são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar transações do período
    const allTransactions = await base44.asServiceRole.entities.FinTransaction.filter({
      created_by: user.email
    });

    // Filtrar por período E excluir transferências internas (igual FinancialCore)
    const startDateObj = parseISO(start_date);
    const endDateObj = parseISO(end_date);

    const filteredTransactions = allTransactions.filter(trans => {
      if (!trans.date) return false;
      
      const transDate = parseISO(trans.date);
      const isInPeriod = isWithinInterval(transDate, { 
        start: startDateObj, 
        end: endDateObj 
      });

      // CRÍTICO: Excluir transferências internas (Fatos Permutativos)
      const isInternalTransfer = 
        trans.category === 'Resgate Cofre' || 
        trans.category === 'Aplicação Cofre' ||
        trans.category?.toLowerCase().includes('resgate') ||
        trans.category?.toLowerCase().includes('transferência') ||
        trans.category?.toLowerCase().includes('transferencia');

      return isInPeriod && !isInternalTransfer;
    });

    // Calcular totais
    const revenue = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.value || 0), 0);

    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.value || 0), 0);

    const result = revenue - expenses;

    // Agrupar por categoria
    const revenueByCategory = {};
    const expensesByCategory = {};

    filteredTransactions.forEach(trans => {
      const category = trans.category || 'Sem Categoria';
      const value = Math.abs(trans.value || 0);

      if (trans.type === 'income') {
        revenueByCategory[category] = (revenueByCategory[category] || 0) + value;
      } else if (trans.type === 'expense') {
        expensesByCategory[category] = (expensesByCategory[category] || 0) + value;
      }
    });

    return Response.json({
      success: true,
      period: { start_date, end_date },
      dre: {
        revenue,
        expenses,
        result,
        revenue_by_category: revenueByCategory,
        expenses_by_category: expensesByCategory
      },
      transaction_count: filteredTransactions.length
    });

  } catch (error) {
    console.error('Erro ao gerar DRE:', error);
    return Response.json({ 
      error: 'Erro ao gerar DRE',
      details: error.message 
    }, { status: 500 });
  }
});