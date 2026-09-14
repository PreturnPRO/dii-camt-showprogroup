import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scale, ArrowLeft, FileText, AlertCircle, ShieldCheck, Ban, RefreshCw, Gavel, BookOpen, Users, Mail, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function TermsOfService() {
  const { t } = useLanguage();

  const sections = [
    {
      icon: FileText,
      title: t.termsOfServicePage.section1Title,
      color: 'from-blue-600 to-indigo-600',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      items: [
        { subtitle: t.termsOfServicePage.section1Sub1, desc: t.termsOfServicePage.section1Desc1 },
        { subtitle: t.termsOfServicePage.section1Sub2, desc: t.termsOfServicePage.section1Desc2 },
        { subtitle: t.termsOfServicePage.section1Sub3, desc: t.termsOfServicePage.section1Desc3 },
      ],
    },
    {
      icon: Users,
      title: t.termsOfServicePage.section2Title,
      color: 'from-emerald-600 to-teal-600',
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      items: [
        { subtitle: t.termsOfServicePage.section2Sub1, desc: t.termsOfServicePage.section2Desc1 },
        { subtitle: t.termsOfServicePage.section2Sub2, desc: t.termsOfServicePage.section2Desc2 },
        { subtitle: t.termsOfServicePage.section2Sub3, desc: t.termsOfServicePage.section2Desc3 },
      ],
    },
    {
      icon: ShieldCheck,
      title: t.termsOfServicePage.section3Title,
      color: 'from-violet-600 to-purple-600',
      bg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      items: [
        { subtitle: t.termsOfServicePage.section3Sub1, desc: t.termsOfServicePage.section3Desc1 },
        { subtitle: t.termsOfServicePage.section3Sub2, desc: t.termsOfServicePage.section3Desc2 },
        { subtitle: t.termsOfServicePage.section3Sub3, desc: t.termsOfServicePage.section3Desc3 },
      ],
    },
    {
      icon: Ban,
      title: t.termsOfServicePage.section4Title,
      color: 'from-red-600 to-rose-600',
      bg: 'bg-red-50',
      iconColor: 'text-red-600',
      items: [
        { subtitle: t.termsOfServicePage.section4Sub1, desc: t.termsOfServicePage.section4Desc1 },
        { subtitle: t.termsOfServicePage.section4Sub2, desc: t.termsOfServicePage.section4Desc2 },
        { subtitle: t.termsOfServicePage.section4Sub3, desc: t.termsOfServicePage.section4Desc3 },
        { subtitle: t.termsOfServicePage.section4Sub4, desc: t.termsOfServicePage.section4Desc4 },
      ],
    },
    {
      icon: BookOpen,
      title: t.termsOfServicePage.section5Title,
      color: 'from-amber-600 to-orange-600',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      items: [
        { subtitle: t.termsOfServicePage.section5Sub1, desc: t.termsOfServicePage.section5Desc1 },
        { subtitle: t.termsOfServicePage.section5Sub2, desc: t.termsOfServicePage.section5Desc2 },
        { subtitle: t.termsOfServicePage.section5Sub3, desc: t.termsOfServicePage.section5Desc3 },
      ],
    },
    {
      icon: RefreshCw,
      title: t.termsOfServicePage.section6Title,
      color: 'from-cyan-600 to-teal-600',
      bg: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
      items: [
        { subtitle: t.termsOfServicePage.section6Sub1, desc: t.termsOfServicePage.section6Desc1 },
        { subtitle: t.termsOfServicePage.section6Sub2, desc: t.termsOfServicePage.section6Desc2 },
        { subtitle: t.termsOfServicePage.section6Sub3, desc: t.termsOfServicePage.section6Desc3 },
      ],
    },
    {
      icon: Gavel,
      title: t.termsOfServicePage.section7Title,
      color: 'from-slate-600 to-gray-600',
      bg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      items: [
        { subtitle: t.termsOfServicePage.section7Sub1, desc: t.termsOfServicePage.section7Desc1 },
        { subtitle: t.termsOfServicePage.section7Sub2, desc: t.termsOfServicePage.section7Desc2 },
        { subtitle: t.termsOfServicePage.section7Sub3, desc: t.termsOfServicePage.section7Desc3 },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">
              DII
            </div>
            <div>
              <div className="font-bold text-xl tracking-tight text-slate-900 dark:text-slate-200">ShowPro</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">Digital Industry Integration</div>
            </div>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="font-medium hover:text-blue-600 hover:bg-blue-50 dark:text-slate-300 dark:bg-slate-800">
              <ArrowLeft className="w-4 h-4 mr-2" /> {t.termsOfServicePage.backToHome}
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-600/15 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
          <FadeIn>
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-blue-500/10 backdrop-blur-md rounded-full border border-blue-500/20">
              <Scale className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Legal Agreement</span>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="text-4xl lg:text-7xl font-bold text-white mb-6 tracking-tight leading-[1.1]">
              {t.termsOfServicePage.heroTitle}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">{t.termsOfServicePage.heroTitleHighlight}</span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-lg text-slate-400 mb-6 max-w-2xl mx-auto leading-relaxed font-light">
              {t.termsOfServicePage.heroDesc}
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="flex items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{t.termsOfServicePage.lastUpdated}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-2">
                <span>{t.termsOfServicePage.version}</span>
              </div>
            </div>
          </FadeIn>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      {/* Quick Summary */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-8 lg:p-12 border border-blue-100">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 dark:bg-slate-800">
                  <AlertCircle className="w-6 h-6 text-blue-600 dark:text-slate-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t.termsOfServicePage.summaryTitle}</h2>
                  <p className="text-slate-600 leading-relaxed dark:text-slate-300">
                    {t.termsOfServicePage.summaryDesc}
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-4 gap-3">
                {[
                  { label: t.termsOfServicePage.roleStudent, icon: '🎓' },
                  { label: t.termsOfServicePage.roleLecturer, icon: '📚' },
                  { label: t.termsOfServicePage.roleStaff, icon: '🏢' },
                  { label: t.termsOfServicePage.roleIndustry, icon: '🏭' },
                ].map((role, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm text-center dark:bg-slate-900">
                    <div className="text-2xl mb-2">{role.icon}</div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{role.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-16 bg-slate-50 dark:bg-slate-800">
        <div className="container mx-auto px-6 max-w-4xl space-y-8">
          {sections.map((section, sIdx) => (
            <FadeIn key={sIdx} delay={sIdx * 0.05}>
              <div className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden">
                <div className="p-8 lg:p-10">
                  <div className="flex items-center gap-5 mb-8">
                    <div className={`w-14 h-14 ${section.bg} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                      <section.icon className={`w-7 h-7 ${section.iconColor}`} />
                    </div>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r ${section.color}`}>
                        Section {sIdx + 1}
                      </span>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">{section.title}</h3>
                    </div>
                  </div>
                  <div className="space-y-6 pl-0 lg:pl-[4.75rem]">
                    {section.items.map((item, iIdx) => (
                      <div key={iIdx} className="relative pl-6">
                        <div className={`absolute left-0 top-2 w-2 h-2 rounded-full bg-gradient-to-br ${section.color}`} />
                        <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">{item.subtitle}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Questions CTA */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 rounded-[2.5rem] p-12 lg:p-16 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="relative z-10 space-y-6">
                  <HelpCircle className="w-12 h-12 text-blue-400 mx-auto" />
                  <h2 className="text-3xl lg:text-4xl font-bold">{t.termsOfServicePage.contactTitle}</h2>
                  <p className="text-slate-300 text-lg max-w-xl mx-auto">
                    {t.termsOfServicePage.contactDesc}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <a href="mailto:legal@camt.cmu.ac.th">
                      <Button size="lg" className="h-14 px-8 bg-white dark:bg-slate-900 text-blue-700 hover:bg-blue-50 rounded-full text-lg font-semibold shadow-lg dark:text-slate-200">
                        <Mail className="w-5 h-5 mr-2" /> legal@camt.cmu.ac.th
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-10 border-t border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
          <div>© 2026 ShowPro. All rights reserved.</div>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="hover:text-slate-600 dark:text-slate-300">Privacy Policy</Link>
            <Link to="/terms-of-service" className="text-slate-600 font-medium dark:text-slate-300">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
