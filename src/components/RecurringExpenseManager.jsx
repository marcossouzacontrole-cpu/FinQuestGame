import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Plus, Skull, Coins, AlertTriangle, Clock, Zap, Target, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import confetti from 'canvas-confetti';

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

export default function RecurringExpenseManager() {
  const [isAdding, setIsAdding] = useState(false);
  const [itemType, setItemType] = useState('PAYABLE');
  const [newItem, setNewItem] = useState({
    description: '',
    amount: '',
    due_date: '',
    is_urgent: false,
    payment_method: 'pix'
  });

  const queryClient = useQueryClient();

  // Buscar operações táticas via server action
  const { data: tacticalData, isLoading, error } = useQuery({
    queryKey: ['tacticalOperations'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getTacticalOperations', {});
        return response.data;
      } catch (err) {
        console.error('Erro ao buscar operações:', err);
        return { operations: [], summary: { total_pending: 0, total_completed: 0, total_payable: 0, total_receivable: 0 } };
      }
    },
    initialData: { operations: [], summary: { total_pending: 0, total_completed: 0, total_payable: 0, total_receivable: 0 } }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Transaction.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tacticalOperations']);
      setIsAdding(false);
      setNewItem({ description: '', amount: '', due_date: '', is_urgent: false, payment_method: 'pix' });
      toast.success('✨ Operação agendada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar operação:', error);
      toast.error('Erro ao salvar. Tente novamente.');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async (transactionId) => {
      const response = await base44.functions.invoke('toggleOperationStatus', {
        transaction_id: transactionId
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['tacticalOperations']);
      
      // Efeito de confete
      if (data.new_status === 'COMPLETED') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#00FF00', '#00FFFF', '#FF00FF']
        });
      }
      
      toast.success(data.message);
    },
    onError: (error) => {
      console.error('Erro ao alternar status:', error);
      toast.error('Erro ao atualizar status');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tacticalOperations']);
      toast.success('🗑️ Operação removida');
    }
  });

  const handleCreate = async () => {
    if (!newItem.description || !newItem.amount || !newItem.due_date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await createMutation.mutateAsync({
        description: newItem.description,
        amount: parseFloat(newItem.amount),
        type: itemType === 'PAYABLE' ? 'expense' : 'income',
        transaction_type: itemType,
        due_date: newItem.due_date,
        date: newItem.due_date,
        payment_status: 'PENDING',
        is_urgent: newItem.is_urgent,
        payment_method: newItem.payment_method,
        recurring: false
      });
    } catch (error) {
      console.error('Erro ao criar operação:', error);
      toast.error('Falha ao salvar. Verifique os dados e tente novamente.');
    }
  };

  // Organize operations
  const organizedItems = useMemo(() => {
    if (!tacticalData || !tacticalData.operations) {
      return { threats: [], supplies: [], completed: [], currentDay: new Date().getDate() };
    }

    const today = new Date();
    const operations = tacticalData.operations || [];
    
    const pending = operations.filter(o => (o.status === 'PENDING' || o.payment_status === 'PENDING'));
    const completed = operations.filter(o => (o.status === 'COMPLETED' || o.payment_status === 'COMPLETED'));
    
    // Ordenar por urgência e data
    const threats = pending
      .filter(o => o.type === 'PAYABLE')
      .sort((a, b) => {
        if (a.is_urgent && !b.is_urgent) return -1;
        if (!a.is_urgent && b.is_urgent) return 1;
        return new Date(a.due_date) - new Date(b.due_date);
      });
    
    const supplies = pending
      .filter(o => o.type === 'RECEIVABLE')
      .sort((a, b) => {
        if (a.is_urgent && !b.is_urgent) return -1;
        if (!a.is_urgent && b.is_urgent) return 1;
        return new Date(a.due_date) - new Date(b.due_date);
      });

    return { 
      threats, 
      supplies, 
      completed, 
      currentDay: today.getDate() 
    };
  }, [tacticalData]);

  // Calculate month summary
  const monthSummary = useMemo(() => {
    if (!tacticalData || !tacticalData.summary) {
      return { 
        totalToPay: 0, 
        totalToReceive: 0, 
        paid: 0, 
        received: 0, 
        projectedBalance: 0,
        paidPercent: 0,
        receivedPercent: 0
      };
    }

    const { summary } = tacticalData;
    const totalToPay = summary.total_payable || 0;
    const totalToReceive = summary.total_receivable || 0;
    
    const allOperations = tacticalData.operations || [];
    const paid = allOperations
      .filter(o => (o.type === 'PAYABLE' || o.transaction_type === 'PAYABLE') && (o.status === 'COMPLETED' || o.payment_status === 'COMPLETED'))
      .reduce((sum, o) => sum + (o.amount || 0), 0);
    const received = allOperations
      .filter(o => (o.type === 'RECEIVABLE' || o.transaction_type === 'RECEIVABLE') && (o.status === 'COMPLETED' || o.payment_status === 'COMPLETED'))
      .reduce((sum, o) => sum + (o.amount || 0), 0);

    const projectedBalance = totalToReceive - totalToPay;

    return {
      totalToPay,
      totalToReceive,
      paid,
      received,
      projectedBalance,
      paidPercent: totalToPay > 0 ? (paid / totalToPay) * 100 : 0,
      receivedPercent: totalToReceive > 0 ? (received / totalToReceive) * 100 : 0
    };
  }, [tacticalData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Zap className="w-12 h-12 text-cyan-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Health HUD */}
      <NeonCard glowColor={monthSummary.projectedBalance >= 0 ? 'green' : 'red'}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ameaças (Contas a Pagar) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Skull className="w-5 h-5 text-red-400" />
              <h4 className="text-red-400 font-bold uppercase text-sm">Ameaças</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total a Pagar</span>
                <span className="text-red-400 font-mono font-bold">R$ {monthSummary.totalToPay.toFixed(2)}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-red-600 to-orange-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${monthSummary.paidPercent}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {monthSummary.paidPercent.toFixed(0)}% Liquidado
              </p>
            </div>
          </div>

          {/* Suprimentos (Valores a Receber) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-5 h-5 text-green-400" />
              <h4 className="text-green-400 font-bold uppercase text-sm">Suprimentos</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total a Receber</span>
                <span className="text-green-400 font-mono font-bold">R$ {monthSummary.totalToReceive.toFixed(2)}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-green-600 to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${monthSummary.receivedPercent}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {monthSummary.receivedPercent.toFixed(0)}% Recebido
              </p>
            </div>
          </div>

          {/* Saldo Projetado */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-cyan-400" />
              <h4 className="text-cyan-400 font-bold uppercase text-sm">Saldo Projetado</h4>
            </div>
            <div className="text-center">
              <p className={`text-4xl font-black font-mono ${
                monthSummary.projectedBalance >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {monthSummary.projectedBalance >= 0 ? '+' : ''}R$ {monthSummary.projectedBalance.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {monthSummary.projectedBalance >= 0 ? '✨ Superávit' : '⚠️ Déficit'}
              </p>
            </div>
          </div>
        </div>
      </NeonCard>

      {/* Add New Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setIsAdding(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 shadow-[0_0_100px_rgba(6,182,212,0.2)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-white uppercase">Novo Evento</h3>
                <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setItemType('PAYABLE')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      itemType === 'PAYABLE'
                        ? 'bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-3xl mb-2">💀</div>
                    <p className="text-white font-bold text-sm">CONTA A PAGAR</p>
                    <p className="text-slate-400 text-xs">Saída Agendada</p>
                  </button>
                  
                  <button
                    onClick={() => setItemType('RECEIVABLE')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      itemType === 'RECEIVABLE'
                        ? 'bg-green-500/20 border-green-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-3xl mb-2">💰</div>
                    <p className="text-white font-bold text-sm">VALOR A RECEBER</p>
                    <p className="text-slate-400 text-xs">Entrada Agendada</p>
                  </button>
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Descrição *</label>
                  <Input
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    placeholder="Ex: Aluguel, Conta de Luz, Salário..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Valor *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                    <Input
                      type="number"
                      value={newItem.amount}
                      onChange={(e) => setNewItem({...newItem, amount: e.target.value})}
                      placeholder="0.00"
                      step="0.01"
                      className="bg-slate-800 border-slate-700 text-white pl-10 text-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Data de Vencimento *</label>
                  <Input
                    type="date"
                    value={newItem.due_date}
                    onChange={(e) => setNewItem({...newItem, due_date: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Método de Pagamento</label>
                  <Select value={newItem.payment_method} onValueChange={(val) => setNewItem({...newItem, payment_method: val})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-slate-900 border-slate-700">
                      <SelectItem value="pix" className="text-white hover:bg-slate-800">PIX</SelectItem>
                      <SelectItem value="debit_card" className="text-white hover:bg-slate-800">Débito</SelectItem>
                      <SelectItem value="credit_card" className="text-white hover:bg-slate-800">Crédito</SelectItem>
                      <SelectItem value="bank_transfer" className="text-white hover:bg-slate-800">Transferência</SelectItem>
                      <SelectItem value="cash" className="text-white hover:bg-slate-800">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <input
                    type="checkbox"
                    checked={newItem.is_urgent}
                    onChange={(e) => setNewItem({...newItem, is_urgent: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <label className="text-white text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Marcar como urgente/prioritária
                  </label>
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={!newItem.description || !newItem.amount || !newItem.due_date || createMutation.isPending}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                      </motion.div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Adicionar ao Calendário
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Ameaças (Contas a Pagar) */}
        <div className="space-y-3 min-w-0 w-full">
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <Skull className="w-5 h-5 text-red-400 animate-pulse" />
            <h4 className="text-white font-bold uppercase tracking-wider">
              🔴 Ameaças ({organizedItems.threats.length})
            </h4>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 w-full">
            {organizedItems.threats.length === 0 ? (
              <div className="text-center py-12 w-full">
                <Check className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Nenhuma conta a pagar este mês</p>
              </div>
            ) : (
              organizedItems.threats.map((item, idx) => (
                <TacticalCard
                  key={item.id}
                  operation={item}
                  type="threat"
                  onToggle={() => toggleMutation.mutate(item.id)}
                  onDelete={() => deleteMutation.mutate(item.id)}
                  delay={idx * 0.05}
                />
              ))
            )}
          </div>
        </div>

        {/* Suprimentos (Valores a Receber) */}
        <div className="space-y-3 min-w-0 w-full">
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <Coins className="w-5 h-5 text-green-400 animate-pulse" />
            <h4 className="text-white font-bold uppercase tracking-wider">
              🟢 Suprimentos ({organizedItems.supplies.length})
            </h4>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 w-full">
            {organizedItems.supplies.length === 0 ? (
              <div className="text-center py-12 w-full">
                <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Nenhuma receita esperada este mês</p>
              </div>
            ) : (
              organizedItems.supplies.map((item, idx) => (
                <TacticalCard
                  key={item.id}
                  operation={item}
                  type="supply"
                  onToggle={() => toggleMutation.mutate(item.id)}
                  onDelete={() => deleteMutation.mutate(item.id)}
                  delay={idx * 0.05}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Completed Items (Collapsed) */}
      {organizedItems.completed.length > 0 && (
        <NeonCard glowColor="purple">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5 text-green-400" />
            <h4 className="text-white font-bold uppercase text-sm">
              Concluídos Este Mês ({organizedItems.completed.length})
            </h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {organizedItems.completed.map(item => (
              <div key={item.id} className="p-2 bg-slate-800/30 rounded-lg border border-slate-700 opacity-50">
                <p className="text-white text-xs truncate">{item.description || 'Sem descrição'}</p>
                <p className={`text-xs font-mono ${item.transaction_type === 'RECEIVABLE' ? 'text-green-400' : 'text-red-400'}`}>
                  {item.transaction_type === 'RECEIVABLE' ? '+' : '-'}R$ {(item.amount || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </NeonCard>
      )}
    </div>
  );
}

// Tactical Card Component
function TacticalCard({ operation, type, onToggle, onDelete, delay }) {
  if (!operation) return null;
  
  const dueDate = operation.due_date ? new Date(operation.due_date) : new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  const isToday = dueDate.getTime() === today.getTime();
  const isPast = dueDate < today;
  const isFuture = dueDate > today;
  const isPending = operation.payment_status === 'PENDING' || operation.status === 'PENDING';

  const cardColor = type === 'threat' 
    ? 'from-red-900/20 to-orange-900/20 border-red-500/30'
    : 'from-green-900/20 to-emerald-900/20 border-green-500/30';

  const glowColor = type === 'threat'
    ? 'shadow-[0_0_15px_rgba(239,68,68,0.15)]'
    : 'shadow-[0_0_15px_rgba(16,185,129,0.15)]';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={`relative rounded-xl border bg-gradient-to-br p-4 w-full min-w-0 ${cardColor} ${
        isToday ? glowColor + ' animate-pulse' : ''
      } ${isFuture ? 'opacity-60' : ''} ${isPast && isPending ? 'border-yellow-500/50' : ''} ${
        operation.is_urgent ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-slate-900' : ''
      }`}
    >
      {/* Date Badge */}
      <div className="absolute -top-2 -left-2 w-auto px-3 h-8 bg-slate-900 border-2 border-cyan-500 rounded-full flex items-center justify-center">
        <span className="text-cyan-400 font-black text-xs">
          {format(dueDate, 'dd/MM')}
        </span>
      </div>

      {/* Status Indicators */}
      {operation.is_urgent && (
        <div className="absolute -top-2 left-16 bg-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          URGENTE
        </div>
      )}

      {isToday && (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-black px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
          HOJE
        </div>
      )}

      {isPast && isPending && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase animate-pulse">
          VENCIDO
        </div>
      )}

      <div className="mt-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h5 className="text-white font-bold text-sm mb-1 truncate">{operation.description || operation.title || 'Sem título'}</h5>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">Vence em {format(dueDate, "dd 'de' MMMM", { locale: ptBR })}</span>
            </div>
            {operation.payment_method && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                <span className="uppercase truncate">{operation.payment_method.replace('_', ' ')}</span>
              </div>
            )}
          </div>
          <button
            onClick={onDelete}
            className="text-slate-600 hover:text-red-400 transition-colors p-1 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className={`text-xl sm:text-2xl font-black font-mono ${
            type === 'threat' ? 'text-red-400' : 'text-green-400'
          }`}>
            {type === 'threat' ? '-' : '+'}R$ {(operation.amount || 0).toFixed(2)}
          </div>

          <button
            onClick={onToggle}
            disabled={!isPending}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex-shrink-0 ${
              !isPending
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : type === 'threat'
                ? 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white'
                : 'bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500 hover:text-white'
            }`}
          >
            {!isPending ? (
              <>
                <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{type === 'threat' ? 'PAGO' : 'RECEBIDO'}</span>
                <span className="sm:hidden">✓</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{type === 'threat' ? 'PAGAR' : 'CONFIRMAR'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}