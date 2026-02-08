import { motion } from 'framer-motion';
import { Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NeonCard from './NeonCard';
import { createPageUrl } from '../utils';

export default function PremiumGate({ feature, user }) {
  const isPremium = user?.premium_until && new Date(user.premium_until) > new Date();

  if (isPremium) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
    >
      <NeonCard glowColor="gold" className="max-w-md p-8 text-center">
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Lock className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
        </motion.div>

        <h2 className="text-2xl font-black text-white mb-2">Premium Feature</h2>
        <p className="text-slate-400 mb-6">
          {feature} é exclusivo para membros premium. Desbloqueie agora para acesso ilimitado!
        </p>

        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
          <p className="text-yellow-400 font-bold text-sm">✨ Benefícios Premium:</p>
          <ul className="text-yellow-400 text-xs mt-2 space-y-1">
            <li>✅ Acesso a todas as features avançadas</li>
            <li>✅ Relatórios ilimitados</li>
            <li>✅ IA sem restrições</li>
            <li>✅ +100 Gold Coins/mês</li>
          </ul>
        </div>

        <Button
          onClick={() => window.location.href = createPageUrl('Shop') + '?tab=premium'}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3"
        >
          <Crown className="w-5 h-5 mr-2" />
          Virar Premium Agora
        </Button>
      </NeonCard>
    </motion.div>
  );
}