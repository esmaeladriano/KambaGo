import type { AccountStatus, UserProfile } from '../types/auth';
import { ptAO } from '../locales/pt-AO';

export function canAccountAccessTrips(
  status: AccountStatus,
  emailVerified: boolean
): boolean {
  return status === 'ativa' && emailVerified;
}

export function resolveStatusAfterEmailVerification(
  currentStatus: AccountStatus,
  role: UserProfile['role']
): AccountStatus {
  if (currentStatus === 'suspensa') {
    return 'suspensa';
  }
  if (role === 'driver') {
    // Motoristas aguardam ainda aprovação administrativa antes de receber viagens
    return currentStatus === 'ativa' ? 'ativa' : 'pendente';
  }
  return 'ativa';
}

export function getAccountStatusCopy(status: AccountStatus) {
  return ptAO.profile.statuses[status];
}

export function formatKz(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${safe.toLocaleString('pt-PT')} ${ptAO.common.currencySymbol}`;
}

export function formatAngolanPhoneDisplay(phone: string): string {
  const clean = phone.replace(/\s+/g, '');
  const match = clean.match(/^\+244(\d{3})(\d{3})(\d{3})$/);
  if (!match) {
    return phone;
  }
  return `+244 ${match[1]} ${match[2]} ${match[3]}`;
}
