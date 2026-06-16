import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ArrowLeft, UserCheck, MailQuestion, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkEmail, requestPasswordReset } from '@/services/auth';
import { playSound } from '@/lib/sound';

type Stage = 'enter-email' | 'found' | 'not-found' | 'requested';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<Stage>('enter-email');
  const [foundName, setFoundName] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const { exists, name } = await checkEmail(email.trim());
      if (exists) {
        setFoundName(name || '');
        setStage('found');
        playSound('success');
      } else {
        setStage('not-found');
        playSound('error');
      }
    } catch {
      setStage('not-found');
    } finally {
      setBusy(false);
    }
  };

  const handleRequest = async () => {
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setStage('requested');
      playSound('success');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm border rounded-xl bg-card p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold">A</div>
          <h1 className="text-2xl font-bold tracking-tight">ATRS</h1>
        </div>

        {stage === 'enter-email' && (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Forgot your password?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enter the email for your account and we'll help you request a reset.
            </p>
            <form onSubmit={handleCheck} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              <Button type="submit" disabled={busy || !email.trim()} className="mt-1">
                {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking…</> : 'Continue'}
              </Button>
            </form>
          </>
        )}

        {stage === 'not-found' && (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 mb-4">
              <MailQuestion className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No account found</h2>
            <p className="text-sm text-muted-foreground mb-6">
              We couldn't find an account for <span className="font-medium text-foreground">{email}</span>.
              Double-check the address and try again.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setStage('enter-email')}>
              Try a different email
            </Button>
          </>
        )}

        {stage === 'found' && (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
              <UserCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Account found{foundName ? `: ${foundName}` : ''}</h2>
            <p className="text-sm text-muted-foreground mb-6">
              For security, only an administrator can reset your password. Send a request and an admin
              will set a temporary password — you'll choose your own on your next sign-in.
            </p>
            <Button className="w-full" onClick={handleRequest} disabled={busy}>
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</> : 'Request password reset'}
            </Button>
          </>
        )}

        {stage === 'requested' && (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Request sent</h2>
            <p className="text-sm text-muted-foreground mb-6">
              An administrator has been notified. Once they set a temporary password, sign in with it
              and you'll be prompted to choose a new one.
            </p>
          </>
        )}

        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
