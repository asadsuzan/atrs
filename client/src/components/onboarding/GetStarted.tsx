import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Globe, Package, Sparkles, ArrowRight } from 'lucide-react';
import { getProducts, wpOrgPreview } from '../../services/products';
import { useWpImport } from '../../contexts/WpImportContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Mode = 'username' | 'slug';

/**
 * First-run onboarding. When a signed-in user has no products yet, we offer a
 * one-step WordPress.org import — by author username (their whole catalogue) or
 * by a specific plugin slug — so they land on real products + changelog data
 * immediately instead of an empty app. Dismissable and remembered per user.
 */
export function GetStarted() {
  const { user } = useAuth();
  const { quickImport, isImporting } = useWpImport();
  const [dismissed, setDismissed] = useLocalStorage<boolean>('atrs_getstarted_dismissed', false);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('username');
  const [value, setValue] = useState('');
  const [resolving, setResolving] = useState(false);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
    enabled: !!user,
  });
  const productCount = productsData?.data?.length ?? 0;

  // Auto-open once for a brand-new user with no products (unless they dismissed
  // it before). Never reopen while an import is already streaming.
  useEffect(() => {
    if (user && !isLoading && productCount === 0 && !dismissed && !isImporting) {
      setOpen(true);
    }
  }, [user, isLoading, productCount, dismissed, isImporting]);

  const handleClose = () => {
    setOpen(false);
    setDismissed(true);
  };

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (mode === 'username') {
      // Resolve the author's plugins first, then import them all at once.
      setResolving(true);
      try {
        const plugins = await wpOrgPreview(trimmed);
        if (!plugins || plugins.length === 0) {
          toast.info(`No plugins found for "${trimmed}" on WordPress.org.`);
          return;
        }
        setDismissed(true);
        setOpen(false);
        await quickImport({ username: trimmed, slugs: plugins.map((p: any) => p.slug) });
      } catch {
        toast.error('Could not reach WordPress.org. Please try again.');
      } finally {
        setResolving(false);
      }
    } else {
      // Accept one or several slugs separated by commas / spaces / newlines.
      const slugs = trimmed.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
      if (slugs.length === 0) return;
      setResolving(true);
      try {
        setDismissed(true);
        setOpen(false);
        await quickImport({ slugs });
      } catch {
        toast.error('Could not reach WordPress.org. Please try again.');
      } finally {
        setResolving(false);
      }
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! Let's get you set up
          </DialogTitle>
          <DialogDescription>
            Import your plugins from WordPress.org and we'll pull in their versions and
            changelogs automatically — so you start with real data, not a blank slate.
          </DialogDescription>
        </DialogHeader>

        {/* Mode switch */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('username')}
            className={cn(
              'flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
              mode === 'username' ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
            )}
          >
            <Globe className={cn('w-5 h-5 shrink-0', mode === 'username' ? 'text-primary' : 'text-muted-foreground')} />
            <div>
              <div className="text-sm font-medium">By username</div>
              <div className="text-xs text-muted-foreground">All your plugins</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setMode('slug')}
            className={cn(
              'flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
              mode === 'slug' ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
            )}
          >
            <Package className={cn('w-5 h-5 shrink-0', mode === 'slug' ? 'text-primary' : 'text-muted-foreground')} />
            <div>
              <div className="text-sm font-medium">By plugin slug</div>
              <div className="text-xs text-muted-foreground">A specific plugin</div>
            </div>
          </button>
        </div>

        <div className="space-y-2">
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !resolving && handleSubmit()}
            placeholder={
              mode === 'username'
                ? 'WordPress.org username (e.g. bplugins)'
                : 'Plugin slug (e.g. image-hover-effects-addon)'
            }
          />
          <p className="text-xs text-muted-foreground">
            {mode === 'username'
              ? 'Found on your WordPress.org profile URL: wordpress.org/plugins/author/<username>'
              : "The slug is the last part of the plugin's URL: wordpress.org/plugins/<slug>. You can paste several, separated by commas."}
          </p>
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <Button variant="ghost" onClick={handleClose}>I'll do this later</Button>
          <Button onClick={handleSubmit} disabled={!value.trim() || resolving}>
            {resolving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Looking up…</>
            ) : (
              <>Import & get started <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
