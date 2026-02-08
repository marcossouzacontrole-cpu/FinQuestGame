import { useState } from 'react';
import { CheckCircle2, Coins, Target, Zap } from 'lucide-react';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MiniGame52Weeks({ onComplete }) {
  const [completedWeeks, setCompletedWeeks] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const totalWeeks = 52;
  const totalSavings = (totalWeeks * (totalWeeks + 1)) / 2;
  const currentSavings = completedWeeks.reduce((sum, week) => sum + week, 0);
  const progress = (completedWeeks.length / totalWeeks) * 100;

  const handleWeekToggle = (weekNumber) => {
    if (completedWeeks.includes(weekNumber)) {
      setCompletedWeeks(completedWeeks.filter(w => w !== weekNumber));
      toast.info(`Semana ${weekNumber} desmarcada`, {
        description: 'Você pode marcá-la novamente quando quiser'
      });
    } else {
      setCompletedWeeks([...completedWeeks, weekNumber]);
      toast.success(`Semana ${weekNumber} completada! 🎉`, {
        description: `Você economizou R$ ${weekNumber},00 esta semana!`
      });

      if (completedWeeks.length + 1 === totalWeeks) {
        setTimeout(() => {
          toast.success('🏆 Desafio 52 Semanas COMPLETO!', {
            description: `Total economizado: R$ ${totalSavings},00!`
          });
          if (onComplete) onComplete(totalSavings);
        }, 500);
      }
    }
  };

  const visibleWeeks = showAll ? totalWeeks : 12;

  return (
    <NeonCard glowColor="cyan">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">Desafio 52 Semanas</h3>
              <p className="text-gray-400 text-sm">Economize R$ 1.378,00 em um ano!</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-cyan-400 text-sm font-semibold">Progresso</p>
            <p className="text-white font-black text-2xl">{completedWeeks.length}/52</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Meta Atual</span>
            <span className="text-cyan-400 font-bold">
              R$ {currentSavings.toFixed(2)} / R$ {totalSavings.toFixed(2)}
            </span>
          </div>
          <div className="relative h-4 bg-[#0a0a1a] rounded-full overflow-hidden border-2 border-cyan-500/50">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
            <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-green-400 font-bold text-lg">{completedWeeks.length}</p>
            <p className="text-gray-400 text-xs">Completas</p>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-center">
            <Coins className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <p className="text-cyan-400 font-bold text-lg">R$ {currentSavings}</p>
            <p className="text-gray-400 text-xs">Economizado</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
            <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-yellow-400 font-bold text-lg">{totalWeeks - completedWeeks.length}</p>
            <p className="text-gray-400 text-xs">Restantes</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm font-semibold">Semanas</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-cyan-400 hover:text-cyan-300"
            >
              {showAll ? 'Mostrar Menos' : 'Mostrar Todas'}
            </Button>
          </div>
          
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: visibleWeeks }, (_, i) => i + 1).map(week => {
              const isCompleted = completedWeeks.includes(week);
              return (
                <button
                  key={week}
                  onClick={() => handleWeekToggle(week)}
                  className={`
                    relative aspect-square rounded-lg border-2 transition-all duration-300
                    flex flex-col items-center justify-center p-2 cursor-pointer
                    ${isCompleted 
                      ? 'bg-green-500/20 border-green-500/50 hover:bg-red-500/20 hover:border-red-500/50' 
                      : 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:scale-110'
                    }
                  `}
                >
                  {isCompleted && (
                    <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-bl-lg flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <span className={`font-bold text-sm ${isCompleted ? 'text-green-400 line-through' : 'text-white'}`}>
                    S{week}
                  </span>
                  <span className={`text-xs ${isCompleted ? 'text-green-400/70' : 'text-gray-400'}`}>
                    R${week}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
          <p className="text-purple-400 text-xs">
            <strong>Como funciona:</strong> Na semana 1, economize R$ 1. Na semana 2, R$ 2. Continue até a semana 52!
            Ao final, você terá economizado R$ 1.378,00 sem grandes sacrifícios. 🎯
          </p>
        </div>
      </div>
    </NeonCard>
  );
}