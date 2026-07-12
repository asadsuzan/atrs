import { useEffect, useState, lazy, Suspense, cloneElement } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useOutlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';






import { ChevronLeft, ChevronRight, Settings as SettingsIcon, Search, LogOut, Menu, X, Sparkles } from 'lucide-react';
import { APP_VERSION } from './data/changelog';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocalStorage } from './hooks/useLocalStorage';
import { startTour, hasSeenTour } from './lib/tour';
import { titleForPath } from './lib/pageTitle';

// Auth pages stay eager (small, hit before the heavy app shell loads).
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import SetPassword from './pages/SetPassword';

// Lazy-load page routes so heavy deps (jspdf, html2canvas, pptxgenjs, etc.)
// only load when their route is visited, shrinking the initial bundle.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Activities = lazy(() => import('./pages/Activities'));
const Reports = lazy(() => import('./pages/Reports'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Settings = lazy(() => import('./pages/Settings'));
const MediaManager = lazy(() => import('./pages/MediaManager'));
const Help = lazy(() => import('./pages/Help'));
const Users = lazy(() => import('./pages/admin/Users'));
const ReadmeTools = lazy(() => import('./pages/ReadmeTools'));
const Review = lazy(() => import('./pages/Review'));
const PublicChangelog = lazy(() => import('./pages/PublicChangelog'));
const AppChangelog = lazy(() => import('./pages/AppChangelog'));
const PublicIssues = lazy(() => import('./pages/PublicIssues'));
const Explore = lazy(() => import('./pages/Explore'));
const ChangelogGenerator = lazy(() => import('./pages/ChangelogGenerator'));
const FeatureRequests = lazy(() => import('./pages/FeatureRequests'));
import { ThemeProvider } from './contexts/ThemeProvider';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { WpImportProvider } from './contexts/WpImportContext';
import { WpOrgImportDialog } from './components/products/WpOrgImportDialog';
import { WpImportMiniPlayer } from './components/products/WpImportMiniPlayer';
import { JobStreamProvider } from './contexts/JobStreamContext';
import { JobStreamDialog } from './components/jobs/JobStreamDialog';
import { JobStreamMiniPlayer } from './components/jobs/JobStreamMiniPlayer';
import { FramerExportProvider } from './contexts/FramerExportContext';
import { FramerExportBoard } from './components/tools/FramerExportBoard';
import { JobDockProvider } from './contexts/JobDockContext';
import { ChangelogGenProvider } from './contexts/ChangelogGenContext';
import { ChangelogGenMiniPlayer } from './components/jobs/ChangelogGenMiniPlayer';
import { WindowManagerProvider } from './contexts/WindowManagerContext';
import { WindowLayer } from './components/windows/WindowLayer';
import { AddProductProvider } from './contexts/AddProductContext';
import { NotificationBell } from './components/layout/NotificationBell';
import { SidebarNav } from './components/layout/SidebarNav';
import { CommandPalette } from './components/layout/CommandPalette';
import { GetStarted } from './components/onboarding/GetStarted';
import { StaleProductAlert } from './components/products/StaleProductAlert';
import { Toaster } from '@/components/ui/sonner';
import SmoothScroll from './components/layout/SmoothScroll';
import { AuthBootSkeleton, PageSkeleton } from './components/ui/skeletons';

const queryClient = new QueryClient();

/** Toggles the command palette by dispatching the same shortcut it listens for. */
function openCommandPalette() {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true })
  );
}

/**
 * Shared sidebar content, used by both the fixed desktop rail and the mobile
 * slide-in drawer. On mobile it's always full-width (never the collapsed rail).
 */
function SidebarShell({
  isCollapsed, isAdmin, user, activePath, onLogout, onToggleCollapse, mobile = false, onClose,
}: {
  isCollapsed: boolean;
  isAdmin: boolean;
  user: any;
  activePath: string;
  onLogout: () => void;
  onToggleCollapse: () => void;
  mobile?: boolean;
  onClose?: () => void;
}) {
  const collapsed = mobile ? false : isCollapsed;
  return (
    <>
      <div data-tour="logo" className={`flex items-center mb-4 md:mb-6 mt-1 md:mt-2 transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'gap-2 px-2'}`}>
        <div className="w-8 h-8 rounded-xl shadow-sm flex items-center justify-center text-primary-foreground font-bold shrink-0 overflow-hidden">
          <img alt="ATRS" src="/favicon.svg" className="w-full h-full object-cover p-1" />
        </div>
        <div className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          <h1 className="text-xl font-bold tracking-tight leading-none">ATRS</h1>
          <span className="text-[10px] text-muted-foreground font-medium mt-0.5 tracking-wide">Automated Townhall Reporting System <br />
     
          </span>
        </div>  
        {mobile && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto p-2 -mr-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <SidebarNav isCollapsed={collapsed} isAdmin={isAdmin} />
      </div>

      {/* Bottom Actions */}
      <div className="mt-auto flex flex-col gap-2 pt-4 border-t">
        <Link
          to="/changelog"
          className={`flex items-center min-h-[44px] md:min-h-0 py-2 rounded-md transition-all duration-300 ease-in-out text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground ${
            collapsed ? 'justify-center px-0' : 'px-3 gap-2'
          }`}
          title={collapsed ? `What's New (v${APP_VERSION})` : undefined}
        >
          <Sparkles className={`shrink-0 transition-all duration-300 ${collapsed ? 'w-6 h-6' : 'w-4 h-4'}`} />
          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out text-sm ${collapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 flex items-baseline gap-1.5'}`}>
            What&apos;s New
            <span className="text-[10px] text-muted-foreground font-medium">v{APP_VERSION}</span>
           
          </span>
          
        </Link>

        {
          !collapsed && (
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5 tracking-wide">WordPress Plugin Coming Soon!
            </span>
          )
        }
   
        <Link
          to="/settings"
          className={`flex items-center min-h-[44px] md:min-h-0 py-2 rounded-md transition-all duration-300 ease-in-out ${
            collapsed ? 'justify-center px-0' : 'px-3 gap-2'
          } ${activePath.startsWith('/settings') ? 'bg-accent text-accent-foreground font-semibold' : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground font-medium'}`}
          title={collapsed ? 'Settings' : undefined}
        >
          <SettingsIcon className={`shrink-0 transition-all duration-300 ${collapsed ? 'w-6 h-6' : 'w-4 h-4'}`} />
          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out text-sm ${collapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
            Settings
          </span>
        </Link>

        {user && (
          <div data-tour="user-menu" className={`flex items-center gap-2 rounded-md border bg-muted/40 ${collapsed ? 'flex-col p-2' : 'px-3 py-2'}`}>
            <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
              {user.name?.substring(0, 2).toUpperCase() || '??'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{user.role}</div>
              </div>
            )}
            <button
              onClick={onLogout}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {!mobile && (
          <button
            onClick={onToggleCollapse}
            className={`p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors hidden md:flex ${collapsed ? 'mx-auto' : 'ml-auto'}`}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        )}
      </div>
    </>
  );
}

const DRAWER_EASE = [0.22, 1, 0.36, 1] as const;

function Layout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useLocalStorage<boolean>('atrs_sidebar_collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();

  // Auto-launch the interactive tour once for new users.
  useEffect(() => {
    if (user && !hasSeenTour()) {
      const t = setTimeout(() => startTour({ isAdmin }), 700);
      return () => clearTimeout(t);
    }
  }, [user, isAdmin]);

  // Close the mobile drawer on navigation (tapping a nav link routes → closes).
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Lock body scroll + close on Escape while the drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [mobileOpen]);

  const shellProps = {
    isCollapsed, isAdmin, user, activePath: location.pathname,
    onLogout: logout, onToggleCollapse: () => setIsCollapsed(!isCollapsed),
  };

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Desktop rail */}
      <aside
        className={`hidden md:flex glass border-r flex-col gap-4 shrink-0 transition-all duration-300 ease-in-out md:sticky md:top-0 md:h-screen z-10 ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } p-4`}
      >
        <SidebarShell {...shellProps} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', ease: DRAWER_EASE, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 w-[84%] max-w-xs glass border-r flex flex-col gap-4 p-4 md:hidden"
              style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
            >
              <SidebarShell {...shellProps} mobile onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile top app bar */}
        <header
          className="md:hidden sticky top-0 z-30 glass border-b flex items-center gap-1 px-2 h-14"
          style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(env(safe-area-inset-top) + 3.5rem)' }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex items-center justify-center w-11 h-11 rounded-md text-foreground hover:bg-accent transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <img alt="" src="/favicon.svg" className="w-6 h-6 rounded shrink-0" />
            <span className="font-bold tracking-tight truncate">ATRS</span>
          </div>
          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Search"
              onClick={openCommandPalette}
              className="flex items-center justify-center w-11 h-11 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8 w-full relative">
          {/* Desktop search + notifications */}
          <div className="hidden md:flex absolute top-4 right-4 items-center gap-3 z-10">
            <button
              type="button"
              data-tour="search"
              onClick={openCommandPalette}
              className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border hover:bg-accent transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 ml-1">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
            <NotificationBell />
          </div>
          <div
            className="max-w-6xl mx-auto w-full transition-all duration-300 mt-2 md:mt-0"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function FullScreenLoader() {
  return <AuthBootSkeleton />;
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-muted-foreground mt-2">This page could not be found.</p>
      <Link to="/" className="text-primary font-medium hover:underline mt-4">Back to dashboard</Link>
    </div>
  );
}

/** Layout route: requires an authenticated user, otherwise redirects to /login. */
function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const outlet = useOutlet();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  // A user with a one-time (admin-issued) password must choose their own first.
  if (user.mustChangePassword) return <Navigate to="/set-password" replace />;
  return (
    <Layout>
      <CommandPalette />
      <GetStarted />
      <StaleProductAlert />
      <Suspense fallback={<PageSkeleton />}>
        {/* Animate only the page content, keyed by path, so the surrounding
            Layout (sidebar — its scroll position and expanded nav panels) stays
            mounted across navigation. */}
        <AnimatePresence mode="wait">
          {outlet ? cloneElement(outlet, { key: location.pathname }) : null}
        </AnimatePresence>
      </Suspense>
    </Layout>
  );
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Redirects already-authenticated users away from auth pages. */
function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AnimatedRoutes() {
  // Set the tab title on every navigation for static routes. Entity routes
  // (product detail, public pages) return null here and own their own title.
  const { pathname } = useLocation();
  useEffect(() => {
    const title = titleForPath(pathname);
    if (title !== null) document.title = title;
  }, [pathname]);

  // No key/AnimatePresence here: keying <Routes> by pathname would remount the
  // whole tree (including ProtectedLayout → Layout → SidebarNav) on every
  // navigation, resetting the sidebar's scroll + expanded sections. Page-content
  // transitions are handled inside ProtectedLayout instead, so the Layout stays
  // mounted across route changes.
  return (
    <Routes>
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
        {/* Self-gates: requires auth + mustChangePassword (see component). */}
        <Route path="/set-password" element={<SetPassword />} />
        {/* ATRS's own release notes — public, no auth, outside the app shell. */}
        <Route path="/changelog" element={<Suspense fallback={<PageSkeleton />}><AppChangelog /></Suspense>} />
        {/* Public hosted changelog for a product — no auth, outside the app shell. */}
        <Route path="/changelog/:id" element={<Suspense fallback={<PageSkeleton />}><PublicChangelog /></Suspense>} />
        {/* Public hosted issues — no auth, outside the app shell. */}
        <Route path="/issues/:id" element={<Suspense fallback={<PageSkeleton />}><PublicIssues /></Suspense>} />
        {/* Public product directory — no auth, outside the app shell. */}
        <Route path="/explore" element={<Suspense fallback={<PageSkeleton />}><Explore /></Suspense>} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/media" element={<MediaManager />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/readme-tools" element={<ReadmeTools />} />
          <Route path="/changelog-generator" element={<ChangelogGenerator />} />
          <Route path="/review" element={<Review />} />
          <Route path="/feature-requests" element={<FeatureRequests />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          <Route path="/users" element={<RequireAdmin><Users /></RequireAdmin>} />
          <Route path="*" element={<NotFound />} />
        </Route>
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="todoist">
      <ConfirmProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NotificationProvider>
              <WpImportProvider>
                <AddProductProvider>
                <JobStreamProvider>
                <FramerExportProvider>
                <WindowManagerProvider>
                <ChangelogGenProvider>
                <JobDockProvider>
                  <SmoothScroll>
                    <BrowserRouter>
                      <AnimatedRoutes />
                      {/* Inside the router so it can navigate back to the generator. */}
                      <ChangelogGenMiniPlayer />
                    </BrowserRouter>
                  </SmoothScroll>
                  <WindowLayer />
                  {/* Global streaming surfaces — persist across route changes so a
                      minimized import/job keeps streaming from any page. The
                      mini-players/boards dock themselves into one draggable,
                      non-overlapping stack (JobDockProvider). */}
                  <WpOrgImportDialog />
                  <WpImportMiniPlayer />
                  <JobStreamDialog />
                  <JobStreamMiniPlayer />
                  <FramerExportBoard />
                  <Toaster />
                </JobDockProvider>
                </ChangelogGenProvider>
                </WindowManagerProvider>
                </FramerExportProvider>
                </JobStreamProvider>
                </AddProductProvider>
              </WpImportProvider>
            </NotificationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
}

export default App;
