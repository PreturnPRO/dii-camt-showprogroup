import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  variant?: 'default' | 'student' | 'teacher' | 'staff' | 'company' | 'success';
  className?: string;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  variant = 'default',
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getColor = () => {
    switch (variant) {
      case 'student': return 'stroke-role-student';
      case 'teacher': return 'stroke-role-teacher';
      case 'staff': return 'stroke-role-staff';
      case 'company': return 'stroke-role-company';
      case 'success': return 'stroke-success';
      default: return 'stroke-primary';
    }
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={getColor()}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground leading-snug">{Math.round(progress)}%</span>
        {label && <span className="text-xs text-muted-foreground mt-1">{label}</span>}
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}
