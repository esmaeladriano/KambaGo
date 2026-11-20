import { readAppConfig } from '../../constants/config';
import { ptAO } from '../../locales/pt-AO';
import type { AuthActionResult } from '../../types/auth';

export interface SmsProvider {
  readonly providerName: string;
  sendOtp(phone: string): Promise<AuthActionResult>;
  verifyOtp(phone: string, code: string): Promise<AuthActionResult>;
}

class PendingSmsProvider implements SmsProvider {
  readonly providerName = 'pending';

  async sendOtp(): Promise<AuthActionResult> {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.setupStatus.smsMissing,
    };
  }

  async verifyOtp(): Promise<AuthActionResult> {
    return {
      ok: false,
      status: 'pending_configuration',
      message: ptAO.auth.feedback.otpPendingConfig,
    };
  }
}

export function createSmsProvider(): SmsProvider {
  const config = readAppConfig();
  if (config.smsProvider === 'pending') {
    return new PendingSmsProvider();
  }
  // Quando Twilio ou Africa's Talking forem ligados via Edge Function,
  // a chamada real é invocada aqui através de supabase.functions.invoke('send-otp').
  return new PendingSmsProvider();
}
