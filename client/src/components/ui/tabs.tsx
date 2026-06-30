import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Minimal controlled tabs (no external dep). Mirrors the shadcn API surface
 * (Tabs / TabsList / TabsTrigger / TabsContent) closely enough to feel native.
 */
interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
}
const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('Tabs.* must be used within <Tabs>');
  return ctx;
}

export function Tabs({
  value,
  onValueChange,
  className,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <TabsContext.Provider value={{ value, setValue: onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('inline-flex w-full items-center gap-1 rounded-lg bg-muted p-1', className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  title,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  const { value: active, setValue } = useTabs();
  const isActive = active === value;
  return (
    <button
      type="button"
      title={title}
      onClick={() => setValue(value)}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { value: active } = useTabs();
  if (active !== value) return null;
  return <div className={className}>{children}</div>;
}
