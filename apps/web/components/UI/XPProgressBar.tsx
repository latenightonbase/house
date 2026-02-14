"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { Zap } from "lucide-react";

interface XPProgressBarProps {
  level: number;
  currentSeasonXP: number;
  xpToNextLevel: number;
  variant?: "mobile" | "desktop";
  className?: string;
}

export default function XPProgressBar({
  level,
  currentSeasonXP,
  xpToNextLevel,
  variant = "desktop",
  className = "",
}: XPProgressBarProps) {
  const [displayedXP, setDisplayedXP] = useState(currentSeasonXP);
  const [xpGain, setXPGain] = useState<number | null>(null);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const prevXPRef = useRef(currentSeasonXP);
  const prevLevelRef = useRef(level);

  // Calculate progress
  const currentLevelXP = displayedXP % xpToNextLevel;
  const progress = xpToNextLevel > 0 ? (currentLevelXP / xpToNextLevel) * 100 : 0;

  // Detect XP changes and animate
  useEffect(() => {
    const prevXP = prevXPRef.current;
    const prevLevel = prevLevelRef.current;
    
    if (currentSeasonXP !== prevXP) {
      const gain = currentSeasonXP - prevXP;
      
      if (gain > 0) {
        // Show XP gain indicator
        setXPGain(gain);
        setTimeout(() => setXPGain(null), 2000);
        
        // Animate the XP counter
        const duration = 1000; // 1 second animation
        const startTime = Date.now();
        const startXP = prevXP;
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out quad
          const eased = 1 - (1 - progress) * (1 - progress);
          const currentXP = Math.floor(startXP + (currentSeasonXP - startXP) * eased);
          
          setDisplayedXP(currentXP);
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setDisplayedXP(currentSeasonXP);
          }
        };
        
        requestAnimationFrame(animate);
      } else {
        setDisplayedXP(currentSeasonXP);
      }
      
      prevXPRef.current = currentSeasonXP;
    }
    
    // Check for level up
    if (level > prevLevel) {
      setIsLevelingUp(true);
      setTimeout(() => setIsLevelingUp(false), 1500);
      prevLevelRef.current = level;
    }
  }, [currentSeasonXP, level]);

  if (variant === "mobile") {
    return (
      <div className={`fixed bottom-16 left-0 right-0 max-w-screen bg-black border-t-2 border-secondary/50 backdrop-blur-md z-40 lg:hidden shadow-lg shadow-secondary/20 ${className}`}>
        <div className="grid grid-cols-1 gap-2 px-4 py-2.5 max-w-full">
          <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
            <div className="flex items-center gap-3 min-w-0">
              {/* Level Badge */}
              <motion.div
                animate={isLevelingUp ? {
                  scale: [1, 1.3, 1],
                  boxShadow: [
                    "0 0 0 rgba(168, 85, 247, 0)",
                    "0 0 30px rgba(168, 85, 247, 0.8)",
                    "0 0 0 rgba(168, 85, 247, 0)",
                  ],
                } : {}}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-primary to-secondary text-white text-sm font-bold rounded-full w-9 h-9 flex items-center justify-center border-2 border-purple-300 shadow-md flex-shrink-0"
              >
                {level}
              </motion.div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-purple-200 font-medium">Level {level}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-white truncate">
                    {displayedXP.toLocaleString()} XP
                  </span>
                  {/* XP Gain Indicator */}
                  <AnimatePresence>
                    {xpGain !== null && (
                      <motion.span
                        initial={{ opacity: 0, x: -10, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-xs font-bold text-green-400 flex items-center gap-0.5"
                      >
                        <Zap className="w-3 h-3" fill="currentColor" />
                        +{xpGain}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            <div className="text-xs text-purple-200/80 font-medium whitespace-nowrap">
              {progress.toFixed(2)}%
            </div>
          </div>
          {/* Progress Bar */}
          <div className="bg-purple-900/30 rounded-full h-2 overflow-hidden w-full relative">
            <motion.div
              className="h-full bg-gradient-to-r from-secondary to-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ 
                duration: 0.8, 
                ease: "easeOut",
              }}
            />
            {/* Shimmer effect on XP gain */}
            <AnimatePresence>
              {xpGain !== null && (
                <motion.div
                  initial={{ x: "-100%", opacity: 0 }}
                  animate={{ x: "200%", opacity: [0, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // Desktop variant
  return (
    <div className={`flex items-center gap-2 px-2 ${className}`}>
      {/* Level Badge */}
      <motion.div
        animate={isLevelingUp ? {
          scale: [1, 1.3, 1],
          boxShadow: [
            "0 0 0 rgba(168, 85, 247, 0)",
            "0 0 20px rgba(168, 85, 247, 0.8)",
            "0 0 0 rgba(168, 85, 247, 0)",
          ],
        } : {}}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-br from-primary to-secondary text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center border border-purple-300"
      >
        {level}
      </motion.div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-purple-200 font-medium leading-tight">Lvl {level}</span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-white leading-tight">
                {displayedXP.toLocaleString()} XP
              </span>
              {/* XP Gain Indicator */}
              <AnimatePresence>
                {xpGain !== null && (
                  <motion.span
                    initial={{ opacity: 0, x: -10, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-[10px] font-bold text-green-400 flex items-center gap-0.5"
                  >
                    <Zap className="w-2.5 h-2.5" fill="currentColor" />
                    +{xpGain}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
          <span className="text-[10px] text-purple-200/80 font-medium whitespace-nowrap">
            {progress.toFixed(2)}%
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-24 bg-purple-900/30 rounded-full h-1.5 overflow-hidden relative">
          <motion.div
            className="h-full bg-gradient-to-r from-secondary to-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ 
              duration: 0.8, 
              ease: "easeOut",
            }}
          />
          {/* Shimmer effect on XP gain */}
          <AnimatePresence>
            {xpGain !== null && (
              <motion.div
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: "200%", opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
