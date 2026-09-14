// Wire types: snake_case, because that is what sales-be sends and accepts.
// The `*FormState` types below stay camelCase — they are UI state, and the
// hooks are the seam between the two.
export interface OrgNotificationSettings {
  callback_url: string;
  notify_sent_documents: number; // 1=Solo aprobados 2=Solo rechazados 3=Ambos 4=Sin notificaciones
  notify_processing_documents: boolean;
  notify_received_documents: boolean;
}

export interface OrgCertificate {
  name: string;
  expiration_date: string;
  pin: string;
  alias: string;
  data: string;
  content_type: string;
  extension: string;
}

export interface OrgConfiguration {
  username: string;
  password: string;
  notification_settings: OrgNotificationSettings | null;
  certificate: OrgCertificate | null;
  status: number; // 1=Activo 2=Inactivo 3=Eliminado
  /** POS shell theme id, persisted via PATCH /configurations/theme. */
  theme?: string;
}

export interface ValidateCredentialsResponse {
  is_valid: boolean;
}

export interface HaciendaFormState {
  username: string;
  password: string;
  status: number;
  certData: string;
  certPin: string;
  certName: string;
}

export interface NotificationsFormState {
  callbackUrl: string;
  notifySentDocuments: number;
  notifyProcessingDocuments: boolean;
  notifyReceivedDocuments: boolean;
}
