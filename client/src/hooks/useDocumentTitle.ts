import { useEffect } from 'react';
import { formatTitle } from '../lib/pageTitle';

/**
 * Sets the browser tab title to `"<title> · ATRS"` (or just "ATRS" when empty),
 * for pages that derive their title from loaded data (e.g. a product name).
 * Pass `null`/`undefined` while data is still loading.
 */
export function useDocumentTitle(title?: string | null): void {
  useEffect(() => {
    document.title = formatTitle(title);
  }, [title]);
}
