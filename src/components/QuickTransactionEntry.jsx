import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, TrendingUp, TrendingDown, Zap, Camera, X, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useGamification } from './useGamification';

export default function QuickTransactionEntry({ onSuccess }) {
  const queryClient = useQueryClient();
  const { awardXP } = useGamification();
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me()
  });

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx 5MB)');
      return;
    }

    setReceiptFile(file);

    // Preview local
    const reader = new FileReader();
    reader.onload = (e) => setReceiptPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const createTransaction = useMutation({
    mutationFn: async (data) => {
      let receiptUrl = null;

      // 1. Upload do comprovante se houver
      if (receiptFile) {
        setIsUploadingReceipt(true);
        try {
          const uploadResult = await base44.integrations.Core.UploadFile({ file: receiptFile });
          receiptUrl = uploadResult.file_url;
        } catch (error) {
          console.error('Erro ao enviar comprovante:', error);
          toast.error('Erro ao enviar comprovante, continuando sem ele...');
        }
        setIsUploadingReceipt(false);
      }

      // 2. Salvar APENAS no FinTransaction (fonte única de verdade)
      const transaction = await base44.entities.FinTransaction.create({
        ...data,
        receipt_url: receiptUrl
      });

      // 3. Atualizar saldo da conta bancária
      if (data.account_id) {
        const account = accounts.find(a => a.id === data.account_id);
        if (account) {
          const balanceChange = data.type === 'income' ? data.value : -data.value;
          await base44.entities.Account.update(account.id, {
            balance: account.balance + balanceChange
          });
        }
      }

      return { transaction, transactionType: data.type };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['finTransactions']);
      queryClient.invalidateQueries(['accounts']);

      if (currentUser?.email) {
        const isIncome = result.transactionType === 'income';
        const xpAmount = isIncome ? 25 : 10;
        const goldAmount = isIncome ? 10 : 0;
        const reason = isIncome ? 'Receita Registrada (Loot!)' : 'Despesa Registrada';

        awardXP(xpAmount, goldAmount, reason, currentUser.email);
      }

      toast.success(receiptFile ? '✨ Transação registrada com comprovante!' : '✨ Transação registrada com sucesso!');

      setAmount('');
      setDescription('');
      setCategoryId('');
      setAccountId('');
      setDate(new Date().toISOString().split('T')[0]);
      setReceiptFile(null);
      setReceiptPreview(null);

      if (onSuccess) onSuccess();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!amount || !description) {
      toast.error('Preencha valor e descrição');
      return;
    }

    if (!accountId) {
      toast.error('⚠️ Selecione uma conta bancária (obrigatório)');
      return;
    }

    if (!categoryId) {
      toast.error('⚠️ Selecione uma categoria (obrigatório)');
      return;
    }

    // Encontra o nome da categoria pelo ID
    const selectedCat = categories.find(c => c.id === categoryId);

    createTransaction.mutate({
      type,
      value: parseFloat(amount),
      description,
      category: selectedCat ? selectedCat.name : null,
      date,
      account_id: accountId
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#0a0a1a] border border-cyan-500/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Transação Rápida
        </h3>
      </div>

      {/* Type Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`py-2 rounded-lg font-bold text-sm transition-all ${type === 'expense'
              ? 'bg-red-500/20 text-red-400 border-2 border-red-500'
              : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
        >
          <TrendingDown className="w-4 h-4 inline mr-1" />
          Despesa
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`py-2 rounded-lg font-bold text-sm transition-all ${type === 'income'
              ? 'bg-green-500/20 text-green-400 border-2 border-green-500'
              : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-1" />
          Receita
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          placeholder="R$ 0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-gray-900 border-gray-700 text-white"
          required
        />
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-gray-900 border-gray-700 text-white"
        />
      </div>

      <Input
        placeholder="Descrição"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="bg-gray-900 border-gray-700 text-white"
        required
      />

      <Select value={categoryId} onValueChange={setCategoryId} required>
        <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
          <SelectValue placeholder={`Categoria ${type === 'expense' ? 'da Despesa' : 'da Receita'} *`} />
        </SelectTrigger>
        <SelectContent>
          {categories
            .filter(cat => type === 'income' ? cat.category_type === 'guardian' : cat.category_type === 'expense')
            .map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon || '💎'} {cat.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Select value={accountId} onValueChange={setAccountId} required>
        <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
          <SelectValue placeholder="Conta Corrente *" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map(acc => (
            <SelectItem key={acc.id} value={acc.id}>
              {acc.icon || '💰'} {acc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Upload de Comprovante */}
      <div className="space-y-2">
        <label className="text-slate-400 text-xs font-bold uppercase flex items-center gap-2">
          <Camera className="w-4 h-4" />
          Comprovante (Opcional)
        </label>

        {receiptPreview ? (
          <div className="relative bg-slate-800 border-2 border-cyan-500/30 rounded-lg p-3">
            <button
              type="button"
              onClick={removeReceipt}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <img src={receiptPreview} alt="Comprovante" className="w-full h-32 object-cover rounded" />
            <p className="text-cyan-400 text-xs mt-2 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              {receiptFile?.name}
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptUpload}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border-2 border-dashed border-slate-600 hover:border-cyan-500/50 rounded-lg py-3 transition-all">
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400 text-sm">Enviar Arquivo</span>
              </div>
            </label>

            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleReceiptUpload}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border-2 border-dashed border-slate-600 hover:border-cyan-500/50 rounded-lg px-4 py-3 transition-all">
                <Camera className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400 text-sm hidden sm:inline">Câmera</span>
              </div>
            </label>
          </div>
        )}
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600"
        disabled={createTransaction.isPending || isUploadingReceipt}
      >
        <Plus className="w-4 h-4 mr-2" />
        {isUploadingReceipt ? 'Enviando comprovante...' : createTransaction.isPending ? 'Salvando...' : 'Adicionar'}
      </Button>
    </form>
  );
}