import { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, AlertTriangle, 
  Target, PieChart as PieIcon, BarChart3, Activity, Zap, Shield, 
  Trophy, Flame, Eye, Lightbulb, Sparkles, Calendar, Download,
  FileText, Award, Skull, Crown, Swords, Heart, Star, Rocket
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { startOfMonth, format, parseISO, isWithinInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COLORS = ['#00FFFF', '#FF00FF', '#39FF14', '#FFD700', '#FF1493', '#00CED1', '#FF6347', '#9370DB'];

const NeonCard = ({ children, glowColor = 'cyan', className = '' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/80',
    purple: 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-slate-900/80',
    red: 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)] bg-slate-900/80',
    orange: 'border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.15)] bg-slate-900/80',
    green: 'border-green-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-slate-900/80',
    gold: 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)] bg-slate-900/80',
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden ${colors[glowColor] || colors.cyan} ${className}`}>
      {children}
    </div>
  );
};

export default function IntelligenceReports() {
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const reportRef = useRef(null);

  // Fetch data
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: finTransactions = [] } = useQuery({
    queryKey: ['finTransactions', currentUser?.email],
    queryFn: () => base44.entities.FinTransaction.filter({ created_by: currentUser?.email }, '-created_date', 200),
    enabled: !!currentUser?.email,
    staleTime: 5 * 60 * 1000
  });

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories', currentUser?.email],
    queryFn: () => base44.entities.BudgetCategory.filter({ created_by: currentUser?.email }, '-created_date', 50),
    enabled: !!currentUser?.email,
    staleTime: 15 * 60 * 1000
  });

  const { data: netWorthData } = useQuery({
    queryKey: ['netWorthSummary', currentUser?.email],
    queryFn: async () => {
      const [assets, debts] = await Promise.all([
        base44.entities.Asset.filter({ created_by: currentUser?.email }, '-created_date', 50),
        base44.entities.Debt.filter({ created_by: currentUser?.email }, '-created_date', 50)
      ]);
      return { assets: assets || [], debts: debts || [] };
    },
    enabled: !!currentUser?.email,
    staleTime: 10 * 60 * 1000
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['allGoals', currentUser?.email],
    queryFn: () => base44.entities.Goal.filter({ created_by: currentUser?.email }, '-created_date', 20),
    enabled: !!currentUser?.email,
    staleTime: 10 * 60 * 1000
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
    staleTime: 30 * 60 * 1000
  });

  const { data: financialProfile } = useQuery({
    queryKey: ['financialProfile', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const profiles = await base44.entities.FinancialProfile.filter({ created_by: currentUser.email });
      return profiles[0];
    },
    enabled: !!currentUser?.email,
    staleTime: 30 * 60 * 1000
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', currentUser?.email],
    queryFn: () => base44.entities.Account.filter({ created_by: currentUser?.email }, '-created_date', 20),
    enabled: !!currentUser?.email,
    staleTime: 10 * 60 * 1000
  });

  // Process data
  const filteredTransactions = useMemo(() => {
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      
      return finTransactions.filter(t => {
        if (!t.date) return false;
        const transDate = parseISO(t.date);
        const isInPeriod = isWithinInterval(transDate, { start, end });
        
        const isInternalTransfer = 
          t.category === 'Resgate Cofre' || 
          t.category === 'Aplicação Cofre' ||
          t.category?.toLowerCase().includes('resgate') ||
          t.category?.toLowerCase().includes('transferência') ||
          t.category?.toLowerCase().includes('transferencia');
        
        return isInPeriod && !isInternalTransfer;
      });
    } catch (error) {
      return finTransactions;
    }
  }, [finTransactions, startDate, endDate]);

  const dreData = useMemo(() => {
    const revenue = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.value), 0);
    
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.value), 0);
    
    return { revenue, expenses, result: revenue - expenses };
  }, [filteredTransactions]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    
    filteredTransactions.forEach(t => {
      const cat = t.category || 'Sem Categoria';
      if (!map[cat]) map[cat] = { name: cat, income: 0, expense: 0, count: 0 };
      if (t.type === 'income') map[cat].income += Math.abs(t.value);
      else map[cat].expense += Math.abs(t.value);
      map[cat].count++;
    });
    
    return Object.values(map).sort((a, b) => b.expense - a.expense);
  }, [filteredTransactions]);

  const pieData = useMemo(() => {
    const expenseCategories = categoryBreakdown.filter(c => c.expense > 0);
    const totalExpense = expenseCategories.reduce((sum, c) => sum + c.expense, 0);
    
    const topCategories = expenseCategories.slice(0, 7);
    const otherCategories = expenseCategories.slice(7);
    
    const result = topCategories.map(c => ({ 
      name: c.name, 
      value: c.expense,
      percentage: (c.expense / totalExpense) * 100 
    }));
    
    if (otherCategories.length > 0) {
      const othersTotal = otherCategories.reduce((sum, c) => sum + c.expense, 0);
      result.push({ 
        name: 'Outros', 
        value: othersTotal,
        percentage: (othersTotal / totalExpense) * 100
      });
    }
    
    return result;
  }, [categoryBreakdown]);

  const balanceData = useMemo(() => {
    const allAssets = netWorthData?.assets || [];
    const allDebts = netWorthData?.debts || [];

    const accountsAsAssets = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const totalAtivo = allAssets.reduce((sum, a) => sum + a.value, 0) + accountsAsAssets;
    const totalPassivo = allDebts.reduce((sum, d) => sum + d.outstanding_balance, 0);
    const patrimonioLiquido = totalAtivo - totalPassivo;

    return { 
      assets: totalAtivo, 
      debts: totalPassivo, 
      equity: patrimonioLiquido,
      patrimonioLiquido
    };
  }, [netWorthData, accounts]);

  // Health Score Calculation
  const healthScore = useMemo(() => {
    const savingsRate = financialProfile?.savings_percentage || 0;
    const dreEfficiency = dreData.revenue > 0 ? ((dreData.result / dreData.revenue) * 100) : 0;
    const debtRatio = balanceData.assets > 0 ? (balanceData.debts / balanceData.assets) * 100 : 0;
    const assetDiversity = (netWorthData?.assets || []).length;

    return {
      savings: Math.min((savingsRate / 20) * 100, 100),
      efficiency: Math.max(0, Math.min(dreEfficiency * 2, 100)),
      debt: Math.max(0, 100 - debtRatio),
      diversity: Math.min((assetDiversity / 5) * 100, 100),
      overall: ((Math.min((savingsRate / 20) * 100, 100) + 
                 Math.max(0, Math.min(dreEfficiency * 2, 100)) + 
                 Math.max(0, 100 - debtRatio) + 
                 Math.min((assetDiversity / 5) * 100, 100)) / 4)
    };
  }, [financialProfile, dreData, balanceData, netWorthData]);

  // Radar Chart Data
  const radarData = [
    { subject: 'Economia', value: healthScore.savings, fullMark: 100 },
    { subject: 'Eficiência', value: healthScore.efficiency, fullMark: 100 },
    { subject: 'Controle de Dívida', value: healthScore.debt, fullMark: 100 },
    { subject: 'Diversificação', value: healthScore.diversity, fullMark: 100 },
  ];

  // Generate AI Insight
  const generateAIInsight = useMutation({
    mutationFn: async () => {
      const daysInPeriod = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
      
      const prompt = `
Você é um coach financeiro motivacional e estrategista. Analise os dados e crie uma mensagem ÉPICA e ENGAJADORA:

DADOS DO GUERREIRO:
- Nível: ${userData?.level || 1}
- XP Total: ${userData?.total_xp || 0}
- Gold: ${userData?.gold_coins || 0}

PERÍODO ANALISADO: ${daysInPeriod} dias

BATALHAS FINANCEIRAS:
- Receitas (HP Restaurado): R$ ${dreData.revenue.toFixed(2)}
- Despesas (Dano Sofrido): R$ ${dreData.expenses.toFixed(2)}
- Resultado da Batalha: R$ ${dreData.result.toFixed(2)}
- Total de Transações: ${filteredTransactions.length}

ARSENAL E INIMIGOS:
- Ativos Totais: R$ ${balanceData.assets.toFixed(2)}
- Dívidas Totais: R$ ${balanceData.debts.toFixed(2)}
- Patrimônio Líquido: R$ ${balanceData.equity.toFixed(2)}

CATEGORIAS MAIS ATIVAS:
${categoryBreakdown.slice(0, 5).map(c => `- ${c.name}: R$ ${c.expense.toFixed(2)} (${c.count} transações)`).join('\n')}

METAS EM FORJA:
- Total: ${goals.length}
- Concluídas: ${goals.filter(g => g.status === 'completed').length}

CRIE UMA ANÁLISE ÉPICA E MOTIVACIONAL:
1. Um título impactante de 5-8 palavras (ex: "Sua Jornada Rumo à Grandeza Financeira")
2. Uma mensagem motivacional pessoal de 2-3 frases conectando com a jornada do jogador
3. 3 conquistas/vitórias que merecem celebração (seja criativo, encontre coisas positivas)
4. 2 desafios críticos que precisam de atenção (seja direto mas motivador)
5. 3 missões estratégicas para os próximos dias (ações específicas e atingíveis)

Use linguagem de RPG e gamificação. Seja ÉPICO mas PRÁTICO. Inspire ação!

Responda em JSON:
{
  "title": "Título épico",
  "message": "Mensagem motivacional",
  "victories": ["vitória 1", "vitória 2", "vitória 3"],
  "challenges": ["desafio 1", "desafio 2"],
  "next_missions": ["missão 1", "missão 2", "missão 3"]
}
`;

      return await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            message: { type: "string" },
            victories: { type: "array", items: { type: "string" } },
            challenges: { type: "array", items: { type: "string" } },
            next_missions: { type: "array", items: { type: "string" } }
          }
        }
      });
    },
    onSuccess: () => {
      setIsGeneratingInsight(false);
      toast.success('🧠 Relatório de Inteligência Gerado!', { duration: 3000 });
    },
    onError: () => {
      setIsGeneratingInsight(false);
      toast.error('Erro ao gerar análise');
    }
  });

  const aiInsights = generateAIInsight.data || { 
    title: '', 
    message: '', 
    victories: [], 
    challenges: [], 
    next_missions: [] 
  };

  // Export to PDF with styled content
  const exportToPDF = async () => {
    toast.info('📸 Capturando relatório...', { duration: 2000 });
    
    try {
      const element = reportRef.current;
      
      // Capture the report as canvas
      const canvas = await html2canvas(element, {
        backgroundColor: '#0A0A1A',
        scale: 2,
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width
      const pageHeight = 297; // A4 height
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`finquest-relatorio-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
      toast.success('🎯 Relatório Épico Exportado em PDF!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  const daysInPeriod = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  const dailyAvgExpense = daysInPeriod > 0 ? dreData.expenses / daysInPeriod : 0;
  const dailyAvgIncome = daysInPeriod > 0 ? dreData.revenue / daysInPeriod : 0;

  const topExpenseCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;
  const savingsRate = dreData.revenue > 0 ? ((dreData.result / dreData.revenue) * 100) : 0;

  return (
    <div className="space-y-6 relative" ref={reportRef}>
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl"
            animate={{ 
              x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
              y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
              rotate: [0, 360],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: i * 0.5
            }}
          >
            {['📊', '💎', '⚔️', '🛡️', '👑', '🎯', '⚡', '🔥'][i]}
          </motion.div>
        ))}
      </div>

      {/* Epic Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center relative z-10"
      >
        <div className="relative inline-block mb-6">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 blur-3xl opacity-60"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <div className="relative flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="w-16 h-16 text-purple-400" />
            </motion.div>
            <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 uppercase tracking-wider">
              RELATÓRIO DE INTELIGÊNCIA
            </h1>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Eye className="w-16 h-16 text-cyan-400" />
            </motion.div>
          </div>
        </div>
        <p className="text-cyan-400 text-lg font-bold flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 animate-pulse" />
          Análise Estratégica da Sua Jornada Financeira
          <Sparkles className="w-5 h-5 animate-pulse" />
        </p>
      </motion.div>

      {/* Date Filter & Export */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        <NeonCard glowColor="cyan">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-6 h-6 text-cyan-400" />
            <h3 className="text-white font-bold uppercase">Período de Análise</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">De:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-cyan-500/30 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Até:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-cyan-500/30 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                setEndDate(format(new Date(), 'yyyy-MM-dd'));
              }}
              className="flex-1 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 text-xs font-bold rounded-lg transition-all"
            >
              Este Mês
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setStartDate(format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'));
                setEndDate(format(now, 'yyyy-MM-dd'));
              }}
              className="flex-1 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 text-xs font-bold rounded-lg transition-all"
            >
              Este Ano
            </button>
          </div>
        </NeonCard>

        <NeonCard glowColor="purple">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-6 h-6 text-purple-400" />
            <h3 className="text-white font-bold uppercase">Exportar & Analisar</h3>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => {
                setIsGeneratingInsight(true);
                generateAIInsight.mutate();
              }}
              disabled={isGeneratingInsight}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:from-purple-500 hover:via-pink-400 hover:to-orange-400 text-white font-black rounded-xl transition-all shadow-[0_0_30px_rgba(168,85,247,0.4)] disabled:opacity-50"
            >
              {isGeneratingInsight ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Analisando...
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5" />
                  GERAR ANÁLISE COM IA
                  <Zap className="w-5 h-5 animate-pulse" />
                </>
              )}
            </button>

            <button
              onClick={exportToPDF}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            >
              <FileText className="w-5 h-5" />
              EXPORTAR PDF ÉPICO
              <Download className="w-5 h-5" />
            </button>
          </div>
        </NeonCard>
      </div>

      {/* AI Generated Epic Report */}
      <AnimatePresence>
        {aiInsights.title && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10"
          >
            <NeonCard glowColor="purple" className="bg-gradient-to-br from-purple-900/20 to-pink-900/20">
              <div className="text-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 mb-3">
                    {aiInsights.title}
                  </h2>
                </motion.div>
                <p className="text-lg text-slate-300 italic max-w-3xl mx-auto leading-relaxed">
                  "{aiInsights.message}"
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {/* Victories */}
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-6 h-6 text-green-400" />
                    <h4 className="text-green-400 font-black uppercase text-sm">Vitórias</h4>
                  </div>
                  <ul className="space-y-2">
                    {aiInsights.victories.map((v, idx) => (
                      <motion.li 
                        key={idx} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="text-sm text-slate-200 flex gap-2"
                      >
                        <Star className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <span>{v}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Challenges */}
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Skull className="w-6 h-6 text-red-400" />
                    <h4 className="text-red-400 font-black uppercase text-sm">Desafios</h4>
                  </div>
                  <ul className="space-y-2">
                    {aiInsights.challenges.map((c, idx) => (
                      <motion.li 
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="text-sm text-slate-200 flex gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5 animate-pulse" />
                        <span>{c}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Next Missions */}
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-6 h-6 text-cyan-400" />
                    <h4 className="text-cyan-400 font-black uppercase text-sm">Próximas Missões</h4>
                  </div>
                  <ul className="space-y-2">
                    {aiInsights.next_missions.map((m, idx) => (
                      <motion.li 
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="text-sm text-slate-200 flex gap-2"
                      >
                        <Swords className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>
            </NeonCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Overview - Your Battle Performance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        <NeonCard glowColor="green" className="text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Heart className="w-8 h-8 text-green-400 mx-auto mb-2" />
          </motion.div>
          <p className="text-xs text-slate-400 uppercase mb-1">HP Recuperado</p>
          <p className="text-2xl font-black text-green-400 font-mono">
            R$ {dreData.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-green-400/60 mt-1">+R$ {dailyAvgIncome.toFixed(0)}/dia</p>
        </NeonCard>

        <NeonCard glowColor="red" className="text-center">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Swords className="w-8 h-8 text-red-400 mx-auto mb-2" />
          </motion.div>
          <p className="text-xs text-slate-400 uppercase mb-1">Dano Sofrido</p>
          <p className="text-2xl font-black text-red-400 font-mono">
            R$ {dreData.expenses.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-red-400/60 mt-1">-R$ {dailyAvgExpense.toFixed(0)}/dia</p>
        </NeonCard>

        <NeonCard glowColor={dreData.result >= 0 ? 'cyan' : 'orange'} className="text-center">
          <Crown className={`w-8 h-8 mx-auto mb-2 ${dreData.result >= 0 ? 'text-cyan-400' : 'text-orange-400'}`} />
          <p className="text-xs text-slate-400 uppercase mb-1">Resultado</p>
          <p className={`text-2xl font-black font-mono ${dreData.result >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
            {dreData.result >= 0 ? '+' : ''}R$ {dreData.result.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
          <p className={`text-xs mt-1 ${dreData.result >= 0 ? 'text-cyan-400/60' : 'text-orange-400/60'}`}>
            {savingsRate.toFixed(1)}% poupado
          </p>
        </NeonCard>

        <NeonCard glowColor="gold" className="text-center">
          <Shield className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400 uppercase mb-1">Patrimônio</p>
          <p className="text-2xl font-black text-yellow-400 font-mono">
            R$ {balanceData.equity.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-yellow-400/60 mt-1">
            {filteredTransactions.length} batalhas
          </p>
        </NeonCard>
      </div>

      {/* Power Radar */}
      <NeonCard glowColor="purple">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-8 h-8 text-purple-400" />
          <div>
            <h3 className="text-2xl font-black text-white uppercase">Radar de Poder</h3>
            <p className="text-slate-400 text-sm">Seus atributos financeiros</p>
          </div>
          <div className="ml-auto text-center">
            <p className="text-xs text-slate-400 uppercase">Score Geral</p>
            <p className="text-3xl font-black text-purple-400">
              {healthScore.overall.toFixed(0)}
            </p>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Radar 
              name="Poder" 
              dataKey="value" 
              stroke="#a855f7" 
              fill="#a855f7" 
              fillOpacity={0.6}
              strokeWidth={3}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #a855f7', borderRadius: '8px' }}
              formatter={(value) => `${value.toFixed(0)}%`}
            />
          </RadarChart>
        </ResponsiveContainer>

        <div className="mt-6 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-purple-400" />
            <h4 className="text-purple-400 font-bold uppercase text-sm">Como Interpretar</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="flex gap-2">
              <span className="text-cyan-400">•</span>
              <div>
                <strong className="text-cyan-400">Economia:</strong> Sua taxa de poupança atual comparada à meta de 20%
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-green-400">•</span>
              <div>
                <strong className="text-green-400">Eficiência:</strong> Quanto suas receitas superam as despesas (meta: 30%+)
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-orange-400">•</span>
              <div>
                <strong className="text-orange-400">Controle de Dívida:</strong> Quanto menor sua dívida em relação aos ativos, maior o score
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-purple-400">•</span>
              <div>
                <strong className="text-purple-400">Diversificação:</strong> Variedade de ativos no seu portfólio (meta: 5+ ativos)
              </div>
            </div>
          </div>
          <p className="text-slate-400 text-xs mt-3 italic text-center">
            ⭐ Quanto maior a área preenchida, mais forte está seu poder financeiro!
          </p>
        </div>
        </NeonCard>

      {/* Battle Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        {/* Top Enemy Categories */}
        <NeonCard glowColor="red">
          <div className="flex items-center gap-3 mb-6">
            <Skull className="w-8 h-8 text-red-400" />
            <div>
              <h3 className="text-2xl font-black text-white uppercase">Maiores Inimigos</h3>
              <p className="text-slate-400 text-sm">Categorias que mais drenam seu HP</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {categoryBreakdown.slice(0, 5).map((cat, idx) => {
              const percentage = dreData.expenses > 0 ? (cat.expense / dreData.expenses) * 100 : 0;
              const catBudget = budgetCategories.find(c => c.name === cat.name);
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{catBudget?.icon || '💀'}</span>
                      <span className="text-white font-bold">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 font-mono font-bold">R$ {cat.expense.toFixed(0)}</p>
                      <p className="text-xs text-slate-500">{cat.count} golpes</p>
                    </div>
                  </div>
                  <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                    <motion.div
                      className="h-full bg-gradient-to-r from-red-600 to-red-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{percentage.toFixed(1)}% do total</p>
                </motion.div>
              );
            })}
          </div>
        </NeonCard>

        {/* Distribution Pie */}
        <NeonCard glowColor="cyan">
          <div className="flex items-center gap-3 mb-6">
            <PieIcon className="w-8 h-8 text-cyan-400" />
            <div>
              <h3 className="text-2xl font-black text-white uppercase">Distribuição de Dano</h3>
              <p className="text-slate-400 text-sm">Onde sua energia está sendo gasta</p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => percentage >= 5 ? `${percentage.toFixed(0)}%` : ''}
                outerRadius={100}
                dataKey="value"
                animationDuration={1500}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #06b6d4', borderRadius: '8px' }}
                formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Gasto']}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => (
                  <span className="text-xs text-slate-300">{value}</span>
                )}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </NeonCard>
      </div>

      {/* DRE Comparison */}
      <NeonCard glowColor="purple">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-purple-400" />
            <div>
              <h3 className="text-2xl font-black text-white uppercase">Análise de Performance</h3>
              <p className="text-slate-400 text-sm">Receitas vs Despesas por categoria</p>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={categoryBreakdown.slice(0, 8)}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#94a3b8" 
              fontSize={11} 
              angle={-45} 
              textAnchor="end" 
              height={100}
            />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #a855f7', borderRadius: '8px' }}
              formatter={(value) => `R$ ${value.toFixed(2)}`}
            />
            <Legend />
            <Bar dataKey="expense" fill="url(#expenseGrad)" radius={[8, 8, 0, 0]} name="Dano" />
            <Bar dataKey="income" fill="url(#incomeGrad)" radius={[8, 8, 0, 0]} name="Cura" />
          </BarChart>
        </ResponsiveContainer>
      </NeonCard>

      {/* Goals Progress */}
      {goals.length > 0 && (
        <NeonCard glowColor="gold">
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-8 h-8 text-yellow-400" />
            <div>
              <h3 className="text-2xl font-black text-white uppercase">Arsenal em Forja</h3>
              <p className="text-slate-400 text-sm">Progresso das suas metas lendárias</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.slice(0, 6).map((goal, idx) => {
              const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
              const isCompleted = progress >= 100;
              
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-4 rounded-xl border ${
                    isCompleted 
                      ? 'bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.3)]' 
                      : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{goal.icon || '⚔️'}</span>
                      <div>
                        <p className="text-white font-bold">{goal.name}</p>
                        <p className="text-xs text-slate-400">{goal.legendary_item}</p>
                      </div>
                    </div>
                    {isCompleted && <Trophy className="w-6 h-6 text-yellow-400 animate-pulse" />}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Progresso</span>
                      <span className={`font-bold ${isCompleted ? 'text-yellow-400' : 'text-cyan-400'}`}>
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                      <motion.div
                        className={`h-full ${
                          isCompleted 
                            ? 'bg-gradient-to-r from-yellow-500 to-amber-400' 
                            : 'bg-gradient-to-r from-cyan-500 to-purple-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{ duration: 1.5, delay: idx * 0.1 }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>R$ {goal.current_amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                      <span>R$ {goal.target_amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </NeonCard>
      )}

      {/* Balance Sheet - Epic Style */}
      <NeonCard glowColor="purple">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-purple-400" />
          <div>
            <h3 className="text-2xl font-black text-white uppercase">Balanço de Poder</h3>
            <p className="text-slate-400 text-sm">Seu arsenal vs seus inimigos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-6 h-6 text-green-400" />
                <p className="text-green-400 font-bold uppercase text-sm">Guardiões</p>
              </div>
              <p className="text-4xl font-black text-green-400 font-mono mb-1">
                R$ {balanceData.assets.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-400">{(netWorthData?.assets || []).length + accounts.length} ativos</p>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-2 border-red-500/30 rounded-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Skull className="w-6 h-6 text-red-400" />
                <p className="text-red-400 font-bold uppercase text-sm">Inimigos</p>
              </div>
              <p className="text-4xl font-black text-red-400 font-mono mb-1">
                R$ {balanceData.debts.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-400">{(netWorthData?.debts || []).length} ameaças</p>
            </div>
          </div>

          <div className={`p-6 border-2 rounded-2xl text-center relative overflow-hidden ${
            balanceData.equity >= 0 
              ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30' 
              : 'bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30'
          }`}>
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl ${
              balanceData.equity >= 0 ? 'bg-purple-500/10' : 'bg-orange-500/10'
            }`} />
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className={`w-6 h-6 ${balanceData.equity >= 0 ? 'text-purple-400' : 'text-orange-400'}`} />
                <p className={`font-bold uppercase text-sm ${balanceData.equity >= 0 ? 'text-purple-400' : 'text-orange-400'}`}>
                  Tesouro Final
                </p>
              </div>
              <p className={`text-4xl font-black font-mono mb-1 ${
                balanceData.equity >= 0 ? 'text-purple-400' : 'text-orange-400'
              }`}>
                R$ {balanceData.equity.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-400">
                {balanceData.equity >= 0 ? '✨ Patrimônio Positivo' : '⚠️ Patrimônio Negativo'}
              </p>
            </div>
          </div>
        </div>
      </NeonCard>

      {/* Timeline - Recent Battles */}
      <NeonCard glowColor="cyan">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-8 h-8 text-cyan-400" />
          <div>
            <h3 className="text-2xl font-black text-white uppercase">Últimas Batalhas</h3>
            <p className="text-slate-400 text-sm">Histórico recente de combate</p>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {filteredTransactions.slice(0, 15).map((trans, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`p-3 rounded-lg border ${
                trans.type === 'income' 
                  ? 'bg-green-900/10 border-green-500/30 hover:bg-green-900/20' 
                  : 'bg-red-900/10 border-red-500/30 hover:bg-red-900/20'
              } transition-all cursor-pointer group`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <motion.div
                    className={`w-2 h-2 rounded-full ${trans.type === 'income' ? 'bg-green-400' : 'bg-red-400'}`}
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: idx * 0.1 }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate group-hover:text-cyan-400 transition-colors">
                      {trans.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{format(parseISO(trans.date), "dd MMM", { locale: ptBR })}</span>
                      <span>•</span>
                      <span className="truncate">{trans.category}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-3">
                  <p className={`text-lg font-black font-mono ${
                    trans.type === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {trans.type === 'income' ? '+' : '-'}R$ {Math.abs(trans.value).toFixed(0)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </NeonCard>

      {/* Epic Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10"
      >
        <NeonCard glowColor="gold" className="bg-gradient-to-br from-yellow-900/20 via-orange-900/20 to-red-900/20">
          <div className="text-center">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="inline-block mb-4"
            >
              <Rocket className="w-16 h-16 text-yellow-400 mx-auto" />
            </motion.div>
            
            <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 mb-4">
              RESUMO DA SUA JORNADA
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400 uppercase mb-1">Período</p>
                <p className="text-xl font-black text-white">{daysInPeriod} dias</p>
              </div>
              
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <Zap className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400 uppercase mb-1">Batalhas</p>
                <p className="text-xl font-black text-white">{filteredTransactions.length}</p>
              </div>
              
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400 uppercase mb-1">Categoria Top</p>
                <p className="text-sm font-black text-white truncate">{topExpenseCategory?.name || 'N/A'}</p>
              </div>
              
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <Star className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400 uppercase mb-1">Score Geral</p>
                <p className="text-xl font-black text-purple-400">{healthScore.overall.toFixed(0)}</p>
              </div>
            </div>

            <div className="mt-6 p-6 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-cyan-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-6 h-6 text-cyan-400" />
                <p className="text-cyan-400 text-lg uppercase font-black">💬 Relatório do Alto Comando</p>
              </div>

              {/* Resumo dos Números */}
              <div className="space-y-3 mb-6">
                <div className="p-3 bg-slate-800/50 border-l-4 border-cyan-500 rounded">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">📊 Resumo do Período</p>
                  <p className="text-white text-sm leading-relaxed">
                    Em <strong className="text-cyan-400">{daysInPeriod} dias</strong> de batalha, você executou <strong className="text-purple-400">{filteredTransactions.length} operações</strong>.
                    Recuperou <strong className="text-green-400">R$ {dreData.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong> em HP
                    e sofreu <strong className="text-red-400">R$ {dreData.expenses.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong> de dano.
                    {dreData.result >= 0 
                      ? ` Resultado: vitória de R$ ${dreData.result.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} (${savingsRate.toFixed(0)}% de eficiência)! 🏆`
                      : ` Déficit de R$ ${Math.abs(dreData.result).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} - ajuste necessário! ⚔️`
                    }
                  </p>
                </div>

                {/* Pontos Críticos */}
                {(healthScore.overall < 60 || dreData.result < 0 || balanceData.debts > balanceData.assets * 0.3) && (
                  <div className="p-3 bg-orange-500/10 border-l-4 border-orange-500 rounded">
                    <p className="text-xs text-orange-400 uppercase font-bold mb-2">⚠️ Pontos Críticos</p>
                    <ul className="space-y-1 text-white text-sm">
                      {dreData.result < 0 && (
                        <li className="flex gap-2">
                          <span className="text-red-400">•</span>
                          <span>Despesas superaram receitas - priorize reduzir gastos em <strong className="text-red-400">{topExpenseCategory?.name}</strong></span>
                        </li>
                      )}
                      {balanceData.debts > balanceData.assets * 0.3 && (
                        <li className="flex gap-2">
                          <span className="text-orange-400">•</span>
                          <span>Dívidas representam {((balanceData.debts / balanceData.assets) * 100).toFixed(0)}% dos ativos - foque em quitação</span>
                        </li>
                      )}
                      {healthScore.savings < 50 && (
                        <li className="flex gap-2">
                          <span className="text-yellow-400">•</span>
                          <span>Taxa de economia abaixo de 20% - aumente suas reservas</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Próximos Passos Estratégicos */}
                <div className="p-3 bg-green-500/10 border-l-4 border-green-500 rounded">
                  <p className="text-xs text-green-400 uppercase font-bold mb-2">🎯 Próximos Passos para Aumentar o Tesouro</p>
                  <ul className="space-y-2 text-white text-sm">
                    {dreData.result >= 0 ? (
                      <>
                        <li className="flex gap-2">
                          <span className="text-green-400">1.</span>
                          <span><strong className="text-green-400">Investir o excedente:</strong> Use os R$ {dreData.result.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} positivos para criar novos ativos e aumentar patrimônio</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-cyan-400">2.</span>
                          <span><strong className="text-cyan-400">Manter a disciplina:</strong> Sua média diária é R$ {dailyAvgExpense.toFixed(0)} de gasto vs R$ {dailyAvgIncome.toFixed(0)} de renda - continue assim!</span>
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex gap-2">
                          <span className="text-red-400">1.</span>
                          <span><strong className="text-red-400">Reduzir dano em {topExpenseCategory?.name}:</strong> Esta categoria causou R$ {topExpenseCategory?.expense.toFixed(0)} de dano - corte 20% dela</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-orange-400">2.</span>
                          <span><strong className="text-orange-400">Aumentar receitas:</strong> Busque fontes extras de renda para cobrir o déficit de R$ {Math.abs(dreData.result).toFixed(0)}</span>
                        </li>
                      </>
                    )}
                    {balanceData.debts > 0 && (
                      <li className="flex gap-2">
                        <span className="text-purple-400">3.</span>
                        <span><strong className="text-purple-400">Eliminar inimigos:</strong> Foque em quitar dívidas para liberar R$ {balanceData.debts.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} do seu patrimônio</span>
                      </li>
                    )}
                    {(netWorthData?.assets || []).length < 3 && (
                      <li className="flex gap-2">
                        <span className="text-yellow-400">4.</span>
                        <span><strong className="text-yellow-400">Diversificar arsenal:</strong> Crie mais ativos (poupança, investimentos, reserva) para fortalecer defesas</span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Insight Valioso */}
                <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <p className="text-purple-400 text-sm uppercase font-bold">💎 Insight Estratégico</p>
                  </div>
                  <p className="text-white text-sm italic leading-relaxed">
                    {balanceData.equity > 0 && dreData.result > 0 
                      ? `"Você está no caminho certo! Com uma média de R$ ${(dreData.result / daysInPeriod).toFixed(0)}/dia de saldo positivo, em 1 ano você pode adicionar R$ ${((dreData.result / daysInPeriod) * 365).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ao seu patrimônio! 🚀"` 
                      : balanceData.equity > 0 && dreData.result < 0
                      ? `"Seu patrimônio está seguro, mas atenção: o déficit mensal pode consumi-lo. Ajuste gastos para proteger seu tesouro de R$ ${balanceData.equity.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}! 🛡️"`
                      : balanceData.equity < 0
                      ? `"Situação crítica! Patrimônio negativo significa que suas dívidas superam seus ativos. Prioridade máxima: cortar despesas e eliminar dívidas. Cada R$ economizado é uma vitória! ⚔️"`
                      : `"Foque em construir reservas e ativos. Mesmo pequenos passos diários somam grandes conquistas. Comece com R$ ${dailyAvgExpense.toFixed(0)}/dia de economia! 💪"`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </NeonCard>
      </motion.div>
    </div>
  );
}