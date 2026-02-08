import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Zap, Edit2, Check, X, Plus, 
  TrendingUp, Flame, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const NeonCard = ({ children, glowColor = 'cyan', className = '' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/80',
    green: 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-slate-900/80',
    purple: 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-slate-900/80',
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden ${colors[glowColor] || colors.cyan} ${className}`}>
      {children}
    </div>
  );
};

export default function BattleBudget() {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ budget: 0, frequency: 'monthly' });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    budget: 0,
    frequency: 'monthly',
    expense_type: 'fixed',
    color: '#00FFFF',
    icon: '💰',
    category_type: 'expense'
  });

  const queryClient = useQueryClient();

  // Fetch data
  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  const { data: finTransactions = [] } = useQuery({
    queryKey: ['finTransactions'],
    queryFn: () => base44.entities.FinTransaction.list('-created_date')
  });

  // Update mutation
  const updateBudget = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BudgetCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetCategories']);
      setEditingId(null);
      toast.success('⚡ Recurso atualizado!');
    }
  });

  // Create mutation
  const createCategory = useMutation({
    mutationFn: (data) => base44.entities.BudgetCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetCategories']);
      setIsAddingNew(false);
      setNewCategory({
        name: '',
        budget: 0,
        frequency: 'monthly',
        expense_type: 'fixed',
        color: '#00FFFF',
        icon: '💰',
        category_type: 'expense'
      });
      toast.success('✨ Nova categoria criada!');
    }
  });

  // Calculate monthly budget for each category
  const calculateMonthlyBudget = (budget, frequency) => {
    if (frequency === 'yearly') return budget / 12;
    if (frequency === 'weekly') return budget * 4.33;
    if (frequency === 'daily') return budget * 30;
    return budget;
  };

  // Calculate spending per category this month
  const categorySpending = useMemo(() => {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    
    const spending = {};
    finTransactions.forEach(trans => {
      if (!trans.category || trans.type !== 'expense') return;
      
      const transDate = new Date(trans.date);
      if (transDate.getMonth() === thisMonth && transDate.getFullYear() === thisYear) {
        if (!spending[trans.category]) spending[trans.category] = 0;
        spending[trans.category] += Math.abs(trans.value);
      }
    });
    
    return spending;
  }, [finTransactions]);

  // Group categories by expense_type
  const groupedCategories = useMemo(() => {
    const fixed = budgetCategories.filter(c => c.expense_type === 'fixed' && c.category_type === 'expense');
    const variable = budgetCategories.filter(c => c.expense_type === 'variable' && c.category_type === 'expense');
    const eventual = budgetCategories.filter(c => c.expense_type === 'eventual' && c.category_type === 'expense');
    
    return { fixed, variable, eventual };
  }, [budgetCategories]);

  // Calculate totals
  const totals = useMemo(() => {
    const fixedTotal = groupedCategories.fixed.reduce((sum, c) => 
      sum + calculateMonthlyBudget(c.budget || 0, c.frequency), 0);
    const variableTotal = groupedCategories.variable.reduce((sum, c) => 
      sum + calculateMonthlyBudget(c.budget || 0, c.frequency), 0);
    const eventualTotal = groupedCategories.eventual.reduce((sum, c) => 
      sum + calculateMonthlyBudget(c.budget || 0, c.frequency), 0);
    
    return { 
      fixed: fixedTotal, 
      variable: variableTotal, 
      eventual: eventualTotal,
      total: fixedTotal + variableTotal + eventualTotal 
    };
  }, [groupedCategories]);

  const handleStartEdit = (category) => {
    setEditingId(category.id);
    setEditData({
      budget: category.budget || 0,
      frequency: category.frequency || 'monthly'
    });
  };

  const handleSaveEdit = (categoryId) => {
    updateBudget.mutate({
      id: categoryId,
      data: {
        budget: parseFloat(editData.budget) || 0,
        frequency: editData.frequency
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({ budget: 0, frequency: 'monthly' });
  };

  const handleCreateCategory = () => {
    if (!newCategory.name || !newCategory.budget) {
      toast.error('Preencha nome e valor do orçamento');
      return;
    }
    createCategory.mutate(newCategory);
  };

  const renderCategoryRow = (category) => {
    const isEditing = editingId === category.id;
    const monthlyBudget = calculateMonthlyBudget(category.budget || 0, category.frequency);
    const spent = categorySpending[category.name] || 0;
    const remaining = monthlyBudget - spent;
    const usagePercent = monthlyBudget > 0 ? (spent / monthlyBudget) * 100 : 0;
    
    let healthColor = 'from-green-600 to-emerald-500';
    if (usagePercent > 90) healthColor = 'from-red-600 to-orange-500';
    else if (usagePercent > 70) healthColor = 'from-yellow-600 to-orange-500';

    return (
      <motion.div
        key={category.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="group relative"
      >
        <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
          isEditing 
            ? 'bg-cyan-500/20 border-2 border-cyan-500' 
            : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'
        }`}>
          {/* Icon & Name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl">{category.icon || '💰'}</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-bold text-sm truncate">{category.name}</h4>
              {isEditing ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">R$</span>
                    <input
                      type="number"
                      value={editData.budget}
                      onChange={(e) => setEditData({ ...editData, budget: e.target.value })}
                      className="w-full bg-slate-900 border border-cyan-500 rounded px-2 py-1 pl-8 text-white text-xs font-mono"
                      step="0.01"
                      autoFocus
                    />
                  </div>
                  <select
                    value={editData.frequency}
                    onChange={(e) => setEditData({ ...editData, frequency: e.target.value })}
                    className="bg-slate-900 border border-cyan-500 rounded px-2 py-1 text-white text-xs"
                  >
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                    <option value="weekly">Semanal</option>
                    <option value="daily">Diário</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar className="w-3 h-3" />
                  <span className="capitalize">{category.frequency || 'mensal'}</span>
                  {category.frequency === 'yearly' && (
                    <span className="text-cyan-400 font-bold">
                      (Provisão: R$ {monthlyBudget.toFixed(2)}/mês)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Values */}
          <div className="flex items-center gap-4">
            {!isEditing && (
              <>
                <div className="text-right">
                  <p className="text-white font-bold text-sm font-mono">
                    R$ {monthlyBudget.toFixed(2)}
                  </p>
                  <p className={`text-xs font-mono ${remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {remaining >= 0 ? 'Sobra' : 'Excesso'}: R$ {Math.abs(remaining).toFixed(2)}
                  </p>
                </div>
                
                {/* HP Bar */}
                <div className="w-32">
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${healthColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(usagePercent, 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 text-center mt-0.5 font-mono">
                    {usagePercent.toFixed(0)}% usado
                  </p>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  <button
                    onClick={() => handleSaveEdit(category.id)}
                    disabled={updateBudget.isPending}
                    className="p-1.5 bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleStartEdit(category)}
                  className="p-1.5 opacity-0 group-hover:opacity-100 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
                >
                  <Edit2 className="w-4 h-4 text-slate-300" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Shield className="w-10 h-10 text-cyan-400" />
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 uppercase">
            PAINEL DE RECURSOS
          </h2>
          <Zap className="w-10 h-10 text-purple-400" />
        </div>
        <p className="text-slate-400 uppercase tracking-widest">
          Alocação Tática de Orçamento
        </p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <NeonCard glowColor="cyan" className="border-l-4 border-cyan-500">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h4 className="text-sm font-bold text-cyan-400 uppercase">Manutenção Base</h4>
          </div>
          <p className="text-3xl font-black text-white font-mono">
            R$ {totals.fixed.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Custos Fixos</p>
        </NeonCard>

        <NeonCard glowColor="purple" className="border-l-4 border-purple-500">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-purple-400" />
            <h4 className="text-sm font-bold text-purple-400 uppercase">Suprimentos</h4>
          </div>
          <p className="text-3xl font-black text-white font-mono">
            R$ {totals.variable.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Custos Variáveis</p>
        </NeonCard>

        <NeonCard glowColor="green" className="border-l-4 border-green-500">
          <div className="flex items-center gap-3 mb-2">
            <Flame className="w-5 h-5 text-green-400" />
            <h4 className="text-sm font-bold text-green-400 uppercase">Eventuais</h4>
          </div>
          <p className="text-3xl font-black text-white font-mono">
            R$ {totals.eventual.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Gastos Eventuais</p>
        </NeonCard>

        <NeonCard glowColor="cyan" className="border-l-4 border-yellow-500">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            <h4 className="text-sm font-bold text-yellow-400 uppercase">Custo Total</h4>
          </div>
          <p className="text-3xl font-black text-white font-mono">
            R$ {totals.total.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Provisão Mensal</p>
        </NeonCard>
      </div>

      {/* Fixed Costs */}
      <NeonCard glowColor="cyan">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-white font-black uppercase text-lg">Manutenção da Base</h3>
              <p className="text-xs text-slate-400">Custos Fixos (Obrigatórios)</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {groupedCategories.fixed.length > 0 ? (
            groupedCategories.fixed.map(renderCategoryRow)
          ) : (
            <p className="text-slate-500 text-center py-8">Nenhum custo fixo definido</p>
          )}
        </div>
      </NeonCard>

      {/* Variable Costs */}
      <NeonCard glowColor="purple">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-black uppercase text-lg">Suprimentos de Missão</h3>
              <p className="text-xs text-slate-400">Custos Variáveis (Controláveis)</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {groupedCategories.variable.length > 0 ? (
            groupedCategories.variable.map(renderCategoryRow)
          ) : (
            <p className="text-slate-500 text-center py-8">Nenhum custo variável definido</p>
          )}
        </div>
      </NeonCard>

      {/* Eventual Costs */}
      {groupedCategories.eventual.length > 0 && (
        <NeonCard glowColor="green">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-black uppercase text-lg">Gastos Eventuais</h3>
                <p className="text-xs text-slate-400">Despesas Não-Recorrentes</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {groupedCategories.eventual.map(renderCategoryRow)}
          </div>
        </NeonCard>
      )}

      {/* Add New Category */}
      <AnimatePresence>
        {isAddingNew ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <NeonCard glowColor="cyan">
              <h3 className="text-white font-bold uppercase mb-4">Nova Categoria de Orçamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nome da categoria"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
                <input
                  type="text"
                  placeholder="Emoji"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
                <input
                  type="number"
                  placeholder="Valor do orçamento"
                  value={newCategory.budget}
                  onChange={(e) => setNewCategory({ ...newCategory, budget: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  step="0.01"
                />
                <select
                  value={newCategory.frequency}
                  onChange={(e) => setNewCategory({ ...newCategory, frequency: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                  <option value="weekly">Semanal</option>
                  <option value="daily">Diário</option>
                </select>
                <select
                  value={newCategory.expense_type}
                  onChange={(e) => setNewCategory({ ...newCategory, expense_type: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="fixed">Fixo (Obrigatório)</option>
                  <option value="variable">Variável (Controlável)</option>
                  <option value="eventual">Eventual</option>
                </select>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCreateCategory}
                  disabled={createCategory.isPending}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4 inline mr-2" />
                  Criar Categoria
                </button>
                <button
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition-all"
                >
                  <X className="w-4 h-4 inline" />
                </button>
              </div>
            </NeonCard>
          </motion.div>
        ) : (
          <button
            onClick={() => setIsAddingNew(true)}
            className="w-full flex items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-800 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl transition-all group"
          >
            <Plus className="w-5 h-5 text-slate-500 group-hover:text-cyan-400" />
            <span className="text-slate-500 group-hover:text-cyan-400 font-bold uppercase text-sm">
              Adicionar Nova Categoria
            </span>
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}