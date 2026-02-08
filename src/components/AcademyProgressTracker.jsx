import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Book, Zap, Trophy, Flame } from 'lucide-react';

export default function AcademyProgressTracker() {
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: progress } = useQuery({
    queryKey: ['academyProgress', currentUser?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAcademyProgress', {});
      return response.data;
    },
    enabled: !!currentUser,
    refetchInterval: 60000, // 1 min
  });

  if (!progress) return null;

  const { progress: p, achievements } = progress;

  return (
    <div className="space-y-3">
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-2 text-center"
        >
          <Book className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-cyan-400">{p.totalCompleted}</p>
          <p className="text-xs text-slate-400">Módulos</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-green-900/20 border border-green-500/30 rounded-lg p-2 text-center"
        >
          <Zap className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-green-400">{p.passRate}%</p>
          <p className="text-xs text-slate-400">Aprovação</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-2 text-center"
        >
          <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-orange-400">{p.streakDays}</p>
          <p className="text-xs text-slate-400">Dias</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-2 text-center"
        >
          <Trophy className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-purple-400">{achievements.unlocked.length}</p>
          <p className="text-xs text-slate-400">Badges</p>
        </motion.div>
      </div>

      {/* Scheduled Topics */}
      {p.scheduledTopics && p.scheduledTopics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"
        >
          <p className="text-xs text-slate-400 uppercase mb-2">📅 Tópicos Agendados</p>
          <div className="flex flex-wrap gap-2">
            {p.scheduledTopics.map(topic => (
              <span
                key={topic}
                className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30"
              >
                {topic}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Next Badge */}
      {achievements.next && achievements.next.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 text-center"
        >
          <p className="text-xs text-yellow-400 uppercase font-bold mb-1">🏅 Próxima Badge</p>
          <p className="text-sm text-yellow-300">
            {achievements.next[0]} ({achievements.unlocked.length + 1}º badge)
          </p>
        </motion.div>
      )}
    </div>
  );
}