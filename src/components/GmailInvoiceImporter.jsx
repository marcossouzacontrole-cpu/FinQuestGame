import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader2, CheckCircle, Plus, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import NeonCard from './NeonCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function GmailInvoiceImporter() {
  const queryClient = useQueryClient();
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [transactionData, setTransactionData] = useState({
    description: '',
    value: '',
    date: '',
    category: ''
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('importGmailInvoices', {});
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setInvoices(data.invoices);
        toast.success(`📧 ${data.count} fatura${data.count > 1 ? 's' : ''} encontrada${data.count > 1 ? 's' : ''}!`);
      }
    },
    onError: () => {
      toast.error('❌ Erro ao buscar emails');
    }
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.FinTransaction.create({
        description: data.description,
        value: parseFloat(data.value),
        date: data.date,
        type: 'expense',
        category: data.category || 'Fatura'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['finTransactions']);
      setSelectedInvoice(null);
      toast.success('✅ Transação importada!');
    }
  });

  const handleInvoiceClick = (invoice) => {
    setSelectedInvoice(invoice);
    setTransactionData({
      description: invoice.subject,
      value: invoice.extracted_value || '',
      date: invoice.date,
      category: 'Fatura'
    });
  };

  return (
    <NeonCard glowColor="purple">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Gmail Import</h2>
            <p className="text-slate-400 text-sm">Importar faturas do email</p>
          </div>
        </div>

        <Button
          onClick={() => importMutation.mutate()}
          disabled={importMutation.isPending}
          className="bg-red-600 hover:bg-red-700"
        >
          {importMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Mail className="w-5 h-5 mr-2" />
              Buscar Faturas
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {invoices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            {invoices.map((invoice, idx) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleInvoiceClick(invoice)}
                className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-red-500/50 cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm mb-1">{invoice.subject}</p>
                    <p className="text-slate-400 text-xs mb-2">{invoice.from}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(invoice.date).toLocaleDateString('pt-BR')}
                      </span>
                      {invoice.extracted_value && (
                        <span className="text-red-400 font-bold flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          R$ {invoice.extracted_value.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Plus className="w-5 h-5 text-slate-500" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="bg-[#1a1a2e] border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Importar Fatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Descrição"
              value={transactionData.description}
              onChange={(e) => setTransactionData({...transactionData, description: e.target.value})}
              className="bg-[#0a0a1a] border-cyan-500/30 text-white"
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Valor (R$)"
              value={transactionData.value}
              onChange={(e) => setTransactionData({...transactionData, value: e.target.value})}
              className="bg-[#0a0a1a] border-cyan-500/30 text-white"
            />
            <Input
              type="date"
              value={transactionData.date}
              onChange={(e) => setTransactionData({...transactionData, date: e.target.value})}
              className="bg-[#0a0a1a] border-cyan-500/30 text-white"
            />
            <Input
              placeholder="Categoria"
              value={transactionData.category}
              onChange={(e) => setTransactionData({...transactionData, category: e.target.value})}
              className="bg-[#0a0a1a] border-cyan-500/30 text-white"
            />
            <Button
              onClick={() => createTransactionMutation.mutate(transactionData)}
              disabled={createTransactionMutation.isPending || !transactionData.description || !transactionData.value}
              className="w-full bg-gradient-to-r from-cyan-500 to-magenta-500"
            >
              {createTransactionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Importar Transação
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </NeonCard>
  );
}