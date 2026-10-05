import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Code, ExternalLink, Layout, Smartphone, Sparkles } from 'lucide-react';

interface ProjectImageProps {
  src?: string;
  alt: string;
  className?: string;
  title?: string;
}

export function ProjectImage({ src, alt, className, title }: ProjectImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // If source is placeholder or invalid or errored, use high-fidelity mockup fallback
  const isInvalidUrl = !src || src.includes('example.com') || src.includes('placehold.co');
  const shouldShowFallback = hasError || isInvalidUrl;

  const isMobileApp = title?.toLowerCase().includes('mobile') || title?.toLowerCase().includes('journal');
  const isDashboard = title?.toLowerCase().includes('dashboard') || title?.toLowerCase().includes('campus');

  return (
    <div className={cn("relative w-full aspect-[16/10] max-h-56 overflow-hidden rounded-t-2xl bg-slate-900 border-b border-slate-200/80 dark:border-slate-800", className)}>
      {!shouldShowFallback && (
        <img
          src={src}
          alt={alt}
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

      {/* High-Fidelity UI Mockup Fallback (Never looks like an empty void) */}
      {shouldShowFallback && (
        <div className="absolute inset-0 w-full h-full select-none bg-gradient-to-br from-slate-900 via-[#0f172a] to-[#1e1b4b] flex flex-col justify-between p-3.5 sm:p-4">
          {/* Mockup Window Titlebar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="truncate max-w-[140px]">{title || 'showpro.app/project'}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              {isMobileApp ? 'iOS / Android' : 'Web App'}
            </div>
          </div>

          {/* Mockup Canvas Graphic */}
          <div className="my-auto flex items-center justify-center gap-4 py-2">
            {isMobileApp ? (
              // Mobile Mockup Graphic
              <div className="flex items-center gap-3">
                <div className="w-14 h-24 rounded-xl border-2 border-indigo-500/30 bg-indigo-950/40 p-1.5 shadow-lg flex flex-col justify-between">
                  <div className="w-6 h-1 rounded-full bg-white/20 mx-auto" />
                  <div className="space-y-1">
                    <div className="w-full h-2 rounded bg-indigo-400/40" />
                    <div className="w-3/4 h-1.5 rounded bg-indigo-400/20" />
                  </div>
                  <div className="w-3 h-3 rounded-full bg-indigo-500/40 mx-auto" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs tracking-tight">
                    <Smartphone className="w-4 h-4" />
                    <span>Mobile Application</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-[160px] font-medium">
                    {title}
                  </p>
                </div>
              </div>
            ) : isDashboard ? (
              // Dashboard Mockup Graphic
              <div className="flex items-center gap-3.5">
                <div className="w-24 h-16 rounded-lg border border-blue-500/30 bg-blue-950/40 p-1.5 shadow-lg flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div className="w-4 h-1.5 rounded bg-blue-400/50" />
                    <div className="w-2 h-2 rounded-full bg-blue-400/40" />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="h-6 rounded bg-blue-500/20" />
                    <div className="h-6 rounded bg-blue-500/30" />
                    <div className="h-6 rounded bg-blue-500/40" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs tracking-tight">
                    <Layout className="w-4 h-4" />
                    <span>Web Platform / Dashboard</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-[160px] font-medium">
                    {title}
                  </p>
                </div>
              </div>
            ) : (
              // Code / Software Graphic
              <div className="flex items-center gap-3">
                <div className="w-20 h-16 rounded-lg border border-purple-500/30 bg-purple-950/40 p-2 shadow-lg font-mono text-[9px] text-purple-300/80 flex flex-col justify-around">
                  <span className="text-purple-400">const app = () =&gt; &#123;</span>
                  <span className="text-slate-400 pl-2">return &lt;UI /&gt;;</span>
                  <span className="text-purple-400">&#125;;</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs tracking-tight">
                    <Code className="w-4 h-4" />
                    <span>Software Engineering</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-[160px] font-medium">
                    {title}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Footer Info inside Mockup */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-2 border-t border-white/5">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Verified Student Project
            </span>
            <span className="text-slate-500">Live Preview</span>
          </div>
        </div>
      )}

      {/* Hover Overlay: Centered 'View Project' with Glassmorphic Button */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
        <div className="px-4 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-xs font-semibold text-slate-900 dark:text-white border border-white/20 shadow-xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
          <span>View Project</span>
          <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
        </div>
      </div>
    </div>
  );
}
