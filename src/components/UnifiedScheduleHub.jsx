import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Trash2, Check, X, RefreshCw, Loader2, Sparkles, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function UnifiedScheduleHub() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    value: '',
    type: 'expense',
    category: '',
    account_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
  });

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
      return allTransactions.sort((a, b) => 
        new Date(a.scheduled_date) - new Date(b.scheduled_date)
      );
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

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  // Mutations
  const createTransactionMutation = useMutation({
    mutationFn: async (data) => {
      const transaction = await base44.entities.ScheduledTransaction.create(data);
      await base44.functions.invoke('syncTransactionToCalendar', { transaction });
      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledTransactions']);
      toast.success('✅ Agendamento criado e sincronizado!');
      setShowForm(false);
      setFormData({
        description: '',
        value: '',
        type: 'expense',
        category: '',
        account_id: '',
        scheduled_date: new Date().toISOString().split('T')[0],
      });
    },
    onError: () => toast.error('Erro ao criar agendamento')
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (transaction) => {
      if (transaction.google_event_id) {
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${transaction.google_event_id}`,
          { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
      }
      await base44.entities.ScheduledTransaction.delete(transaction.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledTransactions']);
      toast.success('Agendamento deletado');
    }
  });

  const fetchDraftsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('fetchCalendarDrafts');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['calendarDrafts']);
      toast.success(`✨ ${data.drafts_created} novos eventos encontrados!`);
    },
    onError: () => toast.error('Erro ao buscar eventos do Calendar')
  });

  const confirmDraftMutation = useMutation({
    mutationFn: async ({ draft_id, category, account_id, value }) => {
      await base44.functions.invoke('confirmCalendarDraft', { draft_id, category, account_id, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendarDrafts', 'scheduledTransactions']);
      toast.success('✅ Transação criada!');
      setEditingDraft(null);
    },
    onError: () => toast.error('Erro ao confirmar transação')
  });

  const rejectDraftMutation = useMutation({
    mutationFn: async (draftId) => {
      await base44.entities.CalendarDraft.update(draftId, {
        status: 'rejected',
        processed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendarDrafts']);
      toast.success('Evento ignorado');
    }
  });

  const getCategoryOptions = (type) => {
    return budgetCategories
      .filter(c => 
        type === 'expense' 
          ? (c.category_type === 'expense' || c.category_type === 'enemy')
          : c.category_type === 'guardian'
      )
      .map(cat => ({
        value: cat.name,
        label: cat.name,
        icon: cat.icon || (type === 'expense' ? '💀' : '💰')
      }));
  };

  const accountOptions = accounts.map(acc => ({
    value: acc.id,
    label: acc.name,
    icon: acc.icon || '💰'
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description || !formData.value || !formData.category) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    createTransactionMutation.mutate({
      ...formData,
      value: parseFloat(formData.value)
    });
  };

  const pendingTransactions = scheduledTransactions.filter(t => t.status === 'pending');
  const nextTransactions = useMemo(() => {
    const today = new Date();
    return pendingTransactions
      .filter(t => new Date(t.scheduled_date) >= today)
      .slice(0, 5);
  }, [pendingTransactions]);

  const stats = {
    agendados: scheduledTransactions.length,
    pendentes: pendingTransactions.length,
    novosCal: drafts.length
  };

  return (
    <div className="space-y-6">
      {/* Header Épico */}
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
                HUB de Cronograma
                <span className="text-xs bg-purple-500/30 px-3 py-1 rounded-full font-bold">INTEGRADO</span>
              </h2>
              <p className="text-slate-300 text-sm mt-1">Agendamentos + Google Calendar em um só lugar</p>
            </div>
          </div>
        </div>

        {/* Stats Rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3 border border-purple-500/30">
            <p className="text-slate-400 text-xs uppercase font-bold">Agendados</p>
            <p className="text-2xl font-black text-purple-400">{stats.agendados}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 border border-cyan-500/30">
            <p className="text-slate-400 text-xs uppercase font-bold">Do Calendar</p>
            <p className="text-2xl font-black text-cyan-400">{stats.novosCal}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 border border-blue-500/30">
            <p className="text-slate-400 text-xs uppercase font-bold">Próximos</p>
            <p className="text-2xl font-black text-blue-400">{nextTransactions.length}</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs Unificadas */}
      <Tabs defaultValue="proximos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-slate-900/50 border border-slate-700/50 rounded-xl p-1">
          <TabsTrigger 
            value="proximos"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/30 data-[state=active]:to-cyan-500/30 rounded-lg"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Próximos
          </TabsTrigger>
          <TabsTrigger 
            value="agendar"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/30 data-[state=active]:to-pink-500/30 rounded-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </TabsTrigger>
          <TabsTrigger 
            value="importar"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/30 data-[state=active]:to-green-500/30 rounded-lg"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Calendar
          </TabsTrigger>
        </TabsList>

        {/* Tab: Próximos Agendamentos */}
        <TabsContent value="proximos" className="space-y-4">
          {nextTransactions.length > 0 ? (
            <div className="space-y-3">
              {nextTransactions.map((transaction, idx) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-slate-900/50 border rounded-xl p-4 flex items-center justify-between group hover:shadow-lg transition-all ${
                    transaction.type === 'expense' 
                      ? 'border-red-500/30 hover:border-red-500/50' 
                      : 'border-green-500/30 hover:border-green-500/50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{transaction.type === 'expense' ? '💸' : '💰'}</span>
                      <h4 className="text-white font-bold">{transaction.description}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={transaction.type === 'expense' ? 'text-red-400' : 'text-green-400'}>
                        R$ {transaction.value.toFixed(2)}
                      </span>
                      <span className="text-slate-400">📅 {new Date(transaction.scheduled_date).toLocaleDateString('pt-BR')}</span>
                      {transaction.google_event_id && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">🔗 Sync</span>}
                    </div>
                  </div>
                  <Button
                    onClick={() => deleteTransactionMutation.mutate(transaction)}
                    variant="outline"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 border-red-500/50 text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              Nenhum agendamento próximo
            </div>
          )}
        </TabsContent>

        {/* Tab: Criar Novo Agendamento */}
        <TabsContent value="agendar" className="space-y-4">
          <AnimatePresence>
            {showForm ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-900/50 border border-purple-500/30 rounded-xl p-6 space-y-4"
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Descrição"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-slate-800 border-purple-500/30 text-white"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Valor"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="bg-slate-800 border-purple-500/30 text-white"
                    />
                    <SearchableSelect
                      value={formData.type}
                      onValueChange={(val) => setFormData({ ...formData, type: val, category: '' })}
                      options={[
                        { value: 'expense', label: 'Despesa', icon: '💸' },
                        { value: 'income', label: 'Receita', icon: '💰' }
                      ]}
                      triggerClassName="bg-slate-800 border-purple-500/30 text-white"
                      contentClassName="bg-slate-900 border-purple-500/30"
                    />
                    <Input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                      className="bg-slate-800 border-purple-500/30 text-white"
                    />
                    <SearchableSelect
                      value={formData.category}
                      onValueChange={(val) => setFormData({ ...formData, category: val })}
                      options={getCategoryOptions(formData.type)}
                      placeholder="Categoria..."
                      searchPlaceholder="Buscar..."
                      triggerClassName="bg-slate-800 border-purple-500/30 text-white col-span-2"
                      contentClassName="bg-slate-900 border-purple-500/30"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={createTransactionMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                    >
                      {createTransactionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
                      {createTransactionMutation.isPending ? 'Criando...' : 'Agendar'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="border-purple-500/50"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <Button
                onClick={() => setShowForm(true)}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 h-12"
              >
                <Plus className="w-5 h-5 mr-2" />
                Criar Novo Agendamento
              </Button>
            )}
          </AnimatePresence>

          {pendingTransactions.length > 0 && (
            <div>
              <h3 className="text-white font-bold mb-3 text-sm uppercase">Todos os Agendamentos</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {pendingTransactions.map((t, idx) => (
                  <div key={t.id} className="text-xs bg-slate-800/50 p-2 rounded flex justify-between items-center">
                    <span className="text-slate-300">{t.description} • R$ {t.value}</span>
                    <span className="text-slate-500">{new Date(t.scheduled_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab: Calendar Inbox */}
        <TabsContent value="importar" className="space-y-4">
          {drafts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-slate-900/50 border border-cyan-500/30 rounded-xl"
            >
              <Calendar className="w-12 h-12 mx-auto mb-3 text-cyan-400 opacity-50" />
              <p className="text-slate-400 mb-4">Nenhum evento com #fin encontrado</p>
              <Button
                onClick={() => fetchDraftsMutation.mutate()}
                disabled={fetchDraftsMutation.isPending}
                className="bg-gradient-to-r from-cyan-500 to-blue-500"
              >
                {fetchDraftsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {fetchDraftsMutation.isPending ? 'Buscando...' : 'Buscar Eventos'}
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-400 text-sm">{drafts.length} evento(s) aguardando</p>
                <Button
                  onClick={() => fetchDraftsMutation.mutate()}
                  disabled={fetchDraftsMutation.isPending}
                  size="sm"
                  variant="outline"
                  className="border-cyan-500/50"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
              <AnimatePresence>
                {drafts.map((draft, idx) => {
                  const isEditing = editingDraft?.id === draft.id;
                  const categoryOptions = getCategoryOptions(draft.suggested_type);

                  return (
                    <motion.div
                      key={draft.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4"
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={editingDraft.value || draft.extracted_value || ''}
                            onChange={(e) => setEditingDraft({ ...editingDraft, value: parseFloat(e.target.value) })}
                            placeholder="Valor"
                            className="bg-slate-800 border-slate-700 text-white"
                          />
                          <SearchableSelect
                            value={editingDraft.category}
                            onValueChange={(val) => setEditingDraft({ ...editingDraft, category: val })}
                            options={categoryOptions}
                            placeholder="Categoria..."
                            searchPlaceholder="Buscar..."
                            triggerClassName="bg-slate-800 border-slate-700 text-white"
                            contentClassName="bg-slate-900 border-slate-700"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                if (!editingDraft.category) {
                                  toast.error('Selecione uma categoria');
                                  return;
                                }
                                confirmDraftMutation.mutate({
                                  draft_id: draft.id,
                                  category: editingDraft.category,
                                  account_id: editingDraft.account_id,
                                  value: editingDraft.value || draft.extracted_value
                                });
                              }}
                              disabled={confirmDraftMutation.isPending}
                              className="flex-1 bg-gradient-to-r from-green-600 to-green-500"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Confirmar
                            </Button>
                            <Button
                              onClick={() => setEditingDraft(null)}
                              variant="outline"
                              className="border-slate-700"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{draft.suggested_type === 'expense' ? '💸' : '💰'}</span>
                            <h4 className="text-white font-bold flex-1">{draft.event_title}</h4>
                          </div>
                          <div className="flex items-center gap-3 text-sm mb-3">
                            {draft.extracted_value && <span className="text-cyan-400 font-bold">R$ {draft.extracted_value.toFixed(2)}</span>}
                            <span className="text-slate-500">📅 {new Date(draft.scheduled_date).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setEditingDraft({
                                id: draft.id,
                                value: draft.extracted_value,
                                category: '',
                                account_id: ''
                              })}
                              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500"
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Importar
                            </Button>
                            <Button
                              onClick={() => rejectDraftMutation.mutate(draft.id)}
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}