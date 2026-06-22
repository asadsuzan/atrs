import { useTheme } from '../contexts/ThemeProvider';
import { motion } from 'framer-motion';
import PageTransition, { staggerContainer, staggerItem } from '../components/layout/PageTransition';
import { Check, Download, Database, Save, Volume2, VolumeX, Play, PanelLeft, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportAllData } from '../services/export';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAppConfig, updateAppConfig, type NavMode } from '../services/config';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '../contexts/AuthContext';
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

export default function Settings() {
  const { theme, setTheme, isDark, setIsDark, isAutoDark, setIsAutoDark } = useTheme();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [isMuted, setIsMuted] = useState(isUserMuted());
  const [configForm, setConfigForm] = useState({ serverPort: '5000', mongodbUri: '' });
  const [navMode, setNavMode] = useState<NavMode>('expanded');
  const [trackerForm, setTrackerForm] = useState({ enabled: false, model: 'qwen2.5-coder' });
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
      if (configData.codeTracker) {
        setTrackerForm({
          enabled: !!configData.codeTracker.enabled,
          model: configData.codeTracker.model || 'qwen2.5-coder',
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

      // Code-tracker preference: no restart; refresh its status.
      if (variables.codeTracker) {
        toast.success("Code Activity Tracker settings saved");
        queryClient.invalidateQueries({ queryKey: ['code-tracker'] });
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

  const handleSaveTracker = () => {
    saveMutation.mutate({ codeTracker: trackerForm });
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
    <PageTransition className="space-y-8 max-w-4xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-6 border-b pb-4">Settings</h2>
        
        <h3 className="text-xl font-bold mb-4">Appearance</h3>
        <div className="space-y-6 bg-card p-6 rounded-xl border shadow-sm mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">Auto Dark Mode</p>
              <p className="text-sm text-muted-foreground mt-1">Automatically switch between light and dark themes when your system does.</p>
            </div>
            <button 
              onClick={() => setIsAutoDark(!isAutoDark)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isAutoDark ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isAutoDark ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="border-t pt-6 flex items-center justify-between opacity-100 transition-opacity" style={{ opacity: isAutoDark ? 0.5 : 1 }}>
            <div>
              <p className="font-semibold text-lg">Dark Mode</p>
              <p className="text-sm text-muted-foreground mt-1">Manually enable or disable dark mode.</p>
            </div>
            <button 
              onClick={() => {
                if (!isAutoDark) setIsDark(!isDark);
              }}
              disabled={isAutoDark}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isDark && !isAutoDark ? 'bg-primary' : 'bg-muted-foreground/30'} disabled:cursor-not-allowed`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isDark && !isAutoDark ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="pt-2 border-b pb-8">
        <h3 className="text-xl font-bold mb-6">Your themes</h3>
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8"
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
                    <div className="absolute top-2 right-2 bg-white rounded-full p-0.5 shadow-md">
                      <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />
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
      </div>

      {/* Sound Preferences */}
      <div className="pt-2 border-b pb-8">
        <h3 className="text-xl font-bold mb-4">Sound</h3>
        <div className="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg flex items-center gap-2">
                {isMuted ? <VolumeX className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-primary" />}
                Sound Effects
              </p>
              <p className="text-sm text-muted-foreground mt-1">Play audio feedback for actions like creating, deleting, and notifications.</p>
            </div>
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
      </div>

      {isAdmin && (
        <div className="pt-8">
          <h3 className="text-xl font-bold mb-4">Navigation</h3>
          <div className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <PanelLeft className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-semibold">Nested sidebar navigation</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Controls how the nested product / changelog / report items behave in the sidebar
                    for everyone. "Disabled" hides the nested items entirely.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="pt-8">
          <h3 className="text-xl font-bold mb-4">Code Activity Tracker</h3>
          <div className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Code2 className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-semibold">Watch repos &amp; auto-draft changelogs</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Watches each product's local repo path and uses a local Ollama model to turn saved
                    edits into draft changelog entries. Requires Ollama running locally.
                  </p>
                </div>
              </div>
              <label className="inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={trackerForm.enabled}
                  onChange={(e) => setTrackerForm((f) => ({ ...f, enabled: e.target.checked }))}
                />
                <div className="relative w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium">Ollama model</label>
                <Input
                  value={trackerForm.model}
                  onChange={(e) => setTrackerForm((f) => ({ ...f, model: e.target.value }))}
                  placeholder="qwen2.5-coder"
                />
                <p className="text-xs text-muted-foreground">
                  Pull it first: <code>ollama pull {trackerForm.model || 'qwen2.5-coder'}</code>. Set a repo path per product to start tracking.
                </p>
              </div>
              <Button onClick={handleSaveTracker} disabled={saveMutation.isPending}>
                <Save className="w-4 h-4 mr-2" /> Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
      <div className="pt-8 border-b pb-8">
        <h3 className="text-xl font-bold mb-4">System Configuration</h3>
        <div className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
          <p className="text-sm text-muted-foreground">
            Manage system-wide configuration, including the backend port and database connection. Changing these values will update your root <code>.env</code> and <code>app.config.json</code> files and automatically restart the backend process to apply settings.
          </p>
          
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
        </div>
      </div>
      )}

      {/* Admin Sound Configuration */}
      {isAdmin && (
      <div className="pt-8 border-b pb-8">
        <h3 className="text-xl font-bold mb-4">Global Sound Configuration</h3>
        <div className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
          <p className="text-sm text-muted-foreground">Configure system-wide sound settings. These apply to all users. Individual users can still mute sounds from their personal settings.</p>
          <form onSubmit={handleSaveSounds} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Global Sounds Enabled</label>
                <p className="text-xs text-muted-foreground">Master toggle — disabling removes sounds for everyone.</p>
              </div>
              <button
                type="button"
                onClick={() => setSoundsForm({...soundsForm, enabled: !soundsForm.enabled})}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${soundsForm.enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
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
        </div>
      </div>
      )}

      {isAdmin && (
      <div className="pt-8">
        <h3 className="text-xl font-bold mb-4">Data Management</h3>
        <div className="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
          <div className="flex items-start justify-between flex-col sm:flex-row gap-4">
            <div>
              <p className="font-semibold text-lg flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> Full Database Export</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg">Download a complete JSON dump of your database including all products, activities, audit logs, and versions. Useful for backups or migration.</p>
            </div>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </div>
      )}
    </PageTransition>
  );
}
