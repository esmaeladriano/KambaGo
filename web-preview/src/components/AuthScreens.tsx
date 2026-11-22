import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { ptAO } from '../../../locales/pt-AO';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  isMockAuthActive,
  loginUser,
  registerUser,
  requestPasswordReset,
  sendEmailAuthLink,
  sendEmailVerificationCode,
  verifyEmailCode,
} from '../../../services/auth/authService';
import {
  emailVerificationSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  type EmailVerificationFormValues,
  type ForgotPasswordFormValues,
  type LoginFormValues,
  type RegisterFormValues,
} from '../../../utils/validation';
import { KambaGoLogo } from './KambaGoLogo';

export function WelcomeView() {
  const setRoute = useAuthStore((s) => s.setRoute);
  const setOnboardingStep = useAuthStore((s) => s.setOnboardingStep);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-[#102A43] p-6 text-white shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <KambaGoLogo size={52} />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                {ptAO.brand.name}
              </h1>
              <p className="text-sm font-semibold text-[#16B8A6]">{ptAO.brand.slogan}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1E3A5F] px-3 py-1 text-xs font-semibold text-[#FFB547]">
            <MapPin className="h-3.5 w-3.5" />
            {ptAO.brand.corridorBadge}
          </span>
        </div>

        <h2 className="mt-6 text-2xl font-bold leading-snug text-white sm:text-3xl">
          {ptAO.welcome.headline}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
          {ptAO.welcome.subheadline}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setOnboardingStep(0);
              setRoute('onboarding');
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16B8A6] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#0F9485]"
          >
            {ptAO.welcome.primaryCta}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setRoute('login')}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-500/50 bg-[#1E3A5F] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#274B78]"
          >
            {ptAO.welcome.secondaryCta}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {ptAO.onboarding.slides.map((slide, idx) => (
          <div
            key={slide.title}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F9485]">
              {ptAO.onboarding.stepLabel} {idx + 1}
            </span>
            <h3 className="mt-1.5 text-sm font-bold text-[#102A43]">{slide.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{slide.body}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setRoute('legal')}
          className="text-sm font-semibold text-[#0F9485] underline-offset-4 hover:underline"
        >
          {ptAO.welcome.legalLink}
        </button>
      </div>
    </div>
  );
}

export function OnboardingView() {
  const onboardingStep = useAuthStore((s) => s.onboardingStep);
  const setOnboardingStep = useAuthStore((s) => s.setOnboardingStep);
  const setRoute = useAuthStore((s) => s.setRoute);

  const slides = ptAO.onboarding.slides;
  const activeSlide = slides[onboardingStep] ?? slides[0];
  const isLast = onboardingStep >= slides.length - 1;
  const icons = [Users, ShieldCheck, Mail];
  const SlideIcon = icons[onboardingStep] ?? Users;

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-[#102A43]">
          {ptAO.onboarding.stepLabel} {onboardingStep + 1} / {slides.length}
        </span>
        <button
          type="button"
          onClick={() => setRoute('register')}
          className="text-sm font-semibold text-[#0F9485] hover:underline"
        >
          {ptAO.common.skip}
        </button>
      </div>

      <div className="mt-8 flex flex-col items-start">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#0F9485]">
          <SlideIcon className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-[#102A43]">{activeSlide.title}</h2>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">
          {activeSlide.body}
        </p>
      </div>

      <div className="mt-6 flex items-center gap-2">
        {slides.map((slide, idx) => (
          <button
            key={slide.title}
            type="button"
            aria-label={`${ptAO.onboarding.stepLabel} ${idx + 1}`}
            onClick={() => setOnboardingStep(idx)}
            className={`h-2 rounded-full transition-all ${
              idx === onboardingStep ? 'w-8 bg-[#16B8A6]' : 'w-2.5 bg-slate-200'
            }`}
          />
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {isLast ? (
          <>
            <button
              type="button"
              onClick={() => setRoute('register')}
              className="flex-1 rounded-2xl bg-[#16B8A6] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#0F9485]"
            >
              {ptAO.onboarding.finishCta}
            </button>
            <button
              type="button"
              onClick={() => setRoute('login')}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-[#102A43] transition hover:bg-slate-50"
            >
              {ptAO.onboarding.loginCta}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOnboardingStep(onboardingStep + 1)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#102A43] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#1E3A5F]"
          >
            {ptAO.common.next}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function RegisterView() {
  const setRoute = useAuthStore((s) => s.setRoute);
  const setPendingVerificationEmail = useAuthStore((s) => s.setPendingVerificationEmail);
  const setStatusBanner = useAuthStore((s) => s.setStatusBanner);
  const [sendingLink, setSendingLink] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
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
    setStatusBanner({
      kind: result.ok
        ? 'success'
        : result.status === 'pending_configuration'
          ? 'warning'
          : 'error',
      message: result.message,
    });
    if (result.ok || result.requiresEmailVerification) {
      setPendingVerificationEmail(values.email);
      setRoute('verify-email');
    }
  };

  const handleSendEmailLink = async () => {
    setSendingLink(true);
    const redirectTo =
      typeof window !== 'undefined' ? window.location.origin : undefined;
    const res = await sendEmailAuthLink(getValues('email'), redirectTo);
    setStatusBanner({
      kind: res.ok
        ? 'success'
        : res.status === 'pending_configuration'
          ? 'warning'
          : 'error',
      message: res.message,
    });
    setSendingLink(false);
  };

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <h2 className="text-2xl font-bold text-[#102A43]">{ptAO.auth.registerTitle}</h2>
      <p className="mt-1 text-sm text-slate-600">{ptAO.auth.registerSubtitle}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
            {ptAO.auth.fields.role}
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            {(['passenger', 'driver'] as const).map((roleOption) => (
              <button
                key={roleOption}
                type="button"
                onClick={() => setValue('role', roleOption)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  selectedRole === roleOption
                    ? 'border-[#102A43] bg-[#102A43] text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {roleOption === 'passenger'
                  ? ptAO.auth.fields.rolePassenger
                  : ptAO.auth.fields.roleDriver}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="reg-fullname"
            className="block text-sm font-semibold text-[#102A43]"
          >
            {ptAO.auth.fields.fullName}
          </label>
          <input
            id="reg-fullname"
            type="text"
            placeholder={ptAO.auth.fields.fullNamePlaceholder}
            {...register('fullName')}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-[#102A43] focus:border-[#16B8A6] focus:bg-white focus:outline-none"
          />
          {errors.fullName && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-sm font-semibold text-[#102A43]">
            {ptAO.auth.fields.email}
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder={ptAO.auth.fields.emailPlaceholder}
            {...register('email')}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-[#102A43] focus:border-[#16B8A6] focus:bg-white focus:outline-none"
          />
          {errors.email && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="reg-password"
              className="block text-sm font-semibold text-[#102A43]"
            >
              {ptAO.auth.fields.password}
            </label>
            <input
              id="reg-password"
              type="password"
              placeholder={ptAO.auth.fields.passwordPlaceholder}
              {...register('password')}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-[#102A43] focus:border-[#16B8A6] focus:bg-white focus:outline-none"
            />
            {errors.password && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="reg-confirm-password"
              className="block text-sm font-semibold text-[#102A43]"
            >
              {ptAO.auth.fields.confirmPassword}
            </label>
            <input
              id="reg-confirm-password"
              type="password"
              placeholder={ptAO.auth.fields.confirmPasswordPlaceholder}
              {...register('confirmPassword')}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-[#102A43] focus:border-[#16B8A6] focus:bg-white focus:outline-none"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <input
            type="checkbox"
            {...register('acceptedLegalTerms')}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#16B8A6] focus:ring-[#16B8A6]"
          />
          <span>{ptAO.auth.consent.termsLabel}</span>
        </label>
        {errors.acceptedLegalTerms && (
          <p className="text-xs font-medium text-red-600">
            {errors.acceptedLegalTerms.message}
          </p>
        )}

        <p className="text-xs text-slate-500">{ptAO.auth.consent.locationNotice}</p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-[#16B8A6] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#0F9485] disabled:opacity-60"
        >
          {isSubmitting ? ptAO.common.loading : ptAO.auth.actions.submitRegister}
        </button>

        <button
          type="button"
          disabled={sendingLink}
          onClick={() => void handleSendEmailLink()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#102A43] transition hover:bg-slate-50 disabled:opacity-60"
        >
          <Mail className="h-4 w-4 text-[#0F9485]" />
          {ptAO.auth.actions.sendEmailLink}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm">
        <button
          type="button"
          onClick={() => setRoute('verify-email')}
          className="font-semibold text-[#0F9485] hover:underline"
        >
          {ptAO.auth.actions.verifyEmailLink}
        </button>
        <button
          type="button"
          onClick={() => setRoute('login')}
          className="font-semibold text-[#102A43] hover:underline"
        >
          {ptAO.auth.actions.goToLogin}
        </button>
      </div>
    </div>
  );
}

export function LoginView() {
  const setRoute = useAuthStore((s) => s.setRoute);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setPendingVerificationEmail = useAuthStore((s) => s.setPendingVerificationEmail);
  const setStatusBanner = useAuthStore((s) => s.setStatusBanner);
  const [sendingLink, setSendingLink] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    const result = await loginUser(values);
    setStatusBanner({
      kind: result.ok
        ? 'success'
        : result.status === 'pending_configuration'
          ? 'warning'
          : 'error',
      message: result.message,
    });
    if (result.ok && result.data) {
      setProfile(result.data);
      setRoute('profile');
      return;
    }
    if (result.requiresEmailVerification) {
      setPendingVerificationEmail(values.email);
      setRoute('verify-email');
    }
  };

  const handleSendMagicLink = async () => {
    setSendingLink(true);
    const redirectTo =
      typeof window !== 'undefined' ? window.location.origin : undefined;
    const res = await sendEmailAuthLink(getValues('email'), redirectTo);
    setStatusBanner({
      kind: res.ok
        ? 'success'
        : res.status === 'pending_configuration'
          ? 'warning'
          : 'error',
      message: res.message,
    });
    setSendingLink(false);
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <h2 className="text-2xl font-bold text-[#102A43]">{ptAO.auth.loginTitle}</h2>
      <p className="mt-1 text-sm text-slate-600">{ptAO.auth.loginSubtitle}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className="block text-sm font-semibold text-[#102A43]">
            {ptAO.auth.fields.email}
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder={ptAO.auth.fields.emailPlaceholder}
            {...register('email')}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-[#102A43] focus:border-[#16B8A6] focus:bg-white focus:outline-none"
          />
          {errors.email && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-semibold text-[#102A43]"
          >
            {ptAO.auth.fields.password}
          </label>
          <input
            id="login-password"
            type="password"
            placeholder={ptAO.auth.fields.passwordPlaceholder}
            {...register('password')}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-[#102A43] focus:border-[#16B8A6] focus:bg-white focus:outline-none"
          />
          {errors.password && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-[#16B8A6] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#0F9485] disabled:opacity-60"
        >
          {isSubmitting ? ptAO.common.loading : ptAO.auth.actions.submitLogin}
        </button>

        <button
          type="button"
          disabled={sendingLink}
          onClick={() => void handleSendMagicLink()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#102A43] transition hover:bg-slate-50 disabled:opacity-60"
        >
          <Mail className="h-4 w-4 text-[#0F9485]" />
          {ptAO.auth.actions.sendEmailLink}
        </button>
      </form>

      <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 text-sm">
        <button
          type="button"
          onClick={() => setRoute('forgot-password')}
          className="text-left font-semibold text-[#0F9485] hover:underline"
        >
          {ptAO.auth.actions.forgotLink}
        </button>
        <button
          type="button"
          onClick={() => setRoute('verify-email')}
          className="text-left font-semibold text-[#0F9485] hover:underline"
        >
          {ptAO.auth.actions.verifyEmailLink}
        </button>
        <button
          type="button"
          onClick={() => setRoute('register')}
          className="text-left font-semibold text-[#102A43] hover:underline"
        >
          {ptAO.auth.actions.goToRegister}
        </button>
      </div>
    </div>
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
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    const res = await requestPasswordReset(values.email);
    setStatusBanner({
      kind: res.ok
        ? 'success'
        : res.status === 'pending_configuration'
          ? 'warning'
          : 'error',
      message: res.message,
    });
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#102A43]">
        <KeyRound className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-2xl font-bold text-[#102A43]">{ptAO.auth.forgotTitle}</h2>
      <p className="mt-1 text-sm text-slate-600">{ptAO.auth.forgotSubtitle}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-semibold text-[#102A43]">
            {ptAO.auth.fields.emailRecovery}
          </label>
          <input
            id="forgot-email"
            type="email"
            placeholder={ptAO.auth.fields.emailPlaceholder}
            {...register('email')}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-[#102A43] focus:border-[#16B8A6] focus:bg-white focus:outline-none"
          />
          {errors.email && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-[#102A43] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#1E3A5F] disabled:opacity-60"
        >
          {isSubmitting ? ptAO.common.loading : ptAO.auth.actions.submitForgot}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setRoute('login')}
        className="mt-5 text-sm font-semibold text-[#0F9485] hover:underline"
      >
        {ptAO.common.back}
      </button>
    </div>
  );
}

export function VerifyEmailView() {
  const pendingVerificationEmail = useAuthStore((s) => s.pendingVerificationEmail);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setRoute = useAuthStore((s) => s.setRoute);
  const setStatusBanner = useAuthStore((s) => s.setStatusBanner);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmailVerificationFormValues>({
    resolver: zodResolver(emailVerificationSchema),
    defaultValues: {
      email: pendingVerificationEmail || '',
      code: '',
    },
  });

  useEffect(() => {
    if (pendingVerificationEmail) {
      setValue('email', pendingVerificationEmail);
    }
  }, [pendingVerificationEmail, setValue]);

  const onSubmit = async (values: EmailVerificationFormValues) => {
    const res = await verifyEmailCode(values);
    setStatusBanner({
      kind: res.ok
        ? res.data?.accountStatus === 'ativa'
          ? 'success'
          : 'warning'
        : res.status === 'pending_configuration'
          ? 'warning'
          : 'error',
      message: res.message,
    });
    if (res.ok && res.data) {
      setProfile(res.data);
      if (res.data.accountStatus === 'ativa') {
        setRoute('profile');
      }
    }
  };

  const handleResend = async () => {
    setResending(true);
    const res = await sendEmailVerificationCode(getValues('email'));
    setStatusBanner({
      kind: res.ok
        ? 'success'
        : res.status === 'pending_configuration'
          ? 'warning'
          : 'error',
      message: res.message,
    });
    setResending(false);
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#0F9485]">
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-2xl font-bold text-[#102A43]">
        {ptAO.auth.verifyEmailTitle}
      </h2>
      <p className="mt-1 text-sm text-slate-600">{ptAO.auth.verifyEmailSubtitle}</p>
      {isMockAuthActive() && (
        <p className="mt-2 rounded-xl border border-teal-200 bg-[#ECFDF5] px-3 py-2 text-xs font-semibold text-[#0F9485]">
          {ptAO.auth.feedback.mockVerifyCodeHint}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="verify-email" className="block text-sm font-semibold text-[#102A43]">
            {ptAO.auth.fields.email}
          </label>
          <input
            id="verify-email"
            type="email"
            placeholder={ptAO.auth.fields.emailPlaceholder}
            {...register('email')}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-[#102A43] focus:border-[#16B8A6] focus:bg-white focus:outline-none"
          />
          {errors.email && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="verify-code" className="block text-sm font-semibold text-[#102A43]">
            {ptAO.auth.fields.emailCode}
          </label>
          <input
            id="verify-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder={ptAO.auth.fields.emailCodePlaceholder}
            {...register('code')}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.35em] text-[#102A43] focus:border-[#16B8A6] focus:bg-white focus:outline-none"
          />
          {errors.code && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.code.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-[#16B8A6] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#0F9485] disabled:opacity-60"
        >
          {isSubmitting ? ptAO.common.loading : ptAO.auth.actions.submitVerifyEmail}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm">
        <button
          type="button"
          disabled={resending}
          onClick={() => void handleResend()}
          className="font-semibold text-[#0F9485] hover:underline disabled:opacity-60"
        >
          {ptAO.auth.actions.resendEmailCode}
        </button>
        <button
          type="button"
          onClick={() => setRoute('login')}
          className="font-semibold text-[#102A43] hover:underline"
        >
          {ptAO.auth.actions.goToLogin}
        </button>
      </div>
    </div>
  );
}
