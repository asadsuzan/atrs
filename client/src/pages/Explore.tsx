import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Rocket, GitBranch, Globe, Loader2, ScrollText, Bug, Boxes, Search } from 'lucide-react';
import { useState } from 'react';
import { getPublicProducts, type PublicProduct } from '../services/public';
import { RichText } from '@/components/ui/RichText';

const CATEGORY_LABEL: Record<PublicProduct['category'], string> = {
  plugin: 'Plugin',
  block: 'Block',
  theme: 'Theme',
  standalone: 'App',
};

function ProductCard({ product }: { product: PublicProduct }) {
  return (
    <div className="flex flex-col rounded-2xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
      {product.banner && (
        <div className="h-24 w-full overflow-hidden bg-muted">
          <img src={product.banner} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-3">
          {product.icon ? (
            <img src={product.icon} alt="" className="w-11 h-11 rounded-xl object-cover bg-muted border shrink-0" loading="lazy" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-lg font-bold shrink-0">
              {product.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold tracking-tight truncate">{product.name}</h3>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {CATEGORY_LABEL[product.category]}
            </span>
          </div>
        </div>

        {product.description && (
          <RichText html={product.description} className="text-sm text-muted-foreground mt-3 line-clamp-3" />
        )}

        <div className="flex items-center gap-3 mt-4 pt-4 border-t text-sm flex-wrap">
          {product.publicChangelogEnabled && (
            <Link to={`/changelog/${product.id}`} className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline">
              <ScrollText className="w-4 h-4" /> Changelog
            </Link>
          )}
          {product.publicIssuesEnabled && (
            <Link to={`/issues/${product.id}`} className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline">
              <Bug className="w-4 h-4" /> Issues
            </Link>
          )}
          <span className="flex-1" />
          {product.wpOrgSlug && (
            <a href={`https://wordpress.org/plugins/${product.wpOrgSlug}`} target="_blank" rel="noopener noreferrer" title="WordPress.org" className="text-muted-foreground hover:text-primary transition-colors">
              <Globe className="w-4 h-4" />
            </a>
          )}
          {product.githubUrl && (
            <a href={product.githubUrl} target="_blank" rel="noopener noreferrer" title="GitHub" className="text-muted-foreground hover:text-primary transition-colors">
              <GitBranch className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Explore() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-products'],
    queryFn: getPublicProducts,
    retry: false,
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = 'Products — ATRS';
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="w-7 h-7 animate-spin" />
      </div>
    );
  }

  const products = data ?? [];
  const q = search.trim().toLowerCase();
  const filtered = q
    ? products.filter((p) => [p.name, p.description].some((s) => (s || '').toLowerCase().includes(q)))
    : products;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-primary" /> Products
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Browse our products. Open any product to see its changelog and known issues.
          </p>
          {products.length > 0 && (
            <div className="relative mt-5 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full pl-9 pr-3 h-10 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {isError ? (
          <div className="text-center py-16 text-muted-foreground">Couldn't load products. Please try again later.</div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Boxes className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground mt-3">No products published yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No products match "{search}".</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </main>

      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Rocket className="w-3.5 h-3.5" /> Powered by ATRS
          </Link>
        </div>
      </footer>
    </div>
  );
}
