import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import NeonCard from './NeonCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock } from 'lucide-react';

export default function CollectionGallery({ user }) {
  const [filter, setFilter] = useState('all');

  const { data: allItems = [] } = useQuery({
    queryKey: ['collectibleItems'],
    queryFn: () => base44.entities.CollectibleItem.list()
  });

  const collectedIds = user?.collected_items || [];
  
  const rarityColors = {
    common: { bg: 'from-gray-500 to-gray-700', border: 'border-gray-500', glow: 'shadow-gray-500/50' },
    rare: { bg: 'from-blue-500 to-blue-700', border: 'border-blue-500', glow: 'shadow-blue-500/50' },
    epic: { bg: 'from-purple-500 to-purple-700', border: 'border-purple-500', glow: 'shadow-purple-500/50' },
    legendary: { bg: 'from-yellow-500 to-orange-600', border: 'border-yellow-500', glow: 'shadow-yellow-500/50' }
  };

  const filteredItems = filter === 'all' 
    ? allItems 
    : allItems.filter(item => item.type === filter);

  const collectionStats = {
    total: allItems.length,
    collected: collectedIds.length,
    skins: allItems.filter(i => i.type === 'skin' && collectedIds.includes(i.item_id)).length,
    accessories: allItems.filter(i => i.type === 'accessory' && collectedIds.includes(i.item_id)).length,
    glamours: allItems.filter(i => i.type === 'vault_glamour' && collectedIds.includes(i.item_id)).length
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <NeonCard glowColor="cyan" className="text-center p-4">
          <p className="text-gray-400 text-xs mb-1">Total</p>
          <p className="text-white font-bold text-2xl">{collectionStats.collected}/{collectionStats.total}</p>
        </NeonCard>
        <NeonCard glowColor="magenta" className="text-center p-4">
          <p className="text-gray-400 text-xs mb-1">Skins</p>
          <p className="text-white font-bold text-2xl">{collectionStats.skins}</p>
        </NeonCard>
        <NeonCard glowColor="purple" className="text-center p-4">
          <p className="text-gray-400 text-xs mb-1">Acessórios</p>
          <p className="text-white font-bold text-2xl">{collectionStats.accessories}</p>
        </NeonCard>
        <NeonCard glowColor="green" className="text-center p-4">
          <p className="text-gray-400 text-xs mb-1">Glamours</p>
          <p className="text-white font-bold text-2xl">{collectionStats.glamours}</p>
        </NeonCard>
        <NeonCard glowColor="gold" className="text-center p-4">
          <p className="text-gray-400 text-xs mb-1">Progresso</p>
          <p className="text-yellow-400 font-bold text-2xl">
            {Math.round((collectionStats.collected / collectionStats.total) * 100)}%
          </p>
        </NeonCard>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={setFilter} className="space-y-4">
        <TabsList className="bg-[#1a1a2e] border border-cyan-500/30">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="skin">Skins</TabsTrigger>
          <TabsTrigger value="accessory">Acessórios</TabsTrigger>
          <TabsTrigger value="vault_glamour">Glamours</TabsTrigger>
          <TabsTrigger value="bonus">Bônus</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Gallery */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map(item => {
          const isCollected = collectedIds.includes(item.item_id);
          const colors = rarityColors[item.rarity];

          return (
            <NeonCard
              key={item.id}
              glowColor={item.rarity === 'legendary' ? 'gold' : 'cyan'}
              className={`relative ${!isCollected ? 'opacity-50' : ''}`}
            >
              {!isCollected && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                  <Lock className="w-8 h-8 text-gray-400" />
                </div>
              )}
              
              <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full bg-gradient-to-r ${colors.bg} ${colors.border} border`}>
                <span className="text-white text-xs font-bold">{item.rarity[0].toUpperCase()}</span>
              </div>

              <div className="text-center space-y-2">
                <div className="text-5xl">{item.icon}</div>
                <h4 className="text-white font-bold text-sm">{item.name}</h4>
                <p className="text-gray-400 text-xs line-clamp-2">{item.description}</p>
                {isCollected && (item.bonus_xp > 0 || item.bonus_gold > 0) && (
                  <div className="bg-[#0a0a1a]/50 rounded p-1 text-xs">
                    {item.bonus_xp > 0 && <p className="text-cyan-400">+{item.bonus_xp} XP</p>}
                    {item.bonus_gold > 0 && <p className="text-yellow-400">+{item.bonus_gold} Gold</p>}
                  </div>
                )}
              </div>
            </NeonCard>
          );
        })}
      </div>
    </div>
  );
}