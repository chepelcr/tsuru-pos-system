import type { StepperStep } from "@/components/common/Stepper";

/** Account creation finishes before the organization's separate setup wizard. */
export const ACCOUNT_CREATION_STEPS: StepperStep[] = [
  { id: "info", titleKey: "auth.register.steps.info" },
  { id: "password", titleKey: "auth.register.steps.password" },
  { id: "verification", titleKey: "auth.register.steps.verification" },
];
