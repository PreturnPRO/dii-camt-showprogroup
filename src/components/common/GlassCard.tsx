import React from 'react';
import { motion, Easing } from 'framer-motion';
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
  const gradientStyles = {
    blue: 'from-blue-500/20 via-blue-400/10 to-transparent',
    purple: 'from-purple-500/20 via-purple-400/10 to-transparent',
    green: 'from-emerald-500/20 via-emerald-400/10 to-transparent',
    orange: 'from-orange-500/20 via-orange-400/10 to-transparent',
    rose: 'from-rose-500/20 via-rose-400/10 to-transparent',
  };

  const iconColors = {
    blue: 'text-blue-600 bg-blue-100',
    purple: 'text-purple-600 bg-purple-100',
    green: 'text-emerald-600 bg-emerald-100',
    orange: 'text-orange-600 bg-orange-100',
    rose: 'text-rose-600 bg-rose-100',
  };

  const cardContent = (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        variant === 'glass' && 'bg-white/50 backdrop-blur-lg border-white/20 shadow-xl',
        variant === 'gradient' && `bg-gradient-to-br ${gradientStyles[gradient]} border-${gradient}-200/50`,
        variant === 'default' && 'hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20',
        className
      )}
    >
      {variant === 'gradient' && (
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl" />
      )}
      
      {(title || description || Icon) && (
        <CardHeader className="relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {title && (
                <CardTitle className="flex items-center gap-3">
                  {Icon && (
                    <div className={cn('p-2 rounded-lg', iconColors[gradient])}>
                      <Icon className="w-5 h-5" />
                    </div>
                  )}
                    <span>{title}</span>
                  </CardTitle>
                )}
                {description && (
                  <CardDescription className="mt-1.5">{description}</CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent className="relative z-10">{children}</CardContent>
      </Card>
    );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
}

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
  const colorStyles = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-emerald-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    rose: 'from-rose-500 to-rose-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-gray-50 border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow dark:border-slate-700"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-sm font-medium',
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={cn(
          'p-3 rounded-xl bg-gradient-to-br text-white shadow-lg',
          colorStyles[color]
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      {/* Decorative element */}
      <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full opacity-50" />
    </motion.div>
  );
}
