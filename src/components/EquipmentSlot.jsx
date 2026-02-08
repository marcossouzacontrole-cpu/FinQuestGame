import { useState } from 'react';
import { cn } from '@/lib/utils';

const slotConfig = {
  weapon: { icon: '⚔️', label: 'Arma', color: 'border-red-500/30' },
  armor: { icon: '🛡️', label: 'Armadura', color: 'border-blue-500/30' },
  accessory: { icon: '💍', label: 'Acessório', color: 'border-purple-500/30' },
  wing: { icon: '👼', label: 'Asas', color: 'border-green-500/30' },
  headwear: { icon: '👑', label: 'Chapéu', color: 'border-yellow-500/30' }
};

export default function EquipmentSlot({ 
  type, 
  equippedItem, 
  onEquip, 
  onUnequip 
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const config = slotConfig[type] || slotConfig.weapon;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { item, action } = data;
      
      if (item.type === type) {
        if (action === 'equip') {
          onEquip?.(item);
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative bg-[#0a0a1a] rounded-xl border-2 p-4 transition-all duration-300',
        config.color,
        isDragOver && 'border-cyan-400 bg-cyan-500/10 scale-105',
        'hover:border-cyan-400/50'
      )}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Slot Label */}
      <div className="absolute top-2 left-2 text-gray-400 text-xs font-semibold uppercase">
        {config.label}
      </div>

      {/* Equipment Display */}
      <div className="flex flex-col items-center justify-center min-h-[120px] mt-4">
        {equippedItem ? (
          <>
            <div className="text-5xl mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {equippedItem.icon || equippedItem.visual_asset_url}
            </div>
            <p className="text-white text-sm font-semibold text-center line-clamp-2">
              {equippedItem.name}
            </p>
            <button
              onClick={() => onUnequip?.(equippedItem)}
              className="mt-3 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 text-xs font-semibold rounded-lg transition-all"
            >
              Remover
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl opacity-30 mb-2">
              {config.icon}
            </div>
            <p className="text-gray-500 text-xs text-center">
              Arraste um item aqui<br/>ou selecione do inventário
            </p>
          </>
        )}
      </div>

      {/* Drop Zone Indicator */}
      {isDragOver && (
        <div className="absolute inset-0 bg-cyan-400/20 rounded-xl border-2 border-cyan-400 border-dashed flex items-center justify-center">
          <span className="text-cyan-400 font-bold text-sm">
            Solte para Equipar
          </span>
        </div>
      )}
    </div>
  );
}