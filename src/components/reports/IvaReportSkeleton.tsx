import { Card } from "@/components/ui";

/** Loading placeholder mirroring the report's stat row + three section cards. */
export function IvaReportSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="skeleton-block-dim h-3 w-24 mb-3" />
            <div className="skeleton-block h-7 w-32" />
          </Card>
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-5">
          <div className="skeleton-block h-4 w-40 mb-4" />
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 5 }).map((__, r) => (
              <div key={r} className="skeleton-block-dim h-3.5 w-full" />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
