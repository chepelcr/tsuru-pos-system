import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ordersApi, ordersOrgPath } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/useRbac";
interface Proposal {
  id: string;
  quantity: string;
  offered_description: string;
  message: string;
  state: string;
  reply: string;
  version: number;
  shop_received: boolean;
}
export function BarterProposalsPanel({
  orgId,
  productId,
}: {
  orgId: string;
  productId: string;
}) {
  const { t } = useLanguage(),
    { can } = usePermissions();
  const canRead = can("commercial", "read", "orders"),
    canUpdate = can("commercial", "update", "orders");
  const [busy, setBusy] = useState(""),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<string | null>(null),
    [reply, setReply] = useState(""),
    [quantity, setQuantity] = useState("1"),
    [offered, setOffered] = useState("");
  const path = ordersOrgPath(orgId, "/customer-barter-proposals");
  const query = useQuery({
    queryKey: ["product-barter-proposals", orgId, productId, page],
    queryFn: () =>
      ordersApi.get<{ items: Proposal[] }>(
        `${path}?product=${encodeURIComponent(productId)}&page=${page}`,
      ),
    enabled: Boolean(orgId && productId && canRead),
  });
  useEffect(() => {
    setPage(1);
    setEditing(null);
    setError("");
  }, [orgId, productId]);
  const action = async (p: Proposal, name: string) => {
    setBusy(p.id);
    setError("");
    try {
      await ordersApi.post(`${path}/${p.id}/actions`, {
        action: name,
        expected_version: p.version,
        ...(name === "counter"
          ? { reply, quantity, offered_description: offered }
          : {}),
      });
      setEditing(null);
      await query.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("customerCommerce.failed"));
    } finally {
      setBusy("");
    }
  };
  if (!canRead) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-5 mt-4">
      <h2 className="text-base font-semibold">
        {t("customerCommerce.barterTitle")}
      </h2>
      {query.isPending ? (
        <p role="status" className="text-sm mt-3">
          {t("common.loading")}
        </p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-destructive mt-3">
          {t("customerCommerce.loadFailed")}
        </p>
      ) : !query.data.items.length ? (
        <p className="text-sm text-muted-foreground mt-3">
          {t("customerCommerce.noProposals")}
        </p>
      ) : (
        query.data.items.map((p) => (
          <article
            key={p.id}
            className="flex flex-col gap-3 py-4 border-t border-border mt-3"
          >
            <div className="flex justify-between flex-wrap gap-2">
              <strong className="text-sm">
                {t("customerCommerce.requestedQuantity")}: {p.quantity}
              </strong>
              <span className="text-xs text-muted-foreground">
                {t(`customerCommerce.barter.${p.state}`)}
              </span>
            </div>
            <p className="text-sm">
              <strong>{t("customerCommerce.offered")}:</strong>{" "}
              {p.offered_description}
            </p>
            {p.message && <p className="text-sm">{p.message}</p>}
            {p.reply && (
              <p className="text-sm text-muted-foreground">{p.reply}</p>
            )}
            {canUpdate && (
              <div className="flex flex-wrap gap-2">
                {p.state === "pending" && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy === p.id}
                    onClick={() => void action(p, "accept")}
                  >
                    {t("customerCommerce.accept")}
                  </button>
                )}
                {["pending", "countered"].includes(p.state) && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busy === p.id}
                      onClick={() => {
                        setEditing(p.id);
                        setQuantity(p.quantity);
                        setOffered(p.offered_description);
                        setReply("");
                      }}
                    >
                      {t("customerCommerce.counter")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy === p.id}
                      onClick={() => void action(p, "reject")}
                    >
                      {t("customerCommerce.reject")}
                    </button>
                  </>
                )}
                {p.state === "accepted" && !p.shop_received && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy === p.id}
                    onClick={() => void action(p, "received")}
                  >
                    {t("customerCommerce.received")}
                  </button>
                )}
              </div>
            )}
            {editing === p.id && (
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(p, "counter");
                }}
              >
                <label className="flex flex-col gap-1.5 text-sm">
                  {t("customerCommerce.requestedQuantity")}
                  <input
                    type="number"
                    className="pp-input"
                    min="0.00001"
                    step="0.00001"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  {t("customerCommerce.offered")}
                  <textarea
                    className="pp-input"
                    minLength={3}
                    required
                    maxLength={500}
                    value={offered}
                    onChange={(e) => setOffered(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  {t("customerCommerce.reply")}
                  <textarea
                    className="pp-input"
                    required
                    maxLength={500}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  {t("customerCommerce.counterHint")}
                </p>
                <button
                  className="btn btn-primary btn-sm self-start"
                  disabled={busy === p.id}
                >
                  {t("customerCommerce.sendCounter")}
                </button>
              </form>
            )}
          </article>
        ))
      )}
      {query.isSuccess && (page > 1 || query.data.items.length === 20) && (
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={page === 1 || Boolean(busy)}
            onClick={() => setPage((value) => value - 1)}
          >
            {t("common.previous")}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={query.data.items.length < 20 || Boolean(busy)}
            onClick={() => setPage((value) => value + 1)}
          >
            {t("common.next")}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive mt-3">
          {error}
        </p>
      )}
    </section>
  );
}
