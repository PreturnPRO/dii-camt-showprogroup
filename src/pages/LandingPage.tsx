import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, BookOpen, Users, Building2, Briefcase, GraduationCap, Trophy, Globe, CheckCircle2, Star, ChevronRight, Play, Mail, Phone, MapPin, Send, Sparkles, Shield, Zap, BarChart3, Handshake, Clock, Lock, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';

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

const FloatingShapes = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <motion.div
      animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-1/4 left-[10%] w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl"
    />
    <motion.div
      animate={{ y: [0, 30, 0], x: [0, -20, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      className="absolute top-1/3 right-[15%] w-32 h-32 bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 rounded-full blur-2xl"
    />
    <motion.div
      animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 0] }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      className="absolute bottom-1/4 left-[20%] w-40 h-40 bg-gradient-to-t from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl"
    />
  </div>
);

export default function LandingPage() {
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
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
    <div className="min-h-screen bg-white dark:bg-slate-900 overflow-hidden font-sans text-slate-900 dark:text-slate-200">
      {/* Floating Glass Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ease-out px-4 sm:px-6 pt-4 sm:pt-6 pointer-events-none ${scrolled ? 'pt-2 sm:pt-4' : ''}`}>
        <div className={`pointer-events-auto mx-auto max-w-6xl flex items-center justify-between transition-all duration-700 ${scrolled
            ? 'h-16 px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/20 dark:border-slate-800/50 shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-full'
            : 'h-20 px-4 bg-transparent border-transparent shadow-none'
          }`}>
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30 group-hover:rotate-6 group-hover:scale-105 transition-all duration-300">
              <img src="/showpro_logo.png" alt="ShowPro" className="w-7 h-7 object-contain" />
            </div>
            <div className={`flex flex-col transition-opacity duration-300 ${scrolled ? 'scale-90 transform-origin-left' : ''}`}>
              <div className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white leading-none">ShowPro</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-[0.1em] uppercase mt-0.5">Professionalism</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm px-2 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800 shadow-inner">
            <a href="#features" className="px-4 py-1.5 rounded-full text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all">{t.landing.navFeatures}</a>
            <a href="#stats" className="px-4 py-1.5 rounded-full text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all">{t.landing.navStats}</a>
            <a href="#partners" className="px-4 py-1.5 rounded-full text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all">{t.landing.navPartners}</a>
            <a href="#contact" className="px-4 py-1.5 rounded-full text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all">{t.landing.navContact}</a>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="hidden sm:flex h-10 px-4 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 shadow-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-all gap-2"
            >
              <Globe className="h-4 w-4" />
              <span>{language === 'th' ? 'EN' : 'TH'}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-10 w-10 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 shadow-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-all flex items-center justify-center p-0"
              aria-label="Toggle dark mode"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <div className="flex items-center gap-2 pl-2 sm:border-l border-slate-200 dark:border-slate-700">
              <Link to="/login" className="hidden sm:block">
                <Button variant="ghost" className="h-10 px-5 rounded-full font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  {t.landing.login}
                </Button>
              </Link>
              <Link to="/register">
                <Button className="h-10 px-6 bg-slate-900 hover:bg-blue-600 text-white rounded-full font-bold shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_25px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-300">
                  {t.landing.register}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Elegant, Professional & Slightly Playful */}
      <section className="relative min-h-[95vh] flex items-center pt-24 pb-32 overflow-hidden bg-slate-50 dark:bg-slate-950 selection:bg-blue-200/50 font-sans">

        {/* Soft Modern Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_10%,transparent_80%)] opacity-60"></div>

          <motion.div
            animate={{ rotate: 360, scale: [1, 1.05, 1] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -right-[5%] w-[40vw] h-[40vw] rounded-full filter blur-[100px] opacity-40 bg-gradient-to-tr from-blue-200 via-indigo-100 to-white dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-transparent mix-blend-multiply dark:mix-blend-soft-light"
          />
          <motion.div
            animate={{ rotate: -360, scale: [1, 1.1, 1] }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
            className="absolute top-[30%] -left-[10%] w-[50vw] h-[50vw] rounded-full filter blur-[120px] opacity-40 bg-gradient-to-br from-indigo-100 via-blue-50 to-white dark:from-indigo-900/20 dark:via-blue-900/20 dark:to-transparent mix-blend-multiply dark:mix-blend-soft-light"
          />
        </div>

        <FloatingShapes />

        <div className="container mx-auto px-6 relative z-10 w-full mt-10">
          <div className="grid lg:grid-cols-12 gap-16 lg:gap-10 items-center">

            {/* Left Column: Clean Elegant Typography */}
            <div className="lg:col-span-6 text-left w-full max-w-2xl mx-auto lg:mx-0 relative">

              {/* Refined Badge */}
              <FadeIn delay={0.1}>
                <div className="inline-flex items-center gap-3 mb-8 px-5 py-2.5 rounded-full bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 backdrop-blur-xl shadow-sm hover:bg-white/80 transition-colors dark:border-slate-700/60 dark:bg-slate-800/80">
                  <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">
                    {language === 'th' ? 'ShowPro Platform' : 'Professional Showcase Platform'}
                  </span>
                </div>
              </FadeIn>

              {/* Elegant Headline */}
              <FadeIn delay={0.2}>
                <h1 className="text-5xl md:text-6xl lg:text-[4.8rem] font-bold tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.1] font-sans">
                  <span className="text-slate-800 dark:text-slate-200">{language === 'th' ? 'การศึกษาที่' : 'Empowering'}</span><br />
                  <span className="relative inline-block mt-2">
                    <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600">
                      {language === 'th' ? 'ไร้ขีดจำกัด' : 'Digital Education'}
                    </span>
                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-blue-400/30 -z-10" viewBox="0 0 100 20" preserveAspectRatio="none">
                      <path d="M0,10 Q50,20 100,10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                    </svg>
                  </span>
                </h1>
              </FadeIn>

              {/* Crisp Description */}
              <FadeIn delay={0.3}>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed font-light max-w-lg border-l-2 border-indigo-200 dark:border-indigo-800 pl-6">
                  {language === 'th'
                    ? 'ยกระดับประสบการณ์การเรียนรู้ และพัฒนาทักษะด้วยระบบอัจฉริยะที่ออกแบบมาให้ใช้งานง่าย มืออาชีพ และสร้างสรรค์'
                    : t.landing.heroDescAlt}
                </p>
              </FadeIn>

              {/* Modern Playful CTAs */}
              <FadeIn delay={0.4}>
                <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4">
                  <Link to="/register" className="w-full sm:w-auto relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                    <Button size="lg" className="relative w-full sm:w-auto h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-base font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                      {t.landing.getStartedFree} <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/features" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-full text-base font-medium transition-all group bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
                      <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 group-hover:scale-110 transition-transform">
                        <Play className="w-3.5 h-3.5 ml-0.5" />
                      </div>
                      {t.landing.viewDemo}
                    </Button>
                  </Link>
                </div>
              </FadeIn>
            </div>

            {/* Right Column: Clean Light Glass Mockups */}
            <div className="lg:col-span-6 relative w-full h-[650px] hidden lg:flex items-center justify-center perspective-[2500px]">

              {/* Playful Floating Core */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 50, repeat: Infinity, ease: "linear" }} className="w-[500px] h-[500px] border border-blue-100 dark:border-blue-900/30 rounded-full"></motion.div>
                <div className="w-[350px] h-[350px] border border-indigo-50 dark:border-indigo-900/30 border-dashed rounded-full absolute"></div>
              </div>

              {/* Main Light Glass Application Panel */}
              <FadeIn delay={0.6} className="absolute z-30">
                <motion.div
                  initial={{ rotateY: -10, rotateX: 5 }}
                  animate={{ y: [-8, 8, -8], rotateY: [-8, -4, -8] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                  className="w-[480px] h-[340px] rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-white dark:border-slate-800 backdrop-blur-2xl p-1 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  {/* MacOS Style Top Bar */}
                  <div className="h-10 bg-white/40 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 gap-2 relative z-10 dark:bg-slate-900/50">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                    </div>
                    <div className="mx-auto flex items-center justify-center gap-2 w-48 h-6 bg-white/60 dark:bg-slate-900/60 rounded-md border border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-medium dark:bg-slate-900/50">
                      <Lock className="w-3 h-3 text-slate-400" />
                      workspace.showpro.app
                    </div>
                  </div>

                  {/* App Content */}
                  <div className="p-5 flex gap-5 relative z-10">
                    {/* Sidebar */}
                    <div className="w-16 space-y-3">
                      {[1, 2, 3, 4].map(i => (
                        <motion.div
                          key={i}
                          whileHover={{ scale: 1.05 }}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${i === 1 ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                          <div className="w-4 h-4 bg-current rounded-sm opacity-80"></div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Main Area */}
                    <div className="flex-1 space-y-4">
                      {/* Hero Stat */}
                      <div className="h-28 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-500/20 p-5 relative overflow-hidden flex flex-col justify-end shadow-md">
                        <div className="absolute right-[-10%] top-[-20%] w-32 h-32 bg-white/20 blur-2xl rounded-full dark:bg-slate-900/50"></div>
                        <div className="text-white/80 text-[11px] uppercase font-bold tracking-widest mb-1">{language === 'th' ? 'ผลการเรียนล่าสุด' : 'Latest Performance'}</div>
                        <div className="text-3xl font-black text-white">4.00 <span className="text-xs font-medium text-emerald-100 bg-emerald-500/30 px-2 py-0.5 rounded-full ml-2 backdrop-blur-sm">Top 5%</span></div>
                      </div>

                      {/* Small Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 shadow-sm hover:shadow-md transition-shadow">
                          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center mb-2 dark:bg-slate-800">
                            <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                          </div>
                          <div className="h-2 w-16 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                        </div>
                        <div className="h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 shadow-sm hover:shadow-md transition-shadow">
                          <div className="w-7 h-7 rounded-full bg-cyan-100 flex items-center justify-center mb-2">
                            <div className="w-3 h-3 bg-cyan-500 rounded-sm"></div>
                          </div>
                          <div className="h-2 w-20 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </FadeIn>

              {/* Floating Element: Minimalist AI Badge */}
              <FadeIn delay={1.0} className="absolute z-40 top-[15%] right-[5%]">
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="px-4 py-3 rounded-2xl bg-white/90 border border-slate-200 dark:border-slate-700 backdrop-blur-xl shadow-xl flex items-center gap-3 dark:bg-slate-900/50"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center border border-indigo-50 dark:border-indigo-800/50">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">{language === 'th' ? 'AI วิเคราะห์' : 'AI Analysis'}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Processing skills...</div>
                  </div>
                </motion.div>
              </FadeIn>

              {/* Floating Element: Bright Graph */}
              <FadeIn delay={1.2} className="absolute z-20 bottom-[10%] left-[5%]">
                <motion.div
                  animate={{ y: [0, 15, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="w-48 p-4 rounded-3xl bg-white/80 border border-slate-100 dark:border-slate-800 backdrop-blur-xl shadow-xl dark:bg-slate-900/50"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <div className="flex justify-between items-end h-10 gap-1 px-1">
                    {[30, 45, 60, 40, 80, 55, 90, 100].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 1, delay: 1.5 + (i * 0.1) }}
                        className="w-full bg-blue-500/20 hover:bg-blue-500 rounded-sm relative group cursor-pointer transition-colors"
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded font-bold transition-all z-50 shadow-sm">
                          {h}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </FadeIn>

            </div>

          </div>
        </div>

        {/* Soft Blend to next section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-slate-50 dark:to-slate-950 pointer-events-none z-20"></div>
      </section>
      <section id="features" className="py-40 bg-[#f8fafc] dark:bg-slate-950 relative overflow-hidden font-sans border-t border-slate-100 dark:border-slate-800">
        {/* Ethereal Floating Orbs & Fine Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b80_1px,transparent_1px),linear-gradient(to_bottom,#1e293b80_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_80%,transparent_100%)] z-0"></div>
        <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-gradient-to-b from-blue-300/30 to-purple-300/30 rounded-full blur-[120px] pointer-events-none mix-blend-multiply opacity-60"></div>
        <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-t from-cyan-300/30 to-emerald-300/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply opacity-50"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-24 gap-12">
            <FadeIn className="max-w-3xl">
              <div className="mb-8 flex items-center gap-4">
                <div className="h-px w-16 bg-gradient-to-r from-blue-600 to-transparent"></div>
                <span className="text-blue-600 font-bold tracking-[0.3em] text-xs uppercase bg-blue-50 dark:bg-blue-900/30 px-4 py-1.5 rounded-full border border-blue-100/50 dark:border-blue-800/50 dark:text-blue-400">Next-Gen Architecture</span>
              </div>
              <h2 className="text-5xl lg:text-7xl lg:leading-[1.1] font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500 dark:from-white dark:to-slate-400 tracking-tighter">
                {t.landing.featuresTitle1} <br />
                <span className="font-light tracking-tight text-slate-400">{t.landing.featuresTitle2}</span>
              </h2>
            </FadeIn>
            <FadeIn delay={0.2} className="max-w-sm lg:pb-6">
              <p className="text-slate-500 text-lg md:text-xl leading-relaxed font-light dark:text-slate-400">
                {t.landing.featuresDesc}
              </p>
            </FadeIn>
          </div>

          {/* Symmetrical Masterpiece Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 lg:gap-8">

            {/* Student Card - Luminous Frost Glass */}
            <FadeIn delay={0.1} className="md:col-span-2 h-full rounded-[2.5rem] bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/20 dark:border-slate-800/50 overflow-hidden relative group shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_40px_100px_-20px_rgba(59,130,246,0.15)] hover:-translate-y-2 transition-all duration-700 flex flex-col p-10 dark:bg-slate-900/50">
              <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-transparent to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white mb-8 group-hover:scale-110 group-hover:rotate-[5deg] transition-transform duration-500 shadow-lg shadow-blue-500/30">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight drop-shadow-sm">{t.landing.forStudents}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-light dark:text-slate-400">{t.landing.forStudentsDesc}</p>
                </div>

                <div className="mt-10 relative h-40 w-[110%] -ml-2 rounded-[2rem] bg-slate-50/80 backdrop-blur-md border border-white/20 dark:border-slate-700/50 dark:border-slate-800/60 shadow-[inset_0_2px_20px_rgba(255,255,255,1),0_10px_40px_rgba(0,0,0,0.05)] overflow-hidden group-hover:-translate-y-2 transition-transform duration-700 flex items-end dark:bg-slate-900/50">
                  <div className="w-full flex justify-between items-end px-6 pb-4 h-full pt-8 gap-2">
                    {[40, 70, 50, 90, 60].map((h, i) => (
                      <div key={i} className="w-full bg-blue-500/20 rounded-t-md relative group-hover:bg-blue-500/30 transition-colors" style={{ height: `${h}%` }}>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 rounded-t-md"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Smart Analytics - Obsidian Glass Card */}
            <FadeIn delay={0.2} className="md:col-span-2 h-full border border-white/10 rounded-[2.5rem] bg-[#030712]/90 backdrop-blur-3xl overflow-hidden relative group hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] hover:-translate-y-2 transition-all duration-700 p-10 flex flex-col">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/30 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>

              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-cyan-500/30 transition-all duration-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                    <BarChart3 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{t.landing.smartReports}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-light">{t.landing.smartReportsDesc}</p>
                </div>

                <div className="relative z-10 mt-10 w-full h-32 flex items-end justify-between gap-1.5 pb-2">
                  {[30, 45, 25, 60, 40, 75, 50, 90].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-full bg-cyan-950/50 rounded-t border-t border-cyan-800/50 relative overflow-hidden group-hover:border-cyan-400/50 transition-colors"
                      style={{ height: `${h}%` }}
                      whileHover={{ scaleY: 1.1, backgroundColor: 'rgba(6, 182, 212, 0.4)' }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,1)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Teacher Card - Luminous Jade */}
            <FadeIn delay={0.3} className="md:col-span-2 h-full rounded-[2.5rem] bg-gradient-to-br from-emerald-50/80 to-white/80 dark:from-slate-900/80 dark:to-slate-900/60 backdrop-blur-xl border border-emerald-100/60 dark:border-emerald-900/40 overflow-hidden relative group hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-[0_40px_80px_-20px_rgba(16,185,129,0.15)] hover:-translate-y-2 transition-all duration-700 p-10 flex flex-col">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-200/30 dark:bg-emerald-900/20 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000"></div>

              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-16 h-16 rounded-[1.25rem] bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/60 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shadow-md shadow-emerald-100/50 dark:shadow-none mb-8 group-hover:rotate-6 transition-transform">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">{t.landing.forLecturers}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-light dark:text-slate-400">{t.landing.forLecturersDesc}</p>
                </div>

                <div className="mt-10 space-y-3 w-full relative z-10">
                  <div className="h-12 w-full rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-emerald-50 shadow-sm flex items-center px-4 gap-3 group-hover:translate-x-2 transition-transform delay-75 dark:bg-slate-900/50">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <div className="h-2 w-16 bg-slate-200 rounded-full dark:bg-slate-800"></div>
                  </div>
                  <div className="h-12 w-full rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-emerald-50 shadow-sm flex items-center px-4 gap-3 group-hover:translate-x-2 transition-transform delay-150 dark:bg-slate-900/50">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <div className="h-2 w-24 bg-slate-200 rounded-full dark:bg-slate-800"></div>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Second Row */}

            {/* Fast Processing / Sync - Expansive White Glass */}
            <FadeIn delay={0.4} className="md:col-span-3 h-full rounded-[2.5rem] bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/20 dark:border-slate-800/50 overflow-hidden relative group shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.06)] hover:-translate-y-2 transition-all duration-700 p-10 flex flex-col md:flex-row items-center gap-10 dark:bg-slate-900/50">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-50/30 to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="flex-1 relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                    <Zap className="w-6 h-6" />
                  </div>
                  <span className="px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-bold uppercase tracking-wider border border-purple-100/50 dark:border-purple-800/50">Real-time Sync</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">{t.landing.fastProcessing}</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-light dark:text-slate-400">{t.landing.fastProcessingDesc}</p>
              </div>

              <div className="w-32 h-32 rounded-full border-[8px] border-white/20 dark:border-slate-800/50 shadow-[0_0_30px_rgba(0,0,0,0.05),inset_0_4px_20px_rgba(0,0,0,0.05)] relative flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-700 backdrop-blur-md hidden md:flex">
                <div className="absolute inset-[-12px] rounded-full border border-purple-200/50 animate-[spin_15s_linear_infinite]"></div>
                <div className="absolute inset-[2px] rounded-full border-2 border-dashed border-indigo-300/80 animate-[spin_8s_linear_infinite_reverse]"></div>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] relative">
                  <div className="w-3 h-3 bg-white dark:bg-slate-900 rounded-full animate-ping absolute opacity-50"></div>
                  <div className="w-3 h-3 bg-white dark:bg-slate-900 rounded-full relative z-10"></div>
                </div>
              </div>
            </FadeIn>

            {/* Company / Industry Card - Golden Elegance */}
            <FadeIn delay={0.5} className="md:col-span-3 h-full rounded-[2.5rem] bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-amber-100/50 overflow-hidden relative group shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_40px_80px_-20px_rgba(245,158,11,0.15)] hover:-translate-y-2 transition-all duration-700 p-10 flex flex-col justify-between dark:bg-slate-900/50">
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-200/20 rounded-full blur-[80px] translate-y-1/3 translate-x-1/3 group-hover:scale-150 transition-transform duration-1000"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 text-amber-600 flex items-center justify-center mb-6 shadow-sm group-hover:-rotate-6 transition-transform">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">{t.landing.forIndustry}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-light md:w-3/4 dark:text-slate-400">{t.landing.forIndustryDesc}</p>
                </div>
                <div className="mt-8 inline-flex items-center justify-center h-12 px-8 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-bold tracking-wide w-fit group-hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors border border-amber-100/50 dark:border-amber-800/50 cursor-pointer">
                  Explore Network <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </FadeIn>

          </div>
        </div>
      </section>

      {/* Monumental Stats Section */}
      <section id="stats" className="py-40 bg-black relative border-t border-white/5 overflow-hidden">
        {/* Deep Field Ambient Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,transparent_60%)] rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.1)_0%,transparent_60%)] rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>

        {/* Geometric Light Traces */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center text-center max-w-5xl mx-auto mb-32">
            <FadeIn>
              <div className="inline-flex items-center gap-3 mb-8">
                <span className="h-px w-8 bg-blue-500"></span>
                <span className="text-blue-400 font-mono text-sm tracking-[0.2em] uppercase">Global Impact</span>
                <span className="h-px w-8 bg-blue-500"></span>
              </div>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                Empowering <i className="font-serif italic text-blue-400 font-light">thousands</i> of connections <br className="hidden md:block" /> across the digital ecosystem.
              </h2>
            </FadeIn>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-20 relative">
            {/* Horizontal connecting line */}
            <div className="hidden md:block absolute top-[40%] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            {[
              { label: 'Active Personnel & Students', value: '5,000', suffix: '+', highlight: 'from-blue-400 to-cyan-300' },
              { label: 'Verified Industry Connections', value: '200', suffix: '+', highlight: 'from-indigo-400 to-purple-300' },
              { label: 'Successful Placements', value: '98', suffix: '%', highlight: 'from-emerald-400 to-teal-300' },
              { label: 'Overall System Rating', value: '4.9', suffix: '/5', highlight: 'from-amber-400 to-orange-300' },
            ].map((stat, i) => (
              <FadeIn key={i} delay={i * 0.15} className="relative flex flex-col items-center text-center group cursor-default">

                {/* Glowing Aura on Hover */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 dark:bg-slate-900/50"></div>

                <div className="relative z-10">
                  <div className={`text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-6 flex items-baseline justify-center transition-all duration-700 group-hover:scale-110 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 group-hover:bg-gradient-to-r group-hover:${stat.highlight}`}>
                    {stat.value}
                    <span className={`text-3xl md:text-4xl lg:text-5xl font-light ml-1 text-white/40 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:${stat.highlight} transition-colors duration-700`}>{stat.suffix}</span>
                  </div>

                  {/* Animated micro-line */}
                  <div className="h-[2px] w-8 bg-white/10 mx-auto mb-6 group-hover:w-full transition-all duration-700 ease-out overflow-hidden relative dark:bg-slate-900/50">
                    <div className="absolute inset-0 bg-white/40 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700 delay-100 ease-out dark:bg-slate-900/50"></div>
                  </div>

                  <div className="text-sm text-white/40 font-mono uppercase tracking-[0.2em] max-w-[180px] leading-relaxed group-hover:text-white/80 transition-colors duration-500">{stat.label}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Cinematic Partners & Testimonial Section */}
      <section id="partners" className="py-40 bg-white dark:bg-slate-900 relative overflow-hidden font-sans">
        <div className="container mx-auto px-6 relative z-10">

          <div className="text-center mb-20">
            <FadeIn>
              <div className="text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase mb-4">Recognized Globally</div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Trusted by pioneers.</h2>
            </FadeIn>
          </div>

          {/* Seamless Endless Marquee - Hyper Clean */}
          <FadeIn delay={0.1} className="w-full relative mb-40">
            <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />

            <div className="flex gap-16 overflow-hidden py-4 items-center opacity-40 hover:opacity-100 transition-opacity duration-700 grayscale">
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
                      <div key={`${setIdx}-${i}`} className={`text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 cursor-default hover:text-blue-600 transition-colors ${partner.font}`}>
                        {partner.logo}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </motion.div>
            </div>
          </FadeIn>

          {/* Cinematic Editorial Testimonial Layout */}
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-0 relative">

              <FadeIn delay={0.2} className="w-full lg:w-5/12 relative z-20">
                <div className="aspect-[3/4] w-full max-w-md mx-auto lg:mx-0 rounded-[2rem] bg-slate-100 dark:bg-slate-800 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent z-10"></div>
                  {/* High fashion portrait placeholder */}
                  <div className="w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-200 via-slate-300 to-slate-400 flex items-center justify-center transition-transform duration-1000 group-hover:scale-105">
                    <div className="w-32 h-32 rounded-full border border-slate-400/30 flex items-center justify-center backdrop-blur-sm">
                      <span className="text-slate-500/50 font-light tracking-widest text-xs uppercase -rotate-45 dark:text-slate-400">Portrait</span>
                    </div>
                  </div>
                </div>
              </FadeIn>

              <FadeIn delay={0.3} className="w-full lg:w-8/12 lg:-ml-20 relative z-30">
                <div className="bg-white/80 backdrop-blur-2xl p-10 md:p-16 lg:p-20 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100/60 lg:translate-y-12 dark:border-slate-700 dark:bg-slate-900/50">
                  <div className="mb-10 text-blue-600/20 dark:text-slate-300">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.017 21L16.411 14.364C16.634 13.722 16.586 13.018 16.281 12.433C15.976 11.848 15.441 11.439 14.8 11.282L15.399 9.539C16.822 9.878 18.006 10.778 18.679 12.062C19.352 13.346 19.453 14.89 18.96 16.289L16.566 22.925L14.017 21ZM5.01697 21L7.41097 14.364C7.63397 13.722 7.58597 13.018 7.28097 12.433C6.97597 11.848 6.44097 11.439 5.79997 11.282L6.39897 9.539C7.82197 9.878 9.00597 10.778 9.67897 12.062C10.352 13.346 10.453 14.89 9.95997 16.289L7.56597 22.925L5.01697 21Z" />
                    </svg>
                  </div>
                  <blockquote className="text-2xl md:text-4xl font-light leading-[1.3] text-slate-900 dark:text-white tracking-tight mb-12">
                    {t.landing.testimonialQuote}
                  </blockquote>
                  <div className="flex items-center gap-6">
                    <div className="h-px w-16 bg-slate-200 dark:bg-slate-800"></div>
                    <div>
                      <div className="font-bold tracking-tight text-slate-900 dark:text-white text-lg">{t.landing.testimonialName}</div>
                      <div className="text-slate-500 font-medium text-sm dark:text-slate-400">{t.landing.testimonialRole}</div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>

        </div>
      </section>

      {/* Elevating CTA / Contact Section */}
      <section id="contact" className="py-32 md:py-48 relative bg-white dark:bg-slate-900 overflow-hidden font-sans border-t border-slate-100/50 dark:border-slate-700">
        {/* Soft Organic Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-blue-100/40 dark:bg-blue-900/20 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-indigo-50/50 dark:bg-indigo-900/20 rounded-full blur-[120px] -translate-x-1/2 translate-y-1/4"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

            {/* Left Side: Typography & Story */}
            <div className="max-w-2xl">
              <FadeIn>
                <div className="inline-flex items-center gap-3 mb-8">
                  <div className="h-px w-8 bg-blue-600"></div>
                  <span className="text-blue-600 font-bold text-xs uppercase tracking-[0.2em] dark:text-slate-300">Start Your Journey</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white tracking-tighter mb-8 leading-[1.1]">
                  Let's create <br className="hidden md:block" /> something great.
                </h2>
                <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 font-light leading-relaxed mb-12">
                  {t.landing.ctaDesc} Join our ecosystem of leading professionals, cutting-edge organizations, and visionary educators.
                </p>

                <div className="flex flex-col sm:flex-row gap-5">
                  <Link to="/register" className="group">
                    <Button size="lg" className="w-full sm:w-auto h-16 px-10 bg-slate-900 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 rounded-[2rem] text-lg font-bold tracking-tight transition-all duration-500 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.3)] hover:-translate-y-1">
                      {t.landing.registerNow}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/contact" className="group">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 hover:border-slate-300 rounded-[2rem] text-lg font-bold tracking-tight transition-all duration-300">
                      {t.landing.contactUs}
                    </Button>
                  </Link>
                </div>
              </FadeIn>
            </div>

            {/* Right Side: Abstract Symmetrical Glass Card */}
            <div className="relative">
              <FadeIn delay={0.2} className="relative z-10">
                <div className="aspect-[4/3] rounded-[3rem] bg-white/60 dark:bg-slate-950/60 backdrop-blur-3xl border border-white dark:border-slate-800 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05),inset_0_2px_20px_rgba(255,255,255,0.8)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] p-10 flex flex-col justify-between overflow-hidden group">
                  {/* Internal Glow */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>

                  <div className="relative z-10 flex justify-between items-start">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_10px_30px_-5px_rgba(59,130,246,0.4)] flex items-center justify-center text-white">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div className="flex -space-x-4">
                      <div className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">P1</div>
                      <div className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 dark:bg-slate-800">P2</div>
                      <div className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">P3</div>
                    </div>
                  </div>

                  <div className="relative z-10 mt-12 grid grid-cols-2 gap-4">
                    <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl p-6 border border-white dark:border-slate-700 shadow-sm hover:border-blue-100 dark:hover:border-blue-900 transition-colors">
                      <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">24/7</div>
                      <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Platform Access</div>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl p-6 border border-white dark:border-slate-700 shadow-sm hover:border-indigo-100 dark:hover:border-indigo-900 transition-colors">
                      <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">100%</div>
                      <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Secure Data</div>
                    </div>
                  </div>
                </div>
              </FadeIn>

              {/* Floating Element Behind */}
              <FadeIn delay={0.4} className="absolute -bottom-10 -left-10 z-0">
                <div className="w-48 h-48 rounded-[2.5rem] bg-gradient-to-tr from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-white dark:border-slate-800 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] rotate-12 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-8 border-slate-100/50 dark:border-slate-800/50"></div>
                </div>
              </FadeIn>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-white dark:bg-slate-900 pt-24 pb-10 border-t border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 dark:from-slate-950/50 to-white dark:to-slate-950 pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-[100px] opacity-70 pointer-events-none" />
        <div className="absolute top-20 -right-40 w-80 h-80 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-[80px] opacity-70 pointer-events-none" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-16 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-200 dark:shadow-none">
                  SP
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">ShowPro</span>
                  <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider dark:text-slate-300">Professionalism</span>
                </div>
              </div>
              <p className="text-slate-500 leading-relaxed text-sm font-medium dark:text-slate-400">
                {t.landing.footerDesc1}<br />
                {t.landing.footerDesc2}<br />
                {t.landing.footerDesc3}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider text-sm">{t.landing.mainMenu}</h4>
              <ul className="space-y-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                <li><a href="#" className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all focus:outline-none dark:text-slate-300">{t.landing.home}</a></li>
                <li><a href="#" className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all focus:outline-none dark:text-slate-300">{t.landing.aboutUs}</a></li>
                <li><a href="#" className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all focus:outline-none dark:text-slate-300">{t.landing.curriculum}</a></li>
                <li><a href="#" className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all focus:outline-none dark:text-slate-300">{t.landing.news}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider text-sm">{t.landing.forUsers}</h4>
              <ul className="space-y-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                <li><Link to="/login" className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all focus:outline-none dark:text-slate-300">{t.landing.login}</Link></li>
                <li><Link to="/register" className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all focus:outline-none dark:text-slate-300">{t.landing.register}</Link></li>
                <li><a href="#" className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all focus:outline-none dark:text-slate-300">{t.landing.userGuide}</a></li>
                <li><a href="#" className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all focus:outline-none dark:text-slate-300">{t.landing.reportIssue}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider text-sm">{t.landing.footerContact}</h4>
              <ul className="space-y-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                <li className="flex items-center gap-3 hover:text-blue-600 transition-colors cursor-pointer p-2 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-900/30 -ml-2 dark:text-slate-300">
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  www.camt.cmu.ac.th
                </li>
                <li className="flex items-center gap-3 hover:text-blue-600 transition-colors cursor-pointer p-2 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-900/30 -ml-2 dark:text-slate-300">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  053-942110
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-slate-400">
            <div>&copy; {new Date().getFullYear()} ShowPro. {t.landing.allRightsReserved}</div>
            <div className="flex gap-8">
              <Link to="/privacy-policy" className="hover:text-blue-600 transition-colors dark:text-slate-300">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-blue-600 transition-colors dark:text-slate-300">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}