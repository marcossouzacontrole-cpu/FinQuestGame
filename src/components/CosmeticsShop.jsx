import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, ShoppingBag, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NeonCard from './NeonCard';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function CosmeticsShop({ user }) {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('skin');

  const { data: cosmetics = [] } = useQuery({
    queryKey: ['cosmetics', selectedType],
    queryFn: () => base44.entities.CollectibleItem.filter({ type: selectedType }),
  });

  const { data: userItems = [] } = useQuery({
    queryKey: ['userItems', user?.email],
    queryFn: () => base44.entities.Purchase.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (cosmetic) => {
      if ((user.gold_coins || 0) < 9.90) {
        throw new Error('Gold Coins insuficientes');
      }

      const newGold = user.gold_coins - 9.90;
      await base44.entities.User.update(user.id, {
        gold_coins: newGold
      });

      await base44.entities.Purchase.create({
        item_id: cosmetic.id,
        item_name: cosmetic.name,
        price_paid: 9.90,
        purchase_date: new Date().toISOString()
      });

      return { newGold };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cosmetics']);
      queryClient.invalidateQueries(['userItems']);
      queryClient.invalidateQueries(['currentUserProfile']);
      toast.success('🛍️ Cosmético adquirido!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const types = [
    { value: 'skin', label: '👤 Skins', color: 'from-cyan-500 to-blue-500' },
    { value: 'accessory', label: '✨ Acessórios', color: 'from-purple-500 to-pink-500' },
    { value: 'vault_glamour', label: '💎 Temas do Cofre', color: 'from-yellow-500 to-orange-500' }
  ];

  return (
    <NeonCard glowColor="cyan">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-6 h-6 text-cyan-400" />
        <h2 className="text-2xl font-black text-white">Cosmetics Store</h2>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {types.map(type => (
          <Button
            key={type.value}
            onClick={() => setSelectedType(type.value)}
            variant={selectedType === type.value ? 'default' : 'outline'}
            className={`whitespace-nowrap ${
              selectedType === type.value 
                ? `bg-gradient-to-r ${type.color} text-white` 
                : 'border-cyan-500/30'
            }`}
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cosmetics.map((cosmetic, idx) => {
          const owned = userItems.some(p => p.item_id === cosmetic.id);
          
          return (
            <motion.div
              key={cosmetic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-cyan-500/50 transition-all"
            >
              {/* Rarity Badge */}
              <div className="absolute top-2 right-2">
                <Badge className={`text-white border-0 ${
                  cosmetic.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                  cosmetic.rarity === 'epic' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                  cosmetic.rarity === 'rare' ? 'bg-blue-500' :
                  'bg-slate-600'
                }`}>
                  {cosmetic.rarity.toUpperCase()}
                </Badge>
              </div>

              {/* Icon */}
              <p className="text-5xl text-center mb-3">{cosmetic.icon}</p>

              {/* Name & Description */}
              <h3 className="text-white font-bold mb-1 text-center">{cosmetic.name}</h3>
              <p className="text-slate-400 text-xs text-center mb-4">{cosmetic.description}</p>

              {/* Bonuses */}
              {(cosmetic.bonus_xp || cosmetic.bonus_gold) && (
                <div className="text-xs text-cyan-400 text-center mb-4 space-y-1">
                  {cosmetic.bonus_xp && <p>+{cosmetic.bonus_xp} XP</p>}
                  {cosmetic.bonus_gold && <p>+{cosmetic.bonus_gold} Gold</p>}
                </div>
              )}

              {/* Buy Button */}
              <Button
                onClick={() => purchaseMutation.mutate(cosmetic)}
                disabled={owned || purchaseMutation.isPending}
                className={`w-full ${
                  owned
                    ? 'bg-green-500/20 text-green-400 cursor-default'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white'
                }`}
              >
                {purchaseMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : owned ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Possuído
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    9.90G
                  </>
                )}
              </Button>
            </motion.div>
          );
        })}
      </div>

      {cosmetics.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Nenhum cosmético disponível</p>
        </div>
      )}
    </NeonCard>
  );
}