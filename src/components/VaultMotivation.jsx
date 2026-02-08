import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';

export default function VaultMotivation({ goals }) {
  const activeGoals = goals.filter(g => g.status === 'forging');
  
  const motivationMessage = useMemo(() => {
    if (activeGoals.length === 0) {
      return {
        message: "Crie sua primeira meta e comece a forjar seu futuro financeiro! 🎯",
        color: "text-cyan-400"
      };
    }

    const nearestGoal = activeGoals.reduce((nearest, goal) => {
      const progress = ((goal.current_amount || 0) / goal.target_amount) * 100;
      const nearestProgress = ((nearest.current_amount || 0) / nearest.target_amount) * 100;
      return progress > nearestProgress ? goal : nearest;
    });

    const progress = ((nearestGoal.current_amount || 0) / nearestGoal.target_amount) * 100;

    if (progress >= 95) {
      return {
        message: `🔥 Apenas ${(100 - progress).toFixed(1)}% para completar "${nearestGoal.name}"! Você está QUASE LÁ!`,
        color: "text-green-400"
      };
    } else if (progress >= 80) {
      return {
        message: `⚡ Faltam apenas ${(100 - progress).toFixed(0)}% para sua próxima conquista! Continue assim!`,
        color: "text-yellow-400"
      };
    } else if (progress >= 50) {
      return {
        message: `💪 Você já está na metade do caminho! "${nearestGoal.name}" está cada vez mais perto!`,
        color: "text-cyan-400"
      };
    } else if (progress >= 25) {
      return {
        message: `🌟 Ótimo progresso em "${nearestGoal.name}"! Cada depósito te aproxima do objetivo!`,
        color: "text-purple-400"
      };
    } else {
      return {
        message: `🚀 O início é sempre o mais importante! Continue depositando em "${nearestGoal.name}"!`,
        color: "text-magenta-400"
      };
    }
  }, [activeGoals]);

  return (
    <div className="bg-gradient-to-r from-purple-500/20 via-magenta-500/20 to-cyan-500/20 border border-purple-500/30 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
        <p className={`${motivationMessage.color} font-semibold text-lg`}>
          {motivationMessage.message}
        </p>
      </div>
    </div>
  );
}