import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Radar, AlertTriangle } from 'lucide-react';
import NeonCard from './NeonCard';
import { motion } from 'framer-motion';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CashFlowRadar({ currentBalance, projectionData, alerts }) {
  // Generate 30-day projection
  const generateProjection = () => {
    const data = [];
    let balance = currentBalance;
    
    for (let i = 0; i <= 30; i++) {
      const date = addDays(new Date(), i);
      const dayOfMonth = date.getDate();
      
      // Simulate fixed expenses
      const hasFixedExpense = projectionData.fixedExpenses.some(exp => exp.day === dayOfMonth);
      if (hasFixedExpense) {
        const expense = projectionData.fixedExpenses.find(exp => exp.day === dayOfMonth);
        balance -= expense.amount;
      }
      
      // Simulate average daily spending
      balance -= projectionData.averageDailySpending || 0;
      
      // Simulate expected income
      const hasIncome = projectionData.expectedIncome.some(inc => inc.day === dayOfMonth);
      if (hasIncome) {
        const income = projectionData.expectedIncome.find(inc => inc.day === dayOfMonth);
        balance += income.amount;
      }
      
      data.push({
        day: i,
        date: format(date, 'dd/MM', { locale: ptBR }),
        balance: balance,
        threshold: 0
      });
    }
    
    return data;
  };

  const projection = generateProjection();
  const criticalDays = projection.filter(d => d.balance < 0);
  const hasCriticalAlert = criticalDays.length > 0;

  return (
    <NeonCard glowColor={hasCriticalAlert ? "gold" : "cyan"}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <Radar className="w-6 h-6 text-cyan-400" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-black text-white">RADAR TÁTICO</h2>
            <p className="text-gray-400 text-sm">Projeção de Fluxo de Caixa - 30 Dias</p>
          </div>
        </div>

        {hasCriticalAlert && (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="flex items-center gap-2 bg-red-500/20 border border-red-500 rounded-lg px-3 py-2"
          >
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-bold text-sm">EMBOSCADA DETECTADA</span>
          </motion.div>
        )}
      </div>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((alert, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-red-900/30 border border-red-500 rounded-lg p-3"
            >
              <p className="text-red-400 font-bold text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {alert.message}
              </p>
              <p className="text-gray-400 text-xs mt-1">{alert.action}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-[#0a0a1a]/60 rounded-xl p-4 border border-cyan-500/30">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={projection}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#666"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0a0a1a',
                border: '1px solid #00FFFF',
                borderRadius: '8px',
                color: '#fff'
              }}
              formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Saldo']}
            />
            <ReferenceLine y={0} stroke="#FF0000" strokeDasharray="3 3" label="Perigo" />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#00FFFF"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: '#00FFFF' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-[#0a0a1a]/60 rounded-lg p-3 border border-cyan-500/30">
          <p className="text-gray-400 text-xs mb-1">Saldo Atual</p>
          <p className="text-cyan-400 font-bold">R$ {currentBalance.toFixed(2)}</p>
        </div>
        <div className="bg-[#0a0a1a]/60 rounded-lg p-3 border border-purple-500/30">
          <p className="text-gray-400 text-xs mb-1">Projeção 30d</p>
          <p className={`font-bold ${projection[30].balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            R$ {projection[30].balance.toFixed(2)}
          </p>
        </div>
        <div className="bg-[#0a0a1a]/60 rounded-lg p-3 border border-yellow-500/30">
          <p className="text-gray-400 text-xs mb-1">Dias Críticos</p>
          <p className="text-yellow-400 font-bold">{criticalDays.length}</p>
        </div>
      </div>
    </NeonCard>
  );
}