import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  description?: string;
  icon: React.ReactElement;
  trend?: {
    value: number;
    label?: string;
    isPositive: boolean;
  };
  variant?: 'default' | 'student' | 'teacher' | 'staff' | 'company' | 'success' | 'warning';
  className?: string;
}

const variantIcon: Record<string, string> = {
  student: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  teacher: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
  staff:   'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  company: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
  success: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  warning: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
  default: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
};

export function StatsCard({
  title,
  value,
  subtitle,
  description,
  icon,
  trend,
  variant = 'default',
  className,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
        'rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 truncate">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          {trend && (
            <div className="flex items-center gap-1 text-xs font-medium">
              <span className={trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              {trend.label && <span className="text-slate-400 dark:text-slate-500">{trend.label}</span>}
            </div>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg shrink-0', variantIcon[variant] ?? variantIcon.default)}>
          {React.cloneElement(icon, {
            className: cn('h-5 w-5', (variantIcon[variant] ?? variantIcon.default).split(' ')[0]),
          })}
        </div>
      </div>
    </motion.div>
  );
}