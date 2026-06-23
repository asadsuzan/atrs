import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVersions, createVersion, updateVersion, deleteVersion } from '../../services/versions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/DatePicker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useConfirm } from '../../contexts/ConfirmContext';
import { playSound } from '@/lib/sound';
import { TableRowSkeleton } from '@/components/ui/skeletons';
import { Pagination } from '@/components/ui/Pagination';
import { AuthorAvatar } from '@/components/ui/AuthorAvatar';

export function VersionManager({ productId, wpData }: { productId: string; wpData?: any }) {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<any>(null);

  const [formData, setFormData] = useState({ label: '', notes: '', releasedAt: '', author: '' });

  const { data: versions, isLoading } = useQuery({
    queryKey: ['versions', productId],
    queryFn: () => getVersions(productId),
  });

  // Client-side pagination (versions are returned in full).
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const allVersions: any[] = versions || [];
  const totalPages = Math.max(1, Math.ceil(allVersions.length / limit));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pagedVersions = allVersions.slice((page - 1) * limit, page * limit);

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
      setFormData({ label: '', notes: '', releasedAt: '', author: '' });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVersion) {
      updateMutation.mutate({ id: editingVersion._id, productId, ...formData, releasedAt: formData.releasedAt || undefined });
    } else {
      createMutation.mutate({ productId, ...formData, releasedAt: formData.releasedAt || undefined });
    }
  };

  const openEdit = (version: any) => {
    setFormData({
      label: version.label,
      notes: version.notes || '',
      releasedAt: version.releasedAt ? format(new Date(version.releasedAt), 'yyyy-MM-dd') : '',
      author: version.author || ''
    });
    setEditingVersion(version);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Versions</h3>
        <Button onClick={() => { setEditingVersion(null); setFormData({ label: '', notes: '', releasedAt: '', author: '' }); setIsOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Version
        </Button>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version Label</TableHead>
              <TableHead>Release Date</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
            ) : allVersions.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center h-24">No versions found.</TableCell></TableRow>
            ) : (
              pagedVersions.map((version: any) => (
                <TableRow key={version._id}>
                  <TableCell className="font-medium">{version.label}</TableCell>
                  <TableCell>{version.releasedAt ? new Date(version.releasedAt).toLocaleDateString() : 'Unreleased'}</TableCell>
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
                  <TableCell className="max-w-xs truncate">{version.notes}</TableCell>
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

      {allVersions.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          limit={limit}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
          total={allVersions.length}
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
              <label className="text-sm font-medium">Release Date (optional)</label>
              <DatePicker
                value={formData.releasedAt}
                onChange={(v) => setFormData({ ...formData, releasedAt: v })}
                placeholder="Pick release date"
                clearable
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Author (optional)</label>
              <Input placeholder="e.g. John Doe" value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Release Notes (optional)</label>
              <Textarea placeholder="Summary of this release..." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
            </div>
            <Button type="submit" className="w-full">{editingVersion ? 'Update' : 'Create'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
