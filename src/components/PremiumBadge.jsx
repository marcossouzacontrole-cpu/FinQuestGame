import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Crown, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PremiumBadge() {
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

  if (!isPremium) return null;

  const daysLeft = Math.ceil((new Date(userData.premium_until) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed top-4 right-4 z-50"
    >
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full px-4 py-2 shadow-[0_0_20px_rgba(255,215,0,0.6)] border-2 border-yellow-300">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Crown className="w-4 h-4 text-white" />
          </motion.div>
          <span className="text-white font-black text-sm uppercase tracking-wider">Premium</span>
          <Sparkles className="w-4 h-4 text-yellow-200 animate-pulse" />
        </div>
        <p className="text-yellow-100 text-xs text-center mt-1">{daysLeft} dias</p>
      </div>
    </motion.div>
  );
}