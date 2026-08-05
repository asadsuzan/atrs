import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompetitorDiscovery } from './CompetitorDiscovery';
import { CompetitorMatrix } from './CompetitorMatrix';
import { CompetitorManagement } from './CompetitorManagement';
import { FeatureGapMatrix } from './FeatureGapMatrix';

/**
 * "How do I compare?"
 *
 * Four competitor panels used to stack into one very long page. The head-to-head
 * numbers are what a user came for, so those lead; the interpretation, the tracking
 * list and discovery all collapse below it.
 *
 * Ordering follows how often each is needed: read the numbers often, read the analysis
 * sometimes, edit the tracked list rarely, run discovery once.
 */

function Section({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <span className="font-medium text-slate-800 dark:text-slate-100">{title}</span>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-border/60 p-4">{children}</div>}
    </div>
  );
}

export function CompetitorsView({ productId }: { productId: string }) {
  return (
    <div className="space-y-4">
      {/* Not wrapped in a collapsible: the live comparison table is the reason this tab
          exists, and hiding it behind a click would be hiding the answer. */}
      <CompetitorMatrix productId={productId} />

      <Section
        title="What the comparison means"
        description="Positioning, capability gaps and recommended moves"
      >
        <FeatureGapMatrix productId={productId} />
      </Section>

      <Section title="Tracked competitors" description="Add, edit or remove the plugins you compare against">
        <CompetitorManagement productId={productId} />
      </Section>

      <Section title="Find more competitors" description="Search WordPress.org for plugins competing on your terms">
        <CompetitorDiscovery productId={productId} />
      </Section>
    </div>
  );
}
