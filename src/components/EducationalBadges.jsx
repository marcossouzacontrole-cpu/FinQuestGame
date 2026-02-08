import { Trophy, Award } from 'lucide-react';
import NeonCard from './NeonCard';

const EDUCATIONAL_BADGES = [
  {
    id: 'first_module',
    name: 'Primeiro Passo',
    icon: '📚',
    description: 'Complete seu primeiro módulo',
    requirement: 1,
    xp: 50,
    color: '#00FFFF'
  },
  {
    id: 'knowledge_seeker',
    name: 'Buscador de Conhecimento',
    icon: '🔍',
    description: 'Complete 5 módulos',
    requirement: 5,
    xp: 100,
    color: '#8A2BE2'
  },
  {
    id: 'financial_scholar',
    name: 'Estudioso Financeiro',
    icon: '🎓',
    description: 'Complete 10 módulos',
    requirement: 10,
    xp: 200,
    color: '#FFD700'
  },
  {
    id: 'master_learner',
    name: 'Mestre do Aprendizado',
    icon: '👑',
    description: 'Complete 20 módulos',
    requirement: 20,
    xp: 500,
    color: '#FF00FF'
  },
  {
    id: 'video_consumer',
    name: 'Devorador de Conteúdo',
    icon: '📺',
    description: 'Assista 10 vídeos diários',
    requirement: 10,
    xp: 150,
    color: '#39FF14'
  },
  {
    id: 'daily_learner',
    name: 'Aprendiz Diário',
    icon: '⏰',
    description: 'Complete módulos por 7 dias seguidos',
    requirement: 7,
    xp: 300,
    color: '#FF8C00'
  },
  {
    id: 'concept_master',
    name: 'Domínio de Conceitos',
    icon: '💡',
    description: 'Complete módulos de todas as categorias',
    requirement: 4,
    xp: 250,
    color: '#00CED1'
  },
  {
    id: 'knowledge_warrior',
    name: 'Guerreiro do Saber',
    icon: '⚔️',
    description: 'Complete 50 módulos educacionais',
    requirement: 50,
    xp: 1000,
    color: '#DC143C'
  }
];

export default function EducationalBadges({ userData, completedModules = [], videosWatched = 0 }) {
  // Extract real progress from userData (synchronized with completeAcademyQuiz.ts)
  const academyProgress = userData?.academy_progress || {};
  const completedModulesCount = completedModules.length || Object.keys(academyProgress).length;
  const userLevel = userData?.level || 1;
  const learningStreak = userData?.learning_streak || 0;

  // Track categories completed (if stored in metadata)
  const categories = Object.values(academyProgress).reduce((acc, progress) => {
    if (progress.category) acc.add(progress.category);
    return acc;
  }, new Set());

  const earnedBadges = EDUCATIONAL_BADGES.map(badge => {
    let isEarned = false;

    switch (badge.id) {
      case 'first_module':
      case 'knowledge_seeker':
      case 'financial_scholar':
      case 'master_learner':
      case 'knowledge_warrior':
        isEarned = completedModulesCount >= badge.requirement;
        break;
      case 'video_consumer':
        // Mapping level as a proxy for "content consumption" if video tracking is unavailable
        isEarned = userLevel >= (badge.requirement / 2);
        break;
      case 'daily_learner':
        isEarned = learningStreak >= badge.requirement;
        break;
      case 'concept_master':
        isEarned = categories.size >= badge.requirement;
        break;
      default:
        isEarned = false;
    }

    return { ...badge, earned: isEarned };
  });

  const earned = earnedBadges.filter(b => b.earned);
  const locked = earnedBadges.filter(b => !b.earned);

  return (
    <NeonCard glowColor="purple" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" />

      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Badges Educacionais</h3>
              <p className="text-gray-400 text-sm">
                {earned.length} de {EDUCATIONAL_BADGES.length} desbloqueados
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-purple-400 text-sm font-semibold">Total de XP</p>
            <p className="text-white text-2xl font-black">
              {earned.reduce((sum, b) => sum + b.xp, 0)} XP
            </p>
          </div>
        </div>

        {/* Earned Badges */}
        {earned.length > 0 && (
          <div className="mb-6">
            <h4 className="text-cyan-400 font-semibold text-sm mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Conquistados
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {earned.map((badge) => (
                <div
                  key={badge.id}
                  className="bg-gradient-to-br from-[#1a1a2e]/90 to-[#0f0f1e]/90 rounded-xl p-3 border-2 border-purple-500/50 shadow-[0_0_20px_rgba(138,43,226,0.3)] hover:scale-105 transition-transform duration-300"
                  style={{ borderColor: `${badge.color}50` }}
                >
                  <div className="text-center">
                    <span className="text-4xl mb-2 block drop-shadow-[0_0_10px_rgba(138,43,226,0.8)]">
                      {badge.icon}
                    </span>
                    <h5 className="text-white font-bold text-xs mb-1">{badge.name}</h5>
                    <p className="text-gray-400 text-xs mb-2">{badge.description}</p>
                    <div className="bg-purple-500/20 rounded-lg px-2 py-1 border border-purple-500/30">
                      <span className="text-purple-400 text-xs font-bold">+{badge.xp} XP</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Badges */}
        {locked.length > 0 && (
          <div>
            <h4 className="text-gray-500 font-semibold text-sm mb-3 flex items-center gap-2">
              🔒 Bloqueados
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {locked.map((badge) => (
                <div
                  key={badge.id}
                  className="bg-[#0a0a1a]/80 rounded-xl p-3 border border-gray-700/50 opacity-60 hover:opacity-80 transition-opacity"
                >
                  <div className="text-center">
                    <span className="text-4xl mb-2 block grayscale opacity-40">{badge.icon}</span>
                    <h5 className="text-gray-500 font-bold text-xs mb-1">{badge.name}</h5>
                    <p className="text-gray-600 text-xs mb-2">{badge.description}</p>
                    <div className="bg-gray-800/50 rounded-lg px-2 py-1 border border-gray-700/30">
                      <span className="text-gray-600 text-xs font-bold">+{badge.xp} XP</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {earned.length === EDUCATIONAL_BADGES.length && (
          <div className="mt-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30">
            <p className="text-yellow-400 font-bold text-center">
              🏆 INCRÍVEL! Você desbloqueou TODOS os badges educacionais! 🏆
            </p>
          </div>
        )}
      </div>
    </NeonCard>
  );
}