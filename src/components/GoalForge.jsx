import { useState } from 'react';
import { Sparkles, TrendingUp, Plus, Trash2, Edit } from 'lucide-react';
import NeonCard from './NeonCard';
import NotionGoalSync from './NotionGoalSync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function GoalForge({ goal, onDeposit, onDelete, onEdit }) {
  const [depositAmount, setDepositAmount] = useState('');
  const progress = (goal.current_amount / goal.target_amount) * 100;

  const handleDeposit = (e) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (amount > 0) {
      onDeposit(goal, amount);
      setDepositAmount('');
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir "${goal.name}"?`)) {
      onDelete(goal.id);
    }
  };

  return (
    <NeonCard 
      glowColor={goal.color === '#FF00FF' ? 'magenta' : 'cyan'} 
      className="relative overflow-hidden"
    >
      {/* Animated sparks */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
        <div className="absolute bottom-8 left-8 w-1 h-1 bg-magenta-400 rounded-full animate-pulse" />
      </div>

      <div className="relative space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-4xl">{goal.icon}</span>
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            </div>
            <h3 className="text-white font-bold text-xl mb-1">{goal.name}</h3>
            <p className="text-cyan-400 text-sm font-semibold">
              Forjando: {goal.legendary_item || 'Item Lendário'}
            </p>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            {goal.status === 'completed' && (
              <div className="bg-gradient-to-r from-green-500/20 to-cyan-500/20 border border-green-500/50 rounded-full px-4 py-2">
                <span className="text-green-400 font-bold text-sm">✓ Forjado!</span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(goal)}
                className="w-8 h-8 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/50 flex items-center justify-center transition-all"
                title="Editar conquista"
              >
                <Edit className="w-4 h-4 text-cyan-400" />
              </button>
              <button
                onClick={handleDelete}
                className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 flex items-center justify-center transition-all"
                title="Excluir meta"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Forge Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Progresso da Forja</span>
            <span className="text-white font-mono font-bold">
              R$ {goal.current_amount.toFixed(2)} / R$ {goal.target_amount.toFixed(2)}
            </span>
          </div>
          
          <div className="relative h-6 bg-[#0a0a1a] rounded-full overflow-hidden border-2 border-cyan-500/30">
            {/* Progress fill */}
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-magenta-500 to-purple-500 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            >
              {/* Animated shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
            </div>
            
            {/* Spark effect */}
            {progress < 100 && (
              <div 
                className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white to-transparent blur-sm"
                style={{ 
                  left: `${Math.max(0, progress - 4)}%`,
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              />
            )}
            
            {/* Progress text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-xs drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                {progress.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* AI Plan Insight */}
        {goal.ai_plan && (
            <div className="mt-4 mb-4 p-3 bg-cyan-900/20 border border-cyan-500/20 rounded-lg relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 animate-pulse pointer-events-none" />
                 <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    Estratégia Inteligente
                 </div>
                 <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-line">
                    {goal.ai_plan}
                 </p>
                 {goal.monthly_contribution_suggestion && (
                    <div className="mt-2 pt-2 border-t border-cyan-500/10 flex justify-between items-center">
                        <span className="text-xs text-gray-500">Meta Mensal:</span>
                        <span className="text-sm font-mono font-bold text-green-400">
                            R$ {goal.monthly_contribution_suggestion.toFixed(2)}
                        </span>
                    </div>
                 )}
            </div>
        )}

        {/* Deposit Section */}
        {goal.status !== 'completed' && (
          <form onSubmit={handleDeposit} className="flex gap-2 pt-2">
            <div className="flex-1">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="R$ 0,00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="bg-[#0a0a1a] border-cyan-500/30 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/50"
              />
            </div>
            <Button
              type="submit"
              disabled={!depositAmount || parseFloat(depositAmount) <= 0}
              className="bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(0,255,255,0.5)] hover:shadow-[0_0_30px_rgba(0,255,255,0.7)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-1" />
              Depositar
            </Button>
          </form>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-cyan-500/20">
          <div>
            <p className="text-gray-400 text-xs mb-1">Restante</p>
            <p className="text-white font-bold text-lg">
              R$ {(goal.target_amount - goal.current_amount).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Status</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <p className="text-cyan-400 font-bold text-sm">
                {progress >= 100 ? 'Completo' : 'Forjando...'}
              </p>
            </div>
          </div>
        </div>

        {/* Notion Sync */}
        <NotionGoalSync goal={goal} />
      </div>
    </NeonCard>
  );
}