import NeonCard from './NeonCard';
import { Gamepad2, Trophy, Coins, TrendingUp } from 'lucide-react';

export default function MiniGamesWidget({ user }) {
  // Fetch mini-game progress from user data
  const savingsTowerProgress = user?.savings_tower_floor || 0;
  const savingsTowerTotal = user?.savings_tower_total || 0;
  const treasureHuntCaptured = user?.treasure_hunt_captured || 0;
  const weeksCompleted = user?.weeks_52_completed || 0;

  const stats = [
    {
      label: 'Torre da Poupança',
      value: `Andar ${savingsTowerProgress}`,
      subValue: `R$ ${savingsTowerTotal.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10'
    },
    {
      label: 'Caça ao Tesouro',
      value: `${treasureHuntCaptured} capturados`,
      icon: Trophy,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10'
    },
    {
      label: 'Desafio 52 Semanas',
      value: `${weeksCompleted}/52 semanas`,
      progress: (weeksCompleted / 52) * 100,
      icon: Coins,
      color: 'text-green-400',
      bg: 'bg-green-500/10'
    }
  ];

  return (
    <NeonCard glowColor="magenta">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-magenta-500 to-purple-500 flex items-center justify-center">
          <Gamepad2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Progresso em Mini-Games</h3>
          <p className="text-gray-400 text-sm">Suas conquistas gamificadas</p>
        </div>
      </div>

      <div className="space-y-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{stat.label}</p>
                  <p className={`${stat.color} font-bold`}>{stat.value}</p>
                  {stat.subValue && (
                    <p className="text-gray-400 text-xs">{stat.subValue}</p>
                  )}
                </div>
              </div>
              {stat.progress !== undefined && (
                <div className="w-20">
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${stat.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-1">{Math.round(stat.progress)}%</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </NeonCard>
  );
}