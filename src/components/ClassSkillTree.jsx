import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import { Lock, Check, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function ClassSkillTree({ user }) {
  const queryClient = useQueryClient();

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.Class.list()
  });

  const { data: allSkills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: () => base44.entities.Skill.list()
  });

  const currentClass = classes.find(c => c.name === user?.current_class);
  const classSkills = allSkills.filter(s => s.class_name === user?.current_class);

  const unlockSkill = useMutation({
    mutationFn: async ({ skill, user }) => {
      // Validações
      if (user.unlocked_skills?.includes(skill.skill_id)) {
        throw new Error('Habilidade já desbloqueada');
      }

      if (user.skill_points < skill.unlock_cost_sp) {
        throw new Error(`Você precisa de ${skill.unlock_cost_sp} Skill Points (você tem ${user.skill_points})`);
      }

      // Verificar se as habilidades necessárias estão desbloqueadas
      if (skill.required_skills?.length > 0) {
        const hasRequirements = skill.required_skills.every(reqSkill => 
          user.unlocked_skills?.includes(reqSkill)
        );
        if (!hasRequirements) {
          throw new Error('Você precisa desbloquear habilidades anteriores primeiro');
        }
      }

      // Desbloquear
      const newUnlockedSkills = [...(user.unlocked_skills || []), skill.skill_id];
      const newSkillPoints = user.skill_points - skill.unlock_cost_sp;

      await base44.entities.User.update(user.id, {
        unlocked_skills: newUnlockedSkills,
        skill_points: newSkillPoints
      });

      return { skill };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['currentUserProfile']);
      toast.success('⚡ Habilidade Desbloqueada!', {
        description: `${data.skill.name} foi adicionada ao seu arsenal!`
      });
    },
    onError: (error) => {
      toast.error('Erro ao desbloquear habilidade', {
        description: error.message
      });
    }
  });

  const handleUnlockSkill = (skill) => {
    unlockSkill.mutate({ skill, user });
  };

  // Agrupar por tier
  const skillsByTier = {
    1: classSkills.filter(s => s.tier === 1),
    2: classSkills.filter(s => s.tier === 2),
    3: classSkills.filter(s => s.tier === 3)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            {currentClass?.icon} Árvore de {currentClass?.display_name}
          </h3>
          <p className="text-gray-400 text-sm">Desbloqueie habilidades para potencializar seu progresso</p>
        </div>
        <div className="bg-gradient-to-r from-cyan-500/20 to-magenta-500/20 border border-cyan-500/50 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <span className="text-white font-bold text-lg">{user?.skill_points || 0}</span>
            <span className="text-gray-400 text-sm">SP disponíveis</span>
          </div>
        </div>
      </div>

      {/* Skills by Tier */}
      {[1, 2, 3].map(tier => (
        <div key={tier}>
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span className="text-cyan-400">Tier {tier}</span>
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/50 to-transparent" />
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {skillsByTier[tier].map(skill => {
              const isUnlocked = user?.unlocked_skills?.includes(skill.skill_id);
              const hasRequirements = skill.required_skills?.length > 0 
                ? skill.required_skills.every(reqSkill => user?.unlocked_skills?.includes(reqSkill))
                : true;
              const canAfford = user?.skill_points >= skill.unlock_cost_sp;
              const isLocked = !hasRequirements || !canAfford;

              return (
                <NeonCard 
                  key={skill.id}
                  glowColor={isUnlocked ? "green" : isLocked ? "red" : "cyan"}
                  className={`relative ${isLocked && !isUnlocked ? 'opacity-60' : ''}`}
                >
                  {isUnlocked && (
                    <div className="absolute top-2 right-2 bg-green-500/20 border border-green-500/50 rounded-full p-1">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                  )}
                  {isLocked && !isUnlocked && (
                    <div className="absolute top-2 right-2 bg-red-500/20 border border-red-500/50 rounded-full p-1">
                      <Lock className="w-4 h-4 text-red-400" />
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{skill.icon}</div>
                      <div className="flex-1">
                        <h5 className="text-white font-bold text-sm mb-1">{skill.name}</h5>
                        <p className="text-gray-400 text-xs mb-2">{skill.description}</p>
                        
                        <div className="bg-[#0a0a1a]/50 rounded p-2 border border-cyan-500/20">
                          <p className="text-cyan-400 text-xs font-semibold">Efeito:</p>
                          <p className="text-white text-xs">
                            {skill.effect_type === 'xp_boost' && `+${skill.effect_value}% XP`}
                            {skill.effect_type === 'gold_boost' && `+${skill.effect_value}% Gold`}
                            {skill.effect_type === 'mission_boost' && `+${skill.effect_value}% XP em missões`}
                            {skill.effect_type === 'goal_boost' && `+${skill.effect_value}% progresso em metas`}
                            {skill.effect_type === 'cost_reduction' && `-${skill.effect_value}% custo`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {!isUnlocked && (
                      <Button
                        onClick={() => handleUnlockSkill(skill)}
                        disabled={isLocked || unlockSkill.isLoading}
                        className="w-full bg-gradient-to-r from-cyan-500 to-magenta-500 hover:from-cyan-600 hover:to-magenta-600 text-white font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLocked ? `Requer ${skill.unlock_cost_sp} SP` : `Desbloquear (${skill.unlock_cost_sp} SP)`}
                      </Button>
                    )}
                    {isUnlocked && (
                      <div className="flex items-center justify-center gap-1 text-green-400 text-xs font-semibold">
                        <Check className="w-3 h-3" />
                        Ativa
                      </div>
                    )}
                  </div>
                </NeonCard>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}