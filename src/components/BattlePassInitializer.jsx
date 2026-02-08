import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Sparkles, Trophy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function BattlePassInitializer() {
  const [hasChecked, setHasChecked] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me()
  });

  const { data: missions = [], isLoading } = useQuery({
    queryKey: ['userBattlePassMissions', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.Mission.filter({ 
        created_by: currentUser.email,
        type: 'data_input'
      });
    },
    enabled: !!currentUser
  });

  const seedMissions = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('seedBattlePassMissions');
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('🎉 Battle Pass Inicializado!', {
          description: `${data.missions?.length || 0} missões foram criadas. Comece sua jornada!`
        });
      }
    },
    onError: (error) => {
      toast.error('Erro ao criar missões', {
        description: error.message
      });
    }
  });

  useEffect(() => {
    if (!isLoading && !hasChecked && currentUser && missions.length === 0) {
      setHasChecked(true);
    }
  }, [isLoading, missions, currentUser, hasChecked]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (missions.length > 0 || !hasChecked) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border-2 border-purple-500/50 rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(168,85,247,0.3)]">
        <motion.div
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-6"
        >
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto" />
        </motion.div>

        <h2 className="text-3xl font-black text-white mb-4">
          🎯 Inicie Sua Jornada Financeira
        </h2>
        
        <p className="text-slate-300 mb-6 text-lg">
          Prepare-se para uma aventura épica rumo à liberdade financeira! 
          Crie seu Battle Pass personalizado com missões progressivas que vão 
          transformar sua vida financeira.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <span className="text-3xl mb-2 block">🌅</span>
            <h3 className="text-white font-bold mb-1">Tier 1: O Despertar</h3>
            <p className="text-slate-400 text-sm">Organize suas finanças e dê os primeiros passos</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4">
            <span className="text-3xl mb-2 block">🛡️</span>
            <h3 className="text-white font-bold mb-1">Tier 2: A Muralha</h3>
            <p className="text-slate-400 text-sm">Construa sua reserva de emergência</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4">
            <span className="text-3xl mb-2 block">💎</span>
            <h3 className="text-white font-bold mb-1">Tier 3: O Investidor</h3>
            <p className="text-slate-400 text-sm">Multiplique sua riqueza</p>
          </div>
        </div>

        <Button
          onClick={() => seedMissions.mutate()}
          disabled={seedMissions.isLoading}
          size="lg"
          className="bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 hover:from-yellow-600 hover:via-orange-600 hover:to-pink-600 text-white font-black text-lg px-8 py-6 shadow-[0_0_30px_rgba(251,191,36,0.5)]"
        >
          {seedMissions.isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Criando Missões...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Iniciar Battle Pass
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}