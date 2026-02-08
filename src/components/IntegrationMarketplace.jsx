import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NeonCard from './NeonCard';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function IntegrationMarketplace({ user, isPremium }) {
  const queryClient = useQueryClient();
  const [selectedBundle, setSelectedBundle] = useState(null);

  const { data: bundles = [] } = useQuery({
    queryKey: ['integrationBundles'],
    queryFn: () => base44.entities.IntegrationBundle.list(),
  });

  const { data: userIntegrations = [] } = useQuery({
    queryKey: ['userIntegrations', user?.email],
    queryFn: () => base44.entities.UserIntegrations.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const purchaseBundle = useMutation({
    mutationFn: async (bundle) => {
      const { data } = await base44.functions.invoke('createIntegrationCheckout', {
        bundleId: bundle.id,
        bundleCategory: bundle.category,
        bundleName: bundle.name
      });

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Não foi possível criar o checkout');
      }
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const freeIntegrations = ['Google Sheets', 'Notion Básico'];
  const hasBundle = (bundleId) => userIntegrations.some(ui => ui.bundle_id === bundleId);

  const bundleCategories = {
    automation: { icon: '⚡', label: 'Automação', color: 'from-cyan-500 to-blue-500' },
    data: { icon: '📊', label: 'Dados & Relatórios', color: 'from-green-500 to-emerald-500' },
  };

  return (
    <div className="space-y-6">
      {/* Free Integrations */}
      <NeonCard glowColor="green">
        <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2">
          ✨ Integrações Incluídas (Grátis)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {freeIntegrations.map((integration) => (
            <div
              key={integration}
              className="bg-green-900/20 border border-green-500/50 rounded-lg p-3 text-center"
            >
              <p className="text-green-400 font-bold text-sm">{integration}</p>
              <Check className="w-4 h-4 text-green-400 mx-auto mt-2" />
            </div>
          ))}
        </div>
      </NeonCard>

      {isPremium && (
        <NeonCard glowColor="gold">
          <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2">
            👑 Premium - Todas as Integrações
          </h3>
          <p className="text-slate-400 mb-4">
            Como membro Premium, você tem acesso a TODAS as integrações:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {['Gmail', 'Google Calendar', 'Google Sheets Pro', 'Notion Avançado', 'Slack', 'LinkedIn'].map(
              (integration) => (
                <div
                  key={integration}
                  className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3 text-center"
                >
                  <p className="text-yellow-400 font-bold text-sm">{integration}</p>
                  <Check className="w-4 h-4 text-yellow-400 mx-auto mt-2" />
                </div>
              )
            )}
          </div>
        </NeonCard>
      )}

      {/* Integration Bundles */}
      <div>
        <h3 className="text-white font-black text-2xl mb-6 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6" />
          Desbloqueie Integrações Adicionais
        </h3>

        {Object.entries(bundleCategories).map(([categoryKey, categoryInfo]) => {
          const categoryBundles = bundles.filter((b) => b.category === categoryKey);

          if (categoryBundles.length === 0) return null;

          return (
            <motion.div
              key={categoryKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <span>{categoryInfo.icon}</span>
                {categoryInfo.label}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryBundles.map((bundle, idx) => {
                  const owned = hasBundle(bundle.id);

                  return (
                    <motion.div
                      key={bundle.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`rounded-xl p-4 border-2 transition-all cursor-pointer ${
                        owned
                          ? 'bg-green-900/20 border-green-500/50'
                          : 'bg-slate-800/50 border-slate-700 hover:border-cyan-500/50'
                      }`}
                      onClick={() => !owned && setSelectedBundle(bundle)}
                    >
                      {/* Icon */}
                      <p className="text-4xl mb-3">{bundle.icon}</p>

                      {/* Name */}
                      <h5 className="text-white font-bold mb-1">{bundle.name}</h5>
                      <p className="text-slate-400 text-xs mb-3">{bundle.description}</p>

                      {/* Features */}
                      <div className="space-y-1 mb-4">
                        {bundle.features?.slice(0, 2).map((feature, i) => (
                          <p key={i} className="text-cyan-400 text-xs flex items-center gap-1">
                            <Check className="w-3 h-3" /> {feature}
                          </p>
                        ))}
                      </div>

                      {/* Integrations */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {bundle.integrations?.map((int) => (
                          <Badge key={int} className="bg-slate-700 text-slate-300 text-xs">
                            {int}
                          </Badge>
                        ))}
                      </div>

                      {/* Button */}
                      <Button
                        disabled={owned || purchaseBundle.isPending}
                        onClick={() => purchaseBundle.mutate(bundle)}
                        className={`w-full ${
                          owned
                            ? 'bg-green-500/20 text-green-400 cursor-default'
                            : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white'
                        }`}
                      >
                        {owned ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Desbloqueado
                          </>
                        ) : purchaseBundle.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-4 h-4 mr-2" />
                            R$ {bundle.price.toFixed(2)}
                          </>
                        )}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Info Card */}
      <NeonCard glowColor="cyan">
        <h4 className="text-white font-bold mb-3">💡 Dica</h4>
        <p className="text-slate-400 text-sm">
          Compre bundles de integrações com Gold Coins, ou cancele seu Premium para acessar todas!
        </p>
      </NeonCard>
    </div>
  );
}