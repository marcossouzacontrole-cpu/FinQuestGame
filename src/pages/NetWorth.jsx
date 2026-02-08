import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Crown, Swords, Filter, ArrowUpDown, Award, Skull, Shield, Flame, Sparkles, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';
import NeonCard from '../components/NeonCard';
import NetWorthStrategicAdvisor from '../components/NetWorthStrategicAdvisor';
import BattleDataImporter from '../components/BattleDataImporter';
import CategoryManager from '../components/CategoryManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function NetWorth() {
  const queryClient = useQueryClient();
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editingDebt, setEditingDebt] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);

  const [assetForm, setAssetForm] = useState({
    name: '',
    value: '',
    type: 'cash',
    acquisition_date: ''
  });

  const [debtForm, setDebtForm] = useState({
    creditor: '',
    outstanding_balance: '',
    total_amount: '',
    interest_rate: '',
    type: 'other',
    due_date: '',
    description: ''
  });

  const [accountForm, setAccountForm] = useState({
    name: '',
    balance: '',
    type: '',
    icon: '',
    color: ''
  });

  const [debtSort, setDebtSort] = useState('due_date');
  const [debtFilter, setDebtFilter] = useState('all');
  const [assetSort, setAssetSort] = useState('liquidity');
  const [assetFilter, setAssetFilter] = useState('all');

  // Ler parâmetro de URL para definir aba inicial
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'battle';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [battleView, setBattleView] = useState('all'); // 'all', 'assets' or 'debts'

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userData } = useQuery({
    queryKey: ['currentUserProfile', currentUser?.email],
    queryFn: async () => {
      if (currentUser?.email) {
        const profiles = await base44.entities.User.filter({ email: currentUser.email });
        return profiles && profiles.length > 0 ? profiles[0] : null;
      }
      return null;
    },
    enabled: !!currentUser,
  });

  // Fetch budget categories
  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories', currentUser?.email],
    queryFn: () => base44.entities.BudgetCategory.filter({ created_by: currentUser.email }),
    enabled: !!currentUser?.email
  });

  // Fetch NetWorth Data
  const { data: netWorthData, isLoading } = useQuery({
    queryKey: ['netWorthSummary', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return { assets: [], debts: [], accounts: [] };

      const [assetsResponse, debtsResponse, accountsResponse] = await Promise.all([
        base44.entities.Asset.filter({ created_by: currentUser.email }),
        base44.entities.Debt.filter({ created_by: currentUser.email }),
        base44.entities.Account.filter({ created_by: currentUser.email })
      ]);

      return {
        assets: assetsResponse || [],
        debts: debtsResponse || [],
        accounts: accountsResponse || []
      };
    },
    enabled: !!currentUser?.email
  });

  let assets = netWorthData?.assets || [];
  let debts = netWorthData?.debts || [];
  const accounts = netWorthData?.accounts || [];

  // Filter assets
  if (assetFilter !== 'all') {
    assets = assets.filter(asset => asset.type === assetFilter);
  }

  // Ordem de liquidez para ativos
  const assetLiquidityOrder = {
    'cash': 1,
    'investment': 2,
    'vehicle': 3,
    'real_estate': 4
  };

  // Sort assets
  assets = [...assets].sort((a, b) => {
    if (assetSort === 'name') return a.name.localeCompare(b.name);
    if (assetSort === 'value') return b.value - a.value;
    if (assetSort === 'type') return a.type.localeCompare(b.type);
    if (assetSort === 'liquidity') {
      const orderA = assetLiquidityOrder[a.type] || 99;
      const orderB = assetLiquidityOrder[b.type] || 99;
      return orderA - orderB;
    }
    return 0;
  });

  // Filter debts
  if (debtFilter !== 'all') {
    debts = debts.filter(debt => debt.type === debtFilter);
  }

  // Sort debts - vencimento (curto prazo primeiro) é a ordem padrão
  debts = [...debts].sort((a, b) => {
    if (debtSort === 'creditor') return a.creditor.localeCompare(b.creditor);
    if (debtSort === 'balance') return b.outstanding_balance - a.outstanding_balance;
    if (debtSort === 'due_date') {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    }
    return 0;
  });

  const assetsValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  const accountsValue = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalAssets = assetsValue + accountsValue;
  const totalDebts = (netWorthData?.debts || []).reduce((sum, debt) => sum + debt.outstanding_balance, 0);
  const netWorth = totalAssets - totalDebts;

  // Asset Mutations
  const createAsset = useMutation({
    mutationFn: (data) => base44.entities.Asset.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['netWorthSummary']);
      setShowAssetForm(false);
      setAssetForm({ name: '', value: '', type: 'cash', acquisition_date: '' });
      toast.success('Ativo adicionado com sucesso! 💎');
    }
  });

  const updateAsset = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Asset.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['netWorthSummary']);
      setEditingAsset(null);
      setShowAssetForm(false);
      setAssetForm({ name: '', value: '', type: 'cash', acquisition_date: '' });
      toast.success('Ativo atualizado! 📈');
    }
  });

  const deleteAsset = useMutation({
    mutationFn: (id) => base44.entities.Asset.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['netWorthSummary']);
      toast.success('Ativo removido');
    }
  });

  const deleteAllAssets = useMutation({
    mutationFn: async () => {
      const allAssets = netWorthData?.assets || [];
      await Promise.all(allAssets.map(asset => base44.entities.Asset.delete(asset.id)));
      return allAssets.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries(['netWorthSummary']);
      toast.success(`🗑️ ${count} ativo${count > 1 ? 's' : ''} removido${count > 1 ? 's' : ''}!`);
    }
  });

  // Debt Mutations
  const createDebt = useMutation({
    mutationFn: (data) => base44.entities.Debt.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['netWorthSummary']);
      setShowDebtForm(false);
      resetDebtForm();
      toast.success('Dívida registrada');
    }
  });

  const updateDebt = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Debt.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['netWorthSummary']);
      setShowDebtForm(false);
      resetDebtForm();
      toast.success('Dívida atualizada');
    }
  });

  const deleteDebt = useMutation({
    mutationFn: (id) => base44.entities.Debt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['netWorthSummary']);
      toast.success('Dívida removida! 🎉');
    }
  });

  const deleteAllDebts = useMutation({
    mutationFn: async () => {
      const allDebts = netWorthData?.debts || [];
      await Promise.all(allDebts.map(debt => base44.entities.Debt.delete(debt.id)));
      return allDebts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries(['netWorthSummary']);
      toast.success(`💀 ${count} dívida${count > 1 ? 's' : ''} eliminada${count > 1 ? 's' : ''}!`);
    }
  });

  // Account Mutations
  const updateAccount = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Account.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['netWorthSummary']);
      setShowAccountForm(false);
      setEditingAccount(null);
      setAccountForm({ name: '', balance: '', type: '', icon: '', color: '' });
      toast.success('Conta atualizada! 💰');
    }
  });

  const deleteAccount = useMutation({
    mutationFn: (id) => base44.entities.Account.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['netWorthSummary']);
      toast.success('Conta removida');
    }
  });

  // Apply Debt Strategy
  const applyStrategy = useMutation({
    mutationFn: async (strategyData) => {
      if (!userData?.id) throw new Error('Usuário não encontrado');

      await base44.entities.User.update(userData.id, {
        debt_strategy: strategyData.strategy,
        debt_monthly_payment: strategyData.monthlyPayment,
        debt_strategy_start_date: new Date().toISOString(),
        debt_projected_months: strategyData.projectedMonths,
        debt_projected_interest: strategyData.projectedInterest,
        debt_order: strategyData.debtOrder
      });

      return strategyData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['currentUserProfile']);
      toast.success('🎯 Estratégia de Batalha Ativada!', {
        description: `Você escolheu a estratégia ${data.strategy.toUpperCase()}. Vamos rastrear seu progresso!`
      });
      setActiveTab('battle');
    }
  });

  // Guardian: Power Up Asset
  const powerUpAsset = useMutation({
    mutationFn: async ({ assetId, amount }) => {
      const asset = assets.find(a => a.id === assetId);
      const newValue = asset.value + amount;

      await base44.entities.Asset.update(assetId, {
        value: newValue
      });

      // Award XP for growing assets
      const xpReward = Math.floor(amount / 100);
      if (xpReward > 0 && userData) {
        const currentXP = userData.xp || 0;
        const currentLevel = userData.level || 1;
        const newXP = currentXP + xpReward;
        const xpToNextLevel = currentLevel * 100;

        const leveledUp = newXP >= xpToNextLevel;
        const newLevel = leveledUp ? currentLevel + 1 : currentLevel;
        const remainingXP = leveledUp ? newXP - xpToNextLevel : newXP;

        await base44.entities.User.update(userData.id, {
          xp: remainingXP,
          level: newLevel,
          total_xp: (userData.total_xp || 0) + xpReward
        });

        return { newValue, xpReward, leveledUp, newLevel };
      }

      return { newValue, xpReward: 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['netWorthSummary']);
      queryClient.invalidateQueries(['currentUserProfile']);

      if (data.xpReward > 0) {
        toast.success(`🛡️ Guardião Fortalecido! +${data.xpReward} XP`, {
          description: data.leveledUp ? `🎊 Level Up! Você é nível ${data.newLevel}!` : `Novo valor: R$ ${data.newValue.toFixed(2)}`
        });
      } else {
        toast.success('🛡️ Guardião Fortalecido!', {
          description: `Novo valor: R$ ${data.newValue.toFixed(2)}`
        });
      }
    }
  });

  // Enemy Battle: Damage Debt
  const damageDebt = useMutation({
    mutationFn: async ({ debtId, amount }) => {
      const debt = debts.find(d => d.id === debtId);
      const newBalance = Math.max(0, debt.outstanding_balance - amount);

      if (newBalance === 0) {
        // Enemy defeated! Award XP
        const xpReward = Math.floor(debt.total_amount / 100);
        const currentXP = userData?.xp || 0;
        const currentLevel = userData?.level || 1;
        const newXP = currentXP + xpReward;
        const xpToNextLevel = currentLevel * 100;

        const leveledUp = newXP >= xpToNextLevel;
        const newLevel = leveledUp ? currentLevel + 1 : currentLevel;
        const remainingXP = leveledUp ? newXP - xpToNextLevel : newXP;

        await base44.entities.User.update(userData.id, {
          xp: remainingXP,
          level: newLevel,
          total_xp: (userData.total_xp || 0) + xpReward
        });

        await base44.entities.Debt.delete(debtId);

        return { defeated: true, xpReward, leveledUp, newLevel };
      } else {
        await base44.entities.Debt.update(debtId, {
          outstanding_balance: newBalance
        });
        return { defeated: false, newBalance };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['netWorthSummary']);
      queryClient.invalidateQueries(['currentUserProfile']);

      if (data.defeated) {
        toast.success(`💀 Inimigo Derrotado! +${data.xpReward} XP`, {
          description: data.leveledUp ? `🎊 Level Up! Você é nível ${data.newLevel}!` : 'Dívida completamente eliminada!'
        });
      } else {
        toast.success('🗡️ Dano causado!', {
          description: `Novo saldo: R$ ${data.newBalance.toFixed(2)}`
        });
      }
    }
  });

  const handleAssetSubmit = (e) => {
    e.preventDefault();
    if (!assetForm.name || !assetForm.value) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const isCustomCategory = !['cash', 'investment', 'real_estate', 'vehicle'].includes(assetForm.type);

    const data = {
      name: assetForm.name,
      value: parseFloat(assetForm.value),
      type: isCustomCategory ? 'investment' : assetForm.type,
      category_name: assetForm.type,
      acquisition_date: assetForm.acquisition_date || undefined
    };

    if (editingAsset) {
      updateAsset.mutate({ id: editingAsset.id, data });
    } else {
      createAsset.mutate(data);
    }
  };

  const handleDebtSubmit = (e) => {
    e.preventDefault();
    if (!debtForm.creditor || !debtForm.outstanding_balance || !debtForm.total_amount) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const isCustomCategory = !['loan', 'credit_card', 'financing', 'other'].includes(debtForm.type);

    const data = {
      creditor: debtForm.creditor,
      outstanding_balance: parseFloat(debtForm.outstanding_balance),
      total_amount: parseFloat(debtForm.total_amount),
      interest_rate: parseFloat(debtForm.interest_rate) || 0,
      type: isCustomCategory ? 'other' : debtForm.type,
      category_name: debtForm.type,
      due_date: debtForm.due_date || undefined,
      description: debtForm.description || undefined
    };

    if (editingDebt) {
      updateDebt.mutate({ id: editingDebt.id, data });
    } else {
      createDebt.mutate(data);
    }
  };

  const resetDebtForm = () => {
    setDebtForm({
      creditor: '',
      outstanding_balance: '',
      total_amount: '',
      interest_rate: '',
      type: 'other',
      due_date: '',
      description: ''
    });
    setEditingDebt(null);
  };

  const handleAccountSubmit = (e) => {
    e.preventDefault();
    if (!accountForm.name || !accountForm.balance) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const data = {
      name: accountForm.name,
      balance: parseFloat(accountForm.balance),
      type: accountForm.type || 'checking',
      icon: accountForm.icon || '💰',
      color: accountForm.color || '#06b6d4'
    };

    if (editingAccount) {
      updateAccount.mutate({ id: editingAccount.id, data });
    }
  };

  const assetTypeLabels = {
    real_estate: '🏠 Imóvel',
    vehicle: '🚗 Veículo',
    investment: '📈 Investimento',
    cash: '💰 Dinheiro'
  };

  const debtTypeLabels = {
    loan: '🏦 Empréstimo',
    credit_card: '💳 Cartão de Crédito',
    financing: '🏡 Financiamento',
    other: '📋 Outro'
  };

  return (
    <div className="space-y-4 sm:space-y-8 max-w-7xl mx-auto relative overflow-hidden px-2 sm:px-0 pb-20 sm:pb-8">
      {/* Epic Battle Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-3xl"
            animate={{
              x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
              y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
              rotate: [0, 360],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{
              duration: 5 + Math.random() * 3,
              repeat: Infinity,
              delay: i * 0.3
            }}
          >
            {['⚔️', '🛡️', '💀', '⚡', '💎'][i % 5]}
          </motion.div>
        ))}
      </div>

      {/* Epic Header */}
      <motion.div
        className="text-center relative z-10"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="relative inline-block mb-6">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-green-500 via-red-500 to-purple-500 blur-3xl opacity-60"
            animate={{
              scale: [1, 1.4, 1],
              rotate: [0, 360]
            }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <div className="relative flex items-center gap-4">
            <motion.div
              animate={{
                rotate: [0, -20, 20, -20, 0],
                x: [-5, 5, -5, 5, 0]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Shield className="w-16 h-16 text-green-400" />
            </motion.div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-red-500 to-purple-500 tracking-wider">
              ARENA DE BATALHA
            </h1>
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.3, 1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Skull className="w-16 h-16 text-red-500" />
            </motion.div>
          </div>
        </div>
        <motion.p
          className="text-red-400 text-xl font-bold flex items-center justify-center gap-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Swords className="w-6 h-6 animate-pulse" />
          Fortaleça Guardiões • Derrote Inimigos
          <Flame className="w-6 h-6 animate-pulse" />
        </motion.p>
      </motion.div>

      {/* Battle Data Importer */}
      <BattleDataImporter />

      {/* Net Worth Summary */}
      <NeonCard glowColor={netWorth >= 0 ? 'green' : 'gold'} className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/10 to-magenta-500/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Tesouro Total</h2>
                <p className="text-gray-400 text-sm">Patrimônio Líquido</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">Ativos Totais</p>
              <p className="text-3xl font-black text-green-400">R$ {totalAssets.toFixed(2)}</p>
              {accountsValue > 0 && (
                <p className="text-xs text-green-400/60 mt-1">
                  R$ {accountsValue.toFixed(2)} em Slots + R$ {assetsValue.toFixed(2)} em Ativos
                </p>
              )}
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">Passivos Totais</p>
              <p className="text-3xl font-black text-red-400">R$ {totalDebts.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">Patrimônio Líquido</p>
              <p className={`text-4xl font-black ${netWorth >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                R$ {netWorth.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </NeonCard>

      {/* Strategic Advisor (AI Insights) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="relative bg-slate-900/40 border-2 border-cyan-500/20 rounded-2xl p-4 sm:p-6"
      >
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <BrainCircuit className="w-12 h-12 text-cyan-400" />
        </div>
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h3 className="text-white font-black text-lg uppercase tracking-widest">Estratégia do Oráculo</h3>
        </div>

        <NetWorthStrategicAdvisor assets={assets} debts={debts} />
      </motion.div>



      {/* Achievement Milestones */}
      {debts.length === 0 && (netWorthData?.debts || []).length > 0 && (
        <NeonCard glowColor="gold" className="text-center">
          <div className="py-8">
            <Award className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-black text-white mb-2">🎉 Conquista Desbloqueada!</h2>
            <p className="text-yellow-400 text-xl font-bold">LIVRE DE DÍVIDAS</p>
            <p className="text-gray-400 mt-2">Você derrotou todos os seus inimigos!</p>
          </div>
        </NeonCard>
      )}



      {/* Tabbed Content: Battle vs Categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 bg-[#0a0a1a] border border-cyan-500/30">
          <TabsTrigger
            value="battle"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500/20 data-[state=active]:to-orange-500/20 data-[state=active]:text-white"
          >
            <Skull className="w-4 h-4 mr-2" />
            Arena de Batalha
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-green-500/20 data-[state=active]:text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Categorias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="battle" className="mt-6 space-y-6">
          {/* Dropdown para alternar entre Ativos e Passivos */}
          <div className="flex items-center justify-between">
            <Select value={battleView} onValueChange={setBattleView}>
              <SelectTrigger className="w-[200px] bg-[#0a0a1a] border-cyan-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-cyan-400" />
                    Todos
                  </div>
                </SelectItem>
                <SelectItem value="assets">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-400" />
                    Ativos
                  </div>
                </SelectItem>
                <SelectItem value="debts">
                  <div className="flex items-center gap-2">
                    <Skull className="w-4 h-4 text-red-400" />
                    Passivos
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(battleView === 'assets' || battleView === 'all') && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-6 h-6 text-green-400" />
                  Guardiões (Ativos)
                </h2>
                <div className="flex gap-2">
                  {(netWorthData?.assets || []).length > 0 && (
                    <Button
                      onClick={() => {
                        if (window.confirm(`Tem certeza que deseja apagar TODOS os ${(netWorthData?.assets || []).length} ativos?`)) {
                          deleteAllAssets.mutate();
                        }
                      }}
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Apagar Todos
                    </Button>
                  )}
                  <Dialog open={showAssetForm} onOpenChange={setShowAssetForm}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Ativo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#1a1a2e] border-cyan-500/30">
                      <DialogHeader>
                        <DialogTitle className="text-white">Adicionar Ativo</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAssetSubmit} className="space-y-4">
                        <Input
                          placeholder="Nome do Ativo"
                          value={assetForm.name}
                          onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                          className="bg-[#0a0a1a] border-cyan-500/30 text-white"
                        />
                        <Input
                          type="number"
                          placeholder="Valor (R$)"
                          value={assetForm.value}
                          onChange={(e) => setAssetForm({ ...assetForm, value: e.target.value })}
                          className="bg-[#0a0a1a] border-cyan-500/30 text-white"
                        />
                        <Select value={assetForm.type} onValueChange={(value) => setAssetForm({ ...assetForm, type: value })}>
                          <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                            <SelectItem value="cash" className="text-white hover:bg-cyan-500/20 cursor-pointer">💰 Dinheiro</SelectItem>
                            <SelectItem value="investment" className="text-white hover:bg-cyan-500/20 cursor-pointer">📈 Investimento</SelectItem>
                            <SelectItem value="real_estate" className="text-white hover:bg-cyan-500/20 cursor-pointer">🏠 Imóvel</SelectItem>
                            <SelectItem value="vehicle" className="text-white hover:bg-cyan-500/20 cursor-pointer">🚗 Veículo</SelectItem>
                            {budgetCategories
                              .filter(cat => cat.category_type === 'guardian')
                              .map(cat => (
                                <SelectItem key={cat.id} value={cat.name.toLowerCase()} className="text-white hover:bg-cyan-500/20 cursor-pointer">{cat.icon || '🛡️'} {cat.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="date"
                          value={assetForm.acquisition_date}
                          onChange={(e) => setAssetForm({ ...assetForm, acquisition_date: e.target.value })}
                          className="bg-[#0a0a1a] border-cyan-500/30 text-white"
                        />
                        <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-magenta-500">
                          Salvar
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Filters and Sort for Guardians */}
              {(netWorthData?.assets || []).length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <Select value={assetFilter} onValueChange={setAssetFilter}>
                      <SelectTrigger className="w-[180px] bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Filtrar por tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="cash">💰 Dinheiro</SelectItem>
                        <SelectItem value="investment">📈 Investimento</SelectItem>
                        <SelectItem value="real_estate">🏠 Imóvel</SelectItem>
                        <SelectItem value="vehicle">🚗 Veículo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    <Select value={assetSort} onValueChange={setAssetSort}>
                      <SelectTrigger className="w-[180px] bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="liquidity">Liquidez (Maior)</SelectItem>
                        <SelectItem value="name">Nome (A-Z)</SelectItem>
                        <SelectItem value="value">Valor (Maior)</SelectItem>
                        <SelectItem value="type">Tipo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Lista de Ativos incluindo contas */}
              {(assets.length > 0 || accounts.length > 0) ? (
                <NeonCard glowColor="green">
                  <div className="space-y-2">
                    {accounts.map((account, idx) => (
                      <motion.div
                        key={`account-${account.id}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between p-4 bg-[#0a0a1a] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                            style={{ backgroundColor: account.color || '#06b6d4' }}
                          >
                            {account.icon || '💰'}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-bold">{account.name}</h3>
                            <p className="text-gray-400 text-sm">🏦 Conta Bancária - {account.type}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-cyan-400 font-bold text-xl font-mono">
                              R$ {(account.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingAccount(account);
                                setAccountForm({
                                  name: account.name,
                                  balance: account.balance || 0,
                                  type: account.type || '',
                                  icon: account.icon || '💰',
                                  color: account.color || '#06b6d4'
                                });
                                setShowAccountForm(true);
                              }}
                              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (window.confirm(`Tem certeza que deseja remover a conta ${account.name}?`)) {
                                  deleteAccount.mutate(account.id);
                                }
                              }}
                              className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {assets.map((asset, idx) => (
                      <motion.div
                        key={asset.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between p-4 bg-[#0a0a1a] rounded-lg border border-green-500/20 hover:border-green-500/40 transition-all"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-green-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-bold">{asset.name}</h3>
                            <p className="text-gray-400 text-sm">
                              {(() => {
                                const customCategory = asset.category_name
                                  ? budgetCategories.find(cat => cat.name.toLowerCase() === asset.category_name.toLowerCase())
                                  : null;

                                const categoryInfo = customCategory
                                  ? { emoji: customCategory.icon || '🛡️', name: customCategory.name }
                                  : (assetTypeLabels[asset.type] || asset.type);

                                return typeof categoryInfo === 'string' ? categoryInfo : `${categoryInfo.emoji} ${categoryInfo.name}`;
                              })()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold text-xl font-mono">
                              R$ {asset.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingAsset(asset);
                                setAssetForm({
                                  name: asset.name,
                                  value: asset.value,
                                  type: asset.category_name || asset.type,
                                  acquisition_date: asset.acquisition_date || ''
                                });
                                setShowAssetForm(true);
                              }}
                              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteAsset.mutate(asset.id)}
                              className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </NeonCard>
              ) : (netWorthData?.assets || []).length === 0 ? (
                <NeonCard glowColor="cyan">
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                    <p className="text-white font-bold text-xl mb-2">Nenhum Guardião convocado!</p>
                    <p className="text-gray-400">Adicione ativos para convocar guardiões poderosos.</p>
                  </div>
                </NeonCard>
              ) : (
                <NeonCard glowColor="cyan">
                  <p className="text-gray-400 text-center py-8">Use os filtros acima para ver guardiões específicos</p>
                </NeonCard>
              )}
            </div>
          )}

          {(battleView === 'debts' || battleView === 'all') && (

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Skull className="w-6 h-6 text-red-400" />
                  Inimigos Ativos (Dívidas)
                </h2>
                <div className="flex gap-2">
                  {(netWorthData?.debts || []).length > 0 && (
                    <Button
                      onClick={() => {
                        if (window.confirm(`Tem certeza que deseja eliminar TODAS as ${(netWorthData?.debts || []).length} dívidas?`)) {
                          deleteAllDebts.mutate();
                        }
                      }}
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Todas
                    </Button>
                  )}
                  <Dialog open={showDebtForm} onOpenChange={(open) => {
                    setShowDebtForm(open);
                    if (!open) resetDebtForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold">
                        <Plus className="w-4 h-4 mr-2" />
                        Registrar Dívida
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#1a1a2e] border-cyan-500/30 max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-white">
                          {editingDebt ? 'Editar Dívida' : 'Registrar Dívida'}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleDebtSubmit} className="space-y-4">
                        <div>
                          <label className="text-gray-400 text-sm mb-1 block">Credor *</label>
                          <Input
                            placeholder="Ex: Banco ABC, Cartão XYZ"
                            value={debtForm.creditor}
                            onChange={(e) => setDebtForm({ ...debtForm, creditor: e.target.value })}
                            className="bg-[#0a0a1a] border-cyan-500/30 text-white"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-gray-400 text-sm mb-1 block">Saldo Devedor Atual *</label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="R$ 0,00"
                              value={debtForm.outstanding_balance}
                              onChange={(e) => setDebtForm({ ...debtForm, outstanding_balance: e.target.value })}
                              className="bg-[#0a0a1a] border-cyan-500/30 text-white"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-gray-400 text-sm mb-1 block">Valor Total Original *</label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="R$ 0,00"
                              value={debtForm.total_amount}
                              onChange={(e) => setDebtForm({ ...debtForm, total_amount: e.target.value })}
                              className="bg-[#0a0a1a] border-cyan-500/30 text-white"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-gray-400 text-sm mb-1 block">Taxa de Juros (% a.m.)</label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={debtForm.interest_rate}
                              onChange={(e) => setDebtForm({ ...debtForm, interest_rate: e.target.value })}
                              className="bg-[#0a0a1a] border-cyan-500/30 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-gray-400 text-sm mb-1 block">Data de Vencimento</label>
                            <Input
                              type="date"
                              value={debtForm.due_date}
                              onChange={(e) => setDebtForm({ ...debtForm, due_date: e.target.value })}
                              className="bg-[#0a0a1a] border-cyan-500/30 text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-gray-400 text-sm mb-1 block">Tipo de Dívida *</label>
                          <Select value={debtForm.type} onValueChange={(value) => setDebtForm({ ...debtForm, type: value })}>
                            <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a2e] border-cyan-500/30">
                              <SelectItem value="loan" className="text-white hover:bg-cyan-500/20 cursor-pointer">🏦 Empréstimo</SelectItem>
                              <SelectItem value="credit_card" className="text-white hover:bg-cyan-500/20 cursor-pointer">💳 Cartão de Crédito</SelectItem>
                              <SelectItem value="financing" className="text-white hover:bg-cyan-500/20 cursor-pointer">🏡 Financiamento</SelectItem>
                              <SelectItem value="other" className="text-white hover:bg-cyan-500/20 cursor-pointer">📋 Outro</SelectItem>
                              {budgetCategories
                                .filter(cat => cat.category_type === 'enemy')
                                .map(cat => (
                                  <SelectItem key={cat.id} value={cat.name.toLowerCase()} className="text-white hover:bg-cyan-500/20 cursor-pointer">{cat.icon || '💀'} {cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-gray-400 text-sm mb-1 block">Descrição (opcional)</label>
                          <Textarea
                            placeholder="Adicione detalhes sobre esta dívida..."
                            value={debtForm.description}
                            onChange={(e) => setDebtForm({ ...debtForm, description: e.target.value })}
                            className="bg-[#0a0a1a] border-cyan-500/30 text-white resize-none"
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2">
                          {editingDebt && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowDebtForm(false);
                                resetDebtForm();
                              }}
                              className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800"
                            >
                              Cancelar
                            </Button>
                          )}
                          <Button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600"
                          >
                            {editingDebt ? 'Atualizar' : 'Salvar'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Filters and Sort */}
              {(netWorthData?.debts || []).length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <Select value={debtFilter} onValueChange={setDebtFilter}>
                      <SelectTrigger className="w-[180px] bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Filtrar por tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="loan">Empréstimo</SelectItem>
                        <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                        <SelectItem value="financing">Financiamento</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    <Select value={debtSort} onValueChange={setDebtSort}>
                      <SelectTrigger className="w-[180px] bg-[#0a0a1a] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="creditor">Credor (A-Z)</SelectItem>
                        <SelectItem value="balance">Saldo (Maior)</SelectItem>
                        <SelectItem value="due_date">Vencimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Lista de Dívidas */}
              {debts.length > 0 ? (
                <NeonCard glowColor="gold">
                  <div className="space-y-2">
                    {debts.map((debt, idx) => (
                      <motion.div
                        key={debt.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between p-4 bg-[#0a0a1a] rounded-lg border border-red-500/20 hover:border-red-500/40 transition-all"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <Skull className="w-5 h-5 text-red-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-bold">{debt.creditor}</h3>
                            <p className="text-gray-400 text-sm">
                              {(() => {
                                const debtTypeLabels = {
                                  credit_card: { emoji: '💳', name: 'Cartão de Crédito' },
                                  loan: { emoji: '🏦', name: 'Empréstimo' },
                                  financing: { emoji: '🏡', name: 'Financiamento' },
                                  other: { emoji: '📋', name: 'Outro' }
                                };

                                const customCategory = debt.category_name
                                  ? budgetCategories.find(cat => cat.name.toLowerCase() === debt.category_name.toLowerCase())
                                  : null;

                                const categoryInfo = customCategory
                                  ? { emoji: customCategory.icon || '💀', name: customCategory.name }
                                  : (debtTypeLabels[debt.type] || { emoji: '💀', name: debt.type });

                                return `${categoryInfo.emoji} ${categoryInfo.name}`;
                              })()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-red-400 font-bold text-xl font-mono">
                              R$ {debt.outstanding_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            {debt.interest_rate > 0 && (
                              <p className="text-orange-400 text-xs">
                                {debt.interest_rate}% a.m.
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingDebt(debt);
                                setDebtForm({
                                  creditor: debt.creditor,
                                  outstanding_balance: debt.outstanding_balance,
                                  total_amount: debt.total_amount,
                                  interest_rate: debt.interest_rate || '',
                                  type: debt.category_name || debt.type,
                                  due_date: debt.due_date || '',
                                  description: debt.description || ''
                                });
                                setShowDebtForm(true);
                              }}
                              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteDebt.mutate(debt.id)}
                              className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </NeonCard>
              ) : (netWorthData?.debts || []).length === 0 ? (
                <NeonCard glowColor="cyan">
                  <div className="text-center py-12">
                    <Crown className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                    <p className="text-white font-bold text-xl mb-2">Nenhum Inimigo por aqui!</p>
                    <p className="text-gray-400">Você está livre de dívidas. Continue assim! 👑</p>
                  </div>
                </NeonCard>
              ) : (
                <NeonCard glowColor="cyan">
                  <p className="text-gray-400 text-center py-8">Use os filtros acima para ver inimigos específicos</p>
                </NeonCard>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={async () => {
                try {
                  toast.info('🎨 Atualizando ícones...');
                  const response = await base44.functions.invoke('updateCategoryIcons', {});
                  if (response.data.success) {
                    queryClient.invalidateQueries(['budgetCategories']);
                    toast.success('✅ ' + response.data.message, {
                      description: `${response.data.updates?.length || 0} ícones atualizados automaticamente`
                    });
                  }
                } catch (error) {
                  toast.error('❌ Erro ao atualizar ícones');
                }
              }}
              className="bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600 font-bold"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Atualizar Ícones Automaticamente
            </Button>
          </div>
          <CategoryManager />
        </TabsContent>
      </Tabs>

      {/* Dialog para editar conta */}
      <Dialog open={showAccountForm} onOpenChange={(open) => {
        setShowAccountForm(open);
        if (!open) {
          setEditingAccount(null);
          setAccountForm({ name: '', balance: '', type: '', icon: '', color: '' });
        }
      }}>
        <DialogContent className="bg-[#1a1a2e] border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Conta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Nome *</label>
              <Input
                placeholder="Nome da Conta"
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                className="bg-[#0a0a1a] border-cyan-500/30 text-white"
                required
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Saldo *</label>
              <Input
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                value={accountForm.balance}
                onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })}
                className="bg-[#0a0a1a] border-cyan-500/30 text-white"
                required
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Tipo</label>
              <Input
                placeholder="Ex: Corrente, Poupança, Investimento"
                value={accountForm.type}
                onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}
                className="bg-[#0a0a1a] border-cyan-500/30 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Ícone</label>
                <Input
                  placeholder="💰"
                  value={accountForm.icon}
                  onChange={(e) => setAccountForm({ ...accountForm, icon: e.target.value })}
                  className="bg-[#0a0a1a] border-cyan-500/30 text-white text-center text-2xl"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Cor</label>
                <Input
                  type="color"
                  value={accountForm.color}
                  onChange={(e) => setAccountForm({ ...accountForm, color: e.target.value })}
                  className="bg-[#0a0a1a] border-cyan-500/30 h-10"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-magenta-500">
              Atualizar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}