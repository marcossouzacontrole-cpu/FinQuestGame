import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Snowflake, Mountain, Calculator, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NeonCard from './NeonCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DebtPayoffPlanner() {
  const [method, setMethod] = useState('snowball');
  const [monthlyPayment, setMonthlyPayment] = useState('500');

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch debts
  const { data: debts = [] } = useQuery({
    queryKey: ['userDebts', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.Debt.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser?.email
  });

  const calculatePayoff = () => {
    if (debts.length === 0) return null;

    const payment = parseFloat(monthlyPayment) || 500;
    
    // Sort debts based on method
    let sortedDebts = [...debts];
    if (method === 'snowball') {
      sortedDebts.sort((a, b) => a.outstanding_balance - b.outstanding_balance);
    } else if (method === 'avalanche') {
      sortedDebts.sort((a, b) => b.interest_rate - a.interest_rate);
    }

    let totalInterest = 0;
    let totalMonths = 0;
    const payoffSchedule = [];

    sortedDebts.forEach((debt, index) => {
      let balance = debt.outstanding_balance;
      let monthlyRate = (debt.interest_rate || 0) / 100;
      let months = 0;
      let interestPaid = 0;

      while (balance > 0 && months < 600) {
        const interest = balance * monthlyRate;
        const principal = Math.min(payment - interest, balance);
        
        if (principal <= 0) {
          months = 600;
          break;
        }

        balance -= principal;
        interestPaid += interest;
        months++;
      }

      totalInterest += interestPaid;
      totalMonths = Math.max(totalMonths, months);

      payoffSchedule.push({
        creditor: debt.creditor,
        months,
        interestPaid,
        totalPaid: debt.outstanding_balance + interestPaid,
        priority: index + 1
      });
    });

    return { payoffSchedule, totalInterest, totalMonths };
  };

  const results = calculatePayoff();

  return (
    <NeonCard glowColor="magenta" className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
          <Calculator className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-xl">Planejador de Quitação de Dívidas</h3>
          <p className="text-gray-400 text-sm">Estratégias para se livrar das dívidas mais rápido</p>
        </div>
      </div>

      {debts.length === 0 ? (
        <div className="text-center py-8">
          <TrendingDown className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Nenhuma dívida cadastrada.</p>
          <p className="text-gray-500 text-sm mt-2">Adicione dívidas na aba Patrimônio para usar esta ferramenta.</p>
        </div>
      ) : (
        <>
          {/* Input Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Valor Mensal Disponível (R$)</label>
              <Input
                type="number"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                className="bg-[#0a0a1a] border-cyan-500/30 text-white"
                placeholder="500"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Método de Quitação</label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="bg-[#0a0a1a] border-cyan-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="snowball">
                    <span className="flex items-center gap-2">
                      <Snowflake className="w-4 h-4" /> Bola de Neve (Menor Saldo)
                    </span>
                  </SelectItem>
                  <SelectItem value="avalanche">
                    <span className="flex items-center gap-2">
                      <Mountain className="w-4 h-4" /> Avalanche (Maior Juros)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Method Explanation */}
          <div className="bg-[#0a0a1a]/50 rounded-lg p-4 border border-cyan-500/20">
            {method === 'snowball' ? (
              <div>
                <p className="text-cyan-400 font-semibold mb-2 flex items-center gap-2">
                  <Snowflake className="w-4 h-4" /> Método Bola de Neve
                </p>
                <p className="text-gray-400 text-sm">
                  Paga primeiro as dívidas menores, criando vitórias rápidas e motivação. 
                  Ideal para quem precisa de impulso psicológico.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-magenta-400 font-semibold mb-2 flex items-center gap-2">
                  <Mountain className="w-4 h-4" /> Método Avalanche
                </p>
                <p className="text-gray-400 text-sm">
                  Paga primeiro as dívidas com maiores juros, economizando mais dinheiro no longo prazo. 
                  Mais eficiente financeiramente.
                </p>
              </div>
            )}
          </div>

          {results && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#0a0a1a]/50 rounded-lg p-4 border border-red-500/20">
                  <p className="text-gray-400 text-xs mb-1">Total de Juros</p>
                  <p className="text-xl font-black text-red-400">
                    R$ {results.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-[#0a0a1a]/50 rounded-lg p-4 border border-cyan-500/20">
                  <p className="text-gray-400 text-xs mb-1">Tempo Total</p>
                  <p className="text-xl font-black text-cyan-400">
                    {results.totalMonths} meses
                  </p>
                </div>
                <div className="bg-[#0a0a1a]/50 rounded-lg p-4 border border-green-500/20">
                  <p className="text-gray-400 text-xs mb-1">Pagamento Mensal</p>
                  <p className="text-xl font-black text-green-400">
                    R$ {parseFloat(monthlyPayment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Payoff Schedule Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results.payoffSchedule}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="creditor" stroke="#888" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#888" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #FF00FF' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                    <Legend />
                    <Bar dataKey="interestPaid" fill="#EF4444" name="Juros Pagos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed Schedule */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-gray-400 text-sm">Prioridade</th>
                      <th className="py-2 text-gray-400 text-sm">Credor</th>
                      <th className="py-2 text-gray-400 text-sm text-right">Meses</th>
                      <th className="py-2 text-gray-400 text-sm text-right">Juros</th>
                      <th className="py-2 text-gray-400 text-sm text-right">Total Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.payoffSchedule.map((item, index) => (
                      <tr key={index} className="border-b border-gray-800">
                        <td className="py-3 text-cyan-400 font-bold">{item.priority}º</td>
                        <td className="py-3 text-white">{item.creditor}</td>
                        <td className="py-3 text-white text-right">{item.months}</td>
                        <td className="py-3 text-red-400 text-right">
                          R$ {item.interestPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-white font-bold text-right">
                          R$ {item.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </NeonCard>
  );
}