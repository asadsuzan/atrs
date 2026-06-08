import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Package, Activity, FileText, Settings, History, Calendar } from 'lucide-react';
import { getProducts } from '../../services/products';
import { getActivities } from '../../services/activities';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => getProducts() });
  const { data: activitiesData } = useQuery({ queryKey: ['activities'], queryFn: () => getActivities({ limit: -1 }) });

  const products = productsData?.data || [];
  const activities = activitiesData?.data || [];

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
            <Calendar className="mr-2 h-4 w-4" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/products'))}>
            <Package className="mr-2 h-4 w-4" /> Products
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/activities'))}>
            <Activity className="mr-2 h-4 w-4" /> Activities
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/reports'))}>
            <FileText className="mr-2 h-4 w-4" /> Reports
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/audit-logs'))}>
            <History className="mr-2 h-4 w-4" /> Audit Logs
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </CommandItem>
        </CommandGroup>

        {products.length > 0 && (
          <CommandGroup heading="Products">
            {products.map((p: any) => (
              <CommandItem key={p._id} onSelect={() => runCommand(() => navigate(`/products/${p._id}`))}>
                <Package className="mr-2 h-4 w-4 text-blue-500" />
                {p.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {activities.length > 0 && (
          <CommandGroup heading="Recent Activities">
            {activities.slice(0, 5).map((a: any) => (
              <CommandItem key={a._id} onSelect={() => {
                if (a.productId?._id) {
                  runCommand(() => navigate(`/products/${a.productId._id}#activity-${a._id}`));
                } else if (a.productId) {
                  runCommand(() => navigate(`/products/${a.productId}#activity-${a._id}`));
                }
              }}>
                <Activity className="mr-2 h-4 w-4 text-emerald-500" />
                {a.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
