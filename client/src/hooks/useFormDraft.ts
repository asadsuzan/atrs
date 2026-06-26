import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { UseFormReturn, FieldValues } from 'react-hook-form';

interface FormDraftOptions<T extends FieldValues> {
  /** Unique storage key for this form instance, e.g. `draft:product:new`. Pass null to disable. */
  key: string | null;
  enabled?: boolean;
  /** Debounce for autosave writes. */
  debounceMs?: number;
  /** Fields to never persist (e.g. large/sensitive values). */
  exclude?: (keyof T)[];
}

/**
 * Browser-style form drafts for react-hook-form. While the user types, the
 * form's values are autosaved to localStorage (debounced); when they return,
 * the draft is silently re-filled and a small "Draft restored" note is shown.
 * Call the returned `clearDraft()` after a successful submit (or on cancel).
 *
 * Use a key that's unique per logical form: `draft:product:new` for a create
 * flow, `draft:product:<id>` for editing a specific entity.
 */
export function useFormDraft<T extends FieldValues>(
  form: UseFormReturn<T>,
  { key, enabled = true, debounceMs = 500, exclude = [] }: FormDraftOptions<T>,
) {
  const restoredRef = useRef(false);

  // Restore once on mount.
  useEffect(() => {
    if (!enabled || !key || restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
        // Merge over current defaults so missing fields keep their initial value.
        form.reset({ ...form.getValues(), ...saved } as T, { keepDefaultValues: true });
        toast('Draft restored', { description: 'Recovered your unsaved changes.' });
      }
    } catch {
      /* corrupt draft — ignore */
    }
    // We intentionally restore only on the first mount for this key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  // Autosave watched values (debounced).
  useEffect(() => {
    if (!enabled || !key) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = form.watch(values => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const data = { ...(values as Record<string, unknown>) };
          for (const k of exclude) delete data[k as string];
          localStorage.setItem(key, JSON.stringify(data));
        } catch {
          /* quota / private mode — ignore */
        }
      }, debounceMs);
    });
    return () => {
      sub.unsubscribe();
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, debounceMs]);

  const clearDraft = () => {
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  };

  return { clearDraft };
}
