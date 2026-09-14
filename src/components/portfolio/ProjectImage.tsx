import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Code, ExternalLink, Sparkles, Layout, Smartphone } from 'lucide-react';

interface ProjectImageProps {
  src?: string;
  alt: string;
  className?: string;
  title?: string;
}

export function ProjectImage({ src, alt, className, title }: ProjectImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // If source is obviously placeholder/example.com or invalid or errored, use fallback UI directly
  const isInvalidUrl = !src || src.includes('example.com') || src.includes('placehold.co');
  const shouldShowFallback = hasError || isInvalidUrl;

  // Generate deterministic subtle theme based on title
  const isMobileApp = title?.toLowerCase().includes('mobile') || title?.toLowerCase().includes('journal');
  const isDashboard = title?.toLowerCase().includes('dashboard') || title?.toLowerCase().includes('campus');

  return (
    <div className={cn("relative w-full aspect-video overflow-hidden rounded-t-2xl bg-[#090d16]", className)}>
      {!shouldShowFallback && (
        <img
          src={src}
          alt="" // Empty alt on purpose so browser never renders raw broken alt text if broken
          aria-label={alt}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          className={cn(
            "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105",
            isLoading ? "opacity-0" : "opacity-100"
          )}
        />
      )}

      {/* High-Polish SaaS Fallback Preview (Never shows broken icon or raw alt) */}
      {shouldShowFallback && (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-5 select-none bg-gradient-to-br from-slate-900 via-[#0d1424] to-[#0a0f1d] border-b border-slate-800/80">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
          
          {/* Subtle glowing radial gradient */}
          <div className="absolute w-32 h-32 rounded-full bg-blue-500/10 blur-2xl -top-4 -right-4 pointer-events-none" />
          <div className="absolute w-32 h-32 rounded-full bg-indigo-500/10 blur-2xl -bottom-4 -left-4 pointer-events-none" />

          {/* Center Graphic */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2.5 shadow-inner group-hover:scale-110 transition-transform duration-200">
              {isMobileApp ? (
                <Smartphone className="w-6 h-6 text-indigo-400" />
              ) : isDashboard ? (
                <Layout className="w-6 h-6 text-blue-400" />
              ) : (
                <Code className="w-6 h-6 text-blue-400" />
              )}
            </div>
            
            <div className="text-xs font-bold text-slate-200 tracking-tight line-clamp-1 max-w-[200px]">
              {title || 'Project Preview'}
            </div>
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span>ShowPro Verified Project</span>
            </div>
          </div>

          {/* Badge corner */}
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[9.5px] font-mono font-medium text-slate-400 backdrop-blur-sm">
            16:9 HD
          </div>
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
        <div className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-xs font-semibold text-slate-900 dark:text-white border border-white/20 shadow-lg flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
          <span>View Project</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
