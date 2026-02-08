import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.43, 0.13, 0.23, 0.96],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -20,
    transition: {
      duration: 0.3,
    },
  },
};

const glowVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: [0, 0.5, 0],
    transition: {
      duration: 1,
      ease: 'easeInOut',
    },
  },
};

export default function PageTransition({ children, pageKey }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="relative"
      >
        {/* Glow effect durante transição */}
        <motion.div
          variants={glowVariants}
          initial="initial"
          animate="animate"
          className="fixed inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 pointer-events-none z-50 blur-3xl"
        />
        
        {children}
      </motion.div>
    </AnimatePresence>
  );
}