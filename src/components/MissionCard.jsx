import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import DynamicMissionVerification from './DynamicMissionVerification';
import { MissionCompleteEffect } from './ParticleEffect';
import { playSound } from './SoundManager';

export default function MissionCard({ mission, onComplete }) {
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [useDynamicVerification, setUseDynamicVerification] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  const difficultyConfig = {
    easy: { color: 'green', label: 'Fácil', glow: 'rgba(57,255,20,0.4)' },
    medium: { color: 'cyan', label: 'Médio', glow: 'rgba(0,255,255,0.4)' },
    hard: { color: 'magenta', label: 'Difícil', glow: 'rgba(255,0,255,0.4)' },
    legendary: { color: 'gold', label: 'Lendário', glow: 'rgba(255,215,0,0.6)' }
  };

  const typeIcons = {
    daily: '⚡',
    weekly: '📅',
    campaign: '🏆',
    discovery: '🔍',
    collaboration: '🤝',
    weekly_challenge: '👑'
  };

  const config = difficultyConfig[mission.difficulty] || difficultyConfig.easy;

  const handleOpenVerification = () => {
    setShowVerificationModal(true);
  };

  const handleClose = () => {
    setShowVerificationModal(false);
  };

  const handleMissionComplete = (...args) => {
    setShowCelebration(true);
    playSound('mission');
    setTimeout(() => setShowCelebration(false), 2000);
    if (onComplete) onComplete(...args);
  };

  if (mission.status === 'completed') {
    return (
      <NeonCard glowColor="green" className="opacity-75">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{typeIcons[mission.type]}</span>
                <h3 className="text-white font-bold line-through">{mission.title}</h3>
              </div>
              <p className="text-gray-500 text-sm line-clamp-2">{mission.description}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-green-500/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-bold text-sm">CONCLUÍDA</span>
            </div>
          </div>
        </div>
      </NeonCard>
    );
  }

  return (
    <>
      {showCelebration && <MissionCompleteEffect />}
      <NeonCard glowColor={config.color} className="hover:scale-105 transition-transform">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{typeIcons[mission.type]}</span>
                <h3 className="text-white font-bold">{mission.title}</h3>
              </div>
              <p className="text-gray-400 text-sm line-clamp-2">{mission.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className={`bg-${config.color}-500/20 border border-${config.color}-500/30 rounded-lg px-2 py-1`}>
              <span className={`text-${config.color}-400 font-bold text-xs`}>{config.label}</span>
            </div>
            <div className="relative bg-gradient-to-br from-purple-900/40 to-magenta-900/40 border-2 border-purple-500/60 rounded-lg px-3 py-1 shadow-[0_0_15px_rgba(147,51,234,0.5)]">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-magenta-500/10 rounded-lg animate-pulse" />
              <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400 font-black text-sm drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]">
                +{mission.xp_reward} XP
              </span>
            </div>
            {mission.gold_reward > 0 && (
              <div className="bg-yellow-500/20 rounded-lg px-2 py-1 border border-yellow-500/30">
                <span className="text-yellow-400 font-bold text-xs">+{mission.gold_reward} Gold</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleOpenVerification}
            className="w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold py-3 shadow-[0_0_20px_rgba(57,255,20,0.4)]"
          >
            <HelpCircle className="w-5 h-5 mr-2" />
            Verificar Conclusão
          </Button>
        </div>
      </NeonCard>

      {/* Dynamic Verification Modal */}
      {showVerificationModal && createPortal(
        <motion.div 
          className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          style={{ zIndex: 999999 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl"
          >
            <NeonCard glowColor="cyan" className="shadow-[0_0_100px_rgba(0,255,255,0.5)]">
              <DynamicMissionVerification
                mission={mission}
                onComplete={handleMissionComplete}
                onClose={handleClose}
              />
            </NeonCard>
          </motion.div>
        </motion.div>,
        document.body
      )}
    </>
  );
}