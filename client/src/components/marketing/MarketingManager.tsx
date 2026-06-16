import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMarketingData, updateMarketingData, deleteMarketingData } from '../../services/marketing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Save, Download, Sparkles, Plus, Trash2, LayoutTemplate, RotateCcw } from 'lucide-react';
import { parseMarketingText } from './SmartParser';
import { Skeleton } from '@/components/ui/skeleton';
import jsPDF from 'jspdf';
import pptxgen from 'pptxgenjs';
import { useConfirm } from '../../contexts/ConfirmContext';
import { toast } from 'sonner';
import { playSound } from '@/lib/sound';

export function MarketingManager({ productId }: { productId: string }) {
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>(null);
  const [importText, setImportText] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ['marketing', productId],
    queryFn: () => getMarketingData(productId),
  });

  useEffect(() => {
    if (response?.data) {
      setFormData(response.data);
    }
  }, [response]);

  const mutation = useMutation({
    mutationFn: updateMarketingData,
    onSuccess: () => {
      playSound('success');
      toast.success("Marketing Hub saved successfully");
      queryClient.invalidateQueries({ queryKey: ['marketing', productId] });
    },
    onError: () => {
      playSound('error');
      toast.error("Failed to save Marketing Hub");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMarketingData,
    onSuccess: () => {
      playSound('delete');
      toast.success("Marketing data cleared from database");
      queryClient.invalidateQueries({ queryKey: ['marketing', productId] });
    },
    onError: () => {
      playSound('error');
      toast.error("Failed to clear database");
    }
  });

  const handleSave = () => {
    mutation.mutate({ productId, ...formData });
  };

  const handleClearDatabase = async () => {
    if (await confirm({ title: "Clear Database", description: "Are you sure you want to permanently delete this marketing data from the database?" })) {
      deleteMutation.mutate(productId);
    }
  };

  const handleSmartImport = () => {
    try {
      const parsed = parseMarketingText(importText);
      setFormData({ ...formData, ...parsed });
      setIsImportOpen(false);
      setImportText('');
      playSound('success');
      toast.success("Template parsed successfully!");
    } catch(e) {
      playSound('error');
      toast.error("Failed to parse template");
    }
  };

  const handleReset = async () => {
    if (await confirm({ title: "Reset Changes", description: "Are you sure you want to discard unsaved changes and reset to the last saved state?" })) {
      if (response?.data) {
        setFormData(response.data);
        toast.success("Reset to last saved state");
      }
    }
  };

  const exportAsJSON = () => {
    const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.pluginName || 'marketing'}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsRawTemplate = () => {
    let demosStr = JSON.stringify(formData.demos || [], null, 4)
        .replace(/"([^"]+)":/g, '$1:');
        
    // Add trailing commas to objects inside array to match JS-like format
    demosStr = demosStr.replace(/}\n/g, '},\n').replace(/},\n]$/, '}\n  ]');

    const txt = `Landing Page Data ( ${formData.pluginName || 'Plugin'} )

Plugin Name: ${formData.pluginName || ''}
Trailer video: {${formData.trailerVideo || ''}}
Tutorial video: {${formData.tutorialVideo || ''}}
WP.org URL: ${formData.wpOrgUrl || ''}
Docs URL: {${formData.docsUrl || ''}}

== Short Description (Hero Section) ==
${formData.heroDescription || ''}

== Why Choose ${formData.pluginName || 'Plugin'}? ==
Modern websites need flexible, interactive UI components — not static popups or limited sidebars.
${(formData.problemList || []).length > 0 ? `The Problem with Traditional  Popups & Sidebars\n${formData.problemList.join('\n')}\n` : ''}${(formData.smarterWayList || []).length > 0 ? `A Smarter Way to Build Drawers & Popups\n${formData.smarterWayList.join('\n')}\n` : ''}


== 4  Key Features Section == 


${(formData.keyFeatures || []).map((f: any) => `Title: ${f.title || ''}\nDes: ${f.description || ''}\nList: ${f.list && f.list.length > 0 ? '\n \n' + f.list.join('\n') : '[]'}`).join('\n')}

== All Features ==
${(formData.allFeatures || []).map((f: any) => `title:${f.title || ''}\n Des: ${f.description || ''}`).join('\n\n')}


Demos  
${demosStr}



Top 5 star ratings link: [
${formData.topRatingLink ? '\n' + formData.topRatingLink + '\n' : ''}
]

Screenshots (from WP.org)
${(formData.screenshots || []).map((s: any) => `${s.title}  – { ${s.url} }`).join('\n')}

Plugin FAQs (Feature Related)
${(formData.faqs || []).map((f: any) => `Q: ${f.question}\n${f.answer}`).join('\n\n')}
`;
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.pluginName || 'marketing'}-template.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const escapeHtml = (value: any): string => {
    const str = value == null ? '' : String(value);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const generateHTMLContent = () => {
    const html = `
      <html>
        <head><title>${escapeHtml(formData.pluginName)} - Landing Page Data</title></head>
        <body style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem;">
          <h1>${escapeHtml(formData.pluginName)}</h1>
          <p><strong>Hero:</strong> ${escapeHtml(formData.heroDescription)}</p>
          <h2>Features</h2>
          <ul>${formData.allFeatures?.map((f: any) => `<li><strong>${escapeHtml(f.title)}</strong>: ${escapeHtml(f.description)}</li>`).join('')}</ul>
          <h2>Demos</h2>
          <ul>${formData.demos?.map((l: any) => `<li><strong>${escapeHtml(l.title)}</strong>: ${escapeHtml(l.description)}</li>`).join('')}</ul>
          <h2>FAQs</h2>
          <dl>${formData.faqs?.map((faq: any) => `<dt><strong>Q: ${escapeHtml(faq.question)}</strong></dt><dd>A: ${escapeHtml(faq.answer)}</dd>`).join('')}</dl>
        </body>
      </html>
    `;
    return html;
  };

  const exportAsHTML = () => {
    const blob = new Blob([generateHTMLContent()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.pluginName || 'marketing'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsWord = () => {
    // A trick to create a Word doc from HTML
    const blob = new Blob(['\ufeff', generateHTMLContent()], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.pluginName || 'marketing'}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    const addText = (text: string, isBold = false) => {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text || '', 170);
      doc.text(lines, 20, y);
      y += lines.length * 7 + 2;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    };
    
    doc.setFontSize(20);
    addText(formData.pluginName || 'Marketing Data', true);
    doc.setFontSize(12);
    y += 5;
    addText('Hero Description:', true);
    addText(formData.heroDescription);
    y += 5;
    addText('Demos:', true);
    formData.demos?.forEach((l: any) => {
      addText(`- ${l.title}: ${l.description}`);
    });
    
    doc.save(`${formData.pluginName || 'marketing'}.pdf`);
  };

  const exportAsPPT = () => {
    const pres = new pptxgen();
    
    // Title Slide
    const slide1 = pres.addSlide();
    slide1.addText(formData.pluginName || 'Marketing Data', { x: 1, y: 1.5, w: '80%', h: 1, fontSize: 36, bold: true, align: 'center' });
    slide1.addText(formData.heroDescription?.substring(0, 150) + '...', { x: 1, y: 3, w: '80%', h: 1, fontSize: 18, align: 'center' });
    
    // Features Slide
    if (formData.allFeatures?.length > 0) {
      const slide2 = pres.addSlide();
      slide2.addText('Key Features', { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true });
      const bullets = formData.allFeatures.slice(0, 6).map((f: any) => ({ text: f.title, options: { bullet: true } }));
      slide2.addText(bullets, { x: 0.5, y: 1.5, w: '90%', h: 3, fontSize: 16 });
    }
    
    // Demos Slide
    if (formData.demos?.length > 0) {
      const slide3 = pres.addSlide();
      slide3.addText('Demos', { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true });
      const layouts = formData.demos.slice(0, 6).map((l: any) => ({ text: l.title, options: { bullet: true } }));
      slide3.addText(layouts, { x: 0.5, y: 1.5, w: '90%', h: 3, fontSize: 16 });
    }

    pres.writeFile({ fileName: `${formData.pluginName || 'marketing'}.pptx` });
  };

  if (isLoading || !formData) {
    return (
      <div className="space-y-6 max-w-5xl pb-12">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-56" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg bg-card p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border">
        <div>
          <h3 className="text-lg font-semibold flex items-center"><LayoutTemplate className="w-5 h-5 mr-2 text-primary" /> Marketing Hub</h3>
          <p className="text-sm text-muted-foreground">Manage landing page copy, layouts, and assets.</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary">
                <Sparkles className="w-4 h-4 mr-2" /> Smart Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Smart Template Import</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Paste your raw landing page template text here. The AI parser will automatically structure it into the correct fields.</p>
                <Textarea 
                  className="min-h-[300px] font-mono text-xs custom-scrollbar" 
                  value={importText} 
                  onChange={e => setImportText(e.target.value)} 
                  placeholder="Paste template here..." 
                />
                <Button onClick={handleSmartImport} className="w-full"><Sparkles className="w-4 h-4 mr-2" /> Auto-Parse & Fill</Button>
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportAsRawTemplate}>Raw Template (.txt)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsJSON}>JSON Payload</DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsHTML}>HTML Webpage</DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsWord}>Word Document (.doc)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsPDF}>PDF Document</DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsPPT}>PowerPoint (.pptx)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={handleClearDatabase} disabled={deleteMutation.isPending} title="Delete all from DB">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" className="text-muted-foreground" onClick={handleReset} title="Reset to last saved">
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button onClick={handleSave} disabled={mutation.isPending}>
            <Save className="w-4 h-4 mr-2" /> {mutation.isPending ? 'Saving...' : 'Save Hub'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hero Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Plugin Name</label>
              <Input value={formData.pluginName} onChange={e => setFormData({...formData, pluginName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hero Description</label>
              <Textarea className="h-32" value={formData.heroDescription} onChange={e => setFormData({...formData, heroDescription: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Thumbnail Image (URL or ZIP name)</label>
              <Input value={formData.thumbnailImage} onChange={e => setFormData({...formData, thumbnailImage: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Media & Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">WP.org URL</label><Input value={formData.wpOrgUrl} onChange={e => setFormData({...formData, wpOrgUrl: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Docs URL</label><Input value={formData.docsUrl} onChange={e => setFormData({...formData, docsUrl: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Trailer Video URL</label><Input value={formData.trailerVideo} onChange={e => setFormData({...formData, trailerVideo: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Top 5 Star Rating Link</label><Input value={formData.topRatingLink || ''} onChange={e => setFormData({...formData, topRatingLink: e.target.value})} /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Why Choose Section</CardTitle>
          <CardDescription>Enter one item per line</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-destructive">The Problem List</label>
            <Textarea className="h-40" value={(formData.problemList || []).join('\n')} onChange={e => setFormData({...formData, problemList: e.target.value.split('\n')})} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-green-600 dark:text-green-400">The Solution List</label>
            <Textarea className="h-40" value={(formData.smarterWayList || []).join('\n')} onChange={e => setFormData({...formData, smarterWayList: e.target.value.split('\n')})} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key Features (Top 4)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.keyFeatures?.map((kf: any, i: number) => (
             <div key={i} className="p-4 border rounded-lg space-y-3 bg-card/50">
                <div className="flex justify-between items-center"><span className="font-medium text-sm">Feature {i+1}</span>
                <Button variant="ghost" size="icon" onClick={() => {
                  const newKf = [...formData.keyFeatures];
                  newKf.splice(i, 1);
                  setFormData({...formData, keyFeatures: newKf});
                }}><Trash2 className="w-4 h-4 text-destructive" /></Button></div>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Title" value={kf.title} onChange={e => { const newKf = [...formData.keyFeatures]; newKf[i].title = e.target.value; setFormData({...formData, keyFeatures: newKf}); }} />
                  <Input placeholder="Media URL (Img/Video)" value={kf.mediaUrl || ''} onChange={e => { const newKf = [...formData.keyFeatures]; newKf[i].mediaUrl = e.target.value; setFormData({...formData, keyFeatures: newKf}); }} />
                </div>
                <Textarea placeholder="Description" value={kf.description} onChange={e => { const newKf = [...formData.keyFeatures]; newKf[i].description = e.target.value; setFormData({...formData, keyFeatures: newKf}); }} />
                <Textarea placeholder="List items (one per line)" className="h-20" value={(kf.list || []).join('\n')} onChange={e => { const newKf = [...formData.keyFeatures]; newKf[i].list = e.target.value.split('\n'); setFormData({...formData, keyFeatures: newKf}); }} />
             </div>
          ))}
          <Button variant="outline" className="w-full border-dashed" onClick={() => setFormData({...formData, keyFeatures: [...(formData.keyFeatures||[]), {title:'', description:'', list:[], mediaUrl:''}]})}><Plus className="w-4 h-4 mr-2" /> Add Key Feature</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Features List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.allFeatures?.map((af: any, i: number) => (
             <div key={i} className="p-4 border rounded-lg space-y-3 bg-card/50">
                <div className="flex justify-between items-center"><span className="font-medium text-sm">Feature {i+1}</span>
                <Button variant="ghost" size="icon" onClick={() => {
                  const newAf = [...formData.allFeatures];
                  newAf.splice(i, 1);
                  setFormData({...formData, allFeatures: newAf});
                }}><Trash2 className="w-4 h-4 text-destructive" /></Button></div>
                <Input placeholder="Title" value={af.title} onChange={e => { const newAf = [...formData.allFeatures]; newAf[i].title = e.target.value; setFormData({...formData, allFeatures: newAf}); }} />
                <Textarea placeholder="Description" value={af.description} onChange={e => { const newAf = [...formData.allFeatures]; newAf[i].description = e.target.value; setFormData({...formData, allFeatures: newAf}); }} />
                <Textarea placeholder="List items (one per line)" className="h-20" value={(af.list || []).join('\n')} onChange={e => { const newAf = [...formData.allFeatures]; newAf[i].list = e.target.value.split('\n'); setFormData({...formData, allFeatures: newAf}); }} />
             </div>
          ))}
          <Button variant="outline" className="w-full border-dashed" onClick={() => setFormData({...formData, allFeatures: [...(formData.allFeatures||[]), {title:'', description:'', list:[]}]})}><Plus className="w-4 h-4 mr-2" /> Add Feature</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Screenshots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.screenshots?.map((sc: any, i: number) => (
            <div key={i} className="flex gap-4 items-center">
              <Input placeholder="Title" value={sc.title} onChange={e => { const newSc = [...formData.screenshots]; newSc[i].title = e.target.value; setFormData({...formData, screenshots: newSc}); }} />
              <Input placeholder="URL" value={sc.url} onChange={e => { const newSc = [...formData.screenshots]; newSc[i].url = e.target.value; setFormData({...formData, screenshots: newSc}); }} />
              <Button variant="ghost" size="icon" onClick={() => { const newSc = [...formData.screenshots]; newSc.splice(i, 1); setFormData({...formData, screenshots: newSc}); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
          <Button variant="outline" className="w-full border-dashed" onClick={() => setFormData({...formData, screenshots: [...(formData.screenshots||[]), {title:'', url:''}]})}><Plus className="w-4 h-4 mr-2" /> Add Screenshot</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demos Array</CardTitle>
          <CardDescription>Manage the structured JSON array of demos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formData.demos?.map((layout: any, i: number) => (
              <div key={i} className="flex items-start gap-4 p-4 border rounded-lg bg-card/50">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Title" value={layout.title} onChange={e => {
                      const newLayouts = [...formData.demos];
                      newLayouts[i].title = e.target.value;
                      setFormData({...formData, demos: newLayouts});
                    }} />
                    <Input placeholder="URL" value={layout.url} onChange={e => {
                      const newLayouts = [...formData.demos];
                      newLayouts[i].url = e.target.value;
                      setFormData({...formData, demos: newLayouts});
                    }} />
                  </div>
                  <Textarea placeholder="Description" value={layout.description} className="h-16" onChange={e => {
                      const newLayouts = [...formData.demos];
                      newLayouts[i].description = e.target.value;
                      setFormData({...formData, demos: newLayouts});
                    }} />
                </div>
                <Button variant="destructive" size="icon" onClick={() => {
                  const newLayouts = [...formData.demos];
                  newLayouts.splice(i, 1);
                  setFormData({...formData, demos: newLayouts});
                }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button variant="outline" className="w-full border-dashed" onClick={() => {
              setFormData({...formData, demos: [...(formData.demos || []), { title: '', description: '', url: '', icon: '' }]})
            }}>
              <Plus className="w-4 h-4 mr-2" /> Add Demo
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">FAQs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formData.faqs?.map((faq: any, i: number) => (
              <div key={i} className="flex items-start gap-4 p-4 border rounded-lg bg-card/50">
                <div className="flex-1 space-y-2">
                  <Input placeholder="Question" value={faq.question} onChange={e => {
                    const newFaqs = [...formData.faqs];
                    newFaqs[i].question = e.target.value;
                    setFormData({...formData, faqs: newFaqs});
                  }} />
                  <Textarea placeholder="Answer" value={faq.answer} onChange={e => {
                    const newFaqs = [...formData.faqs];
                    newFaqs[i].answer = e.target.value;
                    setFormData({...formData, faqs: newFaqs});
                  }} />
                </div>
                <Button variant="destructive" size="icon" onClick={() => {
                  const newFaqs = [...formData.faqs];
                  newFaqs.splice(i, 1);
                  setFormData({...formData, faqs: newFaqs});
                }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button variant="outline" className="w-full border-dashed" onClick={() => {
              setFormData({...formData, faqs: [...(formData.faqs || []), { question: '', answer: '' }]})
            }}>
              <Plus className="w-4 h-4 mr-2" /> Add FAQ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
