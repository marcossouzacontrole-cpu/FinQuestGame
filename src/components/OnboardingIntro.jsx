import React, { useState } from 'react';
import { Brain, Target, Zap, Shield, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';

export default function OnboardingIntro({ onStart }) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [canProceed, setCanProceed] = useState(false);

  // Timer to ensure user reads content
  React.useEffect(() => {
    setCanProceed(false);
    const timer = setTimeout(() => {
      setCanProceed(true);
    }, 5000); // 5 seconds minimum read time
    return () => clearTimeout(timer);
  }, [currentPhase]);

  const phases = [
    {
      title: 'INICIALIZANDO SISTEMA NEURAL',
      subtitle: 'Preparando Análise Estratégica',
      icon: Brain,
      color: 'cyan',
      content: (
        <div className="space-y-6 text-center">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-cyan-500/30 blur-3xl rounded-full animate-pulse" />
            <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center border-4 border-cyan-400 shadow-2xl">
              <Brain className="w-16 h-16 text-white animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 leading-tight">
            DIAGNÓSTICO FINANCEIRO PERSONALIZADO
          </h2>
          
          <div className="max-w-2xl mx-auto space-y-3">
            <p className="text-white text-base leading-relaxed">
              Você está prestes a passar por uma <span className="text-cyan-400 font-bold">Análise Neural Completa</span> do seu perfil financeiro.
            </p>
            
            <div className="bg-cyan-900/20 border-2 border-cyan-500/50 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-cyan-300 text-sm leading-relaxed">
                ⚡ Este não é apenas um questionário comum. É um <span className="font-bold text-cyan-400">scanner de diagnóstico tático</span> que 
                irá mapear sua situação financeira atual, identificar seus pontos fortes, fraquezas e criar 
                um <span className="font-bold text-yellow-400">plano de batalha personalizado</span> para sua jornada.
              </p>
            </div>
            
            <p className="text-gray-400 text-sm">
              Cada resposta é um fragmento do código que moldará sua estratégia de vitória.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'POR QUE A SINCERIDADE IMPORTA',
      subtitle: 'Honestidade = Poder Máximo',
      icon: Shield,
      color: 'magenta',
      content: (
        <div className="space-y-6">
          <div className="relative inline-block w-full text-center">
            <div className="absolute inset-0 bg-magenta-500/30 blur-3xl rounded-full animate-pulse" />
            <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-magenta-500 to-pink-600 rounded-full flex items-center justify-center border-4 border-magenta-400 shadow-2xl">
              <Shield className="w-16 h-16 text-white animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-magenta-400 to-pink-400 leading-tight text-center">
            DADOS REAIS = RESULTADOS REAIS
          </h2>
          
          <div className="grid md:grid-cols-2 gap-3 max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-red-900/40 to-black/60 border-2 border-red-500/50 rounded-xl p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/20 blur-2xl" />
              <div className="relative">
                <div className="text-3xl mb-2">❌</div>
                <h3 className="text-red-400 font-bold text-base mb-1">Respostas Falsas</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Missões impossíveis, metas irreais, estratégias que não funcionam para VOCÊ.
                  Você estará jogando no modo <span className="text-red-400 font-bold">Hardcore sem preparo</span>.
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-900/40 to-black/60 border-2 border-green-500/50 rounded-xl p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/20 blur-2xl" />
              <div className="relative">
                <div className="text-3xl mb-2">✅</div>
                <h3 className="text-green-400 font-bold text-base mb-1">Honestidade Total</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Desafios sob medida, objetivos alcançáveis, estratégia perfeita para seu perfil.
                  <span className="text-green-400 font-bold"> Modo Estratégico Ativado</span>.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-900/20 border-l-4 border-yellow-400 p-3 rounded-r-xl max-w-2xl mx-auto">
            <p className="text-yellow-300 text-xs">
              <span className="font-bold">⚠️ IMPORTANTE:</span> Ninguém além de você verá essas respostas. 
              Este é seu espaço seguro para ser 100% autêntico sobre sua situação financeira.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'O QUE VOCÊ VAI GANHAR',
      subtitle: 'Seu Arsenal Personalizado',
      icon: Target,
      color: 'yellow',
      content: (
        <div className="space-y-6">
          <div className="relative inline-block w-full text-center">
            <div className="absolute inset-0 bg-yellow-500/30 blur-3xl rounded-full animate-pulse" />
            <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border-4 border-yellow-400 shadow-2xl">
              <Target className="w-16 h-16 text-white animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 leading-tight text-center">
            SEU PLANO DE BATALHA SERÁ CRIADO
          </h2>
          
          <div className="grid gap-3 max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-cyan-900/20 to-black/60 border-l-4 border-cyan-400 rounded-r-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-cyan-400 font-bold text-base mb-1">Missões Personalizadas</h3>
                <p className="text-gray-400 text-xs">
                  Desafios financeiros criados especialmente para SEU perfil, nível de experiência e objetivos.
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-magenta-900/20 to-black/60 border-l-4 border-magenta-400 rounded-r-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 border border-purple-400/30">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-purple-400 font-bold text-base mb-1">Objetivos Inteligentes</h3>
                <p className="text-purple-400 text-xs">
                  Metas financeiras realistas baseadas na SUA renda, despesas e capacidade de poupança.
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-900/20 to-black/60 border-l-4 border-green-400 rounded-r-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-green-400 font-bold text-base mb-1">Estratégia IA Exclusiva</h3>
                <p className="text-gray-400 text-xs">
                  Um plano de ação gerado por Inteligência Artificial considerando seus maiores desafios e motivações.
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-yellow-900/20 to-black/60 border-l-4 border-yellow-400 rounded-r-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-yellow-400 font-bold text-base mb-1">Recompensas Adaptativas</h3>
                <p className="text-gray-400 text-xs">
                  Sistema de XP, níveis e conquistas calibrado para seu ritmo e estilo de jogo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentData = phases[currentPhase];
  const Icon = currentData.icon;
  
  const colorClasses = {
    cyan: { gradient: 'from-cyan-500 to-blue-600', border: 'border-cyan-500', glow: 'rgba(0,255,255,0.6)' },
    magenta: { gradient: 'from-magenta-500 to-pink-600', border: 'border-magenta-500', glow: 'rgba(255,0,255,0.6)' },
    yellow: { gradient: 'from-yellow-400 to-orange-500', border: 'border-yellow-500', glow: 'rgba(255,215,0,0.6)' }
  };
  
  const colors = colorClasses[currentData.color];

  const handleNext = () => {
    if (currentPhase < phases.length - 1) {
      setCurrentPhase(currentPhase + 1);
    } else {
      onStart();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-black to-cyan-900/10" />
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        
        {/* Progress Bar */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {phases.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-500 ${
                idx === currentPhase 
                  ? `w-16 bg-gradient-to-r ${colors.gradient}`
                  : idx < currentPhase
                  ? 'w-10 bg-green-500'
                  : 'w-6 bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Content Card */}
        <div className="w-full max-w-5xl animate-in fade-in zoom-in duration-700">
          <div className="relative">
            {/* Glow Effect */}
            <div 
              className="absolute -inset-8 rounded-3xl blur-3xl animate-pulse"
              style={{ backgroundColor: colors.glow, opacity: 0.2 }}
            />

            {/* Card */}
            <div className={`relative bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 border-4 ${colors.border} rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-2xl max-h-[85vh] overflow-y-auto`}>
              
              {/* Corner Decorations */}
              <div className={`absolute -top-3 -left-3 w-12 h-12 border-t-4 border-l-4 ${colors.border} rounded-tl-lg`} />
              <div className={`absolute -top-3 -right-3 w-12 h-12 border-t-4 border-r-4 ${colors.border} rounded-tr-lg`} />
              <div className={`absolute -bottom-3 -left-3 w-12 h-12 border-b-4 border-l-4 ${colors.border} rounded-bl-lg`} />
              <div className={`absolute -bottom-3 -right-3 w-12 h-12 border-b-4 border-r-4 ${colors.border} rounded-br-lg`} />

              {/* Header */}
              <div className="text-center mb-8">
                <div className={`inline-block px-6 py-2 bg-gradient-to-r ${colors.gradient} rounded-full mb-4`}>
                  <p className="text-white font-black text-sm tracking-widest uppercase">
                    {currentData.subtitle}
                  </p>
                </div>
                <h1 className="text-white text-3xl md:text-4xl font-black mb-2">
                  {currentData.title}
                </h1>
              </div>

              {/* Content */}
              <div className="mb-10">
                {currentData.content}
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className={`group relative px-10 py-4 bg-gradient-to-r ${colors.gradient} rounded-2xl text-white font-black text-lg transition-all hover:scale-105 shadow-lg hover:shadow-2xl flex items-center gap-3 overflow-hidden border-2 border-white/20 ${!canProceed ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {/* Animated shine */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  
                  <span className="relative z-10 flex items-center gap-2">
                    {currentPhase < phases.length - 1 ? (
                      <>
                        PRÓXIMO
                        <ChevronRight className="w-5 h-5" />
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        INICIAR DIAGNÓSTICO
                        <Sparkles className="w-5 h-5" />
                      </>
                    )}
                  </span>
                </button>
              </div>

              {/* Timer indicator */}
              {!canProceed && (
                <p className="text-yellow-400 text-xs font-mono text-center mt-3 animate-pulse">
                  ⏱️ Aguarde {Math.ceil((5000 - (Date.now() % 5000)) / 1000)}s para continuar...
                </p>
              )}

              {/* Step Counter */}
              <p className="text-gray-500 text-xs font-mono text-center mt-4">
                FASE {currentPhase + 1} DE {phases.length}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Text */}
        <div className="absolute bottom-8 text-center">
          <p className="text-gray-600 text-xs font-mono flex items-center gap-2">
            <Zap className="w-3 h-3 animate-pulse" />
            PREPARANDO SISTEMA DE ANÁLISE NEURAL
            <Zap className="w-3 h-3 animate-pulse" />
          </p>
        </div>
      </div>
    </div>
  );
}