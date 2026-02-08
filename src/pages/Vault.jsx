import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Sparkles, X, Trophy, Target, TrendingUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GoalForge from '../components/GoalForge';
import SmartGoalCreator from '../components/SmartGoalCreator';
import NeonCard from '../components/NeonCard';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import VaultOverviewCards from '../components/VaultOverviewCards';
import VaultProgressChart from '../components/VaultProgressChart';
import VaultMilestones from '../components/VaultMilestones';
import VaultSmartRecommendations from '../components/VaultSmartRecommendations';
import VaultTimeline from '../components/VaultTimeline';
import VaultMotivation from '../components/VaultMotivation';
import VaultGoalFilters from '../components/VaultGoalFilters';
import AIGoalRecommendations from '../components/AIGoalRecommendations';
import VaultBadges from '../components/VaultBadges';
import VaultLeaderboard from '../components/VaultLeaderboard';
import VaultRewards from '../components/VaultRewards';

export default function Vault() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [newGoal, setNewGoal] = useState({
    name: '',
    legendary_item: '',
    target_amount: 0,
    icon: '🗡️',
    color: '#FF00FF'
  });
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [sortBy, setSortBy] = useState('progress');

  const queryClient = useQueryClient();

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

  const user = userData;

  const { data: goals = [] } = useQuery({
    queryKey: ['allGoals'],
    queryFn: () => base44.entities.Goal.list('-created_date')
  });

  const createGoal = useMutation({
    mutationFn: (data) => base44.entities.Goal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['allGoals']);
      setShowCreate(false);
      setNewGoal({ name: '', legendary_item: '', target_amount: 0, icon: '🗡️', color: '#FF00FF' });
      toast.success('🎯 Nova conquista criada!', {
        description: 'Comece a depositar para alcançar seu objetivo!'
      });
    }
  });

  const updateGoal = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Goal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['allGoals']);
      setEditingGoal(null);
      toast.success('✅ Conquista atualizada!', {
        description: 'As informações foram atualizadas com sucesso.'
      });
    },
    onError: () => {
      toast.error('Erro ao atualizar conquista');
    }
  });

  const depositToGoal = useMutation({
    mutationFn: async ({ goal, amount, user }) => {
      if (amount <= 0) throw new Error('Valor de depósito inválido');

      const newAmount = (goal.current_amount || 0) + amount;
      const isCompleted = newAmount >= goal.target_amount;

      await base44.entities.Goal.update(goal.id, {
        current_amount: newAmount,
        status: isCompleted ? 'completed' : 'forging',
        completed_date: isCompleted ? new Date().toISOString() : goal.completed_date
      });

      const xpReward = Math.floor(amount / 10);
      const goldReward = Math.floor(amount / 20);
      const currentXP = user.xp || 0;
      const currentLevel = user.level || 1;
      const newXP = currentXP + xpReward;
      const newTotalXP = (user.total_xp || 0) + xpReward;
      const newGold = (user.gold_coins || 0) + goldReward;
      const xpToNextLevel = currentLevel * 100;
      const leveledUp = newXP >= xpToNextLevel;
      const newLevel = leveledUp ? currentLevel + 1 : currentLevel;
      const remainingXP = leveledUp ? newXP - xpToNextLevel : newXP;
      const skillPoints = leveledUp ? (user.skill_points || 0) + 1 : user.skill_points || 0;

      const today = new Date().toISOString().split('T')[0];
      const lastDeposit = user.last_vault_deposit ? new Date(user.last_vault_deposit).toISOString().split('T')[0] : null;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let newStreak = user.vault_deposit_streak || 0;
      if (!lastDeposit || lastDeposit === yesterday) {
        newStreak += 1;
      } else if (lastDeposit !== today) {
        newStreak = 1;
      }

      await base44.entities.User.update(user.id, {
        total_wealth: (user.total_wealth || 0) + amount,
        xp: remainingXP,
        total_xp: newTotalXP,
        level: newLevel,
        skill_points: skillPoints,
        gold_coins: newGold,
        last_vault_deposit: today,
        vault_deposit_streak: newStreak
      });

      return { isCompleted, leveledUp: newLevel > user.level, newLevel };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['allGoals']);
      queryClient.invalidateQueries(['currentUserProfile']);

      if (data?.isCompleted) {
        toast.success('🏆 CONQUISTA COMPLETA!', {
          description: 'Parabéns! Você alcançou seu objetivo financeiro!'
        });
      } else if (data?.leveledUp) {
        toast.success(`⚡ Level Up! Você é nível ${data.newLevel}!`, {
          description: 'Depósito realizado e XP adicionado!'
        });
      } else {
        toast.success('Depósito realizado! XP e Gold adicionados!', {
          description: '💎 Você está mais perto da sua conquista!'
        });
      }
    },
    onError: (error) => {
      toast.error('Erro ao realizar depósito', {
        description: error.message || 'Tente novamente'
      });
    }
  });

  const deleteGoal = useMutation({
    mutationFn: async (goalId) => {
      await base44.entities.Goal.delete(goalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allGoals']);
      setGoalToDelete(null);
      toast.success('Conquista excluída com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir conquista');
    }
  });

  const handleCreateGoal = (goalData = null) => {
    const dataToCreate = goalData || newGoal;

    if (!dataToCreate.name || !dataToCreate.target_amount || dataToCreate.target_amount <= 0) {
      toast.error('Preencha nome e valor alvo');
      return;
    }

    // Verificar se já tem 5 ou mais conquistas ativas
    if (activeGoals.length >= 5) {
      toast.error('Limite de conquistas atingido! 🎯', {
        description: 'Você já tem 5 conquistas ativas. Complete ou exclua alguma antes de criar uma nova. Focar em poucas conquistas aumenta suas chances de sucesso!',
        duration: 5000
      });
      return;
    }

    createGoal.mutate(dataToCreate);
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setShowCreate(false);
  };

  const handleUpdateGoal = () => {
    if (!editingGoal.name || !editingGoal.target_amount || editingGoal.target_amount <= 0) {
      toast.error('Preencha nome e valor alvo');
      return;
    }

    updateGoal.mutate({
      id: editingGoal.id,
      data: {
        name: editingGoal.name,
        legendary_item: editingGoal.legendary_item,
        target_amount: parseFloat(editingGoal.target_amount),
        icon: editingGoal.icon,
        color: editingGoal.color
      }
    });
  };

  const handleDeposit = (goal, amount) => {
    if (!user || !user.id) {
      toast.error('Usuário não encontrado');
      return;
    }
    if (amount <= 0) {
      toast.error('Digite um valor válido');
      return;
    }
    depositToGoal.mutate({ goal, amount: parseFloat(amount), user });
  };

  const handleConfirmDelete = () => {
    if (goalToDelete) {
      deleteGoal.mutate(goalToDelete);
    }
  };

  const activeGoals = goals.filter(g => g.status === 'forging');
  const completedGoals = goals.filter(g => g.status === 'completed');

  const sortedActiveGoals = [...activeGoals].sort((a, b) => {
    switch (sortBy) {
      case 'progress':
        const progressA = (a.current_amount / a.target_amount) * 100;
        const progressB = (b.current_amount / b.target_amount) * 100;
        return progressB - progressA;
      case 'value':
        return b.target_amount - a.target_amount;
      case 'oldest':
        return new Date(a.created_date) - new Date(b.created_date);
      case 'newest':
        return new Date(b.created_date) - new Date(a.created_date);
      default:
        return 0;
    }
  });

  const totalSaved = activeGoals.reduce((sum, goal) => sum + (goal.current_amount || 0), 0);

  const icons = ['🗡️', '🛡️', '💎', '👑', '🏆', '✨', '🎯', '⚡', '🔥', '🌟'];

  return (
    <div className="space-y-4 sm:space-y-8 max-w-7xl mx-auto relative overflow-hidden px-2 sm:px-0 pb-20 sm:pb-8">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-3xl opacity-20"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
              scale: 0
            }}
            animate={{
              y: [null, -20, 0],
              scale: [0, 1.2, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.3
            }}
          >
            {['🏆', '💎', '⚔️', '🛡️', '👑'][i % 5]}
          </motion.div>
        ))}
      </div>

      {/* Epic Header */}
      <motion.div
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/40 via-magenta-900/40 to-cyan-900/40 border-2 border-magenta-500/50 p-8 backdrop-blur-sm shadow-[0_0_40px_rgba(255,0,255,0.3)]"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-magenta-500/20 to-cyan-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Trophy className="w-12 h-12 text-yellow-400" />
              </motion.div>
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-magenta-400 to-cyan-400 animate-pulse text-glow-cyan">
                  TESOURARIA DO CLÃ
                </h1>
                <motion.p
                  className="text-gray-300 text-lg font-bold"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🛡️ Proteja seus tesouros dos Dragões (Inflação e Gastos Fúteis)
                </motion.p>
              </div>
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Shield className="w-10 h-10 text-cyan-400" />
              </motion.div>
            </div>
            <Button
              onClick={() => setShowCreate(!showCreate)}
              className="bg-gradient-to-r from-yellow-500 via-magenta-500 to-purple-500 hover:from-yellow-600 hover:via-magenta-600 hover:to-purple-600 text-white font-bold rounded-xl px-6 py-6 shadow-[0_0_30px_rgba(255,215,0,0.4)] hover:shadow-[0_0_40px_rgba(255,215,0,0.6)] transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova Conquista
            </Button>
          </div>
        </div>
      </motion.div>

      <VaultOverviewCards goals={goals} userData={user} />

      <VaultMotivation goals={goals} />

      <AIGoalRecommendations
        goals={goals}
        userData={user}
        onCreateGoal={handleCreateGoal}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VaultProgressChart goals={goals} />
        <VaultSmartRecommendations goals={goals} userData={user} />
      </div>

      <VaultMilestones goals={goals} totalSaved={totalSaved} userData={user} />

      <VaultBadges goals={goals} userData={user} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VaultLeaderboard userData={user} />
        <VaultRewards goals={goals} userData={user} />
      </div>

      {completedGoals.length > 0 && <VaultTimeline goals={goals} />}

      {showCreate && (
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <div className="inline-flex bg-gray-900 p-1 rounded-xl border border-gray-700">
              <button
                onClick={() => setEditingGoal("manual")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${editingGoal === "manual" || !editingGoal ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                Manual
              </button>
              <button
                onClick={() => setEditingGoal("smart")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${editingGoal === "smart" ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                <Sparkles className="w-3 h-3" />
                IA Smart Goal
              </button>
            </div>
          </div>

          {editingGoal === "smart" ? (
            <SmartGoalCreator
              onCreate={(data) => handleCreateGoal(data)}
              onCancel={() => setShowCreate(false)}
            />
          ) : (
            <NeonCard glowColor="yellow" className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-500/10 to-magenta-500/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-2xl">Criar Nova Conquista</h3>
                      <p className="text-gray-400 text-sm">Defina seu próximo objetivo financeiro</p>
                    </div>
                  </div>
                  <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Nome da conquista (ex: Viagem ao Japão)"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                    className="bg-[#0a0a1a] border-yellow-500/30 text-white placeholder:text-gray-500 focus:border-yellow-500"
                  />
                  <Input
                    placeholder="Título de conquista (ex: Viajante Intergaláctico)"
                    value={newGoal.legendary_item}
                    onChange={(e) => setNewGoal({ ...newGoal, legendary_item: e.target.value })}
                    className="bg-[#0a0a1a] border-yellow-500/30 text-white placeholder:text-gray-500 focus:border-yellow-500"
                  />
                  <Input
                    type="number"
                    placeholder="Valor alvo (R$)"
                    value={newGoal.target_amount}
                    onChange={(e) => setNewGoal({ ...newGoal, target_amount: parseFloat(e.target.value) })}
                    className="bg-[#0a0a1a] border-yellow-500/30 text-white placeholder:text-gray-500 focus:border-yellow-500"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newGoal.icon}
                      onChange={(e) => setNewGoal({ ...newGoal, icon: e.target.value })}
                      className="flex-1 bg-[#0a0a1a] border border-yellow-500/30 text-white rounded-lg px-3 py-2 focus:border-yellow-500"
                    >
                      {icons.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                    <input
                      type="color"
                      value={newGoal.color}
                      onChange={(e) => setNewGoal({ ...newGoal, color: e.target.value })}
                      className="w-16 h-10 rounded-lg cursor-pointer border-2 border-yellow-500/30"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      onClick={() => handleCreateGoal()}
                      className="w-full bg-gradient-to-r from-yellow-500 via-magenta-500 to-purple-500 hover:from-yellow-600 hover:via-magenta-600 hover:to-purple-600 text-white font-bold text-lg py-6 rounded-xl shadow-[0_0_20px_rgba(255,215,0,0.4)]"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Criar Conquista
                    </Button>
                  </div>
                </div>
              </div>
            </NeonCard>
          )}
        </div>
      )}

      {editingGoal && typeof editingGoal === 'object' && (
        <NeonCard glowColor="cyan" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-2xl">Editar Conquista</h3>
                  <p className="text-gray-400 text-sm">Atualize as informações da sua conquista</p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => setEditingGoal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Nome da conquista"
                value={editingGoal.name}
                onChange={(e) => setEditingGoal({ ...editingGoal, name: e.target.value })}
                className="bg-[#0a0a1a] border-cyan-500/30 text-white placeholder:text-gray-500 focus:border-cyan-500"
              />
              <Input
                placeholder="Título de conquista"
                value={editingGoal.legendary_item}
                onChange={(e) => setEditingGoal({ ...editingGoal, legendary_item: e.target.value })}
                className="bg-[#0a0a1a] border-cyan-500/30 text-white placeholder:text-gray-500 focus:border-cyan-500"
              />
              <Input
                type="number"
                placeholder="Valor alvo (R$)"
                value={editingGoal.target_amount}
                onChange={(e) => setEditingGoal({ ...editingGoal, target_amount: parseFloat(e.target.value) })}
                className="bg-[#0a0a1a] border-cyan-500/30 text-white placeholder:text-gray-500 focus:border-cyan-500"
              />
              <div className="flex gap-2">
                <select
                  value={editingGoal.icon}
                  onChange={(e) => setEditingGoal({ ...editingGoal, icon: e.target.value })}
                  className="flex-1 bg-[#0a0a1a] border border-cyan-500/30 text-white rounded-lg px-3 py-2 focus:border-cyan-500"
                >
                  {icons.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
                <input
                  type="color"
                  value={editingGoal.color}
                  onChange={(e) => setEditingGoal({ ...editingGoal, color: e.target.value })}
                  className="w-16 h-10 rounded-lg cursor-pointer border-2 border-cyan-500/30"
                />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <Button
                  onClick={() => setEditingGoal(null)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateGoal}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-lg py-6 rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.4)]"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </div>
        </NeonCard>
      )}

      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">Em Progresso</h2>
            <p className="text-gray-400 text-sm">Suas conquistas em andamento</p>
          </div>
        </div>
        <VaultGoalFilters sortBy={sortBy} onSortChange={setSortBy} />
        {activeGoals.length > 0 ? (
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <AnimatePresence>
              {sortedActiveGoals.map((goal, idx) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: idx * 0.1, type: "spring" }}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <GoalForge
                    goal={goal}
                    onDeposit={handleDeposit}
                    onEdit={handleEditGoal}
                    onDelete={() => setGoalToDelete(goal.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <NeonCard glowColor="cyan" className="text-center py-12">
            <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300 text-lg font-semibold mb-2">
              Nenhuma conquista em progresso
            </p>
            <p className="text-gray-500">
              Clique em "Nova Conquista" para definir seu primeiro objetivo!
            </p>
          </NeonCard>
        )}
      </div>

      {completedGoals.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Conquistas Completas</h2>
              <p className="text-gray-400 text-sm">Seus objetivos alcançados com sucesso</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {completedGoals.map(goal => (
              <NeonCard key={goal.id} glowColor="gold" className="text-center relative hover:scale-105 transition-transform duration-300">
                <button
                  onClick={() => setGoalToDelete(goal.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 flex items-center justify-center transition-all z-10"
                  title="Excluir conquista"
                >
                  <X className="text-red-400 w-3 h-3" />
                </button>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full blur-2xl" />
                  <span className="text-6xl mb-4 block relative animate-pulse">{goal.icon}</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{goal.legendary_item}</h3>
                <p className="text-yellow-400 text-sm mb-2">{goal.name}</p>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-green-400 text-xs font-semibold">CONQUISTADO</p>
                </div>
                <p className="text-gray-300 text-sm font-bold">R$ {goal.target_amount.toFixed(2)}</p>
              </NeonCard>
            ))}
          </div>
        </div>
      )}

      {goalToDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <NeonCard glowColor="red" className="p-6 max-w-sm w-full relative">
            <h3 className="text-xl font-bold text-red-400 mb-2">Confirmar Exclusão</h3>
            <p className="text-gray-300 mb-6">
              Tem certeza que deseja excluir esta conquista? O progresso salvo **não** será recuperado.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setGoalToDelete(null)}
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={deleteGoal.isLoading}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {deleteGoal.isLoading ? 'Excluindo...' : 'Excluir Definitivamente'}
              </Button>
            </div>
          </NeonCard>
        </div>
      )}
    </div>
  );
}