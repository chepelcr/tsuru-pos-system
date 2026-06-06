export const CustomerType = {
  PERSONA_FISICA: 3,
  EMPRESA: 4,
} as const;

export type CustomerTypeValue = (typeof CustomerType)[keyof typeof CustomerType];
