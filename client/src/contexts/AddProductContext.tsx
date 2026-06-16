import { createContext, useContext, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct } from '../services/products';
import { useWpImport } from './WpImportContext';
import { AddProductDialog } from '../components/products/AddProductDialog';
import { NeedProductFirstDialog } from '../components/products/NeedProductFirstDialog';
import { toast } from 'sonner';
import { playSound } from '@/lib/sound';

interface AddProductContextValue {
  /** Opens the category chooser → form / WP.org import flow. */
  openAddProduct: () => void;
  /** Opens the "you need a product first" prompt (used by changelog entry points). */
  openAddProductFirst: () => void;
}

const AddProductContext = createContext<AddProductContextValue | null>(null);

export function useAddProduct() {
  const ctx = useContext(AddProductContext);
  if (!ctx) throw new Error('useAddProduct must be used within AddProductProvider');
  return ctx;
}

/**
 * App-level provider for adding products. Owns the multi-step Add Product
 * dialog and the "add a product first" prompt so any surface (Products page,
 * Changelogs page, sidebar empty states) can trigger the exact same flow.
 */
export function AddProductProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { open: openWpImport } = useWpImport();
  const [chooserOpen, setChooserOpen] = useState(false);
  const [needFirstOpen, setNeedFirstOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      playSound('success');
      toast.success('Product created successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setChooserOpen(false);
    },
    onError: () => {
      playSound('error');
      toast.error('Failed to create product');
    },
  });

  const openAddProduct = () => { setNeedFirstOpen(false); setChooserOpen(true); };
  const openAddProductFirst = () => setNeedFirstOpen(true);

  return (
    <AddProductContext.Provider value={{ openAddProduct, openAddProductFirst }}>
      {children}
      <AddProductDialog
        open={chooserOpen}
        onOpenChange={setChooserOpen}
        onImport={openWpImport}
        onCreate={(data: any) => createMutation.mutate(data)}
      />
      <NeedProductFirstDialog
        open={needFirstOpen}
        onOpenChange={setNeedFirstOpen}
        onAddProduct={openAddProduct}
      />
    </AddProductContext.Provider>
  );
}
