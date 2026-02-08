import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, Gift, Bell, Calendar, TrendingUp, Rss } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReferralSystem from '@/components/ReferralSystem';
import CommunityChallenges from '@/components/CommunityChallenges';
import SmartNotifications from '@/components/SmartNotifications';
import Week52Tracker from '@/components/Week52Tracker';
import BenchmarkComparison from '@/components/BenchmarkComparison';
import SocialFeed from '@/components/SocialFeed';

export default function CommunityPage() {
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

  const { data: financialProfile } = useQuery({
    queryKey: ['financialProfile', currentUser?.email],
    queryFn: async () => {
      if (currentUser?.email) {
        const profiles = await base44.entities.FinancialProfile.filter({ created_by: currentUser.email });
        return profiles && profiles.length > 0 ? profiles[0] : null;
      }
      return null;
    },
    enabled: !!currentUser,
  });

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A1A] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white uppercase tracking-wider mb-2 glow-text">
          🌐 Comunidade FinQuest
        </h1>
        <p className="text-slate-400">Conecte-se, compita e cresça junto com a comunidade</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="feed" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            <Rss className="w-4 h-4 mr-2" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
            <Bell className="w-4 h-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="challenges" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
            <Users className="w-4 h-4 mr-2" />
            Desafios
          </TabsTrigger>
          <TabsTrigger value="referral" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            <Gift className="w-4 h-4 mr-2" />
            Indicações
          </TabsTrigger>
          <TabsTrigger value="week52" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            <Calendar className="w-4 h-4 mr-2" />
            52 Semanas
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400">
            <TrendingUp className="w-4 h-4 mr-2" />
            Comparação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <SocialFeed user={userData} />
        </TabsContent>

        <TabsContent value="notifications">
          <SmartNotifications user={userData} />
        </TabsContent>

        <TabsContent value="challenges">
          <CommunityChallenges user={userData} />
        </TabsContent>

        <TabsContent value="referral">
          <ReferralSystem user={userData} />
        </TabsContent>

        <TabsContent value="week52">
          <Week52Tracker user={userData} />
        </TabsContent>

        <TabsContent value="benchmark">
          <BenchmarkComparison user={userData} financialProfile={financialProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}