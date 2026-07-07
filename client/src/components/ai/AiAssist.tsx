import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { suggestTitles, suggestDescription } from '../../services/ai';

const btnBase =
  'inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50 disabled:pointer-events-none';

/**
 * "✨ Suggest" for a title field. Fetches 3–5 options grounded in `getContext()`
 * (evaluated at click time so it sees the latest form state) and lets the user
 * pick one. Reusable across every ATRS form.
 */
export function SuggestTitleButton({
  entity,
  getContext,
  onPick,
  disabled,
  label = 'Suggest',
}: {
  entity: string;
  getContext: () => Record<string, any>;
  onPick: (title: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [titles, setTitles] = useState<string[]>([]);

  const fetchTitles = async () => {
    setLoading(true);
    try {
      const result = await suggestTitles(entity, getContext());
      setTitles(result);
      if (result.length === 0) toast.info('No suggestions — add a bit more detail and try again.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not get suggestions.');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => { setOpen(true); void fetchTitles(); }}
          className={btnBase}
          title="Suggest a title with AI"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1.5">
        <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center justify-between">
          <span>AI suggestions</span>
          <button
            type="button"
            onClick={() => void fetchTitles()}
            disabled={loading}
            className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
            title="Regenerate"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Regenerate
          </button>
        </div>
        {loading && titles.length === 0 ? (
          <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
          </div>
        ) : titles.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">No suggestions yet.</div>
        ) : (
          <ul className="max-h-64 overflow-y-auto">
            {titles.map((t, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => { onPick(t); setOpen(false); }}
                  className="w-full text-left rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors"
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * "✨ Generate" for a description field. Produces one paragraph from the current
 * context (and optional chosen title) and hands it back via `onResult`.
 */
export function GenerateDescriptionButton({
  entity,
  getContext,
  getTitle,
  onResult,
  disabled,
  label = 'Generate',
}: {
  entity: string;
  getContext: () => Record<string, any>;
  getTitle?: () => string | undefined;
  onResult: (text: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const text = await suggestDescription(entity, getContext(), getTitle?.());
      if (text) { onResult(text); toast.success('Description generated — edit as needed.'); }
      else toast.info('No description generated — add more detail and try again.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not generate a description.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" disabled={disabled || loading} onClick={() => void run()} className={btnBase} title="Generate a description with AI">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
