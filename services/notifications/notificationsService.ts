import { ptAO } from '../../locales/pt-AO';

export interface NotificationCapabilityState {
  enabled: boolean;
  reason: string;
  token: string | null;
}

export function getNotificationCapabilityState(): NotificationCapabilityState {
  return {
    enabled: false,
    reason: ptAO.profile.smsNotifications.pendingLabel,
    token: null,
  };
}
