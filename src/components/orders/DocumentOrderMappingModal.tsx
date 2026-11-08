import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Drawer, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrders } from "@/hooks/useOrders";
import {
  useDocumentOrderMappings,
  useResolveDocumentOrderMapping,
} from "@/hooks/useDocumentOrderMappings";
import { fmt } from "@/lib/utils";
import type { DocumentOrderMapping, OrderSuggestion } from "@/types/order";

const SEARCHABLE_STATUSES = ["pending", "processing", "shipped", "delivered"];

function scoreVariant(score: number): "success" | "warning" | "outline" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "outline";
}

function SuggestionRow({
  suggestion,
  selected,
  onSelect,
}: {
  suggestion: OrderSuggestion;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useLanguage();
  const differing = suggestion.matched_lines.filter((line) => !line.same_quantity).length;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
        selected ? "border-primary bg-primary/[0.06]" : "border-border hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-semibold">#{suggestion.order_document_number}</span>
        <Badge variant={scoreVariant(suggestion.score)}>
          {t("orders.mapping.score", { score: String(suggestion.score) })}
        </Badge>
      </div>
      <div className="t-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
        <span>{suggestion.delivery_date ?? suggestion.creation_date ?? "—"}</span>
        <span className="t-num">{fmt(suggestion.grand_total)}</span>
        <span>
          {t("orders.mapping.linesMatched", {
            matched: String(suggestion.matched_lines.length),
            total: String(suggestion.matched_lines.length + suggestion.unmatched_document_lines),
          })}
        </span>
        {differing > 0 && (
          <span className="text-warning">{t("orders.mapping.quantityDiffers", { n: String(differing) })}</span>
        )}
      </div>
    </button>
  );
}

/**
 * Map chain documents (Walmart) that arrived without their purchase-order
 * number to the order they bill. Suggestions come ranked from store-be by
 * matching lines and quantities, total and date; any of the customer's orders
 * can be searched and picked instead, or a new delivered order created.
 */
export function DocumentOrderMappingModal({
  orgId,
  open,
  onClose,
}: {
  orgId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { data: mappings = [] } = useDocumentOrderMappings(orgId);
  const { link, createOrder, dismiss } = useResolveDocumentOrderMapping(orgId);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const current: DocumentOrderMapping | undefined = mappings[Math.min(index, mappings.length - 1)];
  const searching = term.trim().length >= 2;
  const search = useOrders({
    orgId,
    filters: { textSearch: term.trim(), status: SEARCHABLE_STATUSES },
    pageSize: 8,
    enabled: open && searching,
  });
  const searchResults = useMemo(() => search.data?.data ?? [], [search.data]);

  useEffect(() => {
    setSelected(current?.suggestions[0]?.order_document_number ?? null);
    setTerm("");
    setError(null);
  }, [current?.document_id]);

  useEffect(() => {
    if (open && mappings.length === 0) onClose();
  }, [open, mappings.length, onClose]);

  if (!current) return null;
  const busy = link.isPending || createOrder.isPending || dismiss.isPending;
  const lines = current.order_block.lines ?? [];

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      setIndex((i) => Math.max(0, Math.min(i, mappings.length - 2)));
    } catch (e) {
      const status = (e as { status?: number })?.status;
      setError(t(status === 409 ? "orders.mapping.alreadyBilled" : "orders.mapping.error"));
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      closeLabel={t("common.close")}
      dismissible={!busy}
      width={760}
      icon="layers"
      title={t("orders.mapping.title")}
      subtitle={t("orders.mapping.progress", { n: String(index + 1), total: String(mappings.length) })}
      footer={
        <div className="flex flex-wrap gap-2.5 px-6 py-4 justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              {t("orders.mapping.later")}
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => dismiss.mutateAsync(current.document_id))}>
              {t("orders.mapping.dismiss")}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => createOrder.mutateAsync(current.document_id))}>
              {t("orders.mapping.createOrder")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={busy || !selected}
              onClick={() => run(() => link.mutateAsync({ documentId: current.document_id, orderNumber: selected! }))}
            >
              {t("orders.mapping.link")}
            </Button>
          </div>
        </div>
      }
    >
      <div className="px-6 py-5 space-y-5">
        <section>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <div className="t-label">{current.receiver_name ?? current.receiver_identification ?? "—"}</div>
              <div className="font-mono font-semibold">#{current.document_info.consecutive_number ?? "—"}</div>
            </div>
            <div className="text-right">
              <div className="t-xs text-muted-foreground">{current.document_info.issued_on?.slice(0, 10)}</div>
              <div className="t-stat t-num">{fmt(current.document_info.total_amount ?? current.order_block.grand_total ?? 0)}</div>
            </div>
          </div>
          <table className="w-full t-sm">
            <thead>
              <tr>
                <th className="pp-th text-left">{t("orders.mapping.line")}</th>
                <th className="pp-th text-right">{t("orders.mapping.quantity")}</th>
                <th className="pp-th text-right">{t("common.total")}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.line_number}>
                  <td className="pp-td">{line.description}</td>
                  <td className="pp-td text-right t-num">{line.quantity}</td>
                  <td className="pp-td text-right t-num">{fmt(line.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="label-section mb-2">{t("orders.mapping.suggestions")}</h3>
          <div className="space-y-2">
            {current.suggestions.map((suggestion) => (
              <SuggestionRow
                key={suggestion.order_document_number}
                suggestion={suggestion}
                selected={selected === suggestion.order_document_number}
                onSelect={() => setSelected(suggestion.order_document_number)}
              />
            ))}
            {current.suggestions.length === 0 && (
              <p className="t-sm text-muted-foreground">{t("orders.mapping.noSuggestions")}</p>
            )}
          </div>
        </section>

        <section>
          <label htmlFor="mapping-order-search" className="label-section block mb-2">
            {t("orders.mapping.searchLabel")}
          </label>
          <div className="relative">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="mapping-order-search"
              className="input input-sm w-full pl-8"
              value={term}
              placeholder={t("orders.mapping.searchPlaceholder")}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
          {searching && (
            <div className="mt-2 space-y-1.5">
              {searchResults.map((order) => (
                <button
                  key={order.order_id}
                  type="button"
                  aria-pressed={selected === order.document_number}
                  onClick={() => setSelected(order.document_number)}
                  className={`w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left ${
                    selected === order.document_number ? "border-primary bg-primary/[0.06]" : "border-border hover:bg-muted/40"
                  }`}
                >
                  <span className="font-mono">#{order.document_number}</span>
                  <span className="t-xs text-muted-foreground">
                    {order.document_id ? t("orders.mapping.billed") : (order.delivery_date ?? "")}
                  </span>
                  <span className="t-num t-sm">{fmt(order.grand_total)}</span>
                </button>
              ))}
              {!search.isLoading && searchResults.length === 0 && (
                <p className="t-sm text-muted-foreground">{t("common.noResults")}</p>
              )}
            </div>
          )}
        </section>

        {error && <p role="alert" className="t-sm text-destructive">{error}</p>}
      </div>
    </Drawer>
  );
}
