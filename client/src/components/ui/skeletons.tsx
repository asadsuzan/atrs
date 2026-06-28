import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/* ─────────────────────────────────────────────
   SHARED PRIMITIVES
───────────────────────────────────────────── */

/** A shimmer Card that matches the stat-card style */
export function StatCardSkeleton() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent className="mt-auto space-y-1.5">
        <Skeleton className="h-8 w-14" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}

/** A shimmer table row */
export function TableRowSkeleton({ cols }: { cols: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

/** A shimmer card matching the Products grid card. */
export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-4 w-3/4 mt-3" />
      <div className="flex gap-2 mt-3">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="mt-4 border-t pt-3 flex items-center justify-between">
        <div className="flex gap-3"><Skeleton className="h-4 w-4 rounded" /><Skeleton className="h-4 w-4 rounded" /></div>
        <Skeleton className="h-7 w-14 rounded-md" />
      </div>
    </div>
  );
}

/** A shimmer card matching the Changelogs grid card. */
export function ChangelogCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-4 w-3/4 mt-3" />
      <Skeleton className="h-3 w-1/2 mt-2" />
      <div className="flex gap-2 mt-3">
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <div className="mt-4 border-t pt-3 flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-14 rounded-md" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GENERIC PAGE SKELETON (route-level fallback)
───────────────────────────────────────────── */

/** Neutral page placeholder used as the lazy-route Suspense fallback. */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-[160px] rounded-md" />
        <Skeleton className="h-9 w-[160px] rounded-md" />
      </div>
      <div className="border rounded-md bg-card p-4 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            <Skeleton className="h-4 w-[35%]" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Centered minimal skeleton used while auth resolves (no app chrome yet). */
export function AuthBootSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-7 w-24" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-9 w-full rounded-md mt-2" />
      </div>
    </div>
  );
}

/** Rows skeleton for the admin Users table. */
export function UsersTableSkeleton() {
  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-3 px-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </td>
              <td className="py-3 px-4"><Skeleton className="h-5 w-14 rounded-full" /></td>
              <td className="py-3 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
              <td className="py-3 px-4">
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-28 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD SKELETON
───────────────────────────────────────────── */

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Main content area */}
      <div className="grid gap-6 md:grid-cols-7">
        {/* Activity Feed */}
        <div className="md:col-span-4">
          <Card className="flex flex-col h-full max-h-[480px]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-44" />
              </div>
              <Skeleton className="h-3.5 w-64 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-3 rounded-lg border bg-card/50">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                      <Skeleton className="h-4 w-14 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="md:col-span-3 space-y-6">
          {/* Product Landscape Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-40" />
              </div>
              <Skeleton className="h-3.5 w-40 mt-1" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-14 w-14 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-card/50 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-10" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
            </CardContent>
          </Card>

          {/* Activity Distribution Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3.5 w-52 mt-1" />
            </CardHeader>
            <CardContent className="space-y-5">
              <Skeleton className="h-4 w-full rounded-full" />
              <div className="grid grid-cols-3 gap-2 text-center">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-4 w-14 mx-auto" />
                    <Skeleton className="h-3 w-16 mx-auto" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PRODUCTS TABLE SKELETON
───────────────────────────────────────────── */

export function ProductsTableSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-[180px] rounded-md" />
        <Skeleton className="h-9 w-[180px] rounded-md" />
      </div>

      {/* Table */}
      <div className="border rounded-md bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {['Icon', 'Name', 'Category', 'Status', 'Links', 'Actions'].map((h) => (
                <th key={h} className="p-4 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b">
                <td className="p-4"><Skeleton className="h-8 w-8 rounded-md" /></td>
                <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                <td className="p-4"><Skeleton className="h-5 w-14 rounded-full" /></td>
                <td className="p-4"><div className="flex gap-3"><Skeleton className="h-5 w-5 rounded" /><Skeleton className="h-5 w-5 rounded" /></div></td>
                <td className="p-4 text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ACTIVITIES TABLE SKELETON
───────────────────────────────────────────── */

export function ActivitiesTableSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-[180px] rounded-md" />
        ))}
        <div className="flex items-center gap-2 sm:ml-auto">
          <Skeleton className="h-9 w-[150px] rounded-md" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-9 w-[150px] rounded-md" />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {['Date', 'Product', 'Type', 'Title', 'Actions'].map((h) => (
                <th key={h} className="p-4 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b">
                <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                <td className="p-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PRODUCT DETAILS SKELETON
───────────────────────────────────────────── */

export function ProductDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back button */}
      <Skeleton className="h-9 w-36 rounded-md" />

      {/* Product hero card */}
      <div className="bg-card border rounded-lg overflow-hidden mb-8 shadow-sm">
        {/* Banner */}
        <Skeleton className="w-full h-[375px] rounded-none" />

        {/* Product info */}
        <div className="p-6 flex flex-col md:flex-row md:items-start gap-6">
          <Skeleton className="w-[100px] h-[100px] rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-3 mt-3 pt-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b mb-6 pb-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-7 w-32" />
      </div>

      {/* Activity sections */}
      {['Features', 'Improvements', 'Bug Fixes'].map((section) => (
        <div key={section} className="space-y-4 mb-8">
          <Skeleton className="h-7 w-32" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-32 w-full max-w-sm rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton for the activities list *within* ProductDetails (tab content only) */
export function ProductActivitiesSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, si) => (
        <div key={si} className="space-y-4 mb-8">
          <Skeleton className="h-7 w-32" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   REPORTS SKELETON
───────────────────────────────────────────── */

export function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Skeleton className="h-9 w-52" />

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border items-end">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1 flex-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Product report cards */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-40 mt-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-40" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden sm:flex gap-4">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="flex flex-col items-center gap-1">
                      <Skeleton className="h-5 w-8" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-5 w-5 rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   AUDIT LOG SKELETON
───────────────────────────────────────────── */

export function AuditLogSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border flex-wrap">
        <Skeleton className="h-9 w-[200px] rounded-md" />
        <Skeleton className="h-9 w-[160px] rounded-md" />
        <Skeleton className="h-9 w-[160px] rounded-md" />
        <Skeleton className="h-9 w-[140px] rounded-md" />
        <Skeleton className="h-9 w-[140px] rounded-md" />
      </div>

      <div className="border rounded-md bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {['Date & Time', 'Action', 'Entity Type', 'Entity Name', 'Details'].map((h) => (
                <th key={h} className="p-4 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b">
                <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                <td className="p-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                <td className="p-4"><Skeleton className="h-4 w-64" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}
