import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Crown, Coins, Zap, Loader2, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import NeonCard from './NeonCard';
import { Badge } from '@/components/ui/badge';

export default function StripeShop({ userGold = 0 }) {
  const checkoutMutation = useMutation({
    mutationFn: async (priceId) => {
      // Check if running in iframe
      if (window.self !== window.top) {
        toast.error('❌ Checkout bloqueado', {
          description: 'Abra o app em uma nova aba para fazer compras'
        });
        return;
      }

      const response = await base44.functions.invoke('createStripeCheckout', {
        price_id: priceId,
        success_url: window.location.origin + '/Shop?payment=success',
        cancel_url: window.location.origin + '/Shop?payment=cancelled'
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      }
    },
    onError: () => {
      toast.error('❌ Erro ao processar checkout');
    }
  });

  const products = [
    {
      name: 'Premium Plan',
      description: 'IA ilimitada, análises avançadas, missões exclusivas',
      price: 19.90,
      priceId: 'price_1Sv4Vq5TMqhGwz2MV3JZYmDQ',
      icon: Crown,
      color: 'from-yellow-500 to-amber-500',
      badge: 'POPULAR',
      features: ['IA sem limites', 'Relatórios avançados', 'Missões exclusivas', '100 Gold Coins'],
      emoji: '👑'
    },
    {
      name: 'Pacote Pequeno',
      description: '100 Gold Coins',
      price: 9.90,
      priceId: 'price_1Sv4Vq5TMqhGwz2MMfYSV6Ew',
      icon: Coins,
      color: 'from-cyan-500 to-blue-500',
      features: ['100 Gold Coins'],
      emoji: '💰'
    },
    {
      name: 'Pacote Médio',
      description: '300 Gold Coins',
      price: 24.90,
      priceId: 'price_1Sv4Vq5TMqhGwz2M18RuQ7wV',
      icon: Coins,
      color: 'from-purple-500 to-pink-500',
      badge: 'MELHOR VALOR',
      features: ['300 Gold Coins', '+20% bônus'],
      emoji: '💎'
    },
    {
      name: 'Pacote Grande',
      description: '750 Gold Coins',
      price: 49.90,
      priceId: 'price_1Sv4Vq5TMqhGwz2MXDE3zV1q',
      icon: Trophy,
      color: 'from-orange-500 to-red-500',
      features: ['750 Gold Coins', '+50% bônus'],
      emoji: '🏆'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Current Balance */}
      <NeonCard glowColor="gold">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center">
              <Coins className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Seu Tesouro</p>
              <p className="text-3xl font-black text-yellow-400">{userGold} 💰</p>
            </div>
          </div>
        </div>
      </NeonCard>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.map((product, idx) => {
          const Icon = product.icon;
          return (
            <motion.div
              key={product.priceId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <NeonCard className="relative overflow-hidden h-full">
                {product.badge && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-gradient-to-r from-cyan-500 to-magenta-500 text-white border-0">
                      {product.badge}
                    </Badge>
                  </div>
                )}

                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-16 h-16 bg-gradient-to-br ${product.color} rounded-xl flex items-center justify-center text-3xl`}>
                    {product.emoji}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-white mb-1">{product.name}</h3>
                    <p className="text-slate-400 text-sm">{product.description}</p>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {product.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-black text-white">R$ {product.price.toFixed(2)}</p>
                    {product.name.includes('Premium') && (
                      <p className="text-slate-500 text-xs">/mês</p>
                    )}
                  </div>
                  <Button
                    onClick={() => checkoutMutation.mutate(product.priceId)}
                    disabled={checkoutMutation.isPending}
                    className={`bg-gradient-to-r ${product.color} hover:opacity-90 font-bold`}
                  >
                    {checkoutMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Comprar
                      </>
                    )}
                  </Button>
                </div>
              </NeonCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}