import { Calendar, Trophy, CheckCircle2 } from 'lucide-react';
import NeonCard from './NeonCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function VaultTimeline({ goals }) {
  const completedGoals = goals
    .filter(g => g.status === 'completed' && g.completed_date)
    .sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date));

  if (completedGoals.length === 0) {
    return (
      <NeonCard glowColor="cyan">
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Suas conquistas aparecerão aqui quando você completar metas!</p>
        </div>
      </NeonCard>
    );
  }

  return (
    <NeonCard glowColor="cyan">
      <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-cyan-400" />
        Timeline de Conquistas
      </h3>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-magenta-500 to-cyan-500" />
        
        <div className="space-y-6">
          {completedGoals.map((goal, index) => (
            <div key={goal.id} className="relative pl-12">
              <div className="absolute left-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-magenta-500 flex items-center justify-center border-4 border-[#0a0a1a]">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              
              <div className="bg-gradient-to-br from-[#1a1a2e]/90 to-[#0f0f1e]/90 rounded-lg p-4 border border-cyan-500/30 hover:border-cyan-500/50 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{goal.icon}</span>
                    <div>
                      <h4 className="text-white font-bold">{goal.legendary_item}</h4>
                      <p className="text-gray-400 text-sm">{goal.name}</p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                
                <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-gray-700">
                  <span className="text-cyan-400 font-semibold">
                    R$ {goal.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-gray-400">
                    {format(new Date(goal.completed_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </NeonCard>
  );
}