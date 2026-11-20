import { create } from 'zustand';
import type { UserProfile } from '../types/auth';

export type Stage1Route =
  | 'welcome'
  | 'onboarding'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'verify-otp'
  | 'profile'
  | 'legal';

interface AuthState {
  currentRoute: Stage1Route;
  onboardingStep: number;
  pendingOtpPhone: string;
  profile: UserProfile | null;
  dataSaverEnabled: boolean;
  statusBanner: {
    kind: 'info' | 'warning' | 'error' | 'success';
    message: string;
  } | null;
  setRoute: (route: Stage1Route) => void;
  setOnboardingStep: (step: number) => void;
  setPendingOtpPhone: (phone: string) => void;
  setProfile: (profile: UserProfile | null) => void;
  setDataSaverEnabled: (enabled: boolean) => void;
  setStatusBanner: (banner: AuthState['statusBanner']) => void;
  clearBanner: () => void;
}

const STORAGE_KEY_DATA_SAVER = 'kambago_data_saver';

function readInitialDataSaver(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(STORAGE_KEY_DATA_SAVER) === 'true';
    }
  } catch {
    // ignore storage errors
  }
  return false;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentRoute: 'welcome',
  onboardingStep: 0,
  pendingOtpPhone: '',
  profile: null,
  dataSaverEnabled: readInitialDataSaver(),
  statusBanner: null,
  setRoute: (currentRoute) => set({ currentRoute, statusBanner: null }),
  setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
  setPendingOtpPhone: (pendingOtpPhone) => set({ pendingOtpPhone }),
  setProfile: (profile) =>
    set((state) => ({
      profile,
      dataSaverEnabled: profile ? profile.dataSaverEnabled : state.dataSaverEnabled,
    })),
  setDataSaverEnabled: (enabled) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_DATA_SAVER, String(enabled));
      }
    } catch {
      // ignore storage errors
    }
    set((state) => ({
      dataSaverEnabled: enabled,
      profile: state.profile
        ? { ...state.profile, dataSaverEnabled: enabled }
        : null,
    }));
  },
  setStatusBanner: (statusBanner) => set({ statusBanner }),
  clearBanner: () => set({ statusBanner: null }),
}));
