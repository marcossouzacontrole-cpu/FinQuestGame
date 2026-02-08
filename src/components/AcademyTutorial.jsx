import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, GraduationCap, Star, Trophy, Zap, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const steps = [
    {
        title: "Bem-vindo à Academia FinQuest!",
        description: "Aqui você transformará conhecimento financeiro em poder real para sua jornada RPG. Aprenda a dominar suas finanças e ganhe recompensas épicas.",
        icon: <GraduationCap className="w-12 h-12 text-cyan-400" />,
        color: "cyan"
    },
    {
        title: "Módulos de Aprendizado",
        description: "Cada módulo completado concede XP e Moedas de Ouro. O conhecimento é a base de toda estratégia vencedora.",
        icon: <BookOpen className="w-12 h-12 text-blue-400" />,
        color: "blue"
    },
    {
        title: "Trilha de Estudo (Study Streak)",
        description: "Estude todos os dias para manter seu Combo! Sequências longas multiplicam seus ganhos de XP em até 2x.",
        icon: <Zap className="w-12 h-12 text-yellow-400" />,
        color: "yellow"
    },
    {
        title: "Emblemas e Conquistas",
        description: "Alcance marcos importantes para desbloquear emblemas exclusivos que provam sua maestria financeira.",
        icon: <Trophy className="w-12 h-12 text-emerald-400" />,
        color: "green"
    },
    {
        title: "Pronto para o Próximo Nível?",
        description: "Seu Dashboard evolui conforme você aprende. Use o que aprendeu aqui para otimizar seu orçamento e vencer batalhas.",
        icon: <Star className="w-12 h-12 text-magenta-400" />,
        color: "magenta"
    }
];

export default function AcademyTutorial({ open, onClose }) {
    const [currentStep, setCurrentStep] = useState(0);

    if (!open) return null;

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const currentData = steps[currentStep];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg overflow-hidden border border-white/10 bg-slate-900/90 rounded-2xl shadow-2xl"
                    style={{ boxShadow: `0 0 40px hsl(var(--neon-${currentData.color}) / 0.1)` }}
                >
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                        <motion.div
                            className="h-full transition-colors duration-500"
                            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                            transition={{ duration: 0.3 }}
                            style={{ backgroundColor: `hsl(var(--neon-${currentData.color}))` }}
                        />
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="p-8 text-center pt-12">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col items-center"
                        >
                            <div
                                className="p-4 rounded-2xl bg-white/5 mb-6 border transition-colors duration-500"
                                style={{ borderColor: `hsl(var(--neon-${currentData.color}) / 0.3)` }}
                            >
                                {currentData.icon}
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                                {currentData.title}
                            </h2>

                            <p className="text-slate-300 leading-relaxed text-lg mb-8">
                                {currentData.description}
                            </p>

                            <div className="flex items-center justify-between w-full mt-4">
                                <div className="flex gap-1.5">
                                    {steps.map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-1.5 rounded-full transition-all duration-300"
                                            style={{
                                                width: i === currentStep ? '24px' : '6px',
                                                backgroundColor: i === currentStep ? `hsl(var(--neon-${currentData.color}))` : 'rgba(255,255,255,0.1)'
                                            }}
                                        />
                                    ))}
                                </div>

                                <Button
                                    onClick={handleNext}
                                    className="font-bold px-6 h-12 rounded-xl group transition-all duration-500 border-none"
                                    style={{
                                        backgroundColor: `hsl(var(--neon-${currentData.color}))`,
                                        color: '#0f172a'
                                    }}
                                >
                                    {currentStep === steps.length - 1 ? "Começar Agora" : "Próximo"}
                                    <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
