import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileSpreadsheet, FileText, Mail, CheckCircle, Crown } from 'lucide-react';
import NeonCard from './NeonCard';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function IntegrationsDashboard() {
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userData } = useQuery({
    queryKey: ['currentUserProfile', currentUser?.email],
    queryFn: async () => {
      if (currentUser?.email) {
        const profiles = await base44.entities.User.filter({ email: currentUser.email });
        return profiles && profiles.length > 0 ? profiles[0] : null;
      }
      return null;
    },
    enabled: !!currentUser,
  });

  const integrations = [
    {
      name: 'Google Sheets',
      description: 'Exportar relatórios financeiros',
      icon: FileSpreadsheet,
      status: 'active',
      color: 'from-green-500 to-emerald-500',
      location: 'Centro de Comando > Relatórios'
    },
    {
      name: 'Notion',
      description: 'Diário de metas e documentação',
      icon: FileText,
      status: 'active',
      color: 'from-purple-500 to-pink-500',
      location: 'O Cofre > Cards de Metas'
    },
    {
      name: 'Gmail',
      description: 'Importar faturas do email',
      icon: Mail,
      status: 'active',
      color: 'from-red-500 to-orange-500',
      location: 'Integrações > Gmail'
    },
    {
      name: 'Stripe Premium',
      description: 'Monetização e Gold Coins',
      icon: Crown,
      status: userData?.premium_until && new Date(userData.premium_until) > new Date() ? 'premium' : 'available',
      color: 'from-yellow-500 to-amber-500',
      location: 'Loja > Premium'
    }
  ];

  return (
    <NeonCard>
      <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-wider">Integrações Ativas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration, idx) => {
          const Icon = integration.icon;
          return (
            <motion.div
              key={integration.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-cyan-500/50 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${integration.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-bold">{integration.name}</h4>
                    {integration.status === 'active' && (
                      <Badge className="bg-green-500/20 text-green-400 border border-green-500/50">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ativa
                      </Badge>
                    )}
                    {integration.status === 'premium' && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 animate-pulse">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm mb-2">{integration.description}</p>
                  <p className="text-cyan-400 text-xs">📍 {integration.location}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </NeonCard>
  );
}