import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, Zap, Award, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import NeonCard from './NeonCard';
import { toast } from 'sonner';

export default function Week52Tracker({ user }) {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const queryClient = useQueryClient();

  const { data: weeks } = useQuery({
    queryKey: ['week52Challenge', user.email],
    queryFn: () => base44.entities.Week52Challenge.filter({ created_by: user.email }, 'week_number')
  });

  const completeMutation = useMutation({
    mutationFn: async ({ weekId, amount }) => {
      await base44.entities.Week52Challenge.update(weekId, {
        saved_amount: amount,
        status: 'completed',
        completion_date: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['week52Challenge']);
      toast.success('✅ Semana completada! +100 XP');
    }
  });

  const completedWeeks = weeks?.filter(w => w.status === 'completed').length || 0;
  const totalSaved = weeks?.reduce((sum, w) => sum + (w.saved_amount || 0), 0) || 0;
  const currentWeek = weeks?.find(w => w.status === 'pending');
  const strikesAvailable = 3 - (weeks?.filter(w => w.strike_used).length || 0);

  const progressPercent = (completedWeeks / 52) * 100;

  return (
    <div className="space-y-6">
      <NeonCard glowColor="green">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase">Desafio 52 Semanas</h2>
            <p className="text-green-400">Economize toda semana e alcance suas metas</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-green-500/20">
            <TrendingUp className="w-6 h-6 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-white">{completedWeeks}</p>
            <p className="text-slate-400 text-sm">Semanas</p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-cyan-500/20">
            <Award className="w-6 h-6 text-cyan-400 mb-2" />
            <p className="text-2xl font-bold text-white">R$ {totalSaved.toFixed(0)}</p>
            <p className="text-slate-400 text-sm">Economizado</p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-yellow-500/20">
            <Zap className="w-6 h-6 text-yellow-400 mb-2" />
            <p className="text-2xl font-bold text-white">Semana {currentWeek?.week_number || '-'}</p>
            <p className="text-slate-400 text-sm">Atual</p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/20">
            <Shield className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-white">{strikesAvailable}/3</p>
            <p className="text-slate-400 text-sm">Strikes</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Progresso Total</span>
            <span className="text-white font-bold">{progressPercent.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercent} className="h-4" />
        </div>

        {/* Current Week Card */}
        {currentWeek && (
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-6 border border-green-500/50"
          >
            <h3 className="text-lg font-bold text-white mb-2">📅 Semana Atual</h3>
            <p className="text-slate-300 mb-4">
              Economize <strong className="text-green-400">R$ {currentWeek.target_amount.toFixed(0)}</strong> esta semana
            </p>
            <Button
              onClick={() => completeMutation.mutate({ weekId: currentWeek.id, amount: currentWeek.target_amount })}
              disabled={completeMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              ✅ Marcar como Completada
            </Button>
          </motion.div>
        )}

        {/* Grid de Semanas */}
        <div className="mt-6">
          <h3 className="text-white font-bold mb-4">📊 Histórico</h3>
          <div className="grid grid-cols-7 md:grid-cols-13 gap-2">
            {weeks?.slice(0, 52).map((week) => (
              <motion.div
                key={week.id}
                whileHover={{ scale: 1.1 }}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer ${
                  week.status === 'completed' ? 'bg-green-500 text-white' :
                  week.status === 'pending' ? 'bg-yellow-500/30 text-yellow-300 border-2 border-yellow-500' :
                  week.status === 'skipped' ? 'bg-red-500/30 text-red-300' :
                  'bg-slate-700 text-slate-400'
                }`}
                onClick={() => setSelectedWeek(week)}
                title={`Semana ${week.week_number} - R$ ${week.target_amount}`}
              >
                {week.week_number}
              </motion.div>
            ))}
          </div>
        </div>
      </NeonCard>

      {/* Rewards */}
      <NeonCard>
        <h3 className="text-xl font-bold text-white mb-4">🏆 Milestones & Recompensas</h3>
        <div className="space-y-3">
          {[
            { weeks: 13, reward: '500 XP + Badge "Trimestral"' },
            { weeks: 26, reward: '1000 XP + Badge "Semestral"' },
            { weeks: 39, reward: '2000 XP + Badge "3 Trimestres"' },
            { weeks: 52, reward: '5000 XP + Badge "Mestre da Disciplina"' }
          ].map((milestone) => {
            const achieved = completedWeeks >= milestone.weeks;
            return (
              <div
                key={milestone.weeks}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  achieved 
                    ? 'bg-green-500/20 border-green-500/50' 
                    : 'bg-slate-800/50 border-slate-700'
                }`}
              >
                <div>
                  <p className="text-white font-bold">{milestone.weeks} Semanas</p>
                  <p className="text-slate-400 text-sm">{milestone.reward}</p>
                </div>
                {achieved && <Award className="w-6 h-6 text-green-400" />}
              </div>
            );
          })}
        </div>
      </NeonCard>
    </div>
  );
}