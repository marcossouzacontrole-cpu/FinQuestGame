import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Plus, TrendingUp, Sparkles, Edit, Trash2 } from 'lucide-react';

// Guardian ranks based on asset value
const getGuardianRank = (value) => {
  if (value >= 100000) return {
    name: 'Guardião Lendário',
    color: '#FFD700',
    icon: '👑',
    minValue: 100000
  };
  if (value >= 50000) return {
    name: 'Guardião Épico',
    color: '#8A2BE2',
    icon: '💎',
    minValue: 50000
  };
  if (value >= 10000) return {
    name: 'Guardião Raro',
    color: '#00FFFF',
    icon: '⭐',
    minValue: 10000
  };
  return {
    name: 'Guardião Comum',
    color: '#39FF14',
    icon: '🛡️',
    minValue: 0
  };
};

export default function GuardianAssetCard({ asset, onPowerUp, onEdit, onDelete }) {
  const [powerUpAmount, setPowerUpAmount] = useState('');
  const rank = getGuardianRank(asset.value);
  
  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });
  
  // HP = valor do ativo (cada R$1 = 1 HP)
  const currentHP = asset.value;
  const maxVisibleHP = Math.max(currentHP, 10000); // Para visualização
  const hpPercentage = (currentHP / maxVisibleHP) * 100;

  const handlePowerUp = () => {
    const amount = parseFloat(powerUpAmount);
    if (amount && amount > 0) {
      onPowerUp(asset.id, amount);
      setPowerUpAmount('');
    }
  };

  const quickPowerUp = (percentage) => {
    const amount = (asset.value * percentage) / 100;
    onPowerUp(asset.id, amount);
  };

  const assetTypeLabels = {
    cash: { emoji: '💰', name: 'Dinheiro' },
    investment: { emoji: '📈', name: 'Investimento' },
    real_estate: { emoji: '🏠', name: 'Imóvel' },
    vehicle: { emoji: '🚗', name: 'Veículo' }
  };
  
  // Find custom category or use default
  const customCategory = asset.category_name 
    ? budgetCategories.find(cat => cat.name.toLowerCase() === asset.category_name.toLowerCase())
    : null;
  
  const categoryInfo = customCategory 
    ? { emoji: customCategory.icon || '💎', name: customCategory.name }
    : (assetTypeLabels[asset.type] || { emoji: '💎', name: asset.type });

  return (
    <NeonCard glowColor="green" className="relative overflow-hidden">
      {/* Background decoration */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: rank.color }}
      />

      <div className="relative space-y-4">
        {/* Guardian Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center border-4 text-3xl"
              style={{ 
                borderColor: rank.color,
                backgroundColor: `${rank.color}20`,
                boxShadow: `0 0 20px ${rank.color}40`
              }}
            >
              {rank.icon}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{asset.name}</h3>
              <p className="text-sm font-semibold" style={{ color: rank.color }}>
                {rank.name}
              </p>
              <p className="text-gray-400 text-xs">
                {categoryInfo.emoji} {categoryInfo.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(asset)}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
              title="Editar Guardião"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Tem certeza que deseja remover o guardião ${asset.name}?`)) {
                  onDelete(asset.id);
                }
              }}
              className="text-red-400 hover:text-red-300 transition-colors"
              title="Remover Guardião"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* HP Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Poder do Guardião
            </span>
            <span className="text-green-400 font-bold text-sm">
              R$ {currentHP.toFixed(2)}
            </span>
          </div>
          <div className="h-4 bg-[#0a0a1a] rounded-full overflow-hidden border border-green-500/30">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500 relative"
              style={{ width: `${Math.min(hpPercentage, 100)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0a0a1a] rounded-lg p-3 border border-green-500/20">
            <p className="text-gray-400 text-xs mb-1">💪 Poder Máximo</p>
            <p className="text-green-400 font-bold">R$ {asset.value.toFixed(2)}</p>
          </div>
          <div className="bg-[#0a0a1a] rounded-lg p-3 border border-green-500/20">
            <p className="text-gray-400 text-xs mb-1">⭐ Classificação</p>
            <p className="text-white font-bold text-sm">{rank.name.split(' ')[1]}</p>
          </div>
        </div>

        {/* Power Up Section */}
        <div className="space-y-3 pt-3 border-t border-green-500/20">
          <p className="text-gray-400 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            Aumentar Poder do Guardião
          </p>
          
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="R$ 0,00"
              value={powerUpAmount}
              onChange={(e) => setPowerUpAmount(e.target.value)}
              className="bg-[#0a0a1a] border-green-500/30 text-white flex-1"
            />
            <Button
              onClick={handlePowerUp}
              disabled={!powerUpAmount || parseFloat(powerUpAmount) <= 0}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => quickPowerUp(10)}
              className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
            >
              +10%
            </Button>
            <Button
              size="sm"
              onClick={() => quickPowerUp(25)}
              className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
            >
              +25%
            </Button>
            <Button
              size="sm"
              onClick={() => quickPowerUp(50)}
              className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
            >
              +50%
            </Button>
          </div>
        </div>

        {/* Achievement Message */}
        {currentHP >= rank.minValue * 2 && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-lg p-3 text-center">
            <p className="text-yellow-400 font-bold text-sm flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Guardião Poderoso!
            </p>
            <p className="text-gray-400 text-xs mt-1">Continue fortalecendo seu patrimônio!</p>
          </div>
        )}
      </div>
    </NeonCard>
  );
}