# `client/src/components/dashboard/StreakCard.tsx`
**Purpose:** Dashboard daily-logging habit-loop card: shows the current/best streak flame, a 7-day dot trail, an inline "log what you worked on" field, today's notes, and a confetti + sound + milestone-toast reward on the first log of the day.
**Language / Size:** TSX / 11049 bytes

## Exports
- `StreakCard()` (named component, no props).

## Imports (Internal / External)
- Internal: `getLoggingStreak, logToday, deleteLog, type StreakStats` from `../../services/streak`; `playSound` from `@/lib/sound`; UI `Card, Button, Input, Skeleton`.
- External: `useMemo, useState` (react); `useQuery, useMutation, useQueryClient` (@tanstack/react-query); `toast` (sonner); `format` (date-fns); `AnimatePresence, motion` (framer-motion); icons `Flame, Trophy, Zap, X` (lucide-react).

## Props
None.

## State / Refs / Context consumed
- Module consts: `MILESTONES` (streak → message at 3/7/14/30/50/100), `CONFETTI_COLORS`.
- State: `note` (input text), `burstId` (confetti trigger counter).
- `queryClient` from `useQueryClient()`.

## Hooks & Effects (deps, purpose)
- `useQuery<StreakStats>(['streak'])` → `getLoggingStreak`.
- `logMutation` (`logToday`): on success clears note, invalidates `['streak']`, plays 'success' sound; if first-of-day increments `burstId` and toasts a milestone or "Streak extended to N"; else toasts today's count. On error plays 'error' + toast.
- `deleteMutation` (`deleteLog`): on success plays 'delete' + invalidates `['streak']`; on error toasts.
- `ConfettiBurst` uses `useMemo([burstId])` to compute 26 deterministic pseudo-random particles.

## Functions & handlers
- `handleDeleteNote(id)`: mutates delete; success toast differs when removing today's only note ("today is unlogged again").
- `handleLog()`: requires `note.trim().length >= 3` (else error toast); mutates if not pending.
- Input `onKeyDown` Enter → `handleLog`.
- `ConfettiBurst({ burstId })`: animated particle burst from card center.

## Rendered UI
- Loading skeleton while `isLoading || !streak`.
- Destructures `{ currentStreak, bestStreak, todayLogged, todayCount, last7, todayNotes }`; `atRisk = currentStreak > 0 && !todayLogged`.
- Adaptive `headline`/`subline` copy per day state; amber-tinted card when `atRisk`.
- Flame badge with streak count (spring-animated on change), best-streak trophy line, 7-day dot trail (`last7`, today ringed), inline input + "Log it" button, and today's notes as removable chips.

## Important logic & design patterns
- Implements a cue→craving→response→reward habit loop (documented in file comment).
- First-log-of-day detection via `!streak?.todayLogged` drives confetti + milestone toast.
- Deterministic confetti (seeded by index + burstId) avoids layout thrash from true randomness.
- Optimistic-feel copy computed from server `StreakStats`; all state re-derived after `['streak']` invalidation.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- No app contexts. Rendered on the Dashboard page (not an App.tsx global surface). Depends on the streak service and sound lib.
