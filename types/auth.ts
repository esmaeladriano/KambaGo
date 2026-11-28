export type AccountStatus = 'pendente' | 'ativa' | 'suspensa';

export type UserRole = 'passenger' | 'driver' | 'admin';

export type MapsProviderName = 'google' | 'mapbox';

export interface UserProfile {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  accountStatus: AccountStatus;
  phoneVerified: boolean;
  emailVerified: boolean;
  avatarPath: string | null;
  avatarSignedUrl: string | null;
  dataSaverEnabled: boolean;
  isAvailable: boolean;
  inttRegistrationNumber: string | null;
  inttVerificationStatus: 'pendente_confirmacao';
  consentTermsAt: string | null;
  consentPrivacyAt: string | null;
  expoPushToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthActionResult<T = void> {
  ok: boolean;
  status: 'success' | 'pending_configuration' | 'validation_error' | 'error';
  message: string;
  data?: T;
  requiresEmailVerification?: boolean;
}

export interface RegisterPayload {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  role: 'passenger' | 'driver';
  acceptedLegalTerms: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface EmailVerifyPayload {
  email: string;
  code: string;
}
