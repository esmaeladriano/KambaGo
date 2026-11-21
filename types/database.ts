export interface DbProfileRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: 'passenger' | 'driver' | 'admin';
  account_status: 'pendente' | 'ativa' | 'suspensa';
  phone_verified: boolean;
  email_verified: boolean;
  avatar_path: string | null;
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
  avatar_path: string | null;
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

export interface DbRouteRow {
  id: string;
  code: string;
  origin_name: string;
  destination_name: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  max_detour_meters: number;
  destination_tolerance_meters: number;
  search_radius_meters: number;
  is_active: boolean;
  created_at: string;
}

export interface DbFareRuleRow {
  id: string;
  route_id: string;
  min_fare_kz: number;
  max_fare_kz: number;
  free_cancel_minutes_after_booking: number;
  free_cancel_minutes_before_pickup: number;
  late_cancel_fee_kz: number;
  driver_cancel_passenger_fee_kz: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
