import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis,
    BarChart, Bar, Cell
} from 'recharts';
import { TrendingUp, ShieldAlert, Zap, Skull, Crown, Flame } from 'lucide-react';
import NeonCard from './NeonCard';
import { format, getDay } from 'date-fns';

// --- MOCK DATA GENERATORS ---

const generateGhostData = () => {
    const data = [];
    let currentCum = 0;
    let ghostCum = 0;
    const today = new Date().getDate();
    
    for (let i = 1; i <= 30; i++) {
        // Simulating spending patterns
        const dailySpend = Math.random() * 100 + 20;
        const ghostSpend = Math.random() * 110 + 20;
        
        // Add spikes for weekends
        const isWeekend = i % 7 === 0 || i % 7 === 6;
        
        currentCum += dailySpend * (isWeekend ? 1.5 : 1);
        ghostCum += ghostSpend * (isWeekend ? 1.4 : 1);

        data.push({
            day: i,
            current: i <= today ? currentCum : null, // Only show up to today for current
            ghost: ghostCum,
        });
    }
    return data;
};

const NEMESIS_DATA = [
    { subject: 'Ifood', A: 120, fullMark: 150, color: '#FF0055' }, // 120% of budget
    { subject: 'Uber', A: 80, fullMark: 150, color: '#00FFFF' },
    { subject: 'Amazon', A: 40, fullMark: 150, color: '#00FF00' },
    { subject: 'Steam', A: 90, fullMark: 150, color: '#FFFF00' },
    { subject: 'Bar', A: 110, fullMark: 150, color: '#FF0055' },
];

const WEEKEND_DATA = [
    { day: 'Seg', value: 45 },
    { day: 'Ter', value: 50 },
    { day: 'Qua', value: 48 },
    { day: 'Qui', value: 60 },
    { day: 'Sex', value: 120 }, // Vulnerability
    { day: 'Sáb', value: 180 }, // Vulnerability
    { day: 'Dom', value: 90 },
];

// --- SUB-COMPONENTS ---

const GhostRaceModule = ({ categories }) => {
    // Generate real vs ghost comparison data
    const data = React.useMemo(() => {
        const result = [];
        const today = new Date().getDate();
        const currentMonth = new Date().getMonth();
        
        for (let day = 1; day <= 30; day++) {
            let currentDayTotal = 0;
            let ghostDayTotal = 0;
            
            // Calculate cumulative spending for current month up to this day
            categories.forEach(cat => {
                (cat.expenses || []).forEach(exp => {
                    const expDate = new Date(exp.date);
                    const expDay = expDate.getDate();
                    const expMonth = expDate.getMonth();
                    
                    // Current month cumulative
                    if (expMonth === currentMonth && expDay <= day) {
                        currentDayTotal += exp.value;
                    }
                    
                    // Previous month cumulative (mock with slight variation)
                    if (expMonth === currentMonth - 1 && expDay <= day) {
                        ghostDayTotal += exp.value * 1.1; // Ghost spent 10% more
                    }
                });
            });
            
            result.push({
                day,
                current: day <= today ? currentDayTotal : null,
                ghost: ghostDayTotal || (currentDayTotal * 1.15), // Fallback mock
            });
        }
        
        return result;
    }, [categories]);
    
    const currentTotal = data.find(d => d.day === new Date().getDate())?.current || 0;
    const ghostTotal = data.find(d => d.day === new Date().getDate())?.ghost || 1;
    const diff = ((currentTotal - ghostTotal) / ghostTotal) * 100;
    const isWinning = diff < 0; // Spending less is winning

    return (
        <NeonCard glowColor={isWinning ? 'cyan' : 'red'} className="h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <TrendingUp className={`w-5 h-5 ${isWinning ? 'text-cyan-400' : 'text-red-400'}`} />
                        The Ghost Race
                    </h3>
                    <p className="text-gray-400 text-xs">Vs. Mês Passado</p>
                </div>
                <div className={`px-3 py-1 rounded-full border ${isWinning ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
                    <span className="font-bold font-mono">
                        {isWinning ? '-' : '+'}{Math.abs(diff).toFixed(1)}%
                    </span>
                </div>
            </div>

            <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isWinning ? "#00FFFF" : "#FF0055"} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={isWinning ? "#00FFFF" : "#FF0055"} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0a0a1a', border: '1px solid #333' }}
                            labelStyle={{ color: '#fff' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="ghost" 
                            stroke="#666" 
                            strokeDasharray="5 5" 
                            fill="none" 
                            strokeWidth={2}
                            name="Fantasma (Mês Passado)"
                        />
                        <Area 
                            type="monotone" 
                            dataKey="current" 
                            stroke={isWinning ? "#00FFFF" : "#FF0055"} 
                            fill="url(#colorCurrent)" 
                            strokeWidth={3}
                            name="Atual"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 p-3 bg-black/40 rounded-lg border border-white/5">
                <p className={`text-sm ${isWinning ? 'text-cyan-400' : 'text-red-400'}`}>
                    {isWinning 
                        ? "🚀 Você está 15% mais eficiente que seu fantasma! Mantenha o ritmo para bater o recorde." 
                        : "⚠️ Cuidado! Seu fantasma gastava menos nesta altura do mês. Reduza o ritmo!"}
                </p>
            </div>
        </NeonCard>
    );
};

const NemesisRadarModule = ({ categories }) => {
    // Calculate real budget offenders
    const radarData = React.useMemo(() => {
        return categories.slice(0, 5).map(cat => {
            const spent = (cat.expenses || []).reduce((sum, exp) => sum + exp.value, 0);
            const budgetUsage = cat.budget > 0 ? (spent / cat.budget) * 100 : 0;
            
            return {
                subject: cat.name,
                A: budgetUsage,
                fullMark: 150,
                color: budgetUsage > 100 ? '#FF0055' : cat.color
            };
        });
    }, [categories]);
    
    const nemesis = radarData.length > 0 
        ? radarData.reduce((prev, current) => (prev.A > current.A) ? prev : current)
        : NEMESIS_DATA[0];

    return (
        <NeonCard glowColor="magenta" className="h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-magenta-500/10 blur-3xl rounded-full pointer-events-none" />
            
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Skull className="w-5 h-5 text-magenta-400" />
                        Nemesis Radar
                    </h3>
                    <p className="text-gray-400 text-xs">Maior Ofensor</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative">
                {/* Boss Card Style */}
                <div className="w-full bg-gradient-to-b from-red-900/20 to-black border border-red-500/50 p-4 rounded-xl text-center relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">
                        WANTED
                    </div>
                    
                    <h4 className="text-2xl font-black text-white mt-2 mb-1 uppercase tracking-wider drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
                        {nemesis.subject}
                    </h4>
                    
                    <div className="w-full bg-gray-900 h-4 rounded-full overflow-hidden border border-red-500/30 mb-2 relative group">
                        <div 
                            className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-1000 animate-pulse"
                            style={{ width: `${Math.min(nemesis.A, 100)}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                            {nemesis.A}% DO ORÇAMENTO
                        </span>
                    </div>
                    
                    <p className="text-red-300 text-xs">
                        Dano Crítico ao Orçamento Detectado!
                    </p>
                </div>

                <div className="w-full h-[180px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData.length > 0 ? radarData : NEMESIS_DATA}>
                            <PolarGrid stroke="#333" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                            <Radar
                                name="Gasto"
                                dataKey="A"
                                stroke="#FF00FF"
                                fill="#FF00FF"
                                fillOpacity={0.4}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="mt-2 p-2 border-l-2 border-magenta-500 pl-3">
                <p className="text-xs text-gray-300">
                    <span className="text-magenta-400 font-bold">ALERTA DE BOSS:</span> A categoria '{nemesis.subject}' causou {nemesis.A}% de dano crítico.
                    <br/>
                    <span className="text-gray-500 italic">Sugestão: Equipe 'Marmita' amanhã.</span>
                </p>
            </div>
        </NeonCard>
    );
};

const ComboCounterModule = ({ categories, dailyGoals }) => {
    // Calculate real combo based on daily goals
    const combo = React.useMemo(() => {
        const today = new Date();
        let streak = 0;
        
        // Check last 30 days
        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateStr = format(checkDate, 'yyyy-MM-dd');
            
            // Get expenses for this day
            const dayTotal = categories.reduce((sum, cat) => {
                return sum + (cat.expenses || [])
                    .filter(exp => exp.date === dateStr)
                    .reduce((s, e) => s + e.value, 0);
            }, 0);
            
            // Get daily goal for this day
            const dayGoal = dailyGoals.find(g => g.date === dateStr);
            const target = dayGoal?.target_amount || 100; // Default
            
            // Check if within target
            if (dayTotal <= target) {
                streak++;
            } else {
                break; // Streak broken
            }
        }
        
        return streak;
    }, [categories, dailyGoals]);
    
    return (
        <NeonCard glowColor="gold" className="h-full flex flex-col justify-between relative overflow-hidden group">
            {/* Background effects */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay" />
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-yellow-500/20 blur-3xl rounded-full animate-pulse" />

            <div className="relative z-10">
                <h3 className="text-yellow-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-1">
                    <Crown className="w-4 h-4" />
                    Sequência de Vitórias
                </h3>
                
                <div className="flex items-center justify-center py-6">
                    <div className="text-center transform group-hover:scale-110 transition-transform duration-300">
                        <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)] font-mono">
                            x{combo}
                        </div>
                        <p className="text-yellow-200/80 text-xs font-bold uppercase tracking-[0.2em] mt-2 animate-pulse">
                            SUPER COMBO!
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative z-10 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-3">
                <Flame className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div>
                    <p className="text-yellow-100 text-xs font-bold">Bônus de Dopamina Ativo!</p>
                    <p className="text-yellow-500/70 text-[10px] mt-0.5">
                        Você está há uma semana sem gastos supérfluos. Continue assim para desbloquear a conquista "Mão de Vaca Lendário".
                    </p>
                </div>
            </div>
        </NeonCard>
    );
};

const WeekendVulnerabilityModule = ({ categories }) => {
    // Calculate real weekly spending pattern
    const weekData = React.useMemo(() => {
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const dayTotals = [0, 0, 0, 0, 0, 0, 0];
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];
        
        categories.forEach(cat => {
            (cat.expenses || []).forEach(exp => {
                const date = new Date(exp.date);
                const dayOfWeek = getDay(date);
                dayTotals[dayOfWeek] += exp.value;
                dayCounts[dayOfWeek]++;
            });
        });
        
        // Calculate averages
        const result = dayNames.map((name, idx) => ({
            day: name,
            value: dayCounts[idx] > 0 ? dayTotals[idx] / dayCounts[idx] : 0
        }));
        
        return result.length > 0 && result.some(d => d.value > 0) ? result : WEEKEND_DATA;
    }, [categories]);
    
    const maxDay = weekData.reduce((prev, curr) => prev.value > curr.value ? prev : curr);
    const avgSpending = weekData.reduce((sum, d) => sum + d.value, 0) / 7;
    
    return (
        <NeonCard glowColor="purple" className="h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-purple-400" />
                        Weekend Vulnerability
                    </h3>
                    <p className="text-gray-400 text-xs">Padrão Semanal de Gastos</p>
                </div>
            </div>

            <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="day" stroke="#666" tick={{fontSize: 12}} />
                        <YAxis stroke="#666" tick={{fontSize: 11}} tickFormatter={(v) => `R$${v.toFixed(0)}`} />
                        <Tooltip 
                            cursor={{fill: '#ffffff10'}}
                            contentStyle={{ backgroundColor: '#0a0a1a', border: '1px solid #8A2BE2', borderRadius: '8px' }}
                            formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Média']}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {weekData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.value > avgSpending * 1.5 ? '#FF0055' : '#8A2BE2'} 
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                <p className="text-purple-300 text-xs">
                    <strong>⚠️ Falha na Defesa:</strong> Seus gastos em <span className="text-red-400 font-bold">{maxDay.day}</span> são {((maxDay.value / avgSpending - 1) * 100).toFixed(0)}% acima da média.
                    <br/>
                    <span className="text-gray-400">Estratégia: Defina um "Teto de Gastos" específico para este dia da semana.</span>
                </p>
            </div>
        </NeonCard>
    );
};

// --- MAIN COMPONENT ---

export default function NeuralAnalytics() {
    // Fetch budget categories for real data
    const { data: categories = [] } = useQuery({
        queryKey: ['budgetCategories'],
        queryFn: () => base44.entities.BudgetCategory.list(),
    });

    const { data: dailyGoals = [] } = useQuery({
        queryKey: ['dailyGoals'],
        queryFn: () => base44.entities.DailyGoal.list(),
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                    <Zap className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-wide">TACTICAL OPS CENTER</h2>
                    <p className="text-cyan-500/60 text-sm font-mono">Neural Behavioral Analytics v2.0</p>
                </div>
            </div>

            {/* Top Row: Ghost Race (Wide) + Combo (Small) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[350px]">
                <div className="lg:col-span-2 h-full">
                    <GhostRaceModule categories={categories} />
                </div>
                <div className="h-full">
                    <ComboCounterModule categories={categories} dailyGoals={dailyGoals} />
                </div>
            </div>

            {/* Bottom Row: Nemesis + Weekend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-[400px]">
                <NemesisRadarModule categories={categories} />
                <WeekendVulnerabilityModule categories={categories} />
            </div>
        </div>
    );
}