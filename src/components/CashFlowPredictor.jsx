import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Settings, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const NeonCard = ({ children, glowColor = 'cyan', className = '' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/80',
    orange: 'border-orange-500/30 shadow-[0_0_20px_rgba(255,165,0,0.15)] bg-slate-900/80',
    purple: 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-slate-900/80',
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden ${colors[glowColor] || colors.cyan} ${className}`}>
      {children}
    </div>
  );
};

export default function CashFlowPredictor() {
  const [alertThreshold, setAlertThreshold] = useState(500);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [tempThreshold, setTempThreshold] = useState(500);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const { data: finTransactions = [] } = useQuery({
    queryKey: ['finTransactions'],
    queryFn: () => base44.entities.FinTransaction.list('-date')
  });

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  // Calcular saldo atual
  const currentBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // Análise histórica dos últimos 90 dias
  const historicalAnalysis = useMemo(() => {
    const now = new Date();
    const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const recentTransactions = finTransactions.filter(t => {
      const transDate = new Date(t.date);
      return transDate >= last90Days;
    });

    const totalIncome = recentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.value), 0);

    const totalExpense = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.value), 0);

    const avgDailyIncome = totalIncome / 90;
    const avgDailyExpense = totalExpense / 90;
    const avgDailyNet = avgDailyIncome - avgDailyExpense;

    return {
      avgDailyIncome,
      avgDailyExpense,
      avgDailyNet,
      totalIncome,
      totalExpense
    };
  }, [finTransactions]);

  // Projeção futura
  const projectionData = useMemo(() => {
    const data = [];
    let projectedBalance = currentBalance;

    // Hoje
    data.push({
      day: 0,
      date: 'Hoje',
      balance: currentBalance,
      label: 'Atual'
    });

    // Projetar próximos 90 dias
    for (let day = 1; day <= 90; day++) {
      projectedBalance += historicalAnalysis.avgDailyNet;

      const milestone = day === 30 || day === 60 || day === 90;
      
      data.push({
        day,
        date: milestone ? `${day}d` : '',
        balance: Math.round(projectedBalance),
        label: milestone ? `${day} dias` : '',
        isMilestone: milestone
      });
    }

    return data;
  }, [currentBalance, historicalAnalysis]);

  // Detectar alertas
  const alerts = useMemo(() => {
    const alertList = [];
    
    const projection30 = projectionData.find(d => d.day === 30);
    const projection60 = projectionData.find(d => d.day === 60);
    const projection90 = projectionData.find(d => d.day === 90);

    if (projection30 && projection30.balance < alertThreshold) {
      alertList.push({
        severity: 'critical',
        message: `Saldo crítico em 30 dias: R$ ${projection30.balance.toFixed(2)}`,
        action: 'Reduza despesas ou aumente receitas imediatamente'
      });
    }

    if (projection60 && projection60.balance < alertThreshold) {
      alertList.push({
        severity: 'warning',
        message: `Saldo baixo em 60 dias: R$ ${projection60.balance.toFixed(2)}`,
        action: 'Planeje medidas preventivas'
      });
    }

    if (projection90 && projection90.balance < alertThreshold) {
      alertList.push({
        severity: 'info',
        message: `Atenção ao saldo em 90 dias: R$ ${projection90.balance.toFixed(2)}`,
        action: 'Monitore o fluxo de caixa'
      });
    }

    return alertList;
  }, [projectionData, alertThreshold]);

  const handleSaveThreshold = () => {
    setAlertThreshold(tempThreshold);
    setIsConfiguring(false);
    toast.success(`✓ Limite de alerta atualizado: R$ ${tempThreshold.toFixed(2)}`);
  };

  return (
    <NeonCard glowColor="purple">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white uppercase tracking-wider">Análise Preditiva</h3>
            <p className="text-xs text-slate-400 uppercase tracking-widest">Projeção de Fluxo de Caixa</p>
          </div>
        </div>

        <Dialog open={isConfiguring} onOpenChange={setIsConfiguring}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-purple-500/50 text-purple-400">
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-purple-500/30">
            <DialogHeader>
              <DialogTitle className="text-white">Configurar Limite de Alerta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">
                  Alerta quando o saldo projetado cair abaixo de:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                  <Input
                    type="number"
                    value={tempThreshold}
                    onChange={(e) => setTempThreshold(parseFloat(e.target.value) || 0)}
                    className="bg-slate-800 border-purple-500/30 text-white pl-10"
                    step="100"
                    min="0"
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveThreshold}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              >
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((alert, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-4 rounded-lg border ${
                alert.severity === 'critical'
                  ? 'bg-red-500/10 border-red-500/50'
                  : alert.severity === 'warning'
                  ? 'bg-orange-500/10 border-orange-500/50'
                  : 'bg-blue-500/10 border-blue-500/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                  alert.severity === 'critical' ? 'text-red-400 animate-pulse' : 'text-orange-400'
                }`} />
                <div className="flex-1">
                  <p className="text-white font-bold text-sm mb-1">{alert.message}</p>
                  <p className="text-slate-400 text-xs">{alert.action}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-green-500/20">
          <p className="text-xs text-slate-400 mb-1">Média Diária (Receitas)</p>
          <p className="text-green-400 font-mono font-bold">
            +R$ {historicalAnalysis.avgDailyIncome.toFixed(2)}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-red-500/20">
          <p className="text-xs text-slate-400 mb-1">Média Diária (Despesas)</p>
          <p className="text-red-400 font-mono font-bold">
            -R$ {historicalAnalysis.avgDailyExpense.toFixed(2)}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/20">
          <p className="text-xs text-slate-400 mb-1">Saldo Líquido (Dia)</p>
          <p className={`font-mono font-bold ${
            historicalAnalysis.avgDailyNet >= 0 ? 'text-cyan-400' : 'text-orange-400'
          }`}>
            {historicalAnalysis.avgDailyNet >= 0 ? '+' : ''}R$ {historicalAnalysis.avgDailyNet.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Gráfico de Projeção */}
      <div className="bg-slate-800/30 rounded-xl p-4 border border-purple-500/20">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={projectionData}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={10}
              tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #a855f7',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
              formatter={(value, name) => [
                `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                'Saldo Projetado'
              ]}
            />
            <ReferenceLine 
              y={alertThreshold} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              label={{ value: `Limite: R$ ${alertThreshold}`, fill: '#ef4444', fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#a855f7"
              strokeWidth={3}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (!payload.isMilestone) return null;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill="#a855f7"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }}
              fill="url(#balanceGradient)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Projeções dos Milestones */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {[30, 60, 90].map(days => {
          const projection = projectionData.find(d => d.day === days);
          const isCritical = projection && projection.balance < alertThreshold;
          
          return (
            <div 
              key={days}
              className={`p-4 rounded-lg border ${
                isCritical 
                  ? 'bg-red-500/10 border-red-500/50' 
                  : 'bg-purple-500/10 border-purple-500/30'
              }`}
            >
              <p className="text-xs text-slate-400 mb-1">{days} dias</p>
              <p className={`text-xl font-black font-mono ${
                isCritical ? 'text-red-400' : 'text-purple-400'
              }`}>
                R$ {projection?.balance.toFixed(2)}
              </p>
              {isCritical && (
                <div className="flex items-center gap-1 mt-2">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] text-red-400 font-bold uppercase">Crítico</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </NeonCard>
  );
}