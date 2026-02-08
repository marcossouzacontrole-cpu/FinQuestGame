import { CreditCard, AlertCircle, Flame } from 'lucide-react';
import NeonCard from './NeonCard';
import { motion } from 'framer-motion';

export default function CreditCardOverheat({ creditCards }) {
  const getOverheatLevel = (used, limit) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return { level: 'critical', color: 'red', label: 'CRÍTICO' };
    if (percentage >= 70) return { level: 'warning', color: 'orange', label: 'ALERTA' };
    if (percentage >= 50) return { level: 'moderate', color: 'yellow', label: 'MODERADO' };
    return { level: 'safe', color: 'green', label: 'SEGURO' };
  };

  return (
    <NeonCard glowColor="magenta">
      <div className="flex items-center gap-2 mb-6">
        <Flame className="w-6 h-6 text-red-400" />
        <h2 className="text-2xl font-black text-white">SISTEMA DE SOBRECARGA</h2>
        <span className="text-xs text-gray-400 ml-2">(Cartões de Crédito)</span>
      </div>

      <div className="space-y-4">
        {creditCards.map((card) => {
          const usedPercentage = (card.current_bill / card.limit) * 100;
          const overheat = getOverheatLevel(card.current_bill, card.limit);
          const available = card.limit - card.current_bill;

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`bg-[#0a0a1a] rounded-xl p-4 border-2 ${
                overheat.level === 'critical' ? 'border-red-500 shadow-[0_0_20px_rgba(255,0,0,0.5)]' :
                overheat.level === 'warning' ? 'border-orange-500' :
                overheat.level === 'moderate' ? 'border-yellow-500' :
                'border-green-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{card.icon}</span>
                  <div>
                    <h3 className="text-white font-bold">{card.name}</h3>
                    <p className="text-xs text-gray-400">
                      Vencimento: Dia {card.due_day} • Fechamento: Dia {card.closing_day}
                    </p>
                  </div>
                </div>

                {overheat.level === 'critical' && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </motion.div>
                )}
              </div>

              {/* Overheat Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Barra de Overheat</span>
                  <span className={`font-bold ${
                    overheat.level === 'critical' ? 'text-red-400' :
                    overheat.level === 'warning' ? 'text-orange-400' :
                    overheat.level === 'moderate' ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {overheat.label}
                  </span>
                </div>
                
                <div className="relative h-6 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usedPercentage}%` }}
                    className={`h-full ${
                      overheat.level === 'critical' ? 'bg-gradient-to-r from-red-600 to-red-400' :
                      overheat.level === 'warning' ? 'bg-gradient-to-r from-orange-500 to-yellow-500' :
                      overheat.level === 'moderate' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                      'bg-gradient-to-r from-green-500 to-cyan-500'
                    }`}
                    transition={{ duration: 0.5 }}
                  />
                  {overheat.level === 'critical' && (
                    <motion.div
                      className="absolute inset-0 bg-red-500/30"
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-400">Fatura Atual</p>
                  <p className="text-white font-bold text-sm">R$ {card.current_bill.toFixed(2)}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-400">Limite Total</p>
                  <p className="text-cyan-400 font-bold text-sm">R$ {card.limit.toFixed(2)}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-400">Disponível</p>
                  <p className={`font-bold text-sm ${available > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    R$ {available.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Boss Alert */}
              {overheat.level === 'critical' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 bg-red-900/30 border border-red-500 rounded-lg"
                >
                  <p className="text-red-400 font-bold text-sm flex items-center gap-2">
                    <Flame className="w-4 h-4" />
                    BOSS ALERT: Fatura pesada se aproxima! Prepare recursos!
                  </p>
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {creditCards.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum cartão de crédito cadastrado</p>
          </div>
        )}
      </div>
    </NeonCard>
  );
}