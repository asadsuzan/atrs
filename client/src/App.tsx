import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayoutDashboard, Package, Activity, BarChart2, ChevronLeft, ChevronRight, Settings as SettingsIcon, History, Search } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

// Placeholders for Pages
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Activities from './pages/Activities';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import { ThemeProvider } from './contexts/ThemeProvider';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { CommandPalette } from './components/layout/CommandPalette';
import { Toaster } from '@/components/ui/sonner';
import SmoothScroll from './components/layout/SmoothScroll';

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/products', icon: Package, label: 'Products' },
    { to: '/activities', icon: Activity, label: 'Activities' },
    { to: '/reports', icon: BarChart2, label: 'Reports' },
    { to: '/audit-logs', icon: History, label: 'Audit Logs' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative">
      <aside 
        className={`border-r bg-card flex flex-col gap-4 shrink-0 transition-all duration-300 ease-in-out md:sticky md:top-0 md:h-screen z-10 ${
          isCollapsed ? 'w-full md:w-20 p-2 md:p-4' : 'w-full md:w-64 p-4'
        }`}
      >
        <div className={`flex items-center mb-6 mt-2 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'gap-2 px-2'}`}>
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold shrink-0">A</div>
          <h1 className={`text-xl font-bold tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>ATRS</h1>
        </div>
        
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <Link 
                key={item.to}
                to={item.to} 
                className={`flex items-center py-2 rounded-md transition-all duration-300 ease-in-out ${
                  isCollapsed ? 'justify-center px-0' : 'px-3 gap-2'
                } ${isActive ? 'bg-accent text-accent-foreground font-semibold' : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground font-medium'}`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className={`shrink-0 transition-all duration-300 ${isCollapsed ? 'w-6 h-6' : 'w-4 h-4'}`} />
                <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out text-sm ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

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
        <div className="absolute top-4 right-4 hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border">
          <Search className="w-4 h-4" />
          <span>Search</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 ml-1">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
        <div className="max-w-6xl mx-auto w-full transition-all duration-300 mt-4 md:mt-0">
          {children}
        </div>
      </main>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="todoist">
      <ConfirmProvider>
        <QueryClientProvider client={queryClient}>
          <SmoothScroll>
            <BrowserRouter>
              <Layout>
                <CommandPalette />
                <AnimatedRoutes />
              </Layout>
            </BrowserRouter>
          </SmoothScroll>
          <Toaster />
        </QueryClientProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
}

export default App;
