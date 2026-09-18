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
  alias: string;
  content_type: string;
  extension: string;
  // `pin` and `data` are deliberately absent. Together they are the signing key
  // for this taxpayer's legal documents, and the API no longer returns either —
  // a replacement certificate is uploaded, never read back.
}

export interface OrgConfiguration {
  username: string;
  /**
   * Whether a Hacienda password is stored — never the password itself. An empty
   * password field on save means "keep the stored one".
   */
  has_password: boolean;
  notification_settings: OrgNotificationSettings | null;
  certificate: OrgCertificate | null;
  status: number; // 1=Activo 2=Inactivo 3=Eliminado
  /** POS shell theme id, persisted via PATCH /configurations/theme. */
  theme?: string;
}

/** The stored PKCS12, returned only by the explicit download endpoint. */
export interface CertificateDownload {
  file_name: string;
  content_type: string;
  /** Base64 PKCS12 bytes. */
  data: string;
  expiration_date: string | null;
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
