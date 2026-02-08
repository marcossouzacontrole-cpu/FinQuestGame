import { Lock } from 'lucide-react';

export default function BadgeDisplay({ achievement }) {
  const rarityColors = {
    common: 'from-gray-500 to-gray-700',
    rare: 'from-blue-500 to-cyan-500',
    epic: 'from-purple-500 to-magenta-500',
    legendary: 'from-yellow-500 to-orange-500'
  };

  const rarityGlow = {
    common: 'shadow-[0_0_15px_rgba(156,163,175,0.5)]',
    rare: 'shadow-[0_0_20px_rgba(0,255,255,0.6)]',
    epic: 'shadow-[0_0_25px_rgba(255,0,255,0.7)]',
    legendary: 'shadow-[0_0_30px_rgba(255,215,0,0.8)]'
  };

  return (
    <div 
      className={`relative group ${achievement.unlocked ? 'opacity-100' : 'opacity-40'}`}
    >
      <div 
        className={`
          relative w-24 h-24 rounded-xl border-2 flex items-center justify-center
          bg-gradient-to-br ${rarityColors[achievement.rarity]}
          ${achievement.unlocked ? rarityGlow[achievement.rarity] : 'border-gray-700'}
          transition-all duration-300 hover:scale-110
        `}
      >
        {achievement.unlocked ? (
          <span className="text-4xl">{achievement.icon}</span>
        ) : (
          <Lock className="w-8 h-8 text-gray-600" />
        )}
        
        {/* Shine effect */}
        {achievement.unlocked && (
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent rounded-xl animate-pulse" />
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-[#1a1a2e] border border-cyan-500/30 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10">
        <p className="text-white font-bold text-sm mb-1">{achievement.title}</p>
        <p className="text-gray-400 text-xs mb-2">{achievement.description}</p>
        <div className="flex justify-between items-center">
          <span className={`text-xs font-semibold uppercase ${
            achievement.rarity === 'legendary' ? 'text-yellow-400' :
            achievement.rarity === 'epic' ? 'text-purple-400' :
            achievement.rarity === 'rare' ? 'text-cyan-400' :
            'text-gray-400'
          }`}>
            {achievement.rarity}
          </span>
          {achievement.unlocked && achievement.unlocked_date && (
            <span className="text-gray-500 text-xs">
              {new Date(achievement.unlocked_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}