import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import NeonCard from './NeonCard';
import { Target, Sparkles, Flame, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function NextMissionsWidget({ userData }) {
  const userLevel = userData?.level || 1;

  // Fetch active missions
  const { data: missions = [] } = useQuery({
    queryKey: ['activeMissions'],
    queryFn: () => base44.entities.Mission.filter({ status: 'active' }),
  });

  // Filter and sort missions based on user level
  const recommendedMissions = missions
    .map(mission => {
      // Calculate recommendation score based on difficulty and user level
      let score = 0;
      
      if (mission.difficulty === 'easy' && userLevel <= 3) score = 100;
      else if (mission.difficulty === 'easy' && userLevel <= 5) score = 80;
      else if (mission.difficulty === 'medium' && userLevel >= 3 && userLevel <= 7) score = 100;
      else if (mission.difficulty === 'medium' && userLevel >= 7) score = 70;
      else if (mission.difficulty === 'hard' && userLevel >= 7 && userLevel <= 12) score = 100;
      else if (mission.difficulty === 'hard' && userLevel >= 12) score = 80;
      else if (mission.difficulty === 'legendary' && userLevel >= 10) score = 100;
      else score = 50;

      // Boost daily missions
      if (mission.type === 'daily') score += 20;

      return { ...mission, recommendationScore: score };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, 3);

  const difficultyConfig = {
    easy: { color: 'text-green-400', bg: 'bg-green-500/10', icon: Sparkles, border: 'border-green-500/30' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Flame, border: 'border-yellow-500/30' },
    hard: { color: 'text-orange-400', bg: 'bg-orange-500/10', icon: Zap, border: 'border-orange-500/30' },
    legendary: { color: 'text-purple-400', bg: 'bg-purple-500/10', icon: Target, border: 'border-purple-500/30' }
  };

  return (
    <NeonCard glowColor="cyan">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
          <Target className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Próximas Missões</h3>
          <p className="text-gray-400 text-sm">Recomendadas para Level {userLevel}</p>
        </div>
      </div>

      {recommendedMissions.length > 0 ? (
        <div className="space-y-3">
          {recommendedMissions.map((mission, idx) => {
            const config = difficultyConfig[mission.difficulty] || difficultyConfig.easy;
            const Icon = config.icon;
            
            return (
              <div 
                key={mission.id}
                className={`relative p-3 bg-black/30 rounded-lg border ${config.border} hover:bg-black/40 transition-all group`}
              >
                {idx === 0 && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-cyan-500 to-magenta-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    ✨ TOP
                  </div>
                )}
                
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold text-sm truncate">{mission.title}</h4>
                      {mission.type === 'daily' && (
                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">Diária</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs line-clamp-2 mb-2">{mission.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${config.color}`}>
                        +{mission.xp_reward} XP
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{mission.difficulty}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <Link 
            to={createPageUrl('Missions')}
            className="block w-full text-center py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 font-semibold text-sm transition-all"
          >
            Ver Todas as Missões →
          </Link>
        </div>
      ) : (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Nenhuma missão ativa disponível</p>
          <p className="text-gray-500 text-xs mt-1">Crie novas missões para começar!</p>
        </div>
      )}
    </NeonCard>
  );
}