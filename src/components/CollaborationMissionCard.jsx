import { Button } from '@/components/ui/button';
import { Users, Check, TrendingUp } from 'lucide-react';
import NeonCard from './NeonCard';

export default function CollaborationMissionCard({ mission, onComplete, onProgress }) {
  const isCompleted = mission.status === 'completed';
  const progress = mission.collaboration_progress || 0;
  const target = mission.collaboration_target || 1;
  const progressPercent = Math.min((progress / target) * 100, 100);

  return (
    <NeonCard glowColor="cyan" className="relative overflow-hidden">
      {/* Collaboration Badge */}
      <div className="absolute top-2 right-2">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full p-2 shadow-[0_0_20px_rgba(0,255,255,0.6)]">
          <Users className="w-4 h-4 text-white" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Icon & Title */}
        <div className="flex items-start gap-3">
          <div className="text-4xl">{mission.badge_icon || '🤝'}</div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-1">{mission.title}</h3>
            <p className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              Missão Colaborativa
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-400 text-sm leading-relaxed">{mission.description}</p>

        {/* Progress Bar */}
        {!isCompleted && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Progresso</span>
              <span className="text-white font-bold">{progress}/{target} interações</span>
            </div>
            <div className="h-3 bg-[#0a0a1a] rounded-full overflow-hidden border border-cyan-500/30">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 flex items-center justify-end pr-1"
                style={{ width: `${progressPercent}%` }}
              >
                {progressPercent > 10 && (
                  <span className="text-white text-[10px] font-bold">{progressPercent.toFixed(0)}%</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rewards & Action */}
        <div className="flex items-center justify-between pt-2 border-t border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-900/30 rounded-lg px-3 py-1 border border-cyan-500/40">
              <span className="text-cyan-400 font-bold text-sm">+{mission.xp_reward} XP</span>
            </div>
            {mission.gold_reward > 0 && (
              <div className="bg-yellow-900/30 rounded-lg px-3 py-1 border border-yellow-500/40">
                <span className="text-yellow-400 font-bold text-sm">+{mission.gold_reward} 💰</span>
              </div>
            )}
          </div>

          {isCompleted ? (
            <div className="flex items-center gap-2 text-green-400">
              <Check className="w-5 h-5" />
              <span className="font-bold text-sm">Completa!</span>
            </div>
          ) : progress >= target ? (
            <Button
              onClick={() => onComplete(mission)}
              size="sm"
              className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold shadow-[0_0_15px_rgba(0,255,255,0.5)] animate-pulse"
            >
              <Check className="w-4 h-4 mr-1" />
              Concluir
            </Button>
          ) : (
            <Button
              onClick={() => onProgress(mission)}
              size="sm"
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold shadow-[0_0_15px_rgba(0,255,255,0.5)]"
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Interagir
            </Button>
          )}
        </div>
      </div>
    </NeonCard>
  );
}