import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Coins, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function LootBoxShop({ user }) {
  const [selectedBox, setSelectedBox] = useState(null);
  const [openingBox, setOpeningBox] = useState(false);
  const [revealedItems, setRevealedItems] = useState([]);
  const queryClient = useQueryClient();

  const { data: lootBoxes = [] } = useQuery({
    queryKey: ['lootBoxes'],
    queryFn: () => base44.entities.LootBox.list()
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['collectibleItems'],
    queryFn: () => base44.entities.CollectibleItem.list()
  });

  const rarityColors = {
    common: { bg: 'from-gray-500 to-gray-700', border: 'border-gray-500', text: 'text-gray-400' },
    rare: { bg: 'from-blue-500 to-blue-700', border: 'border-blue-500', text: 'text-blue-400' },
    epic: { bg: 'from-purple-500 to-purple-700', border: 'border-purple-500', text: 'text-purple-400' },
    legendary: { bg: 'from-yellow-500 to-orange-600', border: 'border-yellow-500', text: 'text-yellow-400' }
  };

  const openLootBox = useMutation({
    mutationFn: async ({ box, user }) => {
      if (user.gold_coins < box.cost_gold) {
        throw new Error(`Você precisa de ${box.cost_gold} Gold Coins`);
      }

      // Simular abertura: selecionar itens aleatórios baseado na raridade
      const itemCount = Math.floor(Math.random() * (box.max_items - box.min_items + 1)) + box.min_items;
      const selectedItems = [];
      
      // Filtrar itens por raridade apropriada
      const rarityWeights = {
        common: box.rarity === 'common' ? 70 : box.rarity === 'rare' ? 50 : box.rarity === 'epic' ? 30 : 10,
        rare: box.rarity === 'common' ? 25 : box.rarity === 'rare' ? 35 : box.rarity === 'epic' ? 40 : 30,
        epic: box.rarity === 'common' ? 5 : box.rarity === 'rare' ? 13 : box.rarity === 'epic' ? 25 : 40,
        legendary: box.rarity === 'common' ? 0 : box.rarity === 'rare' ? 2 : box.rarity === 'epic' ? 5 : 20
      };

      for (let i = 0; i < itemCount; i++) {
        const rand = Math.random() * 100;
        let chosenRarity = 'common';
        let cumulative = 0;
        
        for (const [rarity, weight] of Object.entries(rarityWeights)) {
          cumulative += weight;
          if (rand <= cumulative) {
            chosenRarity = rarity;
            break;
          }
        }

        const availableItems = allItems.filter(item => item.rarity === chosenRarity);
        if (availableItems.length > 0) {
          const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
          selectedItems.push(randomItem);
        }
      }

      // Aplicar recompensas
      let totalXP = 0;
      let totalGold = 0;
      const newCollectedItems = [...(user.collected_items || [])];
      const newUnlockedSkins = [...(user.unlocked_skins || [])];
      const newAccessories = [...(user.character_accessories || [])];

      for (const item of selectedItems) {
        totalXP += item.bonus_xp || 0;
        totalGold += item.bonus_gold || 0;
        
        if (!newCollectedItems.includes(item.item_id)) {
          newCollectedItems.push(item.item_id);
        }

        if (item.type === 'skin' && !newUnlockedSkins.includes(item.item_id)) {
          newUnlockedSkins.push(item.item_id);
        }
      }

      // Atualizar usuário
      const currentXP = user.xp || 0;
      const currentLevel = user.level || 1;
      const newXP = currentXP + totalXP;
      const xpToNextLevel = currentLevel * 100;
      const leveledUp = newXP >= xpToNextLevel;
      const newLevel = leveledUp ? currentLevel + 1 : currentLevel;
      const remainingXP = leveledUp ? newXP - xpToNextLevel : newXP;
      const skillPoints = leveledUp ? (user.skill_points || 0) + 1 : user.skill_points || 0;

      await base44.entities.User.update(user.id, {
        gold_coins: user.gold_coins - box.cost_gold + totalGold,
        xp: remainingXP,
        total_xp: (user.total_xp || 0) + totalXP,
        level: newLevel,
        skill_points: skillPoints,
        collected_items: newCollectedItems,
        unlocked_skins: newUnlockedSkins
      });

      return { items: selectedItems, totalXP, totalGold, leveledUp, newLevel };
    },
    onSuccess: (data) => {
      setRevealedItems(data.items);
      setOpeningBox(true);
      queryClient.invalidateQueries(['currentUserProfile']);
      
      if (data.leveledUp) {
        toast.success(`🎉 Level Up! Nível ${data.newLevel}!`);
      }
    },
    onError: (error) => {
      toast.error('Erro ao abrir caixa', { description: error.message });
    }
  });

  const handlePurchase = (box) => {
    setSelectedBox(box);
  };

  const confirmPurchase = () => {
    if (selectedBox) {
      openLootBox.mutate({ box: selectedBox, user });
    }
  };

  const closeReveal = () => {
    setOpeningBox(false);
    setRevealedItems([]);
    setSelectedBox(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {lootBoxes.map(box => {
          const colors = rarityColors[box.rarity];
          const canAfford = user?.gold_coins >= box.cost_gold;

          return (
            <NeonCard 
              key={box.id} 
              glowColor={box.rarity === 'legendary' ? 'gold' : 'cyan'}
              className="relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 px-2 py-1 rounded-bl-lg bg-gradient-to-r ${colors.bg}`}>
                <span className="text-white text-xs font-bold uppercase">{box.rarity}</span>
              </div>

              <div className="text-center space-y-3 pt-6">
                <div className="text-6xl">{box.icon}</div>
                <h3 className="text-white font-bold text-lg">{box.name}</h3>
                <p className="text-gray-400 text-xs">{box.description}</p>

                <div className="bg-[#0a0a1a]/50 rounded-lg p-2 border border-cyan-500/20">
                  <p className="text-cyan-400 text-xs">Contém: {box.min_items}-{box.max_items} itens</p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className={`font-bold ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
                    {box.cost_gold} Gold
                  </span>
                </div>

                <Button
                  onClick={() => handlePurchase(box)}
                  disabled={!canAfford || openLootBox.isLoading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600 text-white font-bold disabled:opacity-50"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Comprar
                </Button>
              </div>
            </NeonCard>
          );
        })}
      </div>

      {/* Confirm Purchase Modal */}
      {selectedBox && !openingBox && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <NeonCard glowColor="purple" className="max-w-md w-full">
            <div className="text-center space-y-4">
              <div className="text-6xl">{selectedBox.icon}</div>
              <h3 className="text-xl font-bold text-white">Confirmar Compra</h3>
              <p className="text-gray-300">
                Abrir <span className="text-cyan-400 font-bold">{selectedBox.name}</span>?
              </p>
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                <div className="flex items-center justify-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-bold text-lg">{selectedBox.cost_gold} Gold Coins</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setSelectedBox(null)}
                  variant="outline"
                  className="flex-1 border-cyan-500/50 text-cyan-400"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmPurchase}
                  disabled={openLootBox.isLoading}
                  className="flex-1 bg-gradient-to-r from-green-500 to-cyan-500 text-white font-bold"
                >
                  {openLootBox.isLoading ? 'Abrindo...' : 'Abrir!'}
                </Button>
              </div>
            </div>
          </NeonCard>
        </div>
      )}

      {/* Reveal Animation Modal */}
      {openingBox && revealedItems.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full space-y-6">
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-3xl font-black text-white mb-2">Recompensas Obtidas!</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {revealedItems.map((item, idx) => {
                const colors = rarityColors[item.rarity];
                return (
                  <NeonCard 
                    key={idx} 
                    glowColor={item.rarity === 'legendary' ? 'gold' : 'cyan'}
                    className="text-center animate-[fadeIn_0.5s_ease-in]"
                  >
                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded bg-gradient-to-r ${colors.bg}`}>
                      <span className="text-white text-xs font-bold">{item.rarity.toUpperCase()}</span>
                    </div>
                    <div className="text-4xl mb-2">{item.icon}</div>
                    <h4 className="text-white font-bold text-sm mb-1">{item.name}</h4>
                    <p className="text-gray-400 text-xs">{item.description}</p>
                    {(item.bonus_xp > 0 || item.bonus_gold > 0) && (
                      <div className="mt-2 text-xs">
                        {item.bonus_xp > 0 && <p className="text-cyan-400">+{item.bonus_xp} XP</p>}
                        {item.bonus_gold > 0 && <p className="text-yellow-400">+{item.bonus_gold} Gold</p>}
                      </div>
                    )}
                  </NeonCard>
                );
              })}
            </div>

            <Button
              onClick={closeReveal}
              className="w-full bg-gradient-to-r from-cyan-500 to-magenta-500 text-white font-bold text-lg py-6"
            >
              Continuar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}