import { useState, useCallback } from "react";
import { Modal } from "@/components/ui";

export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive" | "success" | "warning";
  icon?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmModalState extends ConfirmModalOptions {
  open: boolean;
  loading: boolean;
}

/**
 * Hook for managing confirmation modals
 * 
 * @example
 * ```tsx
 * const { confirm, ConfirmModal } = useConfirmModal();
 * 
 * const handleDelete = () => {
 *   confirm({
 *     title: "Delete Product",
 *     message: "Are you sure you want to delete this product?",
 *     variant: "destructive",
 *     onConfirm: async () => {
 *       await deleteProduct(id);
 *     },
 *   });
 * };
 * 
 * return (
 *   <>
 *     <button onClick={handleDelete}>Delete</button>
 *     <ConfirmModal />
 *   </>
 * );
 * ```
 */
export function useConfirmModal() {
  const [state, setState] = useState<ConfirmModalState>({
    open: false,
    loading: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    variant: "default",
    onConfirm: () => {},
  });

  const confirm = useCallback((options: ConfirmModalOptions) => {
    setState({
      open: true,
      loading: false,
      confirmLabel: "Confirm",
      cancelLabel: "Cancel",
      variant: "default",
      ...options,
    });
  }, []);

  const handleClose = useCallback(() => {
    if (state.loading) return; // Prevent closing while loading
    setState((prev) => ({ ...prev, open: false }));
    state.onCancel?.();
  }, [state.loading, state.onCancel]);

  const handleConfirm = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      await state.onConfirm();
      setState((prev) => ({ ...prev, open: false, loading: false }));
    } catch (error) {
      console.error("Confirmation action failed:", error);
      setState((prev) => ({ ...prev, loading: false }));
      // Keep modal open on error so user can retry or cancel
    }
  }, [state.onConfirm]);

  const ConfirmModal = useCallback(() => {
    if (!state.open) return null;

    return (
      <Modal
        open={state.open}
        onClose={handleClose}
        title={state.title}
        description={state.message}
        variant={state.variant}
        icon={state.icon}
        confirm={{
          label: state.confirmLabel || "Confirm",
          onClick: handleConfirm,
          variant: state.variant === "destructive" ? "destructive" : "primary",
          loading: state.loading,
          disabled: state.loading,
        }}
        cancel={{
          label: state.cancelLabel || "Cancel",
          onClick: handleClose,
          variant: "outline",
          disabled: state.loading,
        }}
      />
    );
  }, [state, handleClose, handleConfirm]);

  return {
    confirm,
    ConfirmModal,
    isOpen: state.open,
    isLoading: state.loading,
  };
}
