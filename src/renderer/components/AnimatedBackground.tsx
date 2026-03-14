import { motion } from 'motion/react';

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[#05060f]" />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 720,
          height: 720,
          left: '-10%',
          top: '-15%',
          background: 'radial-gradient(circle at 40% 40%, rgba(34,197,94,0.18) 0%, rgba(16,185,129,0.06) 50%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{ x: [0, 80, -40, 60, 0], y: [0, 60, 120, 40, 0], scale: [1, 1.08, 0.95, 1.05, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 500,
          height: 500,
          right: '-5%',
          top: '10%',
          background: 'radial-gradient(circle at 60% 40%, rgba(20,184,166,0.14) 0%, rgba(6,182,212,0.05) 50%, transparent 70%)',
          filter: 'blur(90px)',
        }}
        animate={{ x: [0, -60, 20, -40, 0], y: [0, 80, 30, 100, 0], scale: [1, 0.9, 1.1, 0.95, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,6,15,0.7) 100%)' }}
      />
    </div>
  );
}
