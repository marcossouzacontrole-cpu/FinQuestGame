import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MUSIC_TRACKS = {
  main: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
  battle: 'https://assets.mixkit.co/music/preview/mixkit-games-worldbeat-466.mp3',
};

let audioInstance = null;

export default function BackgroundMusic({ track = 'main' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.15);

  useEffect(() => {
    // Criar instância de áudio apenas uma vez
    if (!audioInstance) {
      audioInstance = new Audio(MUSIC_TRACKS[track]);
      audioInstance.loop = true;
      audioInstance.volume = volume;
    }

    return () => {
      // Cleanup ao desmontar
      if (audioInstance) {
        audioInstance.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (audioInstance) {
      audioInstance.volume = volume;
    }
  }, [volume]);

  const toggleMusic = () => {
    if (!audioInstance) return;

    if (isPlaying) {
      audioInstance.pause();
      setIsPlaying(false);
    } else {
      audioInstance.play().catch(() => {
        console.log('Música requer interação do usuário');
      });
      setIsPlaying(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1 }}
      className="fixed bottom-32 right-4 z-[60] lg:bottom-6 lg:right-6"
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleMusic}
        className="relative w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white/20 hover:shadow-purple-500/50 transition-shadow"
      >
        {/* Pulse effect when playing */}
        {isPlaying && (
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-purple-500 rounded-full"
          />
        )}

        {isPlaying ? (
          <Volume2 className="w-6 h-6 text-white relative z-10" />
        ) : (
          <VolumeX className="w-6 h-6 text-white relative z-10" />
        )}
      </motion.button>

      {/* Volume slider - aparece no hover */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-16 bottom-1/2 translate-y-1/2 bg-slate-900/90 backdrop-blur-sm border border-purple-500/30 rounded-lg p-2 hidden lg:block"
          >
            <input
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              onChange={(e) => setVolume(e.target.value / 100)}
              className="w-24 accent-purple-500"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}