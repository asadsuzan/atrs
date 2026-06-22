import { useEffect, lazy, Suspense, cloneElement } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useOutlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';






import { ChevronLeft, ChevronRight, Settings as SettingsIcon, Search, LogOut } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useLocalStorage } from './hooks/useLocalStorage';
import { startTour, hasSeenTour } from './lib/tour';

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
const CodeActivity = lazy(() => import('./pages/CodeActivity'));
const ReadmeTools = lazy(() => import('./pages/ReadmeTools'));
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
import { AddProductProvider } from './contexts/AddProductContext';
import { NotificationBell } from './components/layout/NotificationBell';
import { SidebarNav } from './components/layout/SidebarNav';
import { CommandPalette } from './components/layout/CommandPalette';
import { GetStarted } from './components/onboarding/GetStarted';
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

function Layout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useLocalStorage<boolean>('atrs_sidebar_collapsed', false);
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();

  // Auto-launch the interactive tour once for new users.
  useEffect(() => {
    if (user && !hasSeenTour()) {
      const t = setTimeout(() => startTour({ isAdmin }), 700);
      return () => clearTimeout(t);
    }
  }, [user, isAdmin]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative">
      <aside 
        className={`border-r bg-card flex flex-col gap-4 shrink-0 transition-all duration-300 ease-in-out md:sticky md:top-0 md:h-screen z-10 ${
          isCollapsed ? 'w-full md:w-20 p-2 md:p-4' : 'w-full md:w-64 p-4'
        }`}
      >
        <div data-tour="logo" className={`flex items-center mb-6 mt-2 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'gap-2 px-2'}`}>
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold shrink-0">A</div>
          <h1 className={`text-xl font-bold tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>ATRS</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          <SidebarNav isCollapsed={isCollapsed} isAdmin={isAdmin} />
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto flex flex-col gap-2 pt-4 border-t">
          <Link 
            to="/settings"
            className={`flex items-center py-2 rounded-md transition-all duration-300 ease-in-out ${
              isCollapsed ? 'justify-center px-0' : 'px-3 gap-2'
            } ${location.pathname.startsWith('/settings') ? 'bg-accent text-accent-foreground font-semibold' : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground font-medium'}`}
            title={isCollapsed ? "Settings" : undefined}
          >
            <SettingsIcon className={`shrink-0 transition-all duration-300 ${isCollapsed ? 'w-6 h-6' : 'w-4 h-4'}`} />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out text-sm ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
              Settings
            </span>
          </Link>
          
          {user && (
            <div data-tour="user-menu" className={`flex items-center gap-2 rounded-md border bg-muted/40 ${isCollapsed ? 'flex-col p-2' : 'px-3 py-2'}`}>
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                {user.name?.substring(0, 2).toUpperCase() || '??'}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{user.name}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{user.role}</div>
                </div>
              )}
              <button
                onClick={logout}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors hidden md:flex ${isCollapsed ? 'mx-auto' : 'ml-auto'}`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8 transition-all duration-300 ease-in-out w-full">
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <div data-tour="search" className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border">
            <Search className="w-4 h-4" />
            <span>Search</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 ml-1">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
          {/* Mobile-visible command palette trigger (the ⌘K hint is desktop-only). */}
          <button
            type="button"
            aria-label="Open command palette"
            onClick={openCommandPalette}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-full border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
          <NotificationBell />
        </div>
        <div className="max-w-6xl mx-auto w-full transition-all duration-300 mt-4 md:mt-0">
          {children}
        </div>
      </main>
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
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/media" element={<MediaManager />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/code-activity" element={<CodeActivity />} />
          <Route path="/readme-tools" element={<ReadmeTools />} />
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
                  <SmoothScroll>
                    <BrowserRouter>
                      <AnimatedRoutes />
                    </BrowserRouter>
                  </SmoothScroll>
                  {/* Global streaming surfaces — persist across route changes so a
                      minimized import/job keeps streaming from any page. */}
                  <WpOrgImportDialog />
                  <WpImportMiniPlayer />
                  <JobStreamDialog />
                  <JobStreamMiniPlayer />
                  <Toaster />
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
