import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  TrendingUp, Target, Zap, Trophy, 
  LineChart, BarChart3, Award, Crosshair, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import NeonCard from '../components/NeonCard';
import RetirementCalculator from '../components/RetirementCalculator';
import DebtStrategySimulator from '../components/DebtStrategySimulator';
import PowerScore from '../components/PowerScore';
import InvestmentSimulator from '../components/InvestmentSimulator';
import DebtPayoffPlanner from '../components/DebtPayoffPlanner';
import MiniGamesWidget from '../components/MiniGamesWidget';
import PowerScoreSummary from '../components/PowerScoreSummary';
import NextMissionsWidget from '../components/NextMissionsWidget';
import IntelligenceReports from '../components/IntelligenceReports';
import GoogleSheetsExporter from '../components/GoogleSheetsExporter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const MOCK_DEBT_HISTORY = (initialDebt) => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  let currentDebt = initialDebt * 1.25;
  const data = [];
  for (let i = 0; i < 6; i++) {
    data.push({ month: months[i], value: Math.max(currentDebt, 0) });
    currentDebt *= 0.95;
  }
  return data;
};

export default function CommandCenter() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userData } = useQuery({
    queryKey: ['currentUserProfile', currentUser?.email],
    queryFn: async () => {
      if (currentUser?.email) {
        const profiles = await base44.entities.User.filter({ email: currentUser.email });
        return profiles && profiles.length > 0 ? profiles[0] : null;
      }
      return null;
    },
    enabled: !!currentUser,
  });

  const { data: netWorthData } = useQuery({
    queryKey: ['netWorthSummary', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return { assets: [], debts: [] };
      const [assetsResponse, debtsResponse] = await Promise.all([
        base44.entities.Asset.filter({ created_by: currentUser.email }),
        base44.entities.Debt.filter({ created_by: currentUser.email })
      ]);
      return { assets: assetsResponse || [], debts: debtsResponse || [] };
    },
    enabled: !!currentUser?.email 
  });

  const { data: profileData } = useQuery({
    queryKey: ['userProfileForProjection', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const profiles = await base44.entities.FinancialProfile.filter({ created_by: currentUser.email });
      return profiles[0];
    },
    enabled: !!currentUser?.email
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['allGoals', currentUser?.email],
    queryFn: () => base44.entities.Goal.filter({ created_by: currentUser?.email }, '-created_date', 20),
    enabled: !!currentUser?.email,
    staleTime: 10 * 60 * 1000
  });

  const { data: missions = [] } = useQuery({
    queryKey: ['allMissions', currentUser?.email],
    queryFn: () => base44.entities.Mission.filter({ created_by: currentUser?.email }, '-created_date', 15),
    enabled: !!currentUser?.email,
    staleTime: 5 * 60 * 1000
  });

  const { data: finTransactions = [] } = useQuery({
    queryKey: ['finTransactions', currentUser?.email],
    queryFn: () => base44.entities.FinTransaction.filter({ created_by: currentUser?.email }, '-created_date', 100),
    enabled: !!currentUser?.email,
    staleTime: 5 * 60 * 1000
  });

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories', currentUser?.email],
    queryFn: () => base44.entities.BudgetCategory.filter({ created_by: currentUser?.email }, '-created_date', 50),
    enabled: !!currentUser?.email,
    staleTime: 15 * 60 * 1000
  });

  const assets = netWorthData?.assets || [];
  const debts = netWorthData?.debts || [];
  const totalAssets = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
  const totalDebts = debts.reduce((sum, debt) => sum + (debt.outstanding_balance || 0), 0);
  const netWorth = totalAssets - totalDebts;
  
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const completedMissions = missions.filter(m => m.status === 'completed').length;

  const projectionData = React.useMemo(() => {
    const savingsRate = (profileData?.savings_percentage || 5) / 100;
    const monthlyIncome = profileData?.monthly_income || 0;
    const monthlySavings = monthlyIncome * savingsRate;
    const avgReturn = 0.008;
    const data = [];
    let projectedNetWorth = netWorth;

    for (let month = 0; month <= 12; month++) {
      data.push({
        month: `M${month}`,
        projected: projectedNetWorth
      });
      if (month < 12) {
        projectedNetWorth = (projectedNetWorth + monthlySavings) * (1 + avgReturn);
      }
    }
    return data;
  }, [netWorth, profileData]);

  const goalsProgressData = goals.slice(0, 5).map(goal => {
    const progress = (goal.target_amount && goal.target_amount > 0) 
      ? (goal.current_amount / goal.target_amount) * 100 
      : 0;
    return {
      name: goal.name.substring(0, 20),
      progress: progress
    };
  });

  const exportToPDF = () => {
    toast.info('Preparando relatório...', { description: 'Use "Salvar como PDF" do navegador' });
    setTimeout(() => window.print(), 500);
  };

  const financialData = {
    savingsRate: profileData?.savings_percentage || 0,
    investmentDiversity: assets.length > 0 ? (new Set(assets.map(a => a.type)).size / 4) : 0,
    debtToIncome: profileData?.monthly_income > 0 ? (totalDebts / (profileData.monthly_income * 12)) : 0,
    budgetAdherence: 75
  };

  return (
    <div className="space-y-4 sm:space-y-8 max-w-7xl mx-auto relative overflow-hidden px-2 sm:px-0 pb-20 sm:pb-8">
      {/* Animated Particles */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-3xl opacity-20"
            animate={{ 
              x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
              y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
              rotate: [0, 360],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 6 + Math.random() * 3,
              repeat: Infinity,
              delay: i * 0.5
            }}
          >
            {['📊', '⚡', '🎯', '💎', '🔥'][i % 5]}
          </motion.div>
        ))}
      </div>

      {/* Epic Header */}
      <motion.div 
        className="text-center relative z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="relative inline-block mb-6">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-magenta-500 blur-3xl opacity-60"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <div className="relative flex items-center gap-4">
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Crosshair className="w-14 h-14 text-cyan-400" />
            </motion.div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-magenta-400 tracking-wider animate-pulse">
              CENTRO DE COMANDO
            </h1>
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <BarChart3 className="w-14 h-14 text-magenta-400" />
            </motion.div>
          </div>
        </div>
        <motion.p 
          className="text-cyan-400 text-xl font-bold flex items-center justify-center gap-2"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-5 h-5" />
          Análises Táticas e Arsenal Estratégico
          <Sparkles className="w-5 h-5" />
        </motion.p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-2xl mx-auto bg-[#0a0a1a] border border-cyan-500/30 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20 text-xs sm:text-sm min-h-[44px]">
            <LineChart className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="tools" className="data-[state=active]:bg-purple-500/20 text-xs sm:text-sm min-h-[44px]">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Ferramentas</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-green-500/20 text-xs sm:text-sm min-h-[44px]">
            <Award className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Relatórios</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <NeonCard glowColor="cyan" className="text-center">
              <Zap className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <p className="text-3xl font-black text-white mb-1">{userData?.level || 1}</p>
              <p className="text-gray-400 text-sm">Nível Atual</p>
            </NeonCard>
            <NeonCard glowColor="purple" className="text-center">
              <Target className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-3xl font-black text-white mb-1">{completedGoals}/{totalGoals}</p>
              <p className="text-gray-400 text-sm">Metas Concluídas</p>
            </NeonCard>
            <NeonCard glowColor="green" className="text-center">
              <Trophy className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-3xl font-black text-white mb-1">{completedMissions}</p>
              <p className="text-gray-400 text-sm">Missões Completas</p>
            </NeonCard>
          </div>

          {/* New Widgets Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MiniGamesWidget user={userData} />
            <PowerScoreSummary 
              userData={userData} 
              netWorthData={netWorthData} 
              financialProfile={profileData}
              goals={goals}
            />
            <NextMissionsWidget userData={userData} />
          </div>

          <PowerScore userData={userData} financialData={financialData} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NeonCard glowColor="cyan">
              <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Projeção Patrimonial (12 Meses)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={projectionData} margin={{ left: 10 }}>
                  <defs>
                    <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00FFFF" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#00FFFF" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#888" 
                    tick={{fontSize: 12}} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#888" 
                    tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`}
                    tick={{fontSize: 12}}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #00FFFF', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 'Patrimônio']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="#00FFFF" 
                    strokeWidth={3}
                    fill="url(#colorProj)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </NeonCard>

            {goalsProgressData.length > 0 && (
              <NeonCard glowColor="purple">
                <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  Progresso de Metas (%)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={goalsProgressData} margin={{ bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#888" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80} 
                      tick={{fontSize: 12}}
                      interval={0}
                    />
                    <YAxis 
                      stroke="#888" 
                      unit="%" 
                      domain={[0, 100]}
                      tick={{fontSize: 12}}
                    />
                    <Tooltip 
                      cursor={{fill: 'rgba(138, 43, 226, 0.1)'}}
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #8A2BE2', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value) => [`${value.toFixed(1)}%`, 'Progresso']}
                    />
                    <Bar 
                      dataKey="progress" 
                      fill="#8A2BE2" 
                      radius={[6, 6, 0, 0]}
                      animationDuration={1500}
                    >
                      {goalsProgressData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.progress >= 100 ? '#10B981' : '#8A2BE2'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </NeonCard>
            )}
          </div>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4 sm:space-y-6">
          <DebtStrategySimulator 
            debts={debts}
            onStrategySelect={(strategyData) => {
              if (!userData?.id) {
                toast.error('Usuário não encontrado');
                return;
              }
              
              base44.entities.User.update(userData.id, {
                debt_strategy: strategyData.strategy,
                debt_monthly_payment: strategyData.monthlyPayment,
                debt_strategy_start_date: new Date().toISOString(),
                debt_projected_months: strategyData.projectedMonths,
                debt_projected_interest: strategyData.projectedInterest,
                debt_order: strategyData.debtOrder,
                debt_initial_total: debts.reduce((sum, d) => sum + d.outstanding_balance, 0)
              }).then(() => {
                queryClient.invalidateQueries(['currentUserProfile']);
                toast.success('🎯 Estratégia de Batalha Ativada!', {
                  description: `Você escolheu a estratégia ${strategyData.strategy.toUpperCase()}. Vamos rastrear seu progresso!`
                });
              });
            }}
          />
          <RetirementCalculator />
          <InvestmentSimulator />
          <DebtPayoffPlanner />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <GoogleSheetsExporter />
          <IntelligenceReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}