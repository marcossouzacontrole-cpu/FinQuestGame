import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Sparkles, Activity } from 'lucide-react';
import DefenseModuleCard from '../components/DefenseModuleCard';
import ShieldRepairModal from '../components/ShieldRepairModal';
import { toast } from 'sonner';

export default function ShieldControl() {
  const [repairModal, setRepairModal] = useState(null);
  const queryClient = useQueryClient();

  // Fetch budget categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['budgetCategories'],
    queryFn: () => base44.entities.BudgetCategory.list()
  });

  // Calcular estatísticas dos escudos
  const shieldStats = useMemo(() => {
    const shields = categories.map(cat => {
      const budgeted = cat.budget || 0;
      const spent = (cat.expenses || []).reduce((sum, exp) => sum + exp.value, 0);
      return {
        id: cat.id,
        name: cat.name,
        budgeted,
        spent,
        remaining: budgeted - spent,
        percentage: budgeted > 0 ? (spent / budgeted) * 100 : 0,
        isBreached: spent > budgeted,
        isCritical: spent >= budgeted * 0.9
      };
    });

    const totalBudget = shields.reduce((sum, s) => sum + s.budgeted, 0);
    const totalSpent = shields.reduce((sum, s) => sum + s.spent, 0);
    const breached = shields.filter(s => s.isBreached).length;
    const critical = shields.filter(s => s.isCritical && !s.isBreached).length;

    return {
      shields,
      totalBudget,
      totalSpent,
      totalRemaining: totalBudget - totalSpent,
      overallHealth: totalBudget > 0 ? ((totalBudget - totalSpent) / totalBudget) * 100 : 100,
      breached,
      critical,
      stable: shields.length - breached - critical
    };
  }, [categories]);

  // Mutation para atualizar orçamentos (reparo de escudo)
  const repairMutation = useMutation({
    mutationFn: async ({ fromCategory, toCategory, amount }) => {
      // Atualizar categoria de origem (reduzir orçamento)
      await base44.entities.BudgetCategory.update(fromCategory.id, {
        budget: fromCategory.budgeted - amount
      });

      // Atualizar categoria de destino (aumentar orçamento)
      await base44.entities.BudgetCategory.update(toCategory.id, {
        budget: toCategory.budgeted + amount
      });

      return { fromCategory, toCategory, amount };
    },
    onSuccess: ({ fromCategory, toCategory, amount }) => {
      queryClient.invalidateQueries(['budgetCategories']);
      toast.success(
        `🛡️ Escudo Reparado!\n\n` +
        `Energia transferida: R$ ${amount.toFixed(2)}\n` +
        `De: ${fromCategory.name} → Para: ${toCategory.name}`,
        { duration: 5000 }
      );
    },
    onError: (error) => {
      toast.error('❌ Falha no reparo: ' + error.message);
    }
  });

  const handleRepair = (shield) => {
    setRepairModal(shield);
  };

  const handleReinforce = (shield) => {
    toast.info('🚀 Feature de Reforço em desenvolvimento! Use o importador para adicionar mais fundos.');
  };

  const handleConfirmRepair = (transferData) => {
    repairMutation.mutate(transferData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-32">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-4"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-cyan-400 animate-pulse" />
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
            CONTROLE DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">ESCUDOS</span>
          </h1>
        </div>
        <p className="text-slate-400 text-sm uppercase tracking-widest">Sistema de Gestão de Recursos Táticos</p>
      </motion.div>

      {/* Integridade da Nave (Overall Status) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(6,182,212,0.2)]"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase">Integridade da Nave</h2>
              <p className="text-xs text-slate-400">Saúde Geral do Sistema</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-cyan-400 font-mono">
              {shieldStats.overallHealth.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 uppercase">Energia Disponível</p>
          </div>
        </div>

        {/* Barra de Integridade Global */}
        <div className="h-6 w-full bg-slate-950 rounded-full overflow-hidden border-2 border-slate-700 relative mb-4">
          <motion.div 
            className={`h-full ${
              shieldStats.overallHealth >= 70 
                ? 'bg-gradient-to-r from-emerald-500 to-green-400' 
                : shieldStats.overallHealth >= 40 
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-400' 
                  : 'bg-gradient-to-r from-red-500 to-orange-400'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${shieldStats.overallHealth}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-xs drop-shadow-lg">
              R$ {shieldStats.totalRemaining.toFixed(2)} / R$ {shieldStats.totalBudget.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-emerald-400">{shieldStats.stable}</div>
            <p className="text-xs text-emerald-300 uppercase font-bold">Estáveis</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-amber-400">{shieldStats.critical}</div>
            <p className="text-xs text-amber-300 uppercase font-bold">Críticos</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-red-400">{shieldStats.breached}</div>
            <p className="text-xs text-red-300 uppercase font-bold">Rompidos</p>
          </div>
        </div>
      </motion.div>

      {/* Alerta de Escudos Críticos */}
      {shieldStats.breached > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-500/10 border-2 border-red-500/50 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
          <div className="flex-1">
            <p className="text-red-400 font-bold text-sm uppercase">⚠️ Alerta de Sistema Crítico</p>
            <p className="text-slate-300 text-xs">
              {shieldStats.breached} escudo(s) comprometido(s). Reparo tático recomendado.
            </p>
          </div>
        </motion.div>
      )}

      {/* Grid de Escudos */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-black text-white uppercase tracking-wider">Módulos de Defesa</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shieldStats.shields.map((shield, index) => (
            <DefenseModuleCard
              key={shield.id}
              category={shield}
              budgeted={shield.budgeted}
              spent={shield.spent}
              onReallocate={() => handleRepair(shield)}
              onAddFunds={() => handleReinforce(shield)}
            />
          ))}
        </div>
      </div>

      {/* Modal de Reparo */}
      {repairModal && (
        <ShieldRepairModal
          damagedCategory={repairModal}
          availableCategories={shieldStats.shields}
          onConfirm={handleConfirmRepair}
          onClose={() => setRepairModal(null)}
        />
      )}
    </div>
  );
}