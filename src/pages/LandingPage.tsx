import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, BookOpen, Users, Building2, Briefcase, GraduationCap, Trophy, Globe, CheckCircle2, Star, ChevronRight, Play, Mail, Phone, MapPin, Send, Sparkles, Shield, Zap, BarChart3, Handshake, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function LandingPage() {
  const { t, language, toggleLanguage } = useLanguage();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  // Create a scroll listener for dynamic navbar state
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-500">
      {/* Floating Glass Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ease-out px-4 sm:px-6 pt-4 sm:pt-6 pointer-events-none ${scrolled ? 'pt-2 sm:pt-4' : ''}`}>
        <div className={`pointer-events-auto mx-auto max-w-6xl flex items-center justify-between transition-all duration-700 ${scrolled
          ? 'h-16 px-6 bg-white/85 dark:bg-slate-900/85 backdrop-blur-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_10px_40px_rgba(15,23,42,0.08)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] rounded-full'
          : 'h-20 px-4 bg-transparent border-transparent shadow-none'
          }`}>
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-500 dark:to-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/20 dark:shadow-blue-500/20 group-hover:rotate-6 group-hover:scale-105 transition-all duration-300">
              <img src="/showpro_logo.png" alt="ShowPro" className="w-7 h-7 object-contain" />
            </div>
            <div className={`flex flex-col transition-opacity duration-300 ${scrolled ? 'scale-90 transform-origin-left' : ''}`}>
              <div className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-slate-100 leading-none">ShowPro</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-[0.1em] uppercase mt-0.5">Professionalism</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-slate-100/60 dark:bg-slate-800/60 backdrop-blur-sm px-2 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
            <a href="#features" className="px-4 py-1.5 rounded-full text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all">{t.landing.navFeatures}</a>
            <a href="#stats" className="px-4 py-1.5 rounded-full text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all">{t.landing.navStats}</a>
            <a href="#partners" className="px-4 py-1.5 rounded-full text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all">{t.landing.navPartners}</a>
            <a href="#contact" className="px-4 py-1.5 rounded-full text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all">{t.landing.navContact}</a>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="hidden sm:flex h-10 px-4 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 shadow-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all gap-2"
            >
              <Globe className="h-4 w-4" />
              <span>{language === 'th' ? 'EN' : 'TH'}</span>
            </Button>
            <div className="flex items-center gap-2 pl-2 sm:border-l border-slate-200/60 dark:border-slate-700/60">
              <Link to="/login" className="hidden sm:block">
                <Button variant="ghost" className="h-10 px-5 rounded-full font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  {t.landing.login}
                </Button>
              </Link>
              <Link to="/register">
                <Button className="h-10 px-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full font-bold shadow-[0_4px_15px_rgba(37,99,235,0.25)] hover:-translate-y-0.5 transition-all duration-300">
                  {t.landing.register}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[100vh] flex flex-col justify-center pt-32 pb-32 overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500/20">

        {/* Dynamic Abstract Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Animated mesh gradient blobs */}
          <div className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 60% at 20% 30%, rgba(59,130,246,0.30) 0%, transparent 60%),
                radial-gradient(ellipse 60% 80% at 80% 70%, rgba(99,102,241,0.30) 0%, transparent 55%),
                radial-gradient(ellipse 70% 50% at 60% 20%, rgba(14,165,233,0.25) 0%, transparent 50%),
                radial-gradient(ellipse 50% 70% at 10% 80%, rgba(147,51,234,0.20) 0%, transparent 60%),
                radial-gradient(ellipse 90% 40% at 90% 10%, rgba(56,189,248,0.20) 0%, transparent 55%)
              `,
              filter: 'blur(40px)',
            }}
          />
          <motion.div className="absolute inset-0"
            animate={{
              background: [
                `radial-gradient(ellipse 80% 60% at 20% 30%, rgba(59,130,246,0.30) 0%, transparent 60%),
                 radial-gradient(ellipse 60% 80% at 80% 70%, rgba(99,102,241,0.30) 0%, transparent 55%),
                 radial-gradient(ellipse 70% 50% at 60% 20%, rgba(14,165,233,0.25) 0%, transparent 50%),
                 radial-gradient(ellipse 50% 70% at 10% 80%, rgba(147,51,234,0.20) 0%, transparent 60%)`,
                `radial-gradient(ellipse 60% 80% at 40% 60%, rgba(59,130,246,0.25) 0%, transparent 60%),
                 radial-gradient(ellipse 80% 60% at 70% 20%, rgba(99,102,241,0.30) 0%, transparent 55%),
                 radial-gradient(ellipse 50% 70% at 30% 80%, rgba(14,165,233,0.25) 0%, transparent 50%),
                 radial-gradient(ellipse 70% 50% at 90% 50%, rgba(147,51,234,0.20) 0%, transparent 60%)`,
                `radial-gradient(ellipse 80% 60% at 20% 30%, rgba(59,130,246,0.30) 0%, transparent 60%),
                 radial-gradient(ellipse 60% 80% at 80% 70%, rgba(99,102,241,0.30) 0%, transparent 55%),
                 radial-gradient(ellipse 70% 50% at 60% 20%, rgba(14,165,233,0.25) 0%, transparent 50%),
                 radial-gradient(ellipse 50% 70% at 10% 80%, rgba(147,51,234,0.20) 0%, transparent 60%)`,
              ]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: 'blur(60px)' }}
          />
          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10 w-full flex-grow flex flex-col items-center justify-center">

          {/* Center Aligned Typography */}
          <div className="text-center w-full max-w-4xl mx-auto relative z-20 flex flex-col items-center">

            {/* Pill Badge */}
            <FadeIn delay={0.1} className="w-full flex justify-center">
              <div className="inline-flex items-center gap-2 mb-8 px-5 py-2 rounded-full border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer group">
                <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"></div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {language === 'th' ? 'พบกับ ShowPro โฉมใหม่' : 'Introducing Next-Gen ShowPro'}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all" />
              </div>
            </FadeIn>

            {/* Massive Bold Headline */}
            <FadeIn delay={0.2} className="w-full">
              <h1 className="text-[4rem] sm:text-[5rem] md:text-[6rem] lg:text-[7.5rem] font-bold tracking-tighter text-slate-900 dark:text-slate-100 leading-[0.95] mb-6 flex flex-col items-center">
                <span className="block opacity-90">{language === 'th' ? 'การศึกษาที่' : 'Learning.'}</span>
                <span className="relative inline-block mt-2">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300">
                    {language === 'th' ? 'ชาญฉลาดกว่าเดิม.' : 'Reimagined.'}
                  </span>
                </span>
              </h1>
            </FadeIn>

            {/* Subtitle */}
            <FadeIn delay={0.3} className="w-full">
              <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-400 mb-12 leading-relaxed font-light max-w-2xl mx-auto">
                {language === 'th'
                  ? 'ปลดล็อกศักยภาพของคุณด้วยแพลตฟอร์มจัดการพอร์ตโฟลิโอและทักษะที่ขับเคลื่อนด้วย AI ออกแบบมาให้เรียบหรู ทรงพลัง และเร็วที่สุด'
                  : 'Unlock your potential with an AI-driven portfolio and skill management platform designed to be sleek, powerful, and incredibly fast.'}
              </p>
            </FadeIn>

            {/* Call to Actions */}
            <FadeIn delay={0.4} className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <Link to="/register" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-14 px-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full text-lg font-semibold shadow-lg shadow-blue-600/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  {t.landing.getStartedFree}
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto h-14 px-10 rounded-full text-lg font-medium text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800/80 bg-white/80 hover:bg-slate-100 dark:bg-slate-900/80 dark:hover:bg-slate-800 backdrop-blur-md transition-all group">
                  {t.landing.viewDemo} <ChevronRight className="ml-2 w-5 h-5 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all" />
                </Button>
              </Link>
            </FadeIn>
          </div>

        </div>

        {/* Faded bottom gradient for transition */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-slate-50 dark:to-slate-950 pointer-events-none z-20"></div>
      </section>

      <section id="features" className="py-40 bg-slate-50 dark:bg-slate-950 relative overflow-hidden font-sans border-t border-slate-200/60 dark:border-slate-800/60">
        {/* Ethereal Floating Orbs & Fine Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f015_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f015_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#33415515_1px,transparent_1px),linear-gradient(to_bottom,#33415515_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_80%,transparent_100%)] z-0"></div>
        <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-gradient-to-b from-blue-500/15 to-indigo-500/15 rounded-full blur-[120px] pointer-events-none mix-blend-multiply opacity-60"></div>
        <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-t from-cyan-500/15 to-blue-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-multiply opacity-50"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-24 gap-12">
            <FadeIn className="max-w-3xl">
              <div className="mb-8 flex items-center gap-4">
                <div className="h-px w-16 bg-gradient-to-r from-blue-600 dark:from-blue-400 to-transparent"></div>
                <span className="text-blue-600 dark:text-blue-400 font-bold tracking-[0.3em] text-xs uppercase bg-blue-500/10 dark:bg-blue-400/15 px-4 py-1.5 rounded-full border border-blue-500/20 dark:border-blue-400/30">Next-Gen Architecture</span>
              </div>
              <h2 className="text-5xl lg:text-7xl lg:leading-[1.1] font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-700 to-blue-600 dark:from-slate-100 dark:via-slate-300 dark:to-blue-400 tracking-tighter">
                {t.landing.featuresTitle1} <br />
                <span className="font-light tracking-tight text-slate-500 dark:text-slate-400">{t.landing.featuresTitle2}</span>
              </h2>
            </FadeIn>
            <FadeIn delay={0.2} className="max-w-sm lg:pb-6">
              <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl leading-relaxed font-light">
                {t.landing.featuresDesc}
              </p>
            </FadeIn>
          </div>

          {/* Symmetrical 4-Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">

            {/* Student Card */}
            <FadeIn delay={0.1} className="h-full rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden relative group shadow-[0_4px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_30px_70px_-15px_rgba(37,99,235,0.15)] hover:-translate-y-1.5 transition-all duration-500 p-8 flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-500 dark:to-blue-600 flex items-center justify-center text-white mb-8 group-hover:scale-105 transition-transform duration-300 shadow-md shadow-blue-600/20">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">{t.landing.forStudents}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-light">{t.landing.forStudentsDesc}</p>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>Student Hub</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </FadeIn>

            {/* Smart Analytics */}
            <FadeIn delay={0.2} className="h-full rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden relative group shadow-[0_4px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_30px_70px_-15px_rgba(37,99,235,0.15)] hover:-translate-y-1.5 transition-all duration-500 p-8 flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-400/15 border border-blue-500/20 dark:border-blue-400/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-8 group-hover:scale-105 transition-transform duration-300">
                  <BarChart3 className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">{t.landing.smartReports}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-light">{t.landing.smartReportsDesc}</p>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>AI Insights</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </FadeIn>

            {/* Teacher Card */}
            <FadeIn delay={0.3} className="h-full rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden relative group shadow-[0_4px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_30px_70px_-15px_rgba(37,99,235,0.15)] hover:-translate-y-1.5 transition-all duration-500 p-8 flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm mb-8 group-hover:scale-105 transition-transform duration-300">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">{t.landing.forLecturers}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-light">{t.landing.forLecturersDesc}</p>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>Lecturer Portal</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </FadeIn>

            {/* Industry Card */}
            <FadeIn delay={0.4} className="h-full rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden relative group shadow-[0_4px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_30px_70px_-15px_rgba(37,99,235,0.15)] hover:-translate-y-1.5 transition-all duration-500 p-8 flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/5 dark:bg-cyan-400/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-400/15 border border-blue-500/20 dark:border-blue-400/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-8 group-hover:scale-105 transition-transform duration-300">
                  <Briefcase className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">{t.landing.forIndustry}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-light">{t.landing.forIndustryDesc}</p>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>Explore Network</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </FadeIn>

          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-40 bg-slate-900 dark:bg-slate-950 relative border-t border-slate-800 overflow-hidden">
        {/* Deep Field Ambient Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,transparent_60%)] rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.2)_0%,transparent_60%)] rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>

        {/* Geometric Light Traces */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-20 relative">
            <div className="hidden md:block absolute top-[40%] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>

            {[
              { label: 'Active Personnel & Students', value: '5,000', suffix: '+' },
              { label: 'Verified Industry Connections', value: '200', suffix: '+' },
              { label: 'Successful Placements', value: '98', suffix: '%' },
              { label: 'Overall System Rating', value: '4.9', suffix: '/5' },
            ].map((stat, i) => (
              <FadeIn key={i} delay={i * 0.15} className="relative flex flex-col items-center text-center cursor-default">
                <div className="relative z-10">
                  <div className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-6 flex items-baseline justify-center text-transparent bg-clip-text bg-gradient-to-b from-slate-50 to-slate-400">
                    {stat.value}
                    <span className="text-3xl md:text-4xl lg:text-5xl font-light ml-1 text-slate-400">{stat.suffix}</span>
                  </div>

                  <div className="h-[2px] w-8 bg-blue-500/30 mx-auto mb-6"></div>

                  <div className="text-sm text-slate-400 font-mono uppercase tracking-[0.2em] max-w-[180px] leading-relaxed">{stat.label}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section id="partners" className="py-40 bg-slate-50 dark:bg-slate-950 relative overflow-hidden font-sans border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="container mx-auto px-6 relative z-10">

          <div className="text-center mb-20">
            <FadeIn>
              <div className="text-[10px] font-bold tracking-[0.3em] text-slate-500 dark:text-slate-400 uppercase mb-4">Recognized Globally</div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Trusted by pioneers.</h2>
            </FadeIn>
          </div>

          <FadeIn delay={0.1} className="w-full relative mb-40">
            <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent z-10 pointer-events-none" />

            <div className="flex gap-16 overflow-hidden py-4 items-center opacity-50 hover:opacity-100 transition-opacity duration-700">
              <motion.div
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                className="flex gap-20 shrink-0 items-center"
              >
                {[...Array(2)].map((_, setIdx) => (
                  <React.Fragment key={setIdx}>
                    {[
                      { name: 'CLBS', logo: 'C L B S', font: 'font-serif' },
                      { name: 'Axons', logo: 'AXONS', font: 'font-sans' },
                      { name: 'Gable', logo: 'G-ABLE', font: 'font-mono tracking-tighter' },
                      { name: 'BeNeat', logo: 'BeNeat', font: 'font-sans lowercase' },
                      { name: 'TCC', logo: 'T C C', font: 'font-serif italic' },
                      { name: 'Move', logo: 'MOVE+', font: 'font-sans font-black' },
                    ].map((partner, i) => (
                      <div key={`${setIdx}-${i}`} className={`text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 cursor-default hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${partner.font}`}>
                        {partner.logo}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </motion.div>
            </div>
          </FadeIn>

          {/* Testimonial */}
          <div className="max-w-7xl mx-auto">
            <FadeIn delay={0.3} className="w-full max-w-3xl mx-auto relative z-30">
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-10 md:p-16 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(15,23,42,0.08)] border border-slate-200/60 dark:border-slate-800/60">
                <div className="mb-10 text-blue-600 dark:text-blue-400">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.017 21L16.411 14.364C16.634 13.722 16.586 13.018 16.281 12.433C15.976 11.848 15.441 11.439 14.8 11.282L15.399 9.539C16.822 9.878 18.006 10.778 18.679 12.062C19.352 13.346 19.453 14.89 18.96 16.289L16.566 22.925L14.017 21ZM5.01697 21L7.41097 14.364C7.63397 13.722 7.58597 13.018 7.28097 12.433C6.97597 11.848 6.44097 11.439 5.79997 11.282L6.39897 9.539C7.82197 9.878 9.00597 10.778 9.67897 12.062C10.352 13.346 10.453 14.89 9.95997 16.289L7.56597 22.925L5.01697 21Z" />
                  </svg>
                </div>
                <blockquote className="text-2xl md:text-4xl font-light leading-[1.3] text-slate-900 dark:text-slate-100 tracking-tight mb-12">
                  {t.landing.testimonialQuote}
                </blockquote>
                <div className="flex items-center gap-6">
                  <div className="h-px w-16 bg-slate-300 dark:bg-slate-700"></div>
                  <div>
                    <div className="font-bold tracking-tight text-slate-900 dark:text-slate-100 text-lg">{t.landing.testimonialName}</div>
                    <div className="text-slate-500 dark:text-slate-400 font-medium text-sm">{t.landing.testimonialRole}</div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>

        </div>
      </section>

      {/* CTA / Contact Section */}
      <section id="contact" className="py-32 md:py-48 relative bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-indigo-500/10 dark:bg-indigo-900/20 rounded-full blur-[120px] -translate-x-1/2 translate-y-1/4"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

            <div className="max-w-2xl">
              <FadeIn>
                <div className="inline-flex items-center gap-3 mb-8">
                  <div className="h-px w-8 bg-blue-600 dark:bg-blue-400"></div>
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-[0.2em]">Start Your Journey</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-slate-100 tracking-tighter mb-8 leading-[1.1]">
                  Let's create <br className="hidden md:block" /> something great.
                </h2>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-light leading-relaxed mb-12">
                  {t.landing.ctaDesc} Join our ecosystem of leading professionals, cutting-edge organizations, and visionary educators.
                </p>

                <div className="flex flex-col sm:flex-row gap-5">
                  <Link to="/register" className="group">
                    <Button size="lg" className="w-full sm:w-auto h-16 px-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-[2rem] text-lg font-bold tracking-tight transition-all duration-500 shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)] hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5)] hover:-translate-y-1">
                      {t.landing.registerNow}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/contact" className="group">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[2rem] text-lg font-bold tracking-tight transition-all duration-300">
                      {t.landing.contactUs}
                    </Button>
                  </Link>
                </div>
              </FadeIn>
            </div>

            <div className="relative">
              <FadeIn delay={0.2} className="relative z-10">
                <div className="aspect-[4/3] rounded-[3rem] bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_40px_100px_-20px_rgba(15,23,42,0.08)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] p-10 flex flex-col justify-between overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-600/10 to-cyan-500/10 rounded-full blur-3xl"></div>
                </div>
              </FadeIn>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-slate-50 dark:bg-slate-950 pt-24 pb-10 border-t border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-16 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-500 dark:to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                  SP
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xl text-slate-900 dark:text-slate-100 tracking-tight">ShowPro</span>
                  <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Professionalism</span>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm font-medium">
                {t.landing.footerDesc1}<br />
                {t.landing.footerDesc2}<br />
                {t.landing.footerDesc3}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-6 uppercase tracking-wider text-sm">{t.landing.mainMenu}</h4>
              <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium text-sm">
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-1 inline-block transition-all">{t.landing.home}</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-1 inline-block transition-all">{t.landing.aboutUs}</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-1 inline-block transition-all">{t.landing.curriculum}</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-1 inline-block transition-all">{t.landing.news}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-6 uppercase tracking-wider text-sm">{t.landing.forUsers}</h4>
              <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium text-sm">
                <li><Link to="/login" className="hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-1 inline-block transition-all">{t.landing.login}</Link></li>
                <li><Link to="/register" className="hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-1 inline-block transition-all">{t.landing.register}</Link></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-1 inline-block transition-all">{t.landing.userGuide}</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-1 inline-block transition-all">{t.landing.reportIssue}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-6 uppercase tracking-wider text-sm">{t.landing.footerContact}</h4>
              <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium text-sm">
                <li className="flex items-center gap-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 -ml-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  www.camt.cmu.ac.th
                </li>
                <li className="flex items-center gap-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 -ml-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  053-942110
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-slate-500 dark:text-slate-400">
            <div>&copy; {new Date().getFullYear()} ShowPro. {t.landing.allRightsReserved}</div>
            <div className="flex gap-8">
              <Link to="/privacy-policy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
