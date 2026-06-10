import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, orgPath, crossAppApi, crossAppOrgPath, ordersApi, ordersOrgPath } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import type { Product } from "@/hooks/useProducts";
import type { BranchListResponse, Session } from "@/types";
import { Button } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import SessionTypeSelector from "@/components/session/SessionTypeSelector";
import SessionPreview from "@/components/session/SessionPreview";
import StationAssignments from "@/components/session/StationAssignments";
import InventoryTable from "@/components/session/InventoryTable";

// Types
interface Branch {
  branch_id: string;
  name: string;
  code: number;
  type: string;
  status: number;
  terminals?: Terminal[];
}

interface Terminal {
  terminal_id: string;
  name: string;
  code: number;
  branch_id: string;
  status: number;
}

interface Member {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

type SessionType = "partido" | "regular";
type Tab = "details" | "stations" | "inventory";
type Role = "cashier" | "supervisor";

interface AssignmentEntry {
  userId: string;
  role: Role;
  terminalId?: string;
}

interface StationAssignments {
  members: AssignmentEntry[];
}

interface SessionConfigProps {
  onDone?: () => void;
  onSuccess?: () => void;
  initialSession?: Session;
}

export default function SessionConfig({ onDone, onSuccess, initialSession }: SessionConfigProps) {
  const isEditMode = !!initialSession;
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("details");
  const [sessionType, setSessionType] = useState<SessionType>(
    initialSession?.type === "shift" ? "regular" : "partido"
  );
  const [rival, setRival] = useState(
    initialSession ? initialSession.name.replace(/^vs\s*/i, "") : ""
  );
  const [sessionTime, setSessionTime] = useState(
    initialSession ? new Date(initialSession.start_time).toTimeString().slice(0, 5) : "19:00"
  );
  const [sessionDate, setSessionDate] = useState(
    initialSession
      ? new Date(initialSession.start_time).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [expectedRevenue, setExpectedRevenue] = useState(
    initialSession?.expected_revenue ? String(initialSession.expected_revenue) : ""
  );
  const [activeBranches, setActiveBranches] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Record<string, StationAssignments>>({});
  const [inventory, setInventory] = useState<Record<string, Record<string, number>>>({});
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  const { data: branchesResponse } = useQuery({
    queryKey: ["branches", org?.id],
    enabled: !!user && !!org,
    queryFn: () =>
      crossAppApi.get<BranchListResponse>(crossAppOrgPath(org!.id, "/branches?page_size=100&search=status:1")),
  });

  const allBranches: Branch[] = branchesResponse?.data ?? [];
  const branches = allBranches.filter((b) =>
    sessionType === "partido" ? b.type === "stand" : b.type === "restaurant"
  );

  const { data: members = [] } = useQuery({
    queryKey: ["org-users", org?.id],
    enabled: !!user && !!org,
    queryFn: () => api.get<Member[]>(orgPath(user!.userId, org!.id, "/members")),
  });

  const { data: productsResponse } = useQuery({
    queryKey: ["products", org?.id],
    enabled: !!user && !!org,
    queryFn: () =>
      ordersApi.get<{ data: Product[] } | Product[]>(ordersOrgPath(org!.id, "/products")),
  });

  const products: Product[] = Array.isArray(productsResponse)
    ? productsResponse
    : (productsResponse as any)?.data ?? [];

  // Clear selections when session type changes
  useEffect(() => {
    setActiveBranches(new Set());
    setAssignments({});
    setInventory({});
  }, [sessionType]);

  const selectedBranches = branches.filter((b) => activeBranches.has(b.branch_id));
  const assigned = selectedBranches.filter((b) => assignments[b.branch_id]?.members?.length > 0).length;
  
  // Validation requirements
  const hasSelectedBranches = selectedBranches.length > 0;
  const allBranchesAssigned = assigned === selectedBranches.length;
  const hasDate = !!sessionDate;
  const hasProducts = selectedProducts.size > 0;
  
  const canActivate = hasSelectedBranches && allBranchesAssigned && hasDate && hasProducts;
  
  // Debug validation
  console.log('Session validation:', {
    hasSelectedBranches,
    allBranchesAssigned,
    hasDate,
    hasProducts,
    canActivate,
    selectedProductsCount: selectedProducts.size
  });

  // Helper functions
  const toggleBranch = (bid: string) =>
    setActiveBranches((prev) => {
      const next = new Set(prev);
      next.has(bid) ? next.delete(bid) : next.add(bid);
      return next;
    });

  const addMemberToStation = (branchId: string) => {
    setAssignments((prev) => ({
      ...prev,
      [branchId]: {
        members: [
          ...(prev[branchId]?.members || []),
          { userId: "", role: "cashier", terminalId: undefined },
        ],
      },
    }));
  };

  const removeMemberFromStation = (branchId: string, index: number) => {
    setAssignments((prev) => ({
      ...prev,
      [branchId]: {
        members: prev[branchId].members.filter((_, i) => i !== index),
      },
    }));
  };

  const updateMember = (
    branchId: string,
    index: number,
    field: keyof AssignmentEntry,
    value: string
  ) => {
    setAssignments((prev) => ({
      ...prev,
      [branchId]: {
        members: prev[branchId].members.map((m, i) =>
          i === index ? { ...m, [field]: value } : m
        ),
      },
    }));
  };

  const toggleProduct = (productId: string) => {
    // Handle select/deselect all
    if (productId === "__SELECT_ALL__") {
      setSelectedProducts(new Set(products.filter((p) => p.status === 1).map((p) => p.product_id)));
      return;
    }
    if (productId === "__DESELECT_ALL__") {
      setSelectedProducts(new Set());
      return;
    }

    // Toggle individual product
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  };

  // All userIds already assigned anywhere in this session (across all branches)
  const allAssignedUserIds = new Set(
    Object.values(assignments)
      .flatMap((s) => s.members.map((m) => m.userId))
      .filter(Boolean)
  );

  // Mutation — create or update depending on mode
  const mutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const start_time =
        sessionDate && sessionTime
          ? new Date(`${sessionDate}T${sessionTime}:00`).toISOString()
          : new Date().toISOString();

      if (isEditMode) {
        // PATCH: update editable fields only
        await crossAppApi.patch(
          crossAppOrgPath(org!.id, `/sessions/${initialSession!.session_id}`),
          {
            name: sessionType === "partido" ? `vs ${rival}` : "Operación regular",
            type: sessionType === "partido" ? "match" : "shift",
            context: sessionType === "partido" ? "gradas" : "caja",
            start_time,
            expected_revenue: expectedRevenue ? parseFloat(expectedRevenue) : undefined,
          }
        );
      } else {
        // POST: create session with assignments and products
        const assignmentsData = selectedBranches
          .filter((b) => assignments[b.branch_id]?.members?.length > 0)
          .flatMap((b) =>
            assignments[b.branch_id].members.map((member) => ({
              user_id: member.userId,
              branch_id: b.branch_id,
              terminal_id: member.terminalId,
              role: member.role ?? "cashier",
            }))
          );

        await crossAppApi.post(crossAppOrgPath(org!.id, "/sessions"), {
          name: sessionType === "partido" ? `vs ${rival}` : "Operación regular",
          type: sessionType === "partido" ? "match" : "shift",
          context: sessionType === "partido" ? "gradas" : "caja",
          start_time,
          product_ids: selectedProducts.size > 0 ? Array.from(selectedProducts) : undefined,
          assignments: assignmentsData,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard", org?.id] });
      qc.invalidateQueries({ queryKey: ["sessions", org?.id] });
      onDone?.();
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message || t("common.error"));
    },
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed Header */}
      <div className="px-6 py-5 border-b border-border flex-shrink-0">
        <h2 className="t-h2 mb-1.5">
          {isEditMode ? "Editar sesión" : t("session.title")}
        </h2>
        <p className="t-sm text-muted-foreground">
          {isEditMode ? "Modifica los detalles de la sesión activa." : t("session.subtitle")}
        </p>
        {error && (
          <div className="mt-3 px-3.5 py-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-[13px]">
            {error}
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Tabs — edit mode only shows details */}
        <div className="tabs mb-5">
          <button className="tab" aria-selected={tab === "details"} onClick={() => setTab("details")}>
            {t("session.tabMatch")}
          </button>
          <button className="tab" aria-selected={tab === "stations"} onClick={() => setTab("stations")}>
            {t("session.tabStations")}
          </button>
          <button className="tab" aria-selected={tab === "inventory"} onClick={() => setTab("inventory")}>
            {t("session.tabInventory")}
          </button>
        </div>

        {/* Tab Content */}
        {tab === "details" && (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
            <div>
              <SessionTypeSelector
                sessionType={sessionType}
                setSessionType={setSessionType}
                rival={rival}
                setRival={setRival}
                sessionTime={sessionTime}
                setSessionTime={setSessionTime}
                sessionDate={sessionDate}
                setSessionDate={setSessionDate}
              />
              <div className="mt-3.5">
                <label className="label">Meta de ventas (opcional)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="500"
                  value={expectedRevenue}
                  onChange={(e) => setExpectedRevenue(e.target.value)}
                  placeholder="₡ 0"
                />
              </div>
            </div>
            {!isEditMode && (
              <SessionPreview
                sessionType={sessionType}
                rival={rival}
                sessionDate={sessionDate}
                sessionTime={sessionTime}
                selectedBranchesCount={selectedBranches.length}
                assignedCount={assigned}
              />
            )}
          </div>
        )}

        {tab === "stations" && (
          <StationAssignments
            branches={branches}
            activeBranches={activeBranches}
            toggleBranch={toggleBranch}
            selectedBranches={selectedBranches}
            assignments={assignments}
            members={members}
            allAssignedUserIds={allAssignedUserIds}
            assigned={assigned}
            addMemberToStation={addMemberToStation}
            removeMemberFromStation={removeMemberFromStation}
            updateMember={updateMember}
          />
        )}

        {tab === "inventory" && (
          <InventoryTable
            products={products}
            selectedBranches={selectedBranches}
            selectedProducts={selectedProducts}
            inventory={inventory}
            toggleProduct={toggleProduct}
            setInventory={setInventory}
          />
        )}
      </div>

      {/* Fixed Footer */}
      <div className="px-6 py-4 border-t border-border flex-shrink-0 bg-card">
        {!isEditMode && !canActivate && (
          <div className="mb-3 px-3.5 py-2.5 bg-muted/50 border border-border rounded-md text-xs text-muted-foreground">
            {t("session.requiredSteps")}:
            <ul className="mt-1.5 pl-5">
              {!hasSelectedBranches && <li>{t("session.selectBranches")}</li>}
              {hasSelectedBranches && !allBranchesAssigned && <li>{t("session.assignMembers")}</li>}
              {!hasDate && <li>{t("session.selectDate")}</li>}
              {!hasProducts && <li>{t("session.selectProducts")}</li>}
            </ul>
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          icon="check"
          disabled={(!isEditMode && !canActivate) || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="w-full"
        >
          {mutation.isPending
            ? (isEditMode ? "Guardando…" : t("session.activating"))
            : (isEditMode ? "Guardar cambios" : t("session.activate"))
          }
        </Button>
      </div>
    </div>
  );
}
