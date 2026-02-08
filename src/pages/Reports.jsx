import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Target, Zap, Download, Calendar, Banknote, Sparkles } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import NeonCard from '../components/NeonCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import BudgetCharts from '../components/BudgetCharts';

// Mock de dados para Evolução das Dívidas
const MOCK_DEBT_HISTORY = (initialDebt) => {
    // Simula uma redução de dívida de 5% a cada mês
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    let currentDebt = initialDebt * 1.25; // Começa com um valor maior
    const data = [];

    for (let i = 0; i < 6; i++) {
        data.push({ month: months[i], value: Math.max(currentDebt, 0) });
        currentDebt *= 0.95; // Redução de 5%
    }
    return data;
};

// Cores para gráficos
const ASSET_COLOR = '#39FF14'; // Verde Neon
const DEBT_COLOR = '#FF00FF'; // Magenta Neon

export default function Reports() {
  const [timeRange, setTimeRange] = useState('30'); // days

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch user profile data (XP, Level, etc.)
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

// Fetch Ativos e Dívidas (Patrimônio) - CHAVE CONSISTENTE
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

const assets = netWorthData?.assets || [];
const debts = netWorthData?.debts || [];

const totalAssets = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
const totalDebts = debts.reduce((sum, debt) => sum + (debt.outstanding_balance || 0), 0);
const netWorth = totalAssets - totalDebts;
const debtEvolutionData = MOCK_DEBT_HISTORY(totalDebts);

// Fetch profile for projection
const { data: profileData } = useQuery({
  queryKey: ['userProfileForProjection', currentUser?.email],
  queryFn: async () => {
    if (!currentUser?.email) return null;
    const profiles = await base44.entities.FinancialProfile.filter({ created_by: currentUser.email });
    return profiles[0];
  },
  enabled: !!currentUser?.email
});

// Calculate 12-month projection
const projectionData = React.useMemo(() => {
  const savingsRate = (profileData?.savings_percentage || 5) / 100;
  const monthlyIncome = profileData?.monthly_income || 0;
  const monthlySavings = monthlyIncome * savingsRate;
  const avgReturn = 0.008; // 0.8% a.m. (conservative)

  const data = [];
  let currentNetWorth = netWorth;
  let projectedNetWorth = netWorth;

  for (let month = 0; month <= 12; month++) {
    data.push({
      month: `M${month}`,
      actual: month === 0 ? currentNetWorth : null,
      projected: projectedNetWorth
    });

    if (month < 12) {
      projectedNetWorth = (projectedNetWorth + monthlySavings) * (1 + avgReturn);
    }
  }

  return data;
}, [netWorth, profileData]);


  // Fetch goals
  const { data: goals = [] } = useQuery({
    queryKey: ['allGoals'],
    queryFn: () => base44.entities.Goal.list('-created_date')
  });

  // Fetch Budget Categories for Charts
  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  // Fetch missions
  const { data: missions = [] } = useQuery({
    queryKey: ['allMissions'],
    queryFn: () => base44.entities.Mission.list('-created_date')
  });

  // Calculate stats
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const totalMissions = missions.length;
  const completedMissions = missions.filter(m => m.status === 'completed').length;

  // XP Progress data
  const xpData = [
    { level: 1, xp: 0 },
    { level: 2, xp: 100 },
    { level: 3, xp: 300 },
    { level: 4, xp: 600 },
    { level: 5, xp: 1000 },
    { level: userData?.level || 1, xp: userData?.total_xp || 0 },
  ].filter((item, index, arr) => item.level <= (userData?.level || 1));

// CORREÇÃO: Proteção contra divisão por zero no cálculo do progresso
  const goalsProgressData = goals.slice(0, 5).map(goal => {
        const progress = (goal.target_amount && goal.target_amount > 0) 
            ? (goal.current_amount / goal.target_amount) * 100 
            : 0; // Se alvo for zero ou nulo, o progresso é 0
        
        return {
            name: goal.name.substring(0, 20),
            progress: progress,
            current: goal.current_amount,
            target: goal.target_amount
        };
    });

  // Mission completion by type
  const missionTypeData = [
    { name: 'Diárias', value: missions.filter(m => m.type === 'daily' && m.status === 'completed').length, color: '#00FFFF' },
    { name: 'Semanais', value: missions.filter(m => m.type === 'weekly' && m.status === 'completed').length, color: '#FF00FF' },
    { name: 'Campanha', value: missions.filter(m => m.type === 'campaign' && m.status === 'completed').length, color: '#39FF14' }
  ];

  const exportToPDF = () => {
    toast.info('Preparando relatório para impressão...', {
      description: 'Use a opção "Salvar como PDF" do navegador'
    });
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto print:max-w-none" data-date={new Date().toLocaleDateString('pt-BR')}>
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">Relatórios Financeiros</h1>
          <p className="text-cyan-400/80">Acompanhe sua evolução e progresso</p>
        </div>
        <Button
          onClick={exportToPDF}
          className="bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600 text-white font-bold"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
        <NeonCard glowColor="cyan" className="text-center print:shadow-none">
          <Zap className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
          <p className="text-3xl font-black text-white mb-1">{userData?.level || 1}</p>
          <p className="text-gray-400 text-sm">Nível Atual</p>
        </NeonCard>
        <NeonCard glowColor="purple" className="text-center print:shadow-none">
          <Target className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <p className="text-3xl font-black text-white mb-1">
            {completedGoals}/{totalGoals}
          </p>
          <p className="text-gray-400 text-sm">Metas Concluídas</p>
        </NeonCard>
        <NeonCard glowColor="green" className="text-center print:shadow-none">
          <Calendar className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-3xl font-black text-white mb-1">
            {completedMissions}
          </p>
          <p className="text-gray-400 text-sm">Missões Completadas</p>
        </NeonCard>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Balanço Patrimonial (Assets vs Debts) */}
        <NeonCard glowColor={netWorth >= 0 ? 'green' : 'red'} className="print:shadow-none print:col-span-2">
            <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2 print:text-gray-800">
                <Banknote className="w-5 h-5 text-green-400 print:text-green-600" />
                Balanço Patrimonial
            </h3>
            <div className="overflow-x-auto mb-4">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-gray-600 print:border-gray-300">
                            <th className="pb-3 pt-2 text-green-400 font-semibold print:text-gray-700">Categoria</th>
                            <th className="pb-3 pt-2 text-green-400 font-semibold text-right print:text-gray-700">Valor (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-gray-700 print:border-gray-200">
                            <td className="py-3 text-white font-semibold print:text-gray-800">Ativos Totais</td>
                            <td className="py-3 text-white font-bold text-right text-lg print:text-gray-800">
                                R$ {totalAssets.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>
                        <tr className="border-b border-gray-700 print:border-gray-200">
                            <td className="py-3 text-white font-semibold print:text-gray-800">Passivos Totais (Dívidas)</td>
                            <td className="py-3 font-bold text-right text-lg text-red-400 print:text-red-600">
                                R$ {totalDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>
                        <tr className="border-t-2 border-cyan-400/50 print:border-gray-400">
                            <td className="py-3 text-lg font-bold print:text-gray-900">Patrimônio Líquido</td>
                            <td className={`py-3 text-xl font-black text-right ${netWorth >= 0 ? 'text-green-400 print:text-green-600' : 'text-red-500 print:text-red-600'}`}>
                                R$ {netWorth.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="print:hidden">
              <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                      <Pie
                          data={[
                              { name: 'Ativos', value: totalAssets || 1 },
                              { name: 'Dívidas', value: totalDebts || 0.1 }
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                          <Cell fill={ASSET_COLOR} />
                          <Cell fill={DEBT_COLOR} />
                      </Pie>
                      <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #39FF14' }}
                          labelStyle={{ color: '#fff' }}
                          formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      />
                      <Legend />
                  </PieChart>
              </ResponsiveContainer>
            </div>
        </NeonCard>

        {/* Predictive Net Worth Projection */}
        <NeonCard glowColor="cyan" className="print:shadow-none lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <h3 className="text-white font-bold text-xl">Projeção de Patrimônio (12 Meses)</h3>
            </div>
            <div className="text-right">
              <p className="text-cyan-400 text-sm">Crescimento Projetado</p>
              <p className="text-white font-bold">+{((projectionData[12]?.projected - netWorth) / netWorth * 100).toFixed(1)}%</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={projectionData}>
              <defs>
                <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FFFF" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#00FFFF" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" className="print:stroke-gray-300" />
              <XAxis 
                dataKey="month" 
                stroke="#888" 
                tick={{ fontSize: 10 }}
                className="print:stroke-gray-700"
              />
              <YAxis 
                stroke="#888" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`}
                className="print:stroke-gray-700"
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #00FFFF' }}
                formatter={(value) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="actual" 
                stroke="#39FF14" 
                strokeWidth={3}
                fill="none"
                name="Patrimônio Atual"
                connectNulls={false}
              />
              <Area 
                type="monotone" 
                dataKey="projected" 
                stroke="#00FFFF" 
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorProjected)"
                name="Projeção (Taxa Atual)"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 print:hidden">
            <p className="text-cyan-400 text-xs">
              <Sparkles className="w-3 h-3 inline mr-1" />
              <strong>Premissas:</strong> Taxa de poupança {profileData?.savings_percentage || 5}%, 
              retorno médio 0.8% a.m. Projeção educacional, não constitui garantia.
            </p>
          </div>
        </NeonCard>
        
        {/* XP Progress */}
        <NeonCard glowColor="magenta">
          <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-magenta-400" />
            Histórico de XP
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={xpData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="level" stroke="#888" label={{ value: 'Nível', position: 'insideBottom', offset: -5, fill: '#888' }} />
              <YAxis stroke="#888" label={{ value: 'XP Total', angle: -90, position: 'insideLeft', fill: '#888' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #FF00FF' }}
                labelStyle={{ color: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="xp" 
                stroke="#FF00FF" 
                strokeWidth={3}
                dot={{ fill: '#FF00FF', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </NeonCard>

        {/* Goals Progress */}
        <NeonCard glowColor="purple">
          <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Progresso das Metas
          </h3>
          {goalsProgressData && goalsProgressData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={goalsProgressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #8A2BE2' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => `${value.toFixed(1)}%`}
                />
                <Bar dataKey="progress" fill="#8A2BE2" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center">
                <p className="text-gray-500">Nenhuma meta em progresso para exibir.</p>
            </div>
        )}
        </NeonCard>

        {/* Mission Types */}
        <NeonCard glowColor="green">
          <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-400" />
            Missões por Tipo
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={missionTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {missionTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #39FF14' }}
                labelStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </NeonCard>
        </div>

        {/* Budget Analysis Charts */}
        <div className="print:break-inside-avoid">
          <BudgetCharts categories={budgetCategories} />
        </div>

        {/* Goals Detail Table */}
        {goals.length > 0 && (
        <NeonCard glowColor="cyan">
            <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              Detalhamento de Metas
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-cyan-500/30">
                    <th className="pb-3 text-cyan-400 font-semibold">Meta</th>
                    <th className="pb-3 text-cyan-400 font-semibold">Progresso</th>
                    <th className="pb-3 text-cyan-400 font-semibold">Valor Atual</th>
                    <th className="pb-3 text-cyan-400 font-semibold">Valor Alvo</th>
                    <th className="pb-3 text-cyan-400 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((goal, index) => {
                    const progress = (goal.current_amount / goal.target_amount) * 100;
                    return (
                      <tr key={goal.id} className="border-b border-gray-700">
                        <td className="py-3 text-white font-semibold">{goal.name}</td>
                        <td className="py-3">
                          <div className="w-32 h-2 bg-[#0a0a1a] rounded-full overflow-hidden border border-cyan-500/30">
                            <div 
                              className="h-full bg-gradient-to-r from-cyan-500 to-magenta-500"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 text-gray-300">R$ {goal.current_amount.toFixed(2)}</td>
                        <td className="py-3 text-gray-300">R$ {goal.target_amount.toFixed(2)}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            goal.status === 'completed' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                          }`}>
                            {goal.status === 'completed' ? 'Concluída' : 'Em Progresso'}
                        </span>
                        </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </NeonCard>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }

          body {
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          .print\\:max-w-none, .print\\:max-w-none * {
            visibility: visible;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:max-w-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            padding: 20px;
          }

          /* Professional print styling */
          h1, h2, h3, h4, h5, h6 {
            color: #1a1a2e !important;
            page-break-after: avoid;
          }

          table {
            page-break-inside: avoid;
            border-collapse: collapse;
          }

          /* Cards on print */
          .print\\:shadow-none {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
            background: white !important;
          }

          /* Chart containers */
          .recharts-wrapper {
            page-break-inside: avoid;
          }

          /* Grid layouts */
          .grid {
            page-break-inside: avoid;
          }

          /* Text colors for print */
          p, span, td, th {
            color: #333 !important;
          }

          /* Remove backgrounds */
          div[class*="bg-"] {
            background: white !important;
          }

          /* Header styling */
          .print\\:max-w-none h1 {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 10pt;
            border-bottom: 2pt solid #00FFFF;
            padding-bottom: 5pt;
          }

          /* Section spacing */
          .space-y-8 > * {
            margin-bottom: 20pt !important;
          }

          /* Table styling */
          table {
            width: 100%;
            margin-top: 10pt;
          }

          th {
            background: #f5f5f5 !important;
            font-weight: bold;
            padding: 8pt;
            text-align: left;
            border-bottom: 2pt solid #ddd;
          }

          td {
            padding: 8pt;
            border-bottom: 1pt solid #eee;
          }

          /* Footer */
          .print\\:max-w-none::after {
            content: "FinQuest: Neon RPG - Relatório Financeiro | Gerado em " attr(data-date);
            position: fixed;
            bottom: 10pt;
            right: 10pt;
            font-size: 8pt;
            color: #999;
          }
        }
      `}</style>
    </div>
  );
}