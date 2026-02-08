import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';

export default function MissionAutoInitializer({ onComplete }) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me()
  });

  const { data: dailyMissions = [] } = useQuery({
    queryKey: ['dailyMissions'],
    queryFn: () => base44.entities.DailyMission.list(),
    enabled: !!user,
    staleTime: 60000 // Cache por 1 minuto
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones'],
    queryFn: () => base44.entities.FinancialMilestone.list(),
    enabled: !!user,
    staleTime: 60000 // Cache por 1 minuto
  });

  useEffect(() => {
    const autoInitialize = async () => {
      if (!user || hasChecked || isInitializing) return;
      
      // Verificar se já existem missões diárias e marcos
      const needsSetup = dailyMissions.length === 0 || milestones.length === 0;
      
      if (needsSetup) {
        setIsInitializing(true);
        try {
          await base44.functions.invoke('seedRealisticMissions', { clear_existing: false });
          if (onComplete) onComplete();
        } catch (error) {
          console.error('Erro ao inicializar missões:', error);
        } finally {
          setIsInitializing(false);
          setHasChecked(true);
        }
      } else {
        setHasChecked(true);
        if (onComplete) onComplete();
      }
    };

    if (user && dailyMissions !== undefined && milestones !== undefined) {
      autoInitialize();
    }
  }, [user, dailyMissions, milestones, hasChecked, isInitializing]);

  if (!isInitializing || hasChecked) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500/50 rounded-2xl p-8 text-center max-w-md"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mb-6"
        >
          <Sparkles className="w-16 h-16 text-cyan-400 mx-auto" />
        </motion.div>
        <h3 className="text-2xl font-black text-white mb-2">Preparando Sua Jornada</h3>
        <p className="text-slate-400 mb-4">Gerando missões personalizadas...</p>
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
      </motion.div>
    </div>
  );
}