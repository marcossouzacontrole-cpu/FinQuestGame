import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Gift, Copy, Check, Trophy, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NeonCard from './NeonCard';
import { toast } from 'sonner';

export default function ReferralSystem({ user }) {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const referralCode = `FINQUEST-${user.email.split('@')[0].toUpperCase()}`;
  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  const { data: referrals } = useQuery({
    queryKey: ['userReferrals', user.email],
    queryFn: () => base44.entities.Referral.filter({ referrer_email: user.email })
  });

  const { data: topReferrers } = useQuery({
    queryKey: ['topReferrers'],
    queryFn: async () => {
      const all = await base44.entities.Referral.filter({ status: 'rewarded' });
      const grouped = all.reduce((acc, ref) => {
        acc[ref.referrer_email] = (acc[ref.referrer_email] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(grouped)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([email, count]) => ({ email, count }));
    }
  });

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('🔗 Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const completedReferrals = referrals?.filter(r => r.status === 'rewarded') || [];
  const pendingReferrals = referrals?.filter(r => r.status === 'pending') || [];

  return (
    <div className="space-y-6">
      <NeonCard glowColor="purple">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase">Sistema de Indicações</h2>
            <p className="text-purple-400">Ganhe recompensas trazendo aliados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/20">
            <Gift className="w-8 h-8 text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-white">{completedReferrals.length}</p>
            <p className="text-slate-400 text-sm">Aliados Recrutados</p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-yellow-500/20">
            <TrendingUp className="w-8 h-8 text-yellow-400 mb-2" />
            <p className="text-2xl font-bold text-white">{pendingReferrals.length}</p>
            <p className="text-slate-400 text-sm">Pendentes</p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-green-500/20">
            <Trophy className="w-8 h-8 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-white">
              {completedReferrals.reduce((sum, r) => sum + r.xp_earned, 0)} XP
            </p>
            <p className="text-slate-400 text-sm">Total Ganho</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
          <h3 className="text-lg font-bold text-white mb-4">🎁 Seu Link de Indicação</h3>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="flex-1 bg-slate-800 border-slate-700 text-white"
            />
            <Button
              onClick={copyLink}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-purple-300 text-sm mt-4">
            💰 Ganhe <strong>500 XP + 50 Gold Coins</strong> quando seu amigo completar o onboarding!
          </p>
        </div>
      </NeonCard>

      {/* Leaderboard */}
      <NeonCard>
        <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          Top Recrutadores
        </h3>
        <div className="space-y-2">
          {topReferrers?.map((ref, idx) => (
            <motion.div
              key={ref.email}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4 border border-slate-700"
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  idx === 0 ? 'bg-yellow-500 text-black' :
                  idx === 1 ? 'bg-slate-400 text-black' :
                  idx === 2 ? 'bg-orange-600 text-white' :
                  'bg-slate-700 text-white'
                }`}>
                  {idx + 1}
                </div>
                <span className="text-white">{ref.email.split('@')[0]}</span>
              </div>
              <span className="text-cyan-400 font-bold">{ref.count} indicações</span>
            </motion.div>
          ))}
        </div>
      </NeonCard>

      {/* Histórico */}
      {completedReferrals.length > 0 && (
        <NeonCard glowColor="green">
          <h3 className="text-xl font-black text-white mb-4">✅ Seus Recrutas</h3>
          <div className="space-y-2">
            {completedReferrals.map((ref, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-800/30 rounded-lg p-3">
                <span className="text-slate-300">{ref.referred_email}</span>
                <span className="text-green-400 text-sm">+{ref.xp_earned} XP / +{ref.gold_earned}G</span>
              </div>
            ))}
          </div>
        </NeonCard>
      )}
    </div>
  );
}