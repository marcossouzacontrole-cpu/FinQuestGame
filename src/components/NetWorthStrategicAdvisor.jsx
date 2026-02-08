import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, Skull, Shield, BrainCircuit } from 'lucide-react';

export default function NetWorthStrategicAdvisor({ assets = [], debts = [] }) {
    const { data: strategicAdvice, isLoading } = useQuery({
        queryKey: ['netWorthStrategicAdvice', assets.length, debts.length],
        queryFn: async () => {
            // Format data for LLM
            const assetSummary = assets.map(a => `${a.name}: R$ ${a.value} (${a.type})`).join(', ');
            const debtSummary = debts.map(d => `${d.creditor}: R$ ${d.outstanding_balance} (Juros: ${d.interest_rate}%, Vencimento: ${d.due_date})`).join(', ');

            const prompt = `Você é o Oráculo Financeiro do FinQuest, um RPG de gestão financeira cyberpunk. 
      Analise o perfil de patrimônio abaixo e forneça 3 orientações estratégicas curtas e impactantes.
      Use uma linguagem motivadora, lembrando o estilo RPG (missões, inimigos, guardiões).
      
      ATIVOS (Guardiões): ${assetSummary || 'Nenhum guardião heróico ainda.'}
      PASSIVOS (Inimigos): ${debtSummary || 'Nenhum inimigo à vista. Céus limpos.'}
      
      Formate como JSON: { "strategies": [ { "type": "attack" | "defense" | "growth", "title": "...", "advice": "..." } ] }`;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt,
                system_prompt: "Você é um mentor especialista em finanças e RPG.",
                json_output: true
            });

            try {
                return JSON.parse(response.output);
            } catch (e) {
                // Fallback simple strategies if LLM output isn't perfect JSON
                return {
                    strategies: [
                        { type: 'growth', title: 'Foco em Guardiões', advice: 'Seus ativos são a base de sua força. Diversifique para aumentar seu poder passivo.' },
                        { type: 'attack', title: 'Ataque Letal', advice: 'Foques nas dívidas de maior juros primeiro para reduzir o dano contínuo ao seu caixa.' }
                    ]
                };
            }
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 border border-slate-700 rounded-xl min-h-[200px]">
                <motion.div
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <BrainCircuit className="w-12 h-12 text-cyan-400 mb-4" />
                </motion.div>
                <p className="text-cyan-400 text-sm font-bold animate-pulse uppercase tracking-widest">Consultando Oráculo...</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {strategicAdvice?.strategies?.map((strat, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-4 rounded-xl border-l-4 ${strat.type === 'attack' ? 'bg-red-900/10 border-red-500' :
                            strat.type === 'defense' ? 'bg-green-900/10 border-green-500' :
                                'bg-purple-900/10 border-purple-500'
                        }`}
                >
                    <div className="flex items-center gap-2 mb-2">
                        {strat.type === 'attack' ? <Skull className="w-4 h-4 text-red-500" /> :
                            strat.type === 'defense' ? <Shield className="w-4 h-4 text-green-500" /> :
                                <TrendingUp className="w-4 h-4 text-purple-500" />}
                        <h4 className="font-black text-xs uppercase text-slate-200 tracking-wider">
                            {strat.title}
                        </h4>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed italic">
                        "{strat.advice}"
                    </p>
                </motion.div>
            ))}
        </div>
    );
}
