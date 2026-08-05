import type mongoose from 'mongoose';
import type { ISignal } from '../../../models/Signal';
import type { IIssue } from '../../../models/Issue';
import type { ExpectedOutcome, RoadmapCategory } from '../../../models/RoadmapItem';
import type { SignalContext } from '../signals/context';
import type { Evidence, SignalCode } from '../signals/types';
import { compareFeatures, findCommonGaps } from '../FeatureMatcher';

/**
 * Turns signals, issues and feature gaps into roadmap candidates.
 *
 * A signal says "support resolution is 34%". A candidate says "publish FAQ answers
 * for the five most common threads, so resolution clears 60% within 30 days". The
 * translation is deterministic and lives in a table, because the remediation for a
 * known condition is domain knowledge that shouldn't be re-derived by a model on
 * every run — and certainly shouldn't vary between runs.
 *
 * The LLM's later contribution is limited to sharpening the prose. The work items,
 * the acceptance criteria and the predicted outcome all originate here.
 */

export interface Candidate {
  /** Stable identity across runs. */
  fingerprint: string;
  category: RoadmapCategory;
  title: string;
  description: string;
  rationale: string;
  actionItems: string[];
  acceptanceCriteria: string[];
  expectedOutcome?: ExpectedOutcome;

  signals: ISignal[];
  issues: IIssue[];
  competitorIds: mongoose.Types.ObjectId[];
  evidence: Evidence[];

  /** Overrides for RICE derivation. */
  fractionKey?: string;
  effortWeeks?: number;
  fallbackReachCount?: number;
  fallbackReachLabel?: string;
}

/** How to remediate one signal code. */
interface Remediation {
  category: RoadmapCategory;
  title: (s: ISignal, ctx: SignalContext) => string;
  description: (s: ISignal, ctx: SignalContext) => string;
  actionItems: (s: ISignal, ctx: SignalContext) => string[];
  acceptanceCriteria: (s: ISignal, ctx: SignalContext) => string[];
  outcome?: (s: ISignal, ctx: SignalContext) => ExpectedOutcome;
  fractionKey?: string;
  effortWeeks?: number;
}

const metricValue = (s: ISignal): number | null => (typeof s.metric?.value === 'number' ? s.metric.value : null);

/**
 * The remediation table.
 *
 * Only signals with a genuine, specific remedy appear here. Purely informational
 * signals (`traction.installs_growing`, `data.insufficient_history`) are
 * deliberately absent — generating a roadmap item for "installs are growing" would
 * pad the board with work nobody should do, which is exactly how AI planning tools
 * lose credibility.
 */
const REMEDIATION: Partial<Record<SignalCode, Remediation>> = {
  'security.vulnerability_present': {
    category: 'security',
    effortWeeks: 0.5,
    title: () => 'Patch the outstanding security advisories',
    description: (s) =>
      `${metricValue(s) ?? 'One or more'} unpatched vulnerabilit${(metricValue(s) ?? 1) === 1 ? 'y is' : 'ies are'} ` +
      `on public record for this plugin. Security advisories propagate to every WordPress security scanner and ` +
      `firewall vendor, so they reach users who have never visited your listing. This outranks all other work.`,
    actionItems: () => [
      'Retrieve the advisory details from the Patchstack database entry for this plugin',
      'Reproduce each reported vector against the current release',
      'Patch, then request a re-scan so the advisory is marked resolved',
      'Ship the fix as a patch release and note the security fix in the changelog',
      'Notify users through the readme upgrade notice so they update promptly',
    ],
    acceptanceCriteria: () => [
      'Every advisory listed for the plugin is marked patched',
      'A release containing the fixes is published to WordPress.org',
      'The changelog and upgrade notice state that a security fix is included',
    ],
    outcome: () => ({
      metric: 'unpatchedVulnerabilities',
      direction: 'resolve',
      targetValue: 0,
      unit: 'advisories',
      statement: 'No unpatched advisories remain on public record.',
      measureAfterDays: 14,
    }),
  },

  'bug.critical_open': {
    category: 'stability',
    title: (s) => `Resolve the ${metricValue(s) ?? ''} open critical bug${(metricValue(s) ?? 1) === 1 ? '' : 's'}`.replace('  ', ' '),
    description: (s, ctx) =>
      `${metricValue(s) ?? 'Critical'} critical-severity issue${(metricValue(s) ?? 1) === 1 ? '' : 's'} ` +
      `remain unresolved${ctx.wpInfo ? ` while the plugin is live on ${ctx.wpInfo.activeInstalls ? `${ctx.wpInfo.activeInstalls.toLocaleString('en-US')} sites` : 'WordPress.org'}` : ''}. ` +
      `Critical bugs are the dominant cause of 1-star reviews, and a review left during an outage outlives the bug by years.`,
    actionItems: () => [
      'Triage each open critical issue and confirm it still reproduces on the current release',
      'Fix, or downgrade the severity with a written justification if it no longer warrants critical',
      'Ship the fixes as a patch release rather than holding them for the next feature version',
      'Reply on any support thread or review that reported the issue, linking the fixed version',
    ],
    acceptanceCriteria: () => [
      'No issue remains at critical severity with an open or in-progress status',
      'Each fix is covered by a regression test or a documented manual check',
      'A patch release containing the fixes is published',
    ],
    outcome: () => ({
      metric: 'openCriticalIssues',
      direction: 'resolve',
      targetValue: 0,
      unit: 'issues',
      statement: 'No critical-severity issues remain open.',
      measureAfterDays: 21,
    }),
  },

  'bug.aging_backlog': {
    category: 'stability',
    title: (s) => `Clear the ${metricValue(s) ?? ''} aging high-severity issues`.replace('  ', ' '),
    description: (s) =>
      `${metricValue(s) ?? 'Several'} critical or high-severity issues have been open beyond 30 days. ` +
      `Age matters independently of count: a severe bug left for months tells users the tracker is decorative, ` +
      `and they stop reporting problems rather than waiting.`,
    actionItems: () => [
      'Review every high-severity issue open longer than 30 days',
      'Close the ones that no longer reproduce, recording what changed',
      'Re-severity the ones that were mis-triaged, with a note explaining why',
      'Schedule the genuine remainder into the next two releases',
    ],
    acceptanceCriteria: () => [
      'No critical or high-severity issue is older than 30 days without a scheduled target version',
      'Every issue closed as stale records why it no longer applies',
    ],
    outcome: () => ({
      metric: 'agingSevereIssues',
      direction: 'decrease',
      targetValue: 0,
      unit: 'issues',
      statement: 'No high-severity issue sits unaddressed beyond 30 days.',
      measureAfterDays: 45,
    }),
  },

  'bug.inflow_exceeds_outflow': {
    category: 'stability',
    effortWeeks: 1.5,
    title: () => 'Reverse the growing bug backlog',
    description: (s) =>
      `Issues are arriving faster than they are resolved, growing the backlog by ${metricValue(s) ?? 'several'} ` +
      `in the last 30 days. Left alone this compounds: a larger backlog makes triage slower, which lets it grow faster.`,
    actionItems: () => [
      'Dedicate a fixed share of the next two releases to defect work rather than features',
      'Group the open issues by root cause — recurring themes usually collapse several tickets into one fix',
      'Add regression tests for the two most frequently re-reported problems',
      'Reassess after two releases: resolution should exceed inflow',
    ],
    acceptanceCriteria: () => [
      'Issues resolved exceeds issues reported over a 30-day window',
      'The two most common root causes have regression coverage',
    ],
    outcome: () => ({
      metric: 'bugNetGrowth30d',
      direction: 'decrease',
      targetValue: 0,
      unit: 'issues',
      statement: 'The backlog stops growing — resolutions match or exceed new reports over 30 days.',
      measureAfterDays: 45,
    }),
  },

  'bug.spike': {
    category: 'stability',
    effortWeeks: 0.5,
    title: () => 'Investigate the issue-report spike',
    description: (s) =>
      `Issue reports are running well above this product's own baseline (${metricValue(s) ?? 'several'} in seven days). ` +
      `A spike of this shape almost always traces to a specific regression in the most recent release rather than to ` +
      `a general decline.`,
    actionItems: () => [
      'Compare the spike start date against the most recent release date',
      'Group the new reports for a common symptom, host or theme',
      'If a regression is confirmed, ship a patch release rather than waiting for the next feature version',
      'If no regression is found, record what else changed — a WordPress core release often explains it',
    ],
    acceptanceCriteria: () => [
      'The cause of the spike is identified and documented',
      'Report volume returns to within the historical weekly range',
    ],
    outcome: () => ({
      metric: 'issuesLast7d',
      direction: 'decrease',
      statement: 'Weekly issue volume returns to the historical baseline.',
      measureAfterDays: 21,
    }),
  },

  'compat.wp_tested_stale': {
    category: 'compliance',
    effortWeeks: 0.25,
    title: (s, ctx) => `Test against WordPress ${ctx.currentWp ?? 'the current release'} and bump the readme`,
    description: (s, ctx) =>
      `The listing declares compatibility up to WordPress ${ctx.wpInfo?.testedUpTo ?? 'an older release'} while ` +
      `${ctx.currentWp ?? 'the current version'} is live, so the directory warns every visitor that the plugin is ` +
      `untested with their WordPress. That warning suppresses installs whether or not the plugin actually works. ` +
      `This is among the cheapest interventions available: usually a test pass and a one-line readme change.`,
    actionItems: (s, ctx) => [
      `Run the plugin's test suite and a manual smoke test against WordPress ${ctx.currentWp ?? 'the current release'}`,
      `Update "Tested up to" in readme.txt to ${ctx.currentWp ?? 'the current release'}`,
      'Publish a release so the directory picks up the new header',
      'Add a release-checklist step so the header is bumped every time WordPress ships a minor',
    ],
    acceptanceCriteria: (s, ctx) => [
      `readme.txt declares "Tested up to: ${ctx.currentWp ?? 'current'}"`,
      'The directory listing no longer shows a compatibility warning',
      'The release checklist covers this header',
    ],
    outcome: () => ({
      metric: 'wpVersionLag',
      direction: 'resolve',
      targetValue: 0,
      unit: 'releases',
      statement: 'The listing declares compatibility with the current WordPress release.',
      measureAfterDays: 7,
    }),
  },

  'support.resolution_low': {
    category: 'support',
    effortWeeks: 0.75,
    title: () => 'Clear the unresolved support threads and publish the answers',
    description: (s, ctx) => {
      const unresolved =
        ctx.wpInfo && ctx.wpInfo.supportThreads !== null && ctx.wpInfo.supportThreadsResolved !== null
          ? ctx.wpInfo.supportThreads - ctx.wpInfo.supportThreadsResolved
          : null;
      return (
        `Support resolution sits at ${metricValue(s) ?? 'a low rate'}%, and WordPress.org publishes that ratio on ` +
        `your listing page${unresolved !== null ? ` with ${unresolved} thread${unresolved === 1 ? '' : 's'} awaiting a reply` : ''}. ` +
        `Unresolved threads are the most reliable leading indicator of the next batch of 1-star reviews, because a ` +
        `user who feels ignored reviews instead of waiting.`
      );
    },
    actionItems: () => [
      'Reply to every open support thread, even where the answer is "not supported" or "needs more detail"',
      'Mark threads resolved once answered — the ratio counts the flag, not the reply',
      'Group the threads by question and publish the top five as readme FAQ entries',
      'Set a standing weekly slot for forum triage so the ratio does not drift back',
    ],
    acceptanceCriteria: () => [
      'Every open support thread has a substantive reply',
      'Resolution rate exceeds 60%',
      'The five most frequent questions are answered in the readme FAQ',
    ],
    outcome: () => ({
      metric: 'supportResolutionRate',
      direction: 'increase',
      targetValue: 60,
      unit: '%',
      statement: 'Support resolution rate rises above 60%.',
      measureAfterDays: 30,
    }),
  },

  'support.backlog_growing': {
    category: 'support',
    effortWeeks: 0.5,
    title: () => 'Stop the support backlog from compounding',
    description: (s) =>
      `Unresolved support threads have grown to ${metricValue(s) ?? 'a rising count'}. Reply latency compounds: ` +
      `each unanswered thread also teaches the next user that asking is pointless, so the visible backlog ` +
      `understates the real support debt.`,
    actionItems: () => [
      'Work the oldest threads first — they are the ones most likely to become reviews',
      'Set a target first-response time and track it',
      'Convert every second answered thread into a documentation or FAQ entry',
    ],
    acceptanceCriteria: () => [
      'Unresolved thread count is lower than at the start of the period',
      'No thread waits longer than one week for a first response',
    ],
    outcome: () => ({
      metric: 'unresolvedSupportThreads',
      direction: 'decrease',
      statement: 'The unresolved support thread count falls.',
      measureAfterDays: 30,
    }),
  },

  'reputation.rating_low': {
    category: 'reputation',
    effortWeeks: 1,
    title: () => 'Address the causes behind the low rating',
    description: (s, ctx) =>
      `The plugin averages ${metricValue(s) ?? 'below 4'} stars${ctx.wpInfo ? ` across ${ctx.wpInfo.numRatings} reviews` : ''}. ` +
      `Below four stars the listing works against you, because the rating renders beside every search result. ` +
      `Ratings recover slowly — each new review is averaged against the whole history — so the work is to stop the ` +
      `cause and then earn volume.`,
    actionItems: () => [
      'Read every 1- and 2-star review and group them by the underlying complaint',
      'Fix the most frequently cited problem first, regardless of where it sits in the backlog',
      'Reply publicly to each negative review once fixed, naming the version that resolves it',
      'Ask satisfied users for a review at a natural success moment in the plugin UI',
    ],
    acceptanceCriteria: () => [
      'The most frequently cited complaint in negative reviews is fixed and released',
      'Every negative review has a public reply',
      'Mean rating is trending upward over 90 days',
    ],
    outcome: () => ({
      metric: 'meanStars',
      direction: 'increase',
      unit: 'stars',
      statement: 'Mean rating trends upward as new reviews land above the historical average.',
      measureAfterDays: 90,
    }),
  },

  'reputation.negative_share_high': {
    category: 'reputation',
    effortWeeks: 1,
    title: () => 'Find the reproducible failure behind the 1–2 star reviews',
    description: (s) =>
      `${metricValue(s) ?? 'A high share'}% of reviews sit at 1–2 stars. A polarised distribution is more tractable ` +
      `than a uniformly mediocre one: it usually means a specific, reproducible failure hitting one segment — a host, ` +
      `a theme, a PHP version, or one configuration path — rather than broad dissatisfaction.`,
    actionItems: () => [
      'Extract the environment details from every negative review: host, theme, PHP and WordPress version',
      'Look for the shared factor across them',
      'Reproduce against that environment and fix',
      'Reply to each review with the resolving version',
    ],
    acceptanceCriteria: () => [
      'The common factor across negative reviews is identified and documented',
      'A fix is released for it',
      'The share of 1–2 star reviews among new reviews falls below 15%',
    ],
    outcome: () => ({
      metric: 'negativeReviewShare',
      direction: 'decrease',
      targetValue: 15,
      unit: '%',
      statement: 'The share of 1–2 star reviews falls below 15%.',
      measureAfterDays: 90,
    }),
  },

  'reputation.thin_social_proof': {
    category: 'growth',
    effortWeeks: 0.5,
    title: () => 'Earn reviews in proportion to the install base',
    description: (s, ctx) =>
      `${ctx.wpInfo ? `${ctx.wpInfo.numRatings} reviews against ${ctx.wpInfo.activeInstalls?.toLocaleString('en-US') ?? 'the'} active installs` : 'Review volume'} ` +
      `is well below typical for a plugin this size. Review count is a conversion lever independent of quality: ` +
      `a prospective user comparing two plugins reads "4.8 from 6 reviews" as riskier than "4.6 from 200".`,
    actionItems: () => [
      'Add a dismissible review prompt in the plugin admin, triggered after a successful action rather than on activation',
      'Ask at the point the user has just got value — never on install',
      'Include a review link in the post-update notice',
      'Never gate functionality behind a review request; WordPress.org guidelines prohibit it',
    ],
    acceptanceCriteria: () => [
      'A review prompt ships, triggered on a success event and dismissible permanently',
      'Review count grows over the following 90 days',
    ],
    outcome: () => ({
      metric: 'reviewCount',
      direction: 'increase',
      unit: 'reviews',
      statement: 'Review count grows toward the norm for this install base.',
      measureAfterDays: 90,
    }),
  },

  'traction.churn_gap': {
    category: 'growth',
    effortWeeks: 2,
    title: () => 'Close the gap between downloads and retained installs',
    description: () =>
      `Downloads keep accruing while active installs stay flat, which means acquisition is working and retention is not. ` +
      `Users are finding the plugin, trying it, and removing it. That points at the first-run experience or at an ` +
      `expectation the listing sets and the product does not meet — not at discoverability.`,
    actionItems: () => [
      'Install the plugin on a clean site and record every step to first value',
      'Remove or defer any configuration that is not required before the plugin does something useful',
      'Check the listing for capabilities that are implied but gated, missing, or pro-only',
      'Add an onboarding path that reaches a visible result in under two minutes',
    ],
    acceptanceCriteria: () => [
      'First value is reachable within two minutes on a clean install',
      'Listing claims match what the free version actually does',
      'Active installs begin tracking download growth',
    ],
    outcome: () => ({
      metric: 'activeInstalls',
      direction: 'increase',
      unit: 'installs',
      statement: 'Active installs start growing in step with downloads.',
      measureAfterDays: 90,
    }),
  },

  'traction.installs_declining': {
    category: 'growth',
    effortWeeks: 1.5,
    title: () => 'Diagnose and halt the install decline',
    description: (s) =>
      `Active installs are falling (${s.metric?.delta ?? 'a measured drop'} over ${s.metric?.window ?? 'the period'}). ` +
      `WordPress.org reports installs in coarse buckets, so a visible decline means a substantial number of sites ` +
      `deactivated or removed the plugin — this is not measurement noise.`,
    actionItems: () => [
      'Line the decline up against your release dates — a regression is the most common cause',
      'Check reviews and support threads opened during the decline window for a shared complaint',
      'Verify the plugin still works on the current WordPress and PHP releases',
      'Check whether a competitor shipped something in the same window',
    ],
    acceptanceCriteria: () => [
      'The cause of the decline is identified and documented',
      'A corrective release ships if the cause is within the product',
      'Install count stabilises or resumes growth',
    ],
    outcome: () => ({
      metric: 'activeInstalls',
      direction: 'increase',
      unit: 'installs',
      statement: 'The install decline stops.',
      measureAfterDays: 60,
    }),
  },

  'traction.installs_stalled': {
    category: 'discoverability',
    effortWeeks: 1,
    title: () => 'Improve directory discoverability to restart install growth',
    description: () =>
      `Active installs have been flat across a long window. With the product maintained and the listing live, flat ` +
      `growth is usually a discoverability problem: the plugin is not surfacing for the searches its users make.`,
    actionItems: () => [
      'Search the directory for the terms a user would actually type and note where you rank',
      'Align the plugin title, short description and tags with those terms',
      'Fill all five indexable tag slots',
      'Study the top three results for your primary term and identify what their listings do that yours does not',
    ],
    acceptanceCriteria: () => [
      'Title, short description and tags all contain the primary search term',
      'All five tag slots are used',
      'Directory ranking for the primary term improves',
    ],
    outcome: () => ({
      metric: 'activeInstalls',
      direction: 'increase',
      unit: 'installs',
      statement: 'Install growth resumes.',
      measureAfterDays: 90,
    }),
  },

  'aso.no_screenshots': {
    category: 'discoverability',
    effortWeeks: 0.25,
    title: () => 'Publish screenshots on the directory listing',
    description: () =>
      `The listing has no screenshots. For anything with a user interface this is the single largest conversion gap ` +
      `available to fix — users judge whether a plugin looks maintained and capable from the screenshots before ` +
      `reading a word of the description.`,
    actionItems: () => [
      'Capture 3–5 screenshots covering the main interface and the primary outcome the plugin produces',
      'Write a caption for each in readme.txt under the Screenshots section',
      'Name the files screenshot-1.png onward and commit them to the /assets directory',
      'Use realistic content rather than lorem ipsum — placeholder text reads as unfinished',
    ],
    acceptanceCriteria: () => [
      'At least three captioned screenshots appear on the listing',
      'Each shows a real interface state, not placeholder content',
    ],
    outcome: () => ({
      metric: 'listingScore',
      direction: 'increase',
      unit: '/100',
      statement: 'Listing quality score rises and install conversion improves.',
      measureAfterDays: 60,
    }),
  },

  'aso.listing_incomplete': {
    category: 'discoverability',
    effortWeeks: 0.5,
    title: () => 'Complete the directory listing assets',
    description: (s, ctx) =>
      `The listing scores ${ctx.listingAudit?.score ?? 'below target'}/100 with missing or thin visual assets. ` +
      `These render on every search result and gate install conversion before a user reads anything about features.`,
    actionItems: (s, ctx) =>
      ctx.listingAudit
        ? ctx.listingAudit.topOpportunities.filter((c) => c.fix).map((c) => c.fix!)
        : ['Add a 772×250 banner, a 256×256 icon and at least three captioned screenshots to /assets'],
    acceptanceCriteria: () => [
      'Banner, icon and at least three screenshots are all published',
      'Listing quality score is above 80',
    ],
    outcome: () => ({
      metric: 'listingScore',
      direction: 'increase',
      targetValue: 80,
      unit: '/100',
      statement: 'Listing quality score exceeds 80.',
      measureAfterDays: 30,
    }),
  },

  'aso.short_description_weak': {
    category: 'discoverability',
    effortWeeks: 0.1,
    title: () => 'Rewrite the short description for search results',
    description: (s, ctx) =>
      `The short description is ${ctx.wpInfo?.shortDescription.length ?? 0} characters against the 150 WordPress.org ` +
      `displays. This single line appears under your plugin name in every search result, so it does more conversion ` +
      `work than any other text on the listing.`,
    actionItems: () => [
      'Write 90–150 characters leading with the user benefit, not the mechanism',
      'Include the primary search term naturally within the first half',
      'Cut every adjective that would survive being deleted',
      'Update the Description header in readme.txt',
    ],
    acceptanceCriteria: () => [
      'Short description is 90–150 characters',
      'It contains the primary search term and states a user benefit',
    ],
    outcome: () => ({
      metric: 'listingScore',
      direction: 'increase',
      unit: '/100',
      statement: 'Listing quality score rises.',
      measureAfterDays: 30,
    }),
  },

  'aso.tags_underused': {
    category: 'discoverability',
    effortWeeks: 0.1,
    title: () => 'Use all five indexable directory tags',
    description: (s, ctx) =>
      `${ctx.wpInfo?.tags.length ?? 0} of the five tags WordPress.org indexes are in use. Tags drive tag-browse ` +
      `placement and feed directory search, so unused slots are free discoverability left on the table.`,
    actionItems: () => [
      'List the terms a user would search for to find this plugin',
      'Check which of those terms tracked competitors rank under',
      'Set five tags in readme.txt, ordered most to least important',
      'Avoid brand names and generic words like "plugin" — they rank for nothing',
    ],
    acceptanceCriteria: () => ['readme.txt declares five tags matching real search terms'],
    outcome: () => ({
      metric: 'tagsUsed',
      direction: 'increase',
      targetValue: 5,
      unit: 'tags',
      statement: 'All five indexable tag slots are in use.',
      measureAfterDays: 30,
    }),
  },

  'aso.no_faq': {
    category: 'support',
    effortWeeks: 0.25,
    title: () => 'Publish an FAQ covering the most common support questions',
    description: () =>
      `The listing has no FAQ section. FAQ entries deflect the threads that would otherwise consume reply time and ` +
      `drag down the publicly displayed support resolution rate — the cheapest support work available.`,
    actionItems: () => [
      'List the five questions you answer most often in the support forum',
      'Write each as an FAQ entry in readme.txt with a direct answer in the first sentence',
      'Link the FAQ from the plugin admin where the relevant confusion occurs',
    ],
    acceptanceCriteria: () => [
      'At least five FAQ entries are published on the listing',
      'Each addresses a question that has actually been asked in the forum',
    ],
    outcome: () => ({
      metric: 'supportResolutionRate',
      direction: 'increase',
      unit: '%',
      statement: 'Fewer repeat questions reach the forum and resolution rate improves.',
      measureAfterDays: 60,
    }),
  },

  'release.dormant': {
    category: 'process',
    effortWeeks: 0.5,
    title: () => 'Ship a release to restore the maintenance signal',
    description: (s) =>
      `No release in ${metricValue(s) ?? 'an extended period'} days. Prospective users read "Last updated" as a proxy ` +
      `for whether the plugin is maintained, and WordPress.org adds its own warnings as the gap widens. Even a small ` +
      `release resets that signal.`,
    actionItems: () => [
      'Bundle whatever is already merged into a release rather than waiting for a milestone',
      'Refresh "Tested up to" against the current WordPress release as part of it',
      'Write a changelog entry, however short',
      'Set a minimum cadence — a maintenance release each quarter even with no feature work',
    ],
    acceptanceCriteria: () => [
      'A release is published to WordPress.org',
      '"Tested up to" matches the current WordPress release',
      'A minimum release cadence is agreed and recorded',
    ],
    outcome: () => ({
      metric: 'daysSinceLastRelease',
      direction: 'decrease',
      targetValue: 30,
      unit: 'days',
      statement: 'A release ships, resetting the public maintenance signal.',
      measureAfterDays: 30,
    }),
  },

  'release.unreleased_backlog': {
    category: 'process',
    effortWeeks: 0.25,
    title: () => 'Ship the completed work sitting unreleased',
    description: (s) =>
      `${metricValue(s) ?? 'Completed'} logged changes are held in unreleased versions. Work that is built but not ` +
      `shipped earns nothing and delays the feedback that would tell you whether it was right.`,
    actionItems: () => [
      'Review the unreleased changes and confirm they are complete',
      'Cut a release with what is ready rather than holding it for the rest',
      'Prefer smaller, more frequent releases — they shorten the feedback loop and reduce regression risk per release',
    ],
    acceptanceCriteria: () => ['The pending changes are published in a release'],
    outcome: () => ({
      metric: 'unreleasedChanges',
      direction: 'decrease',
      targetValue: 0,
      unit: 'changes',
      statement: 'The unreleased backlog is shipped.',
      measureAfterDays: 30,
    }),
  },

  'changelog.incomplete': {
    category: 'process',
    effortWeeks: 0.25,
    title: () => 'Document the releases that have no changelog',
    description: (s) =>
      `Only ${metricValue(s) ?? 'some'}% of released versions have changelog entries or release notes. ` +
      `Undocumented releases erode the upgrade confidence that gets users onto current versions — which is also ` +
      `what keeps your support load about the code you are actually running.`,
    actionItems: () => [
      'Backfill changelog entries for recent undocumented releases from the commit history',
      'Add a release-checklist step requiring a changelog entry before publishing',
      'Write entries in terms of user-visible change, not internal refactors',
    ],
    acceptanceCriteria: () => [
      'At least 80% of released versions have changelog entries or notes',
      'The release checklist requires a changelog entry',
    ],
    outcome: () => ({
      metric: 'changelogCoverage',
      direction: 'increase',
      targetValue: 80,
      unit: '%',
      statement: 'Changelog coverage exceeds 80% of released versions.',
      measureAfterDays: 45,
    }),
  },

  'release.cadence_slowing': {
    category: 'process',
    effortWeeks: 0.5,
    title: () => 'Restore the release cadence',
    description: (s) =>
      `Releases are now ${metricValue(s) ?? 'noticeably'} days apart against a faster historical rate. Sustained ` +
      `deceleration is the earliest externally visible sign of a product losing maintenance attention, and users ` +
      `read it that way.`,
    actionItems: () => [
      'Identify what changed — capacity, release friction, or scope per release',
      'If releases have grown larger, split them: smaller releases ship more reliably',
      'Automate whatever is manual in the release process',
    ],
    acceptanceCriteria: () => ['The gap between releases returns toward the historical median'],
    outcome: () => ({
      metric: 'meanDaysBetweenReleases',
      direction: 'decrease',
      statement: 'Release gaps shorten toward the historical norm.',
      measureAfterDays: 90,
    }),
  },

  'competitive.outshipped': {
    category: 'process',
    effortWeeks: 1,
    title: () => 'Close the shipping-speed gap with competitors',
    description: (s) =>
      `A tracked competitor releases substantially more often. Cadence compounds into responsiveness: the faster ` +
      `side can answer a user request or a WordPress core change within weeks while the slower side takes a quarter, ` +
      `and users notice which is which.`,
    actionItems: () => [
      'Measure your own release overhead — how long from "code ready" to "published"',
      'Automate the manual steps in that path',
      'Adopt smaller, more frequent releases rather than larger milestones',
    ],
    acceptanceCriteria: () => ['Median gap between releases is reduced', 'Release overhead is measured and lowered'],
    outcome: () => ({
      metric: 'medianDaysBetweenReleases',
      direction: 'decrease',
      statement: 'Release frequency increases toward the competitive rate.',
      measureAfterDays: 120,
    }),
  },

  'competitive.rating_deficit': {
    category: 'reputation',
    effortWeeks: 1,
    title: () => 'Close the rating gap with better-rated competitors',
    description: () =>
      `A tracked competitor is rated materially higher. Both ratings render side by side whenever a user compares ` +
      `options in the directory, so the gap costs installs at the point of decision.`,
    actionItems: () => [
      "Read the competitor's reviews to find what users praise that you do not deliver",
      'Read your own negative reviews for the mirror image',
      'Fix the most cited complaint and then work on review volume',
    ],
    acceptanceCriteria: () => ['The most cited complaint in your negative reviews is resolved', 'The rating gap narrows'],
    outcome: () => ({
      metric: 'ratingGap',
      direction: 'decrease',
      unit: 'stars',
      statement: 'The rating gap against the competitor narrows.',
      measureAfterDays: 120,
    }),
  },

  'compat.php_requirement_dated': {
    category: 'tech_debt',
    effortWeeks: 0.5,
    title: () => 'Raise the minimum PHP requirement',
    description: (s) =>
      `The plugin still declares support for PHP ${s.metric?.value ?? 'an end-of-life version'}, which receives no ` +
      `security patches. Raising the floor removes compatibility shims and unlocks modern language features, at the ` +
      `cost of the shrinking share of sites on old PHP.`,
    actionItems: () => [
      'Check the WordPress.org PHP version statistics to size the affected user share',
      'Raise "Requires PHP" to 7.4 or above in readme.txt and the plugin header',
      'Remove the polyfills and compatibility branches the old floor required',
      'Note the requirement change prominently in the changelog and upgrade notice',
    ],
    acceptanceCriteria: () => [
      '"Requires PHP" is 7.4 or higher',
      'Compatibility shims for the old version are removed',
      'The change is announced in the changelog',
    ],
    outcome: () => ({
      metric: 'requiresPhp',
      direction: 'increase',
      targetValue: 7.4,
      statement: 'The plugin requires a supported PHP version.',
      measureAfterDays: 30,
    }),
  },

  'perf.heavy_memory': {
    category: 'tech_debt',
    effortWeeks: 1.5,
    title: () => 'Reduce the measured performance footprint',
    description: () =>
      `Independent testing reports a measurable memory and page-load impact. Performance is a stated buying criterion ` +
      `for agencies and a recurring theme in plugin comparison articles, so the published figure has commercial weight ` +
      `beyond the technical one.`,
    actionItems: () => [
      'Profile the plugin on a clean install to find what loads on every request',
      'Defer or conditionally load anything not needed on the front end',
      'Move heavy work behind hooks that only fire where the feature is used',
      'Re-test and confirm the published figures improve',
    ],
    acceptanceCriteria: () => [
      'Assets and includes load conditionally rather than globally',
      'Measured memory and load-time impact are reduced',
    ],
    outcome: () => ({
      metric: 'memoryMb',
      direction: 'decrease',
      unit: 'MB',
      statement: 'Measured memory footprint falls.',
      measureAfterDays: 60,
    }),
  },

  'activity.no_recent': {
    category: 'process',
    effortWeeks: 0.1,
    title: () => 'Bring the product record back up to date',
    description: () =>
      `No development activity has been logged in 60 days. Either work has genuinely paused, or it is shipping without ` +
      `being recorded — and the second case silently degrades every metric on this page, including the ones this ` +
      `roadmap is built from.`,
    actionItems: () => [
      'Log the changes shipped since the last recorded entry',
      'If work has genuinely paused, decide and record whether the product is in maintenance mode',
      'Consider importing the WordPress.org changelog to backfill the gap',
    ],
    acceptanceCriteria: () => ['Activity log reflects what has actually shipped'],
  },

  'data.no_market_link': {
    category: 'process',
    effortWeeks: 0.1,
    title: () => 'Link the WordPress.org slug to unlock market analysis',
    description: () =>
      `No WordPress.org slug is set, so installs, ratings, support resolution, directory ranking, listing quality and ` +
      `all competitor comparison are unavailable. Analysis is limited to internal issue and release data until this is set.`,
    actionItems: () => [
      "Set the product's WordPress.org slug in its settings",
      'Run an analysis to capture the first market snapshot',
      'Add competitors so gap analysis and head-to-head comparison can run',
    ],
    acceptanceCriteria: () => ['The product has a WordPress.org slug and at least one market snapshot'],
  },
};

/** Signals that never produce roadmap work — recorded so the omission is intentional and reviewable. */
const NON_ACTIONABLE: SignalCode[] = [
  'traction.installs_growing',
  'reputation.rating_strong',
  'release.cadence_healthy',
  'bug.backlog_clearing',
  'competitive.category_leader',
  'competitive.competitor_released',
  'competitive.install_gap_widening',
  'competitive.no_competitors_tracked',
  'data.insufficient_history',
  'reputation.rating_declining',
];

/** Builds candidates from the remediation table. */
export function candidatesFromSignals(ctx: SignalContext, signals: ISignal[]): Candidate[] {
  const out: Candidate[] = [];

  for (const signal of signals) {
    const code = signal.code as SignalCode;
    if (NON_ACTIONABLE.includes(code)) continue;

    const remedy = REMEDIATION[code];
    if (!remedy) continue;

    // Attach the issues this work would actually close, so effort can come from
    // logged hours rather than a category default.
    const issues =
      remedy.category === 'stability'
        ? ctx.issues.filter(
            (i) =>
              (i.status === 'open' || i.status === 'in-progress') &&
              (code === 'bug.critical_open'
                ? i.severity === 'critical'
                : code === 'bug.aging_backlog'
                  ? (i.severity === 'critical' || i.severity === 'high') &&
                    (ctx.now.getTime() - new Date(i.createdAt).getTime()) / 86_400_000 > 30
                  : false),
          )
        : [];

    out.push({
      fingerprint: `signal:${code}${signal.competitorId ? `:${signal.competitorId}` : ''}`,
      category: remedy.category,
      title: remedy.title(signal, ctx),
      description: remedy.description(signal, ctx),
      rationale: signal.detail,
      actionItems: remedy.actionItems(signal, ctx),
      acceptanceCriteria: remedy.acceptanceCriteria(signal, ctx),
      expectedOutcome: remedy.outcome?.(signal, ctx),
      signals: [signal],
      issues,
      competitorIds: signal.competitorId ? [signal.competitorId] : [],
      evidence: signal.evidence,
      fractionKey: remedy.fractionKey,
      effortWeeks: remedy.effortWeeks,
      fallbackReachCount: fallbackReachFor(code, signal, ctx),
      fallbackReachLabel: fallbackLabelFor(code),
    });
  }

  return out;
}

/** A countable quantity to stand in for reach when install count is unknown. */
function fallbackReachFor(code: SignalCode, signal: ISignal, ctx: SignalContext): number | undefined {
  if (code === 'support.resolution_low' || code === 'support.backlog_growing') {
    if (ctx.wpInfo?.supportThreads != null && ctx.wpInfo.supportThreadsResolved != null) {
      return ctx.wpInfo.supportThreads - ctx.wpInfo.supportThreadsResolved;
    }
  }
  if (code === 'bug.critical_open' || code === 'bug.aging_backlog') {
    return typeof signal.metric?.value === 'number' ? signal.metric.value : undefined;
  }
  return undefined;
}

function fallbackLabelFor(code: SignalCode): string | undefined {
  if (code.startsWith('support.')) return 'unresolved support threads';
  if (code.startsWith('bug.')) return 'open issues';
  return undefined;
}

/**
 * Builds feature candidates from capability gaps shared across competitors.
 *
 * Only high-certainty gaps present in two or more competitors qualify. One
 * competitor's unique feature is their differentiation; a capability two of them
 * ship is a category expectation, and that distinction is the difference between
 * a roadmap and a list of everything every rival has ever built.
 */
export function candidatesFromFeatureGaps(ctx: SignalContext, signals: ISignal[]): Candidate[] {
  const withFeatures = ctx.competitors.filter((c) => c.features.length >= 3);
  if (withFeatures.length < 2 || ctx.ownFeatures.length < 3) return [];

  const gapSignal = signals.find((s) => s.code === 'competitive.feature_gap');

  const perCompetitor = withFeatures.map((c) => ({
    name: c.competitor.name,
    comparison: compareFeatures(ctx.ownFeatures, c.features),
  }));

  const common = findCommonGaps(perCompetitor)
    .filter((g) => g.certainty === 'high' && g.competitors.length >= 2)
    .slice(0, 5);

  return common.map((gap) => {
    const competitorIds = withFeatures
      .filter((c) => gap.competitors.includes(c.competitor.name))
      .map((c) => c.competitor._id as mongoose.Types.ObjectId);

    return {
      fingerprint: `gap:${gap.feature.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`,
      category: 'feature' as RoadmapCategory,
      title: `Evaluate building: ${truncate(gap.feature, 70)}`,
      description:
        `${gap.competitors.length} of ${gap.competitorCount} tracked competitors advertise this capability and this ` +
        `product's readme does not mention it: "${gap.feature}". Capabilities that multiple rivals ship tend to be ` +
        `category expectations rather than differentiation, so its absence is more likely to lose comparisons than ` +
        `its presence is to win them. Verify against the actual product before building — this gap was detected by ` +
        `comparing readme text, so a feature you have but do not advertise would appear here.`,
      rationale:
        `Detected by comparing this product's readme features against ${gap.competitorCount} competitor readmes. ` +
        `Advertised by: ${gap.competitors.join(', ')}.`,
      actionItems: [
        'Confirm the product genuinely lacks this capability rather than merely not advertising it',
        `Review how ${gap.competitors[0]} presents it, to size the expected scope`,
        'Check support threads and reviews for users asking about it',
        'Decide explicitly: build, document if it already exists, or record why it is out of scope',
      ],
      acceptanceCriteria: [
        'A build/document/decline decision is recorded with reasoning',
        'If built, the capability is documented in the readme so it counts in future comparisons',
      ],
      expectedOutcome: {
        metric: 'sharedFeatureGaps',
        direction: 'decrease' as const,
        unit: 'features',
        statement: 'One fewer capability gap shared across competitors.',
        measureAfterDays: 90,
      },
      signals: gapSignal ? [gapSignal] : [],
      issues: [],
      competitorIds,
      evidence: [
        {
          label: 'Capability',
          value: gap.feature,
          source: 'wp.org.readme',
        },
        {
          label: 'Advertised by',
          value: `${gap.competitors.join(', ')} (${gap.competitors.length} of ${gap.competitorCount})`,
          source: 'wp.org.readme',
        },
        {
          label: 'Detection method',
          value: 'Lexical comparison of readme feature lists — verify before building',
          source: 'atrs.featurematch',
        },
      ],
    };
  });
}

/**
 * Builds candidates from individual high-severity issues.
 *
 * Complements the aggregate stability candidates: "resolve the 3 open criticals"
 * is the right unit for planning, but a single long-standing high-severity bug
 * with logged hours deserves to be ranked on its own merits.
 */
export function candidatesFromIssues(ctx: SignalContext, signals: ISignal[]): Candidate[] {
  const stabilitySignals = signals.filter((s) => s.category === 'stability');

  const notable = ctx.issues
    .filter(
      (i) =>
        (i.status === 'open' || i.status === 'in-progress') &&
        i.severity === 'high' &&
        (ctx.now.getTime() - new Date(i.createdAt).getTime()) / 86_400_000 > 60,
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 3);

  return notable.map((issue) => {
    const ageDays = Math.floor((ctx.now.getTime() - new Date(issue.createdAt).getTime()) / 86_400_000);
    return {
      fingerprint: `issue:${issue._id}`,
      category: 'stability' as RoadmapCategory,
      title: `Resolve: ${truncate(issue.title, 70)}`,
      description:
        `This high-severity issue has been open for ${ageDays} days. ${issue.description ? truncate(issue.description, 300) : 'No description recorded.'}`,
      rationale: `High-severity issue open ${ageDays} days without resolution${issue.versionLabel ? `, reported against ${issue.versionLabel}` : ''}.`,
      actionItems: [
        'Confirm the issue still reproduces on the current release',
        'Fix it, or downgrade the severity with a written justification',
        'Add a regression test',
        issue.reporter ? `Notify ${issue.reporter} once resolved` : 'Notify the reporter once resolved',
      ],
      acceptanceCriteria: [
        'The issue is resolved or re-severitied with reasoning',
        'A regression test covers it',
      ],
      expectedOutcome: {
        metric: 'agingSevereIssues',
        direction: 'decrease' as const,
        unit: 'issues',
        statement: 'One fewer aging high-severity issue.',
        measureAfterDays: 30,
      },
      signals: stabilitySignals,
      issues: [issue],
      competitorIds: [],
      evidence: [
        { label: 'Issue', value: issue.title, source: 'atrs.issues', ref: String(issue._id) },
        { label: 'Severity', value: issue.severity, source: 'atrs.issues' },
        { label: 'Open for', value: `${ageDays} days`, source: 'atrs.issues' },
        ...(issue.versionLabel ? [{ label: 'Affected version', value: issue.versionLabel, source: 'atrs.issues' }] : []),
      ],
      fallbackReachCount: 1,
      fallbackReachLabel: 'affected issue',
    };
  });
}

const truncate = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);
