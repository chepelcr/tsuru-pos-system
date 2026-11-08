import { useEffect, useRef } from "react";
import { create } from "zustand";
import { useQueryClient } from "@tanstack/react-query";
import { useDocumentImport } from "@/hooks/useDocumentImport";
import { useDocumentOrderMappings } from "@/hooks/useDocumentOrderMappings";
import { DocumentOrderMappingModal } from "./DocumentOrderMappingModal";

interface MappingModalState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

/** Lets the Orders page banner open the same modal the import flow opens. */
export const useDocumentOrderMappingModal = create<MappingModalState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

/**
 * Mounted once in the dashboard layout. When an XML import batch finishes, the
 * verdicts still travel validator → SNS → store-be before a chain document
 * without its purchase order lands in the pending list, so the list is
 * re-read once shortly after and the modal opens if anything needs mapping.
 */
export function DocumentOrderMappingPrompt({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { started, settled } = useDocumentImport();
  const finished = started > 0 && settled === started;
  const { data: mappings = [] } = useDocumentOrderMappings(orgId);
  const { open, setOpen } = useDocumentOrderMappingModal();
  const armed = useRef(false);
  const wasFinished = useRef(finished);

  useEffect(() => {
    if (finished && !wasFinished.current) {
      armed.current = true;
      const timer = window.setTimeout(
        () => qc.invalidateQueries({ queryKey: ["document-order-mappings", orgId] }),
        8_000,
      );
      wasFinished.current = finished;
      return () => window.clearTimeout(timer);
    }
    wasFinished.current = finished;
    return undefined;
  }, [finished, orgId, qc]);

  useEffect(() => {
    if (armed.current && mappings.length > 0) {
      armed.current = false;
      setOpen(true);
    }
  }, [mappings.length, setOpen]);

  return <DocumentOrderMappingModal orgId={orgId} open={open} onClose={() => setOpen(false)} />;
}
