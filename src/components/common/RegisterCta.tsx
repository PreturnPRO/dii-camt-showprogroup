import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/** zero dead-end empty state: no courses → go register (design.md §4.10) */
export function RegisterCta({ onClick }: { onClick?: () => void }) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  return (
    <button
      type="button"
      data-testid="register-cta"
      onClick={onClick ?? (() => navigate('/courses?tab=registration'))}
      className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-8 text-center text-sm font-medium text-blue-800 transition-colors cursor-pointer hover:border-blue-500 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900"
    >
      <BookOpen className="h-5 w-5 shrink-0" aria-hidden />
      <span>{language === 'en' ? 'No registered courses yet. Click to go to registration' : 'ยังไม่มีรายวิชาที่ลงทะเบียนในระบบ คลิกเพื่อไปหน้าลงทะเบียน'}</span>
      <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  );
}

/** the course list could not be loaded: say so, never "you have no courses" */
export function CoursesLoadError() {
  const { language } = useLanguage();
  return (
    <div data-testid="courses-load-error" role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {language === 'en' ? 'Could not load your courses. Please refresh the page.' : 'โหลดรายวิชาไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง'}
    </div>
  );
}
