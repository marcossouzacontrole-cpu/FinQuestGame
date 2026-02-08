import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Zap, Sparkles, Crown, Coins, Clock, Check, Lock, Gift, Star, Flame, Package, CreditCard, Trophy } from 'lucide-react';
import NeonCard from '../components/NeonCard';
import LootBoxShop from '../components/LootBoxShop';
import StripeShop from '../components/StripeShop';
import BattlePassViewer from '../components/BattlePassViewer';
import CosmeticsShop from '../components/CosmeticsShop';
import ShareAchievementModal from '../components/ShareAchievementModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function Shop() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [celebratingPurchase, setCelebratingPurchase] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [shareAchievement, setShareAchievement] = useState(null);

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

  // Fetch shop items
  const { data: shopItems = [] } = useQuery({
    queryKey: ['shopItems'],
    queryFn: () => base44.entities.ShopItem.list()
  });

  // Fetch user purchases
  const { data: purchases = [] } = useQuery({
    queryKey: ['userPurchases', currentUser?.email],
    queryFn: () => base44.entities.Purchase.filter({ created_by: currentUser.email }, '-purchase_date'),
    enabled: !!currentUser?.email
  });

  // Purchase mutation
  const purchaseItem = useMutation({
    mutationFn: async ({ item, user }) => {
      // Check if user has enough gold
      if ((user.gold_coins || 0) < item.price) {
        throw new Error('Gold Coins insuficientes');
      }

      // Deduct gold coins
      const newGold = user.gold_coins - item.price;
      await base44.entities.User.update(user.id, {
        gold_coins: newGold
      });

      // Create purchase record
      const purchaseData = {
        item_id: item.id,
        item_name: item.name,
        price_paid: item.price,
        purchase_date: new Date().toISOString()
      };

      // If it's a boost, add expiration
      if (item.type === 'boost' && item.boost_duration_hours) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + item.boost_duration_hours);
        purchaseData.boost_expires_at = expiresAt.toISOString();
      }

      await base44.entities.Purchase.create(purchaseData);

      return { item, newGold };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['userPurchases']);
      queryClient.invalidateQueries(['currentUserProfile']);
      
      // Trigger celebration animation
      setCelebratingPurchase(data.item);
      setTimeout(() => setCelebratingPurchase(null), 3000);
      
      toast.success('🎉 COMPRA ÉPICA!', {
        description: `${data.item.name} adicionado ao inventário!`,
        duration: 5000
      });

      // Prompt to share achievement
      setTimeout(() => {
        setShareAchievement({
          type: 'custom',
          title: `Comprou ${data.item.name}!`,
          description: `Acabei de adquirir este item lendário na loja!`,
          icon: data.item.icon,
          metadata: {
            item_name: data.item.name,
            value: data.item.price
          }
        });
      }, 3500);
    },
    onError: (error) => {
      toast.error('Erro na compra', {
        description: error.message
      });
    }
  });

  const handlePurchase = (item) => {
    if (!userData) {
      toast.error('Carregue seu perfil primeiro');
      return;
    }
    purchaseItem.mutate({ item, user: userData });
  };

  const rarityColors = {
    common: { bg: 'from-gray-600 to-gray-800', border: 'border-gray-500', text: 'text-gray-300' },
    rare: { bg: 'from-blue-600 to-blue-800', border: 'border-blue-500', text: 'text-blue-300' },
    epic: { bg: 'from-purple-600 to-purple-800', border: 'border-purple-500', text: 'text-purple-300' },
    legendary: { bg: 'from-yellow-500 to-orange-600', border: 'border-yellow-500', text: 'text-yellow-300' }
  };

  const categoryFilters = [
    { value: 'all', label: 'Todos', icon: '🌟' },
    { value: 'avatar', label: 'Avatar', icon: '👤' },
    { value: 'boost', label: 'Boosts', icon: '⚡' },
    { value: 'special', label: 'Especiais', icon: '✨' }
  ];

  const filteredItems = selectedCategory === 'all' 
    ? shopItems 
    : shopItems.filter(item => item.category === selectedCategory);

  const getActiveBoosts = () => {
    const now = new Date();
    return purchases.filter(p => {
      if (!p.boost_expires_at) return false;
      return new Date(p.boost_expires_at) > now;
    });
  };

  const activeBoosts = getActiveBoosts();

  const ShopItemCard = ({ item }) => {
    const rarity = rarityColors[item.rarity];
    const owned = purchases.some(p => p.item_id === item.id);
    const canAfford = (userData?.gold_coins || 0) >= item.price;
    const levelLocked = (userData?.level || 1) < item.level_required;
    const isHovered = hoveredItem === item.id;

    return (
      <div
        onMouseEnter={() => setHoveredItem(item.id)}
        onMouseLeave={() => setHoveredItem(null)}
        className="h-full"
      >
        <NeonCard 
          glowColor={item.rarity === 'legendary' ? 'gold' : item.rarity === 'epic' ? 'purple' : 'cyan'}
          className={`h-full relative overflow-hidden border-2 ${rarity.border} transition-all duration-300 ${
            isHovered ? 'shadow-[0_0_40px_rgba(0,255,255,0.6)]' : ''
          }`}
        >
          {/* Rarity glow */}
          <div className={`absolute inset-0 bg-gradient-to-br ${rarity.bg} opacity-10`} />
          

        
        <div className="relative space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="text-6xl">
              {item.icon}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={`${rarity.bg} ${rarity.text} border-0 animate-pulse`}>
                {item.rarity.toUpperCase()}
              </Badge>
              {owned && (
                <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 animate-pulse">
                  <Check className="w-3 h-3 mr-1" />
                  Possui
                </Badge>
              )}
              {item.stock > 0 && item.stock <= 5 && !owned && (
                <Badge className="bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse">
                  <Flame className="w-3 h-3 mr-1" />
                  Últimas {item.stock}!
                </Badge>
              )}
            </div>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-white font-bold text-lg mb-1">{item.name}</h3>
            <p className="text-gray-400 text-sm">{item.description}</p>
          </div>

          {/* Boost details */}
          {item.type === 'boost' && (
            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-cyan-400">Bônus:</span>
                <span className="text-white font-bold">+{((item.boost_multiplier - 1) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cyan-400">Duração:</span>
                <span className="text-white font-bold">{item.boost_duration_hours}h</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cyan-400">Tipo:</span>
                <span className="text-white font-bold">
                  {item.boost_type === 'xp' && 'XP'}
                  {item.boost_type === 'gold' && 'Gold'}
                  {item.boost_type === 'xp_and_gold' && 'XP & Gold'}
                </span>
              </div>
            </div>
          )}

          {/* Level requirement */}
          {item.level_required > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className={levelLocked ? 'text-red-400' : 'text-gray-400'}>
                Nível {item.level_required} necessário
              </span>
            </div>
          )}

          {/* Price & Purchase */}
          <div className="flex items-center justify-between pt-3 border-t border-cyan-500/20">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-2xl font-black text-yellow-400">{item.price}</span>
            </div>

            <Button
              onClick={() => handlePurchase(item)}
              disabled={owned || !canAfford || levelLocked}
              className={`w-full ${
                owned 
                  ? 'bg-green-500/20 text-green-400 cursor-default' 
                  : levelLocked
                  ? 'bg-red-500/20 text-red-400'
                  : canAfford
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:shadow-[0_0_30px_rgba(0,255,255,0.7)]'
                  : 'bg-gray-700 text-gray-400'
              } transition-all duration-300`}
            >
              {owned ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Possui
                </>
              ) : levelLocked ? (
                <>
                  <Lock className="w-4 h-4 mr-1" />
                  Bloqueado
                </>
              ) : !canAfford ? (
                'Sem Gold'
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 mr-1" />
                  Comprar
                </>
              )}
            </Button>
          </div>
        </div>
      </NeonCard>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-8 max-w-7xl mx-auto relative px-2 sm:px-0 pb-20 sm:pb-8">
      {/* Share Achievement Modal */}
      {shareAchievement && userData && (
        <ShareAchievementModal
          achievement={shareAchievement}
          user={userData}
          onClose={() => setShareAchievement(null)}
        />
      )}

      {/* Celebration Modal */}
      <AnimatePresence>
        {celebratingPurchase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="relative"
            >
              <NeonCard glowColor="gold" className="p-12 border-4 border-yellow-500">
                {/* Fireworks effect */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 2, 0],
                      x: Math.cos((i / 12) * Math.PI * 2) * 150,
                      y: Math.sin((i / 12) * Math.PI * 2) * 150
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      left: '50%',
                      top: '50%'
                    }}
                  />
                ))}

                <div className="text-center space-y-4 relative z-10">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="text-8xl"
                  >
                    {celebratingPurchase.icon}
                  </motion.div>
                  <h2 className="text-4xl font-black text-yellow-400 animate-pulse">
                    COMPRA REALIZADA!
                  </h2>
                  <p className="text-white text-xl">{celebratingPurchase.name}</p>
                  <div className="flex gap-2 justify-center">
                    <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
                    <Sparkles className="w-6 h-6 text-magenta-400 animate-pulse" />
                    <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                  </div>
                </div>
              </NeonCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="text-center relative">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center justify-center gap-3 mb-4"
        >
          <ShoppingBag className="w-12 h-12 text-cyan-400 animate-pulse" />
          <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-magenta-400 to-cyan-400 animate-pulse">
            LOJA MÍSTICA
          </h1>
          <Gift className="w-12 h-12 text-magenta-400 animate-pulse" />
        </motion.div>
        <p className="text-cyan-400/80 text-lg animate-pulse">
          ✨ Tesouros Lendários te Aguardam ✨
        </p>
      </div>

      {/* User Gold - Enhanced */}
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <NeonCard glowColor="gold" className="text-center relative overflow-hidden">
          {/* Animated background coins */}
          <div className="absolute inset-0 opacity-10">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-4xl"
                animate={{
                  y: ['-100%', '200%'],
                  x: [Math.random() * 100 + '%', Math.random() * 100 + '%'],
                  rotate: [0, 360]
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.3
                }}
              >
                💰
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 relative z-10">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Coins className="w-10 h-10 text-yellow-400" />
            </motion.div>
            <div>
              <p className="text-gray-400 text-sm">Seus Gold Coins</p>
              <motion.p 
                className="text-4xl font-black text-yellow-400"
                key={userData?.gold_coins}
                initial={{ scale: 1.5, color: '#00FF00' }}
                animate={{ scale: 1, color: '#FFD700' }}
                transition={{ duration: 0.5 }}
              >
                {(userData?.gold_coins || 0).toLocaleString()}
              </motion.p>
            </div>
          </div>
        </NeonCard>
      </motion.div>

      {/* Active Boosts - Enhanced */}
      {activeBoosts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <NeonCard glowColor="purple" className="relative overflow-hidden">
            {/* Animated energy waves */}
            <div className="absolute inset-0 opacity-20">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 border-2 border-purple-500 rounded-2xl"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.7,
                    repeat: Infinity
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-3 mb-4 relative z-10">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Zap className="w-6 h-6 text-purple-400" />
              </motion.div>
              <h2 className="text-white font-bold text-xl">⚡ Boosts Ativos</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {activeBoosts.map(boost => {
                const timeLeft = Math.ceil((new Date(boost.boost_expires_at) - new Date()) / (1000 * 60 * 60));
                return (
                  <motion.div 
                    key={boost.id} 
                    className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 relative overflow-hidden"
                    whileHover={{ scale: 1.05 }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-bold">{boost.item_name}</span>
                        <Clock className="w-4 h-4 text-purple-400 animate-pulse" />
                      </div>
                      <p className="text-purple-400 text-sm font-bold">{timeLeft}h restantes</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </NeonCard>
        </motion.div>
      )}

      {/* Tabs for Shop Sections */}
      <Tabs defaultValue="items" className="space-y-6">
        <TabsList className="bg-[#1a1a2e] border border-cyan-500/30 p-1 grid grid-cols-4">
          <TabsTrigger 
            value="items"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-magenta-500/20 data-[state=active]:border data-[state=active]:border-cyan-500/50 data-[state=active]:text-white text-gray-400"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Itens
          </TabsTrigger>
          <TabsTrigger 
            value="lootboxes"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-magenta-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:border data-[state=active]:border-magenta-500/50 data-[state=active]:text-white text-gray-400"
          >
            <Package className="w-4 h-4 mr-2" />
            Loot Boxes
          </TabsTrigger>
          <TabsTrigger 
            value="battlepass"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-pink-500/20 data-[state=active]:border data-[state=active]:border-purple-500/50 data-[state=active]:text-white text-gray-400"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Battle Pass
          </TabsTrigger>
          <TabsTrigger 
            value="premium"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/20 data-[state=active]:to-orange-500/20 data-[state=active]:border data-[state=active]:border-yellow-500/50 data-[state=active]:text-white text-gray-400"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Premium
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-6">
          {/* Category Filters */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categoryFilters.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat.value
                    ? 'bg-gradient-to-r from-cyan-500 to-magenta-500 text-white shadow-[0_0_20px_rgba(0,255,255,0.5)]'
                    : 'bg-[#1a1a2e] border border-cyan-500/30 text-gray-400 hover:border-cyan-500/50'
                }`}
              >
                <span className="mr-2">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

      {/* Daily Deal Banner */}
      {shopItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <NeonCard glowColor="gold" className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10" />
            <motion.div
              className="absolute inset-0"
              animate={{ 
                background: [
                  'radial-gradient(circle at 0% 0%, rgba(255,215,0,0.2) 0%, transparent 50%)',
                  'radial-gradient(circle at 100% 100%, rgba(255,215,0,0.2) 0%, transparent 50%)',
                  'radial-gradient(circle at 0% 0%, rgba(255,215,0,0.2) 0%, transparent 50%)'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-5xl"
                >
                  🎁
                </motion.div>
                <div>
                  <h3 className="text-yellow-400 font-black text-2xl mb-1 flex items-center gap-2">
                    <Star className="w-6 h-6 animate-pulse" />
                    OFERTAS ESPECIAIS
                    <Star className="w-6 h-6 animate-pulse" />
                  </h3>
                  <p className="text-gray-300 text-sm">Itens raros com estoque limitado!</p>
                </div>
              </div>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="bg-red-500/20 border-2 border-red-500 rounded-lg px-4 py-2"
              >
                <p className="text-red-400 font-black text-sm">🔥 QUEIMA DE ESTOQUE</p>
              </motion.div>
            </div>
          </NeonCard>
        </motion.div>
      )}

          {/* Shop Items Grid */}
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredItems.map(item => (
                <ShopItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <NeonCard glowColor="cyan">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-400">
                  Nenhum item disponível nesta categoria
                </p>
              </div>
            </NeonCard>
          )}
        </TabsContent>

        <TabsContent value="lootboxes">
          <NeonCard glowColor="magenta">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              🎁 Loja de Loot Boxes
            </h2>
            <p className="text-gray-400 mb-6">
              Compre caixas misteriosas e ganhe itens colecionáveis raros, skins exclusivas e bônus de XP/Gold!
            </p>
            {userData && <LootBoxShop user={userData} />}
          </NeonCard>
        </TabsContent>

        <TabsContent value="battlepass" className="space-y-6">
          {userData && <BattlePassViewer user={userData} />}
          <div className="mt-8 pt-8 border-t border-slate-700">
            <h3 className="text-white font-black text-2xl mb-4">Cosmetics Exclusivos</h3>
            {userData && <CosmeticsShop user={userData} />}
          </div>
        </TabsContent>

        <TabsContent value="premium">
          <div className="space-y-6">
            <NeonCard glowColor="gold">
              <div className="text-center py-8">
                <Crown className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-pulse" />
                <h2 className="text-3xl font-black text-white mb-2">FINQUEST PREMIUM</h2>
                <p className="text-slate-400 mb-6">Desbloqueie todo o potencial do app com acesso premium</p>
                <div className="inline-block bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg px-6 py-3">
                  <p className="text-yellow-400 text-sm">💳 Pagamento seguro via Stripe</p>
                </div>
              </div>
            </NeonCard>
            <StripeShop userGold={userData?.gold_coins || 0} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating particles background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
            animate={{
              y: ['100vh', '-10vh'],
              x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
              opacity: [0, 0.6, 0]
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: i * 0.3
            }}
          />
        ))}
      </div>
    </div>
  );
}