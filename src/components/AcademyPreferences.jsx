import { useState } from 'react';
import { Settings, Target, BookOpen, TrendingUp, Save } from 'lucide-react';
import NeonCard from './NeonCard';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const KNOWLEDGE_LEVELS = [
  { value: '1', label: 'Iniciante Total', description: 'Nunca estudei finanças' },
  { value: '2', label: 'Iniciante', description: 'Conheço o básico' },
  { value: '3', label: 'Intermediário', description: 'Já invisto e controlo gastos' },
  { value: '4', label: 'Avançado', description: 'Experiência com investimentos' },
  { value: '5', label: 'Expert', description: 'Profissional da área' }
];

const LEARNING_GOALS = [
  { id: 'debt_free', label: '💳 Sair das Dívidas', icon: '💳' },
  { id: 'emergency_fund', label: '🛡️ Criar Reserva de Emergência', icon: '🛡️' },
  { id: 'investments', label: '📈 Aprender a Investir', icon: '📈' },
  { id: 'budget_control', label: '💰 Controlar Orçamento', icon: '💰' },
  { id: 'passive_income', label: '💵 Gerar Renda Passiva', icon: '💵' },
  { id: 'retirement', label: '🏖️ Planejar Aposentadoria', icon: '🏖️' },
  { id: 'financial_freedom', label: '🎯 Independência Financeira', icon: '🎯' },
  { id: 'mindset', label: '🧠 Mentalidade Financeira', icon: '🧠' }
];

const CONTENT_PREFERENCES = [
  { id: 'practical', label: '⚡ Ações Práticas', description: 'Passo a passo e tutoriais' },
  { id: 'theory', label: '📚 Teoria e Conceitos', description: 'Entender fundamentos' },
  { id: 'examples', label: '💡 Exemplos Reais', description: 'Casos e simulações' },
  { id: 'advanced', label: '🚀 Conteúdo Avançado', description: 'Estratégias complexas' }
];

export default function AcademyPreferences({ user }) {
  const queryClient = useQueryClient();

  const [preferences, setPreferences] = useState({
    knowledge_level: user?.financial_knowledge_level || '2',
    learning_goals: user?.academy_learning_goals || [],
    content_style: user?.academy_content_style || ['practical', 'examples'],
    preferred_topics: user?.academy_preferred_topics || []
  });

  const updatePreferences = useMutation({
    mutationFn: async (prefs) => {
      await base44.entities.User.update(user.id, {
        financial_knowledge_level: prefs.knowledge_level,
        academy_learning_goals: prefs.learning_goals,
        academy_content_style: prefs.content_style,
        academy_preferred_topics: prefs.preferred_topics
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUserProfile']);
      toast.success('✅ Preferências atualizadas!', {
        description: 'Futuros conteúdos serão personalizados para você'
      });
    },
    onError: () => {
      toast.error('Erro ao salvar preferências');
    }
  });

  const handleSave = () => {
    if (preferences.learning_goals.length === 0) {
      toast.error('Selecione pelo menos um objetivo de aprendizado');
      return;
    }
    updatePreferences.mutate(preferences);
  };

  const toggleGoal = (goalId) => {
    setPreferences(prev => ({
      ...prev,
      learning_goals: prev.learning_goals.includes(goalId)
        ? prev.learning_goals.filter(g => g !== goalId)
        : [...prev.learning_goals, goalId]
    }));
  };

  const toggleStyle = (styleId) => {
    setPreferences(prev => ({
      ...prev,
      content_style: prev.content_style.includes(styleId)
        ? prev.content_style.filter(s => s !== styleId)
        : [...prev.content_style, styleId]
    }));
  };

  return (
    <NeonCard glowColor="purple" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" />

      <div className="relative space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Preferências de Aprendizado</h3>
            <p className="text-gray-400 text-sm">Personalize o conteúdo gerado pela IA para você</p>
          </div>
        </div>

        {/* Nível de Conhecimento */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h4 className="text-white font-semibold">Nível de Conhecimento Financeiro</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {KNOWLEDGE_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setPreferences(prev => ({ ...prev, knowledge_level: level.value }))}
                className={`p-3 rounded-lg border-2 transition-all text-left ${preferences.knowledge_level === level.value
                    ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_15px_rgba(0,255,255,0.3)]'
                    : 'border-gray-700 bg-[#0a0a1a] hover:border-cyan-500/50'
                  }`}
              >
                <p className="text-white font-bold text-sm mb-1">{level.label}</p>
                <p className="text-gray-400 text-xs">{level.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Objetivos de Aprendizado */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-magenta-400" />
            <h4 className="text-white font-semibold">Objetivos de Aprendizado</h4>
            <span className="text-xs text-gray-500">(Selecione pelo menos 1)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {LEARNING_GOALS.map((goal) => (
              <button
                key={goal.id}
                onClick={() => toggleGoal(goal.id)}
                className={`p-3 rounded-lg border-2 transition-all ${preferences.learning_goals.includes(goal.id)
                    ? 'border-magenta-500 bg-magenta-500/20 shadow-[0_0_15px_rgba(255,0,255,0.3)]'
                    : 'border-gray-700 bg-[#0a0a1a] hover:border-magenta-500/50'
                  }`}
              >
                <span className="text-2xl block mb-1">{goal.icon}</span>
                <p className="text-white font-semibold text-xs text-center">{goal.label.split(' ').slice(1).join(' ')}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Estilo de Conteúdo Preferido */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h4 className="text-white font-semibold">Estilo de Conteúdo Preferido</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CONTENT_PREFERENCES.map((pref) => (
              <button
                key={pref.id}
                onClick={() => toggleStyle(pref.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${preferences.content_style.includes(pref.id)
                    ? 'border-green-500 bg-green-500/20 shadow-[0_0_15px_rgba(57,255,20,0.3)]'
                    : 'border-gray-700 bg-[#0a0a1a] hover:border-green-500/50'
                  }`}
              >
                <p className="text-white font-bold text-sm mb-1">{pref.label}</p>
                <p className="text-gray-400 text-xs">{pref.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-cyan-500/30 flex flex-col gap-2">
          <Button
            onClick={handleSave}
            disabled={updatePreferences.isPending || preferences.learning_goals.length === 0}
            className="w-full bg-gradient-to-r from-purple-500 via-cyan-500 to-magenta-500 hover:from-purple-600 hover:via-cyan-600 hover:to-magenta-600 text-white font-bold text-lg py-6 rounded-xl shadow-[0_0_20px_rgba(138,43,226,0.4)] disabled:opacity-50"
          >
            <Save className="w-5 h-5 mr-2" />
            {updatePreferences.isPending ? 'Salvando...' : 'Salvar Preferências'}
          </Button>

          <Button
            onClick={() => {
              localStorage.removeItem('finquest_academy_tutorial_seen');
              window.location.reload();
            }}
            variant="outline"
            className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Target className="w-4 h-4 mr-2" />
            Reiniciar Tutorial de Boas-Vindas
          </Button>
        </div>

        {/* Info */}
        <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/30">
          <p className="text-cyan-400 text-sm">
            💡 <strong>Dica:</strong> Suas preferências serão usadas para personalizar os tópicos e a profundidade do conteúdo gerado pela IA. Quanto mais específico você for, melhor será a personalização!
          </p>
        </div>
      </div>
    </NeonCard>
  );
}