import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Save, X, Zap, BookmarkCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function TransactionRuleManager({ onClose }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newRule, setNewRule] = useState({
    pattern: '',
    category: '',
    transaction_type: 'expense',
    match_type: 'contains'
  });
  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ['transactionRules'],
    queryFn: () => base44.entities.TransactionRule.list('-priority')
  });

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  const createRuleMutation = useMutation({
    mutationFn: (ruleData) => base44.entities.TransactionRule.create(ruleData),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactionRules']);
      setIsCreating(false);
      setNewRule({ pattern: '', category: '', transaction_type: 'expense', match_type: 'contains' });
      toast.success('✨ Regra criada com sucesso!');
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.TransactionRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactionRules']);
      toast.success('Regra excluída');
    }
  });

  const handleCreateRule = () => {
    if (!newRule.pattern || !newRule.category) {
      toast.error('Preencha padrão e categoria');
      return;
    }
    createRuleMutation.mutate(newRule);
  };

  const incomeCategories = budgetCategories.filter(c => c.category_type === 'guardian');
  const expenseCategories = budgetCategories.filter(c => c.category_type === 'expense');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.3)]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-cyan-500/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <BookmarkCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase">Regras de Classificação</h2>
                <p className="text-xs text-slate-400">Automatize a categorização de transações</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(85vh-120px)] overflow-y-auto">
          {/* Create Rule Button */}
          {!isCreating ? (
            <Button
              onClick={() => setIsCreating(true)}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Regra de Classificação
            </Button>
          ) : (
            <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-bold">Criar Nova Regra</h3>
                <button onClick={() => setIsCreating(false)} className="text-slate-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">
                    Padrão de Texto (Histórico)
                  </label>
                  <Input
                    value={newRule.pattern}
                    onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                    placeholder="Ex: UBER, Mercado, Netflix"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Digite parte do histórico que identifica essa transação
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Tipo</label>
                  <Select 
                    value={newRule.transaction_type} 
                    onValueChange={(val) => setNewRule({ ...newRule, transaction_type: val, category: '' })}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      <SelectItem value="expense">💀 Despesa</SelectItem>
                      <SelectItem value="income">💰 Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Categoria</label>
                  <Select 
                    value={newRule.category} 
                    onValueChange={(val) => setNewRule({ ...newRule, category: val })}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      {(newRule.transaction_type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.icon || '📁'} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleCreateRule}
                disabled={!newRule.pattern || !newRule.category}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Regra
              </Button>
            </div>
          )}

          {/* Existing Rules */}
          <div className="space-y-3">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              Regras Ativas ({rules.length})
            </h3>

            {rules.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <BookmarkCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma regra cadastrada</p>
              </div>
            ) : (
              rules.map((rule) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg border ${
                    rule.transaction_type === 'income'
                      ? 'bg-green-900/10 border-green-500/30'
                      : 'bg-red-900/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          rule.transaction_type === 'income'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {rule.transaction_type === 'income' ? '💰 RECEITA' : '💀 DESPESA'}
                        </span>
                        <span className="text-cyan-400 text-xs">
                          {rule.match_type === 'exact' ? '🎯 Exato' : '🔍 Contém'}
                        </span>
                      </div>
                      <p className="text-white font-mono text-sm mb-1">
                        Padrão: <span className="text-cyan-400">"{rule.pattern}"</span>
                      </p>
                      <p className="text-slate-400 text-xs">
                        → Categoria: <span className="text-white font-bold">{rule.category}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                      className="text-red-400 hover:text-red-300 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}