import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Plus, Trash2, Check, RefreshCw, Loader2, TrendingUp, TrendingDown,
  Clock, Zap, Repeat2, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { format } from 'date-fns';

const NeonCard = ({ children, glowColor = 'cyan', className = '' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/80',
    green: 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-slate-900/80',
    red: 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)] bg-slate-900/80',
    purple: 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-slate-900/80',
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden ${colors[glowColor] || colors.cyan} ${className}`}>
      {children}
    </div>
  );
};

export default function IntegratedBudgetScheduler({ dateRange }) {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingSeriesId, setEditingSeriesId] = useState(null);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteFilters, setBulkDeleteFilters] = useState({
    category: '',
    type: '',
    status: '',
    dayOfMonth: '',
    recurrence: ''
  });
  const [formData, setFormData] = useState({
    description: '',
    value: '',
    type: 'expense',
    scheduled_date: new Date().toISOString().split('T')[0],
    recurrence: 'once',
    recurrence_interval: 1,
    recurrence_months: 1,
    category: ''
  });

  // Fetch all data
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: scheduledTransactions = [] } = useQuery({
    queryKey: ['scheduledTransactions', currentUser?.email],
    queryFn: async () => {
      const allTransactions = await base44.entities.ScheduledTransaction.filter({
        created_by: currentUser.email
      });
      return allTransactions.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    },
    enabled: !!currentUser
  });

  const { data: drafts = [] } = useQuery({
    queryKey: ['calendarDrafts', currentUser?.email],
    queryFn: async () => {
      const allDrafts = await base44.entities.CalendarDraft.filter({
        created_by: currentUser.email,
        status: 'pending'
      });
      return allDrafts;
    },
    enabled: !!currentUser
  });

  const { data: tacticalData } = useQuery({
    queryKey: ['tacticalOperations'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getTacticalOperations', {});
        return response.data;
      } catch (err) {
        return { operations: [], summary: { total_pending: 0, total_completed: 0, total_payable: 0, total_receivable: 0 } };
      }
    },
    initialData: { operations: [], summary: { total_pending: 0, total_completed: 0, total_payable: 0, total_receivable: 0 } }
  });

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const createScheduledMutation = useMutation({
    mutationFn: async (data) => {
      if (editingId) {
        await base44.entities.ScheduledTransaction.update(editingId, data);
        return { id: editingId, ...data };
      }

      // Se for recorrente, criar múltiplos agendamentos
      if (data.recurrence !== 'once' && data.recurrence_months > 1) {
        const transactions = [];
        const baseDate = new Date(data.scheduled_date);
        const seriesId = `series-${Date.now()}`;
        const interval = parseInt(data.recurrence_interval) || 1;
        
        for (let i = 0; i < data.recurrence_months; i++) {
          const newDate = new Date(baseDate);
          
          if (data.recurrence === 'monthly') {
            newDate.setMonth(newDate.getMonth() + (i * interval));
          } else if (data.recurrence === 'weekly') {
            newDate.setDate(newDate.getDate() + (i * 7 * interval));
          } else if (data.recurrence === 'daily') {
            newDate.setDate(newDate.getDate() + (i * interval));
          } else if (data.recurrence === 'yearly') {
            newDate.setFullYear(newDate.getFullYear() + (i * interval));
          }
          
          const transactionData = {
            ...data,
            scheduled_date: newDate.toISOString().split('T')[0],
            series_id: seriesId,
            series_index: i
          };
          
          const transaction = await base44.entities.ScheduledTransaction.create(transactionData);
          transactions.push(transaction);
          
          await base44.functions.invoke('syncTransactionToCalendar', { transaction });
        }
        
        return transactions;
      }

      const transaction = await base44.entities.ScheduledTransaction.create(data);
      await base44.functions.invoke('syncTransactionToCalendar', { transaction });
      return transaction;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['scheduledTransactions']);
      const count = Array.isArray(result) ? result.length : 1;
      toast.success(editingId ? '✏️ Agendamento atualizado!' : `✅ ${count} agendamento(s) criado(s)!`);
      setShowForm(false);
      setEditingId(null);
      setFormData({ description: '', value: '', type: 'expense', scheduled_date: new Date().toISOString().split('T')[0], recurrence: 'once', recurrence_interval: 1, recurrence_months: 1, category: '' });
    },
    onError: () => toast.error(editingId ? 'Erro ao atualizar' : 'Erro ao criar agendamento')
  });

  const deleteScheduledMutation = useMutation({
    mutationFn: async (id) => {
      const transaction = scheduledTransactions.find(t => t.id === id);
      
      if (transaction?.google_event_id) {
        try {
          await base44.functions.invoke('deleteGoogleEvent', { 
            googleEventId: transaction.google_event_id 
          });
        } catch (err) {
          console.error('Erro ao sincronizar exclusão com Google Calendar:', err);
        }
      }
      
      await base44.entities.ScheduledTransaction.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledTransactions']);
      toast.success('🗑️ Agendamento removido (sincronizado)!');
    },
    onError: () => toast.error('Erro ao deletar agendamento')
  });

  const updateSeriesMutation = useMutation({
    mutationFn: async ({ seriesId, updates }) => {
      const itemsToUpdate = scheduledTransactions.filter(t => t.series_id === seriesId);
      const results = await Promise.all(
        itemsToUpdate.map(item => base44.entities.ScheduledTransaction.update(item.id, updates))
      );
      return results;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['scheduledTransactions']);
      toast.success(`✅ ${result.length} agendamento(s) da série atualizado(s)!`);
      setShowBulkEditModal(false);
      setEditingSeriesId(null);
    },
    onError: () => toast.error('Erro ao atualizar série')
  });

  const syncGoogleCalendarMutation = useMutation({
    mutationFn: () => base44.functions.invoke('syncGoogleCalendar', { action: 'sync' }),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['scheduledTransactions']);
      toast.success(`🔄 ${result.data.message}`);
    },
    onError: (error) => toast.error(`Erro na sincronização: ${error.message}`)
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (filters) => base44.functions.invoke('bulkDeleteSchedules', { filters }),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['scheduledTransactions']);
      toast.success(`🗑️ ${result.data.message}`);
      setShowBulkDeleteModal(false);
      setBulkDeleteFilters({ category: '', type: '', status: '', dayOfMonth: '', recurrence: '' });
    },
    onError: (error) => toast.error(`Erro na exclusão: ${error.message}`)
  });

  const handleCreateSchedule = (e) => {
    e.preventDefault();
    if (!formData.description || !formData.value || !formData.category) {
      toast.error('Preencha descrição, valor e categoria');
      return;
    }
    createScheduledMutation.mutate({
      ...formData,
      value: parseFloat(formData.value),
      recurrence_months: parseInt(formData.recurrence_months) || 1
    });
  };

  const handleEditSchedule = (item) => {
    if (item.type !== 'scheduled') {
      toast.error('Apenas agendamentos podem ser editados');
      return;
    }
    setEditingId(item.source.id);
    setFormData({
      description: item.title,
      value: item.amount.toString(),
      type: item.sourceType,
      scheduled_date: item.date,
      recurrence: item.source.recurrence || 'once',
      recurrence_interval: item.source.recurrence_interval || 1,
      recurrence_months: item.source.recurrence_months || 1,
      category: item.source.category || ''
    });
    setShowForm(true);
  };

  const handleEditSeries = (seriesId) => {
    setEditingSeriesId(seriesId);
    setShowBulkEditModal(true);
  };

  const getSeriesInfo = (seriesId) => {
    const items = scheduledTransactions.filter(t => t.series_id === seriesId);
    return items;
  };

  // Calculate unified totals
  const unifiedTotals = useMemo(() => {
    const scheduledExpenses = scheduledTransactions
      .filter(t => t.type === 'expense' && t.status === 'pending')
      .reduce((sum, t) => sum + t.value, 0);

    const scheduledIncome = scheduledTransactions
      .filter(t => t.type === 'income' && t.status === 'pending')
      .reduce((sum, t) => sum + t.value, 0);

    const calendarExpenses = drafts
      .filter(d => d.suggested_type === 'expense')
      .reduce((sum, d) => sum + (d.extracted_value || 0), 0);

    const calendarIncome = drafts
      .filter(d => d.suggested_type === 'income')
      .reduce((sum, d) => sum + (d.extracted_value || 0), 0);

    const tacticalExpenses = tacticalData?.summary?.total_payable || 0;
    const tacticalIncome = tacticalData?.summary?.total_receivable || 0;

    const totalExpenses = scheduledExpenses + calendarExpenses + tacticalExpenses;
    const totalIncome = scheduledIncome + calendarIncome + tacticalIncome;
    const projectedBalance = totalIncome - totalExpenses;

    return {
      scheduledExpenses,
      scheduledIncome,
      calendarExpenses,
      calendarIncome,
      tacticalExpenses,
      tacticalIncome,
      totalExpenses,
      totalIncome,
      projectedBalance,
      totalItems: scheduledTransactions.length + drafts.length + (tacticalData?.operations?.length || 0)
    };
  }, [scheduledTransactions, drafts, tacticalData]);

  // Unified list of all items
  const unifiedItems = useMemo(() => {
    const items = [];

    // Add scheduled transactions
    scheduledTransactions.forEach(t => {
      items.push({
        id: `scheduled-${t.id}`,
        type: 'scheduled',
        sourceType: t.type,
        title: t.description,
        amount: t.value,
        date: t.scheduled_date,
        status: t.status,
        synced: !!t.google_event_id,
        source: t
      });
    });

    // Add calendar drafts
    drafts.forEach(d => {
      items.push({
        id: `calendar-${d.id}`,
        type: 'calendar',
        sourceType: d.suggested_type,
        title: d.event_title,
        amount: d.extracted_value || 0,
        date: d.scheduled_date,
        status: 'pending',
        source: d
      });
    });

    // Add tactical operations
    (tacticalData?.operations || []).forEach(o => {
      items.push({
        id: `tactical-${o.id}`,
        type: 'tactical',
        sourceType: o.type === 'PAYABLE' ? 'expense' : 'income',
        title: o.description || o.title,
        amount: o.amount,
        date: o.due_date,
        status: o.payment_status || o.status,
        isUrgent: o.is_urgent,
        source: o
      });
    });

    // Apply filters
    let filtered = items;
    if (filterType === 'expenses') {
      filtered = filtered.filter(i => i.sourceType === 'expense');
    } else if (filterType === 'income') {
      filtered = filtered.filter(i => i.sourceType === 'income');
    }

    // Apply date range filter if provided
    if (dateRange?.startDate && dateRange?.endDate) {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      filtered = filtered.filter(i => {
        const itemDate = new Date(i.date);
        return itemDate >= start && itemDate <= end;
      });
    }

    // Sort by date
    return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [scheduledTransactions, drafts, tacticalData, filterType]);

  return (
    <div className="space-y-6">
      {/* Epic Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-900/40 via-cyan-900/40 to-blue-900/40 border border-purple-500/50 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-white font-black text-2xl flex items-center gap-2">
                Orçamentos & Agendamentos
                <span className="text-xs bg-gradient-to-r from-purple-500 to-cyan-500 px-3 py-1 rounded-full font-bold">UNIFICADO</span>
              </h2>
              <p className="text-slate-300 text-sm mt-1">Visualize todos os agendamentos, receitas e despesas em um único dashboard</p>
            </div>
          </div>
        </div>

        {/* Grand Totals Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3 border border-red-500/30">
            <p className="text-slate-400 text-xs uppercase font-bold flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Total Despesas
            </p>
            <p className="text-2xl font-black text-red-400 mt-1">
              R$ {unifiedTotals.totalExpenses.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              S:{unifiedTotals.scheduledExpenses.toFixed(0)} | C:{unifiedTotals.calendarExpenses.toFixed(0)} | T:{unifiedTotals.tacticalExpenses.toFixed(0)}
            </p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-3 border border-green-500/30">
            <p className="text-slate-400 text-xs uppercase font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Total Receitas
            </p>
            <p className="text-2xl font-black text-green-400 mt-1">
              R$ {unifiedTotals.totalIncome.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              S:{unifiedTotals.scheduledIncome.toFixed(0)} | C:{unifiedTotals.calendarIncome.toFixed(0)} | T:{unifiedTotals.tacticalIncome.toFixed(0)}
            </p>
          </div>

          <div className={`bg-slate-900/50 rounded-lg p-3 border ${unifiedTotals.projectedBalance >= 0 ? 'border-cyan-500/30' : 'border-orange-500/30'}`}>
            <p className="text-slate-400 text-xs uppercase font-bold">Saldo Projetado</p>
            <p className={`text-2xl font-black mt-1 ${unifiedTotals.projectedBalance >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
              {unifiedTotals.projectedBalance >= 0 ? '+' : ''}R$ {unifiedTotals.projectedBalance.toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-3 border border-purple-500/30">
            <p className="text-slate-400 text-xs uppercase font-bold">Total Items</p>
            <p className="text-2xl font-black text-purple-400 mt-1">{unifiedTotals.totalItems}</p>
            <p className="text-xs text-slate-500 mt-1">
              📅 {scheduledTransactions.length} | 🗓️ {drafts.length} | ⚔️ {tacticalData?.operations?.length || 0}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick Add Schedule Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-900/50 border border-cyan-500/30 rounded-xl p-4"
          >
            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Descrição"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-slate-800 border-cyan-500/30 text-white"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Valor"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="bg-slate-800 border-cyan-500/30 text-white"
                />
                <Input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  className="bg-slate-800 border-cyan-500/30 text-white"
                />
                <SearchableSelect
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  options={budgetCategories.map(cat => ({
                    value: cat.name,
                    label: cat.name,
                    icon: cat.icon || '📁'
                  }))}
                  placeholder="Buscar categoria..."
                  searchPlaceholder="Digite para buscar..."
                  emptyMessage="Nenhuma categoria encontrada"
                  triggerClassName="bg-slate-800 border-cyan-500/30 text-white"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                      formData.type === 'expense'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    💸 Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'income' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                      formData.type === 'income'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    💰 Receita
                  </button>
                </div>
                <select
                  value={formData.recurrence}
                  onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}
                  className="bg-slate-800 border border-cyan-500/30 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none"
                >
                  <option value="once">Única vez</option>
                  <option value="daily">Diária</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
                {formData.recurrence !== 'once' && (
                  <>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        placeholder="A cada X"
                        value={formData.recurrence_interval}
                        onChange={(e) => setFormData({ ...formData, recurrence_interval: e.target.value })}
                        className="bg-slate-800 border-cyan-500/30 text-white flex-1"
                      />
                      <span className="py-2 px-3 bg-slate-800 rounded-lg text-white text-sm">
                        {formData.recurrence === 'daily' ? 'dia(s)' : formData.recurrence === 'weekly' ? 'semana(s)' : formData.recurrence === 'monthly' ? 'mês(es)' : 'ano(s)'}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max="60"
                      placeholder="Quantas vezes?"
                      value={formData.recurrence_months}
                      onChange={(e) => setFormData({ ...formData, recurrence_months: e.target.value })}
                      className="bg-slate-800 border-cyan-500/30 text-white"
                    />
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                   type="submit"
                   disabled={createScheduledMutation.isPending}
                   className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500"
                 >
                   {createScheduledMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                   {editingId ? 'Atualizar' : 'Agendar'}
                 </Button>
                 <Button
                   type="button"
                   variant="outline"
                   onClick={() => {
                     setShowForm(false);
                     setEditingId(null);
                     setFormData({ description: '', value: '', type: 'expense', scheduled_date: new Date().toISOString().split('T')[0], recurrence: 'once', recurrence_interval: 1, recurrence_months: 1, category: '' });
                   }}
                   className="border-cyan-500/50"
                 >
                   Cancelar
                 </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Edit Modal */}
      <AnimatePresence>
        {showBulkEditModal && editingSeriesId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setShowBulkEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-purple-500/30 rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <Repeat2 className="w-5 h-5 text-purple-400" />
                <h3 className="text-white font-black text-lg">Editar Série Recorrente</h3>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                Atualizando {getSeriesInfo(editingSeriesId).length} agendamento(s)
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Novo Valor</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    defaultValue=""
                    onBlur={(e) => (e.currentTarget.dataset.newValue = e.target.value)}
                    className="bg-slate-800 border-cyan-500/30 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Nova Categoria</label>
                  <SearchableSelect
                    value=""
                    onValueChange={(value) => {
                      const selectEl = document.querySelector('[data-bulk-category-select]');
                      if (selectEl) selectEl.dataset.newCategory = value;
                    }}
                    options={budgetCategories.map(cat => ({
                      value: cat.name,
                      label: cat.name,
                      icon: cat.icon || '📁'
                    }))}
                    placeholder="Selecionar nova..."
                    searchPlaceholder="Digite para buscar..."
                    emptyMessage="Nenhuma categoria encontrada"
                    triggerClassName="bg-slate-800 border-cyan-500/30 text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowBulkEditModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={(e) => {
                      const newValue = (e.currentTarget.parentElement?.querySelector('input')?.dataset.newValue || '').trim();
                      const newCategory = (e.currentTarget.parentElement?.querySelector('select')?.dataset.newCategory || '').trim();
                      
                      const updates = {};
                      if (newValue) updates.value = parseFloat(newValue);
                      if (newCategory) updates.category = newCategory;
                      
                      if (Object.keys(updates).length > 0) {
                        updateSeriesMutation.mutate({ seriesId: editingSeriesId, updates });
                      } else {
                        toast.error('Selecione pelo menos um campo para atualizar');
                      }
                    }}
                    disabled={updateSeriesMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-magenta-500"
                  >
                    {updateSeriesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                    Atualizar Série
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified List View */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-black text-lg">Timeline Unificada</h3>
          <div className="flex gap-2 flex-wrap">
            {!showForm && (
              <Button
                onClick={() => setShowForm(true)}
                size="sm"
                className="bg-gradient-to-r from-cyan-500 to-blue-500"
              >
                <Plus className="w-3 h-3 mr-1" /> Agendar
              </Button>
            )}
            <Button
              onClick={() => syncGoogleCalendarMutation.mutate()}
              disabled={syncGoogleCalendarMutation.isPending}
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-purple-500"
            >
              {syncGoogleCalendarMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Sincronizar
            </Button>
            <Button
              onClick={() => setShowBulkDeleteModal(true)}
              size="sm"
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Deletar em Massa
            </Button>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterType === 'all'
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('expenses')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterType === 'expenses'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Despesas
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterType === 'income'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Receitas
            </button>
          </div>
        </div>

        {unifiedItems.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {unifiedItems.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`bg-slate-900/50 border rounded-lg p-3 flex items-center justify-between group hover:shadow-lg transition-all ${
                  item.sourceType === 'expense'
                    ? 'border-red-500/30 hover:border-red-500/50'
                    : 'border-green-500/30 hover:border-green-500/50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800">
                      {item.type === 'scheduled' ? '📅' : item.type === 'calendar' ? '🗓️' : '⚔️'}
                    </span>
                    <h4 className="text-white font-bold text-sm truncate">{item.title}</h4>
                    {item.source?.category && (
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" /> {item.source.category}
                      </span>
                    )}
                    {item.source?.recurrence && item.source.recurrence !== 'once' && (
                      <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Repeat2 className="w-2.5 h-2.5" /> {item.source.recurrence}
                      </span>
                    )}
                    {item.synced && <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">🔗 Sync</span>}
                    {item.isUrgent && <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">⚠️ Urgente</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {format(new Date(item.date), 'dd/MM/yyyy')}
                  </div>
                </div>
                <div className={`text-right font-black font-mono whitespace-nowrap ml-2 ${
                  item.sourceType === 'expense' ? 'text-red-400' : 'text-green-400'
                }`}>
                  {item.sourceType === 'expense' ? '-' : '+'}R$ {item.amount.toFixed(2)}
                </div>
                {item.type === 'scheduled' && (
                  <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditSchedule(item)}
                      className="p-1.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded transition-all"
                      title="Editar"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                    {item.source?.series_id && (
                      <button
                        onClick={() => handleEditSeries(item.source.series_id)}
                        className="p-1.5 bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 rounded transition-all"
                        title="Editar Série"
                      >
                        <Repeat2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Deseja remover este agendamento?')) {
                          deleteScheduledMutation.mutate(item.source.id);
                        }
                      }}
                      disabled={deleteScheduledMutation.isPending}
                      className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded transition-all disabled:opacity-50"
                      title="Deletar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            Nenhum agendamento encontrado
          </div>
        )}
      </div>

      {/* Bulk Delete Modal */}
      <AnimatePresence>
        {showBulkDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setShowBulkDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-red-500/30 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <Trash2 className="w-5 h-5 text-red-400" />
                <h3 className="text-white font-black text-lg">Exclusão em Massa</h3>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                Defina os filtros para excluir múltiplos agendamentos. Ex: todos os "Salários" do dia 07.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Categoria</label>
                  <SearchableSelect
                    value={bulkDeleteFilters.category}
                    onValueChange={(value) => setBulkDeleteFilters({ ...bulkDeleteFilters, category: value })}
                    options={[{ value: '', label: 'Nenhuma' }, ...budgetCategories.map(cat => ({
                      value: cat.name,
                      label: cat.name,
                      icon: cat.icon || '📁'
                    }))]}
                    placeholder="Selecionar..."
                    triggerClassName="bg-slate-800 border-cyan-500/30 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Tipo</label>
                    <select
                      value={bulkDeleteFilters.type}
                      onChange={(e) => setBulkDeleteFilters({ ...bulkDeleteFilters, type: e.target.value })}
                      className="w-full bg-slate-800 border border-cyan-500/30 rounded-lg px-2 py-2 text-white text-xs"
                    >
                      <option value="">Nenhum</option>
                      <option value="expense">Despesa</option>
                      <option value="income">Receita</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Status</label>
                    <select
                      value={bulkDeleteFilters.status}
                      onChange={(e) => setBulkDeleteFilters({ ...bulkDeleteFilters, status: e.target.value })}
                      className="w-full bg-slate-800 border border-cyan-500/30 rounded-lg px-2 py-2 text-white text-xs"
                    >
                      <option value="">Nenhum</option>
                      <option value="pending">Pendente</option>
                      <option value="executed">Executado</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Dia do Mês (07)</label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Ex: 07"
                      value={bulkDeleteFilters.dayOfMonth}
                      onChange={(e) => setBulkDeleteFilters({ ...bulkDeleteFilters, dayOfMonth: e.target.value })}
                      className="bg-slate-800 border-cyan-500/30 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Recorrência</label>
                    <select
                      value={bulkDeleteFilters.recurrence}
                      onChange={(e) => setBulkDeleteFilters({ ...bulkDeleteFilters, recurrence: e.target.value })}
                      className="w-full bg-slate-800 border border-cyan-500/30 rounded-lg px-2 py-2 text-white text-xs"
                    >
                      <option value="">Nenhuma</option>
                      <option value="once">Única vez</option>
                      <option value="daily">Diária</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-3 border border-yellow-500/20">
                  <p className="text-xs text-yellow-300">
                    ⚠️ Esta ação é irreversível. Verifique os filtros antes de confirmar.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowBulkDeleteModal(false);
                      setBulkDeleteFilters({ category: '', type: '', status: '', dayOfMonth: '', recurrence: '' });
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      const hasFilters = Object.values(bulkDeleteFilters).some(v => v);
                      if (!hasFilters) {
                        toast.error('Selecione pelo menos um filtro');
                        return;
                      }
                      if (confirm(`Tem certeza que deseja deletar os agendamentos com estes filtros?`)) {
                        bulkDeleteMutation.mutate(bulkDeleteFilters);
                      }
                    }}
                    disabled={bulkDeleteMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700"
                  >
                    {bulkDeleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Deletar
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}