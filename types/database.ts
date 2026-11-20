export interface DbProfileRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  role: 'passenger' | 'driver' | 'admin';
  account_status: 'pendente' | 'ativa' | 'suspensa';
  phone_verified: boolean;
  avatar_path: string | null;
  avatar_url: string | null;
  data_saver_enabled: boolean;
  intt_registration_number: string | null;
  intt_verification_status: 'pendente_confirmacao';
  consent_terms_at: string | null;
  consent_privacy_at: string | null;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicProfileInfoRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface DbAuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
