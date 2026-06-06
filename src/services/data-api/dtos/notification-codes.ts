import { SimpleBase } from './base';

export interface GetNotificationCodeParams {
  id?: string;
}

export interface GetAllNotificationCodesParams {
  status?: string;
}

/**
 * Notification code response from the notification-codes service.
 * Extends SimpleBase which includes: id, created_on, updated_on
 */
export interface NotificationCodeResponse extends SimpleBase {
  code: string;
  description: string;
  status: number;
}

export type NotificationCodeListResponse = NotificationCodeResponse[];
