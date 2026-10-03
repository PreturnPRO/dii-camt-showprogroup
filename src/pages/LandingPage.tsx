import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Users,
  Building2,
  Briefcase,
  GraduationCap,
  Trophy,
  Globe,
  CheckCircle2,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Clock,
  Menu,
  X,
  FileCheck,
  Shield,
  Layers,
  Laptop
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-30px" }}
    transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1.0] }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function LandingPage() {
  const { t, language, toggleLanguage } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Helper for smooth scrolling to anchor
  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div id="top" className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-x-hidden selection:bg-blue-600/15 selection:text-blue-600">
      {/* Top Navbar */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 px-4 sm:px-6 pt-3 sm:pt-4 pointer-events-none ${
          scrolled ? 'pt-2 sm:pt-3' : ''
        }`}
      >
        <div
          className={`pointer-events-auto mx-auto max-w-6xl flex items-center justify-between transition-all duration-300 ${
            scrolled
              ? 'h-16 px-5 sm:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl'
              : 'h-18 px-4 bg-transparent border-transparent shadow-none'
          }`}
        >
          {/* Logo (Clicks to top of page) */}
          <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 rounded-lg flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
              <img src="/showpro_logo.png" alt="Xchange" className="w-6 h-6 object-contain" />
            </div>
            <div className="flex flex-col">
              <div className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100 leading-none">Xchange</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase mt-1">DII CAMT CMU</div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => scrollToSection('features')}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              {t.landing.navFeatures}
            </button>
            <button
              onClick={() => scrollToSection('pillars')}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              {language === 'th' ? 'เสาหลักระบบ' : 'Core Pillars'}
            </button>
            <button
              onClick={() => scrollToSection('partners')}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              {t.landing.navPartners}
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              {t.landing.navContact}
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="h-9 px-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold gap-1.5"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{language === 'th' ? 'EN' : 'TH'}</span>
            </Button>

            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost" className="h-9 px-4 rounded-lg font-medium text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                {t.landing.login}
              </Button>
            </Link>

            <Link to="/register">
              <Button className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors">
                {t.landing.register}
              </Button>
            </Link>

            {/* Mobile Hamburger Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto md:hidden mx-auto max-w-6xl mt-2 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1 pb-3 border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => scrollToSection('features')}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t.landing.navFeatures}
                </button>
                <button
                  onClick={() => scrollToSection('pillars')}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {language === 'th' ? 'เสาหลักระบบ' : 'Core Pillars'}
                </button>
                <button
                  onClick={() => scrollToSection('partners')}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t.landing.navPartners}
                </button>
                <button
                  onClick={() => scrollToSection('contact')}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t.landing.navContact}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleLanguage}
                  className="h-9 px-3 rounded-lg text-xs font-medium gap-2 border-slate-200 dark:border-slate-700"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>{language === 'th' ? 'เปลี่ยนเป็น English' : 'Switch to ภาษาไทย'}</span>
                </Button>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="h-9 px-4 rounded-lg text-xs font-semibold">
                    {t.landing.login}
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60">
        {/* Subtle geometric grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f008_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-5xl text-center">
          {/* Institutional Badge */}
          <FadeIn delay={0.05} className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
              <span>{language === 'th' ? 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี มหาวิทยาลัยเชียงใหม่' : 'College of Arts, Media and Technology, CMU'}</span>
            </div>
          </FadeIn>

          {/* Main Title - Grounded and Professional */}
          <FadeIn delay={0.1}>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15] mb-6">
              {language === 'th' ? (
                <>
                  ระบบบริหารจัดการและบูรณาการภาคอุตสาหกรรม <br />
                  <span className="text-blue-600 dark:text-blue-400">Digital Industry Integration (Xchange)</span>
                </>
              ) : (
                <>
                  Digital Industry Integration & Career Management <br />
                  <span className="text-blue-600 dark:text-blue-400">Next-Generation Academic Ecosystem</span>
                </>
              )}
            </h1>
          </FadeIn>

          {/* Description */}
          <FadeIn delay={0.15}>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
              {language === 'th'
                ? 'แพลตฟอร์มศูนย์กลางข้อมูลวิชาการ จัดการตารางเรียน-ตารางสอน ติดตามภาระงาน พอร์ตโฟลิโอ และเครือข่ายสหกิจศึกษาระหว่างนักศึกษา อาจารย์ บุคลากร และภาคอุตสาหกรรมดิจิทัล'
                : 'A unified enterprise platform connecting students, faculty, personnel, and leading digital industry partners with real-time academic records, workload tracking, internship management, and talent discovery.'}
            </p>
          </FadeIn>

          {/* Call to Actions (Standard rectangular buttons, no pill shapes) */}
          <FadeIn delay={0.2} className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link to="/register" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors">
                {t.landing.getStartedFree}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto h-11 px-6 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {t.landing.viewDemo}
              </Button>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50 dark:bg-slate-950 relative border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
              System Modules
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
              {t.landing.featuresTitle1} {t.landing.featuresTitle2}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
              {t.landing.featuresDesc}
            </p>
          </div>

          {/* Symmetrical 4-Card Grid with Consistent Design */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Student Card */}
            <FadeIn delay={0.05} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t.landing.forStudents}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">{t.landing.forStudentsDesc}</p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>Student Portal</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </FadeIn>

            {/* Smart Analytics */}
            <FadeIn delay={0.1} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-6">
                  <FileCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t.landing.smartReports}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">{t.landing.smartReportsDesc}</p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>Analytics Engine</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </FadeIn>

            {/* Lecturer Card */}
            <FadeIn delay={0.15} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t.landing.forLecturers}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">{t.landing.forLecturersDesc}</p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>Academic Portal</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </FadeIn>

            {/* Industry Card */}
            <FadeIn delay={0.2} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-6">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t.landing.forIndustry}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">{t.landing.forIndustryDesc}</p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>Enterprise Pool</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Core System Pillars (Replaced fake metrics with authentic system capabilities) */}
      <section id="pillars" className="py-24 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-4">
              Integrated Architecture
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
              {language === 'th' ? 'เสาหลักโครงสร้างระบบ Xchange' : 'Core Architecture Pillars'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
              {language === 'th'
                ? 'ออกแบบตามโครงสร้างหลักสูตรและระเบียบการศึกษาของวิทยาลัยศิลปะ สื่อ และเทคโนโลยี เพื่อการใช้งานจริงอย่างเป็นระบบ'
                : 'Designed according to academic regulations and curriculum requirements for rigorous operational excellence.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: language === 'th' ? 'ระบบหลักสูตร & ทะเบียน' : 'Curriculum & Courses',
                desc: language === 'th' ? 'จัดการวิชาเรียน แผนการเรียน รูบริกการวัดผล และการตัดเกรดอิงตามเกณฑ์มาตรฐาน' : 'Course management, syllabus planning, evaluation rubrics, and standardized grading.',
                icon: BookOpen,
              },
              {
                title: language === 'th' ? 'ติดตามภาระงานอาจารย์' : 'Faculty Workload Tracking',
                desc: language === 'th' ? 'ระบบบันทึกและประมวลผลภาระงานสอน ที่ปรึกษา งานวิจัย และงานบริการวิชาการ' : 'Tracking teaching hours, advisory duties, research contributions, and institutional service.',
                icon: Layers,
              },
              {
                title: language === 'th' ? 'เครือข่ายฝึกงาน & สหกิจ' : 'Internship & MOU Network',
                desc: language === 'th' ? 'เชื่อมต่อสถานประกอบการชั้นนำ บันทึกสมุดฝึกงาน (Diary) และการประเมินจากผู้ควบคุม' : 'Industry partnerships, intern diary monitoring, and supervisor performance appraisals.',
                icon: Building2,
              },
              {
                title: language === 'th' ? 'พอร์ตโฟลิโอ & ทักษะดิจิทัล' : 'Talent Pool & E-Portfolio',
                desc: language === 'th' ? 'รวบรวมทักษะดิจิทัล ผลงานโปรเจกต์ และประวัติทางวิชาการเพื่อโอกาสทางอาชีพ' : 'Verified project showcase, digital skill rubrics, and academic credential verification.',
                icon: Laptop,
              },
            ].map((pillar, index) => (
              <FadeIn key={index} delay={index * 0.05} className="p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <pillar.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">{pillar.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{pillar.desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section id="partners" className="py-20 bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="text-center mb-12">
            <div className="text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase mb-2">
              Industry Collaboration
            </div>
            <h2 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {language === 'th' ? 'เครือข่ายความร่วมมือภาคอุตสาหกรรม' : 'Verified Industry Network'}
            </h2>
          </div>

          {/* Clean Partner Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            {[
              { name: 'CLBS', sub: 'Chiang Mai' },
              { name: 'AXONS', sub: 'Agri-Tech' },
              { name: 'G-ABLE', sub: 'Digital Solutions' },
              { name: 'BeNeat', sub: 'Tech Startup' },
              { name: 'TCC Group', sub: 'Enterprise' },
              { name: 'MOVE+', sub: 'Digital Media' },
            ].map((partner, idx) => (
              <div
                key={idx}
                className="p-5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center shadow-xs"
              >
                <div className="font-bold text-base text-slate-800 dark:text-slate-200 tracking-tight">{partner.name}</div>
                <div className="text-[11px] text-slate-400 mt-1">{partner.sub}</div>
              </div>
            ))}
          </div>

          {/* Institutional Endorsement Card (Replaced fake reviews with official CAMT endorsement) */}
          <div className="mt-16 max-w-3xl mx-auto p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center shadow-xs">
            <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">
              {language === 'th'
                ? 'หลักสูตรบูรณาการอุตสาหกรรมดิจิทัล (Digital Industry Integration)'
                : 'Digital Industry Integration Curriculum'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
              {language === 'th'
                ? 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี มหาวิทยาลัยเชียงใหม่ มุ่งมั่นพัฒนาแพลตฟอร์ม Xchange เพื่อสนับสนุนการเรียนการสอนแบบ Work-Integrated Learning (WIL) เสริมสร้างทักษะจริงและเชื่อมโยงโอกาสทางวิชาชีพอย่างไร้รอยต่อ'
                : 'College of Arts, Media and Technology (CAMT), Chiang Mai University is committed to fostering Work-Integrated Learning (WIL) through Xchange, enabling authentic industry competencies.'}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column: CTA & Links */}
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
                {t.landing.getInTouch}
              </div>
              <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-6">
                {language === 'th' ? 'พร้อมเริ่มต้นใช้งานระบบ?' : 'Ready to Get Started?'}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-8">
                {t.landing.contactDesc}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/register">
                  <Button className="w-full sm:w-auto h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm">
                    {t.landing.registerNow}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <a href="mailto:dii@camt.cmu.ac.th">
                  <Button variant="outline" className="w-full sm:w-auto h-11 px-6 rounded-lg text-sm font-semibold border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200">
                    <Mail className="w-4 h-4 mr-2" />
                    {t.landing.contactUs}
                  </Button>
                </a>
              </div>
            </div>

            {/* Right Column: Genuine University Contact Info Card (Replaced empty box) */}
            <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-sm space-y-6">
              <div>
                <div className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                  {language === 'th' ? 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี' : 'College of Arts, Media and Technology'}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">มหาวิทยาลัยเชียงใหม่ (CMU)</div>
              </div>

              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span>239 ถ.ห้วยแก้ว ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200</span>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <a href="tel:053942110" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">
                    053-942110
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <a href="mailto:dii@camt.cmu.ac.th" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">
                    dii@camt.cmu.ac.th
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <a href="https://www.camt.cmu.ac.th" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">
                    www.camt.cmu.ac.th
                  </a>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Clock className="w-3.5 h-3.5" />
                  <span>จันทร์ - ศุกร์ 08:30 - 16:30 น. (เว้นวันหยุดราชการ)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 pt-16 pb-12">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Col 1: Brand */}
            <div className="space-y-4">
              <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 group">
                <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-xs">
                  <img src="/showpro_logo.png" alt="Xchange" className="w-5 h-5 object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-slate-900 dark:text-slate-100 tracking-tight">Xchange</span>
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">DII CAMT CMU</span>
                </div>
              </Link>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                {t.landing.footerDesc1} {t.landing.footerDesc2}
              </p>
            </div>

            {/* Col 2: Navigation Links */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider text-xs">{t.landing.mainMenu}</h4>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <li>
                  <button onClick={() => scrollToSection('top')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {t.landing.home}
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('features')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {t.landing.navFeatures}
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('pillars')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {language === 'th' ? 'เสาหลักระบบ' : 'Core Pillars'}
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('partners')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {t.landing.navPartners}
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Portal Links */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider text-xs">{t.landing.forUsers}</h4>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <li>
                  <Link to="/login" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {t.landing.login}
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {t.landing.register}
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms-of-service" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Official Contact */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider text-xs">{t.landing.footerContact}</h4>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <li>
                  <a
                    href="https://www.camt.cmu.ac.th"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>www.camt.cmu.ac.th</span>
                  </a>
                </li>
                <li>
                  <a href="tel:053942110" className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>053-942110</span>
                  </a>
                </li>
                <li>
                  <a href="mailto:dii@camt.cmu.ac.th" className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>dii@camt.cmu.ac.th</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200/80 dark:border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div>
              &copy; {new Date().getFullYear()} Xchange (DII CAMT CMU). {t.landing.allRightsReserved}
            </div>
            <div className="flex gap-6">
              <Link to="/privacy-policy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
