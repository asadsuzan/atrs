import { useTheme } from '../contexts/ThemeProvider';
import { motion } from 'framer-motion';
import PageTransition, { staggerContainer, staggerItem } from '../components/layout/PageTransition';
import { Check, Download, Database, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportAllData } from '../services/export';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getAppConfig, updateAppConfig } from '../services/config';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

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

  const [configForm, setConfigForm] = useState({
    serverPort: '',
    mongodbUri: ''
  });
  const [isRestarting, setIsRestarting] = useState(false);

  const { data: configData, isLoading: configLoading, refetch } = useQuery({
    queryKey: ['appConfig'],
    queryFn: getAppConfig,
    retry: false
  });

  useEffect(() => {
    if (configData) {
      setConfigForm({
        serverPort: String(configData.server?.port || 5000),
        mongodbUri: configData.server?.mongodbUri || ''
      });
    }
  }, [configData]);

  const saveMutation = useMutation({
    mutationFn: updateAppConfig,
    onSuccess: (res) => {
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

      <div className="pt-8 border-b pb-8">
        <h3 className="text-xl font-bold mb-4">System Configuration</h3>
        <div className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
          <p className="text-sm text-muted-foreground">
            Manage system-wide configuration, including the backend port and database connection. Changing these values will update your root <code>.env</code> and <code>app.config.json</code> files and automatically restart the backend process to apply settings.
          </p>
          
          {configLoading ? (
            <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">
              Loading configuration data...
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

      <div className="pt-8">
        <h3 className="text-xl font-bold mb-4">Data Management</h3>
        <div className="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
          <div className="flex items-start justify-between flex-col sm:flex-row gap-4">
            <div>
              <p className="font-semibold text-lg flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> Full Database Export</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg">Download a complete JSON dump of your database including all products, activities, audit logs, and versions. Useful for backups or migration.</p>
            </div>
            <Button onClick={exportAllData}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
