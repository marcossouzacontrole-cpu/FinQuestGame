import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import NeonCard from './NeonCard';
import { Progress } from '@/components/ui/progress';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function BudgetVsActual({ month = new Date() }) {
  const monthStr = format(startOfMonth(month), 'yyyy-MM-dd');
  
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', monthStr],
    queryFn: async () => {
      const all = await base44.entities.Transaction.list();
      return all.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startOfMonth(month) && tDate <= endOfMonth(month);
      });
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBudget = categories.reduce((sum, c) => sum + (c.budget || 0), 0);
  const balance = totalIncome - totalExpenses;
  const budgetRemaining = totalBudget - totalExpenses;

  // Category breakdown
  const categoryData = categories.map(cat => {
    const spent = transactions
      .filter(t => t.type === 'expense' && t.category_id === cat.id)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const percentage = cat.budget > 0 ? (spent / cat.budget) * 100 : 0;
    const isOver = spent > cat.budget;
    
    return {
      ...cat,
      spent,
      percentage,
      isOver,
      remaining: cat.budget - spent
    };
  }).filter(c => c.spent > 0 || c.budget > 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <NeonCard glowColor="green">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs mb-1">Receitas</p>
              <p className="text-2xl font-black text-green-400">
                R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </NeonCard>

        <NeonCard glowColor="magenta">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs mb-1">Despesas</p>
              <p className="text-2xl font-black text-red-400">
                R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-400 opacity-50" />
          </div>
        </NeonCard>

        <NeonCard glowColor={balance >= 0 ? 'cyan' : 'gold'}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs mb-1">Saldo</p>
              <p className={`text-2xl font-black ${balance >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            {balance >= 0 ? (
              <CheckCircle className="w-8 h-8 text-cyan-400 opacity-50" />
            ) : (
              <AlertCircle className="w-8 h-8 text-orange-400 opacity-50" />
            )}
          </div>
        </NeonCard>

        <NeonCard glowColor="purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs mb-1">Orçamento Restante</p>
              <p className={`text-2xl font-black ${budgetRemaining >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                R$ {budgetRemaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-3xl opacity-50">
              {budgetRemaining >= 0 ? '🎯' : '⚠️'}
            </div>
          </div>
        </NeonCard>
      </div>

      {/* Category Breakdown */}
      <NeonCard glowColor="cyan">
        <h3 className="text-white font-bold text-lg mb-4">Orçado vs Realizado por Categoria</h3>
        <div className="space-y-4">
          {categoryData.map(cat => (
            <div key={cat.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{cat.icon || '💎'}</span>
                  <div>
                    <p className="text-white font-semibold">{cat.name}</p>
                    <p className="text-xs text-gray-400">
                      R$ {cat.spent.toFixed(2)} de R$ {cat.budget.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${cat.isOver ? 'text-red-400' : 'text-gray-400'}`}>
                    {cat.percentage.toFixed(0)}%
                  </p>
                  {cat.isOver && (
                    <p className="text-xs text-red-400">
                      +R$ {(cat.spent - cat.budget).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
              <div className="relative">
                <Progress 
                  value={Math.min(cat.percentage, 100)} 
                  className="h-2 bg-gray-800"
                  indicatorClassName={cat.isOver ? 'bg-red-500' : 'bg-cyan-400'}
                />
                {cat.isOver && (
                  <div 
                    className="absolute top-0 left-0 h-2 bg-red-500/30"
                    style={{ width: '100%' }}
                  />
                )}
              </div>
            </div>
          ))}
          
          {categoryData.length === 0 && (
            <p className="text-gray-400 text-center py-8">
              Nenhuma transação registrada neste mês
            </p>
          )}
        </div>
      </NeonCard>
    </div>
  );
}