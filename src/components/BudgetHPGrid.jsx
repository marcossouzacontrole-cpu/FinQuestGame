import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScanLine, Plus, Calendar as CalendarIcon, 
  Swords, Crown, Hourglass, Crosshair, Scroll, Pencil, Save, X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import NeonCard from './NeonCard';
import BattleCalendar from './BattleCalendar'; // Importação do Novo Componente
import { Button } from '@/components/ui/button';
import { 
  isSameDay, isSameWeek, isSameMonth, isSameYear, parseISO, 
  format
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function BudgetHPGrid({ limit }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState('daily'); // Default to daily
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // State for budget editing
  const [editingBudget, setEditingBudget] = useState(null); // { categoryId, currentVal }
  const [newBudgetValue, setNewBudgetValue] = useState('');

  // State for Daily Goal Planning
  const [isPlanningDay, setIsPlanningDay] = useState(false); // Modal open state
  const [dailyGoalForm, setDailyGoalForm] = useState({ target_amount: '', notes: '' });

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: async () => {
      const data = await base44.entities.BudgetCategory.list();
      return data;
    },
  });

  const { data: recurringExpenses = [] } = useQuery({
    queryKey: ['recurringExpenses'],
    queryFn: () => base44.entities.RecurringExpense.list(),
  });

  const { data: dailyGoals = [] } = useQuery({
    queryKey: ['dailyGoals'],
    queryFn: async () => {
      return await base44.entities.DailyGoal.list('-date', 100); 
    },
  });

  // Agrega todas as despesas para o Mapa Tático
  const allExpenses = budgetCategories.flatMap(c => c.expenses || []);

  const handleNavigateToTools = (e) => {
    e.preventDefault();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    navigate(`${createPageUrl('CommandCenter')}?tab=tools&date=${dateStr}`);
  };

  const updateBudgetMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.BudgetCategory.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['budgetCategories']);
      toast.success('Meta de Orçamento atualizada!', {
        description: 'Seus limites de batalha foram redefinidos.'
      });
      setEditingBudget(null);
    },
    onError: () => {
      toast.error('Erro ao atualizar meta');
    }
  });

  const saveDailyGoalMutation = useMutation({
    mutationFn: async (data) => {
      // Check if goal exists for date
      const existing = dailyGoals.find(g => g.date === data.date);
      if (existing) {
        return await base44.entities.DailyGoal.update(existing.id, {
          target_amount: parseFloat(data.target_amount),
          notes: data.notes
        });
      } else {
        return await base44.entities.DailyGoal.create({
          date: data.date,
          target_amount: parseFloat(data.target_amount),
          notes: data.notes
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dailyGoals']);
      toast.success('Missão Diária Planejada!', {
        description: 'Orçamento do dia definido com sucesso.'
      });
      setIsPlanningDay(false);
    },
    onError: () => toast.error('Erro ao salvar planejamento')
  });

  const handleSaveBudget = () => {
    if (!editingBudget || !newBudgetValue) return;
    
    const fieldMap = {
      daily: 'budget_daily',
      weekly: 'budget_weekly',
      monthly: 'budget',
      yearly: 'budget_yearly'
    };
    
    const field = fieldMap[period];
    const val = parseFloat(newBudgetValue);
    
    if (isNaN(val) || val < 0) {
      toast.error('Valor inválido');
      return;
    }

    updateBudgetMutation.mutate({
      id: editingBudget.categoryId,
      data: { [field]: val }
    });
  };

  const openBudgetEdit = (category, currentTarget) => {
    setEditingBudget({ categoryId: category.id, name: category.name });
    setNewBudgetValue(currentTarget.toString());
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setPeriod('daily');
    
    // Abre o modal de planejamento se clicar num dia
    const goal = dailyGoals.find(g => g.date === format(day, 'yyyy-MM-dd'));
    setDailyGoalForm({
      target_amount: goal ? goal.target_amount : '',
      notes: goal ? goal.notes : ''
    });
    setIsPlanningDay(true);
  };

  const handleSaveDailyGoal = () => {
    if (!dailyGoalForm.target_amount) {
      toast.error('Defina um valor alvo');
      return;
    }
    saveDailyGoalMutation.mutate({
      date: format(selectedDate, 'yyyy-MM-dd'),
      target_amount: dailyGoalForm.target_amount,
      notes: dailyGoalForm.notes
    });
  };

  if (budgetCategories.length === 0) {
    return (
      <NeonCard glowColor="cyan">
        <div className="text-center py-8">
          <Scroll className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Seu Grimório de Orçamento está vazio. Vá para Ferramentas para iniciar sua jornada!</p>
        </div>
      </NeonCard>
    );
  }

  // Lógica de Filtro Temporal e Proporção de Meta
  const getPeriodData = (category) => {
    const targetDate = selectedDate;
    const expenses = category.expenses || [];
    let filteredExpenses = [];
    let target = 0;
    let periodName = "Mensal";

    switch (period) {
      case 'daily':
        filteredExpenses = expenses.filter(e => isSameDay(parseISO(e.date), targetDate));
        // Use specific daily budget if set, otherwise estimate
        target = category.budget_daily > 0 ? category.budget_daily : ((category.budget || 0) / 30);
        periodName = "Missão Diária";
        break;
      case 'weekly':
        filteredExpenses = expenses.filter(e => isSameWeek(parseISO(e.date), targetDate));
        target = category.budget_weekly > 0 ? category.budget_weekly : ((category.budget || 0) / 4.3);
        periodName = "Raid Semanal";
        break;
      case 'monthly':
        filteredExpenses = expenses.filter(e => isSameMonth(parseISO(e.date), targetDate));
        target = category.budget || 0;
        periodName = "Campanha Mensal";
        break;
      case 'yearly':
        filteredExpenses = expenses.filter(e => isSameYear(parseISO(e.date), targetDate));
        target = category.budget_yearly > 0 ? category.budget_yearly : ((category.budget || 0) * 12);
        periodName = "Saga Anual";
        break;
      default:
        break;
    }

    const spent = filteredExpenses.reduce((acc, curr) => acc + curr.value, 0);
    
    return { spent, target, periodName };
  };

  const periodConfig = {
    daily: { label: 'Diário', icon: Hourglass },
    weekly: { label: 'Semanal', icon: CalendarIcon },
    monthly: { label: 'Mensal', icon: Crown },
    yearly: { label: 'Anual', icon: Swords },
  };

  return (
    <div className="space-y-6">
      {/* Novo Battle Calendar (Mapa Tático) */}
      <BattleCalendar 
        expenses={allExpenses}
        recurringExpenses={recurringExpenses}
        selectedDate={selectedDate}
        onDateSelect={handleDayClick}
        dailyBudgetLimit={150} // Valor base para trigger de cor vermelha
      />
      
      {/* Controles de Período */}
      <div className="flex bg-[#0a0a1a] p-1 rounded-lg border border-gray-800 w-fit mx-auto">
        {Object.entries(periodConfig).map(([key, config]) => {
            const Icon = config.icon;
            const isActive = period === key;
            return (
            <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-300
                ${isActive 
                    ? 'bg-cyan-600 text-white shadow shadow-cyan-500/20' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                }
                `}
            >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{config.label}</span>
            </button>
            );
        })}
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgetCategories
          .map(category => {
            const { spent, target } = getPeriodData(category);
            const percentage = target > 0 ? (spent / target) * 100 : 0;
            return { ...category, spent, target, percentage };
          })
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, limit || budgetCategories.length)
          .map(category => {
            const { spent, target, percentage } = category;
            const isCritical = percentage >= 90;
            const isOver = spent > target;
            
            return (
              <div 
                key={category.id}
                className={`
                  relative overflow-hidden rounded-2xl p-1 transition-all duration-300 hover:scale-[1.02] group
                  bg-gradient-to-b ${isOver ? 'from-red-900/50 to-[#0f0f1e]' : 'from-[#1a1a2e] to-[#0f0f1e]'}
                `}
              >
                {/* Borda Brilhante */}
                <div className={`absolute inset-0 rounded-2xl border ${isOver ? 'border-red-500/50' : 'border-gray-700 group-hover:border-cyan-500/50'} transition-colors`} />
                
                {/* Conteúdo do Card */}
                <div className="relative bg-[#0a0a1a]/90 rounded-xl p-5 h-full flex flex-col backdrop-blur-xl">
                  {/* Header do Card */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        {category.name === 'Moradia' ? '🏰' : 
                         category.name === 'Transporte' ? '🚀' : 
                         category.name === 'Alimentação' ? '🍖' : 
                         category.name === 'Saúde' ? '🧪' : 
                         category.name === 'Lazer' ? '🎭' : '🎒'}
                      </div>
                      <div>
                        <h4 className="text-white font-bold uppercase tracking-wider text-sm">{category.name}</h4>
                        <p className={`text-[10px] font-mono ${isOver ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
                          {isOver ? '⚠️ ESCUDO QUEBRADO' : '🛡️ ESCUDO ATIVO'}
                        </p>
                      </div>
                    </div>
                    <div className={`
                      px-2 py-1 rounded border text-xs font-black font-mono
                      ${isOver 
                        ? 'bg-red-500/20 border-red-500 text-red-500' 
                        : 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                      }
                    `}>
                      {percentage.toFixed(0)}%
                    </div>
                  </div>

                  {/* Barra de HP */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-mono uppercase">
                      <span>Dano (Gasto)</span>
                      <div className="flex items-center gap-1">
                        <span>HP Max (Meta)</span>
                        <button 
                          onClick={() => openBudgetEdit(category, target)}
                          className="text-cyan-500 hover:text-cyan-300 transition-colors"
                          title="Editar Meta deste Período"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="h-4 bg-black rounded border border-gray-800 p-[2px] relative overflow-hidden">
                      {/* Grid Background na barra */}
                      <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                      
                      <div 
                        className={`h-full rounded-sm transition-all duration-500 relative
                          ${isOver ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.6)]' : 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]'}
                        `}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-1 font-mono text-xs">
                      <span className={isOver ? "text-red-400 font-bold" : "text-white"}>
                        R$ {spent.toFixed(2)}
                      </span>
                      <span className="text-gray-400">
                         / R$ {target.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Botões de Ação RPG */}
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <Button
                        size="sm"
                        className="bg-[#1a1a2e] hover:bg-cyan-900/30 border border-gray-700 hover:border-cyan-500 text-[10px] text-cyan-400 uppercase font-bold tracking-wider h-8"
                        onClick={handleNavigateToTools}
                    >
                        <Plus className="w-3 h-3 mr-1.5" />
                        Craft
                    </Button>
                    <Button
                        size="sm"
                        className="bg-[#1a1a2e] hover:bg-purple-900/30 border border-gray-700 hover:border-purple-500 text-[10px] text-purple-400 uppercase font-bold tracking-wider h-8"
                        onClick={handleNavigateToTools}
                    >
                        <ScanLine className="w-3 h-3 mr-1.5" />
                        Scan Loot
                    </Button>
                  </div>

                </div>
              </div>
            );
          })}
      </div>

      <div className="text-center">
        <Link to={`${createPageUrl('CommandCenter')}?tab=tools`} className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-cyan-400 transition-colors uppercase tracking-widest group">
          Ver Inventário Completo
          <Swords className="w-3 h-3 group-hover:rotate-45 transition-transform" />
        </Link>
      </div>

      {/* Modal de Edição de Meta */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <NeonCard glowColor="purple" className="w-full max-w-sm relative animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setEditingBudget(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white mb-1 flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-400" />
              DEFINIR META
            </h3>
            <p className="text-purple-400 text-xs font-mono uppercase mb-6">
              {editingBudget.name} • {period === 'daily' ? 'DIÁRIA' : period === 'weekly' ? 'SEMANAL' : period === 'monthly' ? 'MENSAL' : 'ANUAL'}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-mono">Novo Limite de HP (Orçamento)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                  <input 
                    type="number" 
                    value={newBudgetValue}
                    onChange={(e) => setNewBudgetValue(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white font-bold text-lg focus:border-purple-500 focus:outline-none shadow-inner"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingBudget(null)}
                  className="flex-1 border-gray-600 hover:bg-gray-800 text-gray-300"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveBudget}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-[0_0_15px_rgba(147,51,234,0.4)]"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Meta
                </Button>
              </div>
            </div>
          </NeonCard>
        </div>
      )}

      {/* Modal de Planejamento Diário */}
      {isPlanningDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <NeonCard glowColor="cyan" className="w-full max-w-sm relative animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setIsPlanningDay(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white mb-1 flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-cyan-400" />
              MISSÃO DO DIA
            </h3>
            <p className="text-cyan-400 text-xs font-mono uppercase mb-6">
              {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-mono">Orçamento Total Planejado</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                  <input 
                    type="number" 
                    value={dailyGoalForm.target_amount}
                    onChange={(e) => setDailyGoalForm({...dailyGoalForm, target_amount: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white font-bold text-lg focus:border-cyan-500 focus:outline-none shadow-inner"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block font-mono">Notas da Missão</label>
                <textarea 
                  value={dailyGoalForm.notes}
                  onChange={(e) => setDailyGoalForm({...dailyGoalForm, notes: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:border-cyan-500 focus:outline-none min-h-[80px]"
                  placeholder="Ex: Jantar fora, Compras do mês..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsPlanningDay(false)}
                  className="flex-1 border-gray-600 hover:bg-gray-800 text-gray-300"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveDailyGoal}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Confirmar
                </Button>
              </div>
            </div>
          </NeonCard>
        </div>
      )}
    </div>
  );
}