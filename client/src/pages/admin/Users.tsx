import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUsers,
  approveUser,
  suspendUser,
  reactivateUser,
  setUserRole,
  resetUserPassword,
} from '@/services/users';
import type { AuthUser } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useJobStream } from '@/contexts/JobStreamContext';
import { ShieldCheck, UserCheck, UserX, Trash2, Crown, KeyRound, RefreshCw, Copy, Check } from 'lucide-react';
import { playSound } from '@/lib/sound';
import { UsersTableSkeleton } from '@/components/ui/skeletons';
import { Pagination } from '@/components/ui/Pagination';

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

  // Admin-driven password reset state.
  const [resetTarget, setResetTarget] = useState<AuthUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    const arr = new Uint32Array(16);
    crypto.getRandomValues(arr);
    setNewPassword(Array.from(arr, (n) => chars[n % chars.length]).join(''));
    setCopied(false);
  };

  const closeReset = () => {
    setResetTarget(null);
    setNewPassword('');
    setCopied(false);
    setResetting(false);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(newPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const submitReset = async () => {
    if (!resetTarget) return;
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setResetting(true);
    try {
      await resetUserPassword(resetTarget._id, newPassword);
      playSound('success');
      toast.success(`Password reset for ${resetTarget.name}`);
      invalidate(); // refresh so the "Reset requested" badge clears
      closeReset();
    } catch (err: any) {
      playSound('error');
      toast.error(err?.response?.data?.message || 'Failed to reset password');
      setResetting(false);
    }
  };

  const pending = users.filter((u) => u.status === 'pending');
  const others = users.filter((u) => u.status !== 'pending');

  // Client-side pagination for the main users table.
  const [othersPage, setOthersPage] = useState(1);
  const [othersLimit, setOthersLimit] = useState(10);
  const othersTotalPages = Math.max(1, Math.ceil(others.length / othersLimit));
  useEffect(() => {
    if (othersPage > othersTotalPages) setOthersPage(othersTotalPages);
  }, [othersPage, othersTotalPages]);
  const pagedOthers = others.slice((othersPage - 1) * othersLimit, othersPage * othersLimit);

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
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusVariant[u.status] || ''}`}>
            {u.status}
          </span>
          {u.passwordResetRequested && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400" title="This user requested a password reset">
              <KeyRound className="w-3 h-3" /> Reset requested
            </span>
          )}
        </div>
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setResetTarget(u); setNewPassword(''); setCopied(false); }}
            >
              <KeyRound className="w-3.5 h-3.5 mr-1" /> Reset password
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
        <UsersTableSkeleton />
      ) : (
        <>
          {pending.length > 0 && (
            <div className="border rounded-xl bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-amber-500/10 font-medium text-sm">
                Pending approval ({pending.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[32rem]">
                  <tbody>{pending.map((u) => <Row key={u._id} u={u} />)}</tbody>
                </table>
              </div>
            </div>
          )}

          <div className="border rounded-xl bg-card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[32rem]">
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
                  pagedOthers.map((u) => <Row key={u._id} u={u} />)
                )}
              </tbody>
            </table>
            </div>
          </div>

          {others.length > 0 && (
            <Pagination
              page={othersPage}
              totalPages={othersTotalPages}
              onPageChange={setOthersPage}
              limit={othersLimit}
              onLimitChange={(l) => { setOthersLimit(l); setOthersPage(1); }}
              total={others.length}
            />
          )}
        </>
      )}

      {/* Admin password reset */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) closeReset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" /> Reset password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <span className="font-medium text-foreground">{resetTarget?.name}</span>{' '}
              ({resetTarget?.email}). Share it with them securely — it won't be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="flex gap-2">
              <Input
                id="new-password"
                type="text"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setCopied(false); }}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                spellCheck={false}
              />
              <Button type="button" variant="outline" size="icon" title="Copy" onClick={copyPassword} disabled={!newPassword}>
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <button
              type="button"
              onClick={generatePassword}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Generate a strong password
            </button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeReset} disabled={resetting}>Cancel</Button>
            <Button onClick={submitReset} disabled={resetting || newPassword.length < 8}>
              {resetting ? 'Setting…' : 'Set new password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
