import { Calculator } from 'lucide-react';
import InvestmentSimulator from '../components/InvestmentSimulator';
import DebtPayoffPlanner from '../components/DebtPayoffPlanner';
import BudgetTracker from '../components/BudgetTracker';

export default function Tools() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Calculator className="w-10 h-10 text-cyan-400" />
          <h1 className="text-4xl font-black text-white">Ferramentas Financeiras</h1>
        </div>
        <p className="text-cyan-400/80">Planeje seu futuro financeiro com ferramentas inteligentes</p>
      </div>

      {/* Investment Simulator */}
      <InvestmentSimulator />

      {/* Debt Payoff Planner */}
      <DebtPayoffPlanner />

      {/* Budget Tracker */}
      <BudgetTracker />
    </div>
  );
}