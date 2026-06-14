import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeployments } from "@/hooks/useDeployments";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { DeploymentPendingCard } from "@/components/cms/DeploymentPendingCard";
import { DeploymentHistoryCard } from "@/components/cms/DeploymentHistoryCard";

type DeploymentsTab = "pending" | "history";

/**
 * Deployments / publish pipeline page — POS parity with the dashboard's
 * `DeploymentHistory`. Two tabs (Pending / History) using the POS `.tabs`/`.tab`
 * classes, the publish action, and 5s live polling of the history feed via
 * {@link useDeployments} (refetchInterval). Publishing switches to the History
 * tab and shows an inline success banner — POS has no toast (migration 04 §7).
 *
 * Zero burned styles: status colours route through `DeploymentStatusBadge`
 * design-system tokens; layout uses `.card`/`.tabs`/`EmptyState`/`Spinner`.
 */
export default function DeploymentsPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  usePageTitle([t("deployments.history.title")]);

  const { preDeployments, deployments, publish } = useDeployments(
    user?.userId,
    org?.id
  );

  const [activeTab, setActiveTab] = useState<DeploymentsTab>("pending");
  const [published, setPublished] = useState(false);

  // Clear the inline success banner whenever the user navigates tabs.
  useEffect(() => {
    if (activeTab === "pending") setPublished(false);
  }, [activeTab]);

  const pending = preDeployments.data?.[0];

  const handlePublish = () => {
    if (!pending) return;
    publish.mutate(pending.id, {
      onSuccess: () => {
        setPublished(true);
        setActiveTab("history");
      },
    });
  };

  const isLoading = preDeployments.isLoading || deployments.isLoading;

  const sortedDeployments = [...(deployments.data ?? [])].sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  return (
    <div className="px-6 pt-6 pb-10 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="t-h1 mb-1.5">{t("deployments.history.title")}</h1>
        <p className="t-body text-muted-foreground">
          {t("deployments.subtitle")}
        </p>
      </div>

      {/* Inline feedback (no toast in POS — §7) */}
      {published && (
        <div className="mb-4 px-3 py-2.5 rounded-md bg-success/[0.08] border border-success/30 text-success t-sm">
          {t("deployments.publishSuccessDescription")}
        </div>
      )}
      {publish.isError && (
        <div className="mb-4 px-3 py-2.5 rounded-md bg-destructive/[0.08] border border-destructive/30 text-destructive t-sm">
          {t("deployments.publishError")}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container mb-5">
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={activeTab === "pending"}
            onClick={() => setActiveTab("pending")}
          >
            {t("deployments.tabs.pending")}
          </button>
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={activeTab === "history"}
            onClick={() => setActiveTab("history")}
          >
            {t("deployments.tabs.history")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-5 flex flex-col gap-4">
              {/* Header: icon pill + build id + status badge */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 flex-shrink-0 rounded-md bg-muted/40 animate-pulse" />
                  <span className="skeleton-block animate-pulse h-4 w-32 rounded" />
                </div>
                <span className="skeleton-block animate-pulse h-5 w-20 rounded-full" />
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j}>
                    <span className="skeleton-block animate-pulse h-3 w-16 rounded mb-1.5 block" />
                    <span className="skeleton-block animate-pulse h-4 w-24 rounded block" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === "pending" ? (
        <FadeIn key="pending">
          {pending ? (
            <DeploymentPendingCard
              preDeployment={pending}
              publishing={publish.isPending}
              onPublish={handlePublish}
            />
          ) : (
            <EmptyState
              icon="calendar"
              title={t("deployments.pending.noChanges")}
              description={t("deployments.pending.noChangesDescription")}
            />
          )}
        </FadeIn>
      ) : (
        <FadeIn key="history">
          {sortedDeployments.length === 0 ? (
            <EmptyState
              icon="calendar"
              title={t("deployments.history.noDeployments")}
              description={t("deployments.history.noDeploymentsDescription")}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {sortedDeployments.map((deployment) => (
                <DeploymentHistoryCard
                  key={deployment.id}
                  deployment={deployment}
                />
              ))}
            </div>
          )}
        </FadeIn>
      )}
    </div>
  );
}
