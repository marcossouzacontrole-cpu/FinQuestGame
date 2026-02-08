import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function QuickTransactionFAB() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [envelopeId, setEnvelopeId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const { data: envelopes = [] } = useQuery({
    queryKey: ['budgetEnvelopes'],
    queryFn: () => base44.entities.BudgetEnvelope.list()
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ['creditCards'],
    queryFn: () => base44.entities.CreditCard.list()
  });

  const createTransaction = useMutation({
    mutationFn: async (data) => {
      const transaction = await base44.entities.FinTransaction.create(data);

      // Update account balance
      if (data.account_id && !data.credit_card_id) {
        const account = accounts.find(a => a.id === data.account_id);
        if (account) {
          const newBalance = data.type === 'income'
            ? account.balance + data.amount
            : account.balance - data.amount;
          await base44.entities.Account.update(data.account_id, { balance: newBalance });
        }
      }

      // Update credit card bill
      if (data.credit_card_id) {
        const card = creditCards.find(c => c.id === data.credit_card_id);
        if (card) {
          await base44.entities.CreditCard.update(data.credit_card_id, {
            current_bill: card.current_bill + data.amount
          });
        }
      }

      // Update envelope spending
      if (data.envelope_id && data.type === 'expense') {
        const envelope = envelopes.find(e => e.id === data.envelope_id);
        if (envelope) {
          await base44.entities.BudgetEnvelope.update(data.envelope_id, {
            spent_amount: envelope.spent_amount + data.amount
          });
        }
      }

      // Centralized Gamification (Skill Directive A)
      try {
        await base44.integrations.Core.InvokeFunction({
          name: 'addPointsForAction',
          payload: { actionType: 'transaction_created' }
        });
      } catch (e) {
        console.error('Failed to add points:', e);
      }

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['finTransactions']);
      queryClient.invalidateQueries(['accounts']);
      queryClient.invalidateQueries(['budgetEnvelopes']);
      queryClient.invalidateQueries(['creditCards']);
      queryClient.invalidateQueries(['currentUserProfile']);

      toast.success('⚡ +10 XP! Transação registrada com sucesso!');

      // Particle effect
      const particles = document.createElement('div');
      particles.innerHTML = '✨';
      particles.style.position = 'fixed';
      particles.style.fontSize = '30px';
      particles.style.left = '50%';
      particles.style.top = '50%';
      particles.style.pointerEvents = 'none';
      particles.style.animation = 'particleBurst 1s ease-out';
      document.body.appendChild(particles);
      setTimeout(() => particles.remove(), 1000);

      resetForm();
      setIsOpen(false);
    }
  });

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setAccountId('');
    setEnvelopeId('');
    setCreditCardId('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!amount || !description) {
      toast.error('Preencha valor e descrição');
      return;
    }

    if (type === 'expense' && !creditCardId && !accountId) {
      toast.error('Selecione uma conta ou cartão');
      return;
    }

    createTransaction.mutate({
      type,
      amount: parseFloat(amount),
      description,
      date: new Date().toISOString().split('T')[0],
      account_id: accountId || null,
      envelope_id: envelopeId || null,
      credit_card_id: creditCardId || null
    });
  };

  return (
    <>
      <style>{`
        @keyframes particleBurst {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -100px) scale(2); opacity: 0; }
        }
      `}</style>

      {/* FAB */}
      <motion.div
        className="fixed bottom-8 right-8 z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600 shadow-[0_0_30px_rgba(0,255,255,0.6)] glow-cyan"
        >
          <Plus className="w-8 h-8 text-white" />
        </Button>
      </motion.div>

      {/* Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#0a0a1a] border-2 border-cyan-500/50 max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-black text-white">LANÇAMENTO RÁPIDO</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-3 rounded-lg font-bold transition-all ${type === 'expense'
                      ? 'bg-red-500/20 text-red-400 border-2 border-red-500'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                >
                  <TrendingDown className="w-5 h-5 inline mr-2" />
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-3 rounded-lg font-bold transition-all ${type === 'income'
                      ? 'bg-green-500/20 text-green-400 border-2 border-green-500'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                >
                  <TrendingUp className="w-5 h-5 inline mr-2" />
                  Receita
                </button>
              </div>

              <Input
                type="number"
                placeholder="R$ 0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-gray-900 border-cyan-500/30 text-white text-xl"
                required
              />

              <Input
                placeholder="Descrição"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-gray-900 border-cyan-500/30 text-white"
                required
              />

              {type === 'expense' && (
                <>
                  <Select value={creditCardId} onValueChange={setCreditCardId}>
                    <SelectTrigger className="bg-gray-900 border-cyan-500/30 text-white">
                      <SelectValue placeholder="💳 Cartão (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {creditCards.map(card => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.icon} {card.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!creditCardId && (
                    <Select value={accountId} onValueChange={setAccountId}>
                      <SelectTrigger className="bg-gray-900 border-cyan-500/30 text-white">
                        <SelectValue placeholder="💰 Conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.icon} {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Select value={envelopeId} onValueChange={setEnvelopeId}>
                    <SelectTrigger className="bg-gray-900 border-cyan-500/30 text-white">
                      <SelectValue placeholder="📦 Envelope (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {envelopes.map(env => (
                        <SelectItem key={env.id} value={env.id}>
                          {env.icon} {env.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {type === 'income' && (
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="bg-gray-900 border-cyan-500/30 text-white">
                    <SelectValue placeholder="💰 Conta de Destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.icon} {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600 text-white font-bold py-6"
                disabled={createTransaction.isPending}
              >
                {createTransaction.isPending ? 'Salvando...' : 'Confirmar Lançamento'}
              </Button>
            </form>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}