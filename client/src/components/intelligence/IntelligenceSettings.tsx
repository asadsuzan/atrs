import { useState, useEffect } from 'react';
import { useIntelligenceConfig, useUpdateIntelligenceConfig } from '../../hooks/useIntelligence';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Brain, Zap, Clock } from 'lucide-react';
import type { IntelligenceConfig } from '../../services/intelligence';

export function IntelligenceSettings() {
  const { data: config, isLoading } = useIntelligenceConfig();
  const updateMutation = useUpdateIntelligenceConfig();
  
  const [formData, setFormData] = useState<Partial<IntelligenceConfig>>({});

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  if (isLoading) {
    return <div className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl h-64"></div>;
  }

  const handleSave = () => {
    updateMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Intelligence settings saved successfully');
      },
      onError: () => {
        toast.error('Failed to save settings');
      }
    });
  };

  const updateField = (field: keyof IntelligenceConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNotification = (field: keyof IntelligenceConfig['notifications'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...(prev.notifications || {} as any),
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-500" />
            AI Background Analysis
          </CardTitle>
          <CardDescription>Configure how the AI agent analyzes your product data in the background.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Enable Auto Analysis</p>
              <p className="text-sm text-slate-500">Run automatic AI insights generation continuously</p>
            </div>
            <input 
              type="checkbox"
              className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              checked={formData.autoAnalysis || false}
              onChange={(e) => setFormData({ ...formData, autoAnalysis: e.target.checked })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                Analysis Frequency
              </label>
              <Select 
                value={formData.analysisFrequency || 'weekly'} 
                onValueChange={(val) => updateField('analysisFrequency', val)}
                disabled={!formData.autoAnalysis}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-slate-500" />
                Analysis Time (Hour)
              </label>
              <Select 
                value={String(formData.analysisHour || 3)} 
                onValueChange={(val) => updateField('analysisHour', parseInt(val))}
                disabled={!formData.autoAnalysis}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select hour" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(24)].map((_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i.toString().padStart(2, '0')}:00 (UTC)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications & Alerts</CardTitle>
          <CardDescription>When should the AI assistant notify you?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-medium text-sm">Critical Anomalies</p>
              <p className="text-xs text-muted-foreground">Alert when health scores drop suddenly</p>
            </div>
            <input 
              type="checkbox"
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer mt-1"
              checked={formData.notifications?.anomalies || false}
              onChange={(e) => updateNotification('anomalies', e.target.checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-medium text-sm">New Recommendations</p>
              <p className="text-xs text-muted-foreground">Notify when high-impact actions are found</p>
            </div>
            <input 
              type="checkbox"
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer mt-1"
              checked={formData.notifications?.recommendations || false}
              onChange={(e) => updateNotification('recommendations', e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-medium text-sm">Weekly Digest</p>
              <p className="text-xs text-muted-foreground">Summary of product health and insights</p>
            </div>
            <input 
              type="checkbox"
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer mt-1"
              checked={formData.notifications?.weeklyDigest || false}
              onChange={(e) => updateNotification('weeklyDigest', e.target.checked)}
            />
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="space-y-0.5">
              <p className="font-medium text-sm">Competitor Alerts</p>
              <p className="text-xs text-muted-foreground">Notify when competitors ship major features</p>
            </div>
            <input 
              type="checkbox"
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer mt-1"
              checked={formData.notifications?.competitorAlerts || false}
              onChange={(e) => updateNotification('competitorAlerts', e.target.checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={updateMutation.isPending}
          className="gap-2"
        >
          {updateMutation.isPending ? (
            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
