import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { playSound } from '@/lib/sound';

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(name, email, password);
      playSound('success');
      setDone(true);
    } catch (err: any) {
      playSound('error');
      toast.error(err?.response?.data?.message || 'Registration failed');
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

        {done ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Registration successful</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your account is awaiting administrator approval. You'll be able to sign in once an admin approves it.
            </p>
            <Link to="/login">
              <Button variant="outline" className="w-full">Back to sign in</Button>
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-1">Create your account</h2>
            <p className="text-sm text-muted-foreground mb-6">New accounts require admin approval before first sign-in.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                <span className="text-xs text-muted-foreground">At least 8 characters.</span>
              </div>
              <Button type="submit" disabled={submitting} className="mt-2">
                {submitting ? 'Creating…' : 'Create account'}
              </Button>
            </form>
            <p className="text-sm text-muted-foreground mt-6 text-center">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
