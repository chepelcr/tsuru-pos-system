import { Card, CardFooter, Icon, Badge, Menu } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { useUpdateClientStatus, clientDisplayName, formatPhone, type Client } from "@/hooks/useClients";
import { usePermissions } from "@/hooks/useRbac";
import { ID_TYPE_SHORT } from "@/lib/enums";
import { initials, avatarColor } from "@/utils/avatar";

interface ClientCardProps {
  client: Client;
  orgId: string;
  onNavigate: () => void;
  onEdit: (c: Client) => void;
  onToggleActive?: (client: Client, newStatus: number) => void;
  delay?: number;
}

export function ClientCard({ client, orgId, onNavigate, onEdit, onToggleActive, delay = 0 }: ClientCardProps) {
  const statusMutation = useUpdateClientStatus(orgId);

  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canUpdate = !permsReady || can("commercial", "update", "clients");
  const canDelete = !permsReady || can("commercial", "delete", "clients");

  const displayName = clientDisplayName(client);
  const [bg, fg] = avatarColor(displayName);
  const idShort = client.identification?.code ? ID_TYPE_SHORT[client.identification.code] : undefined;
  const phone = formatPhone(client.phone);
  const isActive = client.status === 1;

  const handleToggleStatus = () => {
    const newStatus = isActive ? 2 : 1;
    if (onToggleActive) {
      onToggleActive(client, newStatus);
    } else {
      statusMutation.mutate({ clientId: client.client_id, status: newStatus });
    }
  };

  return (
    <FadeIn delay={delay} duration={0.4}>
      <Card
        hoverable
        onClick={onNavigate}
        className="px-5 py-[18px] flex flex-col gap-3.5 cursor-pointer relative"
      >
        {/* Avatar + name + menu */}
        <div className="flex items-start gap-3">
          <div
            className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center text-[17px] font-extrabold font-display flex-shrink-0"
            style={{ background: bg, color: fg, boxShadow: `0 2px 8px ${bg}55` }}
          >
            {initials(displayName)}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="text-sm font-bold text-foreground whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
              {displayName}
            </div>
            {idShort && client.identification?.number ? (
              <div className="flex items-center gap-1 mt-1">
                <span className="bg-accent-rose-soft text-accent-rose border border-accent-rose-border px-1.5 py-px rounded-sm text-[10px] font-bold">
                  {idShort}
                </span>
                <span className="text-[11px] text-muted-foreground">{client.identification.number}</span>
              </div>
            ) : (
              <div className="mt-1">
                <Badge variant={isActive ? "success" : "secondary"} className="!text-[10px]">
                  {isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 -mt-0.5">
            <Menu
              align="right"
              items={[
                { label: "Ver perfil", icon: "user", action: onNavigate },
                { label: "Editar", icon: "edit", action: () => onEdit(client), hidden: !canUpdate },
                {
                  label: isActive ? "Desactivar" : "Activar",
                  icon: isActive ? "xCircle" : "checkCircle",
                  action: handleToggleStatus,
                  hidden: !canDelete,
                },
              ]}
            />
          </div>
        </div>

        {/* Contact info */}
        <div className="flex flex-col gap-[5px]">
          {client.email && (
            <div className="flex items-center gap-[7px] text-xs text-muted-foreground">
              <Icon name="mail" size={11} className="flex-shrink-0 text-accent-rose" />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">{client.email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-[7px] text-xs text-muted-foreground">
              <Icon name="smartphone" size={11} className="flex-shrink-0 text-accent-rose" />
              <span>{phone}</span>
            </div>
          )}
          {!client.email && !phone && (
            <div className="text-[11px] text-muted-foreground/50 italic">Sin datos de contacto</div>
          )}
        </div>

        {/* Footer */}
        <CardFooter className="flex items-center justify-between !px-0 !pt-2.5 !pb-0 border-t border-border -mx-px">
          <div className="flex items-center gap-[5px]">
            <span className={`w-[7px] h-[7px] rounded-full inline-block ${isActive ? "bg-success shadow-[0_0_5px_hsl(var(--success)/0.55)]" : "bg-muted-foreground"}`} />
            <span className="text-[11px] text-muted-foreground">{isActive ? "Activo" : "Inactivo"}</span>
          </div>
          <span className="text-xs text-accent-rose font-semibold flex items-center gap-[3px]">
            Ver perfil <Icon name="chevronRight" size={11} />
          </span>
        </CardFooter>
      </Card>
    </FadeIn>
  );
}
