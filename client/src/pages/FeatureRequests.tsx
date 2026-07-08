import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Lightbulb, Plus, Trash2, MessageSquare, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import {
  getFeatureRequests,
  createFeatureRequest,
  updateFeatureRequest,
  deleteFeatureRequest,
  type FeatureRequest,
  type FeatureRequestStatus,
} from '../services/featureRequests';
import PageTransition from '../components/layout/PageTransition';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_META: Record<FeatureRequestStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  planned: { label: 'Planned', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  'in-progress': { label: 'In progress', className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  done: { label: 'Done', className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  declined: { label: 'Declined', className: 'bg-muted text-muted-foreground' },
};

const STATUS_ORDER: FeatureRequestStatus[] = ['pending', 'planned', 'in-progress', 'done', 'declined'];

const requesterName = (r: FeatureRequest) =>
  typeof r.requesterId === 'object' ? r.requesterId.name : '';

export default function FeatureRequests() {
  const { user, isAdmin } = useAuth();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [noteTarget, setNoteTarget] = useState<FeatureRequest | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['feature-requests'],
    queryFn: getFeatureRequests,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['feature-requests'] });

  const createMutation = useMutation({
    mutationFn: createFeatureRequest,
    onSuccess: () => {
      toast.success('Feature request submitted — thanks!');
      setFormOpen(false);
      setTitle('');
      setDescription('');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not submit the request'),
  });

  const updateMutation = useMutation({
    mutationFn: updateFeatureRequest,
    onSuccess: () => {
      toast.success('Feature request updated');
      setNoteTarget(null);
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not update the request'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeatureRequest,
    onSuccess: () => {
      toast.success('Feature request removed');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not remove the request'),
  });

  const handleSubmit = () => {
    if (title.trim().length < 3) {
      toast.error('Please give the request a short title (at least 3 characters).');
      return;
    }
    createMutation.mutate({ title: title.trim(), description: description.trim() || undefined });
  };

  const handleDelete = async (r: FeatureRequest) => {
    const mine = typeof r.requesterId === 'object' ? r.requesterId._id === user?._id : r.requesterId === user?._id;
    const ok = await confirm({
      title: mine && r.status === 'pending' ? 'Withdraw this request?' : 'Delete this request?',
      description: `"${r.title}" will be permanently removed.`,
      confirmText: 'Remove',
    });
    if (ok) deleteMutation.mutate(r._id);
  };

  const canDelete = (r: FeatureRequest) => {
    if (isAdmin) return true;
    return r.status === 'pending';
  };

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-primary" /> Feature Requests
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin
              ? 'Ideas submitted by users for improving ATRS. Set a status and optionally leave a response.'
              : 'Suggest an improvement for ATRS. Admins review every request and you’ll be notified when yours is triaged.'}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> New request
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </Card>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-10 flex flex-col items-center text-center gap-3">
          <Lightbulb className="w-10 h-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium">No feature requests yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Have an idea that would make ATRS better? Send it in.
            </p>
          </div>
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Request a feature
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const meta = STATUS_META[r.status] || STATUS_META.pending;
            return (
              <Card key={r._id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{r.title}</h3>
                      <Badge variant="secondary" className={meta.className}>{meta.label}</Badge>
                    </div>
                    {r.description && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{r.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      {isAdmin && requesterName(r) && (
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3" /> {requesterName(r)}
                        </span>
                      )}
                      <span>{format(new Date(r.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    {r.adminNote && (
                      <div className="mt-3 rounded-md bg-accent/40 border px-3 py-2 text-sm">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <MessageSquare className="w-3 h-3" /> Admin response
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">{r.adminNote}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin && (
                      <>
                        <Select
                          value={r.status}
                          onValueChange={(status) => updateMutation.mutate({ id: r._id, status: status as FeatureRequestStatus })}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_ORDER.map((s) => (
                              <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          title="Respond to the requester"
                          onClick={() => { setNoteTarget(r); setNoteDraft(r.adminNote || ''); }}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    {canDelete(r) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        title={isAdmin ? 'Delete request' : 'Withdraw request'}
                        onClick={() => handleDelete(r)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New request dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a feature</DialogTitle>
            <DialogDescription>
              Describe what you'd like ATRS to do. Every admin is notified and you'll hear back once it's triaged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Short title, e.g. “Export reports to Excel”"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="What problem would this solve? How do you imagine it working? (optional)"
              value={description}
              rows={5}
              maxLength={5000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Submitting…' : 'Submit request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin response dialog */}
      <Dialog open={!!noteTarget} onOpenChange={(open) => { if (!open) setNoteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to the requester</DialogTitle>
            <DialogDescription>
              {noteTarget ? `Your note is shown to ${requesterName(noteTarget) || 'the requester'} on “${noteTarget.title}”.` : ''}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={noteDraft}
            rows={4}
            maxLength={2000}
            placeholder="e.g. Planned for the next release — thanks for the idea!"
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteTarget(null)}>Cancel</Button>
            <Button
              onClick={() => noteTarget && updateMutation.mutate({ id: noteTarget._id, adminNote: noteDraft.trim() })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save response'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
