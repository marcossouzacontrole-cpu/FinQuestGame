import { Button } from '@/components/ui/button';
import { Compass, Sparkles, Check } from 'lucide-react';
import NeonCard from './NeonCard';

export default function DiscoveryMissionCard({ mission, onComplete }) {
  const isCompleted = mission.status === 'completed';

  return (
    <NeonCard glowColor="purple" className="relative overflow-hidden">
      {/* Discovery Badge */}
      <div className="absolute top-2 right-2">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-2 shadow-[0_0_20px_rgba(139,0,255,0.6)]">
          <Compass className="w-4 h-4 text-white" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Icon & Title */}
        <div className="flex items-start gap-3">
          <div className="text-4xl">{mission.badge_icon || '🔍'}</div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-1">{mission.title}</h3>
            <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider">
              Missão de Descoberta
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-400 text-sm leading-relaxed">{mission.description}</p>

        {/* Feature to Discover */}
        {mission.discovery_feature && (
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
            <p className="text-purple-300 text-xs mb-1">🎯 Recurso para Explorar:</p>
            <p className="text-white font-semibold text-sm">{mission.discovery_feature}</p>
          </div>
        )}

        {/* Rewards & Action */}
        <div className="flex items-center justify-between pt-2 border-t border-purple-500/20">
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
              <span className="font-bold text-sm">Descoberta!</span>
            </div>
          ) : (
            <Button
              onClick={() => onComplete(mission)}
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold shadow-[0_0_15px_rgba(139,0,255,0.5)]"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Explorar
            </Button>
          )}
        </div>
      </div>
    </NeonCard>
  );
}