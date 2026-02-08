import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Check, TrendingUp, TrendingDown, AlertCircle, Loader2, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function BankTransactionImporter() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState('upload'); // upload, processing, review
  const [transactions, setTransactions] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  const { data: transactionRules = [] } = useQuery({
    queryKey: ['transactionRules'],
    queryFn: () => base44.entities.TransactionRule.list()
  });

  const createRuleMutation = useMutation({
    mutationFn: (ruleData) => base44.entities.TransactionRule.create(ruleData),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactionRules']);
      toast.success('Regra de aprendizado salva!');
    }
  });

  // N8N Webhook Integration (Factory Architecture)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setPhase('processing');

      // Ler arquivo como texto (Raw Data)
      const reader = new FileReader();
      const rawData = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(file);
      });

      // Metadados
      const user = await base44.auth.me();

      // Chamada para o n8n com Regras Dinâmicas
      const response = await fetch('http://localhost:5678/webhook/classify-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawData,
          rules: transactionRules, // Enviando as regras do banco
          sourceAccountID: 'imported_account',
          currentUserID: user?.id,
          context: 'extrato_' + file.name.split('.').pop()
        })
      });

      if (!response.ok) throw new Error('Falha no processamento n8n');

      const jsonData = await response.json();

      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        toast.error('Nenhuma transação processada pelo n8n');
        setPhase('upload');
        return;
      }

      const processedTransactions = jsonData.map((t, idx) => ({
        id: `temp_${idx}`,
        original_description: t.description,
        suggested_name: t.description,
        amount: t.amount,
        type: t.type === 'expense' ? 'debt' : 'asset',
        category: t.categoryName,
        subCategory: t.subCategory,
        confidence: 0.9,
        reasoning: 'Classificado pelo Motor Dinâmico FinQuest (n8n)',
        save_as_rule: false // Novo campo para aprendizado
      }));

      setTransactions(processedTransactions);
      setSelectedIds(new Set(processedTransactions.map(t => t.id)));
      setPhase('review');
      toast.success('✨ Processamento Tático em Andamento: Sucesso!');
    } catch (error) {
      toast.error('Erro no Processamento Tático: ' + error.message);
      console.error(error);
      setPhase('upload');
    }
  };

  // processN8NResponse - Logic for persisting transactions
  const importMutation = useMutation({
    mutationFn: async () => {
      const selected = transactions.filter(t => selectedIds.has(t.id));

      const promises = [];

      for (const t of selected) {
        // 0. Salvar como regra se solicitado
        if (t.save_as_rule) {
          promises.push(
            base44.entities.TransactionRule.create({
              pattern: t.original_description,
              category: t.category,
              transaction_type: t.type === 'asset' ? 'income' : 'expense',
              match_type: 'contains',
              priority: 10
            })
          );
        }

        // 1. Garantir que a categoria existe
        let categoryId;
        const existingCat = budgetCategories.find(c => c.name.toLowerCase() === t.category.toLowerCase());

        if (existingCat) {
          categoryId = existingCat.id;
        } else {
          // Criar categoria se não existir
          const newCat = await base44.entities.BudgetCategory.create({
            name: t.category,
            category_type: t.type === 'asset' ? 'income' : 'expense',
            color: '#71717a'
          });
          categoryId = newCat.id;
        }

        // 2. Criar Transação ou Ativo/Dívida conforme tipo (Persistência)
        if (t.type === 'asset') {
          promises.push(
            base44.entities.Asset.create({
              name: t.suggested_name,
              value: t.amount,
              type: 'cash',
              category_name: t.category
            })
          );
        } else {
          promises.push(
            base44.entities.Debt.create({
              creditor: t.suggested_name,
              outstanding_balance: t.amount,
              total_amount: t.amount,
              type: 'other',
              category_name: t.category,
              description: `Importado via n8n: ${t.original_description}`
            })
          );
        }
      }

      await Promise.all(promises);
      return { total: selected.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['netWorthSummary']);
      queryClient.invalidateQueries(['budgetCategories']);
      toast.success(`🎉 ${result.total} itens processados taticamente!`);
      setOpen(false);
      resetState();
    }
  });

  const resetState = () => {
    setPhase('upload');
    setTransactions([]);
    setSelectedIds(new Set());
  };

  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const updateTransaction = (id, field, value) => {
    setTransactions(prev => prev.map(t =>
      t.id === id ? { ...t, [field]: value, edited: true } : t
    ));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
          <FileUp className="w-4 h-4 mr-2" />
          Importar Extrato Bancário
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a1a2e] border-cyan-500/30 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Importação Inteligente de Transações
          </DialogTitle>
        </DialogHeader>

        {phase === 'upload' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileUp className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Faça upload do seu extrato</h3>
              <p className="text-gray-400 text-sm mb-6">
                Formatos aceitos: Excel (.xlsx, .xls), CSV
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="transaction-upload"
              />
              <label htmlFor="transaction-upload">
                <Button asChild className="bg-gradient-to-r from-purple-500 to-pink-500">
                  <span>Selecionar Arquivo</span>
                </Button>
              </label>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
              <h4 className="text-cyan-400 font-bold text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Formato Esperado
              </h4>
              <p className="text-gray-400 text-xs">
                Seu arquivo deve conter colunas como: Data, Descrição, Valor, Tipo/Categoria
              </p>
            </div>
          </div>
        )}

        {phase === 'processing' && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">Processamento Tático em Andamento...</h3>
            <p className="text-gray-400 text-sm">O n8n está orquestrando sua inteligência financeira</p>
          </div>
        )}

        {phase === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold">Revisar Transações</h3>
                <p className="text-gray-400 text-sm">
                  {selectedIds.size} de {transactions.length} selecionadas
                </p>
              </div>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={selectedIds.size === 0 || importMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-500"
              >
                {importMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Importar Selecionadas
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transactions.map(transaction => (
                <div
                  key={transaction.id}
                  className={`bg-[#0a0a1a] border rounded-lg p-4 transition-all ${selectedIds.has(transaction.id)
                    ? 'border-cyan-500/50 bg-cyan-500/5'
                    : 'border-gray-700'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(transaction.id)}
                      onCheckedChange={() => toggleSelection(transaction.id)}
                      className="mt-1"
                    />

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        {transaction.type === 'asset' ? (
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        )}
                        <span className={`font-bold ${transaction.type === 'asset' ? 'text-green-400' : 'text-red-400'}`}>
                          {transaction.type === 'asset' ? 'ATIVO' : 'DÍVIDA'}
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">
                          Confiança: {Math.round(transaction.confidence * 100)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400">Nome</label>
                          <Input
                            value={transaction.suggested_name}
                            onChange={(e) => updateTransaction(transaction.id, 'suggested_name', e.target.value)}
                            className="bg-[#1a1a2e] border-gray-700 text-white text-sm h-8"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Valor</label>
                          <Input
                            type="number"
                            value={transaction.amount}
                            onChange={(e) => updateTransaction(transaction.id, 'amount', parseFloat(e.target.value))}
                            className="bg-[#1a1a2e] border-gray-700 text-white text-sm h-8"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400">Categoria</label>
                          <Input
                            value={transaction.category}
                            onChange={(e) => updateTransaction(transaction.id, 'category', e.target.value)}
                            className="bg-[#1a1a2e] border-gray-700 text-white text-sm h-8"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Tipo</label>
                          <Select
                            value={transaction.type}
                            onValueChange={(value) => updateTransaction(transaction.id, 'type', value)}
                          >
                            <SelectTrigger className="bg-[#1a1a2e] border-gray-700 text-white text-sm h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="asset">Ativo</SelectItem>
                              <SelectItem value="debt">Dívida</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <Checkbox
                            checked={transaction.save_as_rule}
                            onCheckedChange={(val) => updateTransaction(transaction.id, 'save_as_rule', val)}
                          />
                          <span className="text-xs text-cyan-400 font-bold group-hover:text-cyan-300">
                            Sempre classificar assim (Salvar Regra)
                          </span>
                        </label>
                      </div>

                      <details className="text-xs">
                        <summary className="text-gray-500 cursor-pointer hover:text-gray-400">
                          Ver detalhes
                        </summary>
                        <div className="mt-2 space-y-1 text-gray-400">
                          <p><strong>Original:</strong> {transaction.original_description}</p>
                          <p><strong>IA:</strong> {transaction.reasoning}</p>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}