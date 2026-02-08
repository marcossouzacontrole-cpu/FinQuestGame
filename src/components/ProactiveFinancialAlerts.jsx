import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bell, X } from 'lucide-react';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';

export default function ProactiveFinancialAlerts() {
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['proactiveAlerts', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];

      const [budgets, debts, goals, profile] = await Promise.all([
        base44.entities.Budget.filter({ created_by: currentUser.email }),
        base44.entities.Debt.filter({ created_by: currentUser.email }),
        base44.entities.Goal.filter({ created_by: currentUser.email }),
        base44.entities.FinancialProfile.filter({ created_by: currentUser.email })
      ]);

      const alerts = [];

      // Alert: Budget overspending
      const overBudget = budgets.filter(b => b.spent_amount > b.planned_amount);
      if (overBudget.length > 0) {
        const total = overBudget.reduce((sum, b) => sum + (b.spent_amount - b.planned_amount), 0);
        alerts.push({
          id: 'budget_overspend',
          type: 'critical',
          title: '⚠️ Orçamento Ultrapassado',
          message: `${overBudget.length} categorias estão acima do planejado (R$ ${total.toFixed(2)} a mais)`,
          action: 'Revisar Orçamento',
          actionUrl: 'Tools'
        });
      }

      // Alert: High-interest debts
      const highInterest = debts.filter(d => d.interest_rate > 5);
      if (highInterest.length > 0) {
        alerts.push({
          id: 'high_interest_debt',
          type: 'warning',
          title: '🔥 Juros Altos Detectados',
          message: `${highInterest.length} dívidas com juros acima de 5% a.m. estão consumindo seu patrimônio`,
          action: 'Ver Planejador',
          actionUrl: 'Tools'
        });
      }

      // Alert: Stagnant goals (less than 5% progress)
      const stagnant = goals.filter(g => {
        const progress = (g.current_amount / g.target_amount) * 100;
        return progress < 5 && g.status !== 'completed';
      });
      if (stagnant.length > 0) {
        alerts.push({
          id: 'stagnant_goals',
          type: 'info',
          title: '🎯 Metas Estagnadas',
          message: `${stagnant.length} metas precisam de atenção (menos de 5% de progresso)`,
          action: 'Ver Metas',
          actionUrl: 'Vault'
        });
      }

      // Alert: Low savings rate
      if (profile[0] && profile[0].savings_percentage < 10) {
        alerts.push({
          id: 'low_savings',
          type: 'warning',
          title: '💰 Taxa de Poupança Baixa',
          message: `Você está poupando apenas ${profile[0].savings_percentage}% da renda. Tente aumentar para 20%`,
          action: 'Falar com Sr. Coin',
          actionUrl: null
        });
      }

      return alerts;
    },
    enabled: !!currentUser?.email,
    refetchInterval: 60000 // Refresh every minute
  });

  const visibleAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));

  if (visibleAlerts.length === 0) return null;

  const alertConfig = {
    critical: { color: 'from-red-500 to-orange-500', borderColor: 'border-red-500/50' },
    warning: { color: 'from-orange-500 to-yellow-500', borderColor: 'border-orange-500/50' },
    info: { color: 'from-cyan-500 to-blue-500', borderColor: 'border-cyan-500/50' }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-yellow-400 animate-pulse" />
        <h3 className="text-white font-bold">Alertas do Sr. Coin</h3>
      </div>

      {visibleAlerts.map((alert) => {
        const config = alertConfig[alert.type];
        return (
          <NeonCard key={alert.id} glowColor={alert.type === 'critical' ? 'magenta' : 'cyan'} className="relative">
            <button
              onClick={() => setDismissedAlerts([...dismissedAlerts, alert.id])}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}>
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold mb-1">{alert.title}</h4>
                <p className="text-gray-400 text-sm mb-3">{alert.message}</p>
                {alert.actionUrl ? (
                  <a href={`#${alert.actionUrl}`}>
                    <Button size="sm" className={`bg-gradient-to-r ${config.color} text-white text-xs`}>
                      {alert.action}
                    </Button>
                  </a>
                ) : (
                  <p className="text-cyan-400 text-xs cursor-pointer hover:underline">
                    {alert.action}
                  </p>
                )}
              </div>
            </div>
          </NeonCard>
        );
      })}
    </div>
  );
}