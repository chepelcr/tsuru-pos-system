export interface OrgNotificationSettings {
  callbackUrl: string;
  notifySentDocuments: number; // 1=Solo aprobados 2=Solo rechazados 3=Ambos 4=Sin notificaciones
  notifyProcessingDocuments: boolean;
  notifyReceivedDocuments: boolean;
}

export interface OrgCertificate {
  name: string;
  expirationDate: string;
  pin: string;
  alias: string;
  data: string;
  contentType: string;
  extension: string;
}

export interface OrgConfiguration {
  username: string;
  password: string;
  notificationSettings: OrgNotificationSettings | null;
  certificate: OrgCertificate | null;
  status: number; // 1=Activo 2=Inactivo 3=Eliminado
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
