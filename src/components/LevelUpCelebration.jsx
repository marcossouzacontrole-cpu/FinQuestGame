import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Crown } from 'lucide-react';
import { LevelUpEffect } from './ParticleEffect';
import { playSound } from './SoundManager';

export default function LevelUpCelebration({ isOpen, onClose, newLevel, rewards }) {
  React.useEffect(() => {
    if (isOpen) {
      playSound('levelup');
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <LevelUpEffect />
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.5, rotateY: -180, opacity: 0 }}
              animate={{ 
                scale: 1, 
                rotateY: 0, 
                opacity: 1,
                transition: {
                  type: "spring",
                  duration: 0.8,
                  bounce: 0.4
                }
              }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-pink-500/50 blur-3xl animate-pulse" />
              
              {/* Main card */}
              <div className="relative bg-gradient-to-b from-slate-900 to-slate-800 rounded-3xl p-8 border-4 border-cyan-500 shadow-[0_0_50px_rgba(0,255,255,0.5)] min-w-[400px]">
                {/* Level number with animation */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ 
                    scale: 1, 
                    rotate: 0,
                    transition: { delay: 0.3, type: "spring" }
                  }}
                  className="text-center mb-6"
                >
                  <div className="relative inline-block">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-xl opacity-50"
                    />
                    <div className="relative bg-gradient-to-br from-cyan-400 to-purple-600 w-32 h-32 rounded-full flex items-center justify-center border-4 border-yellow-400">
                      <Trophy className="w-16 h-16 text-yellow-300" />
                    </div>
                  </div>
                </motion.div>

                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-4xl font-black text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400"
                >
                  LEVEL UP!
                </motion.h2>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="text-6xl font-black text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400"
                >
                  {newLevel}
                </motion.div>

                {/* Rewards */}
                {rewards && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="space-y-3"
                  >
                    <div className="text-center text-gray-300 text-sm mb-2">Recompensas Desbloqueadas:</div>
                    
                    {rewards.skillPoints && (
                      <div className="flex items-center justify-center gap-3 bg-purple-900/30 rounded-lg p-3 border border-purple-500/30">
                        <Zap className="w-6 h-6 text-purple-400" />
                        <span className="text-white font-bold">+{rewards.skillPoints} Skill Points</span>
                      </div>
                    )}

                    {rewards.goldCoins && (
                      <div className="flex items-center justify-center gap-3 bg-yellow-900/30 rounded-lg p-3 border border-yellow-500/30">
                        <Crown className="w-6 h-6 text-yellow-400" />
                        <span className="text-white font-bold">+{rewards.goldCoins} Gold Coins</span>
                      </div>
                    )}

                    {rewards.unlockedFeature && (
                      <div className="text-center text-sm text-cyan-400 bg-cyan-900/20 rounded-lg p-2 border border-cyan-500/30">
                        🎉 {rewards.unlockedFeature}
                      </div>
                    )}
                  </motion.div>
                )}

                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  onClick={onClose}
                  className="w-full mt-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/50"
                >
                  CONTINUAR JORNADA
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}