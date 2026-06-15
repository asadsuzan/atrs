import { useState } from 'react';
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

export function VersionManager({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<any>(null);

  const [formData, setFormData] = useState({ label: '', notes: '', releasedAt: '' });

  const { data: versions, isLoading } = useQuery({
    queryKey: ['versions', productId],
    queryFn: () => getVersions(productId),
  });

  const createMutation = useMutation({
    mutationFn: createVersion,
    onSuccess: () => {
      toast.success("Version created");
      queryClient.invalidateQueries({ queryKey: ['versions', productId] });
      setIsOpen(false);
      setFormData({ label: '', notes: '', releasedAt: '' });
    },
    onError: () => toast.error("Failed to create version")
  });

  const updateMutation = useMutation({
    mutationFn: updateVersion,
    onSuccess: () => {
      toast.success("Version updated");
      queryClient.invalidateQueries({ queryKey: ['versions', productId] });
      setEditingVersion(null);
    },
    onError: () => toast.error("Failed to update version")
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVersion,
    onSuccess: () => {
      toast.success("Version deleted");
      queryClient.invalidateQueries({ queryKey: ['versions', productId] });
    },
    onError: () => toast.error("Failed to delete version")
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
      releasedAt: version.releasedAt ? format(new Date(version.releasedAt), 'yyyy-MM-dd') : ''
    });
    setEditingVersion(version);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Versions</h3>
        <Button onClick={() => { setEditingVersion(null); setFormData({ label: '', notes: '', releasedAt: '' }); setIsOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Version
        </Button>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version Label</TableHead>
              <TableHead>Release Date</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
            ) : versions?.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center h-24">No versions found.</TableCell></TableRow>
            ) : (
              versions?.map((version: any) => (
                <TableRow key={version._id}>
                  <TableCell className="font-medium">{version.label}</TableCell>
                  <TableCell>{version.releasedAt ? new Date(version.releasedAt).toLocaleDateString() : 'Unreleased'}</TableCell>
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
