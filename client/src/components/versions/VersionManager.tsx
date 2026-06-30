import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createVersion, updateVersion, deleteVersion } from '../../services/versions';
import { syncProductReleases } from '../../services/github';
import { useProductVersions } from '../../hooks/useVersions';
import { VersionBadge } from './VersionBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { htmlToPlainText } from '@/lib/richText';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit2, Trash2, Plus, Search, GitBranch } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useConfirm } from '../../contexts/ConfirmContext';
import { playSound } from '@/lib/sound';
import { TableRowSkeleton } from '@/components/ui/skeletons';
import { Pagination } from '@/components/ui/Pagination';
import { AuthorAvatar } from '@/components/ui/AuthorAvatar';

export function VersionManager({ productId, wpData, githubUrl }: { productId: string; wpData?: any; githubUrl?: string }) {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<any>(null);

  const [formData, setFormData] = useState({ label: '', notes: '', status: 'released', releasedAt: '', author: '' });

  // Single source: decorated + canonically ordered (unreleased first, then
  // newest released; exactly one flagged `isLatest`).
  const { versions, isLoading } = useProductVersions(productId);

  // Search + status filter. Status can be deep-linked via ?versionStatus=.
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('versionStatus');
  const [statusFilter, setStatusFilter] = useState(
    initialStatus === 'unreleased' || initialStatus === 'released' ? initialStatus : 'all',
  );
  const [search, setSearch] = useState('');
  useEffect(() => {
    const v = searchParams.get('versionStatus');
    if (v === 'unreleased' || v === 'released') setStatusFilter(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const allVersions = versions;
  const q = search.trim().toLowerCase();
  const filtered = allVersions.filter((v: any) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'unreleased' ? v.status === 'unreleased' : v.status !== 'unreleased');
    const matchesSearch =
      !q || [v.label, v.author, htmlToPlainText(v.notes || '')].some((s: string) => (s || '').toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  // Client-side pagination over the filtered list.
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => { setPage(1); }, [statusFilter, search]);
  const pagedVersions = filtered.slice((page - 1) * limit, page * limit);

  // Map WP.org contributor usernames -> avatar URL so version authors that are
  // plugin contributors get their exact WP.org avatar.
  const contribAvatars: Record<string, string> = {};
  if (wpData?.contributors) {
    for (const [username, c] of Object.entries<any>(wpData.contributors)) {
      if (c?.avatar) contribAvatars[username.toLowerCase()] = c.avatar;
    }
  }
  const avatarFor = (author: string) => contribAvatars[author.trim().toLowerCase()];

  const createMutation = useMutation({
    mutationFn: createVersion,
    onSuccess: () => {
      playSound('success');
      toast.success("Version created");
      queryClient.invalidateQueries({ queryKey: ['versions', productId] });
      setIsOpen(false);
      setFormData({ label: '', notes: '', status: 'released', releasedAt: '', author: '' });
    },
    onError: () => {
      playSound('error');
      toast.error("Failed to create version");
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateVersion,
    onSuccess: () => {
      playSound('success');
      toast.success("Version updated");
      queryClient.invalidateQueries({ queryKey: ['versions', productId] });
      setEditingVersion(null);
    },
    onError: () => {
      playSound('error');
      toast.error("Failed to update version");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVersion,
    onSuccess: () => {
      playSound('delete');
      toast.success("Version deleted");
      queryClient.invalidateQueries({ queryKey: ['versions', productId] });
    },
    onError: () => {
      playSound('error');
      toast.error("Failed to delete version");
    }
  });

  const syncMutation = useMutation({
    mutationFn: () => syncProductReleases(productId),
    onSuccess: (res) => {
      playSound('success');
      const parts = [`${res.created} added`];
      if (res.updated) parts.push(`${res.updated} updated`);
      toast.success(`Synced ${res.repo}: ${parts.join(', ')} (${res.total} release${res.total === 1 ? '' : 's'} found)`);
      queryClient.invalidateQueries({ queryKey: ['versions', productId] });
    },
    onError: (err: any) => {
      playSound('error');
      toast.error(err?.response?.data?.message || 'GitHub sync failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // An unreleased version has no release date — send null to clear any existing one.
    const releasedAt = formData.status === 'unreleased' ? null : (formData.releasedAt || undefined);
    const payload = { ...formData, releasedAt };
    if (editingVersion) {
      updateMutation.mutate({ id: editingVersion._id, productId, ...payload });
    } else {
      createMutation.mutate({ productId, ...payload });
    }
  };

  const openEdit = (version: any) => {
    setFormData({
      label: version.label,
      notes: version.notes || '',
      status: version.status === 'unreleased' ? 'unreleased' : 'released',
      releasedAt: version.releasedAt ? format(new Date(version.releasedAt), 'yyyy-MM-dd') : '',
      author: version.author || ''
    });
    setEditingVersion(version);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Versions</h3>
        <div className="flex items-center gap-2">
          {githubUrl && githubUrl.includes('github.com') && (
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              title="Pull GitHub Releases into versions"
            >
              <GitBranch className="w-4 h-4 mr-2" /> {syncMutation.isPending ? 'Syncing…' : 'Sync from GitHub'}
            </Button>
          )}
          <Button onClick={() => { setEditingVersion(null); setFormData({ label: '', notes: '', status: 'released', releasedAt: '', author: '' }); setIsOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Version
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search versions by label, author, or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="released">Released</SelectItem>
            <SelectItem value="unreleased">Unreleased</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version Label</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Release Date</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
            ) : allVersions.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center h-24">No versions found.</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No versions match your filters.</TableCell></TableRow>
            ) : (
              pagedVersions.map((version: any) => (
                <TableRow key={version._id}>
                  <TableCell className="font-medium">{version.label}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <VersionBadge kind={version.isUnreleased ? 'unreleased' : 'released'} />
                      {version.isLatest && <VersionBadge kind="latest" />}
                    </div>
                  </TableCell>
                  <TableCell>{version.releasedAt ? new Date(version.releasedAt).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    {version.author ? (
                      <div className="flex items-center gap-2">
                        <AuthorAvatar author={version.author} avatarUrl={avatarFor(version.author)} />
                        <span>{version.author}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{htmlToPlainText(version.notes || '')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(version)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={async () => {
                      if (await confirm({ title: 'Delete Version', description: 'Are you sure?' })) {
                        deleteMutation.mutate(version._id);
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

      <Dialog open={isOpen || !!editingVersion} onOpenChange={(open) => {
        if (!open) { setIsOpen(false); setEditingVersion(null); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVersion ? 'Edit Version' : 'Add New Version'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Label</label>
              <Input required placeholder="e.g. v1.2.0" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="unreleased">Unreleased</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.status === 'released' && (
              <div>
                <label className="text-sm font-medium">Release Date (optional)</label>
                <DatePicker
                  value={formData.releasedAt}
                  onChange={(v) => setFormData({ ...formData, releasedAt: v })}
                  placeholder="Pick release date"
                  clearable
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Author (optional)</label>
              <Input placeholder="e.g. John Doe" value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Release Notes (optional)</label>
              <RichTextEditor
                ariaLabel="Release notes"
                placeholder="Summary of this release..."
                value={formData.notes}
                onChange={(v) => setFormData({ ...formData, notes: v })}
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full">{editingVersion ? 'Update' : 'Create'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
