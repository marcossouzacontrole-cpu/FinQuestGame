import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from './api/base44Client';
import { useRPGTheme } from './hooks/useRPGTheme';
import FinancialAdvisorChat from './components/FinancialAdvisorChat';
import AchievementChecker from './components/AchievementChecker';
import SkillBar from './components/SkillBar';
import BackgroundMusic from './components/BackgroundMusic';
import PageTransition from './components/PageTransition';
import PremiumBadge from './components/PremiumBadge';
import {
  LayoutDashboard,
  Target,
  Vault,
  GraduationCap,
  User,
  Trophy,
  TrendingUp,
  Crown,
  Menu,
  X,
  ShoppingBag,
  Zap,
  Users
} from 'lucide-react';
import FloatingRewards from './components/FloatingRewards';

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch current user for global chat
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

  // Apply Character Theme
  useRPGTheme(userData?.current_class);

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: 'Dashboard' },
    { name: 'Núcleo Estratégico', icon: Zap, path: 'FinancialCore' },
    { name: 'Missões', icon: Target, path: 'Missions' },
    { name: 'Conquistas', icon: Vault, path: 'Vault' },
    { name: 'Loja', icon: ShoppingBag, path: 'Shop' },
    { name: 'Comunidade', icon: Users, path: 'Community' },
    { name: 'Arena de Batalha', icon: Crown, path: 'NetWorth' },
    { name: 'Centro de Comando', icon: TrendingUp, path: 'CommandCenter' },
    { name: 'Academia', icon: GraduationCap, path: 'Academy' },
    { name: 'Ranking', icon: Trophy, path: 'Leaderboard' },
    { name: 'Integrações', icon: Zap, path: 'Integrations' },
    { name: 'Perfil', icon: User, path: 'Profile' }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A1A]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * {
          font-family: 'Inter', sans-serif;
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Orbitron', sans-serif;
        }

        :root {
          --primary-glow: #00FFFF;
          --secondary-glow: #FF00FF;
          --accent-glow: #00FFFF;
          --bg-accent: rgba(0, 255, 255, 0.1);
        }

        /* Scrollbar customization */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #0A0A1A;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, var(--primary-glow) 0%, var(--secondary-glow) 100%);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, var(--primary-glow) 0%, #39FF14 100%);
        }

        /* Glow animation */
        @keyframes glow {
          0%, 100% {
            text-shadow: 0 0 10px var(--primary-glow), 0 0 20px var(--primary-glow);
            opacity: 0.8;
          }
          50% {
            text-shadow: 0 0 20px var(--primary-glow), 0 0 30px var(--primary-glow);
            opacity: 1;
          }
        }

        .glow-text {
          animation: glow 2s ease-in-out infinite;
          color: var(--primary-glow);
        }

        /* Background grid effect */
        .cyber-grid {
          background-image: 
            linear-gradient(var(--bg-accent) 1px, transparent 1px),
            linear-gradient(90deg, var(--bg-accent) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#0A0A1A] via-[#1a1a2e] to-[#0A0A1A] border-b border-cyan-500/30 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="overflow-hidden">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6924dd2d5426bf1f772fdb54/1590eb40e_image.png"
                alt="FinQuest Logo"
                className="h-12 w-auto"
                style={{
                  mixBlendMode: 'lighten',
                  filter: 'brightness(1.1)'
                }}
              />
            </div>
            <div className="flex flex-col -ml-1">
              <span className="text-[10px] text-pink-400 font-bold flex items-center gap-1">
                <span>💰</span> ECONOMIZE
              </span>
              <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-1">
                CONQUISTE <span>⚔️</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-[#0f0f1e] to-[#0A0A1A] border-r border-cyan-500/30 
        transform transition-transform duration-300 z-40 overflow-y-auto
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 space-y-4 pb-16">
          {/* Logo */}
          <div className="text-center relative py-6 px-4">
            {/* Background glow effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 bg-gradient-to-r from-pink-500/30 via-cyan-500/30 to-green-500/30 blur-3xl rounded-full animate-pulse"></div>
            </div>

            {/* Logo with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[180px] h-[180px] bg-gradient-to-r from-pink-500/40 via-cyan-500/40 to-yellow-500/40 blur-2xl animate-pulse"></div>
              </div>
              <div className="relative w-full max-w-[180px] mx-auto overflow-hidden">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6924dd2d5426bf1f772fdb54/1590eb40e_image.png"
                  alt="FinQuest Logo"
                  className="w-full relative drop-shadow-[0_0_20px_rgba(0,255,255,0.5)] animate-pulse"
                  style={{
                    mixBlendMode: 'lighten',
                    filter: 'brightness(1.2) contrast(1.1)'
                  }}
                />
              </div>
            </div>

            {/* Text below logo */}
            <div className="relative mt-3 space-y-1">
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-pink-400 font-bold flex items-center gap-1">
                  <span className="text-base">💰</span> ECONOMIZE
                </span>
                <span className="text-cyan-400/60">•</span>
                <span className="text-yellow-400 font-bold flex items-center gap-1">
                  CONQUISTE <span className="text-base">⚔️</span>
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                <span>🎯</span>
                <span>Gamifique suas Finanças</span>
                <span>💸</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.path;

              return (
                <Link
                  key={item.path}
                  to={createPageUrl(item.path)}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group
                    ${isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-magenta-500/20 border border-cyan-500/50 shadow-[0_0_20px_rgba(0,255,255,0.3)]'
                      : 'hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(0,255,255,0.15)]'
                    }
                  `}
                >
                  {/* Barra lateral indicadora */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 to-magenta-400 rounded-r-full shadow-[0_0_10px_rgba(0,255,255,0.6)]" />
                  )}

                  {/* Ícone com animação */}
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300
                    ${isActive
                      ? 'bg-gradient-to-br from-cyan-500/30 to-magenta-500/30 shadow-[0_0_15px_rgba(0,255,255,0.3)]'
                      : 'bg-gray-800/30 group-hover:bg-cyan-500/20'
                    }
                  `}>
                    <Icon className={`w-5 h-5 transition-all duration-300 ${isActive
                      ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]'
                      : 'text-gray-400 group-hover:text-cyan-400'
                      }`} />
                  </div>

                  <span className={`font-semibold transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                    }`}>
                    {item.name}
                  </span>

                  {/* Indicador pulsante */}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
                  )}

                  {/* Seta no hover */}
                  {!isActive && (
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-1.5 h-1.5 border-r-2 border-t-2 border-cyan-400 rotate-45" />
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>


        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen cyber-grid pt-20 lg:pt-0 pb-32">
        <PageTransition pageKey={currentPageName}>
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </PageTransition>
      </main>

      {/* Global Financial Advisor Chat - Sir Coin */}
      {userData && <FinancialAdvisorChat user={userData} />}

      {/* Achievement Checker (logic only) */}
      {userData && <AchievementChecker user={userData} />}

      {/* Global Skill Bar - Hidden on Onboarding */}
      {currentPageName !== 'Onboarding' && <SkillBar />}

      {/* Background Music */}
      {currentPageName !== 'Onboarding' && <BackgroundMusic />}

      {/* Premium Badge */}
      <PremiumBadge />
      <FloatingRewards />
    </div>
  );
}