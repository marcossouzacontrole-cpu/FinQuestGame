import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Check, X, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function CalendarInbox() {
  const queryClient = useQueryClient();
  const [editingDraft, setEditingDraft] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: drafts = [], isLoading, refetch } = useQuery({
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

  const fetchDraftsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('fetchCalendarDrafts');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['calendarDrafts']);
      toast.success(`✨ ${data.drafts_created} novos eventos encontrados!`);
    },
    onError: (error) => {
      toast.error('Erro ao buscar eventos do Calendar');
      console.error(error);
    }
  });

  const confirmDraftMutation = useMutation({
    mutationFn: async ({ draft_id, category, account_id, value }) => {
      const response = await base44.functions.invoke('confirmCalendarDraft', {
        draft_id,
        category,
        account_id,
        value
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendarDrafts']);
      queryClient.invalidateQueries(['scheduledTransactions']);
      toast.success('✅ Transação criada com sucesso!');
      setEditingDraft(null);
    },
    onError: (error) => {
      toast.error('Erro ao confirmar transação');
      console.error(error);
    }
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

  if (drafts.length === 0 && !isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-cyan-500/30 rounded-2xl p-8 text-center"
      >
        <Calendar className="w-16 h-16 text-cyan-400 mx-auto mb-4 opacity-50" />
        <h3 className="text-white font-bold text-xl mb-2">Inbox Vazio</h3>
        <p className="text-slate-400 mb-6">
          Nenhum evento encontrado no seu Google Calendar com #fin ou valores
        </p>
        <Button
          onClick={() => fetchDraftsMutation.mutate()}
          disabled={fetchDraftsMutation.isPending}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
        >
          {fetchDraftsMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Buscar Eventos
            </>
          )}
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-black text-xl">Inbox do Calendar</h2>
            <p className="text-slate-400 text-sm">
              {drafts.length} eventos aguardando confirmação
            </p>
          </div>
        </div>
        <Button
          onClick={() => fetchDraftsMutation.mutate()}
          disabled={fetchDraftsMutation.isPending}
          variant="outline"
          className="border-cyan-500/50 text-cyan-400"
        >
          {fetchDraftsMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Drafts List */}
      <AnimatePresence>
        {drafts.map((draft, index) => {
          const isEditing = editingDraft?.id === draft.id;
          const categoryOptions = getCategoryOptions(draft.suggested_type);

          return (
            <motion.div
              key={draft.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{draft.suggested_type === 'expense' ? '💸' : '💰'}</span>
                    <h3 className="text-white font-bold">{draft.event_title}</h3>
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-3 mt-4">
                      <div>
                        <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Valor</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingDraft.value || draft.extracted_value || ''}
                          onChange={(e) => setEditingDraft({
                            ...editingDraft,
                            value: parseFloat(e.target.value)
                          })}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Categoria *</label>
                        <SearchableSelect
                          value={editingDraft.category}
                          onValueChange={(val) => setEditingDraft({ ...editingDraft, category: val })}
                          options={categoryOptions}
                          placeholder="Selecione a categoria..."
                          searchPlaceholder="Buscar categoria..."
                          emptyMessage="Nenhuma categoria encontrada"
                          triggerClassName="bg-slate-800 border-slate-700 text-white"
                          contentClassName="bg-slate-900 border-slate-700"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Conta</label>
                        <SearchableSelect
                          value={editingDraft.account_id}
                          onValueChange={(val) => setEditingDraft({ ...editingDraft, account_id: val })}
                          options={accountOptions}
                          placeholder="Selecione a conta (opcional)..."
                          searchPlaceholder="Buscar conta..."
                          emptyMessage="Nenhuma conta encontrada"
                          triggerClassName="bg-slate-800 border-slate-700 text-white"
                          contentClassName="bg-slate-900 border-slate-700"
                        />
                      </div>

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
                    <>
                      <div className="flex items-center gap-4 text-sm">
                        {draft.extracted_value && (
                          <span className="text-cyan-400 font-bold">
                            R$ {draft.extracted_value.toFixed(2)}
                          </span>
                        )}
                        <span className="text-slate-500">
                          📅 {new Date(draft.scheduled_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div className="flex gap-2 mt-4">
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
                          Confirmar Importação
                        </Button>
                        <Button
                          onClick={() => rejectDraftMutation.mutate(draft.id)}
                          variant="outline"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}