import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Trophy, Zap, TrendingUp, Flame, Crown, RefreshCw, AlertTriangle, User, Sparkles, Star, Upload, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import NeonCard from '../components/NeonCard';
import XPBar from '../components/XPBar';
import AchievementsPanel from '../components/AchievementsPanel';
import ClassSelector from '../components/ClassSelector';
import ClassSkillTree from '../components/ClassSkillTree';
import CollectionGallery from '../components/CollectionGallery';

import AvatarDisplay from '../components/AvatarDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isResetting, setIsResetting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  // 1. Buscar o usuário logado Base44 (para obter o email)
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  // 2. CORREÇÃO: Usar a CHAVE CONSISTENTE para buscar o perfil (XP, Level, etc.)
  const { data: userData } = useQuery({
    queryKey: ['currentUserProfile', currentUser?.email], 
    queryFn: async () => {
      if (currentUser?.email) {
        // Usa o email do usuário logado para filtrar o perfil de jogo
        const profiles = await base44.entities.User.filter({ email: currentUser.email });
        return profiles && profiles.length > 0 ? profiles[0] : null;
      }
      return null;
    },
    enabled: !!currentUser,
  });

  const user = userData; // Agora 'user' contém os dados atualizados (XP, Level)

  useEffect(() => {
    if (userData?.displayed_items) {
      setSelectedItems(userData.displayed_items);
    }
  }, [userData]);

  // Fetch achievements
  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements', currentUser?.email],
    queryFn: () => base44.entities.Achievement.filter({ created_by: currentUser.email }),
    enabled: !!currentUser?.email
  });

  // Fetch user purchases
  const { data: purchases = [] } = useQuery({
    queryKey: ['userPurchases', currentUser?.email],
    queryFn: () => base44.entities.Purchase.filter({ created_by: currentUser.email }, '-purchase_date'),
    enabled: !!currentUser?.email
  });

  // Fetch shop items to match with purchases
  const { data: shopItems = [] } = useQuery({
    queryKey: ['shopItems'],
    queryFn: () => base44.entities.ShopItem.list()
  });



  // Unlock skill mutation
  const unlockSkill = useMutation({
    mutationFn: async ({ skill, user }) => {
      const newSkillPoints = user.skill_points - skill.cost;
      const newUnlockedSkills = [...(user.unlocked_skills || []), skill.id];

      await base44.entities.User.update(user.id, {
        skill_points: newSkillPoints,
        unlocked_skills: newUnlockedSkills
      });
    },
    onSuccess: () => {
      // CORREÇÃO: Invalida a chave correta para re-renderizar o perfil (XP/Pontos)
      queryClient.invalidateQueries(['currentUserProfile']); 
      toast.success('Habilidade desbloqueada!', {
        description: '⚡ Você está cada vez mais poderoso!'
      });
    }
  });

  const handleUnlockSkill = (skill) => {
    if (user) {
      unlockSkill.mutate({ skill, user });
    }
  };

  // Reset profile mutation
  const resetProfile = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      
      // Delete financial profile
      const profiles = await base44.entities.FinancialProfile.filter({ 
        created_by: currentUser.email 
      });
      for (const profile of profiles) {
        await base44.entities.FinancialProfile.delete(profile.id);
      }

      // Delete all missions
      const missions = await base44.entities.Mission.filter({ 
        created_by: currentUser.email 
      });
      for (const mission of missions) {
        await base44.entities.Mission.delete(mission.id);
      }

      // Delete all goals
      const goals = await base44.entities.Goal.filter({ 
        created_by: currentUser.email 
      });
      for (const goal of goals) {
        await base44.entities.Goal.delete(goal.id);
      }

      // Delete UserLootBoxes
      const userLootBoxes = await base44.entities.UserLootBox.filter({ created_by: currentUser.email });
      for (const item of userLootBoxes) await base44.entities.UserLootBox.delete(item.id);

      // Delete Assets
      const assets = await base44.entities.Asset.filter({ created_by: currentUser.email });
      for (const item of assets) await base44.entities.Asset.delete(item.id);

      // Delete Debts
      const debts = await base44.entities.Debt.filter({ created_by: currentUser.email });
      for (const item of debts) await base44.entities.Debt.delete(item.id);

      // Delete BudgetCategories
      const categories = await base44.entities.BudgetCategory.filter({ created_by: currentUser.email });
      for (const item of categories) await base44.entities.BudgetCategory.delete(item.id);

      // Delete RecurringExpenses
      const expenses = await base44.entities.RecurringExpense.filter({ created_by: currentUser.email });
      for (const item of expenses) await base44.entities.RecurringExpense.delete(item.id);

      // Delete EducationalModules
      const modules = await base44.entities.EducationalModule.filter({ created_by: currentUser.email });
      for (const item of modules) await base44.entities.EducationalModule.delete(item.id);

      // Delete DailyGoals
      const dailyGoals = await base44.entities.DailyGoal.filter({ created_by: currentUser.email });
      for (const item of dailyGoals) await base44.entities.DailyGoal.delete(item.id);

      // Reset user progress
      if (user) {
        await base44.entities.User.update(user.id, {
          level: 1,
          xp: 0,
          total_xp: 0,
          skill_points: 0,
          total_wealth: 0,
          login_streak: 1,
          unlocked_skills: [],
          badges: [],
          character_skin: 'trader_rookie',
          unlocked_skins: ['trader_rookie'],
          character_accessories: [],
          gold_coins: 0,
          level_title: 'Novato',
          completed_modules: [],
          behavior_tags: []
        });
      }
    },
    onSuccess: () => {
      // Invalida todas as queries, incluindo o perfil, após um reset
      queryClient.invalidateQueries(); 
      setIsResetting(false);
      toast.success('Perfil resetado com sucesso!', {
        description: 'Redirecionando para onboarding...'
      });
      setTimeout(() => {
        navigate(createPageUrl('Onboarding'));
      }, 1500);
    },
    onError: () => {
      setIsResetting(false);
      toast.error('Erro ao resetar perfil');
    }
  });

  const handleReset = () => {
    setIsResetting(true);
    resetProfile.mutate();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.User.update(user.id, {
        avatar_image_url: file_url,
        use_custom_avatar: true
      });

      queryClient.invalidateQueries(['currentUserProfile']);
      toast.success('Foto de perfil atualizada!');
    } catch (error) {
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
      }
      };

      const toggleItemSelection = (itemId) => {
      setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else if (prev.length < 5) {
        return [...prev, itemId];
      } else {
        toast.error('Você pode selecionar apenas 5 itens para exibir');
        return prev;
      }
      });
      };

      const saveDisplayedItems = useMutation({
      mutationFn: async () => {
      await base44.entities.User.update(user.id, {
        displayed_items: selectedItems
      });
      },
      onSuccess: () => {
      queryClient.invalidateQueries(['currentUserProfile']);
      toast.success('Vitrine atualizada!');
      }
      });

  const xpToNextLevel = user ? (user.level * 100) : 100;

  const stats = [
    {
      label: 'Nível',
      value: user?.level || 1,
      icon: Trophy,
      color: 'from-yellow-500 to-orange-500'
    },
    {
      label: 'XP Total',
      value: (user?.total_xp || 0).toLocaleString(),
      icon: Zap,
      color: 'from-cyan-500 to-blue-500'
    },
    {
      label: 'Patrimônio',
      value: `R$ ${(user?.total_wealth || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500'
    },
    {
      label: 'Ofensiva',
      value: `${user?.login_streak || 0} dias`,
      icon: Flame,
      color: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-7xl mx-auto px-2 sm:px-4 relative overflow-hidden pb-20 sm:pb-8">
      {/* Epic Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-3xl opacity-20"
            animate={{ 
              x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
              y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
              rotate: [0, 360],
              scale: [0.8, 1.3, 0.8]
            }}
            transition={{
              duration: 6 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.4
            }}
          >
            {['👤', '⚔️', '🎖️', '💎', '👑', '⚡'][i % 6]}
          </motion.div>
        ))}
      </div>

      {/* Epic Header Title */}
      <motion.div 
        className="text-center relative z-10 mb-8"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="relative inline-block">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-500 via-cyan-500 to-magenta-500 blur-3xl opacity-60"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 360]
            }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <div className="relative flex items-center gap-4">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <User className="w-14 h-14 text-cyan-400" />
            </motion.div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-magenta-400 tracking-wider">
              PERFIL DO HERÓI
            </h1>
            <motion.div
              animate={{ 
                rotate: [0, 360]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Crown className="w-14 h-14 text-yellow-400" />
            </motion.div>
          </div>
        </div>
        <motion.p 
          className="text-purple-400 text-xl font-bold mt-4 flex items-center justify-center gap-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Star className="w-6 h-6 animate-pulse" />
          Personalize Seu Guerreiro
          <Sparkles className="w-6 h-6 animate-pulse" />
        </motion.p>
      </motion.div>

      {/* Epic Character Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <NeonCard glowColor="purple" className="relative overflow-hidden">
          <motion.div 
            className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/10 to-magenta-500/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/10 to-cyan-500/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [360, 180, 0]
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />

          <div className="relative">
            <div className="flex flex-col md:flex-row gap-6">
              <motion.div 
                className="flex justify-center md:justify-start relative"
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.3 }}
              >
                <label htmlFor="avatar-upload" className="cursor-pointer relative group">
                  <AvatarDisplay user={user} size="xl" showEquipment />
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="text-white text-center">
                      <Upload className="w-8 h-8 mx-auto mb-1" />
                      <p className="text-xs font-bold">Alterar</p>
                    </div>
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                    </div>
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </motion.div>

              <div className="flex-1 space-y-4">
                <div>
                  <motion.h1 
                    className="text-xl sm:text-2xl lg:text-3xl font-black text-white mb-2"
                    animate={{ 
                      textShadow: [
                        '0 0 10px rgba(0,255,255,0.3)',
                        '0 0 20px rgba(255,0,255,0.5)',
                        '0 0 10px rgba(0,255,255,0.3)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {user?.full_name || 'Jogador'}
                  </motion.h1>
                  <p className="text-cyan-400 text-xs sm:text-sm break-all">
                    {user?.email}
                  </p>
                </div>

                <XPBar 
                  level={user?.level || 1} 
                  currentXP={user?.xp || 0} 
                  xpToNextLevel={xpToNextLevel} 
                />
              </div>
            </div>

            {/* Animated Stats Grid */}
            {/* Display Selected Items Showcase */}
            {user?.displayed_items && user.displayed_items.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-cyan-900/20 to-magenta-900/20 border border-cyan-500/30 rounded-xl">
                <h3 className="text-cyan-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 fill-cyan-400" />
                  Vitrine de Itens
                </h3>
                <div className="flex gap-2 overflow-x-auto">
                  {user.displayed_items.map(purchaseId => {
                    const purchase = purchases.find(p => p.id === purchaseId);
                    if (!purchase) return null;
                    const item = shopItems.find(si => si.id === purchase.item_id);
                    if (!item) return null;
                    return (
                      <div key={purchaseId} className="flex-shrink-0 text-center bg-[#0a0a1a]/50 rounded-lg p-2 border border-cyan-500/20">
                        <div className="text-3xl mb-1">{item.icon}</div>
                        <p className="text-white text-xs font-bold">{item.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div 
                    key={index} 
                    className="bg-[#0a0a1a]/50 rounded-xl p-3 sm:p-4 border border-cyan-500/20"
                    whileHover={{ 
                      scale: 1.05, 
                      borderColor: 'rgba(0,255,255,0.6)',
                      boxShadow: '0 0 20px rgba(0,255,255,0.4)'
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <motion.div 
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2 sm:mb-3`}
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </motion.div>
                    <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
                    <motion.p 
                      className="text-white font-bold text-base sm:text-lg break-words"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {stat.value}
                    </motion.p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </NeonCard>
      </motion.div>

      {/* Logout Section */}
      <NeonCard glowColor="cyan" className="border-cyan-500/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Sair do Aplicativo</h3>
            <p className="text-gray-400 text-xs sm:text-sm mb-4">
              Encerre sua sessão atual de forma segura.
            </p>
            <Button
              onClick={() => base44.auth.logout()}
              variant="outline"
              className="w-full sm:w-auto min-h-[44px] border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 touch-manipulation"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair da Conta
            </Button>
          </div>
        </div>
      </NeonCard>

      {/* Reset Profile Section */}
      <NeonCard glowColor="gold" className="border-red-500/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Resetar Perfil Financeiro</h3>
            <p className="text-gray-400 text-xs sm:text-sm mb-4">
              Recomeçar sua jornada do zero. Isso apagará todas suas missões, metas, progresso e XP.
              Você refará o onboarding com novos objetivos.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto min-h-[44px] border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 touch-manipulation"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resetar Perfil e Objetivos
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1a1a2e] border-red-500/30">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    Esta ação NÃO pode ser desfeita. Isso irá permanentemente deletar:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Todo seu progresso e XP</li>
                      <li>Todas suas missões</li>
                      <li>Todas suas metas financeiras</li>
                      <li>Seu perfil financeiro</li>
                      <li>Habilidades desbloqueadas</li>
                    </ul>
                    <p className="mt-3 text-yellow-400 font-semibold">
                      Você será redirecionado para o onboarding para recomeçar.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-[#0a0a1a] border-cyan-500/30 text-white hover:bg-cyan-500/10">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    disabled={isResetting}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    {isResetting ? 'Resetando...' : 'Sim, resetar tudo'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </NeonCard>

      {/* Epic Tabs */}
      <Tabs defaultValue="class" className="space-y-4 sm:space-y-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <TabsList className="bg-gradient-to-r from-[#1a1a2e] via-[#2a1a3e] to-[#1a1a2e] border-2 border-cyan-500/50 p-1 grid grid-cols-3 lg:grid-cols-5 gap-1 shadow-[0_0_30px_rgba(0,255,255,0.3)]">
            <TabsTrigger 
              value="class"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/30 data-[state=active]:to-pink-500/30 data-[state=active]:border-2 data-[state=active]:border-purple-500 data-[state=active]:shadow-[0_0_20px_rgba(138,43,226,0.6)] text-gray-400 text-xs sm:text-sm min-h-[44px] transition-all"
            >
              <Zap className="w-4 h-4 mr-1 sm:mr-2 animate-pulse" />
              Classe
            </TabsTrigger>
            <TabsTrigger 
              value="achievements"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/30 data-[state=active]:to-orange-500/30 data-[state=active]:border-2 data-[state=active]:border-yellow-500 data-[state=active]:shadow-[0_0_20px_rgba(255,215,0,0.6)] text-gray-400 text-xs sm:text-sm min-h-[44px] transition-all"
            >
              <Trophy className="w-4 h-4 mr-1 sm:mr-2 animate-pulse" />
              <span className="hidden sm:inline">Conquistas</span>
              <span className="sm:hidden">🏆</span>
            </TabsTrigger>
            <TabsTrigger 
              value="skills"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500/30 data-[state=active]:to-emerald-500/30 data-[state=active]:border-2 data-[state=active]:border-green-500 data-[state=active]:shadow-[0_0_20px_rgba(0,255,0,0.6)] text-gray-400 text-xs sm:text-sm min-h-[44px] transition-all"
            >
              <Sparkles className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Habilidades</span>
              <span className="sm:hidden">⚡</span>
            </TabsTrigger>
            <TabsTrigger 
              value="collection"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-magenta-500/30 data-[state=active]:to-purple-500/30 data-[state=active]:border-2 data-[state=active]:border-magenta-500 data-[state=active]:shadow-[0_0_20px_rgba(255,0,255,0.6)] text-gray-400 text-xs sm:text-sm min-h-[44px] transition-all"
            >
              📚 <span className="hidden sm:inline ml-1">Loot Boxes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="inventory"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/30 data-[state=active]:to-yellow-500/30 data-[state=active]:border-2 data-[state=active]:border-orange-500 data-[state=active]:shadow-[0_0_20px_rgba(255,165,0,0.6)] text-gray-400 text-xs sm:text-sm min-h-[44px] transition-all"
            >
              🎒 <span className="hidden sm:inline ml-1">Inventário</span>
            </TabsTrigger>
          </TabsList>
          </motion.div>

          <TabsContent value="class">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <NeonCard glowColor="purple">
                <div className="flex items-center gap-3 mb-6">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-8 h-8 text-purple-400" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white">
                    Escolha sua Classe
                  </h2>
                </div>
                {user && <ClassSelector user={user} />}
              </NeonCard>
            </motion.div>
          </TabsContent>

          <TabsContent value="achievements">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {user && <AchievementsPanel user={user} />}
            </motion.div>
          </TabsContent>

          <TabsContent value="skills">
            <motion.div
              initial={{ opacity: 0, rotateY: -20 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ duration: 0.6 }}
            >
              <NeonCard glowColor="cyan">
                {user && <ClassSkillTree user={user} />}
              </NeonCard>
            </motion.div>
          </TabsContent>

          <TabsContent value="collection">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <NeonCard glowColor="purple">
                <div className="flex items-center gap-3 mb-6">
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-4xl">📚</span>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white">
                    Coleção de Loot Boxes
                  </h2>
                </div>
                <p className="text-gray-400 mb-6">
                  Todos os itens colecionáveis do jogo. Desbloqueie-os abrindo Loot Boxes!
                </p>
                {user && <CollectionGallery user={user} />}
              </NeonCard>
            </motion.div>
          </TabsContent>

          <TabsContent value="inventory">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <NeonCard glowColor="orange">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ 
                        rotate: [0, 360]
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <span className="text-4xl">🎒</span>
                    </motion.div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        Meu Inventário
                      </h2>
                      <p className="text-sm text-gray-400">
                        Selecione até 5 itens para sua vitrine pública
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-400 font-bold text-lg">
                      {selectedItems.length}/5
                    </div>
                    {selectedItems.length > 0 && (
                      <Button
                        onClick={() => saveDisplayedItems.mutate()}
                        disabled={saveDisplayedItems.isPending}
                        className="mt-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                      >
                        Salvar Vitrine
                      </Button>
                    )}
                  </div>
                </div>

                {purchases.length > 0 ? (
                  <div className="space-y-6">
                    {/* Group by category */}
                    {['avatar', 'boost', 'special'].map(category => {
                      const categoryPurchases = purchases.filter(p => {
                        const item = shopItems.find(si => si.id === p.item_id);
                        return item?.category === category;
                      });

                      if (categoryPurchases.length === 0) return null;

                      const categoryNames = {
                        avatar: { name: '👤 Avatar', color: 'cyan' },
                        boost: { name: '⚡ Boosts', color: 'purple' },
                        special: { name: '✨ Especiais', color: 'gold' }
                      };

                      return (
                        <div key={category}>
                          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span>{categoryNames[category].name}</span>
                            <span className="text-sm text-gray-400">({categoryPurchases.length})</span>
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {categoryPurchases.map(purchase => {
                              const item = shopItems.find(si => si.id === purchase.item_id);
                              if (!item) return null;

                              const isSelected = selectedItems.includes(purchase.id);

                              return (
                                <div
                                  key={purchase.id}
                                  onClick={() => toggleItemSelection(purchase.id)}
                                  className={`bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] rounded-xl p-4 border-2 transition-all hover:scale-105 cursor-pointer relative ${
                                    isSelected 
                                      ? 'border-cyan-500 shadow-[0_0_20px_rgba(0,255,255,0.6)]' 
                                      : 'border-cyan-500/30 hover:border-cyan-500/60'
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="absolute top-2 right-2 bg-cyan-500 rounded-full p-1">
                                      <Star className="w-4 h-4 text-white fill-white" />
                                    </div>
                                  )}
                                  <div className="text-center">
                                    <div className="text-5xl mb-2">{item.icon}</div>
                                    <p className="text-white font-bold text-sm mb-1">{item.name}</p>
                                    <p className="text-xs text-gray-400">{item.type}</p>
                                    {purchase.boost_expires_at && new Date(purchase.boost_expires_at) > new Date() && (
                                      <div className="mt-2 bg-purple-500/20 border border-purple-500/30 rounded px-2 py-1">
                                        <p className="text-purple-400 text-xs font-bold">Ativo</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🛒</div>
                    <p className="text-gray-400 mb-4">
                      Você ainda não comprou nenhum item
                    </p>
                    <Button
                      onClick={() => navigate(createPageUrl('Shop'))}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                      Visitar Loja
                    </Button>
                  </div>
                )}
              </NeonCard>
            </motion.div>
          </TabsContent>
          </Tabs>
          </div>
          );
          }