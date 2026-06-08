import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMonthlyReport } from '../services/reports';
import { getProducts } from '../services/products';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, PlusCircle, Wrench, Bug, Calendar as CalendarIcon, ChevronDown, ChevronUp, ChevronRight, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MediaLightbox } from '@/components/ui/media-lightbox';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import pptxgen from 'pptxgenjs';
import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition, { staggerContainer, staggerItem } from '../components/layout/PageTransition';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReportsSkeleton } from '@/components/ui/skeletons';

export default function Reports() {
  const currentDate = new Date();
  const [month, setMonth] = useLocalStorage<string>('atrs_filter_month', (currentDate.getMonth() + 1).toString());
  const [year, setYear] = useLocalStorage<string>('atrs_filter_year', currentDate.getFullYear().toString());
  const [productId, setProductId] = useLocalStorage<string>('atrs_filter_productId', 'all');
  
  const [queryArgs, setQueryArgs] = useState({ 
    month: parseInt(month, 10), 
    year: parseInt(year, 10), 
    productId 
  });
  
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => getProducts() });
  const products = productsData?.data || [];

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', queryArgs],
    queryFn: () => getMonthlyReport({
      month: queryArgs.month,
      year: queryArgs.year,
      productId: queryArgs.productId !== 'all' ? queryArgs.productId : undefined,
    }),
  });

  const handleGenerate = () => {
    setQueryArgs({
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      productId,
    });
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const summary = report?.summary || { products: 0, features: 0, improvements: 0, bugFixes: 0, totalActivities: 0 };

  const handleExportJSON = () => {
    if (!report) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `Monthly_Report_${months[queryArgs.month - 1]}_${queryArgs.year}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportWebpage = () => {
    if (!reportRef.current) return;
    const htmlContent = reportRef.current.innerHTML;
    const fullHtml = `<!DOCTYPE html><html><head><title>Monthly Report</title><style>body { font-family: sans-serif; padding: 20px; }</style></head><body>${htmlContent}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Monthly_Report_${months[queryArgs.month - 1]}_${queryArgs.year}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Monthly_Report_${months[queryArgs.month - 1]}_${queryArgs.year}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    }
  };

  const handleExportDOC = () => {
    if (!reportRef.current) return;
    const htmlContent = reportRef.current.innerHTML;
    const fullHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Monthly Report</title></head><body>${htmlContent}</body></html>`;
    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Monthly_Report_${months[queryArgs.month - 1]}_${queryArgs.year}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPPT = () => {
    if (!report) return;
    const pres = new pptxgen();
    
    const slide = pres.addSlide();
    slide.addText(`Monthly Report: ${months[queryArgs.month - 1]} ${queryArgs.year}`, { x: 1, y: 1, w: '80%', h: 1, fontSize: 36, bold: true });
    slide.addText(`Total Products: ${summary.products}`, { x: 1, y: 2.5, w: '80%', fontSize: 18 });
    slide.addText(`Total Features: ${summary.features}`, { x: 1, y: 3.0, w: '80%', fontSize: 18 });
    slide.addText(`Total Improvements: ${summary.improvements}`, { x: 1, y: 3.5, w: '80%', fontSize: 18 });
    slide.addText(`Total Bug Fixes: ${summary.bugFixes}`, { x: 1, y: 4.0, w: '80%', fontSize: 18 });

    if (report.details && Array.isArray(report.details)) {
      report.details.forEach((productReport: any) => {
        const pSlide = pres.addSlide();
        pSlide.addText(`${productReport.product.name} Activities`, { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true });
        
        let yPos = 1.5;
        const addActivities = (acts: any[], type: string) => {
          if (acts && acts.length > 0) {
            pSlide.addText(`${type}:`, { x: 0.5, y: yPos, w: '90%', fontSize: 16, bold: true });
            yPos += 0.5;
            acts.forEach(act => {
              pSlide.addText(`• ${act.title}`, { x: 1.0, y: yPos, w: '80%', fontSize: 14 });
              yPos += 0.4;
              if (yPos > 5) {
                // simple pagination approximation
                pSlide.addText(`(continued on next slide...)`, { x: 1.0, y: yPos, w: '80%', fontSize: 12, italic: true });
              }
            });
            yPos += 0.2;
          }
        };

        addActivities(productReport.activities?.features, 'Features');
        addActivities(productReport.activities?.improvements, 'Improvements');
        addActivities(productReport.activities?.bugFixes, 'Bug Fixes');
      });
    }
    pres.writeFile({ fileName: `Monthly_Report_${months[queryArgs.month - 1]}_${queryArgs.year}.pptx` });
  };

  const ReportActivityCard = ({ act }: { act: any }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <motion.div variants={staggerItem} layout>
        <Card className="bg-card">
          <CardHeader 
            className="p-4 pb-2 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{act.title}</CardTitle>
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
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <CalendarIcon className="w-3 h-3" />
                  {new Date(act.activityDate).toLocaleDateString()}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 -mr-2 -mt-2">
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
                <CardContent className="p-4 pt-0 space-y-3">
                  <p className="text-sm text-muted-foreground">{act.shortDescription}</p>
                  {act.mediaUrl && (
                    <div className="p-1.5 bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-950 border border-border/50 rounded-xl shadow-sm mb-4">
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
                  {act.items?.length > 0 && (
                    <div className="space-y-4 pt-2">
                      {act.items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-muted/30 p-3 rounded-md">
                          <h5 className="font-medium text-sm">{item.title}</h5>
                          {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                          {item.mediaUrl && (
                            <div className="mt-3 p-1 bg-white dark:bg-zinc-900 border border-border/50 rounded-lg shadow-sm">
                              <MediaLightbox mediaUrl={item.mediaUrl} mediaType={item.mediaType || 'image'}>
                                <div className="rounded-md overflow-hidden bg-muted border border-border/20">
                                  {item.mediaType === 'video' ? (
                                    <video src={item.mediaUrl} className="w-full h-auto object-cover pointer-events-none" />
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

  const ReportActivitySection = ({ type, activities }: { type: string, activities: any[] }) => {
    const [isOpen, setIsOpen] = useState(true);
    const typeActs = activities.filter((a: any) => a.type === type);
    if (typeActs.length === 0) return null;
    
    const titleColor = type === 'feature' ? 'text-blue-600' : type === 'improvement' ? 'text-purple-600' : 'text-red-600';
    const displayType = type.replace('-', ' ');

    return (
      <div className="space-y-3">
        <h4 
          className={`font-semibold capitalize flex items-center gap-2 ${titleColor} cursor-pointer select-none hover:opacity-80 transition-opacity w-fit`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />} 
          {displayType} <Badge variant="secondary" className="ml-1">{typeActs.length}</Badge>
        </h4>
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
                  className="grid gap-4 md:grid-cols-2 pl-6 border-l-2 ml-2 border-muted pb-1 mt-3"
                >
                  {typeActs.map((act: any) => (
                    <ReportActivityCard key={act._id} act={act} />
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
      </div>
    );
  };

  const ProductReportCard = ({ pData }: { pData: any }) => {
    const [expanded, setExpanded] = useState(false);
    const { product, activities, counts } = pData;

    return (
      <motion.div variants={staggerItem} layout>
        <Card className="overflow-hidden">
          <div 
            className="p-4 flex items-center justify-between bg-card hover:bg-accent cursor-pointer transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center gap-4">
              {product.icon ? (
                <img src={product.icon} alt={product.name} className="w-10 h-10 rounded bg-muted" />
              ) : (
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs">No Icon</div>
              )}
              <div>
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{product.category}</Badge>
                  {activities.length} activities
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden sm:flex gap-4 text-sm">
                <div className="flex flex-col items-center"><span className="text-blue-500 font-bold">{counts.features}</span><span className="text-xs text-muted-foreground">Features</span></div>
                <div className="flex flex-col items-center"><span className="text-purple-500 font-bold">{counts.improvements}</span><span className="text-xs text-muted-foreground">Improvements</span></div>
                <div className="flex flex-col items-center"><span className="text-red-500 font-bold">{counts.bugFixes}</span><span className="text-xs text-muted-foreground">Bug Fixes</span></div>
              </div>
              <motion.div animate={{ rotate: expanded ? -180 : 0 }} transition={{ duration: 0.3 }}>
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            </div>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="border-t bg-muted/30 p-4 space-y-6">
                  {['feature', 'improvement', 'bug-fix'].map(type => (
                    <ReportActivitySection key={type} type={type} activities={activities} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    );
  };

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Monthly Report</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border items-end">
        <div className="space-y-1 flex-1">
          <label className="text-sm font-medium">Month</label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1">
          <label className="text-sm font-medium">Year</label>
          <Input 
            type="number" 
            value={year} 
            onChange={e => setYear(e.target.value)}
            min="2000" max="2100"
          />
        </div>
        <div className="space-y-1 flex-1">
          <label className="text-sm font-medium">Product (Optional)</label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger>
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products?.map((p: any) => (
                <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          <Button onClick={handleGenerate} className="flex-1 sm:flex-none">Generate Report</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF}>Export as PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportDOC}>Export as Word (DOC)</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPPT}>Export as PowerPoint (PPT)</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportWebpage}>Export as Webpage</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON}>Export as JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading ? (
        <ReportsSkeleton />
      ) : report ? (
        <div ref={reportRef} className="space-y-6">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }}>
              <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                  <Package className="w-8 h-8 text-muted-foreground" />
                  <div className="text-3xl font-bold">{summary.products}</div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Products Updated</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }}>
              <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                  <PlusCircle className="w-8 h-8 text-blue-500 opacity-80" />
                  <div className="text-3xl font-bold">{summary.features}</div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Features Delivered</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }}>
              <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                  <Wrench className="w-8 h-8 text-purple-500 opacity-80" />
                  <div className="text-3xl font-bold">{summary.improvements}</div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Improvements Made</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }}>
              <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                  <Bug className="w-8 h-8 text-red-500 opacity-80" />
                  <div className="text-3xl font-bold">{summary.bugFixes}</div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Bug Fixes Resolved</div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <h3 className="text-xl font-bold mt-8 mb-4">Product Reports</h3>
            {report.products.length === 0 ? (
              <div className="text-muted-foreground">No activities found for the selected period.</div>
            ) : (
              report.products.map((pData: any) => (
                <ProductReportCard key={pData.product._id} pData={pData} />
              ))
            )}
          </motion.div>
        </div>
      ) : null}
    </PageTransition>
  );
}
