import { useState } from 'react';
import { Skull, Target, Coins, Zap, Plus, X, Award } from 'lucide-react';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const EXPENSE_CATEGORIES = {
  food: { name: 'Alimentação', icon: '🍔', monster: '👹', color: 'from-yellow-500 to-orange-500' },
  transport: { name: 'Transporte', icon: '🚗', monster: '👺', color: 'from-blue-500 to-cyan-500' },
  entertainment: { name: 'Entretenimento', icon: '🎮', monster: '👾', color: 'from-purple-500 to-magenta-500' },
  shopping: { name: 'Compras', icon: '🛍️', monster: '🧟', color: 'from-pink-500 to-red-500' },
  subscriptions: { name: 'Assinaturas', icon: '📱', monster: '👻', color: 'from-green-500 to-emerald-500' },
  other: { name: 'Outros', icon: '💸', monster: '🦹', color: 'from-gray-500 to-slate-500' }
};

export default function TreasureHuntGame({ onComplete }) {
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'food',
    isUnnecessary: false
  });

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const unnecessarySpent = expenses.filter(e => e.isUnnecessary).reduce((sum, e) => sum + e.amount, 0);
  const monstersDefeated = expenses.filter(e => e.isUnnecessary).length;
  const xpEarned = monstersDefeated * 10;

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) {
      toast.error('Preencha todos os campos');
      return;
    }

    const expense = {
      id: Date.now(),
      ...newExpense,
      amount: parseFloat(newExpense.amount),
      timestamp: new Date()
    };

    setExpenses([...expenses, expense]);
    toast.success('Gasto registrado no mapa! 📍');
    
    setNewExpense({
      description: '',
      amount: '',
      category: 'food',
      isUnnecessary: false
    });
    setShowForm(false);
  };

  const handleToggleUnnecessary = (expenseId) => {
    setExpenses(expenses.map(e => {
      if (e.id === expenseId) {
        const wasUnnecessary = e.isUnnecessary;
        if (!wasUnnecessary) {
          toast.success('👹 Monstro capturado! +10 XP', {
            description: `Você identificou um gasto desnecessário de R$ ${e.amount.toFixed(2)}`
          });
        } else {
          toast.info('Monstro liberado');
        }
        return { ...e, isUnnecessary: !e.isUnnecessary };
      }
      return e;
    }));
  };

  const handleDeleteExpense = (expenseId) => {
    setExpenses(expenses.filter(e => e.id !== expenseId));
    toast.info('Gasto removido do mapa');
  };

  const handleFinishHunt = () => {
    if (monstersDefeated === 0) {
      toast.error('Identifique pelo menos um gasto desnecessário!');
      return;
    }

    toast.success(`🏆 Caça concluída! +${xpEarned} XP`, {
      description: `Você capturou ${monstersDefeated} monstros e pode economizar R$ ${unnecessarySpent.toFixed(2)}!`
    });

    if (onComplete) {
      onComplete({
        xpReward: xpEarned,
        goldReward: Math.floor(unnecessarySpent / 10),
        monstersDefeated,
        savingsPotential: unnecessarySpent
      });
    }

    setExpenses([]);
  };

  return (
    <NeonCard glowColor="magenta">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">Caça ao Tesouro de Gastos</h3>
              <p className="text-gray-400 text-sm">Capture monstros de gastos desnecessários</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
            <Skull className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <p className="text-red-400 font-bold text-lg">{monstersDefeated}</p>
            <p className="text-gray-400 text-xs">Capturados</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
            <Coins className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-yellow-400 font-bold text-lg">R$ {unnecessarySpent.toFixed(0)}</p>
            <p className="text-gray-400 text-xs">Economia</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
            <Zap className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="text-purple-400 font-bold text-lg">{xpEarned} XP</p>
            <p className="text-gray-400 text-xs">Ganhos</p>
          </div>
        </div>

        {showForm ? (
          <div className="bg-[#0a0a1a] rounded-lg p-4 border border-cyan-500/30 space-y-3">
            <Input
              placeholder="Descrição do gasto"
              value={newExpense.description}
              onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
              className="bg-[#1a1a2e] border-cyan-500/30 text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Valor (R$)"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                className="bg-[#1a1a2e] border-cyan-500/30 text-white"
              />
              <Select value={newExpense.category} onValueChange={(value) => setNewExpense({...newExpense, category: value})}>
                <SelectTrigger className="bg-[#1a1a2e] border-cyan-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddExpense} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500">
                Adicionar ao Mapa
              </Button>
              <Button onClick={() => setShowForm(false)} variant="outline" className="border-gray-600">
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowForm(true)} className="w-full bg-gradient-to-r from-cyan-500 to-magenta-500">
            <Plus className="w-4 h-4 mr-2" />
            Registrar Gasto
          </Button>
        )}

        {expenses.length > 0 ? (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm font-semibold">Mapa de Gastos (clique para capturar monstros)</p>
            <div className="grid grid-cols-1 gap-2">
              {expenses.map(expense => {
                const category = EXPENSE_CATEGORIES[expense.category];
                return (
                  <button
                    key={expense.id}
                    onClick={() => handleToggleUnnecessary(expense.id)}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all duration-300 text-left
                      ${expense.isUnnecessary 
                        ? 'bg-red-500/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                        : 'bg-[#0a0a1a] border-gray-700 hover:border-cyan-500/50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{expense.isUnnecessary ? category.monster : category.icon}</span>
                        <div>
                          <p className="text-white font-semibold">{expense.description}</p>
                          <p className="text-gray-400 text-xs">{category.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`font-bold ${expense.isUnnecessary ? 'text-red-400' : 'text-white'}`}>
                            R$ {expense.amount.toFixed(2)}
                          </p>
                          {expense.isUnnecessary && (
                            <p className="text-green-400 text-xs font-semibold">+10 XP</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteExpense(expense.id);
                          }}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {expense.isUnnecessary && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-red-500 rounded-full p-1">
                          <Skull className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-[#0a0a1a]/50 rounded-lg border border-gray-800">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">Registre seus gastos para começar a caça!</p>
          </div>
        )}

        {expenses.length > 0 && (
          <Button
            onClick={handleFinishHunt}
            disabled={monstersDefeated === 0}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50"
          >
            <Award className="w-4 h-4 mr-2" />
            Concluir Caça e Coletar Recompensas
          </Button>
        )}

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
          <p className="text-purple-400 text-xs">
            <strong>Como jogar:</strong> Registre seus gastos da semana. Clique nos gastos que você considera desnecessários para "capturar" o monstro e ganhar XP. Quanto mais monstros capturar, maior será sua economia potencial!
          </p>
        </div>
      </div>
    </NeonCard>
  );
}