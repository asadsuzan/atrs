import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ProductForm, type ProductFormVariant } from './ProductForm';
import { Globe, Package, Download, PenLine, ArrowLeft, ChevronRight } from 'lucide-react';

type Step = 'type' | 'wp-method' | 'form';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: any) => void;
  /** Opens the existing WP.org import flow. */
  onImport: () => void;
}

/** A large, clickable option card used in the chooser steps. */
function ChoiceCard({
  icon, title, description, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 w-full text-left p-4 rounded-xl border bg-card hover:bg-primary/5 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{title}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

export function AddProductDialog({ open, onOpenChange, onCreate, onImport }: Props) {
  const [step, setStep] = useState<Step>('type');
  const [variant, setVariant] = useState<ProductFormVariant>('wp');

  // Always restart at the type chooser whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setStep('type');
      setVariant('wp');
    }
  }, [open]);

  const goImport = () => {
    onOpenChange(false);
    onImport();
  };

  const titles: Record<Step, string> = {
    type: 'Add a product',
    'wp-method': 'WordPress / CMS product',
    form: variant === 'standalone' ? 'New standalone product' : 'New WordPress / CMS product',
  };

  const canGoBack = step !== 'type';
  const back = () => {
    if (step === 'wp-method') setStep('type');
    else if (step === 'form') setStep(variant === 'standalone' ? 'type' : 'wp-method');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {canGoBack && (
              <button
                type="button"
                onClick={back}
                aria-label="Back"
                className="p-1 -ml-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {titles[step]}
          </DialogTitle>
          {step === 'type' && (
            <DialogDescription>What kind of product are you adding?</DialogDescription>
          )}
          {step === 'wp-method' && (
            <DialogDescription>Import existing plugins, or add one manually.</DialogDescription>
          )}
        </DialogHeader>

        {step === 'type' && (
          <div className="space-y-3">
            <ChoiceCard
              icon={<Globe className="w-6 h-6" />}
              title="WordPress / CMS based"
              description="A plugin, block, or theme — import from WordPress.org or add manually."
              onClick={() => { setVariant('wp'); setStep('wp-method'); }}
            />
            <ChoiceCard
              icon={<Package className="w-6 h-6" />}
              title="Standalone"
              description="A self-hosted app or tool that isn't tied to WordPress."
              onClick={() => { setVariant('standalone'); setStep('form'); }}
            />
          </div>
        )}

        {step === 'wp-method' && (
          <div className="space-y-3">
            <ChoiceCard
              icon={<Download className="w-6 h-6" />}
              title="Import from WordPress.org"
              description="Pull plugins by author and stream them in with versions & readme."
              onClick={goImport}
            />
            <ChoiceCard
              icon={<PenLine className="w-6 h-6" />}
              title="Add manually"
              description="Fill in the product details yourself."
              onClick={() => { setVariant('wp'); setStep('form'); }}
            />
          </div>
        )}

        {step === 'form' && (
          <ProductForm variant={variant} onSubmit={onCreate} />
        )}
      </DialogContent>
    </Dialog>
  );
}
