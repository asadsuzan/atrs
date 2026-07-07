import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIssues, createIssue, updateIssue, deleteIssue, type Issue, type IssueStatus, type IssueSeverity } from '../../services/issues';
import { getProductById, updateProduct } from '../../services/products';
import { getVersions } from '../../services/versions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { SuggestTitleButton, GenerateDescriptionButton } from '../ai/AiAssist';
import { htmlToPlainText } from '@/lib/richText';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MediaUploader } from '@/components/ui/MediaUploader';
import { Edit2, Trash2, Plus, Bug, Globe, Copy, Check, ExternalLink, AlertCircle, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useConfirm } from '../../contexts/ConfirmContext';
import { playSound } from '@/lib/sound';
import { cn } from '@/lib/utils';
import { TableRowSkeleton } from '@/components/ui/skeletons';
import { Pagination } from '@/components/ui/Pagination';

const STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const SEVERITY_OPTIONS: { value: IssueSeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export const STATUS_BADGE: Record<IssueStatus, string> = {
  open: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  'in-progress': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  closed: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-300',
};

export const SEVERITY_BADGE: Record<IssueSeverity, string> = {
  low: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_LABEL: Record<IssueStatus, string> = {
  open: 'Open', 'in-progress': 'In Progress', resolved: 'Resolved', closed: 'Closed',
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase', className)}>
      {children}
    </span>
  );
}

const emptyForm = { title: '', description: '', status: 'open' as IssueStatus, severity: 'medium' as IssueSeverity, reporter: '', versionLabel: '', foundAt: '', mediaUrls: [] as string[] };

const isVideoUrl = (url: string) => /\.(mp4|webm|ogg)$/i.test(url);

export function IssueManager({ productId, focusIssueId, onFocusHandled }: { productId: string; focusIssueId?: string | null; onFocusHandled?: () => void }) {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const { data: product } = useQuery({ queryKey: ['product', productId], queryFn: () => getProductById(productId) });
  const { data: issues, isLoading } = useQuery({ queryKey: ['issues', productId], queryFn: () => getIssues(productId) });
  const { data: versions } = useQuery({ queryKey: ['versions', productId], queryFn: () => getVersions(productId) });

  const versionLabels: string[] = (versions || []).map((v: any) => v.label);

  const published = !!product?.publicIssuesEnabled;
  const publicUrl = `${window.location.origin}/issues/${productId}`;

  const allIssues: Issue[] = issues || [];
  const filtered = allIssues.filter((i) => statusFilter === 'all' || i.status === statusFilter);

  // Client-side pagination over the filtered list.
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  useEffect(() => { setPage(1); }, [statusFilter]);
  const paged = filtered.slice((page - 1) * limit, page * limit);

  // Deep-link from a changelog card: clear the filter so the issue is reachable,
  // jump to its page, then scroll to and briefly highlight the row.
  useEffect(() => { if (focusIssueId) setStatusFilter('all'); }, [focusIssueId]);
  useEffect(() => {
    if (!focusIssueId || statusFilter !== 'all' || allIssues.length === 0) return;
    const idx = allIssues.findIndex((i) => i._id === focusIssueId);
    if (idx < 0) { onFocusHandled?.(); return; }
    const targetPage = Math.floor(idx / limit) + 1;
    if (page !== targetPage) { setPage(targetPage); return; }
    const t = setTimeout(() => {
      const el = document.getElementById(`issue-${focusIssueId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary', 'ring-inset');
        setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-inset'), 2000);
      }
      onFocusHandled?.();
    }, 80);
    return () => clearTimeout(t);
  }, [focusIssueId, statusFilter, allIssues, limit, page]);

  const openCounts = {
    open: allIssues.filter((i) => i.status === 'open').length,
    inProgress: allIssues.filter((i) => i.status === 'in-progress').length,
    resolved: allIssues.filter((i) => i.status === 'resolved' || i.status === 'closed').length,
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['issues', productId] });

  const createMutation = useMutation({
    mutationFn: createIssue,
    onSuccess: () => {
      playSound('success');
      toast.success('Issue reported');
      invalidate();
      setIsOpen(false);
      setFormData(emptyForm);
    },
    onError: () => { playSound('error'); toast.error('Failed to report issue'); },
  });

  const updateMutation = useMutation({
    mutationFn: updateIssue,
    onSuccess: () => {
      playSound('success');
      toast.success('Issue updated');
      invalidate();
      setEditingIssue(null);
    },
    onError: () => { playSound('error'); toast.error('Failed to update issue'); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIssue,
    onSuccess: () => { playSound('delete'); toast.success('Issue deleted'); invalidate(); },
    onError: () => { playSound('error'); toast.error('Failed to delete issue'); },
  });

  // Clears the review flag on a public submission so it appears on the public page.
  const approveMutation = useMutation({
    mutationFn: (id: string) => updateIssue({ id, needsReview: false }),
    onSuccess: () => { playSound('success'); toast.success('Issue approved — now visible on the public page'); invalidate(); },
    onError: () => { playSound('error'); toast.error('Failed to approve issue'); },
  });

  const publishMutation = useMutation({
    mutationFn: (enabled: boolean) => updateProduct({ id: productId, publicIssuesEnabled: enabled }),
    onSuccess: (_res, enabled) => {
      playSound('success');
      toast.success(enabled ? 'Public issues page published' : 'Public issues page unpublished');
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
    onError: () => { playSound('error'); toast.error('Could not update publish setting'); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, foundAt: formData.foundAt || undefined };
    if (editingIssue) {
      updateMutation.mutate({ id: editingIssue._id, productId, ...payload });
    } else {
      createMutation.mutate({ productId, ...payload });
    }
  };

  const openCreate = () => { setEditingIssue(null); setFormData(emptyForm); setIsOpen(true); };

  const openEdit = (issue: Issue) => {
    setFormData({
      title: issue.title,
      description: issue.description || '',
      status: issue.status,
      severity: issue.severity,
      reporter: issue.reporter || '',
      versionLabel: issue.versionLabel || '',
      foundAt: issue.foundAt ? format(new Date(issue.foundAt), 'yyyy-MM-dd') : '',
      mediaUrls: issue.mediaUrls || [],
    });
    setEditingIssue(issue);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedUrl(true);
      playSound('click');
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch { toast.error('Could not copy link'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Bug className="w-5 h-5 text-primary" /> Issue Tracker
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Log issues found in this product, track their status, and optionally publish a public list.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{openCounts.open}</div>
          <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mt-1">Open</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{openCounts.inProgress}</div>
          <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mt-1">In Progress</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{openCounts.resolved}</div>
          <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mt-1">Resolved</div>
        </div>
      </div>

      {/* Publish to public page */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
          <div>
            <p className="font-semibold text-lg flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Public issues page</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              Publish a shareable list of known issues for this product. Anyone with the link can view it — no login required.
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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Report Issue
        </Button>
      </div>

      {/* Issues table */}
      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Issue</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>Found</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
            ) : allIssues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="w-6 h-6" />
                    <span>No issues logged yet. Click “Report Issue” to add one.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No issues with the selected status.</TableCell></TableRow>
            ) : (
              paged.map((issue) => (
                <TableRow key={issue._id} id={`issue-${issue._id}`} className="scroll-mt-24 transition-shadow">
                  <TableCell className="max-w-xs">
                    <div className="font-medium truncate flex items-center gap-1.5">
                      {issue.title}
                      {issue.needsReview && (
                        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 normal-case shrink-0">
                          Needs review
                        </Badge>
                      )}
                      {issue.source === 'public' && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0" title="Submitted via the public report form">
                          <Globe className="w-3 h-3" /> public
                        </span>
                      )}
                      {issue.mediaUrls && issue.mediaUrls.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                          <Paperclip className="w-3 h-3" />{issue.mediaUrls.length}
                        </span>
                      )}
                    </div>
                    {htmlToPlainText(issue.description || '') && <div className="text-xs text-muted-foreground truncate">{htmlToPlainText(issue.description || '')}</div>}
                    {issue.mediaUrls && issue.mediaUrls.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        {issue.mediaUrls.slice(0, 4).map((url, i) => (
                          isVideoUrl(url) ? (
                            <div key={i} className="w-8 h-8 rounded border bg-muted flex items-center justify-center shrink-0">
                              <Paperclip className="w-3 h-3 text-muted-foreground" />
                            </div>
                          ) : (
                            <img key={i} src={url} alt="" className="w-8 h-8 rounded border object-cover shrink-0" />
                          )
                        ))}
                        {issue.mediaUrls.length > 4 && <span className="text-[10px] text-muted-foreground">+{issue.mediaUrls.length - 4}</span>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell><Badge className={SEVERITY_BADGE[issue.severity]}>{issue.severity}</Badge></TableCell>
                  <TableCell><Badge className={STATUS_BADGE[issue.status]}>{STATUS_LABEL[issue.status]}</Badge></TableCell>
                  <TableCell className="text-sm">{issue.versionLabel || '—'}</TableCell>
                  <TableCell className="text-sm">{issue.reporter || '—'}</TableCell>
                  <TableCell className="text-sm">{issue.foundAt ? new Date(issue.foundAt).toLocaleDateString() : '—'}</TableCell>
                  <TableCell className="text-right">
                    {issue.needsReview && (
                      <Button variant="ghost" size="icon" aria-label="Approve issue" title="Approve — publish to the public page"
                        onClick={() => approveMutation.mutate(issue._id)} disabled={approveMutation.isPending}>
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(issue)} aria-label="Edit issue">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Delete issue" onClick={async () => {
                      if (await confirm({ title: 'Delete Issue', description: 'Are you sure you want to permanently delete this issue?' })) {
                        deleteMutation.mutate(issue._id);
                      }
                    }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          limit={limit}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
          total={filtered.length}
        />
      )}

      {/* Add / Edit dialog */}
      <Dialog open={isOpen || !!editingIssue} onOpenChange={(open) => { if (!open) { setIsOpen(false); setEditingIssue(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingIssue ? 'Edit Issue' : 'Report New Issue'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">Title</label>
                <SuggestTitleButton
                  entity="issue"
                  getContext={() => ({
                    productName: product?.name,
                    severity: formData.severity,
                    versionLabel: formData.versionLabel,
                    existingContent: htmlToPlainText(formData.description || ''),
                  })}
                  onPick={(t) => setFormData((f) => ({ ...f, title: t }))}
                />
              </div>
              <Input required placeholder="e.g. Card grid overlaps on mobile" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">Description (optional)</label>
                <GenerateDescriptionButton
                  entity="issue"
                  getContext={() => ({
                    productName: product?.name,
                    severity: formData.severity,
                    versionLabel: formData.versionLabel,
                  })}
                  getTitle={() => formData.title}
                  onResult={(t) => setFormData((f) => ({ ...f, description: t }))}
                />
              </div>
              <RichTextEditor
                ariaLabel="Issue description"
                placeholder="Steps to reproduce, expected vs actual behaviour..."
                value={formData.description}
                onChange={(v) => setFormData({ ...formData, description: v })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Severity</label>
                <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v as IssueSeverity })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as IssueStatus })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Affected version (optional)</label>
                <Select
                  value={formData.versionLabel || '__none__'}
                  onValueChange={(v) => setFormData({ ...formData, versionLabel: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select version" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {/* Keep a previously-set label selectable even if its version was removed. */}
                    {formData.versionLabel && !versionLabels.includes(formData.versionLabel) && (
                      <SelectItem value={formData.versionLabel}>{formData.versionLabel}</SelectItem>
                    )}
                    {versionLabels.map((label) => (
                      <SelectItem key={label} value={label}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Reporter (optional)</label>
                <Input placeholder="e.g. asadsuzan" value={formData.reporter} onChange={(e) => setFormData({ ...formData, reporter: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Date found (optional)</label>
              <DatePicker value={formData.foundAt} onChange={(v) => setFormData({ ...formData, foundAt: v })} placeholder="Pick date" clearable className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Attachments (optional)</label>
              <MediaUploader
                multiple
                value={formData.mediaUrls}
                onChange={(urls) => setFormData({ ...formData, mediaUrls: Array.isArray(urls) ? urls : (urls ? [urls] : []) })}
                label="Drag & drop screenshots or recordings here or click to browse"
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingIssue ? 'Update Issue' : 'Report Issue'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
