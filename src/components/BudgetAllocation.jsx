import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NeonCard from './NeonCard';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function BudgetAllocation({ envelopes, availableMana, currentMonth }) {
  const queryClient = useQueryClient();
  const [allocatingTo, setAllocatingTo] = useState(null);
  const [allocationAmount, setAllocationAmount] = useState('');

  const allocateMutation = useMutation({
    mutationFn: async ({ envelopeId, amount }) => {
      const envelope = envelopes.find(e => e.id === envelopeId);
      if (!envelope) throw new Error('Envelope não encontrado');

      const newAllocated = envelope.allocated_amount + amount;
      await base44.entities.BudgetEnvelope.update(envelopeId, {
        allocated_amount: newAllocated
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetEnvelopes']);
      queryClient.invalidateQueries(['accounts']);
      toast.success('⚡ Mana alocada com sucesso!');
      setAllocatingTo(null);
      setAllocationAmount('');
    },
    onError: () => {
      toast.error('Erro ao alocar mana');
    }
  });

  const handleAllocate = (envelope) => {
    const amount = parseFloat(allocationAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Digite um valor válido');
      return;
    }

    if (amount > availableMana) {
      toast.error('⚠️ MANA INSUFICIENTE! Você não pode orçamentar mais do que possui.');
      return;
    }

    allocateMutation.mutate({ envelopeId: envelope.id, amount });
  };

  const quickAllocate = (envelope, percentage) => {
    const amount = (availableMana * percentage) / 100;
    allocateMutation.mutate({ envelopeId: envelope.id, amount });
  };

  return (
    <NeonCard glowColor="purple">
      <div className="flex items-center gap-2 mb-6">
        <Package className="w-6 h-6 text-purple-400" />
        <h2 className="text-2xl font-black text-white">ENVELOPES DE ORÇAMENTO</h2>
      </div>

      <div className="space-y-3">
        {envelopes.map((envelope) => {
          const remaining = envelope.allocated_amount - envelope.spent_amount;
          const percentage = envelope.allocated_amount > 0 
            ? (envelope.spent_amount / envelope.allocated_amount) * 100 
            : 0;
          const isOverspent = envelope.spent_amount > envelope.allocated_amount;

          return (
            <motion.div
              key={envelope.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#0a0a1a] rounded-xl p-4 border border-purple-500/30"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{envelope.icon}</span>
                  <div>
                    <h3 className="text-white font-bold">{envelope.name}</h3>
                    <p className="text-xs text-gray-400">
                      Gasto: R$ {envelope.spent_amount.toFixed(2)} / Alocado: R$ {envelope.allocated_amount.toFixed(2)}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => setAllocatingTo(envelope.id)}
                  className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Alocar
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="relative h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(percentage, 100)}%` }}
                  className={`h-full ${isOverspent ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-cyan-500'}`}
                />
              </div>

              <div className="flex justify-between items-center mt-2">
                <span className={`text-sm font-bold ${isOverspent ? 'text-red-400' : 'text-green-400'}`}>
                  {isOverspent ? 'Estourado' : 'Restante'}: R$ {Math.abs(remaining).toFixed(2)}
                </span>
                <span className="text-xs text-gray-400">{percentage.toFixed(0)}%</span>
              </div>

              {/* Allocation Modal */}
              {allocatingTo === envelope.id && (
                <div className="mt-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
                  <div className="flex gap-2 mb-2">
                    <Input
                      type="number"
                      placeholder="R$ 0,00"
                      value={allocationAmount}
                      onChange={(e) => setAllocationAmount(e.target.value)}
                      className="bg-gray-900 border-purple-500/30 text-white"
                    />
                    <Button
                      onClick={() => handleAllocate(envelope)}
                      className="bg-gradient-to-r from-purple-500 to-cyan-500"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setAllocatingTo(null)}
                      className="border-gray-600"
                    >
                      ✕
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => quickAllocate(envelope, 25)}
                      className="flex-1 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                      disabled={availableMana <= 0}
                    >
                      25%
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => quickAllocate(envelope, 50)}
                      className="flex-1 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                      disabled={availableMana <= 0}
                    >
                      50%
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => quickAllocate(envelope, 100)}
                      className="flex-1 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                      disabled={availableMana <= 0}
                    >
                      100%
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </NeonCard>
  );
}