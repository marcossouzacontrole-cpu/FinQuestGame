import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skull, Sword, Heart, Zap, Edit, Trash2 } from 'lucide-react';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const BOSS_RANKS = {
  legendary: { name: 'Lendário', color: 'from-yellow-500 to-orange-500', icon: '👑', minDebt: 50000 },
  epic: { name: 'Épico', color: 'from-purple-500 to-pink-500', icon: '💎', minDebt: 20000 },
  rare: { name: 'Raro', color: 'from-blue-500 to-cyan-500', icon: '⭐', minDebt: 5000 },
  common: { name: 'Comum', color: 'from-gray-500 to-gray-600', icon: '👾', minDebt: 0 }
};

const getBossRank = (balance) => {
  if (balance >= 50000) return 'legendary';
  if (balance >= 20000) return 'epic';
  if (balance >= 5000) return 'rare';
  return 'common';
};

export default function BossDebtCard({ debt, onDamage, onDefeat, onEdit }) {
  const [attackAmount, setAttackAmount] = useState('');
  const rank = getBossRank(debt.outstanding_balance);
  const rankConfig = BOSS_RANKS[rank];

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  const hp = debt.outstanding_balance;
  const maxHp = debt.total_amount;
  const hpPercentage = (hp / maxHp) * 100;

  const handleAttack = () => {
    const amount = parseFloat(attackAmount);
    if (amount > 0 && amount <= hp) {
      onDamage(debt.id, amount);
      setAttackAmount('');
    }
  };

  return (
    <NeonCard
      glowColor={rank === 'legendary' ? 'gold' : rank === 'epic' ? 'purple' : 'magenta'}
      className="relative overflow-hidden glow-magenta"
    >
      {/* Boss Badge */}
      <div className="absolute top-3 right-3">
        <div className={`bg-gradient-to-r ${rankConfig.color} px-3 py-1 rounded-full border-2 border-white/30 shadow-lg`}>
          <span className="text-white font-bold text-xs flex items-center gap-1">
            {rankConfig.icon} Boss {rankConfig.name}
          </span>
        </div>
      </div>

      {/* Boss Avatar */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${rankConfig.color} flex items-center justify-center border-4 border-white/20 shadow-xl relative`}>
          <Skull className="w-10 h-10 text-white" />
          {debt.interest_rate > 5 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-xl mb-1">{debt.creditor}</h3>
          <p className="text-gray-400 text-sm">
            {(() => {
              const debtTypeLabels = {
                credit_card: { emoji: '💳', name: 'Boss de Cartão' },
                loan: { emoji: '🏦', name: 'Boss Bancário' },
                financing: { emoji: '🏡', name: 'Boss de Financiamento' },
                other: { emoji: '📋', name: 'Boss Inimigo' }
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
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(debt)}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
            title="Editar Inimigo"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Tem certeza que deseja remover o inimigo ${debt.creditor}?`)) {
                // Centralized Gamification (Skill Directive A)
                try {
                  base44.integrations.Core.InvokeFunction({
                    name: 'addPointsForAction',
                    payload: {
                      actionType: 'boss_defeated',
                      points: Math.floor(debt.total_amount / 100)
                    }
                  });
                } catch (e) {
                  console.error('Failed to reward boss defeat:', e);
                }
                onDefeat(debt.id);
              }
            }}
            className="text-red-400 hover:text-red-300 transition-colors"
            title="Remover Inimigo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* HP Bar */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-white font-bold">HP (Saldo Devedor)</span>
          </div>
          <span className="text-red-400 font-bold">R$ {hp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="relative h-6 bg-[#0a0a1a] rounded-full overflow-hidden border-2 border-red-500/50">
          <div
            className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 transition-all duration-500"
            style={{ width: `${hpPercentage}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {hpPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Boss Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-black/30 rounded-lg border border-cyan-500/20">
        <div>
          <p className="text-gray-500 text-xs mb-1">HP Máximo</p>
          <p className="text-white font-bold text-sm">R$ {maxHp.toLocaleString('pt-BR')}</p>
        </div>
        {debt.interest_rate > 0 && (
          <div>
            <p className="text-gray-500 text-xs mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Ataque de Juros
            </p>
            <p className="text-orange-400 font-bold text-sm">{debt.interest_rate}% a.m.</p>
          </div>
        )}
        {debt.due_date && (
          <div className="col-span-2">
            <p className="text-gray-500 text-xs mb-1">⏰ Próximo Ataque</p>
            <p className="text-yellow-400 font-bold text-sm">
              {new Date(debt.due_date).toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}
      </div>

      {/* Attack Section */}
      <div className="space-y-3 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Sword className="w-5 h-5 text-cyan-400" />
          <span className="text-cyan-400 font-bold">Atacar Boss</span>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Valor do ataque (R$)"
            value={attackAmount}
            onChange={(e) => setAttackAmount(e.target.value)}
            className="bg-[#0a0a1a] border-cyan-500/30 text-white flex-1"
          />
          <Button
            onClick={handleAttack}
            disabled={!attackAmount || parseFloat(attackAmount) <= 0}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            <Sword className="w-4 h-4 mr-1" />
            Atacar
          </Button>
        </div>

        {/* Quick Attack Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => setAttackAmount((hp * 0.1).toFixed(2))}
            variant="outline"
            size="sm"
            className="flex-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
          >
            10% HP
          </Button>
          <Button
            onClick={() => setAttackAmount((hp * 0.25).toFixed(2))}
            variant="outline"
            size="sm"
            className="flex-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
          >
            25% HP
          </Button>
          <Button
            onClick={() => setAttackAmount(hp.toFixed(2))}
            variant="outline"
            size="sm"
            className="flex-1 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
          >
            <Skull className="w-3 h-3 mr-1" />
            Derrotar
          </Button>
        </div>
      </div>

      {/* Boss Loot Preview */}
      {hp < maxHp * 0.3 && (
        <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-green-400 text-xs font-semibold">
            ⚡ Boss enfraquecido! Derrote para ganhar {Math.floor(maxHp / 100)} XP de recompensa!
          </p>
        </div>
      )}
    </NeonCard>
  );
}