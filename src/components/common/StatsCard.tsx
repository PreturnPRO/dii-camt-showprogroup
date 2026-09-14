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

export function StatsCard({ 
  title, 
  value, 
  subtitle,
  description, 
  icon, 
  trend, 
  variant = 'default',
  className 
}: StatsCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'student':
        return 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-800 border-blue-200 dark:border-slate-700';
      case 'teacher':
        return 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-slate-800 dark:to-slate-800 border-purple-200 dark:border-slate-700';
      case 'staff':
        return 'bg-gradient-to-br from-green-50 to-green-100 dark:from-slate-800 dark:to-slate-800 border-green-200 dark:border-slate-700';
      case 'company':
        return 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-slate-800 dark:to-slate-800 border-orange-200 dark:border-slate-700';
      case 'success':
        return 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-slate-800 dark:to-slate-800 border-emerald-200 dark:border-slate-700';
      case 'warning':
        return 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-slate-800 dark:to-slate-800 border-yellow-200 dark:border-slate-700';
      default:
        return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'student': return 'text-blue-600 dark:text-blue-400';
      case 'teacher': return 'text-purple-600 dark:text-purple-400';
      case 'staff': return 'text-green-600 dark:text-green-400';
      case 'company': return 'text-orange-600 dark:text-orange-400';
      case 'success': return 'text-emerald-600 dark:text-emerald-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-slate-700 dark:text-slate-300';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md",
        getVariantStyles(),
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 flex-1">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 tracking-tight">{title}</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
          {description && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{description}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-xs font-semibold pt-1">
              <span className={trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              {trend.label && <span className="text-slate-400 dark:text-slate-500">{trend.label}</span>}
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl bg-slate-100 dark:bg-slate-700/60 shrink-0", getIconColor())}>
          {React.cloneElement(icon, { className: cn("h-5 w-5", getIconColor()) })}
        </div>
      </div>
    </motion.div>
  );
}
