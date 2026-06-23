import { useParams, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getProductById } from '../services/products';
import { getActivities, reorderActivity, updateActivity, deleteActivity } from '../services/activities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActivityForm } from '../components/activities/ActivityForm';
import { ArrowLeft, GitBranch, Globe, ChevronDown, ChevronRight, Download, GripVertical, Tag, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/layout/PageTransition';
import { MarketingManager } from '../components/marketing/MarketingManager';
import { VersionManager } from '../components/versions/VersionManager';
import { WpReadmeViewer } from '../components/products/WpReadmeViewer';
import { ReleasePublish } from '../components/products/ReleasePublish';
import { MediaCarousel } from '@/components/ui/media-carousel';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { playSound } from '@/lib/sound';
import { useConfirm } from '../contexts/ConfirmContext';
import { ProductDetailsSkeleton, ProductActivitiesSkeleton } from '@/components/ui/skeletons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableActivityCard = ({ act, isActive, onClick, onEdit, onDelete }: { act: any, isActive: boolean, onClick: () => void, onEdit: (act: any) => void, onDelete: (act: any) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: act._id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      id={`activity-${act._id}`} 
      className={cn(
        "transition-all duration-300 h-full cursor-pointer",
        isActive ? "scale-[1.02]" : "hover:-translate-y-1"
      )}
      onClick={onClick}
    >
      <div className={cn(
        "bg-card text-card-foreground border rounded-[12px] p-6 h-full flex flex-col group relative transition-all duration-300",
        isActive
          ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl shadow-primary/10"
          : "border-border shadow-sm hover:shadow-md"
      )}>
        <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
           <button
             type="button"
             aria-label={`Edit ${act.title}`}
             onClick={(e) => { e.stopPropagation(); onEdit(act); }}
             className="text-muted-foreground hover:text-foreground p-1 bg-muted rounded-md border"
           >
             <Edit2 className="w-4 h-4" />
           </button>
           <button
             type="button"
             aria-label={`Delete ${act.title}`}
             onClick={(e) => { e.stopPropagation(); onDelete(act); }}
             className="text-muted-foreground hover:text-destructive p-1 bg-muted rounded-md border"
           >
             <Trash2 className="w-4 h-4" />
           </button>
           <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 bg-muted rounded-md border">
             <GripVertical className="w-4 h-4" />
           </div>
        </div>

        {/* Media Presentation at the top */}
        {(() => {
          const urls = act.mediaUrls?.length ? act.mediaUrls : (act.mediaUrl ? [act.mediaUrl] : []);
          if (urls.length === 0) return null;
          return (
            <div className="mb-5 -mx-2">
              <MediaCarousel urls={urls} title={act.title} />
            </div>
          );
        })()}

        {/* Typography & Hierarchy */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2 pr-8">
            <h4 className="font-semibold text-[18px] text-foreground leading-tight">{act.title}</h4>
            {act.versionId?.label && <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">{act.versionId.label}</span>}
            {act.tier === 'pro' && <span className="bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">PRO</span>}
            {act.tags?.includes('released') && <span className="bg-green-100 text-green-800 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">RELEASED</span>}
            {act.tags?.includes('unreleased') && <span className="bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">UNRELEASED</span>}
          </div>
          
          <p className="text-[14px] text-muted-foreground uppercase tracking-wider font-medium mb-3">
            {new Date(act.activityDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <p className="text-[14px] text-muted-foreground leading-[1.6]">{act.shortDescription}</p>

          {/* Sub-items */}
          {act.items && act.items.length > 0 && (
            <div className="mt-8 space-y-4">
              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Included Items</h5>
              {act.items.map((item: any, idx: number) => (
                <div key={idx} className="bg-muted/50 border border-border rounded-xl p-4 transition-colors hover:bg-muted">
                  {(() => {
                    const itemUrls = item.mediaUrls?.length ? item.mediaUrls : (item.mediaUrl ? [item.mediaUrl] : []);
                    if (itemUrls.length === 0) return null;
                    return (
                      <div className="mb-4">
                        <MediaCarousel urls={itemUrls} title={item.title} />
                      </div>
                    );
                  })()}
                  <h6 className="font-semibold text-[15px] text-foreground">{item.title}</h6>
                  {item.description && <p className="text-[14px] text-muted-foreground leading-[1.6] mt-1.5">{item.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ActivitySection = ({ title, items: typeActs, colorClass, activeCardId, onCardClick, onEdit, onDelete }: { title: string, items: any[], colorClass: string, activeCardId: string | null, onCardClick: (id: string) => void, onEdit: (act: any) => void, onDelete: (act: any) => void }) => {
  const [isOpen, setIsOpen] = useState(true);
  if (typeActs.length === 0) return null;
  return (
    <div className="space-y-4 mb-10">
      <h3 
        className={`text-xl font-semibold flex items-center gap-2 ${colorClass} cursor-pointer select-none hover:opacity-80 transition-opacity w-fit`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown className="w-5 h-5 shrink-0" /> : <ChevronRight className="w-5 h-5 shrink-0" />} 
        {title} <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium ml-1">{typeActs.length}</span>
      </h3>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-2 pb-4">
              <SortableContext items={typeActs.map(a => a._id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  {typeActs.map((act: any) => (
                    <SortableActivityCard
                      key={act._id}
                      act={act}
                      isActive={activeCardId === act._id}
                      onClick={() => onCardClick(act._id)}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function ProductDetails() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'activities' | 'marketing' | 'versions' | 'readme' | 'release'>('activities');
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [versionFilter, setVersionFilter] = useState<string>('all');
  const [editingActivity, setEditingActivity] = useState<any>(null);

  const updateMutation = useMutation({
    mutationFn: updateActivity,
    onSuccess: () => {
      playSound('success');
      toast.success('Changelog entry updated successfully');
      queryClient.invalidateQueries({ queryKey: ['activities', id] });
      setEditingActivity(null);
    },
    onError: () => {
      playSound('error');
      toast.error('Failed to update changelog entry');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteActivity,
    onSuccess: () => {
      playSound('delete');
      toast.success('Changelog entry deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['activities', id] });
    },
    onError: () => {
      playSound('error');
      toast.error('Failed to delete changelog entry');
    },
  });

  const handleEditActivity = (act: any) => {
    setEditingActivity({
      ...act,
      productId: act.productId?._id || id,
      versionId: typeof act.versionId === 'object' ? act.versionId?._id : act.versionId,
      activityDate: format(new Date(act.activityDate), 'yyyy-MM-dd'),
      tags: act.tags || [],
    });
  };

  const handleDeleteActivity = async (act: any) => {
    if (await confirm({ title: 'Delete Changelog Entry', description: 'Are you sure you want to permanently delete this changelog entry?' })) {
      deleteMutation.mutate(act._id);
    }
  };

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductById(id as string),
  });

  const { data: wpData } = useQuery({
    queryKey: ['wp-plugin', product?.wpOrgSlug],
    queryFn: async () => {
      if (!product?.wpOrgSlug) return null;
      try {
        const res = await fetch(`https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request[slug]=${product.wpOrgSlug}`);
        if (!res.ok) return null;
        return res.json();
      } catch (e) {
        return null;
      }
    },
    enabled: !!product?.wpOrgSlug,
  });

  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['activities', id],
    queryFn: () => getActivities({ productId: id, limit: -1, sortBy: 'displayOrder', sortOrder: 'asc' }),
    enabled: !!id,
  });

  const location = useLocation();

  // Allow the sidebar (and any link) to deep-link to a tab via ?tab=.
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'activities' || tab === 'versions' || tab === 'marketing' || tab === 'readme' || tab === 'release') {
      setActiveTab(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (activitiesData && location.hash && activeTab === 'activities') {
      const targetId = location.hash.replace('#', '');
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 2000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activitiesData, location.hash, activeTab]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    // Dropping outside any sortable target -> no-op (over is null).
    if (!over || active.id === over.id) return;

    const list: any[] = activitiesData?.data || [];
    const act = list.find((a: any) => a._id === active.id);
    const overAct = list.find((a: any) => a._id === over.id);
    if (!act || !overAct) return;

    // Cards are rendered grouped by type. Reorder only within the active card's
    // type group so it lands where it was dropped (computing against the global
    // mixed list would land it at the wrong position).
    const group = list.filter((a: any) => a.type === act.type);
    const targetIndex = group.findIndex((a: any) => a._id === over.id);
    if (targetIndex === -1) return;

    try {
      await reorderActivity(act._id, targetIndex);
      queryClient.invalidateQueries({ queryKey: ['activities', id] });
    } catch (err) {
      console.error('Failed to reorder activity:', err);
      toast.error('Failed to reorder activity');
    }
  };

  const exportChangelog = () => {
    if (!activitiesData?.data) return;
    let markdown = `# Changelog - ${product?.name}\n\n`;
    activitiesData.data.forEach((act: any) => {
      markdown += `## ${act.title}\n`;
      const versionPart = act.versionId?.label ? ` | Version: ${act.versionId.label}` : '';
      markdown += `*Date: ${new Date(act.activityDate).toLocaleDateString()} | Type: ${act.type}${versionPart}*\n\n`;
      markdown += `${act.shortDescription}\n\n`;
    });
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product?.slug}-changelog.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (productLoading) return <ProductDetailsSkeleton />;
  if (!product) return <div>Product not found</div>;

  const allActivities = activitiesData?.data || [];

  // Distinct version labels present across this product's activities, used to
  // populate the changelog version filter ("__none__" groups unversioned ones).
  const versionOptions: string[] = Array.from(
    new Set(allActivities.map((a: any) => a.versionId?.label).filter(Boolean) as string[])
  ).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const hasUnversioned = allActivities.some((a: any) => !a.versionId?.label);

  const activities = allActivities.filter((a: any) => {
    if (versionFilter === 'all') return true;
    if (versionFilter === '__none__') return !a.versionId?.label;
    return a.versionId?.label === versionFilter;
  });
  const features = activities.filter((a: any) => a.type === 'feature') || [];
  const improvements = activities.filter((a: any) => a.type === 'improvement') || [];
  const bugFixes = activities.filter((a: any) => a.type === 'bug-fix') || [];



  return (
    <PageTransition>
    <div className="space-y-6">
      <Button variant="ghost" asChild className="mb-4 -ml-4">
        <Link to="/products">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Products
        </Link>
      </Button>

      <div className="bg-card text-card-foreground border rounded-lg overflow-hidden mb-8 shadow-sm">
        {product.banner ? (
          <div className="w-full h-[375px] bg-muted relative">
            <img src={product.banner} alt={`${product.name} Banner`} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-[375px] bg-blue-50/50 flex flex-col items-center justify-center text-muted-foreground border-b relative overflow-hidden">
             <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" style={{ backgroundSize: '30px 30px', backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)'}}></div>
             <div className="z-10 text-xl font-semibold opacity-50">{product.name}</div>
          </div>
        )}

        <div className="p-6 flex flex-col md:flex-row md:items-start gap-6">
          {product.icon ? (
            <img src={product.icon} alt="Icon" className="w-[100px] h-[100px] rounded-md object-cover flex-shrink-0 bg-white border shadow-sm" />
          ) : (
            <div className="w-[100px] h-[100px] rounded-md bg-zinc-800 flex items-center justify-center text-white font-bold flex-shrink-0 text-3xl">
               {product.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          
          <div className="flex-1 space-y-1">
            <h1 className="text-2xl font-bold text-foreground leading-tight">
               {wpData && wpData.name ? wpData.name : product.name.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </h1>
            <p className="text-sm text-muted-foreground">
               By <span className="text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer">{wpData && wpData.author ? wpData.author.replace(/(<([^>]+)>)/gi, "") : 'bPlugins'}</span>
            </p>
            {product.description && <p className="text-muted-foreground text-sm mt-2">{product.description}</p>}
            
            <div className="flex gap-4 mt-3 pt-2">
              <Badge variant="outline" className="capitalize">{product.category}</Badge>
              <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                {product.status}
              </Badge>
              <a href={product.githubUrl} target="_blank" rel="noreferrer" className="flex items-center text-muted-foreground hover:text-primary transition-colors" title="GitHub Repository">
                <GitBranch className="w-5 h-5" />
              </a>
              {product.wpOrgSlug && (
                <a href={`https://wordpress.org/plugins/${product.wpOrgSlug}`} target="_blank" rel="noreferrer" className="flex items-center text-muted-foreground hover:text-primary transition-colors" title="WordPress.org Page">
                  <Globe className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
          
          {/* <div className="w-full md:w-[250px] shrink-0">
            <Card className="h-full">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Activity Distribution</CardTitle>
              </CardHeader>
              <CardContent className="py-0 px-4 pb-3">
                <DonutChart data={{ features: features.length, improvements: improvements.length, bugFixes: bugFixes.length }} />
              </CardContent>
            </Card>
          </div> */}
        </div>
      </div>

      <div className="pt-2">
        <div className="flex space-x-4 border-b mb-6 pb-2">
          <button 
            className={`pb-2 text-lg font-bold border-b-2 transition-colors ${activeTab === 'activities' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('activities')}
          >
            Activity Timeline
          </button>
          <button 
            className={`pb-2 text-lg font-bold border-b-2 transition-colors ${activeTab === 'versions' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('versions')}
          >
            Versions
          </button>
          <button
            className={`pb-2 text-lg font-bold border-b-2 transition-colors ${activeTab === 'marketing' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('marketing')}
          >
            Marketing Hub
          </button>
          <button
            className={`pb-2 text-lg font-bold border-b-2 transition-colors ${activeTab === 'release' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('release')}
          >
            Release
          </button>
          {product?.wpReadme && (
            <button 
              className={`pb-2 text-lg font-bold border-b-2 transition-colors ${activeTab === 'readme' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('readme')}
            >
              Readme
            </button>
          )}
        </div>

        {activeTab === 'activities' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              {(versionOptions.length > 0 || hasUnversioned) ? (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <Select value={versionFilter} onValueChange={setVersionFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All versions</SelectItem>
                      {versionOptions.map((label, i) => (
                        <SelectItem key={label} value={label}>
                          <span className="flex items-center gap-2">
                            {label}
                            {i === 0 && <span className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">Latest</span>}
                          </span>
                        </SelectItem>
                      ))}
                      {hasUnversioned && <SelectItem value="__none__">Unversioned</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              ) : <div />}
              <Button variant="outline" size="sm" onClick={exportChangelog}>
                <Download className="w-4 h-4 mr-2" /> Export Changelog
              </Button>
            </div>
            {activitiesLoading ? (
              <ProductActivitiesSkeleton />
            ) : allActivities.length === 0 ? (
              <div className="text-muted-foreground">No activities recorded for this product yet.</div>
            ) : activities.length === 0 ? (
              <div className="text-muted-foreground">No activities found for the selected version.</div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <ActivitySection title="Features" items={features} colorClass="text-blue-600 dark:text-blue-400" activeCardId={activeCardId} onCardClick={setActiveCardId} onEdit={handleEditActivity} onDelete={handleDeleteActivity} />
                <ActivitySection title="Improvements" items={improvements} colorClass="text-purple-600 dark:text-purple-400" activeCardId={activeCardId} onCardClick={setActiveCardId} onEdit={handleEditActivity} onDelete={handleDeleteActivity} />
                <ActivitySection title="Bug Fixes" items={bugFixes} colorClass="text-red-600 dark:text-red-400" activeCardId={activeCardId} onCardClick={setActiveCardId} onEdit={handleEditActivity} onDelete={handleDeleteActivity} />
              </DndContext>
            )}
          </div>
        )}

        {activeTab === 'versions' && id && (
          <VersionManager productId={id} />
        )}

        {activeTab === 'marketing' && id && (
          <MarketingManager productId={id} />
        )}

        {activeTab === 'release' && id && (
          <ReleasePublish productId={id} />
        )}

        {activeTab === 'readme' && product?.wpReadme && (
          <WpReadmeViewer content={product.wpReadme} />
        )}
      </div>

      <Dialog open={!!editingActivity} onOpenChange={(open: boolean) => !open && setEditingActivity(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Changelog Entry</DialogTitle>
          </DialogHeader>
          {editingActivity && (
            <ActivityForm
              key={editingActivity._id}
              initialData={editingActivity}
              onSubmit={(data: any) => {
                if (!data.mediaType) data.mediaType = null;
                if (!data.mediaUrl) data.mediaUrl = null;
                updateMutation.mutate({ id: editingActivity._id, ...data });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
    </PageTransition>
  );
}
