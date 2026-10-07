import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function GlobalPreloader() {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const isPublicRoute = ['/', '/login'].includes(location.pathname);
    const duration = isPublicRoute ? 900 : 0;

    if (duration > 0) {
      setIsLoading(true);
      const timeout = window.setTimeout(() => {
        setIsLoading(false);
      }, duration);
      const safetyTimeout = window.setTimeout(() => {
        setIsLoading(false);
      }, duration + 500);

      return () => {
        window.clearTimeout(timeout);
        window.clearTimeout(safetyTimeout);
      };
    } else {
      setIsLoading(false);
    }
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
          className="pointer-events-none fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#ffffff] dark:bg-[#000000] font-sans selection:bg-none"
          aria-hidden="true"
        >
          {/* Subtle noise texture overlay for a premium film-like feel */}
          <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

          <div className="relative z-10 flex flex-col items-center">
            
            {/* Extremely precise geometric typography */}
            <div className="flex items-center justify-center h-16 mb-8 overflow-hidden">
              <motion.div 
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-6"
              >
                <div className="flex items-center">
                  <span className="text-3xl md:text-4xl font-light text-black dark:text-white tracking-[0.4em] translate-x-[0.2em]">
                    DII
                  </span>
                </div>
                
                {/* Micro-interaction element: expanding dash */}
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "24px", opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="h-[1px] bg-black/40 dark:bg-white/40" 
                />
                
                <div className="flex items-center">
                  <span className="text-3xl md:text-4xl font-semibold text-black dark:text-white tracking-[0.4em] translate-x-[0.2em]">
                    CAMT
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Hyper-minimal loading indicator */}
            <div className="flex flex-col items-center gap-5 mt-4">
              {/* Expanding line that transforms into a progress bar */}
              <motion.div 
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-48 md:w-64 h-[1px] bg-black/10 dark:bg-white/10 overflow-hidden relative origin-center"
              >
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-black dark:bg-white origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.25, duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
                />
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-2"
              >
                {/* Blinking status dot */}
                <motion.div 
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white"
                />
                <span className="text-[10px] uppercase tracking-[0.3em] text-black/50 dark:text-white/50 font-medium">
                  Initializing
                </span>
              </motion.div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
