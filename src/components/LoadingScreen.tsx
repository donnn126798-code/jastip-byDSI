import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, ShoppingBag, ShieldCheck, Gift } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const STEPS = [
  { text: 'Menghubungkan ke Sourcing Concierge...', icon: Sparkles, duration: 600 },
  { text: 'Menyelaraskan katalog butik kurasi premium...', icon: ShoppingBag, duration: 700 },
  { text: 'Memverifikasi keaslian Stanley Quencher 100%...', icon: ShieldCheck, duration: 600 },
  { text: 'Menyiapkan kemasan pita mewah & kartu ucapan...', icon: Gift, duration: 600 }
];

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    // Elegant incremental progress loading
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onComplete();
          }, 400); // Small premium fade-out delay
          return 100;
        }
        
        // Calculate the step based on progress
        const nextProgress = prev + 1;
        const stepIndex = Math.min(
          Math.floor((nextProgress / 100) * STEPS.length),
          STEPS.length - 1
        );
        setCurrentStepIndex(stepIndex);
        
        return nextProgress;
      });
    }, 22); // ~2.2 seconds total loading experience

    return () => clearInterval(interval);
  }, [onComplete]);

  const CurrentIcon = STEPS[currentStepIndex].icon;

  return (
    <motion.div
      initial={{ y: 0 }}
      exit={{ 
        y: '-100%',
        transition: { 
          duration: 0.85, 
          ease: [0.76, 0, 0.24, 1] // High-end expo bezier curve for ultra-smooth curtain lift
        } 
      }}
      className="fixed inset-0 z-[9999] bg-[#FFF5F6] bg-gradient-to-b from-[#FFF5F6] via-[#FFFBFB] to-[#FFEBEF] flex flex-col items-center justify-center p-6 select-none"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#FFF5F6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        userSelect: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}
    >
      {/* Delicate background circles decoration for visual depth */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FFDDE2]/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FFD5DC]/20 rounded-full blur-3xl pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ 
          opacity: 0, 
          scale: 0.95, 
          y: -15,
          transition: { duration: 0.32, ease: 'easeOut' }
        }}
        className="w-full max-w-sm text-center z-10 flex flex-col items-center"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          width: '100%',
          maxWidth: '384px'
        }}
      >
        
        {/* Animated Brand Emblem Header */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative mb-8"
          style={{ marginBottom: '32px', position: 'relative' }}
        >
          {/* Pulsing golden pink outer ring */}
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="absolute -inset-4 rounded-full border border-pink-200/60 pointer-events-none"
          ></motion.div>
          
          <div className="w-16 h-16 bg-white border border-pink-100/80 rounded-full flex items-center justify-center shadow-md" style={{ width: '64px', height: '64px', backgroundColor: '#FFFFFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStepIndex}
                initial={{ transform: 'rotate(-45deg)', opacity: 0, scale: 0.7 }}
                animate={{ transform: 'rotate(0deg)', opacity: 1, scale: 1 }}
                exit={{ transform: 'rotate(45deg)', opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.3 }}
                className="text-pink-500"
                style={{ color: '#ec4899' }}
              >
                <CurrentIcon className="w-7 h-7" style={{ width: '28px', height: '28px' }} />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Elegant Brand Logo & Sub */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="space-y-1.5"
          style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 font-sans" style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0, letterSpacing: '-0.025em' }}>
            Jastip byDSI
          </h2>
          <span className="text-[10px] tracking-[0.3em] font-extrabold uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-pink-500 block" style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#ec4899', display: 'block' }}>
            Luxury Sourcing Concierge
          </span>
        </motion.div>

        {/* Dynamic Premium Loading Text with subtle animations */}
        <div className="h-6 mt-10 mb-4 overflow-hidden flex items-center justify-center w-full" style={{ height: '24px', marginTop: '40px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStepIndex}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="text-xs font-medium text-slate-500 tracking-wide line-clamp-1"
              style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', margin: 0 }}
            >
              {STEPS[currentStepIndex].text}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* High-End Sleek Progress Bar Track & Trailing Line */}
        <div className="w-48 bg-slate-100/80 h-1 rounded-full relative overflow-hidden mb-2 border border-slate-200/10" style={{ width: '192px', height: '4px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden', position: 'relative', marginBottom: '8px' }}>
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-pink-300 via-pink-400 to-pink-500 rounded-full"
            style={{ height: '100%', backgroundColor: '#ec4899', borderRadius: '9999px' }}
          ></motion.div>
        </div>

        {/* Numeric percentage tracking styled elegantly */}
        <motion.span 
          className="text-[10px] font-bold text-pink-400 font-mono tracking-widest mt-1"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ fontSize: '10px', fontWeight: 'bold', color: '#f472b6', fontFamily: 'monospace', tracking: '0.1em', marginTop: '4px' }}
        >
          {progress}%
        </motion.span>
        
        {/* Quality Seal Footer in Loading layout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-16 text-[9px] uppercase tracking-[0.15em] text-slate-400 font-medium"
          style={{ marginTop: '64px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8', fontWeight: '500' }}
        >
          Jakarta Hub • Guaranteed compliance PMK
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
