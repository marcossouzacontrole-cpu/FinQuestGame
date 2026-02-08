import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import IntegrationsManager from '../components/IntegrationsManager';
import OpenBankingConnector from '../components/OpenBankingConnector';
import GmailInvoiceImporter from '../components/GmailInvoiceImporter';
import IntegrationMarketplace from '../components/IntegrationMarketplace';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Integrations() {
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

  const isPremium = userData?.premium_until && new Date(userData.premium_until) > new Date();

  return (
    <div className="min-h-screen cyber-grid bg-[#0A0A1A] p-4 lg:p-8 pt-24 lg:pt-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Global Connection Health Board */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-900/50 border border-purple-500/30 rounded-xl p-4 backdrop-blur-md">
            <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-1">Open Banking</p>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-lg">Ativo</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-cyan-500/30 rounded-xl p-4 backdrop-blur-md">
            <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-1">Regras n8n</p>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-lg">Operacional</span>
              <div className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_8px_#06b6d4]" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-red-500/30 rounded-xl p-4 backdrop-blur-md">
            <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1">Gmail Sync</p>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-lg">Pronto</span>
              <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-emerald-500/30 rounded-xl p-4 backdrop-blur-md">
            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Segurança</p>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-lg">Máxima</span>
              <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
            </div>
          </div>
        </div>

        <Tabs defaultValue="openbanking" className="space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-3">
            <TabsList className="grid w-full grid-cols-4 bg-transparent h-auto">
              <TabsTrigger
                value="openbanking"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/30 data-[state=active]:to-pink-500/30 data-[state=active]:text-white data-[state=active]:border-purple-500/50 border border-transparent hover:border-purple-500/30 transition-all rounded-xl px-4 py-3"
              >
                🏦 Open Banking
              </TabsTrigger>
              <TabsTrigger
                value="gmail"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500/30 data-[state=active]:to-pink-500/30 data-[state=active]:text-white data-[state=active]:border-red-500/50 border border-transparent hover:border-red-500/30 transition-all rounded-xl px-4 py-3"
              >
                📧 Gmail
              </TabsTrigger>
              <TabsTrigger
                value="external"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:text-white data-[state=active]:border-cyan-500/50 border border-transparent hover:border-cyan-500/30 transition-all rounded-xl px-4 py-3"
              >
                🔗 Outros
              </TabsTrigger>
              <TabsTrigger
                value="marketplace"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500/30 data-[state=active]:to-emerald-500/30 data-[state=active]:text-white data-[state=active]:border-green-500/50 border border-transparent hover:border-green-500/30 transition-all rounded-xl px-4 py-3"
              >
                🛒 Marketplace
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="openbanking">
            <OpenBankingConnector />
          </TabsContent>

          <TabsContent value="gmail">
            <GmailInvoiceImporter />
          </TabsContent>

          <TabsContent value="external">
            <div className="space-y-6">
              <IntegrationsManager />
            </div>
          </TabsContent>

          <TabsContent value="marketplace">
            {userData && <IntegrationMarketplace user={userData} isPremium={isPremium} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}