import { describe, it, expect } from 'vitest';
import { assembleRelease, toReadmeChangelog, toMarkdown } from './releaseFormat';
import { parseReadmeChangelog } from './readmeChangelog';

const acts = (versionId: any) => [
  { type: 'feature' as const, title: 'Add dashboard', versionId },
];

describe('releaseFormat — unreleased marker', () => {
  it('flags a version whose status is unreleased', () => {
    const { releases } = assembleRelease(
      [{ _id: 'v1', label: '2.0.8', status: 'unreleased', releasedAt: null }],
      acts('v1'),
    );
    expect(releases[0].unreleased).toBe(true);
  });

  it('sorts unreleased versions first', () => {
    const { releases } = assembleRelease(
      [
        { _id: 'v1', label: '2.0.7', status: 'released', releasedAt: '2026-06-02' },
        { _id: 'v2', label: '2.0.8', status: 'unreleased', releasedAt: null },
      ],
      [...acts('v1'), ...acts('v2')],
    );
    expect(releases[0].label).toBe('2.0.8');
  });

  it('readme.txt marks unreleased inside the header and still round-trips', () => {
    const assembled = assembleRelease(
      [{ _id: 'v1', label: '2.0.8', status: 'unreleased', releasedAt: null }],
      acts('v1'),
    );
    const readme = toReadmeChangelog(assembled);
    expect(readme).toContain('Unreleased');
    // The importer must still recover the version label from the header.
    const parsed = parseReadmeChangelog(readme);
    expect(parsed[0].version).toBe('2.0.8');
  });

  it('markdown marks unreleased versions but not the unversioned block', () => {
    const assembled = assembleRelease(
      [{ _id: 'v1', label: '2.0.8', status: 'unreleased', releasedAt: null }],
      acts('v1'),
    );
    const md = toMarkdown('My Plugin', assembled);
    expect(md).toContain('## 2.0.8 (Unreleased)');
  });

  it('markdown marks an individual unreleased entry inside a released version', () => {
    const assembled = assembleRelease(
      [{ _id: 'v1', label: '2.0.7', status: 'released', releasedAt: '2026-06-02' }],
      [
        { type: 'feature', title: 'Shipped feature', versionId: 'v1' },
        { type: 'bug-fix', title: 'Pending fix', versionId: 'v1', tags: ['unreleased'] },
      ],
    );
    const md = toMarkdown('My Plugin', assembled);
    expect(md).toContain('- **Pending fix** _(Unreleased)_');
    expect(md).toContain('- **Shipped feature**');
    expect(md).not.toContain('Shipped feature** _(Unreleased)_');
  });
});
