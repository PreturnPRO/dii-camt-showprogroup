import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Users, Building2, Briefcase, GraduationCap, Trophy, Globe, CheckCircle2, BarChart3, Handshake, Clock, Mail, Phone, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';

const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function LandingPage() {
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-hidden font-sans text-slate-900 dark:text-slate-100">

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur-sm' : 'bg-transparent'}`}>
        <div className="mx-auto max-w-6xl flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center">
              <img src="/showpro_logo.png" alt="ShowPro" className="w-5 h-5 object-contain dark:invert" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">ShowPro</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">{t.landing.navFeatures}</a>
            <a href="#stats" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">{t.landing.navStats}</a>
            <a href="#partners" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">{t.landing.navPartners}</a>
            <a href="#contact" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">{t.landing.navContact}</a>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleLanguage} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-medium">
              {language === 'th' ? 'EN' : 'TH'}
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                {t.landing.login}
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 rounded-md">
                {t.landing.register}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col justify-center pt-16 pb-24 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-6 max-w-5xl">
          <FadeIn delay={0.1}>
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                {language === 'th' ? 'ระบบจัดการสาขา DII — CAMT มหาวิทยาลัยเชียงใหม่' : 'DII Department Management — CAMT, Chiang Mai University'}
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-slate-900 dark:text-white leading-[1.05] tracking-tight mb-6">
              {language === 'th' ? (
                <>ระบบบริหารจัดการ<br />การศึกษาครบวงจร</>
              ) : (
                <>Academic<br />management,<br />simplified.</>
              )}
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 leading-relaxed max-w-xl">
              {language === 'th'
                ? 'ครอบคลุมทุกมิติของวงจรการศึกษา ตั้งแต่ลงทะเบียน การวัดผล กิจกรรม ฝึกงาน ไปจนถึงการหางาน สำหรับ 5 กลุ่มผู้ใช้งาน'
                : 'Covers the full student lifecycle — enrollment, grading, activities, internships, and career placement — across 5 user roles.'}
            </p>
          </FadeIn>

          <FadeIn delay={0.25} className="flex flex-col sm:flex-row gap-3">
            <Link to="/register">
              <Button className="h-11 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 rounded-md font-medium">
                {t.landing.getStartedFree}
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" className="h-11 px-8 rounded-md border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium">
                {t.landing.login}
              </Button>
            </Link>
          </FadeIn>

          {/* Hero dashboard mockup - clean, real UI preview */}
          <FadeIn delay={0.4} className="mt-20 hidden sm:block">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-black/30">
              {/* Browser chrome */}
              <div className="h-9 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="h-5 w-56 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">app.showpro.com/dashboard</span>
                  </div>
                </div>
              </div>

              {/* Dashboard UI */}
              <div className="bg-slate-50 dark:bg-slate-950 flex" style={{ minHeight: '340px' }}>
                {/* Sidebar */}
                <div className="w-48 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col gap-1 shrink-0">
                  <div className="flex items-center gap-2 mb-5 px-2 pt-1">
                    <div className="w-6 h-6 bg-slate-900 dark:bg-white rounded-md"></div>
                    <div className="h-3 w-16 bg-slate-900 dark:bg-slate-200 rounded"></div>
                  </div>
                  {['Dashboard', 'เกรด', 'กิจกรรม', 'พอร์ตโฟลิโอ', 'ฝึกงาน', 'คำร้อง'].map((item, i) => (
                    <div key={i} className={`h-8 flex items-center px-2 gap-2 rounded-md ${i === 0 ? 'bg-slate-900 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className={`w-3 h-3 rounded-sm ${i === 0 ? 'bg-white/40' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                      <div className={`h-2 rounded ${i === 0 ? 'w-14 bg-white/60' : 'w-12 bg-slate-200 dark:bg-slate-700'}`}></div>
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 p-6 flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 w-32 bg-slate-800 dark:bg-slate-200 rounded mb-1.5"></div>
                      <div className="h-2.5 w-24 bg-slate-300 dark:bg-slate-600 rounded"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      <div className="w-8 h-8 bg-slate-900 dark:bg-slate-200 rounded-full"></div>
                    </div>
                  </div>

                  {/* Stat cards */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'GPA', value: '3.75', color: 'bg-blue-50 dark:bg-blue-900/20' },
                      { label: 'หน่วยกิต', value: '96/135', color: 'bg-emerald-50 dark:bg-emerald-900/20' },
                      { label: 'กิจกรรม', value: '18', color: 'bg-amber-50 dark:bg-amber-900/20' },
                      { label: 'XP', value: '4,200', color: 'bg-purple-50 dark:bg-purple-900/20' },
                    ].map((card, i) => (
                      <div key={i} className={`${card.color} rounded-lg p-3 border border-slate-100 dark:border-slate-800`}>
                        <div className="h-2 w-10 bg-slate-400 dark:bg-slate-500 rounded mb-2"></div>
                        <div className="h-5 w-14 bg-slate-800 dark:bg-slate-200 rounded font-mono"></div>
                      </div>
                    ))}
                  </div>

                  {/* Chart area */}
                  <div className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                    <div className="h-3 w-24 bg-slate-300 dark:bg-slate-600 rounded mb-4"></div>
                    <div className="flex items-end gap-2 h-24">
                      {[55, 72, 45, 88, 63, 79, 50, 91, 68].map((h, i) => (
                        <div key={i} className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded-t" style={{ height: `${h}%` }}>
                          <div className="w-full h-0.5 bg-blue-500 dark:bg-blue-400 rounded-t"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-6 max-w-5xl">
          <FadeIn>
            <div className="mb-16">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">{t.landing.navFeatures}</p>
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
                {t.landing.featuresTitle1}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                {t.landing.featuresDesc}
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: GraduationCap,
                title: t.landing.forStudents,
                desc: t.landing.forStudentsDesc,
                accent: 'text-blue-600 dark:text-blue-400',
                bg: 'bg-blue-50 dark:bg-blue-900/20',
              },
              {
                icon: BookOpen,
                title: t.landing.forLecturers,
                desc: t.landing.forLecturersDesc,
                accent: 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-emerald-50 dark:bg-emerald-900/20',
              },
              {
                icon: Briefcase,
                title: t.landing.forIndustry,
                desc: t.landing.forIndustryDesc,
                accent: 'text-amber-600 dark:text-amber-400',
                bg: 'bg-amber-50 dark:bg-amber-900/20',
              },
              {
                icon: BarChart3,
                title: t.landing.smartReports,
                desc: t.landing.smartReportsDesc,
                accent: 'text-purple-600 dark:text-purple-400',
                bg: 'bg-purple-50 dark:bg-purple-900/20',
              },
              {
                icon: Users,
                title: language === 'th' ? 'จัดการผู้ใช้ 5 บทบาท' : '5 Role-Based Access',
                desc: language === 'th' ? 'นักศึกษา อาจารย์ เจ้าหน้าที่ บริษัท และผู้ดูแลระบบ มี Dashboard และสิทธิ์การเข้าถึงเฉพาะตัว' : 'Student, Lecturer, Staff, Company, and Admin each get tailored dashboards and scoped access.',
                accent: 'text-slate-600 dark:text-slate-400',
                bg: 'bg-slate-100 dark:bg-slate-800/50',
              },
              {
                icon: Trophy,
                title: t.landing.fastProcessing,
                desc: t.landing.fastProcessingDesc,
                accent: 'text-rose-600 dark:text-rose-400',
                bg: 'bg-rose-50 dark:bg-rose-900/20',
              },
            ].map((feature, i) => (
              <FadeIn key={i} delay={i * 0.07}>
                <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-4`}>
                    <feature.icon className={`w-5 h-5 ${feature.accent}`} />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-24 bg-slate-900 dark:bg-black border-t border-slate-800">
        <div className="container mx-auto px-6 max-w-5xl">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-3">
              {language === 'th' ? 'ตัวเลขที่สะท้อนความจริง' : 'Built for real scale'}
            </h2>
            <p className="text-slate-400 text-sm">
              {language === 'th' ? 'ระบบที่ใช้งานจริงในสาขา DII CAMT มหาวิทยาลัยเชียงใหม่' : 'Used in DII CAMT, Chiang Mai University'}
            </p>
          </FadeIn>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: language === 'th' ? 'ผู้ใช้งานในระบบ' : 'Users in system', value: '5,000+' },
              { label: language === 'th' ? 'บริษัทพันธมิตร' : 'Industry partners', value: '200+' },
              { label: language === 'th' ? 'อัตราความพึงพอใจ' : 'Placement rate', value: '98%' },
              { label: language === 'th' ? 'คะแนนความพึงพอใจ' : 'System rating', value: '4.9/5' },
            ].map((stat, i) => (
              <FadeIn key={i} delay={i * 0.1} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section id="partners" className="py-24 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-6 max-w-5xl">
          <FadeIn className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">{language === 'th' ? 'พันธมิตรและองค์กรที่ร่วมงาน' : 'Partners & organizations'}</p>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {language === 'th' ? 'เชื่อมต่อกับภาคอุตสาหกรรม' : 'Connected to industry'}
            </h2>
          </FadeIn>

          <FadeIn delay={0.1} className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white dark:from-slate-950 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-slate-950 to-transparent z-10 pointer-events-none" />
            <div className="flex overflow-hidden py-4 items-center">
              <motion.div
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="flex gap-16 shrink-0 items-center opacity-50"
              >
                {[...Array(2)].map((_, setIdx) => (
                  <React.Fragment key={setIdx}>
                    {['CLBS', 'AXONS', 'G-ABLE', 'BeNeat', 'TCC', 'MOVE'].map((name, i) => (
                      <span key={`${setIdx}-${i}`} className="text-xl font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap tracking-tight">
                        {name}
                      </span>
                    ))}
                  </React.Fragment>
                ))}
              </motion.div>
            </div>
          </FadeIn>

          {/* Testimonial */}
          <FadeIn delay={0.2} className="mt-20 max-w-2xl mx-auto">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-8 bg-slate-50 dark:bg-slate-900">
              <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-6 italic">
                "{t.landing.testimonialQuote}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {t.landing.testimonialName?.charAt(0) || 'A'}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">{t.landing.testimonialName}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t.landing.testimonialRole}</div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA / Contact */}
      <section id="contact" className="py-24 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <FadeIn>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">{language === 'th' ? 'เริ่มต้นใช้งาน' : 'Get started'}</p>
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-4 leading-tight">
                {language === 'th' ? 'พร้อมเข้าร่วมระบบ ShowPro แล้วหรือยัง?' : 'Ready to join ShowPro?'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                {t.landing.ctaDesc}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/register">
                  <Button className="h-11 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 rounded-md font-medium">
                    {t.landing.registerNow} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" className="h-11 px-8 rounded-md border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 font-medium">
                    {t.landing.login}
                  </Button>
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Website</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">www.camt.cmu.ac.th</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">{language === 'th' ? 'โทรศัพท์' : 'Phone'}</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">053-942110</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <p className="text-xs text-slate-400 mb-3">{language === 'th' ? 'Demo Accounts' : 'Demo accounts'}</p>
                  <div className="space-y-2">
                    {[
                      { role: 'Student', email: 'alice@student.showpro.local' },
                      { role: 'Lecturer', email: 'narin@showpro.local' },
                      { role: 'Admin', email: 'admin@showpro.local' },
                    ].map((acc) => (
                      <div key={acc.role} className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-16">{acc.role}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{acc.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-10">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-slate-900 dark:bg-white rounded-md flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white dark:text-slate-900">SP</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">ShowPro</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.landing.footerDesc1} {t.landing.footerDesc2}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">{t.landing.mainMenu}</h4>
                <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                  <li><a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t.landing.home}</a></li>
                  <li><a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t.landing.aboutUs}</a></li>
                  <li><a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t.landing.navFeatures}</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">{t.landing.forUsers}</h4>
                <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                  <li><Link to="/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t.landing.login}</Link></li>
                  <li><Link to="/register" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t.landing.register}</Link></li>
                  <li><Link to="/privacy-policy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
            <span>&copy; {new Date().getFullYear()} ShowPro — DII CAMT, Chiang Mai University. {t.landing.allRightsReserved}</span>
            <div className="flex gap-6">
              <Link to="/privacy-policy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}