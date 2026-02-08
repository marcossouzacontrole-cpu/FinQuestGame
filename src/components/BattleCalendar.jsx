import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  addMonths, 
  subMonths, 
  isToday, 
  parseISO,
  getDate
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Skull, 
  Gem, 
  Crosshair, 
  ShieldAlert, 
  ShieldCheck, 
  Swords
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BattleCalendar({ 
  expenses = [], 
  recurringExpenses = [], 
  incomes = [], 
  onDateSelect,
  selectedDate,
  dailyBudgetLimit = 100 // Valor padrão para "Dano Crítico" se não houver meta diária
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState(null);

  // --- Lógica de Dados e Heatmap ---
  const daysData = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      // 1. Calcular Gastos e Renda do Dia
      const dayExpenses = expenses.filter(e => e.date === dayStr);
      const dayIncome = incomes.filter(i => i.date === dayStr);
      
      const totalExpense = dayExpenses.reduce((acc, curr) => acc + curr.value, 0);
      const totalIncome = dayIncome.reduce((acc, curr) => acc + curr.value, 0);

      // 2. Identificar Inimigos (Contas Recorrentes Futuras)
      // Verifica se o dia do mês bate com o vencimento da recorrência
      const dayNr = getDate(day);
      const enemies = recurringExpenses.filter(r => {
        if (!r.active) return false;
        const dueDate = parseISO(r.next_due_date);
        // Simplificação: Se é o mesmo dia do mês (para mensais)
        // Para ser mais preciso, deveríamos usar a lógica completa de recorrência, 
        // mas aqui focaremos na data exata do next_due_date para "Radar"
        return isSameDay(dueDate, day);
      });

      // 3. Determinar Status (Cor da Zona)
      let status = 'neutral'; // blue
      let statusColor = 'border-gray-800 bg-[#0f0f1e]';
      let glow = '';

      if (totalIncome > 0) {
        status = 'victory'; // green loot
        statusColor = 'border-green-500/50 bg-green-900/20';
        glow = 'shadow-[0_0_10px_rgba(34,197,94,0.3)]';
      } else if (totalExpense === 0 && isSameMonth(day, currentMonth) && day < new Date()) {
        status = 'no-spend'; // green victory
        statusColor = 'border-green-500/50 bg-green-900/10';
        glow = 'shadow-[0_0_5px_rgba(34,197,94,0.2)]';
      } else if (totalExpense > dailyBudgetLimit) {
        status = 'critical'; // red
        statusColor = 'border-red-500/50 bg-red-900/20';
        glow = 'shadow-[0_0_10px_rgba(239,68,68,0.4)]';
      } else if (totalExpense > 0) {
        status = 'alert'; // yellow
        statusColor = 'border-yellow-500/50 bg-yellow-900/20';
        glow = 'shadow-[0_0_5px_rgba(234,179,8,0.2)]';
      }

      // Dias futuros neutros ficam mais apagados
      if (day > new Date() && status === 'neutral') {
        statusColor = 'border-gray-800/50 bg-[#0a0a1a]/50 opacity-50';
      }

      return {
        date: day,
        dayStr,
        totalExpense,
        totalIncome,
        enemies,
        status,
        statusColor,
        glow
      };
    });
  }, [currentMonth, expenses, recurringExpenses, incomes, dailyBudgetLimit]);

  // --- Navegação ---
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // --- Renderização do Popover Tático ---
  const renderTacticalIntel = (dayData) => {
    if (!dayData) return null;
    
    return (
      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#0a0a1a] border border-cyan-500/50 rounded-lg p-3 shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-xl animate-in zoom-in-95 duration-200 pointer-events-none">
        <div className="text-xs font-mono text-cyan-400 mb-2 border-b border-cyan-500/30 pb-1 flex justify-between">
            <span>RELATÓRIO TÁTICO</span>
            <span>{format(dayData.date, 'dd/MM')}</span>
        </div>
        
        <div className="space-y-1.5">
            {dayData.enemies.length > 0 && (
                <div className="flex items-center justify-between text-xs text-red-400">
                    <span className="flex items-center gap-1"><Skull className="w-3 h-3"/> Inimigos</span>
                    <span>{dayData.enemies.length}</span>
                </div>
            )}
            
            <div className="flex items-center justify-between text-xs">
                <span className="text-red-400">Dano (Gasto)</span>
                <span className="font-bold text-white">-R$ {dayData.totalExpense.toFixed(0)}</span>
            </div>

            {dayData.totalIncome > 0 && (
                <div className="flex items-center justify-between text-xs">
                    <span className="text-green-400">Loot (Renda)</span>
                    <span className="font-bold text-green-400">+R$ {dayData.totalIncome.toFixed(0)}</span>
                </div>
            )}

            <div className="mt-2 pt-1 border-t border-gray-800 text-[10px] uppercase text-center font-bold tracking-wider">
                {dayData.status === 'critical' && <span className="text-red-500 flex items-center justify-center gap-1"><ShieldAlert className="w-3 h-3"/> Escudo Quebrado</span>}
                {dayData.status === 'alert' && <span className="text-yellow-500 flex items-center justify-center gap-1"><ShieldAlert className="w-3 h-3"/> Alerta de Dano</span>}
                {(dayData.status === 'victory' || dayData.status === 'no-spend') && <span className="text-green-500 flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3"/> Área Segura</span>}
                {dayData.status === 'neutral' && <span className="text-gray-500">Sem Atividade</span>}
            </div>
        </div>
        
        {/* Seta do Popover */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-[#0a0a1a] border-r border-b border-cyan-500/50"></div>
      </div>
    );
  };

  return (
    <div className="bg-[#0f0f1e]/90 rounded-2xl border border-cyan-500/20 backdrop-blur-sm overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      {/* Header Tático */}
      <div className="p-4 border-b border-cyan-500/20 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30 relative overflow-hidden group">
             <div className="absolute inset-0 bg-cyan-400/20 animate-pulse group-hover:bg-cyan-400/40 transition-colors"/>
            <Swords className="w-5 h-5 text-cyan-400 relative z-10" />
          </div>
          <div>
            <h3 className="text-white font-black text-lg tracking-widest font-mono uppercase flex items-center gap-2">
              TACTICAL MAP <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1 rounded border border-cyan-500/30">V.2.0</span>
            </h3>
            <p className="text-gray-500 text-xs font-mono">
              Status Financeiro Mensal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-[#0a0a1a] p-1.5 rounded-lg border border-gray-800">
            <button onClick={prevMonth} className="p-1.5 hover:bg-cyan-500/20 rounded text-cyan-400 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <div className="text-white font-bold font-mono min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}
            </div>
            <button onClick={nextMonth} className="p-1.5 hover:bg-cyan-500/20 rounded text-cyan-400 transition-colors"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Grid Tático */}
      <div className="p-4">
        {/* Dias da Semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
            {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-cyan-500/50 tracking-widest font-mono">
                    {day}
                </div>
            ))}
        </div>

        {/* Células dos Dias */}
        <div className="grid grid-cols-7 gap-2">
            {daysData.map((data, idx) => {
                const isSelected = selectedDate && isSameDay(data.date, selectedDate);
                const isTodayDate = isToday(data.date);
                const isCurrentMonth = isSameMonth(data.date, currentMonth);
                
                if (!isCurrentMonth) {
                    return <div key={idx} className="h-14 md:h-20 rounded-lg bg-[#0a0a1a]/30 opacity-20"></div>;
                }

                return (
                    <div 
                        key={idx}
                        className="relative group"
                        onMouseEnter={() => setHoveredDay(data)}
                        onMouseLeave={() => setHoveredDay(null)}
                    >
                        {/* Tooltip Tático */}
                        {hoveredDay === data && renderTacticalIntel(data)}

                        <button
                            onClick={() => onDateSelect(data.date)}
                            className={cn(
                                "w-full h-14 md:h-20 rounded-lg border transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-start pt-1.5",
                                data.statusColor,
                                data.glow,
                                isSelected ? "ring-2 ring-white scale-105 z-20" : "hover:scale-[1.02] hover:z-10 hover:border-opacity-100"
                            )}
                        >
                            {/* Indicador de Dia */}
                            <span className={cn(
                                "text-xs font-mono font-bold z-10",
                                isTodayDate ? "text-cyan-400" : "text-gray-400 group-hover:text-white"
                            )}>
                                {format(data.date, 'dd')}
                            </span>

                            {/* Indicador Sniper (Hoje) */}
                            {isTodayDate && (
                                <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-lg pointer-events-none">
                                    <Crosshair className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full text-cyan-500/10 opacity-50 animate-pulse" />
                                    {/* Crosshair corners */}
                                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400"></div>
                                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400"></div>
                                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400"></div>
                                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400"></div>
                                </div>
                            )}

                            {/* Conteúdo Central (Ícones) */}
                            <div className="mt-1 flex flex-col items-center gap-0.5 z-10">
                                {data.enemies.length > 0 && (
                                    <div className="animate-bounce">
                                        <Skull className="w-3 h-3 md:w-4 md:h-4 text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                                    </div>
                                )}
                                {data.totalIncome > 0 && (
                                    <Gem className="w-3 h-3 md:w-4 md:h-4 text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                                )}
                            </div>

                            {/* Barra de Dano (Visual de Preenchimento) */}
                            {data.totalExpense > 0 && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 mt-auto">
                                    <div 
                                        className={cn("h-full", 
                                            data.status === 'critical' ? 'bg-red-500' : 
                                            data.status === 'alert' ? 'bg-yellow-500' : 'bg-blue-500'
                                        )}
                                        style={{ width: `${Math.min((data.totalExpense / dailyBudgetLimit) * 100, 100)}%` }}
                                    />
                                </div>
                            )}
                        </button>
                    </div>
                );
            })}
        </div>

        {/* Legenda Tática */}
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px] text-gray-500 font-mono uppercase">
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                <span>Victory (Loot/No-Spend)</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]"></div>
                <span>Alert (Dano Moderado)</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>
                <span>Critical (Dano Alto)</span>
            </div>
            <div className="flex items-center gap-1.5">
                <Skull className="w-3 h-3 text-red-400" />
                <span>Boss (Conta Futura)</span>
            </div>
        </div>
      </div>
    </div>
  );
}