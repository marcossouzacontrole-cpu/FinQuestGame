import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Download, BarChart3, PieChart as PieIcon, Activity } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const COLORS = ['#00FFFF', '#FF00FF', '#39FF14', '#FFD700', '#FF1493', '#00CED1', '#FF6347', '#9370DB'];

const NeonCard = ({ children, glowColor = 'cyan', className = '' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    purple: 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    green: 'border-green-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 bg-slate-900/80 ${colors[glowColor]} ${className}`}>
      {children}
    </div>
  );
};

export default function DREComparative({ transactions, categories }) {
  const [comparisonType, setComparisonType] = useState('month'); // 'month' ou 'year'
  const [chartType, setChartType] = useState('bar'); // 'bar', 'pie', 'line'

  // Calcular DRE para dois períodos
  const dreComparison = useMemo(() => {
    const now = new Date();
    let currentStart, currentEnd, previousStart, previousEnd;

    if (comparisonType === 'month') {
      currentStart = startOfMonth(now);
      currentEnd = endOfMonth(now);
      previousStart = startOfMonth(subMonths(now, 1));
      previousEnd = endOfMonth(subMonths(now, 1));
    } else {
      currentStart = startOfYear(now);
      currentEnd = endOfYear(now);
      previousStart = startOfYear(subYears(now, 1));
      previousEnd = endOfYear(subYears(now, 1));
    }

    const filterTransactions = (start, end) => {
      return transactions.filter(t => {
        if (!t.date) return false;
        const transDate = parseISO(t.date);
        return isWithinInterval(transDate, { start, end }) &&
          !['Resgate Cofre', 'Aplicação Cofre'].includes(t.category);
      });
    };

    const currentTrans = filterTransactions(currentStart, currentEnd);
    const previousTrans = filterTransactions(previousStart, previousEnd);

    const calculateDRE = (trans) => {
      const revenue = trans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.value, 0);
      const expenses = trans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.value, 0);
      
      const byCategory = {};
      trans.forEach(t => {
        const cat = t.category || 'Sem Categoria';
        if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0 };
        if (t.type === 'income') byCategory[cat].income += t.value;
        else byCategory[cat].expense += t.value;
      });

      return { revenue, expenses, result: revenue - expenses, byCategory };
    };

    const current = calculateDRE(currentTrans);
    const previous = calculateDRE(previousTrans);

    // Calcular variações
    const revenueChange = previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0;
    const expenseChange = previous.expenses > 0 ? ((current.expenses - previous.expenses) / previous.expenses) * 100 : 0;
    const resultChange = previous.result !== 0 ? ((current.result - previous.result) / Math.abs(previous.result)) * 100 : 0;

    return {
      current,
      previous,
      currentPeriod: format(currentStart, 'MMM/yyyy', { locale: ptBR }),
      previousPeriod: format(previousStart, 'MMM/yyyy', { locale: ptBR }),
      revenueChange,
      expenseChange,
      resultChange
    };
  }, [transactions, comparisonType]);

  // Dados para gráfico de barras comparativo
  const barChartData = useMemo(() => {
    return [
      {
        period: dreComparison.previousPeriod,
        Receitas: dreComparison.previous.revenue,
        Despesas: dreComparison.previous.expenses,
        Resultado: dreComparison.previous.result
      },
      {
        period: dreComparison.currentPeriod,
        Receitas: dreComparison.current.revenue,
        Despesas: dreComparison.current.expenses,
        Resultado: dreComparison.current.result
      }
    ];
  }, [dreComparison]);

  // Dados para gráfico de pizza (período atual)
  const pieChartData = useMemo(() => {
    const categoryData = Object.entries(dreComparison.current.byCategory)
      .filter(([_, data]) => data.expense > 0)
      .sort((a, b) => b[1].expense - a[1].expense)
      .slice(0, 8)
      .map(([name, data]) => ({ name, value: data.expense }));
    
    return categoryData;
  }, [dreComparison]);

  // Dados para linha temporal (últimos 12 meses)
  const lineChartData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const monthTrans = transactions.filter(t => {
        if (!t.date) return false;
        const transDate = parseISO(t.date);
        return isWithinInterval(transDate, { start, end }) &&
          !['Resgate Cofre', 'Aplicação Cofre'].includes(t.category);
      });

      const revenue = monthTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.value, 0);
      const expenses = monthTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.value, 0);

      months.push({
        month: format(date, 'MMM/yy', { locale: ptBR }),
        monthFull: format(date, 'MMMM yyyy', { locale: ptBR }),
        Receitas: revenue,
        Despesas: expenses,
        Resultado: revenue - expenses
      });
    }
    return months;
  }, [transactions]);

  const exportComparativePDF = () => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.setTextColor(0, 255, 255);
    doc.text('ANÁLISE COMPARATIVA DRE', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Comparação: ${dreComparison.previousPeriod} vs ${dreComparison.currentPeriod}`, 20, y);
    y += 15;

    // Tabela comparativa
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('RESUMO COMPARATIVO', 20, y);
    y += 10;

    const data = [
      ['Item', dreComparison.previousPeriod, dreComparison.currentPeriod, 'Variação'],
      ['Receitas', `R$ ${dreComparison.previous.revenue.toFixed(2)}`, `R$ ${dreComparison.current.revenue.toFixed(2)}`, `${dreComparison.revenueChange.toFixed(1)}%`],
      ['Despesas', `R$ ${dreComparison.previous.expenses.toFixed(2)}`, `R$ ${dreComparison.current.expenses.toFixed(2)}`, `${dreComparison.expenseChange.toFixed(1)}%`],
      ['Resultado', `R$ ${dreComparison.previous.result.toFixed(2)}`, `R$ ${dreComparison.current.result.toFixed(2)}`, `${dreComparison.resultChange.toFixed(1)}%`]
    ];

    doc.setFontSize(9);
    data.forEach((row, idx) => {
      const x = 20;
      doc.text(row[0], x, y);
      doc.text(row[1], x + 50, y);
      doc.text(row[2], x + 100, y);
      doc.text(row[3], x + 150, y);
      y += 7;
      if (idx === 0) y += 3;
    });

    doc.save(`dre-comparativo-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('📄 Relatório comparativo exportado!');
  };

  const exportComparativeCSV = () => {
    let csv = 'ANÁLISE COMPARATIVA DRE\n';
    csv += `Comparação:,${dreComparison.previousPeriod},vs,${dreComparison.currentPeriod}\n\n`;
    csv += 'Item,Período Anterior,Período Atual,Variação %\n';
    csv += `Receitas,${dreComparison.previous.revenue.toFixed(2)},${dreComparison.current.revenue.toFixed(2)},${dreComparison.revenueChange.toFixed(1)}\n`;
    csv += `Despesas,${dreComparison.previous.expenses.toFixed(2)},${dreComparison.current.expenses.toFixed(2)},${dreComparison.expenseChange.toFixed(1)}\n`;
    csv += `Resultado,${dreComparison.previous.result.toFixed(2)},${dreComparison.current.result.toFixed(2)},${dreComparison.resultChange.toFixed(1)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dre-comparativo-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('📊 CSV exportado!');
  };

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setComparisonType('month')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              comparisonType === 'month'
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setComparisonType('year')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              comparisonType === 'year'
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Anual
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setChartType('bar')} className={`p-2 rounded-lg ${chartType === 'bar' ? 'bg-cyan-500' : 'bg-slate-800'}`}>
            <BarChart3 className="w-5 h-5 text-white" />
          </button>
          <button onClick={() => setChartType('pie')} className={`p-2 rounded-lg ${chartType === 'pie' ? 'bg-cyan-500' : 'bg-slate-800'}`}>
            <PieIcon className="w-5 h-5 text-white" />
          </button>
          <button onClick={() => setChartType('line')} className={`p-2 rounded-lg ${chartType === 'line' ? 'bg-cyan-500' : 'bg-slate-800'}`}>
            <Activity className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportComparativePDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={exportComparativeCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Cartões Comparativos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NeonCard glowColor="green">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm uppercase">Receitas</span>
            <TrendingUp className={`w-5 h-5 ${dreComparison.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`} />
          </div>
          <div className="text-3xl font-black text-green-400 mb-2">
            R$ {dreComparison.current.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">{dreComparison.previousPeriod}:</span>
            <span className="text-slate-400">R$ {dreComparison.previous.revenue.toFixed(2)}</span>
          </div>
          <div className={`text-sm font-bold mt-1 ${dreComparison.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {dreComparison.revenueChange >= 0 ? '+' : ''}{dreComparison.revenueChange.toFixed(1)}%
          </div>
        </NeonCard>

        <NeonCard glowColor="purple">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm uppercase">Despesas</span>
            <TrendingDown className={`w-5 h-5 ${dreComparison.expenseChange <= 0 ? 'text-green-400' : 'text-red-400'}`} />
          </div>
          <div className="text-3xl font-black text-red-400 mb-2">
            R$ {dreComparison.current.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">{dreComparison.previousPeriod}:</span>
            <span className="text-slate-400">R$ {dreComparison.previous.expenses.toFixed(2)}</span>
          </div>
          <div className={`text-sm font-bold mt-1 ${dreComparison.expenseChange <= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {dreComparison.expenseChange >= 0 ? '+' : ''}{dreComparison.expenseChange.toFixed(1)}%
          </div>
        </NeonCard>

        <NeonCard glowColor="cyan">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm uppercase">Resultado</span>
            <Calendar className="w-5 h-5 text-cyan-400" />
          </div>
          <div className={`text-3xl font-black mb-2 ${dreComparison.current.result >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
            {dreComparison.current.result >= 0 ? '+' : ''}R$ {dreComparison.current.result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">{dreComparison.previousPeriod}:</span>
            <span className="text-slate-400">R$ {dreComparison.previous.result.toFixed(2)}</span>
          </div>
          <div className={`text-sm font-bold mt-1 ${dreComparison.resultChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {dreComparison.resultChange >= 0 ? '+' : ''}{dreComparison.resultChange.toFixed(1)}%
          </div>
        </NeonCard>
      </div>

      {/* Gráficos */}
      <NeonCard>
        <h3 className="text-xl font-bold text-white mb-6 uppercase">
          {chartType === 'bar' && 'Comparação em Barras'}
          {chartType === 'pie' && 'Distribuição de Despesas (Atual)'}
          {chartType === 'line' && 'Evolução Mensal (12 meses) - Receitas, Despesas e Resultado'}
        </h3>

        {chartType === 'bar' && (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="period" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #06b6d4', borderRadius: '8px' }}
                formatter={(value) => `R$ ${value.toFixed(2)}`}
              />
              <Legend />
              <Bar dataKey="Receitas" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Despesas" fill="#ef4444" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Resultado" fill="#06b6d4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'pie' && (
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex-1 space-y-2">
              {pieChartData.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[idx] }} />
                    <span className="text-white text-sm">{cat.name}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-sm">R$ {cat.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {chartType === 'line' && (
          <div className="space-y-6">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" angle={-45} textAnchor="end" height={70} />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #06b6d4', borderRadius: '8px' }}
                  formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Line type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="Resultado" stroke="#06b6d4" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>

            {/* Tabela Detalhada Mensal */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-cyan-500/30">
                    <th className="text-left p-3 text-slate-400 uppercase text-xs font-bold">Mês</th>
                    <th className="text-right p-3 text-green-400 uppercase text-xs font-bold">💰 Receitas</th>
                    <th className="text-right p-3 text-red-400 uppercase text-xs font-bold">💀 Despesas</th>
                    <th className="text-right p-3 text-cyan-400 uppercase text-xs font-bold">⚔️ Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {lineChartData.map((month, idx) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3 text-white font-semibold capitalize">{month.monthFull}</td>
                      <td className="p-3 text-right">
                        <span className="text-green-400 font-mono font-bold">
                          R$ {month.Receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-red-400 font-mono font-bold">
                          R$ {month.Despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-mono font-black text-lg ${
                          month.Resultado >= 0 ? 'text-cyan-400' : 'text-orange-400'
                        }`}>
                          {month.Resultado >= 0 ? '+' : ''}R$ {month.Resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-cyan-500/50 bg-slate-800/50">
                    <td className="p-3 text-white font-black uppercase text-sm">TOTAL (12 meses)</td>
                    <td className="p-3 text-right">
                      <span className="text-green-400 font-mono font-black text-lg">
                        R$ {lineChartData.reduce((sum, m) => sum + m.Receitas, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-red-400 font-mono font-black text-lg">
                        R$ {lineChartData.reduce((sum, m) => sum + m.Despesas, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-mono font-black text-xl ${
                        lineChartData.reduce((sum, m) => sum + m.Resultado, 0) >= 0 ? 'text-cyan-400' : 'text-orange-400'
                      }`}>
                        {lineChartData.reduce((sum, m) => sum + m.Resultado, 0) >= 0 ? '+' : ''}R$ {lineChartData.reduce((sum, m) => sum + m.Resultado, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </NeonCard>
    </div>
  );
}