import { useState, useMemo } from 'react';
import { TrendingDown, Zap, Target, Calendar, DollarSign, Award } from 'lucide-react';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const STRATEGIES = {
  snowball: {
    name: 'Snowball',
    description: 'Pague a menor dívida primeiro para ganhar momentum',
    icon: '⚡',
    color: 'from-cyan-500 to-blue-500',
    sort: (debts) => debts.sort((a, b) => a.outstanding_balance - b.outstanding_balance)
  },
  avalanche: {
    name: 'Avalanche',
    description: 'Pague a dívida com maior juros primeiro para economizar mais',
    icon: '🏔️',
    color: 'from-purple-500 to-magenta-500',
    sort: (debts) => debts.sort((a, b) => b.interest_rate - a.interest_rate)
  },
  balanced: {
    name: 'Balanceado',
    description: 'Equilíbrio entre economia de juros e vitórias rápidas',
    icon: '⚖️',
    color: 'from-green-500 to-emerald-500',
    sort: (debts) => {
      return debts.sort((a, b) => {
        const scoreA = (a.interest_rate * 0.6) + ((1 / a.outstanding_balance) * 1000 * 0.4);
        const scoreB = (b.interest_rate * 0.6) + ((1 / b.outstanding_balance) * 1000 * 0.4);
        return scoreB - scoreA;
      });
    }
  }
};

export default function DebtStrategySimulator({ debts, onStrategySelect }) {
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('snowball');

  const simulationResults = useMemo(() => {
    if (!monthlyPayment || parseFloat(monthlyPayment) <= 0 || debts.length === 0) {
      return null;
    }

    const payment = parseFloat(monthlyPayment);
    const results = {};

    ['snowball', 'avalanche', 'balanced'].forEach(strategy => {
      const sortedDebts = STRATEGIES[strategy].sort([...debts]);
      let remainingDebts = sortedDebts.map(d => ({
        ...d,
        remaining: d.outstanding_balance,
        totalPaid: 0,
        interestPaid: 0
      }));

      let month = 0;
      let totalInterest = 0;
      const schedule = [];

      while (remainingDebts.some(d => d.remaining > 0) && month < 600) {
        month++;
        let availablePayment = payment;

        // Apply minimum payments
        remainingDebts.forEach(debt => {
          if (debt.remaining > 0) {
            const minPayment = Math.min(50, debt.remaining);
            const interest = (debt.remaining * (debt.interest_rate / 100));
            debt.remaining += interest;
            debt.interestPaid += interest;
            totalInterest += interest;

            const paymentAmount = Math.min(minPayment, availablePayment, debt.remaining);
            debt.remaining -= paymentAmount;
            debt.totalPaid += paymentAmount;
            availablePayment -= paymentAmount;
          }
        });

        // Extra payment to first debt with balance
        const targetDebt = remainingDebts.find(d => d.remaining > 0);
        if (targetDebt && availablePayment > 0) {
          const extraPayment = Math.min(availablePayment, targetDebt.remaining);
          targetDebt.remaining -= extraPayment;
          targetDebt.totalPaid += extraPayment;
        }

        schedule.push({
          month,
          totalRemaining: remainingDebts.reduce((sum, d) => sum + Math.max(0, d.remaining), 0),
          totalInterest: totalInterest
        });
      }

      results[strategy] = {
        months: month,
        totalInterest: totalInterest,
        debts: remainingDebts,
        schedule: schedule.filter((_, i) => i % 3 === 0) // Every 3 months for chart
      };
    });

    return results;
  }, [debts, monthlyPayment]);

  const currentStrategy = STRATEGIES[selectedStrategy];
  const currentResults = simulationResults?.[selectedStrategy];

  // Calculate savings vs other strategies
  const comparisons = useMemo(() => {
    if (!simulationResults) return null;
    
    const strategies = Object.keys(simulationResults);
    const baseStrategy = selectedStrategy;
    const baseResults = simulationResults[baseStrategy];

    return strategies
      .filter(s => s !== baseStrategy)
      .map(s => {
        const results = simulationResults[s];
        return {
          name: STRATEGIES[s].name,
          interestDiff: results.totalInterest - baseResults.totalInterest,
          monthsDiff: results.months - baseResults.months
        };
      });
  }, [simulationResults, selectedStrategy]);

  const handleApplyStrategy = () => {
    if (onStrategySelect && currentResults) {
      onStrategySelect({
        strategy: selectedStrategy,
        monthlyPayment: parseFloat(monthlyPayment),
        projectedMonths: currentResults.months,
        projectedInterest: currentResults.totalInterest,
        debtOrder: STRATEGIES[selectedStrategy].sort([...debts]).map(d => d.id)
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Strategy Selection */}
      <NeonCard glowColor="purple">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-400" />
          Escolha sua Estratégia de Batalha
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Object.entries(STRATEGIES).map(([key, strategy]) => (
            <button
              key={key}
              onClick={() => setSelectedStrategy(key)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedStrategy === key
                  ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(0,255,255,0.3)]'
                  : 'border-gray-700 hover:border-gray-600 bg-[#0a0a1a]'
              }`}
            >
              <div className="text-3xl mb-2">{strategy.icon}</div>
              <h4 className="text-white font-bold mb-1">{strategy.name}</h4>
              <p className="text-gray-400 text-xs">{strategy.description}</p>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">
              Quanto você pode pagar por mês?
            </label>
            <Input
              type="number"
              placeholder="R$ 0,00"
              value={monthlyPayment}
              onChange={(e) => setMonthlyPayment(e.target.value)}
              className="bg-[#0a0a1a] border-cyan-500/30 text-white"
            />
          </div>
        </div>
      </NeonCard>

      {/* Simulation Results */}
      {currentResults && (
        <>
          <NeonCard glowColor="cyan">
            <h3 className="text-xl font-bold text-white mb-4">
              Resultados da Simulação: {currentStrategy.name}
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#0a0a1a] rounded-lg p-4 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-400 text-sm">Tempo Total</span>
                </div>
                <p className="text-2xl font-bold text-white">{currentResults.months} meses</p>
                <p className="text-xs text-gray-500 mt-1">{(currentResults.months / 12).toFixed(1)} anos</p>
              </div>

              <div className="bg-[#0a0a1a] rounded-lg p-4 border border-orange-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-orange-400" />
                  <span className="text-gray-400 text-sm">Juros Totais</span>
                </div>
                <p className="text-2xl font-bold text-orange-400">
                  R$ {currentResults.totalInterest.toFixed(2)}
                </p>
              </div>

              <div className="bg-[#0a0a1a] rounded-lg p-4 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400 text-sm">Total Pago</span>
                </div>
                <p className="text-2xl font-bold text-green-400">
                  R$ {(debts.reduce((sum, d) => sum + d.outstanding_balance, 0) + currentResults.totalInterest).toFixed(2)}
                </p>
              </div>

              <div className="bg-[#0a0a1a] rounded-lg p-4 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-400 text-sm">Primeira Vitória</span>
                </div>
                <p className="text-2xl font-bold text-purple-400">
                  {Math.ceil(STRATEGIES[selectedStrategy].sort([...debts])[0].outstanding_balance / parseFloat(monthlyPayment))} meses
                </p>
              </div>
            </div>

            {/* Comparison with other strategies */}
            {comparisons && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <h4 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Comparação com Outras Estratégias
                </h4>
                {comparisons.map(comp => (
                  <p key={comp.name} className="text-gray-300 text-sm">
                    vs {comp.name}: {comp.interestDiff > 0 ? '💰 Economize' : '⚠️ Pague'}{' '}
                    <span className={comp.interestDiff < 0 ? 'text-green-400' : 'text-red-400'}>
                      R$ {Math.abs(comp.interestDiff).toFixed(2)}
                    </span>
                    {' '}e {comp.monthsDiff > 0 ? 'termine' : 'demore'}{' '}
                    <span className={comp.monthsDiff < 0 ? 'text-green-400' : 'text-red-400'}>
                      {Math.abs(comp.monthsDiff)} meses {comp.monthsDiff < 0 ? 'mais rápido' : 'a mais'}
                    </span>
                  </p>
                ))}
              </div>
            )}

            {/* Progress Chart */}
            <div className="mb-6">
              <h4 className="text-white font-semibold mb-3">Projeção de Pagamento</h4>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={currentResults.schedule}>
                  <defs>
                    <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="interestGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #00ffff50' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="totalRemaining" 
                    stroke="#ef4444" 
                    fillOpacity={1} 
                    fill="url(#debtGradient)"
                    name="Dívida Restante"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalInterest" 
                    stroke="#f97316" 
                    fillOpacity={1} 
                    fill="url(#interestGradient)"
                    name="Juros Acumulados"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Debt Order */}
            <div>
              <h4 className="text-white font-semibold mb-3">Ordem de Ataque (Prioridade)</h4>
              <div className="space-y-2">
                {STRATEGIES[selectedStrategy].sort([...debts]).map((debt, index) => (
                  <div key={debt.id} className="flex items-center gap-3 bg-[#0a0a1a] p-3 rounded-lg border border-cyan-500/20">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-magenta-500 flex items-center justify-center font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{debt.creditor}</p>
                      <p className="text-gray-400 text-sm">
                        R$ {debt.outstanding_balance.toFixed(2)} • {debt.interest_rate}% juros
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-cyan-400 text-sm">
                        ~{Math.ceil(debt.outstanding_balance / parseFloat(monthlyPayment))} meses
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleApplyStrategy}
              className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600 text-white font-bold"
            >
              <Zap className="w-4 h-4 mr-2" />
              Aplicar Estratégia e Rastrear Progresso
            </Button>
          </NeonCard>
        </>
      )}

      {!monthlyPayment && (
        <NeonCard glowColor="cyan">
          <p className="text-gray-400 text-center py-8">
            Digite quanto você pode pagar por mês para simular as estratégias de batalha
          </p>
        </NeonCard>
      )}
    </div>
  );
}