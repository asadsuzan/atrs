import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProductById } from '../services/products';
import { getActivities } from '../services/activities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, GitBranch, Globe, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { MediaLightbox } from '@/components/ui/media-lightbox';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition, { staggerContainer, staggerItem } from '../components/layout/PageTransition';
import { MarketingManager } from '../components/marketing/MarketingManager';

export default function ProductDetails() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'activities' | 'marketing'>('activities');

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
    queryFn: () => getActivities({ productId: id, limit: -1 }),
    enabled: !!id,
  });

  if (productLoading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;

  const activities = activitiesData?.data || [];
  const features = activities.filter((a: any) => a.type === 'feature') || [];
  const improvements = activities.filter((a: any) => a.type === 'improvement') || [];
  const bugFixes = activities.filter((a: any) => a.type === 'bug-fix') || [];

  const ActivityCard = ({ act, colorClass }: { act: any, colorClass: string }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <motion.div variants={staggerItem} layout>
        <Card>
          <CardHeader 
            className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors" 
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-lg">{act.title}</h4>
                    {act.tier === 'pro' && (
                      <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white border-none uppercase text-[10px] px-1.5 py-0 h-4 shrink-0">PRO</Badge>
                    )}
                    {act.tags?.includes('released') && (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white border-none uppercase text-[10px] px-1.5 py-0 h-4 shrink-0">RELEASED</Badge>
                    )}
                    {act.tags?.includes('unreleased') && (
                      <Badge variant="default" className="bg-slate-500 hover:bg-slate-600 text-white border-none uppercase text-[10px] px-1.5 py-0 h-4 shrink-0">UNRELEASED</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{new Date(act.activityDate).toLocaleDateString()}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 -mr-2">
                <motion.div animate={{ rotate: isOpen ? 0 : -180 }} transition={{ duration: 0.3 }}>
                  <ChevronUp className="w-4 h-4" />
                </motion.div>
              </Button>
            </div>
          </CardHeader>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <CardContent className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">{act.shortDescription}</p>
                  {act.mediaUrl && (
                    <div className="p-1.5 bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-950 border border-border/50 rounded-xl shadow-sm max-w-sm mb-4">
                      <MediaLightbox mediaUrl={act.mediaUrl} mediaType={act.mediaType || 'image'}>
                        <div className="rounded-lg overflow-hidden bg-muted relative border border-border/20">
                          {act.mediaType === 'video' ? (
                            <video src={act.mediaUrl} className="w-full h-auto object-cover pointer-events-none" />
                          ) : (
                            <img src={act.mediaUrl} alt={act.title} className="w-full h-auto object-cover" />
                          )}
                        </div>
                      </MediaLightbox>
                    </div>
                  )}
                  {act.items && act.items.length > 0 && (
                    <div className="space-y-4 pt-2">
                      {act.items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-muted/30 p-3 rounded-md">
                          <h5 className="font-medium text-sm">{item.title}</h5>
                          {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                          {item.mediaUrl && (
                            <div className="p-1 bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-950 border border-border/50 rounded-xl shadow-sm max-w-sm mt-3">
                              <MediaLightbox mediaUrl={item.mediaUrl} mediaType={item.mediaType || 'image'}>
                                <div className="rounded-lg overflow-hidden bg-muted relative border border-border/20">
                                  {item.mediaType === 'video' ? (
                                    <video src={item.mediaUrl} className="w-full h-auto pointer-events-none" />
                                  ) : (
                                    <img src={item.mediaUrl} alt={item.title} className="w-full h-auto object-cover" />
                                  )}
                                </div>
                              </MediaLightbox>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    );
  };

  const ActivitySection = ({ title, items: typeActs, colorClass }: { title: string, items: any[], colorClass: string }) => {
    const [isOpen, setIsOpen] = useState(true);
    if (typeActs.length === 0) return null;
    return (
      <div className="space-y-4 mb-8">
        <h3 
          className={`text-xl font-semibold flex items-center gap-2 ${colorClass} cursor-pointer select-none hover:opacity-80 transition-opacity w-fit`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronDown className="w-5 h-5 shrink-0" /> : <ChevronRight className="w-5 h-5 shrink-0" />} 
          {title} <Badge variant="secondary">{typeActs.length}</Badge>
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
                <motion.div 
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-4 mt-4"
                >
                  {typeActs.map((act: any) => (
                    <ActivityCard key={act._id} act={act} colorClass={colorClass} />
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
      </div>
    );
  };

  return (
    <PageTransition>
    <div className="space-y-6">
      <Button variant="ghost" asChild className="mb-4 -ml-4">
        <Link to="/products">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Products
        </Link>
      </Button>

      <div className="bg-white border rounded-lg overflow-hidden mb-8 shadow-sm">
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
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
               {wpData && wpData.name ? wpData.name : product.name.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </h1>
            <p className="text-sm text-gray-500">
               By <span className="text-blue-600 font-medium hover:underline cursor-pointer">{wpData && wpData.author ? wpData.author.replace(/(<([^>]+)>)/gi, "") : 'bPlugins'}</span>
            </p>
            
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
            className={`pb-2 text-lg font-bold border-b-2 transition-colors ${activeTab === 'marketing' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('marketing')}
          >
            Marketing Hub
          </button>
        </div>

        {activeTab === 'activities' && (
          <div className="space-y-6">
            {activitiesLoading ? (
              <div>Loading activities...</div>
            ) : activities.length === 0 ? (
              <div className="text-muted-foreground">No activities recorded for this product yet.</div>
            ) : (
              <div>
                <ActivitySection title="Features" items={features} colorClass="text-blue-600 dark:text-blue-400" />
                <ActivitySection title="Improvements" items={improvements} colorClass="text-purple-600 dark:text-purple-400" />
                <ActivitySection title="Bug Fixes" items={bugFixes} colorClass="text-red-600 dark:text-red-400" />
              </div>
            )}
          </div>
        )}

        {activeTab === 'marketing' && id && (
          <MarketingManager productId={id} />
        )}
      </div>
    </div>
    </PageTransition>
  );
}
