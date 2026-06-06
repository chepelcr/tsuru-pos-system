/**
 * Organization Member DTOs for Pollos Sales
 */

export interface Member {
  id: string;
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export interface MemberListResponse {
  data: Member[];
}
