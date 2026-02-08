import { BookOpen, Brain, Trophy, Rocket, Star, Zap } from 'lucide-react';
import NeonCard from './NeonCard';

const JOURNEY_STAGES = [
  {
    id: 'novice',
    name: 'Novato Financeiro',
    icon: '🌱',
    modules: 0,
    color: '#00FFFF',
    description: 'Começando sua jornada'
  },
  {
    id: 'learner',
    name: 'Aprendiz',
    icon: '📚',
    modules: 5,
    color: '#8A2BE2',
    description: 'Absorvendo conhecimento'
  },
  {
    id: 'practitioner',
    name: 'Praticante',
    icon: '💡',
    modules: 10,
    color: '#39FF14',
    description: 'Aplicando conceitos'
  },
  {
    id: 'expert',
    name: 'Especialista',
    icon: '🎓',
    modules: 20,
    color: '#FFD700',
    description: 'Domínio consolidado'
  },
  {
    id: 'master',
    name: 'Mestre Financeiro',
    icon: '👑',
    modules: 35,
    color: '#FF00FF',
    description: 'Conhecimento profundo'
  },
  {
    id: 'guru',
    name: 'Guru das Finanças',
    icon: '⚡',
    modules: 50,
    color: '#FF8C00',
    description: 'Sabedoria máxima'
  }
];

const SKILL_CATEGORIES = [
  { name: 'Poupança', icon: '🏦', progress: 0, color: '#00FFFF' },
  { name: 'Investimento', icon: '📈', progress: 0, color: '#8A2BE2' },
  { name: 'Orçamento', icon: '💰', progress: 0, color: '#39FF14' },
  { name: 'Mentalidade', icon: '🧠', progress: 0, color: '#FFD700' }
];

export default function LearningJourney({ completedModules = [], dailyContentsRead = 0 }) {
  const modulesCount = completedModules.length + dailyContentsRead;
  
  // Calculate category progress
  const categoryProgress = SKILL_CATEGORIES.map(cat => {
    const categoryModules = completedModules.filter(m => {
      const triggerMap = {
        overspending: 'Orçamento',
        no_investment: 'Investimento',
        goal_achieved: 'Poupança',
        streak_milestone: 'Mentalidade',
        level_up: 'Mentalidade'
      };
      return triggerMap[m.trigger_type] === cat.name;
    });
    
    return {
      ...cat,
      progress: Math.min((categoryModules.length / 10) * 100, 100),
      count: categoryModules.length
    };
  });
  
  // Find current stage
  const currentStageIndex = JOURNEY_STAGES.findIndex(
    (stage, idx) => modulesCount < stage.modules || idx === JOURNEY_STAGES.length - 1
  );
  const currentStage = JOURNEY_STAGES[Math.max(0, currentStageIndex)];
  const nextStage = JOURNEY_STAGES[currentStageIndex + 1];
  
  return (
    <NeonCard glowColor="magenta" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-magenta-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-magenta-500 to-purple-500 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Jornada de Aprendizado</h3>
            <p className="text-gray-400 text-sm">Seu progresso educacional visualizado</p>
          </div>
        </div>

        {/* Current Stage */}
        <div className="mb-6 bg-gradient-to-r from-magenta-500/20 to-purple-500/20 rounded-xl p-6 border border-magenta-500/30">
          <div className="text-center">
            <span className="text-6xl mb-3 block drop-shadow-[0_0_20px_rgba(255,0,255,0.8)]">
              {currentStage.icon}
            </span>
            <h4 className="text-white font-bold text-2xl mb-1">{currentStage.name}</h4>
            <p className="text-gray-400 text-sm mb-4">{currentStage.description}</p>
            <div className="flex items-center justify-center gap-2">
              <BookOpen className="w-4 h-4 text-magenta-400" />
              <p className="text-magenta-400 font-bold">
                {modulesCount} conteúdos completados
              </p>
            </div>
          </div>
        </div>

        {/* Journey Path */}
        <div className="mb-6">
          <h4 className="text-cyan-400 font-semibold text-sm mb-4 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Caminho de Progresso
          </h4>
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/30 to-magenta-500/30" />
            
            <div className="space-y-4">
              {JOURNEY_STAGES.map((stage, index) => {
                const isCompleted = modulesCount >= stage.modules;
                const isCurrent = stage.id === currentStage.id;
                
                return (
                  <div key={stage.id} className="relative flex items-center gap-4">
                    {/* Node */}
                    <div
                      className={`
                        relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-2xl
                        ${isCompleted 
                          ? 'bg-gradient-to-br from-cyan-500 to-magenta-500 shadow-[0_0_20px_rgba(0,255,255,0.5)]' 
                          : isCurrent
                          ? 'bg-gradient-to-br from-magenta-500/50 to-purple-500/50 border-2 border-magenta-400 animate-pulse'
                          : 'bg-gray-800/50 border-2 border-gray-700 grayscale opacity-40'
                        }
                      `}
                    >
                      {stage.icon}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1">
                      <h5 className={`font-bold ${isCompleted || isCurrent ? 'text-white' : 'text-gray-600'}`}>
                        {stage.name}
                      </h5>
                      <p className={`text-xs ${isCompleted || isCurrent ? 'text-gray-400' : 'text-gray-700'}`}>
                        {stage.modules} conteúdos necessários
                      </p>
                    </div>
                    
                    {/* Status */}
                    {isCompleted && <Trophy className="w-5 h-5 text-yellow-400" />}
                    {isCurrent && <Zap className="w-5 h-5 text-magenta-400 animate-pulse" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Next Milestone */}
        {nextStage && (
          <div className="bg-[#0a0a1a] rounded-xl p-4 border border-cyan-500/30 mb-6">
            <p className="text-gray-400 text-sm mb-2">Próximo Marco:</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{nextStage.icon}</span>
                <p className="text-white font-bold">{nextStage.name}</p>
              </div>
              <p className="text-cyan-400 font-bold text-sm">
                {nextStage.modules - modulesCount} conteúdos restantes
              </p>
            </div>
          </div>
        )}

        {/* Skill Tree - Category Progress */}
        <div>
          <h4 className="text-purple-400 font-semibold text-sm mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Árvore de Habilidades
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {categoryProgress.map(cat => (
              <div key={cat.name} className="bg-[#0a0a1a] rounded-xl p-3 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{cat.name}</p>
                    <p className="text-gray-500 text-xs">{cat.count}/10 módulos</p>
                  </div>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-magenta-500 transition-all duration-500"
                    style={{ width: `${cat.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </NeonCard>
  );
}