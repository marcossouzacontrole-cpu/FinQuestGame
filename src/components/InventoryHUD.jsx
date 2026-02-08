import { motion } from 'framer-motion';
import { Wallet, Shield, Package, Target } from 'lucide-react';

const ACCOUNT_ICONS = {
  checking: { emoji: '💰', label: 'Bolsa de Ouro' },
  savings: { emoji: '🏦', label: 'Cofre do Tesouro' },
  cash: { emoji: '🪙', label: 'Moedas Soltas' },
  investment: { emoji: '💎', label: 'Gemas Raras' }
};

const NeonCard = ({ children, glowColor = 'cyan', className = '' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/80',
    green: 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-slate-900/80',
    gold: 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)] bg-slate-900/80',
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden ${colors[glowColor] || colors.cyan} ${className}`}>
      {children}
    </div>
  );
};

export default function InventoryHUD({ accounts = [], envelopes = [] }) {
  // Calcular totais
  const totalAccountBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalAllocated = envelopes.reduce((sum, env) => sum + (env.allocated_amount || 0), 0);
  const totalSpent = envelopes.reduce((sum, env) => sum + (env.spent_amount || 0), 0);
  const budgetHealth = totalAllocated > 0 ? ((totalAllocated - totalSpent) / totalAllocated) * 100 : 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Seção 1: Inventário de Contas */}
      <NeonCard glowColor="gold" className="h-full flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <Package className="w-6 h-6 text-yellow-400 animate-pulse" />
          <h3 className="text-lg font-black text-white uppercase tracking-wider">
            Inventário (Slots)
          </h3>
        </div>

        <div className="space-y-3 flex-1">
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum slot de mana configurado</p>
            </div>
          ) : (
            <>
              {accounts.map((account, idx) => {
                const iconData = ACCOUNT_ICONS[account.type] || ACCOUNT_ICONS.checking;
                return (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:border-yellow-500/50 transition-all"
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border border-white/20"
                      style={{ backgroundColor: account.color || '#eab308' }}
                    >
                      {account.icon || iconData.emoji}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{account.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{iconData.label}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-yellow-400 font-black text-sm font-mono">
                        R$ {(account.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}

              {/* Total Summary */}
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm font-bold uppercase">Total Mana</span>
                  <span className="text-yellow-400 text-xl font-black font-mono">
                    R$ {totalAccountBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </NeonCard>

      {/* Seção 2: Missões de Orçamento */}
      <NeonCard glowColor="cyan" className="h-full flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6 text-cyan-400 animate-pulse" />
          <h3 className="text-lg font-black text-white uppercase tracking-wider">
            Missões de Orçamento
          </h3>
        </div>

        <div className="space-y-4 flex-1">
          {envelopes.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma missão de orçamento ativa</p>
            </div>
          ) : (
            <>
              {/* Progress Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Status Geral</span>
                  <span className={`font-bold ${budgetHealth > 50 ? 'text-green-400' : budgetHealth > 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {budgetHealth.toFixed(0)}% Saúde
                  </span>
                </div>
                
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <motion.div 
                    className={`h-full ${
                      budgetHealth > 50 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-500' 
                        : budgetHealth > 20 
                        ? 'bg-gradient-to-r from-yellow-600 to-orange-500'
                        : 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${budgetHealth}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs mt-3">
                  <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                    <p className="text-slate-500 uppercase font-bold mb-1">Alocado</p>
                    <p className="text-white font-mono font-bold">R$ {totalAllocated.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                    <p className="text-slate-500 uppercase font-bold mb-1">Gasto</p>
                    <p className="text-cyan-400 font-mono font-bold">R$ {totalSpent.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Individual Envelopes */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {envelopes.map((envelope, idx) => {
                  const progress = envelope.allocated_amount > 0 
                    ? ((envelope.spent_amount || 0) / envelope.allocated_amount) * 100 
                    : 0;
                  const isOverspent = progress > 100;

                  return (
                    <motion.div
                      key={envelope.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="text-xs"
                    >
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-300 font-bold">{envelope.name}</span>
                        <span className={`font-mono ${isOverspent ? 'text-red-400' : 'text-cyan-400'}`}>
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${isOverspent ? 'bg-red-500' : 'bg-cyan-400'}`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </NeonCard>
    </div>
  );
}