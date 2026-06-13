import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { startTour } from '@/lib/tour';
import {
  PlayCircle, Rocket, Package, Activity, GitBranch, Megaphone, BarChart2,
  Image as ImageIcon, History, Settings as SettingsIcon, Users as UsersIcon,
  Sparkles, KeyRound, HelpCircle, ChevronRight,
} from 'lucide-react';

interface Section {
  id: string;
  icon: React.ElementType;
  title: string;
  intro: string;
  steps: string[];
  adminOnly?: boolean;
}

const SECTIONS: Section[] = [
  {
    id: 'getting-started',
    icon: Rocket,
    title: 'Getting started',
    intro:
      'ATRS is your personal workspace. Everything you create — products, activities, versions, marketing — belongs to you, and you only see your own data. New accounts must be approved by an administrator before first sign-in.',
    steps: [
      'Sign in with the email and password you registered.',
      'Use the left sidebar to move between sections. Collapse it with the arrow at the bottom.',
      'Press ⌘/Ctrl + K anywhere to quickly jump to a product, activity, or page.',
      'Switch themes and dark mode from Settings.',
    ],
  },
  {
    id: 'products',
    icon: Package,
    title: 'Managing products',
    intro: 'Products are the things you ship — plugins, blocks, themes, or standalone apps.',
    steps: [
      'Go to Products and click “Create Product”.',
      'Fill in the name, GitHub URL, and category, and optionally upload an icon/banner.',
      'Add a WordPress.org slug to pull public stats automatically.',
      'Open a product to manage its timeline, versions, and marketing hub.',
      'Deleting a product also removes its activities, versions, marketing, and media.',
    ],
  },
  {
    id: 'activities',
    icon: Activity,
    title: 'Logging activities',
    intro: 'Activities are the individual changes you make: features, improvements, and bug fixes.',
    steps: [
      'Go to Activities and click “Add Activity”.',
      'Pick the product, type, tier (free/pro), priority, and date.',
      'Attach images or videos, and add nested “items” for larger updates.',
      'Tag activities as released or unreleased.',
      'Filter, sort, and bulk-edit from the Activities table; reorder them by dragging on the product page.',
    ],
  },
  {
    id: 'versions',
    icon: GitBranch,
    title: 'Tracking versions',
    intro: 'Record releases for each product so activities can be tied to a version.',
    steps: [
      'Open a product and switch to the Versions tab.',
      'Add a version label (e.g. v2.4.1), release date, and notes.',
      'Reference a version when creating an activity.',
    ],
  },
  {
    id: 'marketing',
    icon: Megaphone,
    title: 'Marketing Hub',
    intro: 'Store landing-page copy, problem/solution grids, key features, demos, screenshots, and FAQs in one place.',
    steps: [
      'Open a product and go to the Marketing Hub tab.',
      'Fill in fields manually, or click “Smart Import” to paste a copy block and auto-fill.',
      'Export to HTML, Word, PDF, PowerPoint, JSON, or a raw template.',
    ],
  },
  {
    id: 'reports',
    icon: BarChart2,
    title: 'Reports',
    intro: 'Summarize your work over a month, a custom range, or a full year.',
    steps: [
      'Go to Reports and choose Monthly/Detailed or Annual.',
      'Pick a month-year or custom date range and optionally a product.',
      'Click Generate, expand the cards to review, then export as PDF or JSON.',
    ],
  },
  {
    id: 'media',
    icon: ImageIcon,
    title: 'Media Library',
    intro: 'Browse the images and videos referenced by your own products and activities.',
    steps: [
      'Go to Media Library to see your files with their references.',
      'Filter by type or product, and copy a file URL to reuse it.',
    ],
  },
  {
    id: 'audit-logs',
    icon: History,
    title: 'Audit logs',
    intro: 'Every create, update, and delete you perform is recorded for accountability.',
    steps: [
      'Go to Audit Logs to see your activity trail.',
      'Filter by action, entity type, date range, or search text.',
    ],
  },
  {
    id: 'settings',
    icon: SettingsIcon,
    title: 'Settings & appearance',
    intro: 'Personalize your workspace.',
    steps: [
      'Pick from seven theme palettes.',
      'Toggle dark mode manually, or enable Auto Dark Mode to follow your system.',
    ],
  },
  {
    id: 'users',
    icon: UsersIcon,
    title: 'User management (admin)',
    adminOnly: true,
    intro: 'Administrators approve new sign-ups and control access.',
    steps: [
      'Go to Users to see pending registrations.',
      'Approve, suspend, or reactivate accounts.',
      'Promote a user to admin or demote them.',
      'As an admin you can see and manage every user’s data; system configuration and full database export live in Settings.',
    ],
  },
  {
    id: 'smart-parser',
    icon: Sparkles,
    title: 'The Smart Parser',
    intro: 'Smart Import in the Marketing Hub turns a pasted copy document into structured fields automatically.',
    steps: [
      'Open Marketing Hub → Smart Import.',
      'Paste your landing-page copy block.',
      'Click Auto-Parse & Fill, review the results, then Save Hub.',
    ],
  },
];

export default function Help() {
  const { isAdmin } = useAuth();
  const [active, setActive] = useState<string>('getting-started');
  const sections = SECTIONS.filter((s) => !s.adminOnly || isAdmin);

  const scrollTo = (id: string) => {
    setActive(id);
    document.getElementById(`help-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Hero */}
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-transparent p-8">
        <div className="flex items-center gap-2 text-primary mb-2">
          <HelpCircle className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">Help & Demos</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">How to use ATRS</h1>
        <p className="text-muted-foreground max-w-2xl mb-6">
          Learn how to track products, log activity, and generate reports. New here? Take the
          guided tour for a 60-second walkthrough of the whole app.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => startTour({ isAdmin })}>
            <PlayCircle className="w-4 h-4 mr-2" />
            Start interactive tour
          </Button>
          <Link to="/products">
            <Button variant="outline">
              <Package className="w-4 h-4 mr-2" />
              Go to my products
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        {/* Table of contents */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-3 mb-1">
              On this page
            </p>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`flex items-center gap-2 text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                  active === s.id
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <s.icon className="w-4 h-4 shrink-0" />
                {s.title}
              </button>
            ))}
          </div>
        </aside>

        {/* Sections */}
        <div className="flex flex-col gap-6">
          {sections.map((s) => (
            <section
              key={s.id}
              id={`help-${s.id}`}
              className="rounded-xl border bg-card p-6 scroll-mt-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <s.icon className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">{s.title}</h2>
                {s.adminOnly && (
                  <span className="text-[10px] uppercase tracking-wide bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mb-4">{s.intro}</p>
              <ol className="flex flex-col gap-2">
                {s.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                      {i + 1}
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: step.replace(/⌘\/Ctrl \+ K/, '<kbd class="px-1.5 py-0.5 rounded border bg-muted text-xs">⌘/Ctrl + K</kbd>') }} />
                  </li>
                ))}
              </ol>
            </section>
          ))}

          {/* Account & security note */}
          <section className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">Accounts & privacy</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Your workspace is private: you can only see and manage the products and activities you
              own. Administrators can see all data and manage user accounts. Sign out anytime from
              the user menu at the bottom of the sidebar.
            </p>
          </section>

          <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-5">
            <div>
              <p className="font-semibold">Want the guided walkthrough again?</p>
              <p className="text-sm text-muted-foreground">Replay the interactive tour anytime.</p>
            </div>
            <Button variant="outline" onClick={() => startTour({ isAdmin })}>
              <PlayCircle className="w-4 h-4 mr-2" />
              Replay tour
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
