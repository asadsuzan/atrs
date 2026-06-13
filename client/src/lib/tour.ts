import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

export const TOUR_SEEN_KEY = 'atrs_tour_seen';

export function hasSeenTour(): boolean {
  return localStorage.getItem(TOUR_SEEN_KEY) === '1';
}

export function markTourSeen(): void {
  localStorage.setItem(TOUR_SEEN_KEY, '1');
}

interface TourOptions {
  isAdmin?: boolean;
  /** Called when the user finishes or skips the tour. */
  onFinish?: () => void;
}

/**
 * Launches the interactive product tour. Steps are anchored to elements
 * carrying `data-tour="..."` attributes in the app shell. Missing anchors
 * (e.g. admin-only nav on a non-admin account) are filtered out automatically.
 */
export function startTour({ isAdmin = false, onFinish }: TourOptions = {}) {
  const candidateSteps: Array<DriveStep & { _selector?: string }> = [
    {
      element: '[data-tour="logo"]',
      _selector: '[data-tour="logo"]',
      popover: {
        title: '👋 Welcome to ATRS',
        description:
          'The Automated Townhall Report System helps you track your products, log development activity, and generate release reports. This quick tour shows you around — you can replay it anytime from <strong>Help &amp; Demos</strong>.',
      },
    },
    {
      element: '[data-tour="nav-/"]',
      _selector: '[data-tour="nav-/"]',
      popover: {
        title: 'Dashboard',
        description: 'Your command center — monthly summaries, activity trends, and a feed of recent changes across your products.',
      },
    },
    {
      element: '[data-tour="nav-/products"]',
      _selector: '[data-tour="nav-/products"]',
      popover: {
        title: 'Products',
        description: 'Register and manage the products you own — plugins, blocks, themes, or standalone apps. <strong>You only ever see your own products.</strong>',
      },
    },
    {
      element: '[data-tour="nav-/activities"]',
      _selector: '[data-tour="nav-/activities"]',
      popover: {
        title: 'Activities',
        description: 'Log features, improvements, and bug fixes against your products. Tag them as released/unreleased and attach media.',
      },
    },
    {
      element: '[data-tour="nav-/media"]',
      _selector: '[data-tour="nav-/media"]',
      popover: {
        title: 'Media Library',
        description: 'Browse the images and videos referenced by your products and activities.',
      },
    },
    {
      element: '[data-tour="nav-/reports"]',
      _selector: '[data-tour="nav-/reports"]',
      popover: {
        title: 'Reports',
        description: 'Generate monthly and annual summaries of your work and export them as PDF or JSON.',
      },
    },
    {
      element: '[data-tour="nav-/audit-logs"]',
      _selector: '[data-tour="nav-/audit-logs"]',
      popover: {
        title: 'Audit Logs',
        description: 'A trail of everything you create, update, or delete — for full accountability.',
      },
    },
    {
      element: '[data-tour="nav-/users"]',
      _selector: '[data-tour="nav-/users"]',
      popover: {
        title: 'Users (admin)',
        description: 'As an administrator, approve new sign-ups and manage roles and access here.',
      },
    },
    {
      element: '[data-tour="search"]',
      _selector: '[data-tour="search"]',
      popover: {
        title: 'Quick search',
        description: 'Press <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere to jump to a product, activity, or page instantly.',
      },
    },
    {
      element: '[data-tour="nav-/help"]',
      _selector: '[data-tour="nav-/help"]',
      popover: {
        title: 'Help & Demos',
        description: 'Full how-to guides live here — and you can relaunch this tour whenever you like.',
      },
    },
    {
      element: '[data-tour="user-menu"]',
      _selector: '[data-tour="user-menu"]',
      popover: {
        title: 'Your account',
        description: 'Your profile and sign-out button. That\'s the tour — you\'re ready to go! 🎉',
      },
    },
  ];

  const steps = candidateSteps.filter((step) => {
    if (step._selector === '[data-tour="nav-/users"]' && !isAdmin) return false;
    return document.querySelector(step._selector || '') !== null;
  });

  const d = driver({
    showProgress: true,
    allowClose: true,
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Finish',
    steps,
    onDestroyed: () => {
      markTourSeen();
      onFinish?.();
    },
  });

  d.drive();
  return d;
}
