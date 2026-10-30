import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ordersApi, ordersOrgPath } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
interface Proof {
  id: string;
  filename: string;
  state: string;
  reason: string | null;
  version: number;
}
export function CustomerPaymentsPanel({
  orgId,
  orderId,
  canReview,
}: {
  orgId: string;
  orderId: number;
  canReview: boolean;
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(""),
    [reason, setReason] = useState<Record<string, string>>({}),
    [error, setError] = useState("");
  const path = ordersOrgPath(
    orgId,
    `/customer-orders/${orderId}/payment-submissions`,
  );
  const query = useQuery({
    queryKey: ["customer-payments", orgId, orderId],
    queryFn: () =>
      ordersApi.get<{ proofs: Proof[]; payment_state: string }>(path),
    enabled: Boolean(orgId && orderId),
  });
  const action = async (proof: Proof, state: string) => {
    setBusy(proof.id);
    setError("");
    try {
      await ordersApi.post(`${path}/${proof.id}/review`, {
        state,
        reason: reason[proof.id] || "",
        expected_version: proof.version,
      });
      await query.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("customerCommerce.failed"));
    } finally {
      setBusy("");
    }
  };
  const download = async (id: string) => {
    setError("");
    try {
      const result = await ordersApi.get<{ url: string }>(
        `${path}/${id}/download`,
      );
      if (new URL(result.url).protocol !== "https:")
        throw Error(t("customerCommerce.failed"));
      window.location.assign(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("customerCommerce.failed"));
    }
  };
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold">
        {t("customerCommerce.paymentsTitle")}
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        {t("customerCommerce.paymentsHint")}
      </p>
      {query.isPending ? (
        <p role="status" className="text-sm mt-3">
          {t("common.loading")}
        </p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-destructive mt-3">
          {t("customerCommerce.loadFailed")}
        </p>
      ) : !query.data.proofs.length ? (
        <p className="text-sm text-muted-foreground mt-3">
          {t("customerCommerce.noProofs")}
        </p>
      ) : (
        query.data.proofs.map((proof) => (
          <article
            key={proof.id}
            className="flex flex-col gap-3 border-t border-border py-4 mt-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <strong className="text-sm break-all">{proof.filename}</strong>
              <span className="text-xs text-muted-foreground">
                {t(`customerCommerce.${proof.state}`)}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void download(proof.id)}
              >
                {t("customerCommerce.download")}
              </button>
            </div>
            {proof.reason && <p className="text-sm">{proof.reason}</p>}
            {canReview && proof.state === "pending_review" && (
              <>
                <label className="flex flex-col gap-1.5 text-sm">
                  {t("customerCommerce.correctionReason")}
                  <textarea
                    className="pp-input"
                    maxLength={500}
                    value={reason[proof.id] || ""}
                    onChange={(e) =>
                      setReason((r) => ({ ...r, [proof.id]: e.target.value }))
                    }
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary btn-sm"
                    type="button"
                    disabled={busy === proof.id}
                    onClick={() => void action(proof, "confirmed")}
                  >
                    {t("customerCommerce.confirmPayment")}
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    disabled={busy === proof.id || !reason[proof.id]?.trim()}
                    onClick={() => void action(proof, "correction_requested")}
                  >
                    {t("customerCommerce.requestCorrection")}
                  </button>
                </div>
              </>
            )}
          </article>
        ))
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive mt-3">
          {error}
        </p>
      )}
    </section>
  );
}
