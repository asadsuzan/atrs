import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Bug, CheckCircle2, Loader2 } from 'lucide-react';
import { reportPublicIssue } from '../../services/issues';

const EMPTY = { title: '', description: '', versionLabel: '', reporter: '', reporterEmail: '', website: '' };

export function ReportIssueDialog({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const reset = () => { setForm(EMPTY); setError(null); setDone(false); setSubmitting(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 3) {
      setError('Please describe the issue in a few words.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await reportPublicIssue(productId, form);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => { reset(); setOpen(true); }} variant="outline">
        <Bug className="w-4 h-4 mr-2" /> Report an issue
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent>
          {done ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
              <h3 className="text-lg font-semibold mt-3">Thanks for the report!</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                We've received your report for <span className="font-medium text-foreground">{productName}</span> and
                the team will review it. It won't appear on this page until it's been reviewed.
              </p>
              <Button className="mt-5" onClick={() => setOpen(false)}>Close</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Report an issue</DialogTitle>
                <DialogDescription>
                  Found a bug in {productName}? Tell us what happened and we'll take a look.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ri-title">Summary <span className="text-destructive">*</span></Label>
                  <Input id="ri-title" required value={form.title} onChange={set('title')} placeholder="e.g. Toggle button doesn't open the panel on mobile" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ri-desc">What happened?</Label>
                  <Textarea id="ri-desc" rows={4} value={form.description} onChange={set('description')} placeholder="Steps to reproduce, what you expected, what you saw…" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ri-version">Version (optional)</Label>
                    <Input id="ri-version" value={form.versionLabel} onChange={set('versionLabel')} placeholder="e.g. 2.0.3" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ri-name">Your name (optional)</Label>
                    <Input id="ri-name" value={form.reporter} onChange={set('reporter')} placeholder="Jane Doe" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ri-email">Your email (optional)</Label>
                  <Input id="ri-email" type="email" value={form.reporterEmail} onChange={set('reporterEmail')} placeholder="So we can follow up — never shown publicly" />
                </div>

                {/* Honeypot: visually hidden, off-screen; bots fill it, humans don't. */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={set('website')}
                  className="absolute -left-[9999px] w-px h-px opacity-0"
                  aria-hidden="true"
                />

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : 'Submit report'}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
