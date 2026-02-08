import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles, TrendingUp, Shield, Zap, Coins } from 'lucide-react';

const rarityConfig = {
  common: {
    border: 'border-gray-500',
    glow: 'shadow-[0_0_10px_rgba(156,163,175,0.3)]',
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
    label: 'Comum'
  },
  rare: {
    border: 'border-blue-500',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    label: 'Raro'
  },
  epic: {
    border: 'border-purple-500',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    label: 'Épico'
  },
  legendary: {
    border: 'border-yellow-500',
    glow: 'shadow-[0_0_25px_rgba(234,179,8,0.6)]',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    label: 'Lendário'
  }
};

const statIcons = {
  xp_boost: { icon: Sparkles, color: 'text-cyan-400' },
  gold_boost: { icon: Coins, color: 'text-yellow-400' },
  budget_defense: { icon: Shield, color: 'text-green-400' },
  investment_power: { icon: TrendingUp, color: 'text-purple-400' }
};

export default function PixelItemCard({ 
  item, 
  isEquipped = false, 
  onEquip, 
  onUnequip,
  onBuy,
  userGold = 0,
  draggable = false 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const rarity = rarityConfig[item.rarity] || rarityConfig.common;
  const StatIcon = statIcons[item.stat_type]?.icon || Zap;
  const statColor = statIcons[item.stat_type]?.color || 'text-gray-400';

  const handleDragStart = (e) => {
    if (!draggable) return;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      item,
      action: isEquipped ? 'unequip' : 'equip'
    }));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const canAfford = !item.buy_cost || userGold >= item.buy_cost;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            draggable={draggable}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={cn(
              'relative bg-[#0a0a1a] rounded-xl border-2 transition-all duration-300 overflow-hidden group',
              rarity.border,
              rarity.glow,
              isDragging && 'opacity-50 scale-95',
              draggable && 'cursor-grab active:cursor-grabbing',
              !isEquipped && !canAfford && 'opacity-40',
              'hover:scale-105 hover:z-10'
            )}
            style={{ imageRendering: 'pixelated' }}
          >
            {/* Rarity Glow Background */}
            <div className={cn('absolute inset-0', rarity.bg)} />

            {/* Item Icon/Visual */}
            <div className="relative p-4 flex flex-col items-center">
              <div className="text-5xl mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] transform group-hover:scale-110 transition-transform">
                {item.icon || item.visual_asset_url || '❓'}
              </div>

              {/* Item Name */}
              <h4 className="text-white font-bold text-sm text-center mb-1 line-clamp-2">
                {item.name}
              </h4>

              {/* Rarity Badge */}
              <div className={cn(
                'px-2 py-0.5 rounded-full text-xs font-semibold mb-2',
                rarity.bg,
                rarity.text
              )}>
                {rarity.label}
              </div>

              {/* Quick Stats */}
              {item.financial_stat_bonus > 0 && (
                <div className={cn('flex items-center gap-1 text-xs font-semibold', statColor)}>
                  <StatIcon className="w-3 h-3" />
                  <span>+{(item.financial_stat_bonus * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="relative p-2 border-t border-gray-700/50">
              {isEquipped ? (
                <button
                  onClick={() => onUnequip?.(item)}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-semibold py-2 rounded-lg text-xs transition-all"
                >
                  Desequipar
                </button>
              ) : item.buy_cost > 0 ? (
                <button
                  onClick={() => onBuy?.(item)}
                  disabled={!canAfford}
                  className={cn(
                    'w-full font-semibold py-2 rounded-lg text-xs transition-all',
                    canAfford
                      ? 'bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400'
                      : 'bg-gray-500/20 border border-gray-500/30 text-gray-500 cursor-not-allowed'
                  )}
                >
                  {canAfford ? `Comprar (${item.buy_cost} 💰)` : 'Moedas Insuficientes'}
                </button>
              ) : (
                <button
                  onClick={() => onEquip?.(item)}
                  className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 font-semibold py-2 rounded-lg text-xs transition-all"
                >
                  Equipar
                </button>
              )}
            </div>

            {/* Equipped Badge */}
            {isEquipped && (
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)]">
                ✓
              </div>
            )}

            {/* Drag Indicator */}
            {draggable && (
              <div className="absolute top-2 left-2 text-gray-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                ⋮⋮
              </div>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent side="top" className="max-w-xs bg-[#1a1a2e] border border-cyan-500/30 p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="text-3xl">{item.icon || item.visual_asset_url}</div>
              <div className="flex-1">
                <h3 className={cn('font-bold text-sm mb-1', rarity.text)}>{item.name}</h3>
                <p className="text-gray-400 text-xs">{item.type.toUpperCase()}</p>
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <p className="text-gray-300 text-xs leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Stats */}
            <div className="space-y-2 pt-2 border-t border-gray-700">
              {item.financial_stat_bonus > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-1">
                    <StatIcon className="w-3 h-3" />
                    Bônus:
                  </span>
                  <span className={cn('font-bold', statColor)}>
                    +{(item.financial_stat_bonus * 100).toFixed(0)}% {item.stat_type?.replace('_', ' ')}
                  </span>
                </div>
              )}

              {item.level_required > 1 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Nível Requerido:</span>
                  <span className="text-white font-bold">{item.level_required}</span>
                </div>
              )}

              {item.buy_cost > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Preço:</span>
                  <span className="text-yellow-400 font-bold">{item.buy_cost} 💰</span>
                </div>
              )}

              {item.unlock_criteria && (
                <div className="text-xs">
                  <span className="text-gray-400">Desbloqueio:</span>
                  <p className="text-cyan-400 mt-1">{item.unlock_criteria}</p>
                </div>
              )}
            </div>

            {/* Color Preview */}
            {item.color && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
                <span className="text-gray-400 text-xs">Cor Temática:</span>
                <div 
                  className="w-6 h-6 rounded border-2 border-black"
                  style={{ backgroundColor: item.color, imageRendering: 'pixelated' }}
                />
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}