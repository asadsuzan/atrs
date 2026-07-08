import { useTheme } from '../contexts/ThemeProvider';
import { motion } from 'framer-motion';
import PageTransition, { staggerContainer, staggerItem } from '../components/layout/PageTransition';
import { Check, Download, Database, Save, Volume2, VolumeX, Play, PanelLeft, Code2, Eraser, GitBranch, Link2, Unlink, Palette, Presentation, Server, Bell, Cloud, HardDrive } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportAllData } from '../services/export';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAppConfig, updateAppConfig, testStorageConnection, type NavMode, type R2TestResult } from '../services/config';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getToken, setToken } from '../services/api';
import { getGithubStatus, connectGithub, disconnectGithub } from '../services/github';
import { updateMe } from '../services/auth';
import { isUserMuted, setUserMute, playSound, setCachedSoundConfig } from '../lib/sound';

const THEMES = [
  { id: 'todoist', name: 'Todoist', color: '#e44332' },
  { id: 'moonstone', name: 'Moonstone', color: '#0d85ab' },
  { id: 'tangerine', name: 'Tangerine', color: '#f38118' },
  { id: 'kale', name: 'Kale', color: '#169947' },
  { id: 'blueberry', name: 'Blueberry', color: '#1f6fed' },
  { id: 'lavender', name: 'Lavender', color: '#8843e2' },
  { id: 'raspberry', name: 'Raspberry', color: '#ed3b87' },
] as const;

/** Consistent card wrapper with an icon chip, title and optional description. */
function SettingCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: any;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-xl border shadow-sm p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="mt-0.5 rounded-lg bg-primary/10 text-primary p-2 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-semibold leading-tight">{title}</h3>
          {description && <p className="text-sm text-muted-foreground mt-1 max-w-xl">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function Settings() {
  const { theme, setTheme, isDark, setIsDark, isAutoDark, setIsAutoDark } = useTheme();
  const { isAdmin, user, refreshMe } = useAuth();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('appearance');
  const [isMuted, setIsMuted] = useState(isUserMuted());
  const [configForm, setConfigForm] = useState({ serverPort: '5000', mongodbUri: '' });
  const [navMode, setNavMode] = useState<NavMode>('expanded');
  const [changelogGenForm, setChangelogGenForm] = useState({
    model: 'qwen2.5-coder',
    ollamaMode: 'local',
    ollamaCloudUrl: '',
    ollamaCloudKey: '',
  });
  const [staleDays, setStaleDays] = useState(7);
  const [brandingForm, setBrandingForm] = useState({
    companyName: '', logoUrl: '', accentColor: '', accentDynamic: false,
    thankYouEnabled: true, thankYouTitle: '', thankYouMessage: '',
  });
  const [presenterForm, setPresenterForm] = useState({ name: '', jobTitle: '' });
  const [storageForm, setStorageForm] = useState({
    provider: 'local' as 'local' | 'r2',
    accountId: '',
    bucket: '',
    publicBaseUrl: '',
    accessKeyId: '',
    secretAccessKey: '',
    // Whether a secret is already stored server-side (it's write-only and
    // never sent back, so the field stays blank without being "missing").
    secretAccessKeySet: false,
  });
  const [storageTestResult, setStorageTestResult] = useState<R2TestResult | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [soundsForm, setSoundsForm] = useState({
    enabled: true,
    successSound: 'synth-success',
    deleteSound: 'synth-delete',
    errorSound: 'synth-error',
    notificationSound: 'synth-notification',
    clickSound: 'synth-click',
    volume: 0.5
  });

  const { data: configData, isLoading: configLoading, refetch } = useQuery({
    queryKey: ['appConfig'],
    queryFn: getAppConfig,
    retry: false,
    enabled: isAdmin
  });

  // GitHub connection (per-user). Token is write-only — never returned by the API.
  const [githubToken, setGithubToken] = useState('');
  const { data: githubStatus } = useQuery({
    queryKey: ['github-status'],
    queryFn: getGithubStatus,
    retry: false,
  });
  const connectGithubMutation = useMutation({
    mutationFn: connectGithub,
    onSuccess: (status) => {
      playSound('success');
      toast.success(`GitHub connected as @${status.login}`);
      setGithubToken('');
      queryClient.invalidateQueries({ queryKey: ['github-status'] });
    },
    onError: (err: any) => {
      playSound('error');
      toast.error(err?.response?.data?.message || 'Failed to connect GitHub');
    },
  });
  const disconnectGithubMutation = useMutation({
    mutationFn: disconnectGithub,
    onSuccess: () => {
      toast.success('GitHub disconnected');
      queryClient.invalidateQueries({ queryKey: ['github-status'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to disconnect GitHub');
    },
  });

  const handleExport = async () => {
    try {
      await exportAllData();
      playSound('success');
    } catch (err: any) {
      playSound('error');
      toast.error(err?.response?.data?.message || 'Export failed');
    }
  };

  useEffect(() => {
    if (configData) {
      setConfigForm({
        serverPort: String(configData.server?.port || 5000),
        mongodbUri: configData.server?.mongodbUri || ''
      });
      if (configData.navigation?.mode) setNavMode(configData.navigation.mode);
      // Prefer the new `changelogGen` block; fall back to the legacy
      // `codeTracker` block for configs saved before the rename.
      const gen = configData.changelogGen || configData.codeTracker;
      if (gen) {
        setChangelogGenForm({
          model: gen.model || 'qwen2.5-coder',
          ollamaMode: gen.ollamaMode || 'local',
          ollamaCloudUrl: gen.ollamaCloudUrl || '',
          ollamaCloudKey: gen.ollamaCloudKey || '',
        });
      }
      if (configData.staleAlert?.days) setStaleDays(Number(configData.staleAlert.days));
      if (configData.branding) {
        setBrandingForm({
          companyName: configData.branding.companyName || '',
          logoUrl: configData.branding.logoUrl || '',
          accentColor: configData.branding.accentColor || '',
          accentDynamic: !!configData.branding.accentDynamic,
          thankYouEnabled: configData.branding.thankYouEnabled !== false,
          thankYouTitle: configData.branding.thankYouTitle || '',
          thankYouMessage: configData.branding.thankYouMessage || '',
        });
      }
      if (configData.storage) {
        setStorageForm({
          provider: configData.storage.provider === 'r2' ? 'r2' : 'local',
          accountId: configData.storage.r2?.accountId || '',
          bucket: configData.storage.r2?.bucket || '',
          publicBaseUrl: configData.storage.r2?.publicBaseUrl || '',
          accessKeyId: configData.storage.r2?.accessKeyId || '',
          secretAccessKey: '',
          secretAccessKeySet: !!configData.storage.r2?.secretAccessKeySet,
        });
      }
      if (configData.sounds) {
        setSoundsForm({
          enabled: typeof configData.sounds.enabled === 'boolean' ? configData.sounds.enabled : true,
          successSound: configData.sounds.successSound || 'synth-success',
          deleteSound: configData.sounds.deleteSound || 'synth-delete',
          errorSound: configData.sounds.errorSound || 'synth-error',
          notificationSound: configData.sounds.notificationSound || 'synth-notification',
          clickSound: configData.sounds.clickSound || 'synth-click',
          volume: typeof configData.sounds.volume === 'number' ? configData.sounds.volume : 0.5
        });
      }
    }
  }, [configData]);

  const saveMutation = useMutation({
    mutationFn: updateAppConfig,
    onSuccess: (res, variables) => {
      // If we modified sounds configuration, cache it locally in client
      if (variables.sounds) {
        setCachedSoundConfig(variables.sounds);
        toast.success("Sound configuration saved successfully!");
        refetch();
        return;
      }

      // Navigation preference: no server restart; refresh the sidebar's setting.
      if (variables.navigation) {
        toast.success("Navigation settings saved");
        queryClient.invalidateQueries({ queryKey: ['nav-settings'] });
        refetch();
        return;
      }

      // Changelog-generator AI preference: no restart; refresh models list.
      if (variables.changelogGen) {
        toast.success("Changelog Generator settings saved");
        queryClient.invalidateQueries({ queryKey: ['ollama-models'] });
        refetch();
        return;
      }

      // Branding: no restart; refresh the presentation-deck branding.
      if (variables.branding) {
        toast.success("Branding saved");
        queryClient.invalidateQueries({ queryKey: ['branding'] });
        refetch();
        return;
      }

      // Media storage backend: no restart; refresh the media library.
      if (variables.storage) {
        toast.success("Media storage settings saved");
        queryClient.invalidateQueries({ queryKey: ['mediaList'] });
        refetch();
        return;
      }

      // Stale-product reminder window: no restart; refresh the dashboard widget.
      if (variables.staleAlert) {
        toast.success("Update reminder settings saved");
        queryClient.invalidateQueries({ queryKey: ['staleProducts'] });
        refetch();
        return;
      }

      toast.success(res.message || "Configuration saved. Restarting server...");
      setIsRestarting(true);

      // Poll health endpoint until server is back online
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch('/api/health');
          if (res.ok) {
            clearInterval(interval);
            setIsRestarting(false);
            toast.success("Server is back online!");
            refetch();
          }
        } catch (e) {
          // Server is still down or restarting
          if (attempts > 30) {
            clearInterval(interval);
            setIsRestarting(false);
            toast.error("Server took too long to restart. Please refresh manually.");
          }
        }
      }, 1500);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to save configuration");
    }
  });

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configForm.serverPort || !configForm.mongodbUri) {
      toast.error("Please fill in all required configuration fields.");
      return;
    }
    saveMutation.mutate({
      server: {
        port: configForm.serverPort,
        mongodbUri: configForm.mongodbUri
      }
    });
  };

  const handleSaveSounds = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      sounds: soundsForm
    });
  };

  const handleSaveNav = () => {
    saveMutation.mutate({ navigation: { mode: navMode } });
  };

  const handleSaveChangelogGen = () => {
    saveMutation.mutate({ changelogGen: changelogGenForm });
  };

  const validateStorageForm = (): boolean => {
    const required: [string, string][] = [
      [storageForm.accountId, 'Account ID'],
      [storageForm.bucket, 'Bucket name'],
      [storageForm.publicBaseUrl, 'Public base URL'],
      [storageForm.accessKeyId, 'Access Key ID'],
      // The secret is write-only: blank is fine when one is already saved.
      [storageForm.secretAccessKeySet ? 'ok' : storageForm.secretAccessKey, 'Secret Access Key'],
    ];
    const missing = required.filter(([v]) => !v.trim()).map(([, label]) => label);
    if (missing.length) {
      toast.error(`Please fill in: ${missing.join(', ')}`);
      return false;
    }
    if (!/^https?:\/\//i.test(storageForm.publicBaseUrl.trim())) {
      toast.error('Public base URL must start with http:// or https://');
      return false;
    }
    return true;
  };

  const storageTestMutation = useMutation({
    mutationFn: testStorageConnection,
    onSuccess: (result) => {
      setStorageTestResult(result);
      if (result.ok) {
        playSound('success');
        toast.success(result.message);
      } else {
        playSound('error');
        toast.error(result.message);
      }
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || 'Connection test failed';
      setStorageTestResult({ ok: false, message });
      playSound('error');
      toast.error(message);
    },
  });

  // Editing any R2 field invalidates a previous test result.
  const setR2Field = (patch: Partial<typeof storageForm>) => {
    setStorageForm((f) => ({ ...f, ...patch }));
    setStorageTestResult(null);
  };

  const handleTestStorage = () => {
    if (!validateStorageForm()) return;
    setStorageTestResult(null);
    storageTestMutation.mutate({
      accountId: storageForm.accountId.trim(),
      bucket: storageForm.bucket.trim(),
      publicBaseUrl: storageForm.publicBaseUrl.trim(),
      accessKeyId: storageForm.accessKeyId.trim(),
      secretAccessKey: storageForm.secretAccessKey.trim(),
    });
  };

  const handleSaveStorage = () => {
    if (storageForm.provider === 'r2' && !validateStorageForm()) return;
    saveMutation.mutate({
      storage: {
        provider: storageForm.provider,
        r2: {
          accountId: storageForm.accountId.trim(),
          bucket: storageForm.bucket.trim(),
          publicBaseUrl: storageForm.publicBaseUrl.trim(),
          accessKeyId: storageForm.accessKeyId.trim(),
          secretAccessKey: storageForm.secretAccessKey.trim(),
        },
      },
    });
  };

  const handleSaveStale = () => {
    const days = Math.min(Math.max(Math.round(Number(staleDays) || 7), 1), 365);
    setStaleDays(days);
    saveMutation.mutate({ staleAlert: { days } });
  };

  // Load presenter fields from the signed-in user.
  useEffect(() => {
    if (user) setPresenterForm({ name: user.name || '', jobTitle: user.jobTitle || '' });
  }, [user]);

  const presenterMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: async () => {
      playSound('success');
      toast.success('Presenter info saved');
      await refreshMe();
    },
    onError: (err: any) => {
      playSound('error');
      toast.error(err?.response?.data?.message || 'Failed to save presenter info');
    },
  });

  const handleSavePresenter = () => {
    presenterMutation.mutate({
      name: presenterForm.name.trim() || undefined,
      jobTitle: presenterForm.jobTitle.trim(),
    });
  };

  const handleSaveBranding = () => {
    saveMutation.mutate({
      branding: {
        companyName: brandingForm.companyName.trim(),
        logoUrl: brandingForm.logoUrl.trim(),
        accentColor: brandingForm.accentColor.trim(),
        accentDynamic: brandingForm.accentDynamic,
        thankYouEnabled: brandingForm.thankYouEnabled,
        thankYouTitle: brandingForm.thankYouTitle.trim(),
        thankYouMessage: brandingForm.thankYouMessage.trim(),
      },
    });
  };

  const handleClearLocalData = async () => {
    const ok = await confirm({
      title: 'Clear local data on this device?',
      description:
        "This resets preferences saved in this browser — theme, dark mode, sidebar state, list filters, the welcome tour, and cached data. You'll stay signed in. It only affects this device and can't be undone.",
      confirmText: 'Clear data',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    try {
      // Preserve the auth session, wipe everything else this origin has stored,
      // drop the in-memory query cache, then reload so the app re-seeds from
      // defaults.
      const token = getToken();
      localStorage.clear();
      sessionStorage.clear();
      if (token) setToken(token);
      queryClient.clear();
      toast.success('Local data cleared. Reloading…');
      setTimeout(() => window.location.reload(), 700);
    } catch {
      toast.error('Could not clear local data.');
    }
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    setUserMute(newMuted);
    if (!newMuted) playSound('click');
  };

  const previewSound = (event: 'success' | 'delete' | 'error' | 'notification' | 'click') => {
    playSound(event);
  };

  return (
    <PageTransition className="max-w-4xl mx-auto pb-16">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your preferences and workspace configuration.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="flex-wrap sticky top-2 z-10 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
          <TabsTrigger value="appearance"><Palette className="w-3.5 h-3.5" /> Appearance</TabsTrigger>
          <TabsTrigger value="sound"><Volume2 className="w-3.5 h-3.5" /> Sound</TabsTrigger>
          <TabsTrigger value="integrations"><GitBranch className="w-3.5 h-3.5" /> Integrations</TabsTrigger>
          <TabsTrigger value="presentation"><Presentation className="w-3.5 h-3.5" /> Presentation</TabsTrigger>
          {isAdmin && <TabsTrigger value="system"><Server className="w-3.5 h-3.5" /> System</TabsTrigger>}
          <TabsTrigger value="data"><Database className="w-3.5 h-3.5" /> Data</TabsTrigger>
        </TabsList>

        {/* ── Appearance ───────────────────────────────────────────── */}
        <TabsContent value="appearance" className="space-y-6">
          <SettingCard icon={Palette} title="Theme mode" description="Control light and dark appearance.">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto Dark Mode</p>
                  <p className="text-sm text-muted-foreground mt-1">Automatically switch between light and dark themes when your system does.</p>
                </div>
                <button
                  onClick={() => setIsAutoDark(!isAutoDark)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isAutoDark ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isAutoDark ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="border-t pt-5 flex items-center justify-between transition-opacity" style={{ opacity: isAutoDark ? 0.5 : 1 }}>
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground mt-1">Manually enable or disable dark mode.</p>
                </div>
                <button
                  onClick={() => { if (!isAutoDark) setIsDark(!isDark); }}
                  disabled={isAutoDark}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isDark && !isAutoDark ? 'bg-primary' : 'bg-muted-foreground/30'} disabled:cursor-not-allowed`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isDark && !isAutoDark ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </SettingCard>

          <SettingCard icon={Check} title="Your themes" description="Pick an accent theme for the whole app.">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
            >
              {THEMES.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <motion.button
                    variants={staggerItem}
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    className="group flex flex-col items-center gap-3 w-full outline-none"
                  >
                    <div
                      className={`w-full aspect-[4/3] rounded-xl border-2 bg-card shadow-sm overflow-hidden flex flex-col relative transition-all duration-200 ${
                        isSelected ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-border group-hover:border-primary/50 group-hover:shadow-md'
                      }`}
                    >
                      {/* Mockup Header */}
                      <div style={{ backgroundColor: t.color }} className="h-8 w-full flex items-center px-3 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/50" />
                      </div>

                      {/* Mockup Body */}
                      <div className="flex flex-1 p-3 gap-3">
                        {/* Mockup Sidebar */}
                        <div className="w-10 h-full bg-muted/60 rounded-md flex flex-col gap-1.5 p-1.5">
                          <div className="w-full h-1.5 bg-muted-foreground/20 rounded-full" />
                          <div className="w-4/5 h-1.5 bg-muted-foreground/20 rounded-full" />
                          <div className="w-full h-1.5 bg-muted-foreground/20 rounded-full" />
                        </div>
                        {/* Mockup Content */}
                        <div className="flex-1 flex flex-col gap-2.5 pt-1">
                          <div className="w-1/2 h-2.5 bg-muted-foreground/30 rounded-full" />
                          <div className="space-y-1.5">
                            <div className="w-full h-2 bg-muted-foreground/20 rounded-full" />
                            <div className="w-5/6 h-2 bg-muted-foreground/20 rounded-full" />
                            <div className="w-4/5 h-2 bg-muted-foreground/20 rounded-full" />
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5 shadow-md">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className={`font-semibold text-sm transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                      {t.name}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          </SettingCard>
        </TabsContent>

        {/* ── Sound ────────────────────────────────────────────────── */}
        <TabsContent value="sound" className="space-y-6">
          <SettingCard
            icon={isMuted ? VolumeX : Volume2}
            title="Sound Effects"
            description="Play audio feedback for actions like creating, deleting, and notifications."
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Enable sound effects on this device.</p>
                <button
                  onClick={handleToggleMute}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${!isMuted ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${!isMuted ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {!isMuted && (
                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Preview Sounds</p>
                  <div className="flex flex-wrap gap-2">
                    {(['success', 'delete', 'error', 'notification', 'click'] as const).map(evt => (
                      <Button key={evt} variant="outline" size="sm" onClick={() => previewSound(evt)} className="capitalize gap-1.5">
                        <Play className="w-3 h-3" /> {evt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SettingCard>

          {isAdmin && (
            <SettingCard
              icon={Volume2}
              title="Global Sound Configuration"
              description="System-wide sound settings that apply to all users. Individual users can still mute sounds from their personal settings."
            >
              <form onSubmit={handleSaveSounds} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Global Sounds Enabled</label>
                    <p className="text-xs text-muted-foreground">Master toggle — disabling removes sounds for everyone.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoundsForm({...soundsForm, enabled: !soundsForm.enabled})}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${soundsForm.enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${soundsForm.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Volume ({Math.round(soundsForm.volume * 100)}%)</label>
                  <input type="range" min="0" max="1" step="0.05" value={soundsForm.volume} onChange={e => setSoundsForm({...soundsForm, volume: parseFloat(e.target.value)})} className="w-full accent-primary" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Success Sound</label>
                    <Input value={soundsForm.successSound} onChange={e => setSoundsForm({...soundsForm, successSound: e.target.value})} placeholder="synth-success or URL" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Delete Sound</label>
                    <Input value={soundsForm.deleteSound} onChange={e => setSoundsForm({...soundsForm, deleteSound: e.target.value})} placeholder="synth-delete or URL" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Error Sound</label>
                    <Input value={soundsForm.errorSound} onChange={e => setSoundsForm({...soundsForm, errorSound: e.target.value})} placeholder="synth-error or URL" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Notification Sound</label>
                    <Input value={soundsForm.notificationSound} onChange={e => setSoundsForm({...soundsForm, notificationSound: e.target.value})} placeholder="synth-notification or URL" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Click Sound</label>
                    <Input value={soundsForm.clickSound} onChange={e => setSoundsForm({...soundsForm, clickSound: e.target.value})} placeholder="synth-click or URL" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saveMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? 'Saving...' : 'Save Sound Settings'}
                  </Button>
                </div>
              </form>
            </SettingCard>
          )}
        </TabsContent>

        {/* ── Integrations ─────────────────────────────────────────── */}
        <TabsContent value="integrations" className="space-y-6">
          <SettingCard
            icon={GitBranch}
            title="GitHub Integration"
            description="Connect a Personal Access Token to pull a product's GitHub Releases straight into its Versions. Works with private and organization-owned repos."
          >
            <div className="space-y-4">
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li><span className="font-medium">Classic token:</span> enable the <code>repo</code> scope.</li>
                <li><span className="font-medium">Fine-grained token:</span> grant <code>Contents: Read-only</code> on the relevant repos.</li>
                <li><span className="font-medium">SSO orgs:</span> click "Authorize" next to the token for your organization.</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                The token is encrypted at rest and never sent back to the browser. Create one at{' '}
                <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  github.com/settings/tokens
                </a>.
              </p>

              {githubStatus?.connected ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 shrink-0" />
                    <span>
                      Connected as <span className="font-semibold">@{githubStatus.login}</span>
                      {githubStatus.connectedAt && (
                        <span className="text-muted-foreground">
                          {' '}· since {new Date(githubStatus.connectedAt).toLocaleDateString()}
                        </span>
                      )}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => disconnectGithubMutation.mutate()}
                    disabled={disconnectGithubMutation.isPending}
                  >
                    <Unlink className="w-4 h-4 mr-2" /> Disconnect
                  </Button>
                </div>
              ) : (
                <form
                  className="flex flex-col sm:flex-row sm:items-end gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (githubToken.trim()) connectGithubMutation.mutate(githubToken.trim());
                  }}
                >
                  <div className="flex-1 space-y-1">
                    <label className="text-sm font-medium">Personal Access Token</label>
                    <Input
                      type="password"
                      autoComplete="off"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_… or github_pat_…"
                    />
                  </div>
                  <Button type="submit" disabled={!githubToken.trim() || connectGithubMutation.isPending}>
                    <Link2 className="w-4 h-4 mr-2" /> Connect
                  </Button>
                </form>
              )}
            </div>
          </SettingCard>

          {isAdmin && (
            <SettingCard
              icon={Code2}
              title="Git Changelog Generator"
              description={
                <>
                  The Git Changelog Generator uses this Ollama model to summarize diffs and write release
                  notes. Switch between a <span className="font-medium">local</span> Ollama daemon and a
                  hosted <span className="font-medium">cloud</span> endpoint. Generation uses deterministic
                  (greedy) sampling, so the same model produces identical output in either mode.
                </>
              }
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Ollama Mode</label>
                    <Select
                      value={changelogGenForm.ollamaMode}
                      onValueChange={(val) => setChangelogGenForm((f) => ({ ...f, ollamaMode: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local (http://localhost:11434)</SelectItem>
                        <SelectItem value="cloud">Cloud (Custom URL)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Ollama model</label>
                    <Input
                      value={changelogGenForm.model}
                      onChange={(e) => setChangelogGenForm((f) => ({ ...f, model: e.target.value }))}
                      placeholder="qwen2.5-coder"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use the same model name in both modes for identical results.
                    </p>
                  </div>
                </div>

                {changelogGenForm.ollamaMode === 'cloud' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Ollama Cloud URL</label>
                      <Input
                        value={changelogGenForm.ollamaCloudUrl}
                        onChange={(e) => setChangelogGenForm((f) => ({ ...f, ollamaCloudUrl: e.target.value }))}
                        placeholder="https://your-cloud-ollama-endpoint.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        The full HTTP/HTTPS endpoint of your hosted Ollama service.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Ollama Cloud API Key <span className="text-muted-foreground font-normal text-xs">(optional)</span></label>
                      <Input
                        type="password"
                        value={changelogGenForm.ollamaCloudKey}
                        onChange={(e) => setChangelogGenForm((f) => ({ ...f, ollamaCloudKey: e.target.value }))}
                        placeholder="Enter API key/token if required"
                      />
                      <p className="text-xs text-muted-foreground">
                        Token passed in the Authorization Bearer header.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button onClick={handleSaveChangelogGen} disabled={saveMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" /> Save
                  </Button>
                </div>
              </div>
            </SettingCard>
          )}
        </TabsContent>

        {/* ── Presentation ─────────────────────────────────────────── */}
        <TabsContent value="presentation" className="space-y-6">
          <SettingCard
            icon={Presentation}
            title="Presenter info"
            description={`How you're credited on the Reports presentation deck ("Prepared by…"). Your name is your account name; add a job title to show under it.`}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Display name</label>
                  <Input
                    value={presenterForm.name}
                    onChange={(e) => setPresenterForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Your name"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Job title</label>
                  <Input
                    value={presenterForm.jobTitle}
                    onChange={(e) => setPresenterForm((f) => ({ ...f, jobTitle: e.target.value }))}
                    placeholder="e.g. Product Lead"
                    maxLength={120}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSavePresenter} disabled={presenterMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
            </div>
          </SettingCard>

          {isAdmin && (
            <SettingCard
              icon={Palette}
              title="Branding"
              description="Your company name, logo, and accent color appear on the Reports presentation deck (townhall mode). Leave blank to use the ATRS defaults."
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Company name</label>
                    <Input
                      value={brandingForm.companyName}
                      onChange={(e) => setBrandingForm((f) => ({ ...f, companyName: e.target.value }))}
                      placeholder="e.g. bPlugins"
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Logo URL</label>
                    <Input
                      value={brandingForm.logoUrl}
                      onChange={(e) => setBrandingForm((f) => ({ ...f, logoUrl: e.target.value }))}
                      placeholder="https://… or /favicon.svg"
                    />
                  </div>
                </div>

                {/* Closing "Thank you" slide */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm">Closing "Thank you" slide</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Shown as the final slide of the deck.</p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={brandingForm.thankYouEnabled}
                        onChange={(e) => setBrandingForm((f) => ({ ...f, thankYouEnabled: e.target.checked }))}
                      />
                      <div className="relative w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  {brandingForm.thankYouEnabled && (
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Heading</label>
                        <Input
                          value={brandingForm.thankYouTitle}
                          onChange={(e) => setBrandingForm((f) => ({ ...f, thankYouTitle: e.target.value }))}
                          placeholder="Thank you"
                          maxLength={80}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Message</label>
                        <Input
                          value={brandingForm.thankYouMessage}
                          onChange={(e) => setBrandingForm((f) => ({ ...f, thankYouMessage: e.target.value }))}
                          placeholder="Questions & discussion"
                          maxLength={300}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Accent color — fixed swatch or dynamic per-product art */}
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <label className="text-sm font-medium">Accent color</label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tints the deck's glow, progress bar, and headings.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBrandingForm((f) => ({ ...f, accentDynamic: false }))}
                      className={`text-left rounded-lg border p-3 transition-colors ${!brandingForm.accentDynamic ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:bg-accent/40'}`}
                    >
                      <p className="text-sm font-medium">Fixed color</p>
                      <p className="text-xs text-muted-foreground mt-0.5">One accent color across every slide.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrandingForm((f) => ({ ...f, accentDynamic: true }))}
                      className={`text-left rounded-lg border p-3 transition-colors ${brandingForm.accentDynamic ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:bg-accent/40'}`}
                    >
                      <p className="text-sm font-medium flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> Dynamic</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Derived from each product's logo &amp; banner.</p>
                    </button>
                  </div>

                  {brandingForm.accentDynamic ? (
                    <p className="text-xs text-muted-foreground rounded-md bg-muted/50 border px-3 py-2">
                      Each product slide picks its accent automatically from the product's banner (or logo).
                      The summary and closing slides fall back to the fixed color below, if set.
                    </p>
                  ) : null}

                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="space-y-1" style={{ opacity: brandingForm.accentDynamic ? 0.5 : 1 }}>
                      <label className="text-sm font-medium">
                        {brandingForm.accentDynamic ? 'Fallback color' : 'Color'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandingForm.accentColor || '#146ef5'}
                          onChange={(e) => setBrandingForm((f) => ({ ...f, accentColor: e.target.value }))}
                          className="h-9 w-12 rounded-md border bg-background p-1 cursor-pointer"
                          aria-label="Accent color"
                        />
                        <Input
                          value={brandingForm.accentColor}
                          onChange={(e) => setBrandingForm((f) => ({ ...f, accentColor: e.target.value }))}
                          placeholder="#146ef5"
                          className="w-32"
                        />
                        {brandingForm.accentColor && (
                          <button
                            type="button"
                            onClick={() => setBrandingForm((f) => ({ ...f, accentColor: '' }))}
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {brandingForm.logoUrl && (
                        <img
                          src={brandingForm.logoUrl}
                          alt="Logo preview"
                          className="h-9 w-9 rounded-md object-contain border bg-muted"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                        />
                      )}
                      <Button onClick={handleSaveBranding} disabled={saveMutation.isPending}>
                        <Save className="w-4 h-4 mr-2" /> Save
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </SettingCard>
          )}
        </TabsContent>

        {/* ── System (admin) ───────────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="system" className="space-y-6">
            <SettingCard
              icon={PanelLeft}
              title="Navigation"
              description={`Controls how the nested product / changelog / report items behave in the sidebar for everyone. "Disabled" hides the nested items entirely.`}
            >
              <div className="flex items-center gap-2">
                <Select value={navMode} onValueChange={(v) => setNavMode(v as NavMode)}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expanded">Expanded by default</SelectItem>
                    <SelectItem value="collapsed">Collapsed by default</SelectItem>
                    <SelectItem value="disabled">Disabled (flat nav)</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSaveNav} disabled={saveMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
            </SettingCard>

            <SettingCard
              icon={Bell}
              title="Product Update Reminders"
              description="The dashboard flags products that haven't had a changelog update within this window, as a reminder to keep them current."
            >
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Flag as stale after</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={staleDays}
                      onChange={(e) => setStaleDays(Number(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">days without an update</span>
                  </div>
                </div>
                <Button onClick={handleSaveStale} disabled={saveMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
            </SettingCard>

            <SettingCard
              icon={Cloud}
              title="Media Storage"
              description="Where uploaded images and videos are stored. Local keeps files in the server's uploads folder; Cloudflare R2 uploads them to an R2 bucket and serves them from its public URL. Existing files stay where they are — only new uploads use the selected backend."
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStorageForm((f) => ({ ...f, provider: 'local' }))}
                    className={`text-left rounded-lg border p-3 transition-colors ${storageForm.provider === 'local' ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:bg-accent/40'}`}
                  >
                    <p className="text-sm font-medium flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> Local file system</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Files are saved to the server's <code>uploads/</code> folder.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStorageForm((f) => ({ ...f, provider: 'r2' }))}
                    className={`text-left rounded-lg border p-3 transition-colors ${storageForm.provider === 'r2' ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:bg-accent/40'}`}
                  >
                    <p className="text-sm font-medium flex items-center gap-1.5"><Cloud className="w-3.5 h-3.5" /> Cloudflare R2</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Files are uploaded to an R2 bucket via the S3 API.</p>
                  </button>
                </div>

                {storageForm.provider === 'r2' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-xs text-muted-foreground rounded-md bg-muted/50 border px-3 py-2">
                      Create an API token under <span className="font-medium">Cloudflare Dashboard → R2 → Manage R2 API Tokens</span> with
                      Object Read &amp; Write on your bucket, and enable public access (r2.dev subdomain or a custom domain) so uploaded
                      files can be viewed. Fields left blank fall back to <code>R2_*</code> variables in your <code>.env</code>.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Account ID</label>
                        <Input
                          value={storageForm.accountId}
                          onChange={(e) => setR2Field({ accountId: e.target.value })}
                          placeholder="Cloudflare account ID"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Bucket name</label>
                        <Input
                          value={storageForm.bucket}
                          onChange={(e) => setR2Field({ bucket: e.target.value })}
                          placeholder="e.g. atrs-media"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-sm font-medium">Public base URL</label>
                        <Input
                          value={storageForm.publicBaseUrl}
                          onChange={(e) => setR2Field({ publicBaseUrl: e.target.value })}
                          placeholder="https://pub-xxxxxxxx.r2.dev or https://media.yourdomain.com"
                        />
                        <p className="text-xs text-muted-foreground">
                          The URL your bucket is publicly served from. Stored media links are built from it.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Access Key ID</label>
                        <Input
                          autoComplete="off"
                          value={storageForm.accessKeyId}
                          onChange={(e) => setR2Field({ accessKeyId: e.target.value })}
                          placeholder="R2 access key ID"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Secret Access Key</label>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          value={storageForm.secretAccessKey}
                          onChange={(e) => setR2Field({ secretAccessKey: e.target.value })}
                          placeholder={storageForm.secretAccessKeySet ? '•••••••• (saved — enter a new key to replace)' : 'R2 secret access key'}
                        />
                        <p className="text-xs text-muted-foreground">
                          Encrypted at rest and never sent back to the browser.
                        </p>
                      </div>
                    </div>

                    {storageTestResult && (
                      <p className={`text-xs rounded-md border px-3 py-2 ${storageTestResult.ok ? 'text-green-700 dark:text-green-400 bg-green-500/10 border-green-500/30' : 'text-destructive bg-destructive/10 border-destructive/30'}`}>
                        {storageTestResult.ok ? '✓ ' : '✗ '}{storageTestResult.message}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  {storageForm.provider === 'r2' && (
                    <Button
                      variant="outline"
                      onClick={handleTestStorage}
                      disabled={storageTestMutation.isPending || saveMutation.isPending}
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      {storageTestMutation.isPending ? 'Testing...' : 'Test Connection'}
                    </Button>
                  )}
                  <Button onClick={handleSaveStorage} disabled={saveMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? 'Saving...' : 'Save Storage Settings'}
                  </Button>
                </div>
              </div>
            </SettingCard>

            <SettingCard
              icon={Server}
              title="System Configuration"
              description={<>Manage the backend port and database connection. Changing these updates your root <code>.env</code> and <code>app.config.json</code> and restarts the backend to apply settings.</>}
            >
              {configLoading ? (
                <div className="py-2 space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                  ))}
                </div>
              ) : isRestarting ? (
                <div className="py-8 text-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm font-semibold text-primary animate-pulse">Restarting background server...</p>
                  <p className="text-xs text-muted-foreground">Reconnecting to MongoDB and binding to new port. Please wait...</p>
                </div>
              ) : (
                <form onSubmit={handleSaveConfig} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Server Port</label>
                    <Input
                      type="number"
                      placeholder="e.g. 5000"
                      value={configForm.serverPort}
                      onChange={e => setConfigForm({...configForm, serverPort: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">MongoDB Connection URI</label>
                    <Input
                      type="text"
                      placeholder="mongodb://127.0.0.1:27017/atrs"
                      value={configForm.mongodbUri}
                      onChange={e => setConfigForm({...configForm, mongodbUri: e.target.value})}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={saveMutation.isPending}>
                      <Save className="w-4 h-4 mr-2" />
                      {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
                    </Button>
                  </div>
                </form>
              )}
            </SettingCard>
          </TabsContent>
        )}

        {/* ── Data ─────────────────────────────────────────────────── */}
        <TabsContent value="data" className="space-y-6">
          <SettingCard
            icon={Eraser}
            title="Clear local data"
            description="Resets preferences saved in this browser — theme, dark mode, sidebar state, list filters, the welcome tour, and cached data. You'll stay signed in. Affects only this device and can't be undone."
          >
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={handleClearLocalData}
                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              >
                <Eraser className="w-4 h-4 mr-2" />
                Clear data
              </Button>
            </div>
          </SettingCard>

          {isAdmin && (
            <SettingCard
              icon={Database}
              title="Full Database Export"
              description="Download a complete JSON dump of your database including all products, activities, audit logs, and versions. Useful for backups or migration."
            >
              <div className="flex justify-end">
                <Button onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </SettingCard>
          )}
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
}
