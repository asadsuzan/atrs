import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Package, Activity, BarChart2, History, Image as ImageIcon,
  Users as UsersIcon, HelpCircle, ChevronRight, Calendar, CalendarRange,
  Snowflake, Heart, Sprout, CloudRain, Flower2, Sun, Umbrella, Waves, Leaf, Wind, CloudFog, Gift,
  PlusCircle, Wrench, Bug, FileText, Plus, Tag, Megaphone, User, Code2, FileCheck2,
} from 'lucide-react';
import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { getProducts } from '../../services/products';
import { getActivities } from '../../services/activities';
import { getUsers } from '../../services/users';
import { getNavSettings } from '../../services/config';
import { useAddProduct } from '../../contexts/AddProductContext';
import { Skeleton } from '@/components/ui/skeleton';

// Each month gets a season/holiday-relevant icon.
const MONTHS: { label: string; icon: any }[] = [
  { label: 'Jan', icon: Snowflake },
  { label: 'Feb', icon: Heart },
  { label: 'Mar', icon: Sprout },
  { label: 'Apr', icon: CloudRain },
  { label: 'May', icon: Flower2 },
  { label: 'Jun', icon: Sun },
  { label: 'Jul', icon: Umbrella },
  { label: 'Aug', icon: Waves },
  { label: 'Sep', icon: Leaf },
  { label: 'Oct', icon: Wind },
  { label: 'Nov', icon: CloudFog },
  { label: 'Dec', icon: Gift },
];

/** Truncates a product name to the 10-char nav label (per spec). */
const navLabel = (name: string) => (name.length > 10 ? `${name.slice(0, 10)}…` : name);

/** Small product avatar: the product's icon, or a tinted initial fallback. */
function ProductAvatar({ product }: { product: any }) {
  if (product.icon) {
    return <img src={product.icon} alt="" className="w-5 h-5 rounded object-cover bg-muted shrink-0" />;
  }
  return (
    <span className="w-5 h-5 rounded bg-primary/15 text-primary text-[9px] font-semibold flex items-center justify-center shrink-0">
      {product.name?.[0]?.toUpperCase() || '?'}
    </span>
  );
}

// Per-changelog-type leading icon (mirrors the colors used in Reports).
const LOG_TYPE_ICONS: Record<string, any> = { feature: PlusCircle, improvement: Wrench, 'bug-fix': Bug };
const LOG_TYPE_COLOR: Record<string, string> = { feature: 'text-blue-500', improvement: 'text-purple-500', 'bug-fix': 'text-red-500' };

// Tabs from the product detail page, surfaced as nested nav items.
const PRODUCT_TABS: { key: string; label: string; icon: any }[] = [
  { key: 'activities', label: 'Activity Timeline', icon: Activity },
  { key: 'versions', label: 'Versions', icon: Tag },
  { key: 'marketing', label: 'Marketing Hub', icon: Megaphone },
];

/**
 * A product row inside the Products group. The label links to the product
 * detail page; the chevron expands the product's detail tabs as nested links
 * (each deep-links to that tab via ?tab=). The Readme tab only appears when the
 * product actually has readme content. Module-scope so its open state survives
 * the parent's re-renders on navigation.
 */
function ProductTabsItem({ product, pathname, search }: { product: any; pathname: string; search: string }) {
  const [open, setOpen] = useState(false);
  const detailPath = `/products/${product._id}`;
  const onDetail = pathname === detailPath;
  const activeTab = new URLSearchParams(search).get('tab') || 'activities';

  const tabs = [...PRODUCT_TABS];
  if (product.wpReadme) tabs.push({ key: 'readme', label: 'Readme', icon: FileText });

  return (
    <div>
      <div className="flex items-center">
        <Link
          to={detailPath}
          title={product.name}
          className="flex items-center gap-2 flex-1 min-w-0 py-1.5 pl-9 pr-1 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
        >
          <ProductAvatar product={product} />
          <span className="truncate">{navLabel(product.name)}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? `Collapse ${product.name} tabs` : `Expand ${product.name} tabs`}
          aria-expanded={open}
          className="p-1 mr-1 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-0.5">
          {tabs.map((t) => {
            const active = onDetail && activeTab === t.key;
            return (
              <Link
                key={t.key}
                to={`${detailPath}?tab=${t.key}`}
                title={t.label}
                className={`flex items-center gap-2 py-1 pl-[3.75rem] pr-3 rounded-md text-xs transition-colors ${
                  active ? 'text-primary font-medium bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                }`}
              >
                <t.icon className="w-3 h-3 shrink-0" />
                <span className="truncate">{t.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * A product row inside the Changelogs group. The label links to the filtered
 * changelog list; the chevron lazily loads the product's log entries, each of
 * which deep-links to that entry on the product detail page (same target as the
 * changelog table's title link). Defined at module scope so its open/loaded
 * state survives the parent's re-renders on navigation.
 */
function ChangelogProductItem({ product, pathname, hash }: { product: any; pathname: string; hash: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['activities', 'nav', product._id],
    queryFn: () => getActivities({ productId: product._id, limit: 50, sortBy: 'activityDate', sortOrder: 'desc' }),
    enabled: open,
  });
  const logs: any[] = data?.data || [];

  return (
    <div>
      <div className="flex items-center">
        <Link
          to={`/activities?productId=${product._id}`}
          title={product.name}
          className="flex items-center gap-2 flex-1 min-w-0 py-1.5 pl-9 pr-1 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
        >
          <ProductAvatar product={product} />
          <span className="truncate">{navLabel(product.name)}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? `Collapse ${product.name} logs` : `Expand ${product.name} logs`}
          aria-expanded={open}
          className="p-1 mr-1 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-0.5">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-1 pl-[3.75rem] pr-3">
                <Skeleton className="w-3 h-3 rounded-full shrink-0" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
            ))
          ) : logs.length === 0 ? (
            <span className="block pl-[3.75rem] py-1 text-xs text-muted-foreground">No changelogs</span>
          ) : (
            logs.map((a) => {
              const Icon = LOG_TYPE_ICONS[a.type] || FileText;
              const active = pathname === `/products/${product._id}` && hash === `#activity-${a._id}`;
              return (
                <Link
                  key={a._id}
                  to={`/products/${product._id}#activity-${a._id}`}
                  title={a.title}
                  className={`flex items-center gap-2 py-1 pl-[3.75rem] pr-3 rounded-md text-xs transition-colors ${
                    active ? 'text-primary font-medium bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                  }`}
                >
                  <Icon className={`w-3 h-3 shrink-0 ${LOG_TYPE_COLOR[a.type] || ''}`} />
                  <span className="truncate">{a.title}</span>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Collapsible per-owner group used in the admin sidebar to bucket nested items
 * (products / changelogs) by the user they belong to. Module-scope so each
 * group's open state survives the parent's re-renders on navigation.
 */
function UserNavGroup({ name, count, defaultOpen, children }: { name: string; count: number; defaultOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 w-full py-1.5 pl-6 pr-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
      >
        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        <User className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate flex-1 text-left">{name}</span>
        <span className="text-xs text-muted-foreground/70 shrink-0">{count}</span>
      </button>
      {open && <div className="flex flex-col gap-0.5">{children}</div>}
    </div>
  );
}

interface Props {
  isCollapsed: boolean;
  isAdmin: boolean;
}

export function SidebarNav({ isCollapsed, isAdmin }: Props) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { openAddProduct, openAddProductFirst } = useAddProduct();

  // Sidebar product list. Shares the 'products' query prefix so existing
  // invalidateQueries(['products']) calls (create/delete/import) refresh it too.
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', 'nav'],
    queryFn: () => getProducts({ limit: 100 }),
  });
  const products: any[] = productsData?.data || [];

  // Admins see every owner's products, so we group the nested items by user.
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => getUsers(), enabled: isAdmin });
  const userNameMap = useMemo(() => new Map((users as any[]).map((u) => [u._id, u.name])), [users]);
  const ownerId = (p: any) => (p.ownerId && typeof p.ownerId === 'object' ? (p.ownerId._id || String(p.ownerId)) : String(p.ownerId));
  const productGroups = useMemo(() => {
    if (!isAdmin) return [] as [string, any[]][];
    const map = new Map<string, any[]>();
    for (const p of products) {
      const oid = ownerId(p);
      if (!map.has(oid)) map.set(oid, []);
      map.get(oid)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) =>
      (userNameMap.get(a[0]) || '').localeCompare(userNameMap.get(b[0]) || '')
    );
  }, [products, isAdmin, userNameMap]);

  // Admin-configured nested-navigation mode (expanded | collapsed | disabled).
  const { data: navSettings } = useQuery({ queryKey: ['nav-settings'], queryFn: getNavSettings });
  const navMode = navSettings?.mode ?? 'expanded';
  const navDisabled = navMode === 'disabled';

  const [productsOpen, setProductsOpen] = useState(true);
  const [changelogsOpen, setChangelogsOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(true);
  const [monthlyOpen, setMonthlyOpen] = useState(false);

  // Seed the section open-state from the admin default whenever it loads/changes.
  // (Within a session, user toggles persist because the sidebar stays mounted.)
  useEffect(() => {
    if (navMode === 'collapsed') {
      setProductsOpen(false); setChangelogsOpen(false); setReportsOpen(false);
    } else if (navMode === 'expanded') {
      setProductsOpen(true); setChangelogsOpen(true); setReportsOpen(true);
    }
  }, [navMode]);

  const currentYear = new Date().getFullYear();

  const isPathActive = (to: string) =>
    location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  const rowBase = 'flex items-center py-2 rounded-md transition-all duration-300 ease-in-out text-sm';
  const activeCls = 'bg-accent text-accent-foreground font-semibold';
  const idleCls = 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground font-medium';

  const LeafLink = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const active = isPathActive(to);
    return (
      <Link
        to={to}
        data-tour={`nav-${to}`}
        title={isCollapsed ? label : undefined}
        className={`${rowBase} ${isCollapsed ? 'justify-center px-0' : 'px-3 gap-2'} ${active ? activeCls : idleCls}`}
      >
        <Icon className={`shrink-0 transition-all duration-300 ${isCollapsed ? 'w-6 h-6' : 'w-4 h-4'}`} />
        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
          {label}
        </span>
      </Link>
    );
  };

  // A top-level link that also has a chevron toggling a nested list. Clicking
  // the label navigates; clicking the chevron only expands/collapses.
  const SectionHeader = ({
    to, icon: Icon, label, open, onToggle,
  }: { to: string; icon: any; label: string; open: boolean; onToggle: () => void }) => {
    const active = location.pathname === to;
    return (
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
        <Link
          to={to}
          data-tour={`nav-${to}`}
          title={isCollapsed ? label : undefined}
          className={`${rowBase} flex-1 ${isCollapsed ? 'justify-center px-0' : 'px-3 gap-2'} ${active ? activeCls : idleCls}`}
        >
          <Icon className={`shrink-0 transition-all duration-300 ${isCollapsed ? 'w-6 h-6' : 'w-4 h-4'}`} />
          {!isCollapsed && <span className="whitespace-nowrap overflow-hidden flex-1">{label}</span>}
        </Link>
        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
            aria-expanded={open}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>
    );
  };

  // A nested child link (indented). `leading` is the avatar/icon shown before the label.
  const ChildLink = ({ to, label, active, leading, full }: { to: string; label: string; active: boolean; leading: ReactNode; full?: string }) => (
    <Link
      to={to}
      title={full || label}
      className={`flex items-center gap-2 py-1.5 pl-9 pr-3 rounded-md text-sm transition-colors ${
        active ? 'text-primary font-medium bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
      }`}
    >
      {leading}
      <span className="truncate">{label}</span>
    </Link>
  );

  // Skeleton row used while the product list loads.
  const ChildSkeleton = () => (
    <div className="flex items-center gap-2 py-1.5 pl-9 pr-3">
      <Skeleton className="w-5 h-5 rounded shrink-0" />
      <Skeleton className="h-3 w-24 rounded" />
    </div>
  );

  // Empty-state call-to-action button shown when a group has no products.
  const EmptyAction = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 mx-2 my-1 px-2.5 py-1.5 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent/40 transition-colors"
    >
      <Plus className="w-3.5 h-3.5 shrink-0" /> {label}
    </button>
  );

  const reportsTab = searchParams.get('tab');
  const reportsMonth = searchParams.get('month');
  const onReports = location.pathname === '/reports';

  return (
    <nav className="flex flex-col gap-1 flex-1">
      <LeafLink to="/" icon={LayoutDashboard} label="Dashboard" />

      {/* Products → product → its detail tabs (deep-linked via ?tab=) */}
      {navDisabled ? (
        <LeafLink to="/products" icon={Package} label="Products" />
      ) : (
        <>
          <SectionHeader to="/products" icon={Package} label="Products" open={productsOpen} onToggle={() => setProductsOpen(!productsOpen)} />
          {!isCollapsed && productsOpen && (
            <div className="flex flex-col gap-0.5 mb-1">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <ChildSkeleton key={i} />)
              ) : products.length === 0 ? (
                <EmptyAction label="Add product" onClick={openAddProduct} />
              ) : isAdmin ? (
                productGroups.map(([oid, ps]) => (
                  <UserNavGroup key={oid} name={userNameMap.get(oid) || 'Unknown user'} count={ps.length} defaultOpen={navMode !== 'collapsed'}>
                    {ps.map((p) => (
                      <ProductTabsItem key={p._id} product={p} pathname={location.pathname} search={location.search} />
                    ))}
                  </UserNavGroup>
                ))
              ) : (
                products.map((p) => (
                  <ProductTabsItem key={p._id} product={p} pathname={location.pathname} search={location.search} />
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Changelogs → product → its log entries (deep-linked to the detail page) */}
      {navDisabled ? (
        <LeafLink to="/activities" icon={Activity} label="Changelogs" />
      ) : (
        <>
          <SectionHeader to="/activities" icon={Activity} label="Changelogs" open={changelogsOpen} onToggle={() => setChangelogsOpen(!changelogsOpen)} />
          {!isCollapsed && changelogsOpen && (
            <div className="flex flex-col gap-0.5 mb-1">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <ChildSkeleton key={i} />)
              ) : products.length === 0 ? (
                <EmptyAction label="Add changelog" onClick={openAddProductFirst} />
              ) : isAdmin ? (
                productGroups.map(([oid, ps]) => (
                  <UserNavGroup key={oid} name={userNameMap.get(oid) || 'Unknown user'} count={ps.length} defaultOpen={navMode !== 'collapsed'}>
                    {ps.map((p) => (
                      <ChangelogProductItem key={p._id} product={p} pathname={location.pathname} hash={location.hash} />
                    ))}
                  </UserNavGroup>
                ))
              ) : (
                products.map((p) => (
                  <ChangelogProductItem key={p._id} product={p} pathname={location.pathname} hash={location.hash} />
                ))
              )}
            </div>
          )}
        </>
      )}

      <LeafLink to="/media" icon={ImageIcon} label="Media Library" />

      {/* Reports → Monthly (months) + Annual */}
      {navDisabled ? (
        <LeafLink to="/reports" icon={BarChart2} label="Reports" />
      ) : (
        <>
      <SectionHeader to="/reports" icon={BarChart2} label="Reports" open={reportsOpen} onToggle={() => setReportsOpen(!reportsOpen)} />
      {!isCollapsed && reportsOpen && (
        <div className="flex flex-col gap-0.5 mb-1">
          {/* Monthly sub-group */}
          <button
            type="button"
            onClick={() => setMonthlyOpen(!monthlyOpen)}
            className="flex items-center gap-2 py-1.5 pl-6 pr-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${monthlyOpen ? 'rotate-90' : ''}`} />
            <Calendar className="w-3.5 h-3.5" />
            <span>Monthly</span>
          </button>
          {monthlyOpen && (
            <div className="flex flex-col gap-0.5">
              {MONTHS.map((m, i) => (
                <ChildLink
                  key={m.label}
                  to={`/reports?tab=monthly&month=${i + 1}&year=${currentYear}`}
                  label={`${m.label} ${currentYear}`}
                  active={onReports && reportsTab !== 'annual' && reportsMonth === String(i + 1)}
                  leading={<m.icon className="w-3.5 h-3.5 shrink-0" />}
                />
              ))}
            </div>
          )}

          {/* Annual (single link) */}
          <ChildLink
            to="/reports?tab=annual"
            label="Annual"
            active={onReports && reportsTab === 'annual'}
            leading={<CalendarRange className="w-3.5 h-3.5 shrink-0" />}
          />
        </div>
      )}
        </>
      )}

      <LeafLink to="/code-activity" icon={Code2} label="Code Activity" />
      <LeafLink to="/readme-tools" icon={FileCheck2} label="Readme Tools" />
      <LeafLink to="/audit-logs" icon={History} label="Audit Logs" />
      {isAdmin && <LeafLink to="/users" icon={UsersIcon} label="Users" />}
      <LeafLink to="/help" icon={HelpCircle} label="Help & Demos" />
    </nav>
  );
}
