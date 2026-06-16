import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PackageOpen, Sparkles, Plus, Download } from 'lucide-react';

interface Props {
  onAdd: () => void;
  onImport: () => void;
}

/**
 * Friendly onboarding state shown when the products table is empty. Meant to
 * feel welcoming for brand-new users rather than a dead end.
 */
export function ProductsEmptyState({ onAdd, onImport }: Props) {
  return (
    <div className="border rounded-xl bg-card">
      <div className="flex flex-col items-center justify-center text-center px-6 py-16">
        {/* Animated illustration */}
        <div className="relative mb-6">
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-full bg-primary/15 blur-2xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-primary/10 text-primary"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <PackageOpen className="w-12 h-12" />
            <motion.span
              className="absolute -top-2 -right-2 text-amber-400"
              animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="w-6 h-6" />
            </motion.span>
          </motion.div>
        </div>

        <motion.h3
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-bold tracking-tight"
        >
          No products yet — let's change that!
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-muted-foreground mt-2 max-w-md"
        >
          Your catalog is empty. Add a WordPress plugin, block, or theme — or bring in a
          standalone app — and you'll start tracking versions, changelogs, and assets in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="flex flex-col sm:flex-row items-center gap-3 mt-7"
        >
          <Button size="lg" onClick={onAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add your first product
          </Button>
          <Button size="lg" variant="outline" onClick={onImport}>
            <Download className="w-4 h-4 mr-2" /> Import from WordPress.org
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
