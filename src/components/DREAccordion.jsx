import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, Shield, Zap, AlertTriangle, Swords, Heart, Target, Flame, Trophy, X, Sparkles, TrendingDown, Brain } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const NeonCard = ({ children, glowColor = 'cyan', className = '' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/80',
    green: 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-slate-900/80',
    red: 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)] bg-slate-900/80',
    purple: 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-slate-900/80',
    blue: 'border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)] bg-slate-900/80',
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden ${colors[glowColor] || colors.cyan} ${className}`}>
      {children}
    </div>
  );
};

export default function DREAccordion({ categories, transactionData }) {
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedSubsection, setExpandedSubsection] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [deleteFilters, setDeleteFilters] = useState({ category: '', startDate: '', endDate: '', type: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Processar dados DRE SIMPLIFICADO para Pessoa Física
  const dreStructure = useMemo(() => {
    // FILTRAR categorias patrimoniais (não afetam DRE)
    const patrimonialCategories = categories.filter(c => c.category_type === 'patrimonial').map(c => c.name);
    
    const revenueTransactions = transactionData.filter(t => 
      t.type === 'income' && !patrimonialCategories.includes(t.category)
    );
    const expenseTransactions = transactionData.filter(t => 
      t.type === 'expense' && !patrimonialCategories.includes(t.category)
    );

    // VERSÃO SIMPLIFICADA PARA PESSOA FÍSICA
    // Agrupar todas as receitas por categoria
    const revenueMap = new Map();
    
    revenueTransactions.forEach(trans => {
      const cat = categories.find(c => c.name === trans.category);
      const categoryName = trans.category || 'Sem Categoria';
      
      if (!revenueMap.has(categoryName)) {
        revenueMap.set(categoryName, {
          id: cat?.id || categoryName,
          name: categoryName,
          icon: cat?.icon || '💰',
          color: cat?.color || '#10b981',
          income_type: cat?.income_type || 'operational_revenue',
          total: 0,
          transactions: []
        });
      }
      
      const entry = revenueMap.get(categoryName);
      entry.total += trans.value;
      entry.transactions.push(trans);
    });

    const allRevenuesByCategory = Array.from(revenueMap.values()).filter(c => c.total > 0);

    // Agrupar todas as despesas por categoria
    const expenseMap = new Map();
    
    expenseTransactions.forEach(trans => {
      const cat = categories.find(c => c.name === trans.category);
      const categoryName = trans.category || 'Sem Categoria';
      
      if (!expenseMap.has(categoryName)) {
        expenseMap.set(categoryName, {
          id: cat?.id || categoryName,
          name: categoryName,
          icon: cat?.icon || '💀',
          color: cat?.color || '#ef4444',
          expense_type: cat?.expense_type || 'general_admin',
          total: 0,
          transactions: []
        });
      }
      
      const entry = expenseMap.get(categoryName);
      entry.total += trans.value;
      entry.transactions.push(trans);
    });

    const allExpensesByCategory = Array.from(expenseMap.values()).filter(c => c.total > 0);

    // Totais
    const totalRevenue = revenueTransactions.reduce((sum, t) => sum + t.value, 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.value, 0);
    const netResult = totalRevenue - totalExpenses;

    // ORDENAR RECEITAS POR VALOR (MAIOR PARA MENOR)
    const sortedRevenues = allRevenuesByCategory.sort((a, b) => b.total - a.total);

    // SEPARAR DESPESAS POR RECORRÊNCIA E ORDENAR POR VALOR
    const fixedExpenses = [];
    const variableExpenses = [];
    const eventualExpenses = [];
    
    allExpensesByCategory.forEach(c => {
      const cat = categories.find(cat => cat.name === c.name);
      const recurrence = cat?.expense_recurrence || 'variable';
      
      if (recurrence === 'fixed') {
        fixedExpenses.push(c);
      } else if (recurrence === 'eventual') {
        eventualExpenses.push(c);
      } else {
        variableExpenses.push(c);
      }
    });

    // Ordenar cada grupo por valor (maior para menor)
    fixedExpenses.sort((a, b) => b.total - a.total);
    variableExpenses.sort((a, b) => b.total - a.total);
    eventualExpenses.sort((a, b) => b.total - a.total);

    const totalFixedExpenses = fixedExpenses.reduce((sum, c) => sum + c.total, 0);
    const totalVariableExpenses = variableExpenses.reduce((sum, c) => sum + c.total, 0);
    const totalEventualExpenses = eventualExpenses.reduce((sum, c) => sum + c.total, 0);





    return {
      // VERSÃO SIMPLIFICADA
      totalRevenue,
      totalExpenses,
      netResult,
      allRevenuesByCategory: sortedRevenues,
      allExpensesByCategory,
      fixedExpenses,
      variableExpenses,
      eventualExpenses,
      totalFixedExpenses,
      totalVariableExpenses,
      totalEventualExpenses
    };
  }, [categories, transactionData]);

  const handleDeleteTransaction = async (trans) => {
    if (!confirm(`Deseja realmente excluir "${trans.description}"?`)) return;

    try {
      await base44.entities.FinTransaction.delete(trans.id);
      queryClient.invalidateQueries(['finTransactions']);
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      alert('Erro ao excluir transação. Tente novamente.');
    }
  };

  const handleEditTransaction = async (trans) => {
    if (!editCategory || editCategory === trans.category) {
      setEditingTransaction(null);
      return;
    }

    try {
      await base44.entities.FinTransaction.update(trans.id, {
        category: editCategory
      });

      queryClient.invalidateQueries(['finTransactions']);
      setEditingTransaction(null);
      setEditCategory('');
    } catch (error) {
      console.error('Erro ao editar transação:', error);
      alert('Erro ao mover transação. Tente novamente.');
    }
  };

  const handleBulkDelete = async () => {
    const toDelete = transactionData.filter(trans => {
      let matches = true;
      
      if (deleteFilters.category && trans.category !== deleteFilters.category) {
        matches = false;
      }
      
      if (deleteFilters.type && trans.type !== deleteFilters.type) {
        matches = false;
      }
      
      if (deleteFilters.startDate) {
        const transDate = new Date(trans.date);
        const startDate = new Date(deleteFilters.startDate);
        if (transDate < startDate) matches = false;
      }
      
      if (deleteFilters.endDate) {
        const transDate = new Date(trans.date);
        const endDate = new Date(deleteFilters.endDate);
        if (transDate > endDate) matches = false;
      }
      
      return matches;
    });

    if (toDelete.length === 0) {
      alert('Nenhuma transação corresponde aos filtros selecionados.');
      return;
    }

    const confirmMsg = `Deseja realmente excluir ${toDelete.length} transação(ões)?\n\nEsta ação não pode ser desfeita.`;
    if (!confirm(confirmMsg)) return;

    setIsDeleting(true);
    
    let successCount = 0;
    let failCount = 0;

    for (const trans of toDelete) {
      try {
        await base44.entities.FinTransaction.delete(trans.id);
        successCount++;
      } catch (error) {
        console.error(`Erro ao excluir transação ${trans.id}:`, error);
        failCount++;
      }
    }

    queryClient.invalidateQueries(['finTransactions']);
    
    if (failCount === 0) {
      alert(`✓ ${successCount} transação(ões) excluída(s) com sucesso!`);
    } else {
      alert(`Parcialmente concluído:\n✓ ${successCount} excluída(s)\n✗ ${failCount} falharam`);
    }
    
    setShowBulkDelete(false);
    setDeleteFilters({ category: '', startDate: '', endDate: '', type: '' });
    setIsDeleting(false);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
    setExpandedSubsection(null);
    setExpandedCategory(null);
  };

  const toggleSubsection = (subsection) => {
    setExpandedSubsection(expandedSubsection === subsection ? null : subsection);
    setExpandedCategory(null);
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const renderCategoryAccordion = (categoryList, sectionColor = 'emerald') => {
    if (!categoryList || categoryList.length === 0) {
      return <p className="text-slate-500 text-sm text-center py-3">Nenhuma transação neste grupo</p>;
    }

    return categoryList.map((category) => {
      const isExpanded = expandedCategory === category.id;
      const textColor = sectionColor === 'emerald' ? 'text-emerald-400' : 'text-red-400';
      const bgColor = sectionColor === 'emerald' ? 'bg-emerald-950/20' : 'bg-red-950/20';
      const borderColor = sectionColor === 'emerald' ? 'border-emerald-500/30' : 'border-red-500/30';

      return (
        <div key={category.id}>
          <button
            onClick={() => toggleCategory(category.id)}
            className="w-full flex items-center justify-between p-3 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 rounded-lg transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{category.icon || '📊'}</span>
              <div className="text-left">
                <span className="text-white font-semibold text-sm">{category.name}</span>
                <p className="text-xs text-slate-500">{category.transactions.length} transação(ões)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`${textColor} font-mono font-bold text-sm`}>
                {sectionColor === 'emerald' ? '+' : '-'}R$ {category.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </motion.div>
            </div>
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className={`ml-6 mt-2 space-y-1 border-l-2 ${borderColor} pl-4`}>
                  {category.transactions.map((trans, idx) => (
                    <div key={idx} className={`flex justify-between items-center p-2 ${bgColor} rounded text-sm group`}>
                      <div className="flex-1">
                        <span className="text-slate-300 text-xs">{trans.description}</span>
                        <span className="text-slate-600 text-[10px] ml-2">• {trans.date}</span>
                        {editingTransaction === trans.id && (
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="ml-3 bg-slate-800 border border-cyan-500 rounded px-2 py-1 text-xs text-white"
                          >
                            <option value="">Mover para...</option>
                            {categories.filter(c => c.category_type === (trans.type === 'income' ? 'guardian' : 'expense')).map(c => (
                              <option key={c.id} value={c.name}>{c.icon || '💀'} {c.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`${textColor} font-mono text-xs`}>
                          {sectionColor === 'emerald' ? '+' : '-'}R$ {trans.value.toFixed(2)}
                        </span>
                        {editingTransaction === trans.id ? (
                          <button
                            onClick={() => handleEditTransaction(trans)}
                            className="text-cyan-400 hover:text-cyan-300 text-xs"
                          >
                            ✓
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingTransaction(trans.id);
                                setEditCategory(trans.category);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity text-xs"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(trans)}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity text-xs"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    });
  };

  // Calcular métricas de batalha
  const battleMetrics = useMemo(() => {
    const totalRevenue = dreStructure.totalRevenue;
    const healthPercent = totalRevenue > 0 ? (dreStructure.netResult / totalRevenue) * 100 : 0;
    const defenseRating = healthPercent;
    
    let rank = { name: 'Novato', icon: '🎯', color: 'text-slate-400' };
    if (healthPercent >= 50) rank = { name: 'Guerreiro Lendário', icon: '👑', color: 'text-yellow-400' };
    else if (healthPercent >= 30) rank = { name: 'Guerreiro Elite', icon: '⚔️', color: 'text-purple-400' };
    else if (healthPercent >= 15) rank = { name: 'Guerreiro', icon: '🛡️', color: 'text-cyan-400' };
    else if (healthPercent >= 0) rank = { name: 'Recruta', icon: '🎖️', color: 'text-green-400' };
    else rank = { name: 'Em Perigo', icon: '💀', color: 'text-red-400' };

    return { totalRevenue, healthPercent, defenseRating, rank };
  }, [dreStructure]);

  return (
    <div className="space-y-6">
      {/* Botão de Exclusão em Massa */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowBulkDelete(!showBulkDelete)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-all text-red-400 font-bold"
        >
          <X className="w-4 h-4" />
          Excluir Transações em Massa
        </button>
      </div>

      {/* Modal de Filtros para Exclusão */}
      <AnimatePresence>
        {showBulkDelete && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <NeonCard glowColor="red" className="border-2 border-red-500/50">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h3 className="text-xl font-black text-red-400 uppercase">Exclusão em Massa</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs uppercase text-slate-400 font-bold mb-2 block">Categoria</label>
                  <select
                    value={deleteFilters.category}
                    onChange={(e) => setDeleteFilters({ ...deleteFilters, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-red-500 outline-none"
                  >
                    <option value="">Todas as Categorias</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>
                        {cat.icon || '📁'} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs uppercase text-slate-400 font-bold mb-2 block">Tipo</label>
                  <select
                    value={deleteFilters.type}
                    onChange={(e) => setDeleteFilters({ ...deleteFilters, type: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-red-500 outline-none"
                  >
                    <option value="">Todos os Tipos</option>
                    <option value="income">Receitas</option>
                    <option value="expense">Despesas</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs uppercase text-slate-400 font-bold mb-2 block">Data Inicial</label>
                  <input
                    type="date"
                    value={deleteFilters.startDate}
                    onChange={(e) => setDeleteFilters({ ...deleteFilters, startDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase text-slate-400 font-bold mb-2 block">Data Final</label>
                  <input
                    type="date"
                    value={deleteFilters.endDate}
                    onChange={(e) => setDeleteFilters({ ...deleteFilters, endDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-red-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <p className="text-slate-400 text-sm">
                  {transactionData.filter(trans => {
                    let matches = true;
                    if (deleteFilters.category && trans.category !== deleteFilters.category) matches = false;
                    if (deleteFilters.type && trans.type !== deleteFilters.type) matches = false;
                    if (deleteFilters.startDate && new Date(trans.date) < new Date(deleteFilters.startDate)) matches = false;
                    if (deleteFilters.endDate && new Date(trans.date) > new Date(deleteFilters.endDate)) matches = false;
                    return matches;
                  }).length} transação(ões) serão excluídas
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowBulkDelete(false);
                      setDeleteFilters({ category: '', startDate: '', endDate: '', type: '' });
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="px-6 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        Excluir Selecionadas
                      </>
                    )}
                  </button>
                </div>
              </div>
            </NeonCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battle Stats Header */}
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-cyan-500/30 rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSg2LDE4MiwyMTIsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center border-4 border-cyan-400/30 shadow-[0_0_30px_rgba(6,182,212,0.5)]">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-wider">Status de Batalha</h2>
                  <p className="text-cyan-400 text-sm font-bold flex items-center gap-2">
                    <span className="text-2xl">{battleMetrics.rank.icon}</span>
                    <span className={battleMetrics.rank.color}>{battleMetrics.rank.name}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Eficiência de Combate</p>
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                  {battleMetrics.defenseRating.toFixed(0)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* HP Bar - Receita */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-400 text-xs font-bold uppercase">HP (Receita)</span>
                  </div>
                  <span className="text-white font-black text-lg">💰 {battleMetrics.totalRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-emerald-500/30">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-400"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Damage Taken */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-red-500" />
                    <span className="text-red-400 text-xs font-bold uppercase">Dano Total</span>
                  </div>
                  <span className="text-white font-black text-lg">💀 {(battleMetrics.totalRevenue - dreStructure.netResult).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-red-500/30">
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-red-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(((battleMetrics.totalRevenue - dreStructure.netResult) / battleMetrics.totalRevenue) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Shield Power - Resultado */}
              <div className={`bg-slate-800/50 backdrop-blur-sm border ${dreStructure.netResult >= 0 ? 'border-cyan-500/30' : 'border-orange-500/30'} rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-500" />
                    <span className={`text-xs font-bold uppercase ${dreStructure.netResult >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                      Escudo {dreStructure.netResult >= 0 ? 'Ativo' : 'Quebrado'}
                    </span>
                  </div>
                  <span className={`font-black text-lg ${dreStructure.netResult >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                    {dreStructure.netResult >= 0 ? '🛡️' : '⚠️'} {Math.abs(dreStructure.netResult).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/30">
                  <motion.div
                    className={`h-full ${dreStructure.netResult >= 0 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gradient-to-r from-orange-500 to-red-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.abs(battleMetrics.healthPercent)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* DRE SIMPLIFICADO - Pessoa Física */}
      <NeonCard glowColor="cyan">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <Brain className="w-6 h-6 text-cyan-400 animate-pulse" />
            Relatório de Ganhos e Gastos
          </h3>
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 rounded-lg">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-white">Versão Simplificada</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* 💰 RECEITAS TOTAIS */}
          {dreStructure.totalRevenue > 0 && (
            <div>
              <button
                onClick={() => toggleSection('revenue')}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-2 border-emerald-500 rounded-xl hover:from-emerald-500/30 hover:to-green-500/30 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="text-white font-black text-2xl">💰 LOOT TOTAL</span>
                    <p className="text-emerald-400 text-sm font-bold">Tudo que você ganhou</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-emerald-400 font-mono font-black text-3xl drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]">
                    +R$ {dreStructure.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <motion.div animate={{ rotate: expandedSection === 'revenue' ? 180 : 0 }}>
                    <ChevronDown className="w-6 h-6 text-emerald-400" />
                  </motion.div>
                </div>
              </button>

              <AnimatePresence>
                {expandedSection === 'revenue' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-8 mt-3 space-y-2">
                      {renderCategoryAccordion(dreStructure.allRevenuesByCategory, 'emerald')}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* 💀 DESPESAS TOTAIS */}
          {dreStructure.totalExpenses > 0 && (
            <div>
              <button
                onClick={() => toggleSection('expenses')}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500 rounded-xl hover:from-red-500/30 hover:to-orange-500/30 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="text-white font-black text-2xl">💀 DANO TOTAL</span>
                    <p className="text-red-400 text-sm font-bold">Tudo que você gastou</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-red-400 font-mono font-black text-3xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                    -R$ {dreStructure.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <motion.div animate={{ rotate: expandedSection === 'expenses' ? 180 : 0 }}>
                    <ChevronDown className="w-6 h-6 text-red-400" />
                  </motion.div>
                </div>
              </button>

              <AnimatePresence>
                {expandedSection === 'expenses' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-8 mt-3 space-y-4">
                      {/* Dano Fixo (Todo Mês) */}
                      {dreStructure.totalFixedExpenses > 0 && (
                        <div>
                          <button
                            onClick={() => toggleSubsection('fixed')}
                            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-red-500/10 to-red-500/5 border-l-4 border-red-500 rounded-lg hover:from-red-500/20 hover:to-red-500/10 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/50">
                                <Shield className="w-5 h-5 text-red-400" />
                              </div>
                              <div className="text-left">
                                <span className="text-white font-bold text-base">🛡️ DANO FIXO</span>
                                <p className="text-red-400/60 text-[10px]">Todo mês - aluguel, escola, assinaturas</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-red-400 font-mono font-bold text-lg">
                                -R$ {dreStructure.totalFixedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <motion.div animate={{ rotate: expandedSubsection === 'fixed' ? 180 : 0 }}>
                                <ChevronDown className="w-5 h-5 text-slate-500" />
                              </motion.div>
                            </div>
                          </button>

                          <AnimatePresence>
                            {expandedSubsection === 'fixed' && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="ml-6 mt-2 space-y-2">
                                  {renderCategoryAccordion(dreStructure.fixedExpenses, 'red')}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Dano Variável (Frequente) */}
                      {dreStructure.totalVariableExpenses > 0 && (
                        <div>
                          <button
                            onClick={() => toggleSubsection('variable')}
                            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-l-4 border-orange-500 rounded-lg hover:from-orange-500/20 hover:to-orange-500/10 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center border border-orange-500/50">
                                <Zap className="w-5 h-5 text-orange-400" />
                              </div>
                              <div className="text-left">
                                <span className="text-white font-bold text-base">⚡ DANO VARIÁVEL</span>
                                <p className="text-orange-400/60 text-[10px]">Frequente - alimentação, transporte</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-orange-400 font-mono font-bold text-lg">
                                -R$ {dreStructure.totalVariableExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <motion.div animate={{ rotate: expandedSubsection === 'variable' ? 180 : 0 }}>
                                <ChevronDown className="w-5 h-5 text-slate-500" />
                              </motion.div>
                            </div>
                          </button>

                          <AnimatePresence>
                            {expandedSubsection === 'variable' && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="ml-6 mt-2 space-y-2">
                                  {renderCategoryAccordion(dreStructure.variableExpenses, 'red')}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Dano Crítico (Eventual) */}
                      {dreStructure.totalEventualExpenses > 0 && (
                        <div>
                          <button
                            onClick={() => toggleSubsection('eventual')}
                            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border-l-4 border-yellow-500 rounded-lg hover:from-yellow-500/20 hover:to-yellow-500/10 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-500/50">
                                <Flame className="w-5 h-5 text-yellow-400" />
                              </div>
                              <div className="text-left">
                                <span className="text-white font-bold text-base">💥 DANO CRÍTICO</span>
                                <p className="text-yellow-400/60 text-[10px]">Eventual - viagens, presentes, imprevistos</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-yellow-400 font-mono font-bold text-lg">
                                -R$ {dreStructure.totalEventualExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <motion.div animate={{ rotate: expandedSubsection === 'eventual' ? 180 : 0 }}>
                                <ChevronDown className="w-5 h-5 text-slate-500" />
                              </motion.div>
                            </div>
                          </button>

                          <AnimatePresence>
                            {expandedSubsection === 'eventual' && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="ml-6 mt-2 space-y-2">
                                  {renderCategoryAccordion(dreStructure.eventualExpenses, 'red')}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* RESULTADO FINAL */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`p-6 rounded-2xl border-4 ${dreStructure.netResult >= 0 ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500' : 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500'} mt-6 relative overflow-hidden`}
          >
            <div className="absolute inset-0">
              <div className={`absolute inset-0 ${dreStructure.netResult >= 0 ? 'bg-cyan-500/10' : 'bg-orange-500/10'} blur-3xl animate-pulse`} />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-full ${dreStructure.netResult >= 0 ? 'bg-cyan-500' : 'bg-orange-500'} flex items-center justify-center border-4 ${dreStructure.netResult >= 0 ? 'border-cyan-300' : 'border-orange-300'} shadow-[0_0_30px_rgba(6,182,212,0.6)]`}>
                    {dreStructure.netResult >= 0 ? <Trophy className="w-7 h-7 text-white" /> : <AlertTriangle className="w-7 h-7 text-white" />}
                  </div>
                  <div>
                    <span className="text-white font-black text-2xl uppercase block">
                      {dreStructure.netResult >= 0 ? '⚔️ VITÓRIA!' : '💀 DERROTA'}
                    </span>
                    <p className={`text-xs font-bold ${dreStructure.netResult >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                      Lucro ou Prejuízo do Período
                    </p>
                  </div>
                </div>
                <span className={`font-mono font-black text-5xl ${dreStructure.netResult >= 0 ? 'text-cyan-400' : 'text-orange-400'} drop-shadow-[0_0_20px_rgba(6,182,212,0.8)]`}>
                  {dreStructure.netResult >= 0 ? '+' : ''}R$ {dreStructure.netResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className={`h-3 bg-slate-900 rounded-full overflow-hidden border-2 ${dreStructure.netResult >= 0 ? 'border-cyan-500/50' : 'border-orange-500/50'}`}>
                <motion.div
                  className={`h-full ${dreStructure.netResult >= 0 ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400' : 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-400'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(Math.abs(battleMetrics.healthPercent), 100)}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </div>
              <p className="text-slate-400 text-xs mt-2 text-center font-mono">
                {dreStructure.netResult >= 0 
                  ? `🎉 Você defendeu ${battleMetrics.healthPercent.toFixed(1)}% do seu loot!` 
                  : `⚠️ Seus gastos excederam a receita em ${Math.abs(battleMetrics.healthPercent).toFixed(1)}%`
                }
              </p>
            </div>
          </motion.div>
        </div>
      </NeonCard>

      {/* Indicadores de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NeonCard glowColor="purple">
          <h4 className="text-white font-bold mb-3 uppercase text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            📊 Quanto Sobrou?
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-300 font-semibold">Você guardou:</span>
              <span className={`font-mono font-black text-lg ${dreStructure.netResult >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {battleMetrics.totalRevenue > 0 
                  ? ((dreStructure.netResult / battleMetrics.totalRevenue) * 100).toFixed(1) 
                  : 0}%
              </span>
            </div>
            <p className="text-slate-400 text-xs text-center">
              {dreStructure.netResult >= 0 
                ? '✅ Você conseguiu guardar parte do que ganhou!' 
                : '⚠️ Seus gastos foram maiores que seus ganhos neste período'}
            </p>
          </div>
        </NeonCard>

        <NeonCard glowColor="purple">
          <h4 className="text-white font-bold mb-3 uppercase text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            🛡️ Status de Defesa
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Classificação</span>
              {dreStructure.netResult >= 0 ? (
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-bold">✓ VITORIOSO</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 font-bold">⚠ DERROTADO</span>
                </div>
              )}
            </div>
          </div>
        </NeonCard>
      </div>
    </div>
  );
}