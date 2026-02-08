import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  LayoutDashboard, Target, Vault, GraduationCap, User, Trophy, 
  TrendingUp, Crown, ChevronRight, Sparkles, Zap
} from 'lucide-react';

export default function MenuTutorial({ onComplete }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      title: 'BASE DE OPERAÇÕES',
      subtitle: 'O CENTRO NEURAL DE COMANDO',
      description: 'Seu quartel-general. Aqui você monitora todas as suas estatísticas vitais, progresso de missões e saúde financeira em tempo real.',
      color: 'cyan',
      glow: 'rgba(0,255,255,0.6)',
      emoji: '🏰',
      story: 'Este é seu santuário digital, onde estratégias nascem e vitórias são celebradas.'
    },
    {
      name: 'Missões',
      icon: Target,
      title: 'CENTRAL DE MISSÕES',
      subtitle: 'ONDE HERÓIS SÃO FORJADOS',
      description: 'Desafios diários, semanais e épicos que transformarão você em um lendário mestre das finanças. Complete para ganhar XP e Gold Coins!',
      color: 'magenta',
      glow: 'rgba(255,0,255,0.6)',
      emoji: '⚔️',
      story: 'Cada missão completada é um passo mais perto da liberdade financeira absoluta.'
    },
    {
      name: 'Vault',
      icon: Vault,
      title: 'COFRE LENDÁRIO',
      subtitle: 'FORJA DOS SEUS SONHOS',
      description: 'Aqui você forja seus objetivos financeiros em conquistas épicas. Cada meta é um item lendário esperando para ser desbloqueado!',
      color: 'yellow',
      glow: 'rgba(255,215,0,0.6)',
      emoji: '💎',
      story: 'Seus sonhos não são apenas metas - são tesouros esperando para serem conquistados.'
    },
    {
      name: 'Arena de Batalha',
      icon: Crown,
      title: 'ARENA DE BATALHA',
      subtitle: 'CAMPO DE COMBATE FINANCEIRO',
      description: 'Gerencie seus ativos e encare suas dívidas como boss battles. Cada dívida derrotada é uma vitória épica!',
      color: 'red',
      glow: 'rgba(255,0,85,0.6)',
      emoji: '⚡',
      story: 'O campo de batalha onde você enfrenta os monstros financeiros que ameaçam seu império.'
    },
    {
      name: 'Centro de Comando',
      icon: TrendingUp,
      title: 'CENTRO TÁTICO',
      subtitle: 'INTELIGÊNCIA ESTRATÉGICA',
      description: 'Ferramentas avançadas, simulações e análises profundas. O arsenal completo para dominar o mercado financeiro.',
      color: 'purple',
      glow: 'rgba(138,43,226,0.6)',
      emoji: '🎯',
      story: 'Onde decisões estratégicas são tomadas e o futuro é planejado com precisão militar.'
    },
    {
      name: 'Academia',
      icon: GraduationCap,
      title: 'ACADEMIA DE GUERREIROS',
      subtitle: 'TEMPLO DO CONHECIMENTO',
      description: 'Treine suas habilidades financeiras, desbloqueie novos poderes e torne-se um mestre lendário.',
      color: 'green',
      glow: 'rgba(57,255,20,0.6)',
      emoji: '📚',
      story: 'Todo grande guerreiro precisa de sabedoria. Aqui, conhecimento é poder absoluto.'
    },
    {
      name: 'Ranking',
      icon: Trophy,
      title: 'HALL DA FAMA',
      subtitle: 'ONDE LENDAS SÃO IMORTALIZADAS',
      description: 'Compare seu progresso com outros guerreiros financeiros. Escale os rankings e prove seu valor!',
      color: 'orange',
      glow: 'rgba(255,165,0,0.6)',
      emoji: '🏆',
      story: 'Os maiores heróis são lembrados aqui. Você tem o que é preciso para entrar para a história?'
    },
    {
      name: 'Perfil',
      icon: User,
      title: 'PERFIL DO GUERREIRO',
      subtitle: 'SUA IDENTIDADE LENDÁRIA',
      description: 'Customize seu personagem, gerencie seu inventário e acompanhe sua evolução de novato a lenda viva.',
      color: 'cyan',
      glow: 'rgba(0,255,255,0.6)',
      emoji: '👤',
      story: 'Esta é sua saga. Cada conquista, cada nível, cada vitória conta a história de um herói.'
    }
  ];

  const currentMenu = menuItems[currentStep];

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 800);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < menuItems.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    navigate(createPageUrl('Dashboard'));
    if (onComplete) onComplete();
  };

  const IconComponent = currentMenu.icon;
  const colorClasses = {
    cyan: 'from-cyan-500 to-blue-500',
    magenta: 'from-magenta-500 to-pink-500',
    yellow: 'from-yellow-400 to-orange-500',
    red: 'from-red-500 to-orange-600',
    purple: 'from-purple-500 to-indigo-500',
    green: 'from-green-400 to-emerald-500',
    orange: 'from-orange-500 to-red-500'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20" />
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'gridScroll 20s linear infinite'
        }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        
        {/* Progress Indicator */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {menuItems.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === currentStep 
                  ? 'w-12 bg-gradient-to-r ' + colorClasses[currentMenu.color]
                  : idx < currentStep
                  ? 'w-8 bg-green-500'
                  : 'w-4 bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Skip Button */}
        <button
          onClick={handleSkip}
          className="absolute top-8 right-8 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 hover:text-white text-sm font-semibold transition-all"
        >
          Pular Tutorial
        </button>

        {/* Main Card */}
        <div className={`w-full max-w-3xl transition-all duration-800 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <div className="relative">
            {/* Glow Effect */}
            <div 
              className="absolute -inset-4 rounded-3xl blur-2xl animate-pulse"
              style={{ backgroundColor: currentMenu.glow, opacity: 0.3 }}
            />

            {/* Card */}
            <div className="relative bg-gradient-to-br from-gray-900/90 via-black/90 to-gray-900/90 border-4 rounded-3xl p-8 backdrop-blur-sm"
                 style={{ borderColor: currentMenu.glow }}>
              
              {/* Decorative Corners */}
              <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg" 
                   style={{ borderColor: currentMenu.glow }} />
              <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg" 
                   style={{ borderColor: currentMenu.glow }} />
              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg" 
                   style={{ borderColor: currentMenu.glow }} />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 rounded-br-lg" 
                   style={{ borderColor: currentMenu.glow }} />

              {/* Content */}
              <div className="text-center space-y-6">
                
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div 
                      className="absolute inset-0 rounded-full blur-xl animate-pulse"
                      style={{ backgroundColor: currentMenu.glow }}
                    />
                    <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${colorClasses[currentMenu.color]} flex items-center justify-center border-4 border-white/20 shadow-2xl`}>
                      <IconComponent className="w-12 h-12 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>

                {/* Title Badge */}
                <div className="inline-block">
                  <div className={`px-6 py-2 bg-gradient-to-r ${colorClasses[currentMenu.color]} rounded-full border-2 border-white/30 shadow-lg`}>
                    <p className="text-white font-black text-xl tracking-wider flex items-center gap-2">
                      <span className="text-2xl">{currentMenu.emoji}</span>
                      {currentMenu.title}
                    </p>
                  </div>
                </div>

                {/* Subtitle */}
                <p className="text-yellow-400 font-bold text-lg tracking-widest uppercase">
                  {currentMenu.subtitle}
                </p>

                <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                {/* Description */}
                <div className="space-y-4 max-w-xl mx-auto">
                  <p className="text-gray-300 text-lg leading-relaxed">
                    {currentMenu.description}
                  </p>
                  
                  <div className={`bg-gradient-to-r ${colorClasses[currentMenu.color]} p-0.5 rounded-xl`}>
                    <div className="bg-black/80 p-4 rounded-xl">
                      <p className="text-white/90 text-sm italic leading-relaxed">
                        "{currentMenu.story}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-4 pt-6">
                  {currentStep > 0 && (
                    <button
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 rounded-xl text-white font-bold transition-all flex items-center gap-2"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                      Voltar
                    </button>
                  )}
                  
                  <button
                    onClick={handleNext}
                    className={`group relative px-8 py-4 bg-gradient-to-r ${colorClasses[currentMenu.color]} rounded-xl text-white font-black text-lg transition-all hover:scale-105 shadow-lg hover:shadow-2xl flex items-center gap-3 overflow-hidden`}
                  >
                    {/* Animated shine */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    
                    <span className="relative z-10 flex items-center gap-3">
                      {currentStep < menuItems.length - 1 ? (
                        <>
                          Próxima Área
                          <ChevronRight className="w-5 h-5" />
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Iniciar Jornada!
                          <Sparkles className="w-5 h-5" />
                        </>
                      )}
                    </span>
                  </button>
                </div>

                {/* Step Counter */}
                <p className="text-gray-500 text-sm font-mono">
                  ÁREA {currentStep + 1} DE {menuItems.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
          <p className="text-gray-600 text-xs font-mono flex items-center gap-2">
            <Zap className="w-3 h-3 animate-pulse" />
            EXPLORANDO O MAPA DO MUNDO
            <Zap className="w-3 h-3 animate-pulse" />
          </p>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes gridScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }
      `}</style>
    </div>
  );
}