import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Trash2, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function ScheduledTransactionManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    value: '',
    type: 'expense',
    category: '',
    account_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    recurrence: 'once'
  });

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: transactions = [], isLoading } = useQuery({
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

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data) => {
      const transaction = await base44.entities.ScheduledTransaction.create(data);
      
      // Sincronizar com Calendar
      await base44.functions.invoke('syncTransactionToCalendar', { transaction });
      
      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledTransactions']);
      toast.success('✅ Agendamento criado e sincronizado com Calendar!');
      setShowForm(false);
      setFormData({
        description: '',
        value: '',
        type: 'expense',
        category: '',
        account_id: '',
        scheduled_date: new Date().toISOString().split('T')[0],
        recurrence: 'once'
      });
    },
    onError: (error) => {
      toast.error('Erro ao criar agendamento');
      console.error(error);
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (transaction) => {
      // Deletar evento do Calendar se existir
      if (transaction.google_event_id) {
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${transaction.google_event_id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
      }
      
      await base44.entities.ScheduledTransaction.delete(transaction.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledTransactions']);
      toast.success('Agendamento deletado');
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

  const pendingTransactions = transactions.filter(t => t.status === 'pending');
  const executedTransactions = transactions.filter(t => t.status === 'executed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-black text-xl">Agendamentos</h2>
            <p className="text-slate-400 text-sm">
              {pendingTransactions.length} pendentes • Sincronizado com Google Calendar
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-purple-500 to-pink-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-900/50 border border-purple-500/30 rounded-xl p-6"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Descrição</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Conta de Luz, Salário"
                    className="bg-slate-800 border-purple-500/30 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Valor</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0.00"
                    className="bg-slate-800 border-purple-500/30 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Tipo</label>
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
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Data Agendada</label>
                  <Input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="bg-slate-800 border-purple-500/30 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Categoria</label>
                  <SearchableSelect
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                    options={getCategoryOptions(formData.type)}
                    placeholder="Selecione..."
                    searchPlaceholder="Buscar categoria..."
                    triggerClassName="bg-slate-800 border-purple-500/30 text-white"
                    contentClassName="bg-slate-900 border-purple-500/30"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Conta</label>
                  <SearchableSelect
                    value={formData.account_id}
                    onValueChange={(val) => setFormData({ ...formData, account_id: val })}
                    options={accountOptions}
                    placeholder="Opcional..."
                    searchPlaceholder="Buscar conta..."
                    triggerClassName="bg-slate-800 border-purple-500/30 text-white"
                    contentClassName="bg-slate-900 border-purple-500/30"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createTransactionMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {createTransactionMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Agendar e Sincronizar
                    </>
                  )}
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
        )}
      </AnimatePresence>

      {/* Pending Transactions */}
      <div>
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-400" />
          Pendentes
        </h3>
        <div className="space-y-3">
          {pendingTransactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-slate-900/50 border rounded-xl p-4 ${
                transaction.type === 'expense' 
                  ? 'border-red-500/30' 
                  : 'border-green-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">
                      {transaction.type === 'expense' ? '💸' : '💰'}
                    </span>
                    <h4 className="text-white font-bold">{transaction.description}</h4>
                    {transaction.google_event_id && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                        📅 Sincronizado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={transaction.type === 'expense' ? 'text-red-400' : 'text-green-400'}>
                      R$ {transaction.value.toFixed(2)}
                    </span>
                    <span className="text-slate-500">
                      📅 {new Date(transaction.scheduled_date).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-slate-500">{transaction.category}</span>
                  </div>
                </div>
                <Button
                  onClick={() => deleteTransactionMutation.mutate(transaction)}
                  variant="outline"
                  size="sm"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
          {pendingTransactions.length === 0 && (
            <p className="text-slate-500 text-center py-8">
              Nenhuma transação agendada
            </p>
          )}
        </div>
      </div>
    </div>
  );
}