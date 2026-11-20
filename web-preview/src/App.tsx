import { useEffect } from 'react';
import { MotionConfig, motion, AnimatePresence } from 'motion/react';
import { Home, User, Shield, KeyRound, UserPlus } from 'lucide-react';
import { ptAO } from '../../locales/pt-AO';
import { useAuthStore, type Stage1Route } from '../../store/useAuthStore';
import { getIntegrationReadiness } from '../../services/supabase/client';
import { fetchMyProfile } from '../../services/auth/authService';
import { KambaGoLogo } from './components/KambaGoLogo';
import {
  WelcomeView,
  OnboardingView,
  RegisterView,
  LoginView,
  ForgotPasswordView,
  VerifyOtpView,
} from './components/AuthScreens';
import { ProfileView, LegalPrivacyView } from './components/ProfileScreens';

const NAV_ITEMS: { id: Stage1Route; label: string }[] = [
  { id: 'welcome', label: ptAO.navigation.screens.welcome },
  { id: 'onboarding', label: ptAO.navigation.screens.onboarding },
  { id: 'register', label: ptAO.navigation.screens.register },
  { id: 'login', label: ptAO.navigation.screens.login },
  { id: 'forgot-password', label: ptAO.navigation.screens.forgotPassword },
  { id: 'verify-otp', label: ptAO.navigation.screens.verifyOtp },
  { id: 'profile', label: ptAO.navigation.screens.profile },
  { id: 'legal', label: ptAO.navigation.screens.legal },
];

export default function App() {
  const currentRoute = useAuthStore((s) => s.currentRoute);
  const setRoute = useAuthStore((s) => s.setRoute);
  const setProfile = useAuthStore((s) => s.setProfile);
  const hydratePreferences = useAuthStore((s) => s.hydratePreferences);
  const readiness = getIntegrationReadiness();

  useEffect(() => {
    void hydratePreferences();
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setRoute('login');
    }

    if (readiness.supabaseConfigured) {
      fetchMyProfile().then((res) => {
        if (res.ok && res.data) {
          setProfile(res.data);
        }
      });
    }
  }, [hydratePreferences, readiness.supabaseConfigured, setProfile, setRoute]);

  const renderScreen = () => {
    switch (currentRoute) {
      case 'welcome':
        return <WelcomeView />;
      case 'onboarding':
        return <OnboardingView />;
      case 'register':
        return <RegisterView />;
      case 'login':
        return <LoginView />;
      case 'forgot-password':
        return <ForgotPasswordView />;
      case 'verify-otp':
        return <VerifyOtpView />;
      case 'profile':
        return <ProfileView />;
      case 'legal':
        return <LegalPrivacyView />;
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#F7FAFC] text-[#102A43] flex flex-col">
        {/* Compact Top Bar (< 56px on mobile) */}
        <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto h-full flex items-center justify-between gap-8">
            <button
              type="button"
              onClick={() => setRoute('welcome')}
              className="flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <KambaGoLogo size={30} />
              <span className="font-display text-lg font-bold tracking-tight text-[#102A43]">
                {ptAO.brand.name}
              </span>
            </button>

            <nav
              aria-label={ptAO.navigation.screensTitle}
              className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600"
            >
              <button
                type="button"
                onClick={() => setRoute('welcome')}
                className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  currentRoute === 'welcome' || currentRoute === 'onboarding'
                    ? 'text-[#102A43] font-semibold'
                    : 'hover:text-[#102A43]'
                }`}
              >
                {ptAO.navigation.screens.welcome}
              </button>
              <button
                type="button"
                onClick={() => setRoute('register')}
                className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  currentRoute === 'register'
                    ? 'text-[#102A43] font-semibold'
                    : 'hover:text-[#102A43]'
                }`}
              >
                {ptAO.navigation.screens.register}
              </button>
              <button
                type="button"
                onClick={() => setRoute('verify-otp')}
                className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  currentRoute === 'verify-otp'
                    ? 'text-[#102A43] font-semibold'
                    : 'hover:text-[#102A43]'
                }`}
              >
                {ptAO.navigation.screens.verifyOtp}
              </button>
              <button
                type="button"
                onClick={() => setRoute('profile')}
                className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  currentRoute === 'profile' || currentRoute === 'legal'
                    ? 'text-[#102A43] font-semibold'
                    : 'hover:text-[#102A43]'
                }`}
              >
                {ptAO.navigation.screens.profile}
              </button>
            </nav>

            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setRoute('login')}
                className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#16B8A6] hover:bg-[#0F9485] text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                {ptAO.auth.actions.submitLogin}
              </button>
            </div>
          </div>
        </header>

        {/* Main Responsive Workspace */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Desktop Context & Stage 1 Navigation Column */}
            <aside className="hidden lg:block lg:col-span-5 space-y-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                <p className="text-xs font-semibold text-[#0F9485]">
                  {ptAO.navigation.stageLabel}
                </p>
                <h2 className="font-display text-xl font-bold text-[#102A43]">
                  {ptAO.brand.slogan} — {ptAO.brand.corridorBadge}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {ptAO.brand.tagline}
                </p>
                <div className="pt-2 border-t border-[#F1F5F9] text-xs text-slate-500">
                  {readiness.supabaseConfigured
                    ? 'Tarifas e parâmetros do corredor geridos na base de dados (routes e fare_rules).'
                    : 'Tarifas e parâmetros do corredor carregam da base de dados após configuração do Supabase.'}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                <h3 className="font-display text-sm font-bold text-[#102A43]">
                  {ptAO.navigation.screensTitle}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRoute(item.id)}
                      className={`min-h-[42px] px-3 py-2 rounded-xl text-left text-xs font-medium transition-colors cursor-pointer ${
                        currentRoute === item.id
                          ? 'bg-[#102A43] text-white'
                          : 'bg-[#F1F5F9] text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                <h3 className="font-display text-sm font-bold text-[#102A43]">
                  {ptAO.setupStatus.title}
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center justify-between gap-2">
                    <span>Supabase (Auth & Storage)</span>
                    <span className="font-semibold text-[#7C4D00]">
                      {readiness.supabaseConfigured
                        ? ptAO.setupStatus.supabaseReady
                        : ptAO.common.pendingSetupBadge}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span>Provedor SMS OTP</span>
                    <span className="font-semibold text-[#7C4D00]">
                      {readiness.smsConfigured
                        ? readiness.smsProvider
                        : ptAO.common.pendingSetupBadge}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span>Mapas ({readiness.mapsProvider})</span>
                    <span className="font-semibold text-[#7C4D00]">
                      {readiness.mapsConfigured
                        ? 'Ativo'
                        : ptAO.common.pendingSetupBadge}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span>Expo Notifications</span>
                    <span className="font-semibold text-[#7C4D00]">
                      {readiness.notificationsConfigured
                        ? 'Configurado'
                        : ptAO.common.pendingSetupBadge}
                    </span>
                  </li>
                </ul>
              </div>
            </aside>

            {/* Primary Mobile-First Interactive App Column */}
            <section className="lg:col-span-7 w-full max-w-xl mx-auto lg:max-w-none">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentRoute}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                >
                  {renderScreen()}
                </motion.div>
              </AnimatePresence>
            </section>
          </div>
        </main>

        {/* Mobile Bottom Thumb-Zone Navigation (< 64px, within 15% cap) */}
        <nav
          aria-label="Navegação rápida móvel"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 h-16 px-2 grid grid-cols-5 items-center"
        >
          <button
            type="button"
            onClick={() => setRoute('welcome')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
              currentRoute === 'welcome' || currentRoute === 'onboarding'
                ? 'text-[#16B8A6]'
                : 'text-slate-500'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Início</span>
          </button>

          <button
            type="button"
            onClick={() => setRoute('register')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
              currentRoute === 'register' ? 'text-[#16B8A6]' : 'text-slate-500'
            }`}
          >
            <UserPlus className="w-5 h-5" />
            <span>Registo</span>
          </button>

          <button
            type="button"
            onClick={() => setRoute('login')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
              currentRoute === 'login' || currentRoute === 'forgot-password'
                ? 'text-[#16B8A6]'
                : 'text-slate-500'
            }`}
          >
            <KeyRound className="w-5 h-5" />
            <span>Entrar</span>
          </button>

          <button
            type="button"
            onClick={() => setRoute('verify-otp')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
              currentRoute === 'verify-otp' ? 'text-[#16B8A6]' : 'text-slate-500'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span>OTP</span>
          </button>

          <button
            type="button"
            onClick={() => setRoute('profile')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
              currentRoute === 'profile' || currentRoute === 'legal'
                ? 'text-[#16B8A6]'
                : 'text-slate-500'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Perfil</span>
          </button>
        </nav>
      </div>
    </MotionConfig>
  );
}
