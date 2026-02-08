import { Zap } from 'lucide-react';

export default function XPBar({ level, currentXP, xpToNextLevel }) {
  const progress = (currentXP / xpToNextLevel) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-cyan-500 to-magenta-500 rounded-full p-2">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm">Nível {level}</span>
        </div>
        <span className="text-cyan-400 text-sm font-mono">
          {currentXP} / {xpToNextLevel} XP
        </span>
      </div>
      
      <div className="relative h-3 bg-[#1a1a2e] rounded-full overflow-hidden border border-cyan-500/30">
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-magenta-500 to-cyan-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
        </div>
        
        {/* Efeito de brilho */}
        <div 
          className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent blur-sm animate-pulse"
          style={{ left: `${Math.max(0, progress - 10)}%` }}
        />
      </div>
    </div>
  );
}