import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Calendar, Zap, Trophy, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { useGamification } from './useGamification';

export default function DailyWeeklyMissions() {
  const queryClient = useQueryClient();
  const { awardXP } = useGamification();

  const { data: user } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me()
  });

  const { data: allMissions = [] } = useQuery({
    queryKey: ['dailyWeeklyMissions'],
    queryFn: () => base44.entities.DailyMission.list(),
    enabled: !!user
  });

  // Remover duplicatas baseado no título
  const uniqueMissions = React.useMemo(() => {
    const seen = new Map();
    allMissions.forEach(m => {
      if (!seen.has(m.title)) {
        seen.set(m.title, m);
      }
    });
    return Array.from(seen.values());
  }, [allMissions]);

  const dailyMissions = uniqueMissions.filter(m => m.mission_type === 'daily');
  const weeklyMissions = uniqueMissions.filter(m => m.mission_type === 'weekly');

  const completeMission = useMutation({
    mutationFn: async (mission) => {
      const today = format(new Date(), 'yyyy-MM-dd');

      await base44.entities.DailyMission.update(mission.id, {
        completed_today: true,
        last_completed_date: today,
        completion_count: (mission.completion_count || 0) + 1,
        current_progress: mission.target_value
      });

      awardXP(mission.xp_reward, mission.gold_reward, mission.title, user.email, 'streak_count');
      return { success: true };
    },
    onSuccess: (data, mission) => {
      queryClient.invalidateQueries(['dailyWeeklyMissions']);
      queryClient.invalidateQueries(['base44User']);
      queryClient.invalidateQueries(['currentUserProfile']);
    }
  });

  const MissionCard = ({ mission, type }) => {
    const isCompleted = mission.completed_today;
    const progress = (mission.current_progress || 0) / mission.target_value * 100;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-xl border backdrop-blur-xl transition-all ${isCompleted
            ? 'bg-green-900/20 border-green-500/30'
            : 'bg-slate-900/80 border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]'
          }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isCompleted ? 'bg-green-500/20' : 'bg-cyan-500/20'
              }`}>
              {mission.icon || '⚡'}
            </div>
            <div>
              <h4 className={`font-bold ${isCompleted ? 'text-green-400 line-through' : 'text-white'}`}>
                {mission.title}
              </h4>
              <p className="text-slate-400 text-xs">{mission.description}</p>
            </div>
          </div>
          {isCompleted ? (
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          ) : (
            <Circle className="w-6 h-6 text-slate-500" />
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-cyan-400 font-bold flex items-center gap-1">
              <Zap className="w-4 h-4" />
              +{mission.xp_reward} XP
            </span>
            <span className="text-yellow-400 font-bold flex items-center gap-1">
              💰 +{mission.gold_reward}
            </span>
          </div>

          {!isCompleted && (
            <button
              onClick={() => completeMission.mutate(mission)}
              disabled={completeMission.isPending}
              className="px-4 py-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50"
            >
              Completar
            </button>
          )}
        </div>

        {!isCompleted && (
          <div className="mt-3">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {mission.current_progress || 0} / {mission.target_value}
            </p>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Diárias */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase">Missões Diárias</h3>
            <p className="text-slate-400 text-sm">Resetam todo dia às 00:00</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-cyan-400 font-bold">
              {dailyMissions.filter(m => m.completed_today).length} / {dailyMissions.length}
            </p>
            <p className="text-xs text-slate-500">Completadas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dailyMissions.map(mission => (
            <MissionCard key={mission.id} mission={mission} type="daily" />
          ))}
        </div>
      </div>

      {/* Semanais */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase">Missões Semanais</h3>
            <p className="text-slate-400 text-sm">Resetam toda segunda-feira</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-purple-400 font-bold">
              {weeklyMissions.filter(m => m.completed_today).length} / {weeklyMissions.length}
            </p>
            <p className="text-xs text-slate-500">Completadas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {weeklyMissions.map(mission => (
            <MissionCard key={mission.id} mission={mission} type="weekly" />
          ))}
        </div>
      </div>
    </div>
  );
}