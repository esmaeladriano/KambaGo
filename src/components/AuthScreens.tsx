import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ptAO } from '../../locales/pt-AO';
import { useAuthStore } from '../../store/useAuthStore';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  otpSchema,
  type RegisterFormValues,
  type LoginFormValues,
  type ForgotPasswordFormValues,
  type OtpFormValues,
} from '../../utils/validation';
import {
  registerUser,
  loginUser,
  requestPasswordReset,
  sendPhoneOtp,
  verifyPhoneOtp,
} from '../../services/auth/authService';
import { getIntegrationReadiness } from '../../services/supabase/client';
import { KambaGoLogo } from './KambaGoLogo';

function InlineBanner() {
  const banner = useAuthStore((s) => s.statusBanner);
  if (!banner) return null;

  const toneClass =
    banner.kind === 'error'
      ? 'bg-[#FEF2F2] border-red-200 text-[#991B1B]'
      : banner.kind === 'success'
      ? 'bg-[#ECFDF5] border-teal-200 text-[#065F46]'
      : 'bg-[#FFF6E5] border-[#FFB547]/50 text-[#7C4D00]';

  return (
    <div
      role="status"
      className={`rounded-xl border p-3.5 text-sm leading-relaxed flex items-start gap-2.5 ${toneClass}`}
    >
      {banner.kind === 'success' ? (
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      )}
      <span>{banner.message}</span>
    </div>
  );
}

export function WelcomeView() {
  const setRoute = useAuthStore((s) => s.setRoute);
  const setOnboardingStep = useAuthStore((s) => s.setOnboardingStep);
  const readiness = getIntegrationReadiness();

  return (
    <div className="flex flex-col justify-between min-h-[540px] bg-[#102A43] text-white rounded-2xl p-6 sm:p-8">
      <div className="space-y-6">
        <div className="flex items-center gap-3.5">
          <KambaGoLogo size={48} />
          <div>
            <p className="font-display text-2xl font-bold tracking-tight text-white">
              {ptAO.brand.name}
            </p>
            <p className="text-sm font-medium text-[#16B8A6]">{ptAO.brand.slogan}</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <p className="text-xs font-medium text-[#FFB547]">
            {ptAO.brand.corridorBadge}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-balance">
            {ptAO.welcome.headline}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {ptAO.welcome.subheadline}
          </p>
          <p className="text-xs text-slate-400 pt-1">{ptAO.brand.tagline}</p>
        </div>

        {!readiness.supabaseConfigured && (
          <div className="rounded-xl bg-[#1E3A5F] border border-slate-600/60 p-4 space-y-1">
            <p className="text-xs font-semibold text-[#FFB547]">
              {ptAO.common.pendingSetupBadge}
            </p>
            <p className="text-xs text-slate-200 leading-relaxed">
              {ptAO.setupStatus.supabaseMissing}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3 pt-8">
        <button
          type="button"
          onClick={() => {
            setOnboardingStep(0);
            setRoute('onboarding');
          }}
          className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#16B8A6] hover:bg-[#0F9485] text-white font-semibold text-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>{ptAO.welcome.primaryCta}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setRoute('login')}
          className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#1E3A5F] hover:bg-slate-700 text-white font-medium text-sm transition-colors cursor-pointer"
        >
          {ptAO.welcome.secondaryCta}
        </button>

        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => setRoute('legal')}
            className="text-xs text-slate-300 hover:text-white underline underline-offset-4 py-2 px-3 cursor-pointer"
          >
            {ptAO.welcome.legalLink}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OnboardingView() {
  const step = useAuthStore((s) => s.onboardingStep);
  const setStep = useAuthStore((s) => s.setOnboardingStep);
  const setRoute = useAuthStore((s) => s.setRoute);

  const slides = ptAO.onboarding.slides;
  const current = slides[step] ?? slides[0];
  const isLast = step === slides.length - 1;

  return (
    <div className="flex flex-col justify-between min-h-[540px] bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {ptAO.onboarding.stepLabel} {step + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={() => setRoute('register')}
            className="font-medium text-[#102A43] hover:underline py-1 px-2 cursor-pointer"
          >
            {ptAO.common.skip}
          </button>
        </div>

        <div className="flex gap-2" aria-hidden="true">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                idx <= step ? 'bg-[#16B8A6]' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="pt-4 space-y-3">
          <h2 className="font-display text-2xl font-bold text-[#102A43] text-balance">
            {current.title}
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">{current.body}</p>
        </div>
      </div>

      <div className="space-y-3 pt-8">
        <button
          type="button"
          onClick={() => (isLast ? setRoute('register') : setStep(step + 1))}
          className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#16B8A6] hover:bg-[#0F9485] text-white font-semibold text-base transition-colors cursor-pointer"
        >
          {isLast ? ptAO.onboarding.finishCta : ptAO.common.next}
        </button>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep(step - 1) : setRoute('welcome'))}
            className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{ptAO.common.back}</span>
          </button>

          <button
            type="button"
            onClick={() => setRoute('login')}
            className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold text-[#102A43] hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {ptAO.onboarding.loginCta}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RegisterView() {
  const setRoute = useAuthStore((s) => s.setRoute);
  const setPendingOtpPhone = useAuthStore((s) => s.setPendingOtpPhone);
  const setStatusBanner = useAuthStore((s) => s.setStatusBanner);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      phone: '+244 ',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'passenger',
      acceptedLegalTerms: false,
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (values: RegisterFormValues) => {
    const result = await registerUser(values);
    if (result.ok) {
      setPendingOtpPhone(values.phone);
      setStatusBanner({ kind: 'success', message: result.message });
      setRoute('verify-otp');
      return;
    }
    setStatusBanner({
      kind: result.status === 'pending_configuration' ? 'warning' : 'error',
      message: result.message,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-4"
    >
      <div className="space-y-1">
        <h2 className="font-display text-xl font-bold text-[#102A43]">
          {ptAO.auth.registerTitle}
        </h2>
        <p className="text-sm text-slate-600">{ptAO.auth.registerSubtitle}</p>
      </div>

      <InlineBanner />

      <div className="space-y-1.5">
        <label htmlFor="reg-role" className="block text-sm font-medium text-[#102A43]">
          {ptAO.auth.fields.role}
        </label>
        <div
          id="reg-role"
          className="grid grid-cols-2 gap-1.5 p-1 bg-[#F1F5F9] rounded-xl"
          role="group"
          aria-label={ptAO.auth.fields.role}
        >
          <button
            type="button"
            onClick={() => setValue('role', 'passenger')}
            className={`min-h-[44px] rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              selectedRole === 'passenger'
                ? 'bg-white text-[#102A43] shadow-sm'
                : 'text-slate-600 hover:text-[#102A43]'
            }`}
          >
            {ptAO.auth.fields.rolePassenger}
          </button>
          <button
            type="button"
            onClick={() => setValue('role', 'driver')}
            className={`min-h-[44px] rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              selectedRole === 'driver'
                ? 'bg-white text-[#102A43] shadow-sm'
                : 'text-slate-600 hover:text-[#102A43]'
            }`}
          >
            {ptAO.auth.fields.roleDriver}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="reg-fullname" className="block text-sm font-medium text-[#102A43]">
          {ptAO.auth.fields.fullName}
        </label>
        <input
          id="reg-fullname"
          type="text"
          placeholder={ptAO.auth.fields.fullNamePlaceholder}
          {...register('fullName')}
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F7FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#16B8A6]"
        />
        {errors.fullName && (
          <p className="text-xs text-red-600">{errors.fullName.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="reg-phone" className="block text-sm font-medium text-[#102A43]">
          {ptAO.auth.fields.phone}
        </label>
        <input
          id="reg-phone"
          type="tel"
          placeholder={ptAO.auth.fields.phonePlaceholder}
          {...register('phone')}
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F7FAFC] text-sm font-mono-tabular focus:outline-none focus:ring-2 focus:ring-[#16B8A6]"
        />
        {errors.phone && (
          <p className="text-xs text-red-600">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="reg-email" className="block text-sm font-medium text-[#102A43]">
          {ptAO.auth.fields.email}
        </label>
        <input
          id="reg-email"
          type="email"
          placeholder={ptAO.auth.fields.emailPlaceholder}
          {...register('email')}
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F7FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#16B8A6]"
        />
        {errors.email && (
          <p className="text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="reg-password" className="block text-sm font-medium text-[#102A43]">
            {ptAO.auth.fields.password}
          </label>
          <input
            id="reg-password"
            type="password"
            placeholder={ptAO.auth.fields.passwordPlaceholder}
            {...register('password')}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F7FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#16B8A6]"
          />
          {errors.password && (
            <p className="text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="reg-confirm" className="block text-sm font-medium text-[#102A43]">
            {ptAO.auth.fields.confirmPassword}
          </label>
          <input
            id="reg-confirm"
            type="password"
            placeholder={ptAO.auth.fields.confirmPasswordPlaceholder}
            {...register('confirmPassword')}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F7FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#16B8A6]"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-[#F1F5F9] p-3.5 space-y-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register('acceptedLegalTerms')}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-[#16B8A6] focus:ring-[#16B8A6]"
          />
          <span className="text-xs text-slate-700 leading-relaxed">
            {ptAO.auth.consent.termsLabel}{' '}
            <button
              type="button"
              onClick={() => setRoute('legal')}
              className="font-semibold text-[#102A43] underline underline-offset-2 cursor-pointer"
            >
              {ptAO.welcome.legalLink}
            </button>
          </span>
        </label>
        {errors.acceptedLegalTerms && (
          <p className="text-xs text-red-600">{errors.acceptedLegalTerms.message}</p>
        )}
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#16B8A6] shrink-0" />
          <span>{ptAO.auth.consent.locationNotice}</span>
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#16B8A6] hover:bg-[#0F9485] disabled:opacity-60 text-white font-semibold text-base transition-colors cursor-pointer"
      >
        {isSubmitting ? ptAO.common.saving : ptAO.auth.actions.submitRegister}
      </button>

      <div className="flex items-center justify-between pt-1 text-xs">
        <button
          type="button"
          onClick={() => setRoute('login')}
          className="font-medium text-[#102A43] hover:underline py-2 cursor-pointer"
        >
          {ptAO.auth.actions.goToLogin}
        </button>
        <button
          type="button"
          onClick={() => setRoute('verify-otp')}
          className="font-medium text-slate-600 hover:text-[#102A43] py-2 cursor-pointer"
        >
          {ptAO.auth.actions.verifyPhoneLink}
        </button>
      </div>
    </form>
  );
}

export function LoginView() {
  const setRoute = useAuthStore((s) => s.setRoute);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setStatusBanner = useAuthStore((s) => s.setStatusBanner);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    const result = await loginUser(values);
    if (result.ok && result.data) {
      setProfile(result.data);
      setStatusBanner({ kind: 'success', message: result.message });
      setRoute('profile');
      return;
    }
    setStatusBanner({
      kind: result.status === 'pending_configuration' ? 'warning' : 'error',
      message: result.message,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-4"
    >
      <div className="space-y-1">
        <h2 className="font-display text-xl font-bold text-[#102A43]">
          {ptAO.auth.loginTitle}
        </h2>
        <p className="text-sm text-slate-600">{ptAO.auth.loginSubtitle}</p>
      </div>

      <InlineBanner />

      <div className="space-y-1">
        <label htmlFor="login-identifier" className="block text-sm font-medium text-[#102A43]">
          {ptAO.auth.fields.phone} / {ptAO.auth.fields.email}
        </label>
        <input
          id="login-identifier"
          type="text"
          placeholder={ptAO.auth.fields.phonePlaceholder}
          {...register('identifier')}
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F7FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#16B8A6]"
        />
        {errors.identifier && (
          <p className="text-xs text-red-600">{errors.identifier.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="login-password" className="block text-sm font-medium text-[#102A43]">
          {ptAO.auth.fields.password}
        </label>
        <input
          id="login-password"
          type="password"
          placeholder={ptAO.auth.fields.passwordPlaceholder}
          {...register('password')}
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F7FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#16B8A6]"
        />
        {errors.password && (
          <p className="text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#16B8A6] hover:bg-[#0F9485] disabled:opacity-60 text-white font-semibold text-base transition-colors cursor-pointer"
      >
        {isSubmitting ? ptAO.common.loading : ptAO.auth.actions.submitLogin}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <button
          type="button"
          onClick={() => setRoute('forgot-password')}
          className="font-medium text-slate-600 hover:text-[#102A43] py-2 cursor-pointer"
        >
          {ptAO.auth.actions.forgotLink}
        </button>
        <button
          type="button"
          onClick={() => setRoute('register')}
          className="font-semibold text-[#102A43] hover:underline py-2 cursor-pointer"
        >
          {ptAO.auth.actions.goToRegister}
        </button>
      </div>
    </form>
  );
}

export function ForgotPasswordView() {
  const setRoute = useAuthStore((s) => s.setRoute);
  const setStatusBanner = useAuthStore((s) => s.setStatusBanner);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { identifier: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    const result = await requestPasswordReset(values.identifier);
    setStatusBanner({
      kind: result.ok
        ? 'success'
        : result.status === 'pending_configuration'
        ? 'warning'
        : 'error',
      message: result.message,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-4"
    >
      <div className="space-y-1">
        <h2 className="font-display text-xl font-bold text-[#102A43]">
          {ptAO.auth.forgotTitle}
        </h2>
        <p className="text-sm text-slate-600">{ptAO.auth.forgotSubtitle}</p>
      </div>

      <InlineBanner />

      <div className="space-y-1">
        <label htmlFor="forgot-identifier" className="block text-sm font-medium text-[#102A43]">
          {ptAO.auth.fields.email} / {ptAO.auth.fields.phone}
        </label>
        <input
          id="forgot-identifier"
          type="text"
          placeholder={ptAO.auth.fields.emailPlaceholder}
          {...register('identifier')}
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F7FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#16B8A6]"
        />
        {errors.identifier && (
          <p className="text-xs text-red-600">{errors.identifier.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#102A43] hover:bg-[#1E3A5F] text-white font-semibold text-base transition-colors cursor-pointer"
      >
        {ptAO.auth.actions.submitForgot}
      </button>

      <button
        type="button"
        onClick={() => setRoute('login')}
        className="w-full min-h-[44px] text-xs font-medium text-slate-600 hover:text-[#102A43] cursor-pointer"
      >
        {ptAO.common.back}
      </button>
    </form>
  );
}

export function VerifyOtpView() {
  const pendingOtpPhone = useAuthStore((s) => s.pendingOtpPhone);
  const setRoute = useAuthStore((s) => s.setRoute);
  const setStatusBanner = useAuthStore((s) => s.setStatusBanner);
  const readiness = getIntegrationReadiness();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { phone: pendingOtpPhone || '+244 ', code: '' },
  });

  const onSubmit = async (values: OtpFormValues) => {
    const result = await verifyPhoneOtp(values);
    setStatusBanner({
      kind: result.ok
        ? 'success'
        : result.status === 'pending_configuration'
        ? 'warning'
        : 'error',
      message: result.message,
    });
    if (result.ok) {
      setRoute('profile');
    }
  };

  const handleResend = async () => {
    const result = await sendPhoneOtp(getValues('phone'));
    setStatusBanner({
      kind: result.ok ? 'success' : 'warning',
      message: result.message,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-4"
    >
      <div className="space-y-1">
        <h2 className="font-display text-xl font-bold text-[#102A43]">
          {ptAO.auth.otpTitle}
        </h2>
        <p className="text-sm text-slate-600">{ptAO.auth.otpSubtitle}</p>
      </div>

      {!readiness.smsConfigured && (
        <div className="rounded-xl bg-[#FFF6E5] border border-[#FFB547]/50 p-3.5 text-xs text-[#7C4D00] space-y-1">
          <p className="font-semibold">{ptAO.common.pendingSetupBadge}</p>
          <p>{ptAO.setupStatus.smsMissing}</p>
        </div>
      )}

      <InlineBanner />

      <div className="space-y-1">
        <label htmlFor="otp-phone" className="block text-sm font-medium text-[#102A43]">
          {ptAO.auth.fields.phone}
        </label>
        <input
          id="otp-phone"
          type="tel"
          placeholder={ptAO.auth.fields.phonePlaceholder}
          {...register('phone')}
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F7FAFC] text-sm font-mono-tabular focus:outline-none focus:ring-2 focus:ring-[#16B8A6]"
        />
        {errors.phone && (
          <p className="text-xs text-red-600">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="otp-code" className="block text-sm font-medium text-[#102A43]">
          {ptAO.auth.fields.otpCode}
        </label>
        <input
          id="otp-code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder={ptAO.auth.fields.otpPlaceholder}
          {...register('code')}
          className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F7FAFC] text-lg tracking-[0.25em] text-center font-mono-tabular focus:outline-none focus:ring-2 focus:ring-[#16B8A6]"
        />
        {errors.code && (
          <p className="text-xs text-red-600">{errors.code.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#16B8A6] hover:bg-[#0F9485] text-white font-semibold text-base transition-colors cursor-pointer"
      >
        {ptAO.auth.actions.submitOtp}
      </button>

      <div className="flex items-center justify-between pt-1 text-xs">
        <button
          type="button"
          onClick={handleResend}
          className="font-semibold text-[#102A43] hover:underline py-2 cursor-pointer"
        >
          {ptAO.auth.actions.resendOtp}
        </button>
        <button
          type="button"
          onClick={() => setRoute('login')}
          className="text-slate-600 hover:text-[#102A43] py-2 cursor-pointer"
        >
          {ptAO.common.back}
        </button>
      </div>
    </form>
  );
}
