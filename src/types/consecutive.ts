/**
 * Document consecutives — store-be `/consecutives` (TSR-327).
 *
 * One counter per (terminal, Hacienda document type). `current_number` is the
 * last number already issued; the 20-digit consecutive Hacienda keys on is
 * branch(3) + terminal(5) + type(2) + number(10).
 */

export interface ConsecutiveBranchRef {
  branch_id: string;
  code: number;
  name: string;
}

export interface ConsecutiveTerminalRef {
  terminal_id: string;
  code: number;
  name: string;
}

export interface ConsecutiveDocumentTypeRef {
  id: number;
  code: string;
  name: string;
}

export interface Consecutive {
  consecutive_id: string;
  organization_id: string;
  terminal_id: string;
  document_type_id: number;
  current_number: number;
  branch?: ConsecutiveBranchRef | null;
  terminal?: ConsecutiveTerminalRef | null;
  document_type?: ConsecutiveDocumentTypeRef | null;
  /** The consecutive the next document of this type will carry. */
  next_document_consecutive?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by: string;
}

export interface ConsecutiveListResponse {
  data: Consecutive[];
  pagination: {
    page: number;
    page_size: number;
    total_elements: number;
    total_pages: number;
  };
}

/** One audited manual change. `previous_number` null = the edit created the counter. */
export interface ConsecutiveAdjustment {
  adjustment_id: string;
  consecutive_id: string;
  previous_number: number | null;
  new_number: number;
  reason: string;
  changed_by: string;
  changed_on: string;
}

/** Hacienda's sequence segment is 10 digits. */
export const MAX_CONSECUTIVE_NUMBER = 9_999_999_999;

/** 20-digit Hacienda consecutive: branch(3) + terminal(5) + type(2) + number(10). */
export function formatDocumentConsecutive(
  branchCode: number,
  terminalCode: number,
  documentTypeCode: string,
  number: number,
): string {
  return (
    String(branchCode).padStart(3, "0") +
    String(terminalCode).padStart(5, "0") +
    documentTypeCode.padStart(2, "0") +
    String(number).padStart(10, "0")
  );
}
