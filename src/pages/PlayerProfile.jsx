import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Zap, Flame, Crown, ArrowLeft, Star, Coins, LogOut, User, Shield, Sword } from 'lucide-react';
import { motion } from 'framer-motion';

// --- COMPONENTES UI INTERNOS (Para evitar erros de importação) ---

const NeonCard = ({ children, glowColor = 'cyan', className = '' }) => {
  const colors = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/80',
    purple: 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-slate-900/80',
    yellow: 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)] bg-slate-900/80',
  };
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden ${colors[glowColor] || colors.cyan} ${className}`}>
      {children}
    </div>
  );
};

const XPBar = ({ level, currentXP, xpToNextLevel }) => {
  const progress = Math.min((currentXP / xpToNextLevel) * 100, 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1 font-mono">
        <span className="text-cyan-400">LVL {level}</span>
        <span className="text-slate-400">{currentXP} / {xpToNextLevel} XP</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
        <motion.div 
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1 }}
        />
      </div>
    </div>
  );
};

const AvatarDisplay = ({ user, size = 'md', showEquipment = false }) => {
  const sizeClasses = {
    md: 'w-24 h-24',
    xl: 'w-32 h-32 md:w-40 md:h-40'
  };

  return (
    <div className={`relative rounded-full bg-gradient-to-b from-slate-700 to-slate-900 border-2 border-cyan-500 flex items-center justify-center ${sizeClasses[size] || sizeClasses.md}`}>
      <User className="w-1/2 h-1/2 text-slate-400" />
      {showEquipment && (
        <>
          <div className="absolute -right-2 top-0 bg-slate-800 p-1.5 rounded-full border border-purple-500">
            <Sword className="w-4 h-4 text-purple-400" />
          </div>
          <div className="absolute -left-2 bottom-0 bg-slate-800 p-1.5 rounded-full border border-yellow-500">
            <Shield className="w-4 h-4 text-yellow-400" />
          </div>
        </>
      )}
    </div>
  );
};

// --- PÁGINA PRINCIPAL ---

export default function PlayerProfile() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [player, setPlayer] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [shopItems, setShopItems] = useState([]);

  // Mock Data Fetching (Substituindo base44Client)
  useEffect(() => {
    // Simulando delay de rede
    const timer = setTimeout(() => {
      setPlayer({
        full_name: 'Neo Anderson',
        email: 'neo@matrix.com',
        level: 5,
        level_title: 'Cyber Hacker',
        xp: 350,
        total_xp: 4500,
        gold_coins: 1250,
        login_streak: 12,
        displayed_items: ['p1', 'p2']
      });

      setShopItems([
        { id: 'item1', name: 'Espada de Plasma', type: 'Arma', icon: '⚔️' },
        { id: 'item2', name: 'Escudo Neural', type: 'Defesa', icon: '🛡️' },
        { id: 'item3', name: 'Poção de Mana', type: 'Consumível', icon: '🧪' }
      ]);

      setPurchases([
        { id: 'p1', item_id: 'item1', created_by: 'neo@matrix.com' },
        { id: 'p2', item_id: 'item2', created_by: 'neo@matrix.com' }
      ]);

      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Função de Logout Simulada
  const handleLogout = async () => {
    console.log("A sair do sistema...");
    // Em produção seria: await base44.auth.signOut();
    navigate('/login'); 
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-cyan-400 text-xl animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            Carregando perfil...
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-red-400 text-xl">Jogador não encontrado</div>
      </div>
    );
  }

  const xpToNextLevel = player.level * 100;

  const stats = [
    {
      label: 'Nível',
      value: player.level || 1,
      icon: Trophy,
      color: 'from-yellow-500 to-orange-500'
    },
    {
      label: 'XP Total',
      value: (player.total_xp || 0).toLocaleString(),
      icon: Zap,
      color: 'from-cyan-500 to-blue-500'
    },
    {
      label: 'Gold Coins',
      value: (player.gold_coins || 0).toLocaleString(),
      icon: Coins,
      color: 'from-yellow-500 to-orange-500'
    },
    {
      label: 'Ofensiva',
      value: `${player.login_streak || 0} dias`,
      icon: Flame,
      color: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
        <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto relative overflow-hidden pb-20">
        
        {/* Header de Navegação */}
        <div className="flex items-center justify-between">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center px-4 py-2 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition-all"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
            </button>

            <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-all hover:scale-105"
            >
                <LogOut className="w-4 h-4 mr-2" />
                Sair do Sistema
            </button>
        </div>

        {/* Player Card */}
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
        >
            <NeonCard glowColor="purple" className="relative overflow-hidden">
            <motion.div 
                className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/10 to-magenta-500/10 rounded-full blur-3xl"
                animate={{ 
                scale: [1, 1.3, 1],
                rotate: [0, 180, 360]
                }}
                transition={{ duration: 10, repeat: Infinity }}
            />

            <div className="relative">
                <div className="flex flex-col md:flex-row gap-6">
                <motion.div 
                    className="flex justify-center md:justify-start"
                    whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.3 }}
                >
                    <AvatarDisplay user={player} size="xl" showEquipment />
                </motion.div>

                <div className="flex-1 space-y-4">
                    <div>
                    <motion.h1 
                        className="text-xl sm:text-2xl lg:text-3xl font-black text-white mb-2"
                        animate={{ 
                        textShadow: [
                            '0 0 10px rgba(0,255,255,0.3)',
                            '0 0 20px rgba(255,0,255,0.5)',
                            '0 0 10px rgba(0,255,255,0.3)'
                        ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {player.full_name || 'Jogador Desconhecido'}
                    </motion.h1>
                    <p className="text-cyan-400 text-sm flex items-center gap-2">
                        <Crown className="w-4 h-4 text-yellow-400" />
                        {player.level_title || 'Aventureiro Iniciante'}
                    </p>
                    </div>

                    <XPBar 
                        level={player.level || 1} 
                        currentXP={player.xp || 0} 
                        xpToNextLevel={xpToNextLevel} 
                    />
                </div>
                </div>

                {/* Display Selected Items Showcase */}
                {player.displayed_items && player.displayed_items.length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-cyan-900/20 to-magenta-900/20 border border-cyan-500/30 rounded-xl">
                    <h3 className="text-cyan-400 font-bold text-sm mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 fill-cyan-400" />
                    Vitrine de Itens
                    </h3>
                    <div className="flex gap-3 flex-wrap">
                    {player.displayed_items.map(purchaseId => {
                        const purchase = purchases.find(p => p.id === purchaseId);
                        if (!purchase) return null;
                        const item = shopItems.find(si => si.id === purchase.item_id);
                        if (!item) return null;
                        return (
                        <motion.div 
                            key={purchaseId} 
                            className="text-center bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] rounded-lg p-3 border border-cyan-500/30 cursor-pointer"
                            whileHover={{ scale: 1.1, borderColor: '#06b6d4' }}
                        >
                            <div className="text-4xl mb-2">{item.icon}</div>
                            <p className="text-white text-xs font-bold">{item.name}</p>
                            <p className="text-gray-400 text-[10px]">{item.type}</p>
                        </motion.div>
                        );
                    })}
                    </div>
                </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    const colors = [
                    { border: 'border-yellow-500/50', glow: 'shadow-[0_0_20px_rgba(234,179,8,0.5)]', icon: 'text-yellow-400' },
                    { border: 'border-purple-500/50', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]', icon: 'text-purple-400' },
                    { border: 'border-yellow-500/50', glow: 'shadow-[0_0_20px_rgba(234,179,8,0.5)]', icon: 'text-yellow-400' },
                    { border: 'border-orange-500/50', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.5)]', icon: 'text-orange-400' }
                    ];
                    const colorSet = colors[index % colors.length]; 
                    return (
                    <motion.div 
                        key={index} 
                        className={`bg-gradient-to-br from-[#1a1a2e]/90 to-[#0f0f1e]/90 backdrop-blur-sm rounded-xl p-4 border-2 ${colorSet.border} ${colorSet.glow} hover:scale-105 transition-all`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                            <Icon className={`w-5 h-5 text-white`} />
                        </div>
                        <p className="text-gray-400 text-xs uppercase font-semibold">{stat.label}</p>
                        </div>
                        <p className="text-white font-black text-2xl tracking-tight">
                        {stat.value}
                        </p>
                    </motion.div>
                    );
                })}
                </div>
            </div>
            </NeonCard>
        </motion.div>
        </div>
    </div>
  );
}