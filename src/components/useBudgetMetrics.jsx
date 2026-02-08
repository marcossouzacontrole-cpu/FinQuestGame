import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

export function useBudgetMetrics(monthDate = new Date()) {
  // Buscar todas as categorias
  const { data: categories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  // Buscar todas as transações (vamos filtrar localmente por mês)
  const { data: allTransactions = [] } = useQuery({
    queryKey: ['finTransactions'],
    queryFn: () => base44.entities.FinTransaction.list('-created_date')
  });

  // Calcular métricas
  const metrics = useMemo(() => {
    const startDate = startOfMonth(monthDate);
    const endDate = endOfMonth(monthDate);

    // Filtrar transações do mês atual
    const monthTransactions = allTransactions.filter(t => {
      if (!t.date) return false;
      try {
        const transDate = parseISO(t.date);
        return isWithinInterval(transDate, { start: startDate, end: endDate });
      } catch {
        return false;
      }
    });

    // Calcular totais por categoria
    const categoriesMetrics = categories.map(category => {
      const categoryTransactions = monthTransactions.filter(t => 
        t.category === category.name && t.type === 'expense'
      );

      const spent = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.value), 0);
      const limit = category.budget || 0;
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;

      return {
        id: category.id,
        name: category.name,
        limit,
        spent,
        percentage,
        color: category.color || '#00FFFF',
        icon: category.icon || '📊',
        transactionCount: categoryTransactions.length,
        transactions: categoryTransactions
      };
    }).sort((a, b) => b.spent - a.spent);

    // Totais gerais
    const totalBudget = categories.reduce((sum, c) => sum + (c.budget || 0), 0);
    const totalSpent = categoriesMetrics.reduce((sum, c) => sum + c.spent, 0);
    const totalIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.value), 0);

    // Saúde geral do orçamento
    const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    let overallHealth = 'good';
    if (overallPercentage >= 100) overallHealth = 'critical';
    else if (overallPercentage >= 80) overallHealth = 'warning';

    return {
      categoriesMetrics,
      totalBudget,
      totalSpent,
      totalIncome,
      overallPercentage,
      overallHealth,
      netResult: totalIncome - totalSpent
    };
  }, [categories, allTransactions, monthDate]);

  return metrics;
}