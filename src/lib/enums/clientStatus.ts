export const ClientStatus = {
  ACTIVE:   1,
  INACTIVE: 2,
} as const;

export type ClientStatusValue = (typeof ClientStatus)[keyof typeof ClientStatus];
