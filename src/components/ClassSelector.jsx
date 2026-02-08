import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import { Lock, Check, Coins } from 'lucide-react';
import { toast } from 'sonner';

export default function ClassSelector({ user }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const queryClient = useQueryClient();

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.Class.list()
  });

  const changeClass = useMutation({
    mutationFn: async ({ newClass, user }) => {
      // Validações
      if (user.level < newClass.unlock_level) {
        throw new Error(`Você precisa ser nível ${newClass.unlock_level} para desbloquear esta classe`);
      }

      if (newClass.name === user.current_class) {
        throw new Error('Você já está nesta classe');
      }

      if (user.gold_coins < newClass.switch_cost_gold) {
        throw new Error(`Você precisa de ${newClass.switch_cost_gold} Gold Coins (você tem ${user.gold_coins})`);
      }

      // Descontar Gold Coins e trocar classe
      await base44.entities.User.update(user.id, {
        current_class: newClass.name,
        gold_coins: user.gold_coins - newClass.switch_cost_gold
      });

      return { newClass };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['currentUserProfile']);
      setSelectedClass(null);
      toast.success(`🎭 Classe Alterada!`, {
        description: `Você agora é um ${data.newClass.display_name}!`
      });
    },
    onError: (error) => {
      toast.error('Erro ao trocar de classe', {
        description: error.message
      });
    }
  });

  const handleSelectClass = (classData) => {
    setSelectedClass(classData);
  };

  const handleConfirmChange = () => {
    if (selectedClass) {
      changeClass.mutate({ newClass: selectedClass, user });
    }
  };

  const currentClassData = classes.find(c => c.name === user?.current_class);

  return (
    <div className="space-y-6">
      {/* Current Class Display */}
      {currentClassData && (
        <NeonCard glowColor="gold" className="border-2 border-yellow-500/50">
          <div className="flex items-center gap-4">
            <div className="text-6xl">{currentClassData.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl font-bold text-white">{currentClassData.display_name}</h3>
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-gray-400 text-sm mb-2">{currentClassData.description}</p>
              <div className="bg-[#0a0a1a]/50 rounded-lg p-3 border border-yellow-500/20">
                <p className="text-yellow-400 text-xs font-semibold uppercase mb-1">Habilidade Passiva:</p>
                <p className="text-gray-300 text-sm">{currentClassData.passive_ability}</p>
              </div>
            </div>
          </div>
        </NeonCard>
      )}

      {/* Available Classes Grid */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Classes Disponíveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map(classData => {
            const isCurrentClass = classData.name === user?.current_class;
            const isLocked = user?.level < classData.unlock_level;
            const canAfford = user?.gold_coins >= classData.switch_cost_gold;

            return (
              <NeonCard 
                key={classData.id} 
                glowColor={isCurrentClass ? "gold" : "cyan"}
                className={`cursor-pointer transition-all ${
                  selectedClass?.id === classData.id ? 'ring-2 ring-cyan-400' : ''
                } ${isLocked ? 'opacity-50' : ''}`}
                onClick={() => !isLocked && !isCurrentClass && handleSelectClass(classData)}
              >
                <div className="relative">
                  {isLocked && (
                    <div className="absolute top-2 right-2 bg-red-500/20 border border-red-500/50 rounded-full p-2">
                      <Lock className="w-4 h-4 text-red-400" />
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className="text-4xl">{classData.icon}</div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold text-lg mb-1">{classData.display_name}</h4>
                      <p className="text-gray-400 text-xs mb-3">{classData.description}</p>
                      
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-[#0a0a1a]/50 rounded p-2">
                          <p className="text-cyan-400 text-xs">XP Bônus</p>
                          <p className="text-white font-bold text-sm">+{classData.xp_bonus_percent}%</p>
                        </div>
                        <div className="bg-[#0a0a1a]/50 rounded p-2">
                          <p className="text-green-400 text-xs">Patrimônio</p>
                          <p className="text-white font-bold text-sm">+{classData.wealth_bonus_percent}%</p>
                        </div>
                      </div>

                      {/* Cost and Unlock Level */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <Coins className="w-3 h-3 text-yellow-400" />
                          <span className={`font-semibold ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
                            {classData.switch_cost_gold} Gold
                          </span>
                        </div>
                        <div className="text-gray-400">
                          Nível {classData.unlock_level}+
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </NeonCard>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedClass && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <NeonCard glowColor="purple" className="max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-2">Confirmar Troca de Classe</h3>
            <p className="text-gray-300 mb-4">
              Você deseja se tornar um <span className="text-cyan-400 font-bold">{selectedClass.display_name}</span>?
            </p>
            <div className="bg-[#0a0a1a]/50 rounded-lg p-4 border border-red-500/20 mb-4">
              <p className="text-red-400 text-sm font-semibold mb-2">Custo:</p>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-bold">{selectedClass.switch_cost_gold} Gold Coins</span>
              </div>
              <p className="text-gray-400 text-xs mt-2">
                Saldo atual: {user?.gold_coins || 0} Gold Coins
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setSelectedClass(null)}
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmChange}
                disabled={changeClass.isLoading}
                className="bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600 text-white font-bold"
              >
                {changeClass.isLoading ? 'Trocando...' : 'Confirmar Troca'}
              </Button>
            </div>
          </NeonCard>
        </div>
      )}
    </div>
  );
}