import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Swords, ShieldAlert, Zap, Skull, Trophy, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const BossCard = ({ boss }) => {
    const progress = (boss.current_hp / boss.total_hp) * 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 border-4 border-slate-800 rounded-3xl p-6 relative overflow-hidden group hover:border-red-500/50 transition-all"
        >
            <div className="absolute top-0 right-0 p-4">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${boss.type === 'Epic' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300'
                    }`}>
                    {boss.type} BOSS
                </div>
            </div>

            <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-red-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
                    <img
                        src={boss.image_url}
                        alt={boss.name}
                        className="w-32 h-32 rounded-full border-4 border-slate-700 object-cover relative grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-900 border-2 border-red-500 rounded-full flex items-center justify-center">
                        <span className="text-red-500 font-black">Lv.{boss.level}</span>
                    </div>
                </div>

                <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">{boss.name}</h2>
                <div className="w-full space-y-2 mb-6">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">
                        <span>Resistência</span>
                        <span className="text-red-400">{Math.round(boss.current_hp)} HP</span>
                    </div>
                    <div className="h-4 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-red-600"
                        />
                    </div>
                </div>

                <Link to="/financialcore" className="w-full">
                    <button className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(220,38,38,0.3)] transition-all transform hover:-translate-y-1">
                        <Swords className="w-6 h-6" />
                        ATACAR (PAGAR)
                    </button>
                </Link>
            </div>
        </motion.div>
    );
};

export default function BattleArena() {
    const { data: arenaData, isLoading } = useQuery({
        queryKey: ['battleArena'],
        queryFn: async () => {
            const response = await base44.functions.invoke('getBattleArena', {});
            return response.data;
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    const bosses = arenaData?.arena?.bosses || [];

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-20">
            <div className="text-center space-y-4">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto"
                >
                    <Skull className="w-10 h-10 text-red-500" />
                </motion.div>
                <h1 className="text-5xl font-black text-white uppercase tracking-tighter">Arena de Batalha</h1>
                <p className="text-slate-400 max-w-2xl mx-auto">
                    Suas dívidas se tornaram monstros colossais que estão drenando sua energia.
                    Cada pagamento realizado é um ataque direto contra a escuridão. Derrote-os para recuperar sua honra!
                </p>
            </div>

            {bosses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {bosses.map((boss, idx) => (
                        <BossCard key={idx} boss={boss} />
                    ))}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-xl mx-auto p-12 text-center bg-green-500/10 border-2 border-dashed border-green-500/30 rounded-3xl"
                >
                    <Trophy className="w-16 h-16 text-green-400 mx-auto mb-6" />
                    <h3 className="text-white font-bold text-2xl mb-4 text-green-400">Paz na Arena!</h3>
                    <p className="text-slate-400 mb-8">
                        Nenhum monstro de dívida foi detectado. Sua disciplina financeira purificou os campos de batalha.
                    </p>
                    <Link to="/dashboard">
                        <button className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all flex items-center gap-2 mx-auto">
                            Voltar ao Dashboard <ArrowRight className="w-4 h-4" />
                        </button>
                    </Link>
                </motion.div>
            )}
        </div>
    );
}
