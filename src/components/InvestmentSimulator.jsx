import { useState } from 'react';
import { TrendingUp, DollarSign, Calendar, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NeonCard from './NeonCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const riskProfiles = {
  conservative: { name: 'Conservador', rate: 0.007, color: '#10B981', icon: '🛡️' },
  moderate: { name: 'Moderado', rate: 0.01, color: '#3B82F6', icon: '⚖️' },
  aggressive: { name: 'Arrojado', rate: 0.015, color: '#F59E0B', icon: '🚀' }
};

export default function InvestmentSimulator() {
  const [initialAmount, setInitialAmount] = useState('1000');
  const [monthlyContribution, setMonthlyContribution] = useState('200');
  const [period, setPeriod] = useState('12');
  const [riskProfile, setRiskProfile] = useState('moderate');

  const calculateInvestment = () => {
    const initial = parseFloat(initialAmount) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
    const months = parseInt(period) || 12;
    const monthlyRate = riskProfiles[riskProfile].rate;

    const data = [];
    let balance = initial;

    for (let month = 0; month <= months; month++) {
      data.push({
        month: `Mês ${month}`,
        value: balance,
        contributions: initial + (monthly * month),
        returns: balance - (initial + (monthly * month))
      });

      if (month < months) {
        balance = (balance + monthly) * (1 + monthlyRate);
      }
    }

    return data;
  };

  const simulationData = calculateInvestment();
  const finalBalance = simulationData[simulationData.length - 1];
  const totalContributed = finalBalance.contributions;
  const totalReturns = finalBalance.returns;
  const selectedProfile = riskProfiles[riskProfile];

  return (
    <NeonCard glowColor="cyan" className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-xl">Simulador de Investimentos</h3>
          <p className="text-gray-400 text-sm">Projete seu patrimônio futuro</p>
        </div>
      </div>

      {/* Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-gray-400 text-sm mb-2 block">Valor Inicial (R$)</label>
          <Input
            type="number"
            value={initialAmount}
            onChange={(e) => setInitialAmount(e.target.value)}
            className="bg-[#0a0a1a] border-cyan-500/30 text-white"
            placeholder="1000"
          />
        </div>
        <div>
          <label className="text-gray-400 text-sm mb-2 block">Aporte Mensal (R$)</label>
          <Input
            type="number"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
            className="bg-[#0a0a1a] border-cyan-500/30 text-white"
            placeholder="200"
          />
        </div>
        <div>
          <label className="text-gray-400 text-sm mb-2 block">Período (meses)</label>
          <Input
            type="number"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-[#0a0a1a] border-cyan-500/30 text-white"
            placeholder="12"
          />
        </div>
        <div>
          <label className="text-gray-400 text-sm mb-2 block">Perfil de Risco</label>
          <Select value={riskProfile} onValueChange={setRiskProfile}>
            <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(riskProfiles).map(([key, profile]) => (
                <SelectItem key={key} value={key}>
                  {profile.icon} {profile.name} (~{(profile.rate * 100).toFixed(1)}% a.m.)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#0a0a1a]/50 rounded-lg p-4 border border-cyan-500/20">
          <DollarSign className="w-5 h-5 text-gray-400 mb-2" />
          <p className="text-gray-400 text-xs mb-1">Saldo Final</p>
          <p className="text-xl font-black text-cyan-400">
            R$ {finalBalance.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#0a0a1a]/50 rounded-lg p-4 border border-green-500/20">
          <Zap className="w-5 h-5 text-gray-400 mb-2" />
          <p className="text-gray-400 text-xs mb-1">Rendimento</p>
          <p className="text-xl font-black text-green-400">
            R$ {totalReturns.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#0a0a1a]/50 rounded-lg p-4 border border-magenta-500/20">
          <Calendar className="w-5 h-5 text-gray-400 mb-2" />
          <p className="text-gray-400 text-xs mb-1">Total Investido</p>
          <p className="text-xl font-black text-magenta-400">
            R$ {totalContributed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={simulationData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="month" 
              stroke="#888" 
              tick={{ fontSize: 10 }}
              interval={Math.floor(simulationData.length / 6)}
            />
            <YAxis 
              stroke="#888" 
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #00FFFF' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={selectedProfile.color} 
              strokeWidth={3}
              name="Saldo Total"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="contributions" 
              stroke="#888" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Investido"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <p className="text-yellow-400 text-sm">
          <strong>⚠️ Importante:</strong> Esta é uma simulação educacional. Rentabilidades passadas não garantem resultados futuros. 
          Consulte um profissional para investimentos reais.
        </p>
      </div>
    </NeonCard>
  );
}