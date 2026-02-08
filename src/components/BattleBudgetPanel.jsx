import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Edit2, Save, X, TrendingUp, AlertTriangle, Plus, Sparkles, Check, Calendar, Copy, Bell, BrainCircuit } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { subDays, parseISO, isWithinInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BudgetAlertConfig from './BudgetAlertConfig';
import BudgetAlertMonitor from './BudgetAlertMonitor';
import { AIGuidanceService } from '@/api/AIGuidanceService';

export default function BattleBudgetPanel({ categories = [] }) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ budget: 0, frequency: 'monthly' });
  const [isCreating, setIsCreating] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    budget: 0,
    frequency: 'monthly',
    expense_type: 'variable',
    icon: '💰',
    color: '#00FFFF',
    category_type: 'expense',
    budget_month: format(new Date(), 'yyyy-MM')
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [manaLeakReport, setManaLeakReport] = useState(null);
  const [selectedAdjustments, setSelectedAdjustments] = useState({});
  const [selectedNewCategories, setSelectedNewCategories] = useState({});
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const queryClient = useQueryClient();

  // Fetch transactions for AI analysis
  const { data: finTransactions = [] } = useQuery({
    queryKey: ['finTransactions'],
    queryFn: () => base44.entities.FinTransaction.list('-created_date')
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BudgetCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetCategories']);
      setEditingId(null);
      toast.success('⚔️ Orçamento Atualizado!');
    }
  });

  // Filter categories for selected month (show default + month-specific)
  const monthCategories = useMemo(() => {
    return categories.filter(c =>
      c.category_type === 'expense' &&
      (c.budget || 0) > 0 &&
      (!c.budget_month || c.budget_month === selectedMonth)
    );
  }, [categories, selectedMonth]);

  // Get default budgets (no month specified) for replication
  const defaultCategories = categories.filter(c =>
    c.category_type === 'expense' && !c.budget_month
  );

  // Filter out zero budgets and group by type
  const fixedCosts = monthCategories.filter(c => c.expense_type === 'fixed');
  const variableCosts = monthCategories.filter(c => c.expense_type === 'variable');

  const calculateMonthlyBudget = (budget, frequency) => {
    if (frequency === 'yearly') return budget / 12;
    if (frequency === 'weekly') return (budget * 52) / 12;
    if (frequency === 'daily') return budget * 30;
    return budget;
  };

  const totalFixed = fixedCosts.reduce((sum, c) => sum + calculateMonthlyBudget(c.budget || 0, c.frequency), 0);
  const totalVariable = variableCosts.reduce((sum, c) => sum + calculateMonthlyBudget(c.budget || 0, c.frequency), 0);

  const startEdit = (category) => {
    setEditingId(category.id);
    setEditData({ budget: category.budget || 0, frequency: category.frequency || 'monthly' });
  };

  const saveEdit = (categoryId) => {
    updateBudgetMutation.mutate({
      id: String(categoryId),
      data: {
        budget: String(parseFloat(editData.budget) || 0),
        frequency: editData.frequency
      }
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.BudgetCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetCategories']);
      setIsCreating(false);
      setNewCategory({
        name: '',
        budget: 0,
        frequency: 'monthly',
        expense_type: 'variable',
        icon: '💰',
        color: '#00FFFF',
        category_type: 'expense',
        budget_month: selectedMonth
      });
      toast.success('✨ Nova categoria criada!');
    }
  });

  const handleCreateCategory = () => {
    if (!newCategory.name || !newCategory.budget) {
      toast.error('Preencha nome e valor do orçamento');
      return;
    }
    createCategoryMutation.mutate(newCategory);
  };

  const analyzeManaLeak = async () => {
    setIsAnalyzing(true);
    try {
      const summary = finTransactions.slice(0, 50).map(t => `${t.description} (R$ ${t.value}, ${t.category})`).join(', ');

      const prompt = `Você é o Sensor de Mana do FinQuest. Analise as transações recentes e identifique "Vazamentos de Mana" (gastos recorrentes desnecessários, taxas ocultas, ou impulsos que não agregam valor).
      
      LOG DE ENERGIA: ${summary}
      
      OBJETIVO: Identificar 3 vazamentos críticos e sugerir uma "Contramedida" para cada.
      Responda em JSON: { "leaks": [ { "leak": "...", "damage": "R$ ...", "countermeasure": "..." } ] }`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        system_prompt: "Você é um especialista em detecção de desperdício financeiro em um mundo cyberpunk.",
        json_output: true
      });

      setManaLeakReport(JSON.parse(response.output));
      toast.success('🔍 Vazamentos de Mana detectados!');
    } catch (error) {
      toast.error('Falha no sensor de mana.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AI Analysis mutation
  const analyzeWithAI = useMutation({
    mutationFn: async () => {
      const last90Days = subDays(new Date(), 90);
      const recentTransactions = finTransactions.filter(t => {
        const transDate = parseISO(t.date);
        return isWithinInterval(transDate, { start: last90Days, end: new Date() }) && t.type === 'expense';
      });

      // Calculate actual spending by category
      const categorySpending = {};
      recentTransactions.forEach(trans => {
        const cat = trans.category || 'Sem Categoria';
        if (!categorySpending[cat]) categorySpending[cat] = 0;
        categorySpending[cat] += Math.abs(trans.value);
      });

      const avgSpendingByCategory = Object.entries(categorySpending).map(([name, total]) => ({
        name,
        avgMonthly: total / 3
      }));

      const currentBudgets = categories
        .filter(c => c.category_type === 'expense')
        .map(c => ({
          name: c.name,
          current_budget: calculateMonthlyBudget(c.budget || 0, c.frequency),
          expense_type: c.expense_type,
          frequency: c.frequency
        }));

      const response = await AIGuidanceService.performFullAnalysis(currentBudgets, avgSpendingByCategory);
      return response;
    },
    onSuccess: (data) => {
      setAiSuggestions(data);
      setIsAnalyzing(false);

      // Auto-select all suggestions
      const adjSelected = {};
      data.adjustments.forEach((adj, idx) => {
        adjSelected[idx] = true;
      });
      setSelectedAdjustments(adjSelected);

      const newCatSelected = {};
      data.new_categories.forEach((cat, idx) => {
        newCatSelected[idx] = true;
      });
      setSelectedNewCategories(newCatSelected);

      toast.success('🧠 Análise de IA concluída!');
    },
    onError: () => {
      setIsAnalyzing(false);
      toast.error('Erro ao analisar orçamentos');
    }
  });

  const handleApplySuggestions = async () => {
    if (!aiSuggestions) return;

    const selectedAdjCount = Object.values(selectedAdjustments).filter(Boolean).length;
    const selectedNewCount = Object.values(selectedNewCategories).filter(Boolean).length;

    if (selectedAdjCount === 0 && selectedNewCount === 0) {
      toast.error('Selecione pelo menos uma sugestão para aplicar');
      return;
    }

    try {
      // Apply only selected adjustments
      for (let i = 0; i < aiSuggestions.adjustments.length; i++) {
        if (selectedAdjustments[i]) {
          const adj = aiSuggestions.adjustments[i];
          const category = categories.find(c => c.name === adj.category);
          if (category) {
            await base44.entities.BudgetCategory.update(category.id, {
              budget: adj.suggested_budget,
              frequency: 'monthly'
            });
          }
        }
      }

      // Create only selected new categories
      for (let i = 0; i < aiSuggestions.new_categories.length; i++) {
        if (selectedNewCategories[i]) {
          const newCat = aiSuggestions.new_categories[i];
          await base44.entities.BudgetCategory.create({
            name: newCat.name,
            budget: newCat.suggested_budget,
            frequency: 'monthly',
            expense_type: newCat.expense_type,
            color: '#00FFFF',
            icon: '💰',
            category_type: 'expense',
            keywords: []
          });
        }
      }

      queryClient.invalidateQueries(['budgetCategories']);
      setManaLeakReport(null);
      setSelectedAdjustments({});
      setSelectedNewCategories({});
      toast.success(`✅ ${selectedAdjCount + selectedNewCount} sugestão(ões) aplicada(s)!`);
    } catch (error) {
      console.error('Erro ao aplicar sugestões:', error);
      toast.error('Erro ao aplicar sugestões');
    }
  };

  const toggleAdjustment = (index) => {
    setSelectedAdjustments(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleNewCategory = (index) => {
    setSelectedNewCategories(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Replicate budget mutation
  const replicateBudgetMutation = useMutation({
    mutationFn: async (targetMonths) => {
      const creationPromises = [];

      for (const month of targetMonths) {
        for (const cat of defaultCategories) {
          // Check if category already exists for this month
          const existing = categories.find(c =>
            c.name === cat.name &&
            c.budget_month === month
          );

          if (!existing) {
            creationPromises.push(
              base44.entities.BudgetCategory.create({
                ...cat,
                budget_month: month,
                id: undefined // Remove ID to create new
              })
            );
          }
        }
      }

      await Promise.all(creationPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetCategories']);
      toast.success('📅 Orçamentos replicados com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao replicar orçamentos');
    }
  });

  const handleReplicateToYear = () => {
    const currentYear = parseInt(selectedMonth.split('-')[0]);
    const months = [];

    for (let month = 1; month <= 12; month++) {
      const monthStr = `${currentYear}-${String(month).padStart(2, '0')}`;
      if (monthStr !== selectedMonth) {
        months.push(monthStr);
      }
    }

    if (defaultCategories.length === 0) {
      toast.error('Nenhum orçamento padrão encontrado para replicar');
      return;
    }

    if (confirm(`Replicar orçamentos padrão para todos os ${months.length} meses de ${currentYear}?`)) {
      replicateBudgetMutation.mutate(months);
    }
  };

  const ResourceLine = ({ category, type }) => {
    const isEditing = editingId === category.id;
    const monthlyBudget = calculateMonthlyBudget(category.budget || 0, category.frequency);
    const isYearly = category.frequency === 'yearly';

    // Calculate current spent from real transactions for this category and month
    const currentSpent = useMemo(() => {
      // Parse current month
      const [year, month] = selectedMonth.split('-').map(Number);

      return finTransactions
        .filter(t => {
          if (t.type !== 'expense' || t.category !== category.name) return false;

          const tDate = parseISO(t.date);
          return tDate.getFullYear() === year && (tDate.getMonth() + 1) === month;
        })
        .reduce((sum, t) => sum + Math.abs(t.value), 0);
    }, [finTransactions, category.name, selectedMonth]);

    const progress = monthlyBudget > 0 ? (currentSpent / monthlyBudget) * 100 : 0;

    const progressColor =
      progress > 90 ? 'bg-red-500' :
        progress > 70 ? 'bg-yellow-500' :
          'bg-green-500';

    const icon = type === 'fixed' ? '🛡️' : '⚡';

    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`group relative overflow-hidden rounded-xl border transition-all ${isEditing
          ? 'bg-cyan-500/10 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
          }`}
      >
        {/* Progress Bar Background */}
        <div className="absolute bottom-0 left-0 h-1 w-full bg-slate-900">
          <motion.div
            className={`h-full ${progressColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="p-4">
          {isEditing ? (
            // Edit Mode
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{category.icon || icon}</span>
                <span className="text-white font-bold">{category.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Orçamento</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                    <input
                      type="number"
                      value={editData.budget}
                      onChange={(e) => setEditData({ ...editData, budget: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-cyan-500 rounded-lg py-2 pl-10 pr-3 text-white font-mono focus:ring-2 focus:ring-cyan-500 outline-none"
                      step="0.01"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Frequência</label>
                  <select
                    value={editData.frequency}
                    onChange={(e) => setEditData({ ...editData, frequency: e.target.value })}
                    className="w-full bg-slate-900 border border-cyan-500 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              </div>

              {editData.frequency === 'yearly' && (
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <p className="text-cyan-400 text-xs font-bold">
                    💡 Provisão Mensal: R$ {((editData.budget || 0) / 12).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(category.id)}
                  disabled={updateBudgetMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-lg transition-all"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            // View Mode
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{category.icon || icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-bold">{category.name}</h4>
                    {isYearly && (
                      <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/50 rounded text-purple-400 text-[10px] font-bold uppercase">
                        Anual
                      </span>
                    )}
                  </div>
                  {isYearly && (
                    <p className="text-slate-400 text-xs mt-0.5">
                      Provisão: R$ {monthlyBudget.toFixed(2)}/mês
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-black text-cyan-400 font-mono">
                    R$ {monthlyBudget.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 uppercase font-bold">
                    {category.frequency === 'monthly' ? 'Mensal' :
                      category.frequency === 'yearly' ? `R$ ${(category.budget || 0).toFixed(2)}/ano` :
                        category.frequency === 'weekly' ? 'Semanal' :
                          'Diário'}
                  </p>
                </div>

                <button
                  onClick={() => startEdit(category)}
                  className="opacity-0 group-hover:opacity-100 p-2 bg-slate-700 hover:bg-cyan-500/20 rounded-lg text-cyan-400 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const priorityColors = {
    'alta': 'border-red-500 bg-red-500/10',
    'média': 'border-yellow-500 bg-yellow-500/10',
    'baixa': 'border-green-500 bg-green-500/10'
  };

  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const nextYear = currentYear + 1;

    // Mês atual até dezembro deste ano
    for (let month = currentMonth; month <= 12; month++) {
      const monthStr = `${currentYear}-${String(month).padStart(2, '0')}`;
      options.push(monthStr);
    }

    // Janeiro até dezembro do próximo ano
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${nextYear}-${String(month).padStart(2, '0')}`;
      options.push(monthStr);
    }

    return options;
  };

  return (
    <div className="space-y-8">
      {/* Month Selector & Actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-cyan-500/30 rounded-xl">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setNewCategory(prev => ({ ...prev, budget_month: e.target.value }));
            }}
            className="bg-transparent text-white font-bold outline-none cursor-pointer"
          >
            {generateMonthOptions().map(month => (
              <option key={month} value={month} className="bg-slate-900">
                {format(parseISO(`${month}-01`), 'MMMM yyyy', { locale: ptBR })}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleReplicateToYear}
          disabled={replicateBudgetMutation.isPending || defaultCategories.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] disabled:opacity-50"
          title="Replica orçamentos padrão para todo o ano"
        >
          <Copy className="w-5 h-5" />
          Replicar para Ano Inteiro
        </button>

        <div className="flex-1" />

        {/* Action Buttons */}
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          <Plus className="w-5 h-5" />
          Nova Categoria
        </button>

        <button
          onClick={() => {
            setIsAnalyzing(true);
            analyzeWithAI.mutate();
          }}
          disabled={isAnalyzing || finTransactions.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <BrainCircuit className="w-5 h-5" />
              </motion.div>
              Analisando...
            </>
          ) : (
            <>
              <BrainCircuit className="w-5 h-5" />
              Análise com IA
              <Sparkles className="w-4 h-4" />
            </>
          )}
        </button>

        <button
          onClick={analyzeManaLeak}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50"
        >
          <Zap className="w-5 h-5" />
          {isAnalyzing ? 'Escaneando...' : 'Detector de Mana Leak'}
        </button>

        <button
          onClick={() => setShowAlertConfig(!showAlertConfig)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)]"
        >
          <Bell className="w-5 h-5" />
          Configurar Alertas
        </button>
      </div>

      {/* Budget Alert Monitor */}
      <BudgetAlertMonitor selectedMonth={selectedMonth} />

      {/* Alert Configuration */}
      <AnimatePresence>
        {showAlertConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <BudgetAlertConfig categories={categories} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create New Category */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-slate-800/50 border border-cyan-500/30 rounded-xl">
              <h3 className="text-white font-bold uppercase mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Nova Categoria - {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: ptBR })}
              </h3>
              <p className="text-slate-400 text-xs mb-4">
                💡 Deixe o campo "Mês Específico" vazio para criar um orçamento padrão (todos os meses)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nome da categoria"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
                <input
                  type="text"
                  placeholder="Emoji"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
                <input
                  type="number"
                  placeholder="Valor do orçamento"
                  value={newCategory.budget}
                  onChange={(e) => setNewCategory({ ...newCategory, budget: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  step="0.01"
                />
                <select
                  value={newCategory.frequency}
                  onChange={(e) => setNewCategory({ ...newCategory, frequency: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                  <option value="weekly">Semanal</option>
                  <option value="daily">Diário</option>
                </select>
                <select
                  value={newCategory.expense_type}
                  onChange={(e) => setNewCategory({ ...newCategory, expense_type: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="fixed">Fixo (Manutenção da Base)</option>
                  <option value="variable">Variável (Suprimentos)</option>
                </select>
                <input
                  type="month"
                  placeholder="Mês específico (opcional)"
                  value={newCategory.budget_month || ''}
                  onChange={(e) => setNewCategory({ ...newCategory, budget_month: e.target.value || undefined })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  title="Deixe vazio para orçamento padrão (todos os meses)"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCreateCategory}
                  disabled={createCategoryMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4 inline mr-2" />
                  Criar Categoria
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-6 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition-all"
                >
                  <X className="w-4 h-4 inline" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mana Leak Report */}
      <AnimatePresence>
        {manaLeakReport && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 bg-slate-900/80 border-2 border-amber-500/50 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] mb-8 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap className="w-20 h-20 text-amber-500" />
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase text-lg tracking-wider">Vazamentos de Mana Detectados</h3>
                  <p className="text-amber-400/60 text-xs font-bold uppercase">Interface do Sensor Neural</p>
                </div>
              </div>
              <button
                onClick={() => setManaLeakReport(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {manaLeakReport.leaks.map((leak, idx) => (
                <div key={idx} className="p-4 bg-slate-800/50 border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-400 font-black text-xs uppercase tracking-widest">Leak #{idx + 1}</span>
                    <span className="text-rose-400 font-bold font-mono text-sm">{leak.damage}</span>
                  </div>
                  <h4 className="text-white font-bold text-sm mb-1 group-hover:text-amber-400 transition-colors">{leak.leak}</h4>
                  <div className="mt-4 p-2 bg-slate-900/80 rounded border border-cyan-500/20">
                    <p className="text-[10px] text-cyan-400 uppercase font-black mb-1">Contramedida</p>
                    <p className="text-xs text-slate-300 leading-relaxed italic">"{leak.countermeasure}"</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Suggestions */}
      <AnimatePresence>
        {aiSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/50 rounded-2xl shadow-[0_0_40px_rgba(168,85,247,0.2)]"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BrainCircuit className="w-8 h-8 text-purple-400" />
                <div>
                  <h3 className="text-white font-black uppercase text-lg">Análise de IA Completa</h3>
                  <p className="text-purple-300 text-sm">Sugestões baseadas em seus gastos reais</p>
                </div>
              </div>
              <button
                onClick={() => setAiSuggestions(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Insights */}
            <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
              <h4 className="text-cyan-400 font-bold uppercase text-sm mb-2">💡 Insights Principais</h4>
              <ul className="space-y-1">
                {aiSuggestions.insights.map((insight, idx) => (
                  <li key={idx} className="text-slate-300 text-sm flex gap-2">
                    <span className="text-cyan-400">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>

            {/* Savings Potential */}
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
              <p className="text-green-400 text-sm uppercase font-bold mb-1">Potencial de Economia</p>
              <p className="text-3xl font-black text-green-400 font-mono">
                +R$ {aiSuggestions.total_savings_potential.toFixed(2)}/mês
              </p>
            </div>

            {/* Adjustments */}
            {aiSuggestions.adjustments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-white font-bold uppercase text-sm mb-3">📊 Ajustes Sugeridos</h4>
                <div className="space-y-2">
                  {aiSuggestions.adjustments.map((adj, idx) => {
                    const isSelected = selectedAdjustments[idx];
                    return (
                      <div key={idx} className={`p-3 rounded-xl border-2 transition-all ${isSelected
                        ? priorityColors[adj.priority]
                        : 'border-slate-700 bg-slate-800/30 opacity-60'
                        }`}>
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleAdjustment(idx)}
                            className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected
                              ? 'bg-cyan-500 border-cyan-400'
                              : 'bg-slate-800 border-slate-600'
                              }`}
                          >
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="text-white font-bold">{adj.category}</h5>
                              <span className="text-xs px-2 py-0.5 bg-black/20 rounded uppercase font-bold">
                                {adj.priority}
                              </span>
                            </div>
                            <p className="text-slate-300 text-sm mb-2">{adj.reason}</p>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-400">Atual: R$ {adj.current_budget.toFixed(2)}</span>
                              <span className="text-cyan-400">→</span>
                              <span className="text-cyan-400 font-bold">Sugerido: R$ {adj.suggested_budget.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* New Categories */}
            {aiSuggestions.new_categories.length > 0 && (
              <div className="mb-6">
                <h4 className="text-white font-bold uppercase text-sm mb-3">➕ Novas Categorias Recomendadas</h4>
                <div className="space-y-2">
                  {aiSuggestions.new_categories.map((newCat, idx) => {
                    const isSelected = selectedNewCategories[idx];
                    return (
                      <div key={idx} className={`p-3 rounded-xl border-2 transition-all ${isSelected
                        ? 'bg-green-500/10 border-green-500'
                        : 'border-slate-700 bg-slate-800/30 opacity-60'
                        }`}>
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleNewCategory(idx)}
                            className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected
                              ? 'bg-green-500 border-green-400'
                              : 'bg-slate-800 border-slate-600'
                              }`}
                          >
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="text-white font-bold">{newCat.name}</h5>
                              <span className="text-cyan-400 font-mono font-bold">R$ {newCat.suggested_budget.toFixed(2)}</span>
                            </div>
                            <p className="text-slate-300 text-sm mb-1">{newCat.reason}</p>
                            <span className="text-xs text-slate-500 uppercase">{newCat.expense_type}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Apply Button */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const allAdj = {};
                  aiSuggestions.adjustments.forEach((_, idx) => { allAdj[idx] = true; });
                  setSelectedAdjustments(allAdj);

                  const allNew = {};
                  aiSuggestions.new_categories.forEach((_, idx) => { allNew[idx] = true; });
                  setSelectedNewCategories(allNew);
                }}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all uppercase text-sm"
              >
                Selecionar Tudo
              </button>
              <button
                onClick={() => {
                  setSelectedAdjustments({});
                  setSelectedNewCategories({});
                }}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all uppercase text-sm"
              >
                Desmarcar Tudo
              </button>
            </div>
            <button
              onClick={handleApplySuggestions}
              disabled={Object.values(selectedAdjustments).filter(Boolean).length === 0 && Object.values(selectedNewCategories).filter(Boolean).length === 0}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-black rounded-xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] uppercase flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
              Aplicar Selecionados ({Object.values(selectedAdjustments).filter(Boolean).length + Object.values(selectedNewCategories).filter(Boolean).length})
              <Sparkles className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-2 border-orange-500/30 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-orange-400" />
              <h4 className="text-orange-400 font-bold uppercase text-sm">Manutenção da Base</h4>
            </div>
            <p className="text-3xl font-black text-white font-mono">
              R$ {totalFixed.toFixed(2)}
            </p>
            <p className="text-orange-400/60 text-xs uppercase mt-1">Custos Fixos/Mês</p>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/30 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <h4 className="text-cyan-400 font-bold uppercase text-sm">Suprimentos de Missão</h4>
            </div>
            <p className="text-3xl font-black text-white font-mono">
              R$ {totalVariable.toFixed(2)}
            </p>
            <p className="text-cyan-400/60 text-xs uppercase mt-1">Custos Variáveis/Mês</p>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h4 className="text-purple-400 font-bold uppercase text-sm">Custo Total de Operação</h4>
            </div>
            <p className="text-3xl font-black text-white font-mono">
              R$ {(totalFixed + totalVariable).toFixed(2)}
            </p>
            <p className="text-purple-400/60 text-xs uppercase mt-1">Burn Rate Mensal</p>
          </div>
        </div>
      </div>

      {/* Fixed Costs Section */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-white uppercase">Manutenção da Base (Fixos)</h3>
            <p className="text-slate-400 text-sm">Custos obrigatórios e recorrentes</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 uppercase font-bold">Total</p>
            <p className="text-xl font-black text-orange-400 font-mono">
              R$ {totalFixed.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {fixedCosts.length > 0 ? (
              fixedCosts.map(category => (
                <ResourceLine key={category.id} category={category} type="fixed" />
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Shield className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum custo fixo definido</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Variable Costs Section */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-white uppercase">Suprimentos de Missão (Variáveis)</h3>
            <p className="text-slate-400 text-sm">Custos controláveis e flexíveis</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 uppercase font-bold">Total</p>
            <p className="text-xl font-black text-cyan-400 font-mono">
              R$ {totalVariable.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {variableCosts.length > 0 ? (
              variableCosts.map(category => (
                <ResourceLine key={category.id} category={category} type="variable" />
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Zap className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum custo variável definido</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Insight Alert */}
      {(totalFixed + totalVariable) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-blue-500/10 border-l-4 border-blue-500 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-blue-400 font-bold text-sm uppercase mb-1">Insight Tático</h4>
              <p className="text-slate-300 text-sm">
                Seus custos fixos representam {totalFixed > 0 ? ((totalFixed / (totalFixed + totalVariable)) * 100).toFixed(0) : 0}% do orçamento total.
                {totalFixed / (totalFixed + totalVariable) > 0.5
                  ? ' Você tem alta rigidez orçamentária - considere aumentar receitas ou renegociar contratos fixos.'
                  : ' Você tem boa flexibilidade - seus custos variáveis dão margem para ajustes táticos.'}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}