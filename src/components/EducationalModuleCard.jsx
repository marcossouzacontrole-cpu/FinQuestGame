import { useState } from 'react';
import { BookOpen, CheckCircle2, Coins, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';

const TRIGGER_COLORS = {
  overspending: 'from-red-500 to-orange-500',
  level_up: 'from-cyan-500 to-blue-500',
  no_investment: 'from-purple-500 to-pink-500',
  goal_achieved: 'from-green-500 to-emerald-500',
  streak_milestone: 'from-yellow-500 to-orange-500'
};

const TRIGGER_LABELS = {
  overspending: '💸 Gastos Elevados',
  level_up: '⬆️ Novo Nível',
  no_investment: '💎 Começar a Investir',
  goal_achieved: '🎯 Meta Alcançada',
  streak_milestone: '🔥 Sequência Forte'
};

export default function EducationalModuleCard({ module, onComplete }) {
  const [expanded, setExpanded] = useState(false);
  const triggerColor = TRIGGER_COLORS[module.trigger_type] || 'from-gray-500 to-gray-600';
  const triggerLabel = TRIGGER_LABELS[module.trigger_type] || 'Módulo';

  return (
    <NeonCard glowColor={module.completed ? 'green' : 'cyan'} className="relative">
      {module.completed && (
        <div className="absolute top-3 right-3">
          <div className="bg-green-500 rounded-full p-1">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${triggerColor} flex items-center justify-center flex-shrink-0`}>
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r ${triggerColor} text-white mb-2`}>
              {triggerLabel}
            </span>
            <h3 className="text-white font-bold text-lg leading-tight">
              {module.title}
            </h3>
          </div>
        </div>

        {/* Concept */}
        <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-cyan-500/20">
          <p className="text-gray-300 text-sm leading-relaxed">
            {module.concept}
          </p>
        </div>

        {/* Expandable Content */}
        {expanded && (
          <>
            {/* Personal Impact */}
            {module.personal_impact && (
              <div className="bg-magenta-500/10 rounded-lg p-3 border border-magenta-500/30">
                <h4 className="text-magenta-400 font-semibold text-sm mb-2">
                  📊 Seu Cenário
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {module.personal_impact}
                </p>
              </div>
            )}

            {/* Actions */}
            <div>
              <h4 className="text-cyan-400 font-semibold text-sm mb-3 flex items-center gap-2">
                ✅ Ações Práticas
              </h4>
              <div className="space-y-2">
                {module.actions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold text-sm mt-0.5">{idx + 1}.</span>
                    <p className="text-gray-300 text-sm flex-1">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 font-semibold text-sm">
                +{module.xp_reward} XP
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-semibold text-sm">
                +{module.gold_reward}
              </span>
            </div>
          </div>

          {!module.completed && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setExpanded(!expanded)}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Ver Mais
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
              {expanded && (
                <Button
                  onClick={() => onComplete(module)}
                  className="bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600 text-white font-semibold"
                  size="sm"
                >
                  Completar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </NeonCard>
  );
}