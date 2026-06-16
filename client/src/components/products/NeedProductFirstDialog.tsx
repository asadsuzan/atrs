import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PackageOpen, Plus, ArrowRight } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduct: () => void;
}

/**
 * Shown when the user tries to add a changelog entry but has no products yet.
 * Explains the dependency and routes them straight into the add-product flow.
 */
export function NeedProductFirstDialog({ open, onOpenChange, onAddProduct }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a product first</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center text-center py-6 px-2">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <PackageOpen className="w-8 h-8" />
          </div>
          <h3 className="font-semibold text-lg">You need a product first</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Changelog entries always belong to a product. Add your first product and you'll be able
            to log changes, releases, and notes against it.
          </p>
          <Button className="mt-5" onClick={() => { onOpenChange(false); onAddProduct(); }}>
            <Plus className="w-4 h-4 mr-2" /> Add a product
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
