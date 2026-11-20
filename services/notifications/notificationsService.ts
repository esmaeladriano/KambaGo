import { readAppConfig } from '../../constants/config';
import { ptAO } from '../../locales/pt-AO';

export interface NotificationCapabilityState {
  enabled: boolean;
  reason: string;
  token: string | null;
}

export function getNotificationCapabilityState(): NotificationCapabilityState {
  const config = readAppConfig();
  return {
    enabled: config.isNotificationsConfigured,
    reason: config.isNotificationsConfigured
      ? ptAO.profile.smsNotifications.readyLabel
      : ptAO.profile.smsNotifications.pendingLabel,
    token: null,
  };
}
