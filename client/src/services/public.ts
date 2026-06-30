// Public (no-auth) endpoints. These use raw fetch rather than the authed `api`
// axios instance so they work for signed-out visitors on the hosted pages.

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  banner: string;
  category: 'plugin' | 'block' | 'theme' | 'standalone';
  githubUrl: string;
  wpOrgSlug: string;
  publicChangelogEnabled: boolean;
  publicIssuesEnabled: boolean;
}

/** The public product directory (all products with a public surface enabled). */
export const getPublicProducts = async (): Promise<PublicProduct[]> => {
  const res = await fetch('/api/public/products');
  if (!res.ok) throw new Error('Failed to load products');
  const data = await res.json();
  return data.products as PublicProduct[];
};
