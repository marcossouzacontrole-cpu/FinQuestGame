import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Target, Zap, BrainCircuit, Activity, AlertCircle } from 'lucide-react';
import NeonCard from './NeonCard';
import { AIGuidanceService } from '@/api/AIGuidanceService';

export default function BehavioralIntelligenceReports({ transactions = [], budgets = [] }) {
    const [reportType, setReportType] = useState('weekly');

    const { data: intelligence, isLoading, refetch } = useQuery({
        queryKey: ['behavioralIntelligence', reportType, transactions.length],
        queryFn: async () => {
            return await AIGuidanceService.getBehavioralReport(transactions);
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-[#0a0a1a] border-2 border-cyan-500/30 rounded-2xl min-h-[300px]">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 180, 360],
                        boxShadow: ["0 0 20px rgba(6,182,212,0.3)", "0 0 40px rgba(6,182,212,0.6)", "0 0 20px rgba(6,182,212,0.3)"]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-20 h-20 rounded-full border-4 border-cyan-500/50 flex items-center justify-center mb-6"
                >
                    <BrainCircuit className="w-10 h-10 text-cyan-400" />
                </motion.div>
                <h3 className="text-cyan-400 font-black text-xl uppercase tracking-widest mb-2">Processamento Neural</h3>
                <p className="text-slate-500 text-sm animate-pulse">Sincronizando logs de transações com o núcleo central...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Personality & Strategic Move */}
                <NeonCard glowColor="purple" className="lg:col-span-1">
                    <div className="text-center p-4">
                        <div className="inline-block p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-4">
                            <Brain className="w-12 h-12 text-purple-400" />
                        </div>
                        <h3 className="text-slate-400 text-xs uppercase font-bold tracking-[0.2em] mb-1">Perfil Psicológico</h3>
                        <h2 className="text-2xl font-black text-purple-400 mb-6">{intelligence?.personality}</h2>

                        <div className="p-4 bg-slate-900/80 rounded-xl border border-purple-500/20">
                            <div className="flex items-center gap-2 mb-2 text-cyan-400">
                                <Target className="w-4 h-4" />
                                <span className="text-[10px] uppercase font-black">Movimento Estratégico</span>
                            </div>
                            <p className="text-sm text-slate-300 italic">"{intelligence?.strategicMove}"</p>
                        </div>
                    </div>
                </NeonCard>

                {/* Insights & Mana Leaks */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
                        <h3 className="text-white font-bold flex items-center gap-2 mb-6 uppercase text-sm tracking-wider">
                            <Activity className="w-5 h-5 text-cyan-400" />
                            Descobertas do Sistema
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Padrões Detectados</span>
                                {intelligence?.findings?.map((f, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex gap-3 text-sm text-slate-300"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0" />
                                        <p>{f}</p>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <span className="text-[10px] text-red-500/70 font-black uppercase tracking-widest flex items-center gap-2">
                                    <Zap className="w-3 h-3" />
                                    Vazamentos de Mana (Gastos Críticos)
                                </span>
                                {intelligence?.manaLeaks?.map((l, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="p-3 bg-red-900/10 border border-red-500/20 rounded-lg text-sm text-red-300 flex gap-3"
                                    >
                                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <p>{l}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={() => refetch()}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all flex items-center gap-2"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            RECALIBRAR ANÁLISE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
