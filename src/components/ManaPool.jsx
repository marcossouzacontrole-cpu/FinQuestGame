import { Droplet, AlertTriangle } from 'lucide-react';
import NeonCard from './NeonCard';
import { motion } from 'framer-motion';

export default function ManaPool({ totalMana, allocatedMana, accounts }) {
  const availableMana = totalMana - allocatedMana;
  const isOverbudget = availableMana < 0;
  
  return (
    <NeonCard glowColor={isOverbudget ? "gold" : "cyan"} className="relative overflow-hidden">
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          background: [
            'radial-gradient(circle at 20% 50%, rgba(0,255,255,0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 50%, rgba(0,255,255,0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 50%, rgba(0,255,255,0.3) 0%, transparent 50%)',
          ],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Droplet className="w-8 h-8 text-cyan-400 fill-cyan-400" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-black text-white">POOL DE MANA</h2>
              <p className="text-gray-400 text-sm">Recursos Disponíveis para Orçar</p>
            </div>
          </div>
          
          {isOverbudget && (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="flex items-center gap-2 bg-red-500/20 border border-red-500 rounded-lg px-3 py-2"
            >
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-bold text-sm">SOBRECARGA</span>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0a0a1a]/60 rounded-xl p-4 border border-cyan-500/30">
            <p className="text-gray-400 text-xs mb-2">Mana Total</p>
            <p className="text-3xl font-black text-cyan-400">
              R$ {totalMana.toFixed(2)}
            </p>
          </div>

          <div className="bg-[#0a0a1a]/60 rounded-xl p-4 border border-purple-500/30">
            <p className="text-gray-400 text-xs mb-2">Mana Alocada</p>
            <p className="text-3xl font-black text-purple-400">
              R$ {allocatedMana.toFixed(2)}
            </p>
          </div>

          <div className={`bg-[#0a0a1a]/60 rounded-xl p-4 border ${
            isOverbudget ? 'border-red-500' : 'border-green-500/30'
          }`}>
            <p className="text-gray-400 text-xs mb-2">
              {isOverbudget ? 'Sobrecarga' : 'Mana Livre'}
            </p>
            <p className={`text-3xl font-black ${
              isOverbudget ? 'text-red-400' : 'text-green-400'
            }`}>
              R$ {Math.abs(availableMana).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Accounts List */}
        <div className="mt-4 space-y-2">
          <p className="text-gray-400 text-sm font-semibold">Contas:</p>
          {accounts.map(account => (
            <div key={account.id} className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{account.icon}</span>
                <span className="text-white font-semibold">{account.name}</span>
              </div>
              <span className="text-cyan-400 font-bold">R$ {account.balance.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </NeonCard>
  );
}