import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, deleteProduct, updateProduct } from '../services/products';
import { getUsers } from '../services/users';
import { useAuth } from '../contexts/AuthContext';
import { playSound } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProductForm } from '../components/products/ProductForm';
import { useWpImport } from '../contexts/WpImportContext';
import { useJobStream } from '../contexts/JobStreamContext';
import { Plus, Search, Edit2, Trash2, GitBranch, Globe, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { motion } from 'framer-motion';
import PageTransition from '../components/layout/PageTransition';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function Products() {
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useLocalStorage('atrs_products_search', '');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [category, setCategory] = useLocalStorage('atrs_products_category', 'all');
  const [status, setStatus] = useLocalStorage('atrs_products_status', 'all');
  const [ownerId, setOwnerId] = useState('all');
  const [page, setPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { open: openWpImport } = useWpImport();
  const { runJob, isRunning: isJobRunning } = useJobStream();
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const queryParams: any = { page, limit: 10 };
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (category && category !== 'all') queryParams.category = category;
  if (status && status !== 'all') queryParams.status = status;
  if (ownerId !== 'all') queryParams.ownerId = ownerId;

  const { data: productsData, isLoading, isError } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: () => getProducts(queryParams),
  });

  const products = productsData?.data || [];
  const totalPages = productsData?.totalPages || 1;

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
    enabled: isAdmin,
  });
  const users = usersData || [];

  // Clear selection when page or filters change
  useEffect(() => { setSelectedIds(new Set()); }, [page, debouncedSearch, category, status, ownerId]);

  const allOnPageSelected = products.length > 0 && products.every((p: any) => selectedIds.has(p._id));
  const someOnPageSelected = products.some((p: any) => selectedIds.has(p._id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        products.forEach((p: any) => next.delete(p._id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        products.forEach((p: any) => next.add(p._id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      playSound('success');
      toast.success("Product created successfully");
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsAddOpen(false);
    },
    onError: () => {
      playSound('error');
      toast.error("Failed to create product");
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateProduct,
    onSuccess: () => {
      playSound('success');
      toast.success("Product updated successfully");
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
    },
    onError: () => {
      playSound('error');
      toast.error("Failed to update product");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      playSound('delete');
      toast.success("Product deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => {
      playSound('error');
      toast.error("Failed to delete product");
    }
  });

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!await confirm({
      title: `Delete ${ids.length} product${ids.length !== 1 ? 's' : ''}`,
      description: `This will permanently delete ${ids.length} product${ids.length !== 1 ? 's' : ''} along with all their activities, versions, marketing data, and media files. This action cannot be undone.`,
    })) return;
    runJob({
      title: `Deleting ${ids.length} product${ids.length !== 1 ? 's' : ''}`,
      url: '/products/bulk-delete-stream',
      body: { ids },
      noun: 'product',
      onDone: () => {
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: ['products'] });
      },
    });
  };

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Products</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openWpImport}>
            <Download className="w-4 h-4 mr-2" /> Import from WP.org
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <ProductForm onSubmit={(data: any) => createMutation.mutate(data)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-8"
            value={search}
            onChange={(e: any) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="plugin">Plugin</SelectItem>
            <SelectItem value="block">Block</SelectItem>
            <SelectItem value="theme">Theme</SelectItem>
            <SelectItem value="standalone">Standalone App</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={ownerId} onValueChange={(v) => { setOwnerId(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((u: any) => (
                <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isJobRunning}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete {selectedIds.size}
          </Button>
        </div>
      )}

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allOnPageSelected}
                  data-state={someOnPageSelected && !allOnPageSelected ? 'indeterminate' : undefined}
                  onCheckedChange={toggleSelectAll}
                  disabled={isLoading || products.length === 0}
                  aria-label="Select all on page"
                />
              </TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Links</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                  <TableCell><div className="flex gap-3"><Skeleton className="h-5 w-5 rounded" /><Skeleton className="h-5 w-5 rounded" /></div></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-destructive">
                  Failed to load products. Please try again.
                </TableCell>
              </TableRow>
            ) : products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">No products found.</TableCell>
              </TableRow>
            ) : (
              products?.map((product: any, index: number) => (
                <motion.tr
                  key={product._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`border-b transition-colors hover:bg-muted/50 ${selectedIds.has(product._id) ? 'bg-muted/40' : ''}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(product._id)}
                      onCheckedChange={() => toggleOne(product._id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    {product.icon ? (
                      <img src={product.icon} alt={product.name} className="w-8 h-8 rounded-md object-cover bg-muted" />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">No</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/products/${product._id}`} className="hover:underline text-blue-600">
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{product.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <a href={product.githubUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="GitHub Repository">
                        <GitBranch className="w-5 h-5" />
                      </a>
                      {product.wpOrgSlug && (
                        <a href={`https://wordpress.org/plugins/${product.wpOrgSlug}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="WordPress.org Page">
                          <Globe className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${product.name}`} onClick={() => setEditingProduct(product)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${product.name}`} onClick={async () => {
                      if (await confirm({
                        title: 'Delete Product',
                        description: 'Are you sure you want to permanently delete this product? This will also delete all associated activities, versions, marketing data, and media files. This action cannot be undone.'
                      })) {
                        deleteMutation.mutate(product._id);
                      }
                    }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <Dialog open={!!editingProduct} onOpenChange={(open: boolean) => !open && setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <ProductForm
              initialData={editingProduct}
              onSubmit={(data: any) => updateMutation.mutate({ id: editingProduct._id, ...data })}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
