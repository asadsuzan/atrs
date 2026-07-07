import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createIssue, type IssueSeverity, type IssueStatus } from '../../services/issues';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { SuggestTitleButton, GenerateDescriptionButton } from '../ai/AiAssist';
import { htmlToPlainText } from '@/lib/richText';
import { Bug, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { playSound } from '@/lib/sound';

const SEVERITY_OPTIONS: { value: IssueSeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

type ProductLite = { _id: string; name: string };

const emptyForm = {
  productId: '',
  title: '',
  description: '',
  severity: 'medium' as IssueSeverity,
  status: 'open' as IssueStatus,
};

/**
 * Lightweight "report an issue" dialog usable from anywhere (e.g. the
 * dashboard). Pick a product, give it a title, and optionally describe it —
 * the full Issue Tracker remains the place for attachments, versions, etc.
 */
export function QuickIssueDialog({
  open,
  onOpenChange,
  products,
  defaultProductId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductLite[];
  defaultProductId?: string;
  onCreated?: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  // Seed/clear the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setForm({ ...emptyForm, productId: defaultProductId || (products.length === 1 ? products[0]._id : '') });
    }
  }, [open, defaultProductId, products]);

  const mutation = useMutation({
    mutationFn: createIssue,
    onSuccess: (_res, vars: any) => {
      playSound('success');
      toast.success('Issue reported');
      queryClient.invalidateQueries({ queryKey: ['issues', vars.productId] });
      queryClient.invalidateQueries({ queryKey: ['allIssues'] });
      onOpenChange(false);
      onCreated?.();
    },
    onError: () => { playSound('error'); toast.error('Failed to report issue'); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || !form.title.trim()) return;
    mutation.mutate({ ...form });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Bug className="w-5 h-5 text-primary" /> Quick Report Issue</DialogTitle>
          <DialogDescription>Log an issue against any product in a few seconds.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Product</label>
            <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a product" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">Title</label>
              <SuggestTitleButton
                entity="issue"
                getContext={() => ({
                  productName: products.find((p: any) => p._id === form.productId)?.name,
                  severity: form.severity,
                  existingContent: htmlToPlainText(form.description || ''),
                })}
                onPick={(t) => setForm((f) => ({ ...f, title: t }))}
              />
            </div>
            <Input
              required
              autoFocus
              placeholder="e.g. Card grid overlaps on mobile"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Severity</label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as IssueSeverity })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as IssueStatus })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <GenerateDescriptionButton
                entity="issue"
                getContext={() => ({
                  productName: products.find((p: any) => p._id === form.productId)?.name,
                  severity: form.severity,
                })}
                getTitle={() => form.title}
                onResult={(t) => setForm((f) => ({ ...f, description: t }))}
              />
            </div>
            <RichTextEditor
              ariaLabel="Issue description"
              placeholder="Steps to reproduce, expected vs actual behaviour..."
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending || !form.productId || !form.title.trim()}>
            {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reporting…</> : 'Report Issue'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
