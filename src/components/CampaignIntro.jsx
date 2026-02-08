import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Shield, Target, ChevronRight } from 'lucide-react';

export default function CampaignIntro({ onComplete }) {
  const navigate = useNavigate();
  const [stage, setStage] = useState('boot'); // boot | identity | briefing | ready
  const [bootLines, setBootLines] = useState([]);
  const [showButton, setShowButton] = useState(false);

  // Fetch user data
  const { data: currentUser } = useQuery({
    queryKey: ['base44User'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userData } = useQuery({
    queryKey: ['currentUserProfile', currentUser?.email],
    queryFn: async () => {
      if (currentUser?.email) {
        const profiles = await base44.entities.User.filter({ email: currentUser.email });
        return profiles && profiles.length > 0 ? profiles[0] : null;
      }
      return null;
    },
    enabled: !!currentUser,
  });

  const userName = userData?.full_name || currentUser?.full_name || 'OPERADOR';

  // Boot sequence
  useEffect(() => {
    if (stage === 'boot') {
      const lines = [
        '> INITIALIZING FINQUEST NEURAL NETWORK...',
        '> LOADING TACTICAL MODULES...',
        '> CALIBRATING FINANCIAL WEAPONS SYSTEM...',
        '> SYNCING MISSION DATABASE...',
        '> ACTIVATING CYBER-WALLET PROTOCOLS...',
        '> ESTABLISHING SECURE BLOCKCHAIN CONNECTION...',
        '> [████████████████████████] 100%',
        '> ALL SYSTEMS OPERATIONAL.'
      ];

      lines.forEach((line, index) => {
        setTimeout(() => {
          setBootLines(prev => [...prev, line]);
        }, index * 1800);
      });

      setTimeout(() => {
        setStage('identity');
      }, 15000);
    }
  }, [stage]);

  // Identity phase
  useEffect(() => {
    if (stage === 'identity') {
      setTimeout(() => {
        setStage('briefing');
      }, 7000);
    }
  }, [stage]);

  // Briefing phase - now requires user interaction
  useEffect(() => {
    if (stage === 'briefing') {
      setTimeout(() => {
        setShowButton(true); // Show continue button
      }, 3000);
    }
  }, [stage]);

  const handleContinue = () => {
    setShowButton(false);
    setStage('ready');
    setTimeout(() => {
      setShowButton(true);
    }, 1000);
  };

  const handleStartMission = () => {
    if (onComplete) onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* CRT Scanlines Effect */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-10">
        <div className="w-full h-full bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-scan" 
             style={{ 
               backgroundSize: '100% 4px',
               animation: 'scan 8s linear infinite'
             }} 
        />
      </div>

      {/* Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Main Content */}
      <div className="relative z-20 flex items-center justify-center min-h-screen p-8">
        {/* Phase 1: Boot */}
        {stage === 'boot' && (
          <div className="w-full max-w-2xl">
            <div className="space-y-2 font-mono text-green-400">
              {bootLines.map((line, idx) => (
                <div key={idx} className="text-sm md:text-base animate-pulse">
                  {line}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-4 bg-green-400 animate-pulse" />
              <div className="text-green-400 text-xs animate-pulse">LOADING...</div>
            </div>
          </div>
        )}

        {/* Phase 2: Identity */}
        {stage === 'identity' && (
          <div className="w-full max-w-2xl text-center">
            <div className="relative inline-block mb-8">
              {/* Hexagonal Scanner Frame */}
              <div className="relative w-48 h-48 mx-auto">
                <div className="absolute inset-0 border-4 border-cyan-500 rounded-full animate-pulse shadow-[0_0_40px_rgba(0,255,255,0.6)]">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield className="w-20 h-20 text-cyan-400 animate-pulse" />
                  </div>
                  {/* Rotating Scanner Lines */}
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(0,255,255,1)]" />
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-magenta-400 shadow-[0_0_10px_rgba(255,0,255,1)]" />
                  </div>
                  {/* Scanning Line */}
                  <div className="absolute inset-x-0 h-1 bg-green-400 shadow-[0_0_20px_rgba(57,255,20,0.8)] animate-scan-vertical" />
                </div>
                {/* Corner Brackets */}
                <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-yellow-400" />
                <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-yellow-400" />
                <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-yellow-400" />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-yellow-400" />
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-green-400 font-mono text-base animate-pulse">
                  [ SCANNING NEURAL SIGNATURE... ]
                </p>
                <div className="flex items-center justify-center gap-2 text-yellow-400 font-mono text-sm">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <span>DNA MATCH: 100%</span>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                </div>
              </div>
              
              <div className="h-px w-64 mx-auto bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
              
              <p className="text-cyan-400 text-2xl font-bold tracking-widest animate-pulse">
                ✓ IDENTITY CONFIRMED
              </p>
              
              <div className="space-y-2">
                <p className="text-gray-400 font-mono text-sm">OPERATOR ID:</p>
                <p className="text-white text-3xl md:text-5xl font-black tracking-wider">
                  <span className="text-cyan-400">{userName.toUpperCase()}</span>
                </p>
                <p className="text-magenta-400 font-mono text-sm animate-pulse">
                  [ CLEARANCE LEVEL: LEGENDARY ]
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Phase 3: Briefing */}
        {stage === 'briefing' && (
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto px-4 space-y-6">
            <div className="relative">
              {/* RPG Quest Card */}
              <div className="relative bg-gradient-to-br from-purple-900/40 via-black/60 to-red-900/40 border-4 border-yellow-500 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-[0_0_80px_rgba(255,215,0,0.5)] animate-in zoom-in duration-700">
                {/* Ornate Corner Decorations */}
                <div className="absolute -top-3 -left-3 w-12 h-12 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg" />
                <div className="absolute -top-3 -right-3 w-12 h-12 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg" />
                <div className="absolute -bottom-3 -left-3 w-12 h-12 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg" />
                <div className="absolute -bottom-3 -right-3 w-12 h-12 border-b-4 border-r-4 border-yellow-400 rounded-br-lg" />

                {/* Quest Scroll Header */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-600 to-orange-600 px-8 py-2 rounded-full border-4 border-yellow-400 shadow-[0_0_30px_rgba(255,215,0,0.8)]">
                  <p className="text-yellow-200 font-black text-sm tracking-widest">⚔️ QUEST PRINCIPAL ⚔️</p>
                </div>

                <div className="text-center space-y-4 mt-4">
                  {/* Title */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Zap className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 animate-pulse" />
                      <h2 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 tracking-wider animate-pulse">
                        BRIEFING DE CAMPANHA
                      </h2>
                      <Zap className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 animate-pulse" />
                    </div>
                    <p className="text-cyan-400 font-mono text-xs tracking-widest">[ NÍVEL DE AMEAÇA: CRÍTICO ]</p>
                  </div>

                  <div className="h-0.5 w-32 mx-auto bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />

                  {/* Story */}
                  <div className="space-y-3 bg-black/40 p-4 rounded-xl border-2 border-cyan-500/30">
                    <p className="text-gray-300 text-sm md:text-base leading-relaxed font-medium">
                      🏴‍☠️ O mundo financeiro caiu sob o domínio do temível{' '}
                      <span className="text-red-500 font-black">LORD CONSUMISMO</span>,
                      um vilão que escraviza almas com dívidas e gastos impulsivos.
                    </p>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-red-500 to-transparent" />

                    <p className="text-cyan-300 text-base md:text-lg leading-relaxed font-semibold">
                      💎 Sua <span className="text-cyan-400 font-black">LIBERDADE FINANCEIRA</span> foi roubada.
                      ⚔️ Seus recursos foram saqueados pelo{' '}
                      <span className="text-red-400 font-black animate-pulse">CAOS DO CONSUMO</span>.
                    </p>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

                    <p className="text-white text-lg md:text-xl font-black leading-relaxed bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                      🎯 MISSÃO PRINCIPAL:
                    </p>
                    
                    <div className="space-y-2 text-left">
                      <div className="flex items-start gap-2 bg-green-900/20 p-3 rounded-lg border-l-4 border-green-400">
                        <span className="text-xl">🛡️</span>
                        <p className="text-white text-sm md:text-base font-semibold">
                          Restaurar a <span className="text-green-400">ORDEM FINANCEIRA</span>
                        </p>
                      </div>
                      <div className="flex items-start gap-2 bg-yellow-900/20 p-3 rounded-lg border-l-4 border-yellow-400">
                        <span className="text-xl">💰</span>
                        <p className="text-white text-sm md:text-base font-semibold">
                          Acumular <span className="text-yellow-400">RECURSOS LENDÁRIOS</span>
                        </p>
                      </div>
                      <div className="flex items-start gap-2 bg-purple-900/20 p-3 rounded-lg border-l-4 border-magenta-400">
                        <span className="text-xl">👑</span>
                        <p className="text-white text-sm md:text-base font-semibold">
                          Conquistar o <span className="text-magenta-400">IMPÉRIO FINANCEIRO</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="bg-gradient-to-b from-cyan-900/40 to-black/60 p-3 rounded-xl border-2 border-cyan-500/50">
                      <Target className="w-6 h-6 text-cyan-400 mx-auto mb-1 animate-pulse" />
                      <p className="text-[10px] text-gray-400 uppercase">Quest Type</p>
                      <p className="text-cyan-400 font-black text-sm">MAIN STORY</p>
                    </div>
                    <div className="bg-gradient-to-b from-green-900/40 to-black/60 p-3 rounded-xl border-2 border-green-500/50">
                      <Shield className="w-6 h-6 text-green-400 mx-auto mb-1 animate-pulse" />
                      <p className="text-[10px] text-gray-400 uppercase">Difficulty</p>
                      <p className="text-green-400 font-black text-sm">LEGENDARY</p>
                    </div>
                    <div className="bg-gradient-to-b from-yellow-900/40 to-black/60 p-3 rounded-xl border-2 border-yellow-500/50">
                      <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-1 animate-pulse" />
                      <p className="text-[10px] text-gray-400 uppercase">Reward</p>
                      <p className="text-yellow-400 font-black text-sm">FREEDOM</p>
                    </div>
                  </div>
                </div>
                </div>
                </div>

                {/* Continue Button */}
                {showButton && (
                <div className="text-center animate-in fade-in zoom-in duration-700">
                <button
                  onClick={handleContinue}
                  className="group relative px-12 py-5 bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 text-white text-xl md:text-2xl font-black rounded-2xl border-4 border-cyan-400 shadow-[0_0_60px_rgba(0,255,255,0.8)] hover:shadow-[0_0_100px_rgba(0,255,255,1)] transition-all duration-300 hover:scale-110 animate-pulse overflow-hidden"
                >
                  {/* Animated shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                  {/* Button Content */}
                  <span className="relative z-10 flex items-center gap-4">
                    <ChevronRight className="w-8 h-8 animate-pulse" />
                    ENTENDI. PROSSEGUIR
                    <ChevronRight className="w-8 h-8 animate-pulse" />
                  </span>

                  {/* Particle effects */}
                  <div className="absolute inset-0 -z-10 blur-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 group-hover:blur-3xl transition-all opacity-70" />
                </button>

                <p className="text-gray-500 text-sm font-mono animate-pulse flex items-center justify-center gap-2 mt-4">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  LEIA COM ATENÇÃO ANTES DE CONTINUAR
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                </p>
                </div>
                )}
                </div>
                )}

        {/* Phase 4: Ready Button */}
        {stage === 'ready' && showButton && (
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
            <div className="space-y-4">
              <p className="text-cyan-400 text-2xl font-bold animate-pulse flex items-center justify-center gap-2">
                <Zap className="w-6 h-6" />
                SISTEMA OPERACIONAL
                <Zap className="w-6 h-6" />
              </p>
              <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-green-400 tracking-wider animate-pulse">
                PRONTO PARA COMBATE
              </h1>
              <p className="text-yellow-400 text-lg font-bold">⚔️ A BATALHA COMEÇA AGORA ⚔️</p>
            </div>

            <button
              onClick={handleStartMission}
              className="group relative px-16 py-8 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 text-white text-2xl md:text-4xl font-black rounded-2xl border-4 border-yellow-400 shadow-[0_0_60px_rgba(255,215,0,0.8)] hover:shadow-[0_0_100px_rgba(255,215,0,1)] transition-all duration-300 hover:scale-110 animate-pulse overflow-hidden"
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              {/* Button Content */}
              <span className="relative z-10 flex items-center gap-4">
                <Zap className="w-10 h-10 animate-pulse" />
                ACEITAR MISSÃO
                <Zap className="w-10 h-10 animate-pulse" />
              </span>

              {/* Particle effects */}
              <div className="absolute inset-0 -z-10 blur-2xl bg-gradient-to-r from-red-500 via-yellow-500 to-orange-500 group-hover:blur-3xl transition-all opacity-70" />
            </button>

            <p className="text-gray-500 text-base font-mono animate-pulse flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              PRESSIONE PARA INICIAR SUA JORNADA ÉPICA
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </p>
          </div>
        )}


      </div>

      {/* Glitch Overlay (occasional) */}
      <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-10">
        <div className="w-full h-full bg-red-500 animate-glitch" />
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        @keyframes scan-vertical {
          0% { top: 0; }
          100% { top: 100%; }
        }

        @keyframes glitch {
          0%, 90%, 100% { opacity: 0; }
          92%, 94%, 96% { opacity: 0.3; transform: translateX(2px); }
          93%, 95%, 97% { opacity: 0.3; transform: translateX(-2px); }
        }

        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-scan {
          animation: scan 8s linear infinite;
        }

        .animate-scan-vertical {
          animation: scan-vertical 2s linear infinite;
        }

        .animate-glitch {
          animation: glitch 5s infinite;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .glitch-text {
          position: relative;
        }

        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.8;
        }

        .glitch-text::before {
          animation: glitch-1 2.5s infinite;
          color: #00ffff;
          z-index: -1;
        }

        .glitch-text::after {
          animation: glitch-2 2.5s infinite;
          color: #ff00ff;
          z-index: -2;
        }

        @keyframes glitch-1 {
          0%, 90%, 100% { transform: translate(0); }
          91% { transform: translate(-2px, -2px); }
          93% { transform: translate(2px, 2px); }
          95% { transform: translate(-2px, 2px); }
          97% { transform: translate(2px, -2px); }
        }

        @keyframes glitch-2 {
          0%, 90%, 100% { transform: translate(0); }
          92% { transform: translate(2px, 2px); }
          94% { transform: translate(-2px, -2px); }
          96% { transform: translate(2px, -2px); }
          98% { transform: translate(-2px, 2px); }
        }
      `}</style>
    </div>
  );
}