import { describe, it, expect } from 'vitest';
import {
  canonicalVersion,
  normalizeChangelogTitle,
  changelogFingerprint,
  parseReadmeChangelog,
} from './readmeChangelog';

describe('canonicalVersion', () => {
  it('treats zero-padded and zero-suffixed labels as the same version', () => {
    // The real mismatch behind unlinked imports: readme says "= 1.0 =", SVN
    // tags the release "1.0.0".
    expect(canonicalVersion('1.0')).toBe(canonicalVersion('1.0.0'));
    expect(canonicalVersion('1.1')).toBe(canonicalVersion('1.1.0'));
    expect(canonicalVersion('v2.0')).toBe(canonicalVersion('2'));
    expect(canonicalVersion('01.2')).toBe(canonicalVersion('1.2'));
  });

  it('keeps genuinely different versions apart', () => {
    expect(canonicalVersion('1.0.10')).not.toBe(canonicalVersion('1.0.1'));
    expect(canonicalVersion('1.10')).not.toBe(canonicalVersion('1.1'));
    expect(canonicalVersion('1.2.1')).not.toBe(canonicalVersion('1.2.2'));
  });

  it('falls back to a stable lowercased form for non-numeric labels', () => {
    expect(canonicalVersion('2.0-Beta1')).toBe('2.0-beta1');
    expect(canonicalVersion('')).toBe('');
  });
});

describe('normalizeChangelogTitle', () => {
  it('ignores punctuation, markdown and case differences', () => {
    const forms = ['Update SDK', 'Update SDK.', 'update sdk', '**Update SDK**', '* Update  SDK ;'];
    const normalized = forms.map(normalizeChangelogTitle);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe('update sdk');
  });

  it('does not merge different change lines', () => {
    expect(normalizeChangelogTitle('Fix pagination issue')).not.toBe(
      normalizeChangelogTitle('Fix mirror issue')
    );
  });
});

describe('changelogFingerprint', () => {
  it('collapses two readme headings that resolve to one version', () => {
    // The super-video-player case: readme listed the line under 1.7.1 and
    // 1.7.2, but both entries linked to Version 1.7.2 — a visible duplicate.
    expect(changelogFingerprint('1.7.2', 'code refactored')).toBe(
      changelogFingerprint('1.7.2', 'Code Refactored.')
    );
  });

  it('keeps the same line under different versions as separate entries', () => {
    // Plugin authors legitimately repeat a line release after release; those
    // must survive the import.
    expect(changelogFingerprint('1.0.5', 'Fix mirror issues.')).not.toBe(
      changelogFingerprint('1.0.6', 'Fix mirror issues.')
    );
  });

  it('matches a readme "1.0" heading against the SVN tag "1.0.0"', () => {
    expect(changelogFingerprint('1.0', 'Initial release')).toBe(
      changelogFingerprint('1.0.0', 'Initial release')
    );
  });
});

describe('parseReadmeChangelog + fingerprint (end to end)', () => {
  const readme = `
=== My Plugin ===

== Changelog ==

= 1.7.2 - 27 June 2024 =
* Fix: mirror issues
* Code refactored

= 1.7.1 =
* Code refactored.
* Update SDK

= 1.7 =
* Update SDK.
`;

  it('yields one fingerprint per distinct line per resolved version', () => {
    const blocks = parseReadmeChangelog(readme);
    expect(blocks.map((b) => b.version)).toEqual(['1.7.2', '1.7.1', '1.7']);

    // Resolve 1.7 → the real Version row "1.7.0", as the import now does.
    const resolve = (v: string) => (canonicalVersion(v) === canonicalVersion('1.7.0') ? '1.7.0' : v);
    const fps = blocks.flatMap((b) => b.items.map((i) => changelogFingerprint(resolve(b.version), i.title)));

    // "Code refactored" appears under two different versions → two entries kept.
    // "Update SDK" under 1.7.1 and "Update SDK." under 1.7 → different versions,
    // also two entries. Nothing collapses, and nothing repeats.
    expect(fps.length).toBe(5);
    expect(new Set(fps).size).toBe(5);
  });

  it('drops a line the readme lists twice under the same version', () => {
    const dupe = `
== Changelog ==

= 2.0.0 =
* Update SDK
* update sdk.
`;
    const blocks = parseReadmeChangelog(dupe);
    const fps = blocks.flatMap((b) => b.items.map((i) => changelogFingerprint(b.version, i.title)));
    expect(fps.length).toBe(2);
    expect(new Set(fps).size).toBe(1); // same line, same version → one entry
  });
});
