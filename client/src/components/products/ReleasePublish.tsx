import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Rocket, Copy, Check, Download, Globe, ExternalLink, FileText, FileCode2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getProductRelease, type ReleaseType, type ReleaseBlock } from '../../services/release';
import { updateProduct } from '../../services/products';
import { playSound } from '@/lib/sound';
import { VersionBadge } from '../versions/VersionBadge';

const TYPE_META: Record<ReleaseType, { label: string; cls: string }> = {
  feature: { label: 'Features', cls: 'text-blue-600 dark:text-blue-400' },
  improvement: { label: 'Improvements', cls: 'text-purple-600 dark:text-purple-400' },
  'bug-fix': { label: 'Bug Fixes', cls: 'text-red-600 dark:text-red-400' },
};
const TYPE_ORDER: ReleaseType[] = ['feature', 'improvement', 'bug-fix'];

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Read-only export panel with a copy button (and optional download). */
function ExportBox({ title, icon: Icon, value, download }: { title: string; icon: any; value: string; download?: { filename: string } }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      playSound('click');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };
  const doDownload = () => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = download!.filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
        <span className="text-sm font-medium flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" /> {title}</span>
        <div className="flex items-center gap-1">
          {download && (
            <Button variant="ghost" size="sm" onClick={doDownload} title="Download">
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={copy}>
            {copied ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </Button>
        </div>
      </div>
      <textarea
        readOnly
        value={value}
        spellCheck={false}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full h-64 resize-y bg-transparent p-4 font-mono text-xs leading-relaxed outline-none custom-scrollbar"
      />
    </div>
  );
}

function ReleaseBlockView({ block }: { block: ReleaseBlock }) {
  const date = fmtDate(block.releasedAt);
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-lg font-semibold tracking-tight">{block.label}</h4>
          {block.unreleased && block.label !== 'Unreleased' && <VersionBadge kind="unreleased" />}
        </div>
        {date
          ? <span className="text-xs text-muted-foreground shrink-0">{date}</span>
          : block.unreleased && <span className="text-xs text-muted-foreground shrink-0">Not yet released</span>}
      </div>
      {block.notes && <p className="text-sm text-muted-foreground mb-3">{block.notes}</p>}
      <div className="space-y-3">
        {TYPE_ORDER.map((t) => {
          const items = block.groups[t];
          if (!items || items.length === 0) return null;
          return (
            <div key={t}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${TYPE_META[t].cls}`}>{TYPE_META[t].label}</p>
              <ul className="space-y-1">
                {items.map((it, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_META[t].cls.replace('text-', 'bg-')}`} />
                    <span>
                      <span className="text-foreground">{it.title}</span>
                      {it.tier === 'pro' && <span className="ml-1.5 bg-amber-100 text-amber-800 rounded px-1 py-0.5 text-[9px] font-bold uppercase">Pro</span>}
                      {!block.unreleased && it.tags?.includes('unreleased') && (
                        <VersionBadge kind="unreleased" size="xs" className="ml-1.5 align-middle" />
                      )}
                      {it.shortDescription && it.shortDescription !== it.title && (
                        <span className="text-muted-foreground"> — {it.shortDescription}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReleasePublish({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const [copiedUrl, setCopiedUrl] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['release', productId],
    queryFn: () => getProductRelease(productId),
  });

  const publishMutation = useMutation({
    mutationFn: (enabled: boolean) => updateProduct({ id: productId, publicChangelogEnabled: enabled }),
    onSuccess: (_res, enabled) => {
      playSound('success');
      toast.success(enabled ? 'Public changelog published' : 'Public changelog unpublished');
      queryClient.invalidateQueries({ queryKey: ['release', productId] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
    onError: () => {
      playSound('error');
      toast.error('Could not update publish setting');
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const { product, releases, unreleased, formats } = data;
  const published = product.publicChangelogEnabled;
  const publicUrl = `${window.location.origin}/changelog/${product.id}`;
  const hasReleases = releases.length > 0 || !!unreleased;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" /> Release Publishing
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Turn this product's versions and changelog into a public page and ready-to-paste release notes.
        </p>
      </div>

      {!hasReleases && (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          No changelog entries yet. Add activities (and assign versions) to generate a release.
        </div>
      )}

      {/* Publish to public page */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
          <div>
            <p className="font-semibold text-lg flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Public changelog page</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              Publish a branded, shareable "What's New" page for this product. Anyone with the link can view it — no login required.
            </p>
          </div>
          <button
            type="button"
            onClick={() => publishMutation.mutate(!published)}
            disabled={publishMutation.isPending}
            aria-pressed={published}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 ${published ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${published ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {published && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
            <code className="text-xs flex-1 truncate text-foreground">{publicUrl}</code>
            <Button variant="ghost" size="sm" onClick={copyUrl}>
              {copiedUrl ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">Open <ExternalLink className="w-3.5 h-3.5" /></a>
            </Button>
          </div>
        )}
      </div>

      {/* Export formats */}
      {hasReleases && formats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ExportBox title="WordPress.org readme.txt" icon={FileText} value={formats.readme} download={{ filename: `${product.slug}-changelog.txt` }} />
          <ExportBox title="Markdown (GitHub release)" icon={FileCode2} value={formats.markdown} download={{ filename: `${product.slug}-CHANGELOG.md` }} />
        </div>
      )}

      {/* Preview */}
      {hasReleases && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
          {unreleased && <ReleaseBlockView block={unreleased} />}
          {releases.map((b) => <ReleaseBlockView key={b.versionId || b.label} block={b} />)}
        </div>
      )}
    </div>
  );
}
