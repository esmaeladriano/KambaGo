import { create } from 'zustand';
import type { UserProfile } from '../types/auth';
import { preferencesStorage } from '../services/supabase/deviceStorage';

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
  preferencesHydrated: boolean;
  statusBanner: {
    kind: 'info' | 'warning' | 'error' | 'success';
    message: string;
  } | null;
  setRoute: (route: Stage1Route) => void;
  setOnboardingStep: (step: number) => void;
  setPendingOtpPhone: (phone: string) => void;
  setProfile: (profile: UserProfile | null) => void;
  hydratePreferences: () => Promise<void>;
  setDataSaverEnabled: (enabled: boolean) => void;
  setStatusBanner: (banner: AuthState['statusBanner']) => void;
  clearBanner: () => void;
}

const STORAGE_KEY_DATA_SAVER = 'kambago_data_saver';

export const useAuthStore = create<AuthState>((set) => ({
  currentRoute: 'welcome',
  onboardingStep: 0,
  pendingOtpPhone: '',
  profile: null,
  dataSaverEnabled: false,
  preferencesHydrated: false,
  statusBanner: null,
  setRoute: (currentRoute) => set({ currentRoute, statusBanner: null }),
  setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
  setPendingOtpPhone: (pendingOtpPhone) => set({ pendingOtpPhone }),
  setProfile: (profile) =>
    set((state) => ({
      profile,
      dataSaverEnabled: profile ? profile.dataSaverEnabled : state.dataSaverEnabled,
    })),
  hydratePreferences: async () => {
    const raw = await preferencesStorage.getItem(STORAGE_KEY_DATA_SAVER);
    set((state) => ({
      preferencesHydrated: true,
      dataSaverEnabled: state.profile
        ? state.profile.dataSaverEnabled
        : raw === 'true',
    }));
  },
  setDataSaverEnabled: (enabled) => {
    void preferencesStorage.setItem(STORAGE_KEY_DATA_SAVER, String(enabled));
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
