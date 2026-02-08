import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Filter, Calendar, 
  PieChart as PieIcon, BarChart3, Target, Search, X, DollarSign
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { format, subDays, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import { groupSmallValues } from './utils';

const COLORS = ['#00FFFF', '#FF00FF', '#39FF14', '#FFD700', '#FF1493', '#00CED1', '#FF6347', '#9370DB'];

const NeonCard = ({ children, glowColor = 'cyan', className = '' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/80',
    purple: 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-slate-900/80',
    green: 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-slate-900/80',
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden ${colors[glowColor] || colors.cyan} ${className}`}>
      {children}
    </div>
  );
};

export default function ReportsSection() {
  const [periodDays, setPeriodDays] = useState(30);
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [transactionType, setTransactionType] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch data
  const { data: finTransactions = [] } = useQuery({
    queryKey: ['finTransactions'],
    queryFn: () => base44.entities.FinTransaction.list('-created_date')
  });

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    // CORREÇÃO: Usar startOfDay e endOfDay para incluir todo o intervalo
    const startDate = startOfDay(subDays(new Date(), periodDays));
    const endDate = endOfDay(new Date());

    // Normalizar texto para busca (sem acentos e lowercase)
    const normalizeText = (text) => {
      return text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    };

    const searchNormalized = normalizeText(searchText);

    return finTransactions.filter(t => {
      const transDate = parseISO(t.date);
      const isInPeriod = isWithinInterval(transDate, { start: startDate, end: endDate });
      const accountMatch = selectedAccountId === 'all' || t.account_id === selectedAccountId;
      const typeMatch = transactionType === 'all' || t.type === transactionType;

      // Filtro de busca por texto
      const textMatch = !searchText || 
        normalizeText(t.description || '').includes(searchNormalized) ||
        normalizeText(t.category || '').includes(searchNormalized);

      // Filtro de faixa de valor (usa valor absoluto)
      const absValue = Math.abs(t.value);
      const minMatch = !minValue || absValue >= parseFloat(minValue);
      const maxMatch = !maxValue || absValue <= parseFloat(maxValue);

      // Excluir transferências internas (Fatos Permutativos) do DRE
      const isInternalTransfer = 
        t.category === 'Resgate Cofre' || 
        t.category === 'Aplicação Cofre' ||
        t.category?.toLowerCase().includes('resgate') ||
        t.category?.toLowerCase().includes('transferência') ||
        t.category?.toLowerCase().includes('transferencia');

      return isInPeriod && accountMatch && typeMatch && textMatch && minMatch && maxMatch && !isInternalTransfer;
    });
  }, [finTransactions, periodDays, selectedAccountId, transactionType, searchText, minValue, maxValue]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const byCategory = {};
    let totalExpenses = 0;
    let totalIncome = 0;

    filteredTransactions.forEach(t => {
      const category = t.category || 'Sem Categoria';
      const value = Math.abs(t.value);
      
      if (!byCategory[category]) {
        byCategory[category] = { 
          name: category, 
          expenses: 0, 
          income: 0, 
          count: 0,
          transactions: []
        };
      }
      
      if (t.type === 'expense') {
        byCategory[category].expenses += value;
        totalExpenses += value;
      } else {
        byCategory[category].income += value;
        totalIncome += value;
      }
      
      byCategory[category].count++;
      byCategory[category].transactions.push(t);
    });

    const categoryArray = Object.values(byCategory).sort((a, b) => b.expenses - a.expenses);
    
    return {
      byCategory: categoryArray,
      totalExpenses,
      totalIncome,
      netResult: totalIncome - totalExpenses,
      topCategory: categoryArray[0] || null
    };
  }, [filteredTransactions]);

  // Prepare chart data com agrupamento
  const pieData = useMemo(() => {
    const rawPieData = analytics.byCategory
      .filter(c => c.expenses > 0)
      .map(c => ({
        name: c.name,
        value: c.expenses
      }));
    
    // Agrupa as menores categorias em "Outros" (Top 5 + Outros)
    return groupSmallValues(rawPieData, 5, "Outros", "#334155");
  }, [analytics.byCategory]);

  const barData = analytics.byCategory.slice(0, 10).map(c => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
    Despesas: c.expenses,
    Receitas: c.income
  }));

  // Export to PDF
  const exportToPDF = () => {
    setIsExporting(true);
    
    setTimeout(() => {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(0, 255, 255);
      doc.text('RELATORIO DE BATALHA', 20, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Periodo: Ultimos ${periodDays} dias`, 20, 28);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 20, 33);
      
      // Summary
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Resumo Executivo', 20, 45);
      
      doc.setFontSize(11);
      doc.text(`Receitas: R$ ${analytics.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 25, 53);
      doc.text(`Despesas: R$ ${analytics.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 25, 60);
      doc.text(`Resultado: R$ ${analytics.netResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 25, 67);
      
      // Categories
      doc.setFontSize(12);
      doc.text('Categorias:', 20, 80);
      
      let yPos = 90;
      doc.setFontSize(9);
      analytics.byCategory.slice(0, 20).forEach((c, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${idx + 1}. ${c.name}`, 25, yPos);
        doc.text(`R$ ${c.expenses.toFixed(2)}`, 120, yPos);
        doc.text(`(${c.count} trans.)`, 160, yPos);
        yPos += 7;
      });
      
      doc.save(`relatorio-${periodDays}d-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      setIsExporting(false);
    }, 500);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Categoria', 'Despesas', 'Receitas', 'Transações'];
    const rows = analytics.byCategory.map(c => [
      c.name,
      c.expenses.toFixed(2),
      c.income.toFixed(2),
      c.count
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${periodDays}d-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <FileText className="w-8 h-8 text-cyan-400" />
          </motion.div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-magenta-400 uppercase tracking-wider">
            RELATÓRIOS DE BATALHA
          </h2>
        </div>
        <p className="text-slate-400 text-sm uppercase tracking-widest">
          Análise Estratégica e Inteligência de Combate
        </p>
      </motion.div>

      {/* Filters */}
      <NeonCard glowColor="cyan">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-cyan-400" />
            <h3 className="text-white font-bold uppercase tracking-wider">Filtros Táticos</h3>
          </div>
          {(searchText || minValue || maxValue) && (
            <button
              onClick={() => {
                setSearchText('');
                setMinValue('');
                setMaxValue('');
              }}
              className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all text-xs font-bold"
            >
              <X className="w-3 h-3" />
              Limpar Filtros
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          {/* Linha 1: Filtros principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Período</label>
              <Select value={periodDays.toString()} onValueChange={(val) => setPeriodDays(parseInt(val))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-slate-900 border-slate-700">
                  <SelectItem value="30" className="text-white hover:bg-slate-800">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Últimos 30 dias
                  </SelectItem>
                  <SelectItem value="90" className="text-white hover:bg-slate-800">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Últimos 90 dias
                  </SelectItem>
                  <SelectItem value="180" className="text-white hover:bg-slate-800">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Últimos 180 dias
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Conta</label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-slate-900 border-slate-700">
                  <SelectItem value="all" className="text-white hover:bg-slate-800">
                    Todas as Contas
                  </SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id} className="text-white hover:bg-slate-800">
                      {acc.icon || '💰'} {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Tipo</label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-slate-900 border-slate-700">
                  <SelectItem value="all" className="text-white hover:bg-slate-800">
                    Todos os Tipos
                  </SelectItem>
                  <SelectItem value="expense" className="text-white hover:bg-slate-800">
                    💀 Despesas
                  </SelectItem>
                  <SelectItem value="income" className="text-white hover:bg-slate-800">
                    💰 Receitas
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 2: Busca por texto */}
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Buscar Histórico</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Ex: Uber, Mercado, Netflix..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:border-cyan-500 focus:outline-none transition-colors placeholder:text-slate-500"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Linha 3: Faixa de valor */}
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Faixa de Valor</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="number"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                  placeholder="Mínimo"
                  step="0.01"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:border-green-500 focus:outline-none transition-colors placeholder:text-slate-500"
                />
              </div>
              <span className="text-slate-600 font-bold">até</span>
              <div className="flex-1 relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="number"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  placeholder="Máximo"
                  step="0.01"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:border-red-500 focus:outline-none transition-colors placeholder:text-slate-500"
                />
              </div>
            </div>
            
            {/* Atalhos de Valor */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setMinValue(''); setMaxValue('10'); }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg text-xs font-bold transition-all"
              >
                &lt; R$ 10
              </button>
              <button
                onClick={() => { setMinValue('10'); setMaxValue('100'); }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg text-xs font-bold transition-all"
              >
                R$ 10-100
              </button>
              <button
                onClick={() => { setMinValue('100'); setMaxValue('500'); }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg text-xs font-bold transition-all"
              >
                R$ 100-500
              </button>
              <button
                onClick={() => { setMinValue('500'); setMaxValue(''); }}
                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg text-xs font-bold transition-all"
              >
                &gt; R$ 500 💥
              </button>
            </div>
          </div>
        </div>
      </NeonCard>

      {/* Feedback de Resultados Filtrados */}
      {(searchText || minValue || maxValue) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 flex items-center gap-3"
        >
          <Target className="w-5 h-5 text-cyan-400" />
          <div className="flex-1">
            <p className="text-white font-bold text-sm">
              {filteredTransactions.length} transação(ões) encontrada(s)
            </p>
            <p className="text-slate-400 text-xs">
              {searchText && `Busca: "${searchText}"`}
              {(minValue || maxValue) && ` • Valores: ${minValue ? `R$ ${minValue}` : '∞'} até ${maxValue ? `R$ ${maxValue}` : '∞'}`}
            </p>
          </div>
          <button
            onClick={() => {
              setSearchText('');
              setMinValue('');
              setMaxValue('');
            }}
            className="px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all text-xs font-bold"
          >
            Limpar
          </button>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <NeonCard glowColor="green" className="text-center">
          <div className="text-3xl mb-2">💰</div>
          <p className="text-2xl font-black text-green-400 font-mono">
            R$ {analytics.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-slate-400 text-xs uppercase font-bold mt-1">Loot Total</p>
        </NeonCard>

        <NeonCard glowColor="cyan" className="text-center">
          <div className="text-3xl mb-2">💀</div>
          <p className="text-2xl font-black text-red-400 font-mono">
            R$ {analytics.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-slate-400 text-xs uppercase font-bold mt-1">Dano Total</p>
        </NeonCard>

        <NeonCard glowColor="purple" className="text-center">
          <div className="text-3xl mb-2">⚖️</div>
          <p className={`text-2xl font-black font-mono ${analytics.netResult >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
            R$ {analytics.netResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-slate-400 text-xs uppercase font-bold mt-1">Resultado</p>
        </NeonCard>

        <NeonCard glowColor="cyan" className="text-center">
          <div className="text-3xl mb-2">🎯</div>
          <p className="text-lg font-bold text-white">
            {analytics.topCategory?.name || 'N/A'}
          </p>
          <p className="text-slate-400 text-xs uppercase font-bold mt-1">Maior Gasto</p>
        </NeonCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <NeonCard glowColor="cyan">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-white font-bold uppercase">Top 10 Categorias</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="name" 
                stroke="#888" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fontSize: 11 }}
              />
              <YAxis stroke="#888" tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #00FFFF', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Legend />
              <Bar dataKey="Despesas" fill="#FF00FF" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Receitas" fill="#00FFFF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </NeonCard>

        {/* Pie Chart */}
        <NeonCard glowColor="purple">
          <div className="flex items-center gap-3 mb-4">
            <PieIcon className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-bold uppercase">Distribuição de Despesas</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #8A2BE2', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </NeonCard>
      </div>

      {/* Detailed Table */}
      <NeonCard glowColor="cyan">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-cyan-400" />
            <h3 className="text-white font-bold uppercase">Análise Detalhada por Categoria</h3>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportToPDF}
              disabled={isExporting}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Gerando...' : 'PDF'}
            </Button>
            <Button
              onClick={exportToCSV}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-cyan-500/30">
                <th className="pb-3 text-cyan-400 font-bold text-sm">Categoria</th>
                <th className="pb-3 text-cyan-400 font-bold text-sm text-right">Despesas</th>
                <th className="pb-3 text-cyan-400 font-bold text-sm text-right">Receitas</th>
                <th className="pb-3 text-cyan-400 font-bold text-sm text-right">Transações</th>
                <th className="pb-3 text-cyan-400 font-bold text-sm text-right">% do Total</th>
              </tr>
            </thead>
            <tbody>
              {analytics.byCategory.map((category, idx) => {
                const percentOfTotal = analytics.totalExpenses > 0 
                  ? (category.expenses / analytics.totalExpenses) * 100 
                  : 0;
                
                return (
                  <motion.tr
                    key={category.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-slate-700 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 text-white font-semibold">{category.name}</td>
                    <td className="py-3 text-right text-red-400 font-mono">
                      R$ {category.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right text-green-400 font-mono">
                      R$ {category.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right text-slate-300">{category.count}</td>
                    <td className="py-3 text-right">
                      <Badge className="bg-cyan-500/20 text-cyan-400">
                        {percentOfTotal.toFixed(1)}%
                      </Badge>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </NeonCard>
    </div>
  );
}