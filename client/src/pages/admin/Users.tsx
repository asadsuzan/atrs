import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUsers,
  approveUser,
  suspendUser,
  reactivateUser,
  setUserRole,
} from '@/services/users';
import type { AuthUser } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useJobStream } from '@/contexts/JobStreamContext';
import { ShieldCheck, UserCheck, UserX, Trash2, Crown } from 'lucide-react';
import { playSound } from '@/lib/sound';

const statusVariant: Record<string, string> = {
  active: 'bg-green-500/15 text-green-600 dark:text-green-400',
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  suspended: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

export default function Users() {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const { runJob } = useJobStream();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const run = (fn: () => Promise<unknown>, success: string, sound: 'success' | 'delete' = 'success') =>
    fn()
      .then(() => {
        playSound(sound);
        toast.success(success);
        invalidate();
      })
      .catch((err: any) => {
        playSound('error');
        toast.error(err?.response?.data?.message || 'Action failed');
      });

  const approve = useMutation({ mutationFn: approveUser });
  const suspend = useMutation({ mutationFn: suspendUser });
  const reactivate = useMutation({ mutationFn: reactivateUser });
  const role = useMutation({ mutationFn: ({ id, r }: { id: string; r: 'admin' | 'user' }) => setUserRole(id, r) });

  const pending = users.filter((u) => u.status === 'pending');
  const others = users.filter((u) => u.status !== 'pending');

  const handleDelete = async (u: AuthUser) => {
    const ok = await confirm({
      title: `Delete ${u.name}?`,
      description:
        'This permanently removes the user AND all of their products, changelogs, versions, marketing data and uploaded files. This action cannot be undone.',
      confirmText: 'Delete user & data',
    });
    if (!ok) return;
    runJob({
      title: `Deleting ${u.name}`,
      url: `/users/${u._id}/delete-stream`,
      noun: 'product',
      onDone: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      },
    });
  };

  const Row = ({ u }: { u: AuthUser }) => (
    <tr className="border-b last:border-0 hover:bg-accent/30">
      <td className="py-3 px-4">
        <div className="font-medium flex items-center gap-2">
          {u.name}
          {u.isRoot && <Crown className="w-3.5 h-3.5 text-amber-500" aria-label="Root admin" />}
        </div>
        <div className="text-xs text-muted-foreground">{u.email}</div>
      </td>
      <td className="py-3 px-4">
        <Badge variant="outline" className={u.role === 'admin' ? 'border-primary text-primary' : ''}>
          {u.role}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusVariant[u.status] || ''}`}>
          {u.status}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        {u.isRoot ? (
          <span className="text-xs text-muted-foreground">Protected</span>
        ) : (
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            {u.status === 'pending' && (
              <Button size="sm" onClick={() => run(() => approve.mutateAsync(u._id), 'User approved')}>
                <UserCheck className="w-3.5 h-3.5 mr-1" /> Approve
              </Button>
            )}
            {u.status === 'active' && (
              <Button size="sm" variant="outline" onClick={() => run(() => suspend.mutateAsync(u._id), 'User suspended')}>
                <UserX className="w-3.5 h-3.5 mr-1" /> Suspend
              </Button>
            )}
            {u.status === 'suspended' && (
              <Button size="sm" variant="outline" onClick={() => run(() => reactivate.mutateAsync(u._id), 'User reactivated')}>
                <UserCheck className="w-3.5 h-3.5 mr-1" /> Reactivate
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => run(() => role.mutateAsync({ id: u._id, r: u.role === 'admin' ? 'user' : 'admin' }), 'Role updated')}
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              {u.role === 'admin' ? 'Make user' : 'Make admin'}
            </Button>
            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(u)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Approve registrations and manage roles and access.</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading users…</p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="border rounded-xl bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-amber-500/10 font-medium text-sm">
                Pending approval ({pending.length})
              </div>
              <table className="w-full text-sm">
                <tbody>{pending.map((u) => <Row key={u._id} u={u} />)}</tbody>
              </table>
            </div>
          )}

          <div className="border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-4 font-medium">User</th>
                  <th className="py-2 px-4 font-medium">Role</th>
                  <th className="py-2 px-4 font-medium">Status</th>
                  <th className="py-2 px-4" />
                </tr>
              </thead>
              <tbody>
                {others.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No active users yet.</td></tr>
                ) : (
                  others.map((u) => <Row key={u._id} u={u} />)
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
