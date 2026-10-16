import { useState } from "react";
import { Badge, Button, Card, Drawer, EmptyState, FormLabel, Icon, Input, Modal, Select, SelectField, Spinner } from "@/components/ui";
import { BRANCH_TYPE_ICONS } from "@/config/branchTypeIcons";
import { ErrorBox } from "@/components/feedback/ErrorBox";
import { SearchInput } from "@/components/forms/SearchInput";
import { useOrgContext } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/useRbac";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBranchTypes, useDeleteBranchType, useSaveBranchType } from "@/hooks/useBranchTypes";
import type { BranchTypeOption } from "@/types/branch";

export default function BranchTypesPage() {
  const { orgId } = useOrgContext();
  return <BranchTypesContent key={orgId} orgId={orgId} />;
}

function BranchTypesContent({ orgId }: { orgId: string }) {
  const { t } = useLanguage();
  const { can } = usePermissions();
  const query = useBranchTypes(orgId);
  const remove = useDeleteBranchType(orgId);
  const [deleteTarget, setDeleteTarget] = useState<BranchTypeOption | null>(null);
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<BranchTypeOption | "new" | null>(null);
  usePageTitle([t("branchTypes.title")]);
  const canCreate = can("admin", "create", "branch-types");
  const canUpdate = can("admin", "update", "branch-types");
  const canDelete = can("admin", "delete", "branch-types");
  const term = search.trim().toLocaleLowerCase();
  const rows = (query.data ?? []).filter((row) => `${row.name} ${row.code}`.toLocaleLowerCase().includes(term));

  const deleteType = (row: BranchTypeOption) => {
    remove.reset();
    setDeleteTarget(row);
  };

  return (
    <div className="px-6 pt-6 pb-10 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <div>
          <h1 className="t-h1 mb-1">{t("branchTypes.title")}</h1>
          <p className="t-body text-muted-foreground">{t("branchTypes.subtitle")}</p>
        </div>
        {canCreate && <Button size="sm" icon="plus" onClick={() => setTarget("new")}>{t("branchTypes.new")}</Button>}
      </div>
      <div className="max-w-md mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder={t("puestos.searchPlaceholder")} />
      </div>
      {query.isLoading ? <div className="p-10 flex justify-center" role="status" aria-label={t("common.loading")}><Spinner /></div> : query.isError ? (
        <EmptyState icon="alertCircle" title={t("branchTypes.loadError")} description=""
          action={<Button variant="outline" onClick={() => query.refetch()}>{t("common.retry")}</Button>} />
      ) : rows.length === 0 ? (
        <EmptyState icon="layers" title={t(term ? "common.noResults" : "branchTypes.empty")}
          description={term ? "" : t("branchTypes.emptyDescription")}
          action={!term && canCreate ? <Button size="sm" icon="plus" onClick={() => setTarget("new")}>{t("branchTypes.new")}</Button> : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((row) => (
            <Card key={row.id} className="p-5 flex flex-col gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name={row.icon || "store"} size={20} className="shrink-0 text-primary" />
                <h2 className="font-display font-bold text-lg break-words">{row.name}</h2>
              </div>
              {row.is_default && <div><Badge variant="secondary">{t("branchTypes.default")}</Badge></div>}
              <p className="t-sm text-muted-foreground break-words">{t("branchTypes.code")}: <span className="font-mono">{row.code}</span></p>
              <p className="t-sm text-muted-foreground">{t("branchTypes.order")}: {row.sort_order}</p>
              {(canUpdate || canDelete) && <div className="flex flex-wrap gap-2 mt-auto pt-2">
                {canUpdate && <Button size="sm" variant="outline" icon="edit" onClick={() => setTarget(row)}>{t("common.edit")}</Button>}
                {canDelete && !row.is_default && <Button size="sm" variant="destructive" icon="trash" disabled={remove.isPending} onClick={() => deleteType(row)}>{t("common.delete")}</Button>}
              </div>}
            </Card>
          ))}
        </div>
      )}
      {target !== null && <BranchTypeEditor key={`${orgId}:${target === "new" ? "new" : target.id}`} orgId={orgId}
        value={target === "new" ? undefined : target} onClose={() => setTarget(null)} />}
      <Modal open={!!deleteTarget} onClose={() => { if (!remove.isPending) setDeleteTarget(null); }}
        title={t("common.delete")} variant="destructive"
        description={t("branchTypes.deleteConfirm", { name: deleteTarget?.name ?? "" })}
        cancel={{ label: t("common.cancel"), disabled: remove.isPending, onClick: () => setDeleteTarget(null) }}
        confirm={{ label: t("common.delete"), variant: "destructive", loading: remove.isPending, disabled: remove.isPending,
          onClick: async () => {
            if (!canDelete || !deleteTarget || remove.isPending) return;
            try { await remove.mutateAsync(deleteTarget.id); setDeleteTarget(null); }
            catch { /* Keep the confirmation open and show the server's conflict message. */ }
          } }}>
        {remove.isError && <div role="alert"><ErrorBox message={remove.error.message} /></div>}
      </Modal>
    </div>
  );
}

function BranchTypeEditor({ orgId, value, onClose }: { orgId: string; value?: BranchTypeOption; onClose: () => void }) {
  const { t } = useLanguage();
  const { can } = usePermissions();
  const save = useSaveBranchType(orgId);
  const [name, setName] = useState(value?.name ?? "");
  const [code, setCode] = useState(value?.code ?? "");
  const [order, setOrder] = useState(value?.sort_order ?? 0);
  const [icon, setIcon] = useState(value?.icon ?? "store");
  const [color, setColor] = useState(value?.color ?? "primary");
  const canSave = can("admin", value ? "update" : "create", "branch-types");
  const iconOptions = BRANCH_TYPE_ICONS.map((key) => ({ value: key as string, label: t(`branchTypes.icon.${key}`), icon: key as string }));
  if (!iconOptions.some((option) => option.value === icon)) iconOptions.unshift({ value: icon, label: icon, icon });
  return (
    <Drawer open onClose={onClose} dismissible={!save.isPending} closeLabel={t("common.close")}
      title={t(value ? "branchTypes.edit" : "branchTypes.new")} icon="layers" width={480}
      footer={<div className="flex gap-2.5 px-6 py-4 justify-end">
        <Button variant="outline" size="sm" disabled={save.isPending} onClick={onClose}>{t("common.cancel")}</Button>
        {canSave && <Button type="submit" form="branch-type-form" size="sm" disabled={save.isPending}>
          {t(save.isPending ? "common.saving" : "common.save")}
        </Button>}
      </div>}>
      <form id="branch-type-form" className="p-6 flex flex-col gap-4" onSubmit={async (event) => {
        event.preventDefault();
        if (!canSave || save.isPending || !name.trim()) return;
        try {
          await save.mutateAsync({ id: value?.id, body: { name: name.trim(), code: code.trim().toLowerCase(), sort_order: order, icon, color } });
          onClose();
        } catch { /* The mutation error is displayed below; retain the user's fields. */ }
      }}>
        <div><FormLabel htmlFor="bt-name" required>{t("common.name")}</FormLabel>
          <Input id="bt-name" autoFocus required pattern={".*\\S.*"} maxLength={255} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><FormLabel htmlFor="bt-code" required>{t("branchTypes.code")}</FormLabel>
          <Input id="bt-code" required maxLength={50} pattern="[a-z0-9][a-z0-9_-]*" disabled={!!value} value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())} aria-describedby="bt-code-hint" />
          <p id="bt-code-hint" className="t-xs mt-1 text-muted-foreground">{t(value ? "branchTypes.codeImmutable" : "branchTypes.codeHint")}</p></div>
        <div><FormLabel htmlFor="bt-order">{t("branchTypes.order")}</FormLabel>
          <Input id="bt-order" type="number" required min={0} step={1} value={order} onChange={(e) => setOrder(Number(e.target.value))} /></div>
        <div><FormLabel htmlFor="bt-icon">{t("branchTypes.icon")}</FormLabel>
          <SelectField id="bt-icon" value={icon} onChange={setIcon} options={iconOptions} /></div>
        <div><FormLabel htmlFor="bt-color">{t("branchTypes.color")}</FormLabel>
          <Select id="bt-color" value={color} onChange={(e) => setColor(e.target.value)}>
            {!["primary", "info"].includes(color) && <option value={color}>{color}</option>}
            <option value="primary">{t("branchTypes.color.primary")}</option><option value="info">{t("branchTypes.color.info")}</option>
          </Select></div>
        {save.isError && <div role="alert"><ErrorBox message={save.error.message} /></div>}
      </form>
    </Drawer>
  );
}
