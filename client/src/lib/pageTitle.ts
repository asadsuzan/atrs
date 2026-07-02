// Centralized page-title logic. Static routes get their title from here;
// dynamic/entity routes (product detail, public pages) own their own title via
// useDocumentTitle so they can include the entity name once it loads.

export const BRAND = 'ATRS';

/** `"Reports"` → `"Reports · ATRS"`; empty/falsy → just the brand. */
export function formatTitle(title?: string | null): string {
  return title ? `${title} · ${BRAND}` : BRAND;
}

const STATIC_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/login': 'Sign in',
  '/register': 'Create account',
  '/forgot-password': 'Reset password',
  '/set-password': 'Set password',
  '/products': 'Products',
  '/activities': 'Activities',
  '/media': 'Media Library',
  '/reports': 'Reports',
  '/readme-tools': 'Readme Tools',
  '/changelog-generator': 'Git Changelog',
  '/review': 'Review queue',
  '/audit-logs': 'Audit Logs',
  '/settings': 'Settings',
  '/help': 'Help',
  '/users': 'Users',
};

// Routes whose page component sets its own (entity-aware) title.
const PAGE_OWNED = [
  /^\/explore\/?$/,
  /^\/products\/[^/]+/,
  /^\/changelog\/[^/]+/,
  /^\/issues\/[^/]+/,
];

/**
 * The title for a route, already brand-formatted, or `null` when the page owns
 * its own title (so the central setter leaves it alone). Unknown paths fall
 * back to "Page not found" (the catch-all route).
 */
export function titleForPath(pathname: string): string | null {
  if (pathname in STATIC_TITLES) return formatTitle(STATIC_TITLES[pathname]);
  if (PAGE_OWNED.some((re) => re.test(pathname))) return null;
  return formatTitle('Page not found');
}
