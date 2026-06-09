import { Button } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { clientDisplayName, formatPhone, type Client } from "@/hooks/useClients";
import { generateWhatsAppMessage, openWhatsApp } from "@/lib/whatsapp";

interface ClientWhatsAppButtonProps {
  client: Client;
}

/**
 * "WhatsApp" hero action — composes a localized contact message and opens
 * `wa.me/{phone}`. The message body is built from `t()` keys (CLAUDE.md §10;
 * the dashboard hard-coded Spanish, which is forbidden here).
 *
 * This contact composer carries no cart items; the per-product line template is
 * still supplied so the same helper can be reused by the POS checkout flow.
 */
export function ClientWhatsAppButton({ client }: ClientWhatsAppButtonProps) {
  const { t } = useLanguage();
  const phone = formatPhone(client.phone);
  const name = clientDisplayName(client);

  const handleClick = () => {
    const message = generateWhatsAppMessage([], {
      greeting: t("clients.whatsapp.greeting"),
      clientHeader: t("clients.whatsapp.clientHeader"),
      clientName: t("clients.whatsapp.clientName", { name }),
      clientPhone: t("clients.whatsapp.clientPhone", { phone: phone || t("clients.whatsapp.noPhone") }),
      productsHeader: t("clients.whatsapp.productsHeader"),
      productLine: (item, amount) =>
        t("clients.whatsapp.productLine", {
          name: item.name,
          quantity: String(item.quantity),
          amount,
        }),
      total: t("clients.whatsapp.total", { total: "0" }),
    });
    openWhatsApp(phone, message);
  };

  if (!phone) return null;

  return (
    <Button variant="success" size="sm" icon="smartphone" onClick={handleClick}>
      {t("clients.whatsapp.send")}
    </Button>
  );
}
