import { Lock, Check, Zap, TrendingUp, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

const skillsData = [
  {
    id: 'saving_1',
    name: 'Guardião da Poupança I',
    description: '+5% de XP em missões de depósito',
    tree: 'savings',
    icon: Target,
    cost: 1,
    color: 'cyan'
  },
  {
    id: 'saving_2',
    name: 'Guardião da Poupança II',
    description: '+10% de XP em missões de depósito',
    tree: 'savings',
    icon: Target,
    cost: 2,
    requires: 'saving_1',
    color: 'cyan'
  },
  {
    id: 'invest_1',
    name: 'Investidor Aprendiz',
    description: 'Desbloqueia conteúdo "Ações para Iniciantes"',
    tree: 'investment',
    icon: TrendingUp,
    cost: 1,
    color: 'magenta'
  },
  {
    id: 'invest_2',
    name: 'Investidor Avançado',
    description: '+15% de XP em missões de investimento',
    tree: 'investment',
    icon: TrendingUp,
    cost: 2,
    requires: 'invest_1',
    color: 'magenta'
  },
  {
    id: 'xp_1',
    name: 'Acelerador de XP',
    description: '+10% de XP em todas as missões',
    tree: 'general',
    icon: Zap,
    cost: 3,
    color: 'green'
  }
];

export default function SkillTree({ unlockedSkills = [], skillPoints, onUnlock }) {
  const isUnlocked = (skillId) => unlockedSkills.includes(skillId);
  
  const canUnlock = (skill) => {
    if (isUnlocked(skill.id)) return false;
    if (skill.cost > skillPoints) return false;
    if (skill.requires && !isUnlocked(skill.requires)) return false;
    return true;
  };

  const colorClasses = {
    cyan: {
      bg: 'from-cyan-500/20 to-cyan-600/20',
      border: 'border-cyan-500/50',
      text: 'text-cyan-400',
      glow: 'shadow-[0_0_20px_rgba(0,255,255,0.4)]'
    },
    magenta: {
      bg: 'from-magenta-500/20 to-magenta-600/20',
      border: 'border-magenta-500/50',
      text: 'text-magenta-400',
      glow: 'shadow-[0_0_20px_rgba(255,0,255,0.4)]'
    },
    green: {
      bg: 'from-green-500/20 to-green-600/20',
      border: 'border-green-500/50',
      text: 'text-green-400',
      glow: 'shadow-[0_0_20px_rgba(57,255,20,0.4)]'
    }
  };

  return (
    <div className="space-y-6">
      {/* Skill Points Display */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-magenta-500/10 border border-cyan-500/30 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-magenta-500 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,255,0.5)]">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Pontos de Habilidade</p>
            <p className="text-white font-bold text-2xl">{skillPoints}</p>
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skillsData.map((skill) => {
          const Icon = skill.icon;
          const colors = colorClasses[skill.color];
          const unlocked = isUnlocked(skill.id);
          const available = canUnlock(skill);

          return (
            <div
              key={skill.id}
              className={`
                relative bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-4
                ${unlocked ? colors.glow : 'opacity-60'}
                transition-all duration-300
              `}
            >
              {/* Icon */}
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${unlocked ? colors.bg : 'from-gray-700 to-gray-800'} flex items-center justify-center`}>
                  {unlocked ? (
                    <Check className={`w-5 h-5 ${colors.text}`} />
                  ) : available ? (
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                
                <div className={`px-2 py-1 rounded-full ${colors.bg} border ${colors.border}`}>
                  <span className={`text-xs font-bold ${colors.text}`}>
                    {skill.cost} {skill.cost === 1 ? 'Ponto' : 'Pontos'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <h4 className={`${colors.text} font-bold text-sm mb-2`}>
                {skill.name}
              </h4>
              <p className="text-gray-400 text-xs mb-4">
                {skill.description}
              </p>

              {/* Action */}
              {unlocked ? (
                <div className="flex items-center gap-2 text-green-400 text-xs font-semibold">
                  <Check className="w-4 h-4" />
                  Desbloqueada
                </div>
              ) : available ? (
                <Button
                  onClick={() => onUnlock(skill)}
                  className={`w-full bg-gradient-to-r ${colors.bg} border ${colors.border} hover:${colors.glow} text-white font-bold text-xs`}
                >
                  Desbloquear
                </Button>
              ) : (
                <div className="text-gray-500 text-xs">
                  {skill.requires && !isUnlocked(skill.requires) ? 'Requer habilidade anterior' : 'Pontos insuficientes'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}