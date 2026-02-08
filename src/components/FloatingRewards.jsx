import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingRewards() {
    const [rewards, setRewards] = useState([]);

    useEffect(() => {
        const handleReward = (event) => {
            const { amount, type, reason } = event.detail;
            const id = Date.now() + Math.random();

            setRewards(prev => [...prev, { id, amount, type, reason }]);

            // Auto-remove after animation
            setTimeout(() => {
                setRewards(prev => prev.filter(r => r.id !== id));
            }, 2000);
        };

        window.addEventListener('finquest-reward', handleReward);
        return () => window.removeEventListener('finquest-reward', handleReward);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center">
            <AnimatePresence>
                {rewards.map((reward) => (
                    <motion.div
                        key={reward.id}
                        initial={{ opacity: 0, scale: 0.5, y: 0 }}
                        animate={{ opacity: 1, scale: 1.5, y: -150 }}
                        exit={{ opacity: 0, scale: 1.8 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="absolute flex flex-col items-center"
                    >
                        <div className={`
              text-4xl font-black italic tracking-tighter
              ${reward.type === 'xp' ? 'text-cyan-400 drop-shadow-[0_0_15px_rgba(0,255,255,1)]' :
                                reward.type === 'gold' ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(255,255,0,1)]' :
                                    'text-green-400 drop-shadow-[0_0_15px_rgba(0,255,0,1)]'}
            `}>
                            +{reward.amount} {reward.type?.toUpperCase()}
                        </div>
                        {reward.reason && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-white text-xs font-bold uppercase tracking-[0.2em] mt-2 bg-[#0a0a1a]/80 px-3 py-1 rounded-full border border-cyan-500/30 backdrop-blur-md"
                            >
                                {reward.reason}
                            </motion.div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
