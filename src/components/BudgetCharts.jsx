import { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import NeonCard from './NeonCard';
import { Calendar, TrendingUp, PieChart as PieIcon } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { groupSmallValues } from './utils';

export default function BudgetCharts({ categories }) {
  // Consolidar todas as despesas em um único array
  const allExpenses = useMemo(() => {
    return categories.flatMap(cat => 
      cat.expenses.map(exp => ({
        ...exp,
        categoryName: cat.name,
        color: cat.color
      }))
    ).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [categories]);

  // 1. Gráfico de Gastos Diários (Linha do Tempo - Últimos 30 dias)
  const dailyData = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const days = eachDayOfInterval({
      start: thirtyDaysAgo,
      end: today
    });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayExpenses = allExpenses.filter(e => e.date === dateStr);
      const total = dayExpenses.reduce((acc, curr) => acc + curr.value, 0);
      return {
        date: format(day, 'dd/MM'),
        total: total,
        fullDate: dateStr
      };
    });
  }, [allExpenses]);

  // 2. Gráfico de Gastos Mensais (Barras - Últimos 6 meses)
  const monthlyData = useMemo(() => {
    const today = new Date();
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(today, i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthStr = format(date, 'MMM/yy', { locale: ptBR });
      
      const total = allExpenses
        .filter(e => {
          const eDate = parseISO(e.date);
          return eDate >= monthStart && eDate <= monthEnd;
        })
        .reduce((acc, curr) => acc + curr.value, 0);

      data.push({ name: monthStr, total });
    }
    return data;
  }, [allExpenses]);

  // 3. Gráfico por Categoria (Pizza) - Com agrupamento de valores pequenos
  const categoryData = useMemo(() => {
    const rawData = categories.map(cat => ({
      name: cat.name,
      value: cat.expenses.reduce((acc, curr) => acc + curr.value, 0),
      color: cat.color
    })).filter(item => item.value > 0);
    
    // Agrupa as menores categorias em "Outros" (Top 4 + Outros)
    return groupSmallValues(rawData, 4, "Outros", "#334155");
  }, [categories]);

  if (allExpenses.length === 0) return null;

  return (
    <div className="space-y-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-4">
        <TrendingUp className="w-6 h-6 text-cyan-400" />
        Análise de Gastos Temporal
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos Diários */}
        <NeonCard glowColor="cyan" className="h-[400px] flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Fluxo Diário (Últimos 30 dias)
          </h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" tick={{fontSize: 12}} />
                <YAxis stroke="#888" tick={{fontSize: 12}} tickFormatter={(value) => `R$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f0f1e', borderColor: '#00FFFF', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Gasto']}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#00FFFF" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#00FFFF' }}
                  activeDot={{ r: 6, fill: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </NeonCard>

        {/* Gastos Mensais */}
        <NeonCard glowColor="magenta" className="h-[400px] flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Histórico Mensal
          </h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#888" tick={{fontSize: 12}} />
                <YAxis stroke="#888" tick={{fontSize: 12}} tickFormatter={(value) => `R$${value}`} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#0f0f1e', borderColor: '#FF00FF', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Total']}
                />
                <Bar dataKey="total" fill="#FF00FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </NeonCard>

        {/* Distribuição por Categoria */}
        <NeonCard glowColor="cyan" className="h-[400px] flex flex-col lg:col-span-2">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-cyan-400" />
            Distribuição por Categoria
          </h3>
          <div className="flex flex-col md:flex-row items-center h-full">
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || entry.color} stroke="rgba(0,0,0,0.5)" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f0f1e', borderColor: '#06b6d4', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Total']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4 p-4">
                {categoryData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <div>
                            <p className="text-white text-sm font-bold">{entry.name}</p>
                            <p className="text-gray-400 text-xs">R$ {entry.value.toFixed(2)}</p>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </NeonCard>
      </div>
    </div>
  );
}