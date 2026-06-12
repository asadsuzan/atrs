import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMonthlyReport, getAnnualReport } from '../services/reports';
import { getProducts } from '../services/products';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Package, PlusCircle, Wrench, Bug, Calendar as CalendarIcon, ChevronDown, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/layout/PageTransition';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReportsSkeleton } from '@/components/ui/skeletons';
import { MediaCarousel } from '@/components/ui/media-carousel';

export default function Reports() {
  const currentDate = new Date();
  const [activeTab, setActiveTab] = useState<'monthly' | 'annual'>('monthly');

  // Monthly Report State
  const [month, setMonth] = useLocalStorage<string>('atrs_filter_month', (currentDate.getMonth() + 1).toString());
  const [year, setYear] = useLocalStorage<string>('atrs_filter_year', currentDate.getFullYear().toString());
  const [productId, setProductId] = useLocalStorage<string>('atrs_filter_productId', 'all');
  const [startDate, setStartDate] = useLocalStorage<string>('atrs_report_startDate', '');
  const [endDate, setEndDate] = useLocalStorage<string>('atrs_report_endDate', '');
  const [useCustomRange, setUseCustomRange] = useState(false);

  // Annual Report State
  const [annualYear, setAnnualYear] = useState(currentDate.getFullYear().toString());

  const [monthlyQueryArgs, setMonthlyQueryArgs] = useState({ 
    month: parseInt(month, 10), 
    year: parseInt(year, 10), 
    productId,
    startDate: '',
    endDate: ''
  });

  const [annualQueryArgs, setAnnualQueryArgs] = useState({
    year: parseInt(annualYear, 10),
    productId
  });
  
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => getProducts() });
  const products = productsData?.data || [];

  const { data: monthlyReport, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ['report-monthly', monthlyQueryArgs],
    queryFn: () => getMonthlyReport({
      month: monthlyQueryArgs.startDate ? undefined : monthlyQueryArgs.month,
      year: monthlyQueryArgs.startDate ? undefined : monthlyQueryArgs.year,
      productId: monthlyQueryArgs.productId !== 'all' ? monthlyQueryArgs.productId : undefined,
      startDate: monthlyQueryArgs.startDate || undefined,
      endDate: monthlyQueryArgs.endDate || undefined,
    }),
  });

  const { data: annualReport, isLoading: isLoadingAnnual } = useQuery({
    queryKey: ['report-annual', annualQueryArgs],
    queryFn: () => getAnnualReport({
      year: annualQueryArgs.year,
      productId: annualQueryArgs.productId !== 'all' ? annualQueryArgs.productId : undefined,
    }),
  });

  const handleGenerateMonthly = () => {
    setMonthlyQueryArgs({
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      productId,
      startDate: useCustomRange ? startDate : '',
      endDate: useCustomRange ? endDate : ''
    });
  };

  const handleGenerateAnnual = () => {
    setAnnualQueryArgs({
      year: parseInt(annualYear, 10),
      productId
    });
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const exportMonthlyPDF = async () => {
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
      pdf.save(`Monthly_Report_${months[monthlyQueryArgs.month - 1]}_${monthlyQueryArgs.year}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    }
  };

  // Simplified export functions for demonstration
  const handleExportJSON = () => {
    const data = activeTab === 'monthly' ? monthlyReport : annualReport;
    if (!data) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${activeTab}_Report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const ReportActivityCard = ({ act }: { act: any }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <Card className="bg-card overflow-hidden">
        <CardHeader 
          className="p-4 pb-2 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{act.title}</CardTitle>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  {new Date(act.activityDate).toLocaleDateString()}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 -mr-2 -mt-2">
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <AnimatePresence>
          {isOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <CardContent className="p-4 pt-2 space-y-3">
                {(() => {
                  const urls = act.mediaUrls?.length ? act.mediaUrls : (act.mediaUrl ? [act.mediaUrl] : []);
                  if (urls.length === 0) return null;
                  return (
                    <div className="mb-4">
                      <MediaCarousel urls={urls} title={act.title} />
                    </div>
                  );
                })()}
                <p className="text-sm text-muted-foreground">{act.shortDescription}</p>
                
                {act.items && act.items.length > 0 && (
                  <div className="mt-6 space-y-3 border-t pt-4">
                    <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Included Items</h5>
                    {act.items.map((item: any, idx: number) => (
                      <div key={idx} className="bg-muted/20 border border-border/40 rounded-lg p-3">
                        {(() => {
                          const itemUrls = item.mediaUrls?.length ? item.mediaUrls : (item.mediaUrl ? [item.mediaUrl] : []);
                          if (itemUrls.length === 0) return null;
                          return (
                            <div className="mb-3">
                              <MediaCarousel urls={itemUrls} title={item.title} />
                            </div>
                          );
                        })()}
                        <h6 className="font-medium text-sm text-foreground">{item.title}</h6>
                        {item.description && <p className="text-xs text-muted-foreground leading-relaxed mt-1">{item.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    );
  };

  const ReportActivitySection = ({ type, activities }: { type: string, activities: any[] }) => {
    const typeActs = activities.filter((a: any) => a.type === type);
    if (typeActs.length === 0) return null;
    const titleColor = type === 'feature' ? 'text-blue-600' : type === 'improvement' ? 'text-purple-600' : 'text-red-600';
    return (
      <div className="space-y-3">
        <h4 className={`font-semibold capitalize flex items-center gap-2 ${titleColor}`}>
          {type.replace('-', ' ')} <Badge variant="secondary" className="ml-1">{typeActs.length}</Badge>
        </h4>
        <div className="grid gap-4 md:grid-cols-2 pl-6 border-l-2 ml-2 border-muted pb-1 mt-3">
          {typeActs.map((act: any) => (
            <ReportActivityCard key={act._id} act={act} />
          ))}
        </div>
      </div>
    );
  };

  const ProductReportCard = ({ pData }: { pData: any }) => {
    const [expanded, setExpanded] = useState(false);
    const { product, activities, counts } = pData;
    return (
      <Card className="overflow-visible relative">
        <div className="sticky top-0 lg:top-[185px] z-20 p-4 flex items-center justify-between bg-card/95 backdrop-blur-md hover:bg-accent cursor-pointer transition-colors shadow-sm rounded-t-lg border-b" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-4">
            {product.icon ? <img src={product.icon} className="w-10 h-10 rounded bg-muted" /> : <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs">No Icon</div>}
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
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="border-t bg-muted/30 p-4 space-y-6">
                {['feature', 'improvement', 'bug-fix'].map(type => (
                  <ReportActivitySection key={type} type={type} activities={activities} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    );
  };

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
      </div>

      <div className="flex space-x-4 border-b">
        <button 
          className={`pb-2 text-lg font-bold border-b-2 transition-colors ${activeTab === 'monthly' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('monthly')}
        >
          Detailed Report
        </button>
        <button 
          className={`pb-2 text-lg font-bold border-b-2 transition-colors ${activeTab === 'annual' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('annual')}
        >
          Annual Summary
        </button>
      </div>

      {activeTab === 'monthly' && (
        <>
          <div className="flex flex-col lg:flex-row gap-4 bg-card p-4 rounded-lg border items-end">
            {!useCustomRange ? (
              <>
                <div className="space-y-1 flex-1">
                  <label className="text-sm font-medium">Month</label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>
                      {months.map((m, i) => <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex-1">
                  <label className="text-sm font-medium">Year</label>
                  <Input type="number" value={year} onChange={e => setYear(e.target.value)} min="2000" max="2100" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1 flex-1">
                  <label className="text-sm font-medium">Start Date</label>
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Pick start date"
                    max={endDate || undefined}
                    clearable
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <label className="text-sm font-medium">End Date</label>
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Pick end date"
                    min={startDate || undefined}
                    clearable
                  />
                </div>
              </>
            )}
            
            <div className="space-y-1 flex-1">
              <label className="text-sm font-medium">Product</label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="All Products" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products?.map((p: any) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 mt-4 lg:mt-0 items-end">
              <Button variant="outline" onClick={() => setUseCustomRange(!useCustomRange)}>
                {useCustomRange ? 'Use Month/Year' : 'Use Custom Range'}
              </Button>
              <Button onClick={handleGenerateMonthly}>Generate Report</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportMonthlyPDF}>Export as PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportJSON}>Export as JSON</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {isLoadingMonthly ? (
            <ReportsSkeleton />
          ) : monthlyReport ? (
            <div ref={reportRef} className="space-y-6">
              <div className="lg:sticky lg:top-4 z-30 bg-background/80 lg:backdrop-blur-md pb-4 pt-2 -mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shadow-sm rounded-xl">
                  <Card><CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2"><Package className="w-8 h-8 text-muted-foreground" /><div className="text-3xl font-bold">{monthlyReport.summary.products}</div><div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Products Updated</div></CardContent></Card>
                <Card><CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2"><PlusCircle className="w-8 h-8 text-blue-500 opacity-80" /><div className="text-3xl font-bold">{monthlyReport.summary.features}</div><div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Features Delivered</div></CardContent></Card>
                <Card><CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2"><Wrench className="w-8 h-8 text-purple-500 opacity-80" /><div className="text-3xl font-bold">{monthlyReport.summary.improvements}</div><div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Improvements Made</div></CardContent></Card>
                  <Card><CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2"><Bug className="w-8 h-8 text-red-500 opacity-80" /><div className="text-3xl font-bold">{monthlyReport.summary.bugFixes}</div><div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Bug Fixes Resolved</div></CardContent></Card>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold mt-8 mb-4">Product Reports</h3>
                {monthlyReport.products.length === 0 ? (
                  <div className="text-muted-foreground">No activities found for the selected period.</div>
                ) : (
                  monthlyReport.products.map((pData: any) => <ProductReportCard key={pData.product._id} pData={pData} />)
                )}
              </div>
            </div>
          ) : null}
        </>
      )}

      {activeTab === 'annual' && (
        <>
          <div className="flex gap-4 bg-card p-4 rounded-lg border items-end">
            <div className="space-y-1 flex-1">
              <label className="text-sm font-medium">Year</label>
              <Input type="number" value={annualYear} onChange={e => setAnnualYear(e.target.value)} min="2000" max="2100" />
            </div>
            <div className="space-y-1 flex-1">
              <label className="text-sm font-medium">Product</label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="All Products" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products?.map((p: any) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateAnnual}>Generate Summary</Button>
            <Button variant="outline" onClick={handleExportJSON}><Download className="w-4 h-4 mr-2" /> Export JSON</Button>
          </div>

          {isLoadingAnnual ? (
            <ReportsSkeleton />
          ) : annualReport ? (
            <div className="space-y-6">
              <div className="lg:sticky lg:top-4 z-30 bg-background/80 lg:backdrop-blur-md pb-4 pt-2 -mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shadow-sm rounded-xl">
                  <Card><CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2"><Package className="w-8 h-8 text-muted-foreground" /><div className="text-3xl font-bold">{annualReport.summary.total}</div><div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Total Activities</div></CardContent></Card>
                <Card><CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2"><PlusCircle className="w-8 h-8 text-blue-500 opacity-80" /><div className="text-3xl font-bold">{annualReport.summary.features}</div><div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Total Features</div></CardContent></Card>
                <Card><CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2"><Wrench className="w-8 h-8 text-purple-500 opacity-80" /><div className="text-3xl font-bold">{annualReport.summary.improvements}</div><div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Total Improvements</div></CardContent></Card>
                  <Card><CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2"><Bug className="w-8 h-8 text-red-500 opacity-80" /><div className="text-3xl font-bold">{annualReport.summary.bugFixes}</div><div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Total Bug Fixes</div></CardContent></Card>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold mt-8 mb-4">Monthly Breakdown ({annualReport.year})</h3>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {annualReport.months.map((m: any) => (
                    <Card key={m.month}>
                      <CardHeader className="pb-2">
                        <CardTitle>{m.label}</CardTitle>
                        <CardDescription>{m.total} total activities</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-blue-500 flex items-center"><PlusCircle className="w-4 h-4 mr-1" /> {m.features}</span>
                          <span className="text-purple-500 flex items-center"><Wrench className="w-4 h-4 mr-1" /> {m.improvements}</span>
                          <span className="text-red-500 flex items-center"><Bug className="w-4 h-4 mr-1" /> {m.bugFixes}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </PageTransition>
  );
}
