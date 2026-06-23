import { useState } from 'react';
import { cn } from '@/lib/utils';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
];

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/**
 * Avatar for a version/activity author (typically a WordPress.org username),
 * with a graceful fallback chain:
 *   1. An explicit avatar URL (e.g. the WP.org contributor avatar).
 *   2. The WP.org gravatar redirect for that username.
 *   3. A deterministic colored initials badge.
 */
export function AuthorAvatar({
  author,
  avatarUrl,
  className,
}: {
  author: string;
  avatarUrl?: string;
  /** Tailwind sizing classes for the avatar box (default `w-6 h-6`). */
  className?: string;
}) {
  const sources = [
    avatarUrl,
    `https://wordpress.org/grav-redirect.php?user=${encodeURIComponent(author)}`,
  ].filter(Boolean) as string[];
  const [idx, setIdx] = useState(0);
  const src = sources[idx];
  const size = className || 'w-6 h-6';

  if (src) {
    return (
      <img
        src={src}
        alt={author}
        loading="lazy"
        className={cn('rounded-full object-cover bg-muted flex-shrink-0', size)}
        onError={() => setIdx((i) => i + 1)}
      />
    );
  }
  return (
    <span
      className={cn(
        'rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0',
        size,
        colorFor(author),
      )}
    >
      {authorInitials(author)}
    </span>
  );
}
