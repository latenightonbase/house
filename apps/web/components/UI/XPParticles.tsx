"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useXPNotification, XP_ACTION_LABELS } from "@/utils/providers/xpNotificationContext";
import { Sparkles, Star, Zap } from "lucide-react";

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  scale: number;
  rotation: number;
}

// Generate random particles for each notification
function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 200 - 100, // Random x offset from -100 to 100
    delay: Math.random() * 0.3, // Staggered start
    duration: 2 + Math.random() * 1, // 2-3 seconds
    scale: 0.5 + Math.random() * 0.5, // 0.5-1 scale
    rotation: Math.random() * 360,
  }));
}

// Sparkle particle component
function SparkleParticle({ particle }: { particle: Particle }) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -20,
        x: particle.x,
        scale: 0,
        rotate: particle.rotation,
      }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [0, 100, 200, 300],
        x: particle.x + (Math.random() * 40 - 20),
        scale: [0, particle.scale, particle.scale, 0],
        rotate: particle.rotation + 180,
      }}
      transition={{
        duration: particle.duration,
        delay: particle.delay,
        ease: "easeOut",
      }}
      className="absolute"
      style={{ left: `calc(50% + ${particle.x}px)` }}
    >
      <Star
        className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]"
        size={12 + Math.random() * 8}
        fill="currentColor"
      />
    </motion.div>
  );
}

// Main XP number component
function XPNumber({
  amount,
  action,
  index,
}: {
  amount: number;
  action: string;
  index: number;
}) {
  const xOffset = (index % 3 - 1) * 80; // Spread multiple notifications horizontally
  
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -50,
        x: xOffset,
        scale: 0.5,
      }}
      animate={{
        opacity: [0, 1, 1, 1, 0],
        y: [-50, 0, 50, 120, 200],
        scale: [0.5, 1.2, 1, 1, 0.8],
      }}
      transition={{
        duration: 2.5,
        ease: "easeOut",
        times: [0, 0.2, 0.4, 0.7, 1],
      }}
      className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none"
    >
      {/* Glow background */}
      <motion.div
        className="absolute inset-0 -m-4 rounded-full bg-gradient-to-r from-purple-500/30 via-primary/30 to-secondary/30 blur-xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 1,
          repeat: 2,
          ease: "easeInOut",
        }}
      />
      
      {/* XP Amount */}
      <motion.div
        className="relative flex items-center gap-2 bg-gradient-to-r from-purple-600/90 to-primary/90 px-4 py-2 rounded-full border border-white/30 shadow-lg shadow-purple-500/50"
        animate={{
          boxShadow: [
            "0 0 20px rgba(168, 85, 247, 0.5)",
            "0 0 40px rgba(168, 85, 247, 0.8)",
            "0 0 20px rgba(168, 85, 247, 0.5)",
          ],
        }}
        transition={{
          duration: 0.8,
          repeat: 3,
          ease: "easeInOut",
        }}
      >
        <Zap className="w-5 h-5 text-yellow-400" fill="currentColor" />
        <span className="text-2xl font-bold text-white drop-shadow-lg">
          +{amount}
        </span>
        <span className="text-lg font-semibold text-white/90">XP</span>
      </motion.div>
      
      {/* Action Label */}
      <motion.span
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: [0, 1, 1, 0], y: [0, 5, 10, 15] }}
        transition={{ duration: 2, delay: 0.3 }}
        className="text-sm font-medium text-white/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm"
      >
        {XP_ACTION_LABELS[action as keyof typeof XP_ACTION_LABELS] || action}
      </motion.span>
    </motion.div>
  );
}

export default function XPParticles() {
  const { activeNotifications } = useXPNotification();

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {activeNotifications.map((notification, index) => {
          const particles = generateParticles(10);
          
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              {/* Sparkle particles */}
              <div className="absolute top-20 left-0 right-0">
                {particles.map((particle) => (
                  <SparkleParticle key={particle.id} particle={particle} />
                ))}
              </div>
              
              {/* Main XP number */}
              <div className="absolute top-24 left-0 right-0">
                <XPNumber
                  amount={notification.amount}
                  action={notification.action}
                  index={index}
                />
              </div>
              
              {/* Extra decorative sparkles */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, delay: 0.2 }}
                className="absolute top-16 left-1/2 -translate-x-1/2"
              >
                <Sparkles className="w-8 h-8 text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.8)]" />
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
