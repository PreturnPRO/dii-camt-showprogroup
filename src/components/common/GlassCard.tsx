import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface GlassCardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  variant?: 'default' | 'gradient' | 'glass';
  gradient?: 'blue' | 'purple' | 'green' | 'orange' | 'rose';
  className?: string;
  animate?: boolean;
  delay?: number;
}

const iconColors: Record<string, string> = {
  blue:   'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
  green:  'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
  rose:   'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20',
};

export function GlassCard({
  title,
  description,
  icon: Icon,
  children,
  variant = 'default',
  gradient = 'blue',
  className,
  animate = true,
  delay = 0,
}: GlassCardProps) {
  const cardContent = (
    <Card
      className={cn(
        'relative overflow-hidden transition-colors',
        'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
        variant === 'default' && 'hover:border-slate-300 dark:hover:border-slate-700',
        className
      )}
    >
      {(title || description || Icon) && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-slate-900 dark:text-white">
            {Icon && (
              <div className={cn('p-1.5 rounded-md', iconColors[gradient])}>
                <Icon className="w-4 h-4" />
              </div>
            )}
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-slate-500 dark:text-slate-400">{description}</CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.35 }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
}

// ─────────────────────────────────────────────
// QuickStat — ใช้ใน Dashboard ทุก role
// ─────────────────────────────────────────────
interface QuickStatProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'rose';
}

export function QuickStat({ label, value, icon: Icon, trend, color = 'blue' }: QuickStatProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={cn('p-2 rounded-lg', iconColors[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}