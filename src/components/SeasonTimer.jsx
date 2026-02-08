import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, Trophy, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SeasonTimer() {
  const { data: seasonData } = useQuery({
    queryKey: ['currentSeason'],
    queryFn: async () => {
      const seasons = await base44.entities.Season.filter({ status: 'active' });
      if (seasons.length === 0) return null;
      
      const season = seasons[0];
      const now = new Date();
      const endDate = new Date(season.end_date);
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      
      return {
        ...season,
        days_remaining: daysRemaining,
        progress: ((60 - daysRemaining) / 60) * 100 // 2 meses = ~60 dias
      };
    },
    refetchInterval: 3600000 // Atualiza a cada hora
  });

  if (!seasonData) return null;

  const isEnding = seasonData.days_remaining <= 7;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border-2 p-6 ${
        isEnding 
          ? 'bg-gradient-to-r from-red-900/20 to-orange-900/20 border-red-500/50' 
          : 'bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border-purple-500/30'
      }`}
    >
      {/* Background Animation */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          className="h-full bg-gradient-to-r from-transparent via-white to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
        {/* Season Info */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <motion.div
              className="absolute inset-0 blur-xl opacity-50"
              style={{ backgroundColor: seasonData.theme_color }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div 
              className="relative w-16 h-16 rounded-xl flex items-center justify-center text-3xl border-2"
              style={{ 
                borderColor: seasonData.theme_color,
                backgroundColor: `${seasonData.theme_color}20`
              }}
            >
              <Trophy className="w-8 h-8" style={{ color: seasonData.theme_color }} />
            </div>
          </div>

          <div>
            <h3 className="text-white font-black text-lg tracking-wider">
              {seasonData.name}
            </h3>
            <p className="text-slate-400 text-sm">{seasonData.theme}</p>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="flex items-center gap-2 mb-1">
              <Clock className={`w-5 h-5 ${isEnding ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`} />
              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                {isEnding ? 'Encerrando em' : 'Tempo Restante'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                className={`text-4xl font-black ${isEnding ? 'text-red-400' : 'text-cyan-400'}`}
                animate={isEnding ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {seasonData.days_remaining}
              </motion.div>
              <span className="text-slate-400 text-sm">dias</span>
            </div>
          </div>

          {isEnding && (
            <motion.div
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-red-400 font-bold text-sm uppercase">Última Semana!</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative z-10 mt-4 h-2 bg-slate-900 rounded-full overflow-hidden">
        <motion.div
          className="h-full"
          style={{ 
            background: `linear-gradient(90deg, ${seasonData.theme_color}, ${seasonData.theme_color}80)` 
          }}
          initial={{ width: 0 }}
          animate={{ width: `${seasonData.progress}%` }}
          transition={{ duration: 1.5 }}
        />
      </div>

      {isEnding && (
        <p className="relative z-10 mt-3 text-center text-xs text-orange-300 font-semibold">
          ⚠️ Complete suas missões antes que a temporada termine!
        </p>
      )}
    </motion.div>
  );
}