
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Check, Copy, Plus, RefreshCw } from 'lucide-react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useState } from 'react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { addUser } from '@/services/users';
import { playSound } from '@/lib/sound';

const AddUserDialog = ({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) => {
    const [userInfo, setUserInfo] = useState({ name: '', email: '', password: '' });
    const [copied, setCopied] = useState<boolean>(false);

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
        const arr = new Uint32Array(16);
        crypto.getRandomValues(arr);
        setUserInfo({ ...userInfo, password: Array.from(arr, (n) => chars[n % chars.length]).join('') });
        setCopied(false);
    };

    const copyPassword = () => {
        navigator.clipboard.writeText(userInfo.password).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleAddUser = async () => {
        if (userInfo.password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        try {
            await addUser(userInfo.name, userInfo.email, userInfo.password, 'user');
            playSound('success');
            toast.success(`User ${userInfo.name} added successfully`);
            setUserInfo({ name: '', email: '', password: '' });
            setOpen(false);
        } catch (err: any) {
            playSound('error');
            toast.error(err?.response?.data?.message || 'Failed to add user');
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5" /> Add USer
                        </DialogTitle>
                        <DialogDescription>
                            Add a new user to the system. Share it with them securely — it won't be shown again.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="name">Name </Label>
                        <div className="flex gap-2">
                            <Input
                                id="name"
                                type="text"
                                value={userInfo.name}
                                onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                                placeholder="Name"
                                autoComplete="name"
                                spellCheck={false}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email </Label>
                            <div className="flex gap-2">
                                <Input
                                    id="email"
                                    type="email"
                                    value={userInfo.email}
                                    onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                                    placeholder="Email"
                                    autoComplete="email"
                                    spellCheck={false}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">New password</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="password"
                                    type="text"
                                    value={userInfo.password}
                                    onChange={(e) => { setUserInfo({ ...userInfo, password: e.target.value }); setCopied(false); }}
                                    placeholder="At least 8 characters"
                                    autoComplete="new-password"
                                    spellCheck={false}
                                />
                                <Button type="button" variant="outline" size="icon" title="Copy" onClick={copyPassword} disabled={!userInfo.password}>
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
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddUser} >
                                Add User
                            </Button>
                        </DialogFooter>


                    </div>
                </DialogContent>
            </Dialog>
        </>
    )

}

export default AddUserDialog