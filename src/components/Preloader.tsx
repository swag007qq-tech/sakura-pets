import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PreloaderProps {
  onComplete?: () => void;
}

const PETALS = [
  { id: 1, left: '10%', delay: 0, duration: 3.4, size: 18, rotate: 25 },
  { id: 2, left: '18%', delay: 0.3, duration: 3.7, size: 14, rotate: -40 },
  { id: 3, left: '28%', delay: 0.12, duration: 3.1, size: 20, rotate: 55 },
  { id: 4, left: '38%', delay: 0.5, duration: 3.6, size: 15, rotate: -15 },
  { id: 5, left: '48%', delay: 0.22, duration: 3.3, size: 17, rotate: 35 },
  { id: 6, left: '58%', delay: 0.45, duration: 3.8, size: 14, rotate: -55 },
  { id: 7, left: '68%', delay: 0.1, duration: 3.2, size: 21, rotate: 20 },
  { id: 8, left: '78%', delay: 0.4, duration: 3.5, size: 16, rotate: -25 },
  { id: 9, left: '88%', delay: 0.18, duration: 3.7, size: 19, rotate: 45 },
  { id: 10, left: '24%', delay: 0.65, duration: 3.5, size: 13, rotate: 60 },
  { id: 11, left: '74%', delay: 0.6, duration: 3.4, size: 16, rotate: -48 },
];

export const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 1750);

    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sakura-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden select-none"
          style={{
            background:
              'radial-gradient(circle at 50% 48%, #fff9fd 0%, #fde9f5 50%, #fbd8ee 100%)',
          }}
        >
          {/* Soft glowing aura behind the logo */}
          <motion.div
            animate={{ scale: [0.95, 1.08, 1], opacity: [0.5, 0.85, 0.65] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-[min(340px,82vw)] h-[min(340px,82vw)] sm:w-[min(480px,78vmin)] sm:h-[min(480px,78vmin)] rounded-full blur-3xl pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(250,190,225,0.48) 55%, transparent 78%)',
            }}
          />

          {/* Drifting Cherry Blossom Petals */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
            {PETALS.map((petal) => (
              <motion.svg
                key={petal.id}
                viewBox="0 0 24 24"
                style={{
                  position: 'absolute',
                  left: petal.left,
                  top: '-10%',
                  width: petal.size,
                  height: petal.size,
                }}
                initial={{ y: -40, x: 0, rotate: petal.rotate, opacity: 0 }}
                animate={{
                  y: '115vh',
                  x: [0, 24, -18, 18],
                  rotate: [petal.rotate, petal.rotate + 160, petal.rotate + 320],
                  opacity: [0, 0.88, 0.88, 0],
                }}
                transition={{
                  duration: petal.duration,
                  delay: petal.delay,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                <defs>
                  <linearGradient id={`petalShimmer-${petal.id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="55%" stopColor="#FBCFE8" />
                    <stop offset="100%" stopColor="#F49EC9" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2C15 6 19 10 17 16C15.5 20 13 21 12 21C11 21 8.5 20 7 16C5 10 9 6 12 2Z"
                  fill={`url(#petalShimmer-${petal.id})`}
                />
              </motion.svg>
            ))}
          </div>

          {/* Pure Centered Logo Presentation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.84, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex items-center justify-center px-6 safe-area-shell"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              className="w-[min(300px,76vw)] sm:w-[min(420px,68vw)]"
            >
              <img
                src="/assets/sakura-logo.png"
                alt="Sakura Pets"
                referrerPolicy="no-referrer"
                className="w-full max-h-[65dvh] h-auto object-contain drop-shadow-[0_14px_32px_rgba(225,130,180,0.34)]"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
