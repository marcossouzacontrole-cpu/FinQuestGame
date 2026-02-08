import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Vault, PiggyBank } from 'lucide-react';
import NeonCard from './NeonCard';

const ACCOUNT_ICONS = {
  checking: { icon: Wallet, color: 'cyan', emoji: '💰' },
  savings: { icon: Vault, color: 'green', emoji: '🏦' },
  investment: { icon: TrendingUp, color: 'purple', emoji: '📈' },
  cash: { icon: PiggyBank, color: 'gold', emoji: '🪙' }
};

export default function AccountsOverview() {
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.Account.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser?.email
  });

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  if (accounts.length === 0) return null;

  return (
    <NeonCard glowColor="cyan">
      <div className="flex items-center gap-3 mb-6">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Wallet className="w-6 h-6 text-cyan-400" />
        </motion.div>
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-wider">Contas Bancárias</h3>
          <p className="text-slate-400 text-xs">Visão consolidada de liquidez</p>
        </div>
      </div>

      {/* Saldo Total */}
      <div className="mb-6 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/30">
        <p className="text-cyan-400 text-xs uppercase font-bold mb-1">Saldo Total Disponível</p>
        <p className="text-4xl font-black text-white font-mono">
          R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Grid de Contas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.map((account, idx) => {
          const accountType = ACCOUNT_ICONS[account.type] || ACCOUNT_ICONS.checking;
          const Icon = accountType.icon;
          const participationPercent = totalBalance > 0 ? (account.balance / totalBalance) * 100 : 0;
          
          return (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50 p-4 hover:border-cyan-500/50 transition-all"
            >
              <div className="absolute inset-0 opacity-5" style={{ backgroundColor: account.color }} />
              
              <div className="relative flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border border-white/20"
                    style={{ backgroundColor: account.color || '#00FFFF' }}
                  >
                    {account.icon || accountType.emoji}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{account.name}</p>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider">
                      {account.type === 'checking' ? 'Conta Corrente' : 
                       account.type === 'savings' ? 'Poupança' :
                       account.type === 'investment' ? 'Investimento' : 'Dinheiro'}
                    </p>
                  </div>
                </div>
                <Icon className="w-5 h-5 text-slate-600" />
              </div>

              <div className="relative">
                <p className="text-2xl font-black text-white font-mono mb-1">
                  R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                
                {/* Barra de participação */}
                <div className="h-1 bg-slate-900 rounded-full overflow-hidden mb-1">
                  <motion.div 
                    className="h-full"
                    style={{ backgroundColor: account.color || '#00FFFF' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${participationPercent}%` }}
                    transition={{ duration: 1, delay: idx * 0.1 }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  {participationPercent.toFixed(1)}% do total
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {accounts.length > 4 && (
        <p className="text-xs text-slate-500 text-center mt-4">
          {accounts.length} contas ativas • Gerencie em Núcleo Estratégico
        </p>
      )}
    </NeonCard>
  );
}