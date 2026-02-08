import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Shield, Zap, Plus, Trash2, Edit, X, Save, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const ACCOUNT_TYPES = {
  checking: { label: 'Conta Corrente', icon: Wallet, color: '#06b6d4', emoji: '💰' },
  savings: { label: 'Reserva/Investimento', icon: Shield, color: '#a855f7', emoji: '🏦' },
  cash: { label: 'Dinheiro Físico', icon: Coins, color: '#eab308', emoji: '🪙' },
  investment: { label: 'Investimentos', icon: Zap, color: '#10b981', emoji: '💎' }
};

export default function AccountManagerModal({ accounts = [], onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    balance: 0,
    color: '#06b6d4',
    icon: '💰'
  });
  const queryClient = useQueryClient();

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Account.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Account.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
      setEditingId(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Account.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'checking',
      balance: 0,
      color: '#06b6d4',
      icon: '💰'
    });
    setEditingId(null);
  };

  const handleEdit = (account) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance,
      color: account.color || '#06b6d4',
      icon: account.icon || '💰'
    });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Digite um nome para a conta');
      return;
    }

    const accountData = {
      name: formData.name,
      type: formData.type,
      balance: parseFloat(formData.balance) || 0,
      color: formData.color,
      icon: formData.icon,
      is_active: true
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: accountData });
    } else {
      createMutation.mutate(accountData);
    }
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Tem certeza que deseja excluir "${name}"? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleTypeChange = (type) => {
    const typeConfig = ACCOUNT_TYPES[type];
    setFormData({
      ...formData,
      type,
      color: typeConfig.color,
      icon: typeConfig.emoji
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.2)]"
      >
        {/* Header */}
        <div className="bg-slate-900/95 backdrop-blur-xl border-b border-cyan-500/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center animate-pulse">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider">Gestão de Inventário</h2>
                <p className="text-xs text-slate-400 uppercase tracking-widest">Slots de Mana (Contas)</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-100px)] overflow-y-auto">
          {/* Formulário de Criação/Edição */}
          <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-6">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingId ? 'Editar Slot' : 'Novo Slot de Mana'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Nome do Slot</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Nubank, Cofre, Carteira"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Tipo de Slot</label>
                <Select value={formData.type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] bg-slate-900 border-slate-700">
                    {Object.entries(ACCOUNT_TYPES).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-white hover:bg-slate-800 cursor-pointer">
                        <span className="flex items-center gap-2">
                          {config.emoji} {config.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Saldo Inicial</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                  <Input
                    type="number"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    placeholder="0.00"
                    className="bg-slate-900 border-slate-700 text-white pl-10 font-mono"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingId ? 'Atualizar' : 'Adicionar'}
                </Button>
                {editingId && (
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="border-slate-600 text-slate-400"
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Lista de Contas */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Slots Ativos ({accounts.length})
            </h3>

            <AnimatePresence>
              {accounts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum slot de mana configurado ainda.</p>
                  <p className="text-sm mt-2">Crie seu primeiro slot acima!</p>
                </div>
              ) : (
                accounts.map((account, index) => {
                  const TypeIcon = ACCOUNT_TYPES[account.type]?.icon || Wallet;
                  return (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border transition-all hover:border-cyan-500/50 ${
                        editingId === account.id ? 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'border-slate-700'
                      }`}
                    >
                      <div 
                        className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl border-2 border-white/20"
                        style={{ backgroundColor: account.color || '#06b6d4' }}
                      >
                        {account.icon || '💰'}
                      </div>

                      <div className="flex-1">
                        <h4 className="text-white font-bold">{account.name}</h4>
                        <p className="text-xs text-slate-400 uppercase">
                          {ACCOUNT_TYPES[account.type]?.label || account.type}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Saldo</p>
                        <p className="text-lg font-black text-cyan-400 font-mono">
                          R$ {(account.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(account)}
                          className="p-2 bg-slate-700 hover:bg-cyan-500/20 rounded-lg text-cyan-400 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(account.id, account.name)}
                          className="p-2 bg-slate-700 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}