import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, FileQuestion } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

const NotFound = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    document.title = "404 - ไม่พบหน้าเว็บ | Xchange";
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 font-sans text-slate-900 dark:text-slate-100">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-400">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          404
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3 tracking-tight">
          {t?.notFound?.title || 'ไม่พบหน้าที่คุณต้องการ'}
        </h1>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          {t?.notFound?.description || 'หน้าที่คุณกำลังเข้าถึงอาจถูกย้าย ลบ หรือ URL ไม่ถูกต้อง กรุณาตรวจสอบลิงก์อีกครั้งหรือกลับสู่หน้าหลัก'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t?.notFound?.goBack || 'ย้อนกลับ'}
          </Button>

          <Button
            asChild
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              {t?.notFound?.goHome || 'กลับหน้าหลัก'}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
