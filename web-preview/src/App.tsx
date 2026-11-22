import { useEffect } from 'react';
import { ptAO } from '../../locales/pt-AO';
import { isMockAuthActive } from '../../services/auth/authService';
import { getIntegrationReadiness } from '../../services/supabase/client';
import { useAuthStore, type Stage1Route } from '../../store/useAuthStore';
import {
  ForgotPasswordView,
  LoginView,
  OnboardingView,
  RegisterView,
  VerifyEmailView,
  WelcomeView,
} from './components/AuthScreens';
import { KambaGoLogo } from './components/KambaGoLogo';
import { LegalPrivacyView, ProfileView } from './components/ProfileScreens';

const STAGE_ROUTES: Array<{ id: Stage1Route; label: string }> = [
  { id: 'welcome', label: ptAO.navigation.screens.welcome },
  { id: 'onboarding', label: ptAO.navigation.screens.onboarding },
  { id: 'login', label: ptAO.navigation.screens.login },
  { id: 'register', label: ptAO.navigation.screens.register },
  { id: 'forgot-password', label: ptAO.navigation.screens.forgotPassword },
  { id: 'verify-email', label: ptAO.navigation.screens.verifyEmail },
  { id: 'profile', label: ptAO.navigation.screens.profile },
  { id: 'legal', label: ptAO.navigation.screens.legal },
];

export default function App() {
  const currentRoute = useAuthStore((s) => s.currentRoute);
  const setRoute = useAuthStore((s) => s.setRoute);
  const statusBanner = useAuthStore((s) => s.statusBanner);
  const clearBanner = useAuthStore((s) => s.clearBanner);
  const hydratePreferences = useAuthStore((s) => s.hydratePreferences);

  useEffect(() => {
    void hydratePreferences();
  }, [hydratePreferences]);

  const readiness = getIntegrationReadiness();
  const mockAuthActive = isMockAuthActive();

  return (
    <div className="min-h-screen bg-[#F7FAFC] text-[#102A43]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={() => setRoute('welcome')}
            className="flex items-center gap-2.5 text-left"
          >
            <KambaGoLogo size={36} />
            <div>
              <div className="text-base font-extrabold leading-none text-[#102A43]">
                {ptAO.brand.name}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">
                {ptAO.navigation.stageLabel}
              </div>
            </div>
          </button>

          <nav
            aria-label={ptAO.navigation.screensTitle}
            className="flex flex-wrap items-center gap-1.5"
          >
            {STAGE_ROUTES.map((item) => {
              const active = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRoute(item.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-[#102A43] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 space-y-5">
        {!readiness.supabaseConfigured && (
          <div
            className={`rounded-2xl border px-4 py-3 text-xs font-medium ${
              mockAuthActive
                ? 'border-teal-200 bg-[#ECFDF5] text-[#0F9485]'
                : 'border-amber-200 bg-[#FFF6E5] text-[#7C4D00]'
            }`}
          >
            <span className="font-bold">
              {mockAuthActive ? 'Modo mock ativo: ' : `${ptAO.common.pendingSetupBadge}: `}
            </span>
            {mockAuthActive
              ? ptAO.setupStatus.mockAuthActiveNotice
              : ptAO.setupStatus.supabaseMissing}
          </div>
        )}

        {statusBanner && (
          <div
            role="status"
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
              statusBanner.kind === 'success'
                ? 'border-emerald-200 bg-[#ECFDF5] text-[#0F9485]'
                : statusBanner.kind === 'warning'
                  ? 'border-amber-200 bg-[#FFF6E5] text-[#7C4D00]'
                  : statusBanner.kind === 'error'
                    ? 'border-red-200 bg-[#FEF2F2] text-red-700'
                    : 'border-slate-200 bg-white text-[#102A43]'
            }`}
          >
            <span>{statusBanner.message}</span>
            <button
              type="button"
              onClick={clearBanner}
              className="text-xs font-bold opacity-75 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}

        {currentRoute === 'welcome' && <WelcomeView />}
        {currentRoute === 'onboarding' && <OnboardingView />}
        {currentRoute === 'login' && <LoginView />}
        {currentRoute === 'register' && <RegisterView />}
        {currentRoute === 'forgot-password' && <ForgotPasswordView />}
        {currentRoute === 'verify-email' && <VerifyEmailView />}
        {currentRoute === 'profile' && <ProfileView />}
        {currentRoute === 'legal' && <LegalPrivacyView />}
      </main>
    </div>
  );
}
