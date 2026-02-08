import { useState, useMemo } from 'react';
import {
  Wallet, TrendingUp, Zap, Shield, AlertTriangle,
  Crosshair, Plus, Flame, Swords, Radar, Database, X, Settings,
  FileText, PieChart, TrendingDown, Calendar, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import BankStatementImporter from '../components/BankStatementImporter';
import BudgetAllocatorModal from '../components/BudgetAllocatorModal';
import AccountManagerModal from '../components/AccountManagerModal';
import InventoryHUD from '../components/InventoryHUD';
import AIBudgetGenerator from '../components/AIBudgetGenerator';
import CashFlowPredictor from '../components/CashFlowPredictor';
import BattleBudgetPanel from '../components/BattleBudgetPanel';

import DREAccordion from '../components/DREAccordion';
import IntegratedBudgetScheduler from '../components/IntegratedBudgetScheduler';
import BehavioralIntelligenceReports from '../components/BehavioralIntelligenceReports';
import { BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { format, addDays, subDays, startOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- COMPONENTES UI INTERNOS ---

const NeonCard = ({ children, glowColor = 'cyan', className = '' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/80',
    green: 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-slate-900/80',
    red: 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)] bg-slate-900/80',
    purple: 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-slate-900/80',
    gold: 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)] bg-slate-900/80',
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden ${colors[glowColor] || colors.cyan} ${className}`}>
      {children}
    </div>
  );
};

// --- COMPONENTES DE LÓGICA (MÓDULOS) ---

const ManaPool = ({ totalMana, allocatedMana, onEquip, onManageAccounts }) => {
  const availableMana = totalMana - allocatedMana;
  const isCritical = availableMana < 0;
  const usagePercent = totalMana > 0 ? Math.min((allocatedMana / totalMana) * 100, 100) : 0;

  return (
    <div className="relative text-center py-6 sm:py-8 px-4">
      <div className="absolute inset-0 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />

      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="relative z-10"
      >
        <h2 className="text-cyan-400 text-[10px] sm:text-xs font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-2">
          MANA DISPONÍVEL (Livre)
        </h2>
        <div className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black ${isCritical ? 'text-red-500' : 'text-white'} drop-shadow-[0_0_25px_rgba(0,255,255,0.3)]`}>
          R$ {availableMana.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>

        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-xs sm:text-sm font-mono text-slate-400">
          <span>Total: R$ {totalMana.toLocaleString()}</span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span>Equipado: R$ {allocatedMana.toLocaleString()}</span>
        </div>

        {/* Barra de Alocação */}
        <div className="mt-4 sm:mt-6 max-w-md mx-auto h-2 sm:h-3 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${isCritical ? 'bg-red-500' : 'bg-cyan-400'}`}
            initial={{ width: 0 }}
            animate={{ width: `${usagePercent}%` }}
            transition={{ duration: 1 }}
          />
        </div>
      </motion.div>

      <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
        <button
          onClick={onManageAccounts}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 border border-slate-600 text-slate-300 text-sm sm:text-base font-bold rounded-xl hover:bg-slate-700 hover:text-white transition-all min-h-[52px]"
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">GERENCIAR CONTAS</span>
          <span className="sm:hidden">CONTAS</span>
        </button>
        <button
          onClick={onEquip}
          className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 text-sm sm:text-base font-bold rounded-xl hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] min-h-[52px]"
        >
          <Swords className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">DISTRIBUIR ORÇAMENTO</span>
          <span className="sm:hidden">ORÇAMENTO</span>
        </button>
      </div>
    </div>
  );
};

const CreditCardOverheat = ({ cards }) => {
  return (
    <NeonCard glowColor="red" className="h-full flex flex-col">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 animate-pulse" />
        <h3 className="text-sm sm:text-base lg:text-lg font-black text-white uppercase tracking-wider">
          Sobrecarga (Crédito)
        </h3>
      </div>

      <div className="space-y-4 sm:space-y-6 flex-1">
        {cards.map(card => {
          const usagePercent = (card.currentInvoice / card.limit) * 100;
          const isCritical = usagePercent > 90;
          const isHigh = usagePercent > 70;

          return (
            <div key={card.id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white font-bold">{card.name}</span>
                <span className={isCritical ? 'text-red-500 font-black' : isHigh ? 'text-orange-400' : 'text-green-400'}>
                  {usagePercent.toFixed(0)}% {isCritical && 'CRÍTICO'}
                </span>
              </div>

              <div className="h-5 bg-gray-900 rounded-sm overflow-hidden border border-gray-700 relative">
                <div className="absolute inset-0 flex justify-between px-1 z-10">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <div key={i} className="w-px h-full bg-black/40" />)}
                </div>
                <motion.div
                  className={`h-full ${isCritical
                    ? 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse'
                    : 'bg-gradient-to-r from-green-600 via-yellow-500 to-orange-500'
                    }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(usagePercent, 100)}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                <span>Fatura: R$ {card.currentInvoice.toLocaleString()}</span>
                <span>Max: R$ {card.limit.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </NeonCard>
  );
};

// Componente de Formulário Rápido de Transação
const QuickTransactionForm = ({ onClose, budgetCategories }) => {
  const [formData, setFormData] = useState({
    description: '',
    value: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    category: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (type) => {
    if (!formData.value || !formData.description || !formData.category) {
      alert('Preencha todos os campos obrigatórios: descrição, valor e categoria');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await base44.functions.invoke('createTransaction', {
        date: formData.date,
        value: parseFloat(formData.value),
        description: formData.description,
        category: formData.category || 'Sem Categoria',
        type
      });

      if (response.data && response.data.success) {
        queryClient.invalidateQueries(['finTransactions']);
        queryClient.invalidateQueries(['budgetCategories']);
        queryClient.invalidateQueries(['accounts']);
        onClose();
      }
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      alert('Erro ao salvar transação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 mt-2">
      <div>
        <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">Descrição</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:border-cyan-500 outline-none transition-colors"
          placeholder="Ex: Almoço no restaurante"
        />
      </div>

      <div>
        <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">Valor do Impacto</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">R$</span>
          <input
            type="number"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-3xl text-white font-mono focus:border-cyan-500 outline-none transition-colors"
            placeholder="0.00"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">Categoria *</label>
        <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent className="z-[99999] bg-slate-900 border-slate-700">
            {budgetCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.name} className="text-white hover:bg-slate-800">
                {cat.icon || '📁'} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">Data</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:border-cyan-500 outline-none transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleSubmit('expense')}
          disabled={isSubmitting}
          className="group py-4 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500 hover:border-red-500 transition-all disabled:opacity-50"
        >
          <p className="text-red-500 font-black text-lg group-hover:text-white">DANO</p>
          <p className="text-red-400/60 text-xs uppercase group-hover:text-white/80">Despesa</p>
        </button>
        <button
          onClick={() => handleSubmit('income')}
          disabled={isSubmitting}
          className="group py-4 bg-green-500/10 border border-green-500/30 rounded-xl hover:bg-green-500 hover:border-green-500 transition-all disabled:opacity-50"
        >
          <p className="text-green-500 font-black text-lg group-hover:text-white">LOOT</p>
          <p className="text-green-400/60 text-xs uppercase group-hover:text-white/80">Receita</p>
        </button>
      </div>
    </div>
  );
};

// Componente DRE Detalhado
const DREReport = ({ categories, transactionData, dreData }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [deleteFilters, setDeleteFilters] = useState({ category: '', startDate: '', endDate: '', type: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDeleteTransaction = async (trans) => {
    if (!confirm(`Deseja realmente excluir "${trans.description}"?`)) return;

    try {
      // Excluir da entidade FinTransaction
      await base44.entities.FinTransaction.delete(trans.id);

      queryClient.invalidateQueries(['finTransactions']);
      queryClient.invalidateQueries(['budgetCategories']);
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      alert('Erro ao excluir transação. Tente novamente.');
    }
  };

  const revenueCategories = categories.filter(c => c.category_type === 'guardian');
  const expenseCategories = categories.filter(c => c.category_type === 'expense');

  const getCategoryTotal = (categoryName, type) => {
    return transactionData
      .filter(t => t.category === categoryName && t.type === type)
      .reduce((sum, t) => sum + t.value, 0);
  };

  const getCategoryTransactions = (categoryName) => {
    return transactionData.filter(t => t.category === categoryName);
  };

  const handleEditTransaction = async (trans) => {
    if (!editCategory || editCategory === trans.category) {
      setEditingTransaction(null);
      return;
    }

    try {
      // Atualizar categoria na FinTransaction
      await base44.entities.FinTransaction.update(trans.id, {
        category: editCategory
      });

      queryClient.invalidateQueries(['finTransactions']);
      queryClient.invalidateQueries(['budgetCategories']);

      setEditingTransaction(null);
      setEditCategory('');
    } catch (error) {
      console.error('Erro ao editar transação:', error);
      alert('Erro ao mover transação. Tente novamente.');
    }
  };

  const handleBulkDelete = async () => {
    // Filtrar transações baseado nos critérios
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
    queryClient.invalidateQueries(['budgetCategories']);

    if (failCount === 0) {
      alert(`✓ ${successCount} transação(ões) excluída(s) com sucesso!`);
    } else {
      alert(`Parcialmente concluído:\n✓ ${successCount} excluída(s)\n✗ ${failCount} falharam`);
    }

    setShowBulkDelete(false);
    setDeleteFilters({ category: '', startDate: '', endDate: '', type: '' });
    setIsDeleting(false);
  };

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

      {/* Resumo DRE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <NeonCard glowColor="green" className="border-l-4 border-emerald-500 p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-emerald-400">Receitas</h3>
          </div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2">
            R$ {dreData.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </NeonCard>

        <NeonCard glowColor="red" className="border-l-4 border-red-500 p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-red-400">Despesas</h3>
          </div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2">
            R$ {dreData.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </NeonCard>

        <NeonCard glowColor={dreData.result >= 0 ? 'cyan' : 'red'} className={`border-l-4 p-4 sm:p-6 ${dreData.result >= 0 ? 'border-blue-500' : 'border-orange-500'}`}>
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            <h3 className="text-sm sm:text-base md:text-lg font-bold">Resultado</h3>
          </div>
          <div className={`text-2xl sm:text-3xl md:text-4xl font-black mb-2 ${dreData.result >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
            R$ {dreData.result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </NeonCard>
      </div>

      {/* DRE Estruturado */}
      <NeonCard glowColor="cyan" className="p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white mb-4 sm:mb-6 uppercase tracking-wider">
          DRE - Demonstração do Resultado
        </h3>

        {/* RECEITAS */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-emerald-500/10 border-l-4 border-emerald-500 p-3 sm:p-4 mb-3 sm:mb-4">
            <h4 className="text-base sm:text-lg md:text-xl font-bold text-emerald-400 uppercase">RECEITAS</h4>
          </div>

          <div className="space-y-2">
            {revenueCategories.length > 0 ? revenueCategories.map(category => {
              const total = getCategoryTotal(category.name, 'income');
              const transactions = getCategoryTransactions(category.name);
              const isExpanded = expandedCategory === category.id;

              return total > 0 ? (
                <div key={category.id}>
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{category.icon || '💰'}</span>
                      <span className="text-white font-semibold">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-mono font-bold">
                        R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                        <TrendingDown className="w-4 h-4 text-slate-500" />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-8 mt-2 space-y-2 border-l-2 border-emerald-500/30 pl-4">
                          {transactions.map((trans, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-emerald-950/20 rounded text-sm group">
                              <div className="flex-1">
                                <span className="text-slate-300">{trans.description} • {trans.date}</span>
                                {editingTransaction === trans.id && (
                                  <select
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                    className="ml-3 bg-slate-800 border border-emerald-500 rounded px-2 py-1 text-xs text-white"
                                  >
                                    <option value="">Mover para...</option>
                                    {categories.filter(c => c.category_type === 'guardian').map(c => (
                                      <option key={c.id} value={c.name}>{c.icon || '💰'} {c.name}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-mono">+R$ {trans.value.toFixed(2)}</span>
                                {editingTransaction === trans.id ? (
                                  <button
                                    onClick={() => handleEditTransaction(trans)}
                                    className="text-emerald-400 hover:text-emerald-300"
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
                                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTransaction(trans)}
                                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
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
              ) : null;
            }) : (
              <p className="text-slate-500 text-center py-4">Nenhuma receita registrada</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t-2 border-emerald-500/50 flex justify-between px-4">
            <span className="text-white font-bold uppercase">Total de Receitas</span>
            <span className="text-emerald-400 font-mono font-black text-xl">
              R$ {dreData.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* DESPESAS */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-red-500/10 border-l-4 border-red-500 p-3 sm:p-4 mb-3 sm:mb-4">
            <h4 className="text-base sm:text-lg md:text-xl font-bold text-red-400 uppercase">(-) DESPESAS</h4>
          </div>

          <div className="space-y-2">
            {expenseCategories.length > 0 ? expenseCategories.map(category => {
              const total = getCategoryTotal(category.name, 'expense');
              const transactions = getCategoryTransactions(category.name);
              const isExpanded = expandedCategory === category.id;

              return total > 0 ? (
                <div key={category.id}>
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{category.icon || '💀'}</span>
                      <span className="text-white font-semibold">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 font-mono font-bold">
                        (R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                      </span>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                        <TrendingDown className="w-4 h-4 text-slate-500" />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-8 mt-2 space-y-2 border-l-2 border-red-500/30 pl-4">
                          {transactions.map((trans, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-red-950/20 rounded text-sm group">
                              <div className="flex-1">
                                <span className="text-slate-300">{trans.description} • {trans.date}</span>
                                {editingTransaction === trans.id && (
                                  <select
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                    className="ml-3 bg-slate-800 border border-red-500 rounded px-2 py-1 text-xs text-white"
                                  >
                                    <option value="">Mover para...</option>
                                    {categories.filter(c => c.category_type === 'expense').map(c => (
                                      <option key={c.id} value={c.name}>{c.icon || '💀'} {c.name}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-red-400 font-mono">-R$ {trans.value.toFixed(2)}</span>
                                {editingTransaction === trans.id ? (
                                  <button
                                    onClick={() => handleEditTransaction(trans)}
                                    className="text-red-400 hover:text-red-300"
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
                                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTransaction(trans)}
                                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
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
              ) : null;
            }) : (
              <p className="text-slate-500 text-center py-4">Nenhuma despesa registrada</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t-2 border-red-500/50 flex justify-between px-4">
            <span className="text-white font-bold uppercase">Total de Despesas</span>
            <span className="text-red-400 font-mono font-black text-xl">
              (R$ {dreData.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
            </span>
          </div>
        </div>

        {/* RESULTADO FINAL */}
        <div className={`p-4 sm:p-6 rounded-xl border-2 ${dreData.result >= 0 ? 'bg-blue-500/10 border-blue-500' : 'bg-orange-500/10 border-orange-500'}`}>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-4">
            <span className="text-white font-black text-base sm:text-xl md:text-2xl uppercase">RESULTADO</span>
            <span className={`font-mono font-black text-2xl sm:text-3xl md:text-4xl ${dreData.result >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
              {dreData.result >= 0 ? '+' : ''}R$ {dreData.result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </NeonCard>
    </div>
  );
};

// Componente Balanço Patrimonial Detalhado
const BalanceSheetReport = ({ assets, debts, balanceSheetData, accounts }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  const assetsByType = assets.reduce((acc, asset) => {
    const type = asset.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(asset);
    return acc;
  }, {});

  // Adicionar contas bancárias às categorias corretas
  if (accounts && accounts.length > 0) {
    accounts.forEach(account => {
      const accountType = account.type?.toLowerCase() || '';
      let category = 'cash'; // padrão

      if (accountType.includes('investimento') || accountType.includes('investment') || accountType.includes('cofrinho')) {
        category = 'investment';
      } else if (accountType.includes('corrente') || accountType.includes('poupança') || accountType.includes('savings')) {
        category = 'cash';
      }

      if (!assetsByType[category]) assetsByType[category] = [];
      assetsByType[category].push({
        id: account.id,
        name: account.name,
        value: account.balance || 0,
        type: category,
        isAccount: true,
        icon: account.icon,
        color: account.color
      });
    });
  }

  const debtsByType = debts.reduce((acc, debt) => {
    const type = debt.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(debt);
    return acc;
  }, {});

  const assetTypeLabels = {
    cash: '💰 Caixa e Equivalentes',
    investment: '📈 Investimentos',
    real_estate: '🏠 Imóveis',
    vehicle: '🚗 Veículos'
  };

  const debtTypeLabels = {
    loan: '🏦 Empréstimos',
    credit_card: '💳 Cartão de Crédito',
    financing: '🏡 Financiamentos',
    other: '📋 Outros'
  };

  return (
    <div className="space-y-6">
      <NeonCard glowColor="purple" className="p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white mb-4 sm:mb-6 uppercase tracking-wider">
          Balanço Patrimonial
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* ATIVOS */}
          <div>
            <div className="bg-emerald-500/10 border-l-4 border-emerald-500 p-3 sm:p-4 mb-3 sm:mb-4">
              <h4 className="text-base sm:text-lg md:text-xl font-bold text-emerald-400 uppercase">ATIVO</h4>
            </div>

            <div className="space-y-2">
              {Object.keys(assetsByType).length > 0 ? Object.entries(assetsByType)
                .sort(([typeA], [typeB]) => {
                  // Ordem de liquidez: cash -> investment -> vehicle -> real_estate
                  const liquidityOrder = { cash: 1, investment: 2, vehicle: 3, real_estate: 4 };
                  const orderA = liquidityOrder[typeA] || 99;
                  const orderB = liquidityOrder[typeB] || 99;
                  return orderA - orderB;
                })
                .map(([type, typeAssets]) => {
                  const total = typeAssets.reduce((sum, a) => sum + a.value, 0);
                  const isExpanded = expandedSection === `asset_${type}`;

                  return (
                    <div key={type}>
                      <button
                        onClick={() => setExpandedSection(isExpanded ? null : `asset_${type}`)}
                        className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all"
                      >
                        <span className="text-white font-semibold">{assetTypeLabels[type] || type}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-400 font-mono font-bold">
                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                            <TrendingDown className="w-4 h-4 text-slate-500" />
                          </motion.div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-8 mt-2 space-y-2 border-l-2 border-emerald-500/30 pl-4">
                              {typeAssets.map(asset => (
                                <div key={asset.id} className="flex justify-between p-2 bg-emerald-950/20 rounded text-sm">
                                  <span className="text-slate-300 flex items-center gap-2">
                                    {asset.isAccount && asset.icon && <span>{asset.icon}</span>}
                                    {asset.name}
                                  </span>
                                  <span className="text-emerald-400 font-mono">R$ {asset.value.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }) : (
                <p className="text-slate-500 text-center py-4">Nenhum ativo registrado</p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t-2 border-emerald-500/50 flex justify-between px-4">
              <span className="text-white font-bold uppercase">Total do Ativo</span>
              <span className="text-emerald-400 font-mono font-black text-xl">
                R$ {balanceSheetData.assets.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* PASSIVOS */}
          <div>
            <div className="bg-red-500/10 border-l-4 border-red-500 p-3 sm:p-4 mb-3 sm:mb-4">
              <h4 className="text-base sm:text-lg md:text-xl font-bold text-red-400 uppercase">PASSIVO</h4>
            </div>

            <div className="space-y-2">
              {Object.keys(debtsByType).length > 0 ? Object.entries(debtsByType)
                .sort(([typeA], [typeB]) => {
                  // Ordem de exigibilidade: curto prazo primeiro
                  const exigibilityOrder = { credit_card: 1, loan: 2, financing: 3, other: 4 };
                  const orderA = exigibilityOrder[typeA] || 99;
                  const orderB = exigibilityOrder[typeB] || 99;
                  return orderA - orderB;
                })
                .map(([type, typeDebts]) => {
                  const total = typeDebts.reduce((sum, d) => sum + d.outstanding_balance, 0);
                  const isExpanded = expandedSection === `debt_${type}`;

                  return (
                    <div key={type}>
                      <button
                        onClick={() => setExpandedSection(isExpanded ? null : `debt_${type}`)}
                        className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all"
                      >
                        <span className="text-white font-semibold">{debtTypeLabels[type] || type}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-red-400 font-mono font-bold">
                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                            <TrendingDown className="w-4 h-4 text-slate-500" />
                          </motion.div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-8 mt-2 space-y-2 border-l-2 border-red-500/30 pl-4">
                              {typeDebts.map(debt => (
                                <div key={debt.id} className="flex justify-between p-2 bg-red-950/20 rounded text-sm">
                                  <span className="text-slate-300">{debt.creditor}</span>
                                  <span className="text-red-400 font-mono">R$ {debt.outstanding_balance.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }) : (
                <p className="text-slate-500 text-center py-4">Nenhum passivo registrado</p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t-2 border-red-500/50 flex justify-between px-4">
              <span className="text-white font-bold uppercase">Total do Passivo</span>
              <span className="text-red-400 font-mono font-black text-xl">
                R$ {balanceSheetData.liabilities.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* PATRIMÔNIO LÍQUIDO */}
        <div className="mt-6 sm:mt-8 p-4 sm:p-6 rounded-xl border-2 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-purple-500">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-4">
            <span className="text-white font-black text-base sm:text-xl md:text-2xl uppercase">PATRIMÔNIO LÍQUIDO</span>
            <span className="text-purple-400 font-mono font-black text-2xl sm:text-3xl md:text-4xl">
              R$ {balanceSheetData.equity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-2">Ativo Total - Passivo Total</p>
        </div>
      </NeonCard>

      <div className="flex justify-center px-4">
        <Link to={createPageUrl('NetWorth')} className="w-full sm:w-auto">
          <button className="w-full px-6 sm:px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm sm:text-base font-bold rounded-xl transition-all flex items-center justify-center gap-2 sm:gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)] min-h-[52px]">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">Gerenciar Ativos e Passivos na Arena</span>
            <span className="sm:hidden">Gerenciar na Arena</span>
          </button>
        </Link>
      </div>
    </div>
  );
};

const CashFlowRadar = ({ currentBalance, averageSpending, fixedExpenses, alerts }) => {
  // Gera dados de projeção para o gráfico
  const chartData = useMemo(() => {
    const data = [];
    let balance = currentBalance;
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      const dayNum = parseInt(format(date, 'd'));

      // Aplica gasto médio diário (Simulação de Variáveis)
      balance -= averageSpending;

      // Aplica Despesas Fixas (Mock simples: dia 5 e 20 tem contas)
      if (dayNum === 5) balance -= 1200; // Aluguel fictício
      if (dayNum === 10) balance -= 400; // Luz/Net fictício

      // Aplica Renda Prevista (Mock simples: dia 5 salário)
      if (dayNum === 5) balance += 3500;

      data.push({
        day: format(date, 'dd/MM'),
        balance: Math.round(balance),
        critical: balance < 0
      });
    }
    return data;
  }, [currentBalance, averageSpending]);

  const minBalance = Math.min(...chartData.map(d => d.balance));
  const isDanger = minBalance < 0;

  return (
    <NeonCard glowColor={isDanger ? 'red' : 'purple'} className="h-full min-h-[350px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Crosshair className={`w-6 h-6 ${isDanger ? 'text-red-500' : 'text-purple-400'} animate-[spin_10s_linear_infinite]`} />
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Radar Tático (30d)</h3>
            <p className="text-xs text-slate-400">Baseado na média diária de R$ {averageSpending.toFixed(0)}</p>
          </div>
        </div>
        {alerts.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-xs font-bold animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            {alerts.length} ALERTA(S)
          </div>
        )}
      </div>

      {/* Lista de Alertas */}
      {alerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {alerts.map((alert, idx) => (
            <div key={idx} className="text-xs bg-red-900/20 border-l-2 border-red-500 p-2 text-red-200">
              <strong className="block">{alert.message}</strong>
              <span className="opacity-70">{alert.action}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isDanger ? "#ef4444" : "#c084fc"} stopOpacity={0.5} />
                <stop offset="95%" stopColor={isDanger ? "#ef4444" : "#c084fc"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval={4} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: isDanger ? '1px solid #ef4444' : '1px solid #c084fc', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value) => [`R$ ${value}`, 'Projeção']}
            />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={isDanger ? "#ef4444" : "#c084fc"}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorBalance)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </NeonCard>
  );
};

// --- COMPONENTE PRINCIPAL (CONTROLLER) ---

export default function FinanceHub() {
  const queryClient = useQueryClient();
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Date range filter
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // 1. FETCH DE DADOS (REAL - Base44) - COM FILTRO POR USUÁRIO
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentUser?.email],
    queryFn: () => base44.entities.Account.filter({ created_by: currentUser.email }),
    enabled: !!currentUser?.email
  });

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories', currentUser?.email],
    queryFn: () => base44.entities.BudgetCategory.filter({ created_by: currentUser.email }),
    enabled: !!currentUser?.email
  });

  const { data: netWorthData } = useQuery({
    queryKey: ['netWorthSummary', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return { assets: [], debts: [], accounts: [] };

      const [assetsResponse, debtsResponse, accountsResponse] = await Promise.all([
        base44.entities.Asset.filter({ created_by: currentUser.email }),
        base44.entities.Debt.filter({ created_by: currentUser.email }),
        base44.entities.Account.filter({ created_by: currentUser.email })
      ]);
      return {
        assets: assetsResponse || [],
        debts: debtsResponse || [],
        accounts: accountsResponse || []
      };
    },
    enabled: !!currentUser?.email
  });

  const { data: finTransactions = [] } = useQuery({
    queryKey: ['finTransactions', currentUser?.email],
    queryFn: () => base44.entities.FinTransaction.filter({ created_by: currentUser.email }, '-created_date'),
    enabled: !!currentUser?.email
  });

  const { data: financialProfile } = useQuery({
    queryKey: ['financialProfile', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const profiles = await base44.entities.FinancialProfile.filter({ created_by: currentUser.email });
      return profiles[0];
    },
    enabled: !!currentUser?.email
  });

  // 1.5. PROCESSAMENTO DE DADOS DE CRÉDITO (Overheat Logic)
  const creditCards = useMemo(() => {
    return (netWorthData?.debts || [])
      .filter(debt => debt.type === 'credit_card' || debt.name?.toLowerCase().includes('cartão'))
      .map(debt => ({
        id: debt.id,
        name: debt.name,
        currentInvoice: debt.outstanding_balance || 0,
        limit: debt.total_limit || debt.outstanding_balance || 1 // Evitar divisão por zero
      }));
  }, [netWorthData]);

  // CORREÇÃO: Usar budgets reais das categorias, não valores hardcoded
  const envelopes = useMemo(() => {
    return budgetCategories
      .filter(cat => cat.category_type === 'expense')
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        allocated_amount: cat.budget || 0
      }));
  }, [budgetCategories]);

  // 30 dias de transações para cálculo de média
  const recentTransactions = Array.from({ length: 30 }).map((_, i) => ({
    amount: Math.random() * 100, // Gasto aleatório diário entre 0 e 100
    date: subDays(new Date(), i)
  }));

  // 2. LÓGICA DE NEGÓCIO (Núcleo Estratégico)

  // Total Mana (Liquidez imediata apenas: Contas Correntes e Investimentos Líquidos)
  // Filtramos 'savings' para preservar a reserva de emergência (não é mana jogável)
  const totalMana = useMemo(() => {
    return accounts
      .filter(acc => acc.type !== 'savings')
      .reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [accounts]);

  // Mana Alocada (Somatório dos orçamentos mensais para o mês atual)
  const currentMonth = format(new Date(), 'yyyy-MM');
  const allocatedMana = useMemo(() => {
    return budgetCategories
      .filter(cat =>
        cat.category_type === 'expense' &&
        (!cat.budget_month || cat.budget_month === currentMonth)
      )
      .reduce((sum, cat) => sum + (cat.budget || 0), 0);
  }, [budgetCategories, currentMonth]);

  // Média de Gastos Diários (Para projeção - Baseada nas transações reais recentes)
  const averageDailySpending = useMemo(() => {
    if (finTransactions.length === 0) return 0;
    const last30Days = subDays(new Date(), 30);
    const recentExpenses = finTransactions.filter(t => {
      const tDate = parseISO(t.date);
      return t.type === 'expense' && tDate >= last30Days;
    });
    const totalSpent = recentExpenses.reduce((sum, t) => sum + Math.abs(t.value), 0);
    return totalSpent / 30;
  }, [finTransactions]);

  // Geração de Alertas
  const alerts = [];
  if (totalMana - allocatedMana < 0) {
    alerts.push({
      message: 'MANA NEGATIVA',
      action: 'Você alocou mais dinheiro do que possui.'
    });
  }

  const criticalCards = creditCards.filter(c => (c.currentInvoice / c.limit) >= 0.9);
  if (criticalCards.length > 0) {
    alerts.push({
      message: 'SOBRECARGA TÉRMICA',
      action: `${criticalCards.length} cartão(ões) acima de 90% do limite.`
    });
  }

  // Handler para importação de transações
  const handleImportTransactions = (importedTransactions) => {
    console.log('Transações importadas:', importedTransactions);
    // TODO: Integrar com backend para salvar transações
    // Atualizar contas e envelopes
    alert(`${importedTransactions.length} transações importadas com sucesso! 🎉`);
  };

  // Handler para salvar distribuição de orçamento
  const handleSaveBudget = async (updatedEnvelopes) => {
    // Atualizar os budgets das categorias no banco
    for (const env of updatedEnvelopes) {
      await base44.entities.BudgetCategory.update(env.id, {
        budget: env.allocated_amount
      });
    }

    queryClient.invalidateQueries(['budgetCategories']);
    setIsBudgetOpen(false);
    toast.success('💰 Orçamentos atualizados!');
  };

  // === LÓGICA DRE E BALANÇO (IFRS 18) ===
  const transactionData = useMemo(() => {
    // Usar FinTransaction como fonte única de verdade para DRE
    const finTransList = finTransactions.map(ft => ({
      id: ft.id,
      description: ft.description,
      value: Math.abs(ft.value),
      date: ft.date,
      category: ft.category || 'Sem Categoria',
      type: ft.type
    }));

    // Filtrar por período selecionado
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);

      return finTransList.filter(trans => {
        if (!trans.date) return false;
        const transDate = parseISO(trans.date);
        const isInPeriod = isWithinInterval(transDate, { start, end });

        // Excluir transferências internas (Fatos Permutativos)
        const isInternalTransfer =
          trans.category === 'Resgate Cofre' ||
          trans.category === 'Aplicação Cofre' ||
          trans.category?.toLowerCase().includes('resgate') ||
          trans.category?.toLowerCase().includes('transferência') ||
          trans.category?.toLowerCase().includes('transferencia');

        return isInPeriod && !isInternalTransfer;
      });
    } catch (error) {
      console.error('Erro ao filtrar transações por data:', error);
      return finTransList;
    }
  }, [finTransactions, startDate, endDate]);

  const dreData = useMemo(() => {
    const revenue = transactionData
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.value, 0);

    const expenses = transactionData
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.value, 0);

    const result = revenue - expenses;
    const efficiency = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0;

    return { revenue, expenses, result, efficiency };
  }, [transactionData]);

  const balanceSheetData = useMemo(() => {
    const assetsValue = (netWorthData?.assets || []).reduce((sum, a) => sum + a.value, 0);
    const totalAssets = assetsValue;
    const liabilities = (netWorthData?.debts || []).reduce((sum, d) => sum + d.outstanding_balance, 0);
    const equity = totalAssets - liabilities;

    return { assets: totalAssets, liabilities, equity, assetsValue };
  }, [netWorthData]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-32">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-4"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Radar className="w-6 h-6 text-yellow-400 animate-[spin_8s_linear_infinite]" />
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
            NÚCLEO <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">ESTRATÉGICO</span>
          </h1>
        </div>
        <p className="text-slate-400 text-sm uppercase tracking-widest flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" />
          Análise Contábil e Inteligência de Recursos
        </p>
      </motion.div>

      {/* Quick Actions Bar - Filtro de Período */}
      <NeonCard glowColor="cyan" className="p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-bold text-xs sm:text-sm uppercase tracking-wider">Período</span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold whitespace-nowrap">De:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 sm:py-2 text-white text-xs sm:text-sm focus:border-cyan-500 outline-none transition-colors flex-1 min-h-[48px] sm:min-h-[40px]"
              />
            </div>

            <div className="flex items-center gap-2 flex-1">
              <label className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold whitespace-nowrap">Até:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    queryClient.invalidateQueries(['finTransactions']);
                    queryClient.invalidateQueries(['scheduledTransactions']);
                    toast.success('📊 Filtro aplicado!');
                  }
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 sm:py-2 text-white text-xs sm:text-sm focus:border-cyan-500 outline-none transition-colors flex-1 min-h-[48px] sm:min-h-[40px]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                setEndDate(format(new Date(), 'yyyy-MM-dd'));
              }}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-[10px] sm:text-xs font-bold rounded-lg transition-all min-h-[40px]"
            >
              Este Mês
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setStartDate(format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'));
                setEndDate(format(now, 'yyyy-MM-dd'));
              }}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-[10px] sm:text-xs font-bold rounded-lg transition-all min-h-[40px]"
            >
              Este Ano
            </button>
          </div>
        </div>
      </NeonCard>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-2 sm:p-3">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-transparent h-auto">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:text-white data-[state=active]:border-cyan-500/50 border border-transparent hover:border-cyan-500/30 transition-all rounded-xl px-2 py-2.5 sm:px-3 sm:py-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-[56px] sm:min-h-[44px]"
            >
              <Radar className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-center leading-tight">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger
              value="balance"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/30 data-[state=active]:to-pink-500/30 data-[state=active]:text-white data-[state=active]:border-purple-500/50 border border-transparent hover:border-purple-500/30 transition-all rounded-xl px-2 py-2.5 sm:px-3 sm:py-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-[56px] sm:min-h-[44px]"
            >
              <Shield className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-center leading-tight">Balanço</span>
            </TabsTrigger>
            <TabsTrigger
              value="dre"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/30 data-[state=active]:to-purple-500/30 data-[state=active]:text-white data-[state=active]:border-blue-500/50 border border-transparent hover:border-blue-500/30 transition-all rounded-xl px-2 py-2.5 sm:px-3 sm:py-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-[56px] sm:min-h-[44px]"
            >
              <TrendingUp className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-center leading-tight">DRE</span>
            </TabsTrigger>
            <TabsTrigger
              value="intelligence"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/30 data-[state=active]:to-orange-500/30 data-[state=active]:text-white data-[state=active]:border-amber-500/50 border border-transparent hover:border-amber-500/30 transition-all rounded-xl px-2 py-2.5 sm:px-3 sm:py-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-[56px] sm:min-h-[44px]"
            >
              <BrainCircuit className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-center leading-tight">Inteligência</span>
            </TabsTrigger>
            <TabsTrigger
              value="operations"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500/30 data-[state=active]:to-emerald-500/30 data-[state=active]:text-white data-[state=active]:border-green-500/50 border border-transparent hover:border-green-500/30 transition-all rounded-xl px-2 py-2.5 sm:px-3 sm:py-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-[56px] sm:min-h-[44px] col-span-2 sm:col-span-1"
            >
              <Wallet className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-center leading-tight whitespace-nowrap">
                <span className="hidden lg:inline">Base de Operações</span>
                <span className="lg:hidden">Operações</span>
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB: Dashboard Tático */}
        <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">

          {/* Módulo 1: Mana Pool */}
          <ManaPool
            totalMana={totalMana}
            allocatedMana={allocatedMana}
            onEquip={() => setIsBudgetOpen(true)}
            onManageAccounts={() => setIsAccountsOpen(true)}
          />

          {/* Cash Flow Predictor */}
          <CashFlowPredictor />

          {/* AI Budget Generator */}
          {transactionData.length > 10 && (
            <AIBudgetGenerator
              transactionHistory={transactionData}
              currentProfile={financialProfile}
              onGenerate={(result) => {
                console.log('Orçamento gerado:', result);
              }}
            />
          )}

          {/* Módulo 4: Neural Data Link */}
          <NeonCard glowColor="purple" className="cursor-pointer hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] transition-all group">
            <button
              onClick={() => setIsImporterOpen(true)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
                    <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center border-2 border-white/20">
                      <Database className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                      Neural Data Link
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Importe extratos bancários (.PDF, .CSV, .OFX) com análise automática
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-purple-400 group-hover:text-purple-300 transition-colors">
                  <span className="text-sm font-bold uppercase tracking-wider">Conectar</span>
                  <Zap className="w-5 h-5 animate-pulse" />
                </div>
              </div>
            </button>
          </NeonCard>

          {/* Quick Links to Other Modules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Link to={createPageUrl('NetWorth')}>
              <NeonCard glowColor="green" className="cursor-pointer hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-green-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-white font-bold text-sm sm:text-base truncate">Arena de Batalha</h4>
                      <p className="text-[10px] sm:text-xs text-slate-400 truncate">Ativos & Dívidas</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                </div>
              </NeonCard>
            </Link>

            <Link to={createPageUrl('CommandCenter')}>
              <NeonCard glowColor="cyan" className="cursor-pointer hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <Crosshair className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-white font-bold text-sm sm:text-base truncate">Centro de Comando</h4>
                      <p className="text-[10px] sm:text-xs text-slate-400 truncate">Análises</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 flex-shrink-0" />
                </div>
              </NeonCard>
            </Link>

            <Link to={createPageUrl('Vault')} className="sm:col-span-2 lg:col-span-1">
              <NeonCard glowColor="gold" className="cursor-pointer hover:shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <PieChart className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-white font-bold text-sm sm:text-base truncate">Conquistas</h4>
                      <p className="text-[10px] sm:text-xs text-slate-400 truncate">Metas e Recompensas</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
                </div>
              </NeonCard>
            </Link>
          </div>
        </TabsContent>

        {/* TAB: Balanço Patrimonial */}
        <TabsContent value="balance" className="space-y-4 sm:space-y-6">
          <BalanceSheetReport
            assets={netWorthData?.assets || []}
            debts={netWorthData?.debts || []}
            accounts={netWorthData?.accounts || []}
            balanceSheetData={balanceSheetData}
          />
        </TabsContent>

        {/* TAB: DRE - Relatório de Eficiência */}
        <TabsContent value="dre" className="space-y-4 sm:space-y-6">
          <DREAccordion
            categories={budgetCategories}
            transactionData={transactionData}
          />
        </TabsContent>

        {/* TAB: Base de Operações - Orçamentos + Agendamentos */}
        <TabsContent value="operations" className="space-y-4 sm:space-y-6">
          {/* Painel de Inventário - HUD Visual */}
          <InventoryHUD accounts={accounts} envelopes={envelopes} />

          {/* Battle Budget Panel - Orçamentos por Categoria */}
          <BattleBudgetPanel categories={budgetCategories} />

          {/* Botão para Distribuir Orçamento */}
          <NeonCard glowColor="green" className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white uppercase">Distribuir MANA</h3>
                  <p className="text-xs sm:text-sm text-slate-400">Alocar recursos entre categorias</p>
                </div>
              </div>
              <button
                onClick={() => setIsBudgetOpen(true)}
                className="w-full sm:w-auto px-6 py-3 bg-green-600/20 border border-green-500/50 text-green-400 font-bold rounded-xl hover:bg-green-500 hover:text-black transition-all"
              >
                Distribuir
              </button>
            </div>
          </NeonCard>

          {/* Agendamentos e Ciclo de Combate */}
          <div className="pt-4 sm:pt-6 border-t-2 border-cyan-500/20">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase">Ciclo de Combate</h2>
                <p className="text-xs sm:text-sm text-slate-400">Operações agendadas e recorrentes</p>
              </div>
            </div>
            <IntegratedBudgetScheduler dateRange={{ startDate, endDate }} />
          </div>
        </TabsContent>

        {/* TAB: Inteligência Comportamental */}
        <TabsContent value="intelligence" className="mt-6 space-y-4 sm:space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-2 px-2">
              <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
                <BrainCircuit className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider">Arquivo Neural</h2>
                <p className="text-xs text-slate-400 uppercase tracking-widest italic">Processamento Neural de Hábitos e Gastos</p>
              </div>
            </div>

            <BehavioralIntelligenceReports
              transactions={finTransactions}
              budgets={budgetCategories}
            />
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* FAB Centralizado (Menu de Ações) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <AnimatePresence>
          {isEntryOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.3)] p-2 min-w-[200px]"
            >
              <button
                onClick={() => {
                  // Manter modal de transação aberto, fechar menu
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cyan-500/10 rounded-lg transition-all group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-sm">Lançamento Manual</p>
                  <p className="text-slate-400 text-xs">Criar transação</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setIsEntryOpen(false);
                  setIsImporterOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-500/10 rounded-lg transition-all group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-sm">Importar Extrato</p>
                  <p className="text-slate-400 text-xs">PDF, CSV, OFX</p>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsEntryOpen(!isEntryOpen)}
          className={`w-16 h-16 bg-gradient-to-t from-cyan-600 to-blue-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.5)] border-2 border-white/20 transition-transform ${isEntryOpen ? 'rotate-45' : ''
            }`}
        >
          <Plus className="w-8 h-8 text-white transition-colors" />
        </motion.button>
      </div>

      {/* Modal: Bank Statement Importer */}
      <AnimatePresence>
        {isImporterOpen && (
          <BankStatementImporter
            onClose={() => setIsImporterOpen(false)}
            onImport={handleImportTransactions}
          />
        )}
      </AnimatePresence>

      {/* Modal: Account Manager */}
      <AnimatePresence>
        {isAccountsOpen && (
          <AccountManagerModal
            accounts={accounts}
            onClose={() => setIsAccountsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal: Budget Allocator */}
      <AnimatePresence>
        {isBudgetOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_100px_rgba(6,182,212,0.2)] relative"
            >
              <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-cyan-500/20 p-6 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center animate-pulse">
                      <Swords className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-wider">Distribuir Orçamento</h2>
                      <p className="text-xs text-slate-400 uppercase tracking-widest">Equipar Mana nos Envelopes</p>
                    </div>
                  </div>
                  <button onClick={() => setIsBudgetOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <BudgetAllocatorModal
                totalMana={totalMana}
                envelopes={envelopes}
                onSave={handleSaveBudget}
                onClose={() => setIsBudgetOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Lançamento Manual */}
      <AnimatePresence>
        {isEntryOpen && !isImporterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setIsEntryOpen(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-slate-900 border border-cyan-500/30 p-6 rounded-2xl max-w-md w-full shadow-[0_0_50px_rgba(6,182,212,0.2)] relative z-[10000]"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-bold px-4 py-1 rounded-full text-xs uppercase tracking-widest shadow-lg">
                Combo Breaker
              </div>

              <QuickTransactionForm
                onClose={() => setIsEntryOpen(false)}
                budgetCategories={budgetCategories}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}