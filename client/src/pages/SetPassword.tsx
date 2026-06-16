import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { playSound } from '@/lib/sound';
import { changePassword } from '@/services/auth';
import { ShieldCheck, LogOut, Loader2 } from 'lucide-react';

/**
 * Forced password change after an admin issues a one-time password. Reachable
 * only by an authenticated user whose account is flagged `mustChangePassword`.
 */
export default function SetPassword() {
  const { user, loading, refreshMe, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  // If they don't need to change their password, this page isn't for them.
  if (!user.mustChangePassword) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      playSound('success');
      toast.success('Password updated — welcome back!');
      await refreshMe();
      navigate('/', { replace: true });
    } catch (err: any) {
      playSound('error');
      toast.error(err?.response?.data?.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm border rounded-xl bg-card p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold">A</div>
          <h1 className="text-2xl font-bold tracking-tight">ATRS</h1>
        </div>

        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold mb-1">Choose a new password</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You signed in with a temporary password set by an administrator. Set your own password to
          continue.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="current">Temporary password</Label>
            <PasswordInput id="current" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoFocus autoComplete="current-password" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new">New password</Label>
            <PasswordInput id="new" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" placeholder="At least 8 characters" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <PasswordInput id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          </div>
          <Button type="submit" disabled={submitting} className="mt-1">
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…</> : 'Set new password'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => { logout(); navigate('/login', { replace: true }); }}
          className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
