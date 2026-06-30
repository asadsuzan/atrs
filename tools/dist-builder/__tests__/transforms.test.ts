import { describe, it, expect } from 'vitest';
import { stripProMarkers, hasProMarkers } from '../src/transforms/markers';
import { deletePath, setPath, applyJsonPatch } from '../src/transforms/jsonPatches';
import { applyTextEdits } from '../src/transforms/textEdits';

describe('markers', () => {
  it('removes an inline @pro block including the marker lines', () => {
    const src = [
      'const a = 1;',
      '/* @pro:start */',
      'const pro = expensive();',
      '/* @pro:end */',
      'const b = 2;',
    ].join('\n');
    const r = stripProMarkers(src);
    expect(r.removedFile).toBe(false);
    expect(r.removedBlocks).toBe(1);
    expect(r.content).toBe('const a = 1;\nconst b = 2;');
    expect(r.content).not.toContain('expensive');
  });

  it('flags a whole file via @pro-file in the head', () => {
    const r = stripProMarkers('// @pro-file\nexport const licenseGate = true;');
    expect(r.removedFile).toBe(true);
    expect(r.content).toBe('');
  });

  it('supports nested blocks', () => {
    const src = [
      'keep',
      '// @pro:start',
      'a',
      '// @pro:start',
      'b',
      '// @pro:end',
      'c',
      '// @pro:end',
      'keep2',
    ].join('\n');
    expect(stripProMarkers(src).content).toBe('keep\nkeep2');
  });

  it('throws on an unbalanced start', () => {
    expect(() => stripProMarkers('// @pro:start\nx')).toThrow(/Unbalanced/);
  });

  it('throws on a stray end', () => {
    expect(() => stripProMarkers('x\n// @pro:end')).toThrow(/without matching/);
  });

  it('detects markers', () => {
    expect(hasProMarkers('/* @pro:start */')).toBe(true);
    expect(hasProMarkers('const x = 1;')).toBe(false);
  });
});

describe('jsonPatches', () => {
  it('deletes a nested object key', () => {
    const obj = { a: { b: { c: 1, d: 2 } } };
    expect(deletePath(obj, 'a.b.c')).toBe(true);
    expect(obj.a.b).toEqual({ d: 2 });
    expect(deletePath(obj, 'a.b.missing')).toBe(false);
  });

  it('removes an array index', () => {
    const obj = { list: [10, 20, 30] };
    expect(deletePath(obj, 'list.1')).toBe(true);
    expect(obj.list).toEqual([10, 30]);
  });

  it('sets a path, creating intermediates', () => {
    const obj: any = {};
    setPath(obj, 'x.y.z', 5);
    expect(obj.x.y.z).toBe(5);
  });

  it('applies remove + set ops and reports them', () => {
    const json = { attributes: { fab: {}, keep: 1 } };
    const res = applyJsonPatch(json, { remove: ['attributes.fab'], set: { 'attributes.isPro': false } });
    expect(json).toEqual({ attributes: { keep: 1, isPro: false } });
    expect(res.removed).toEqual(['attributes.fab']);
    expect(res.set).toEqual(['attributes.isPro']);
  });
});

describe('textEdits', () => {
  it('drops lines containing a token', () => {
    const src = ' * Plugin Name: X\n * @fs_premium_only /vendor/freemius\n * Version: 1.0';
    const out = applyTextEdits(src, [{ drop: '@fs_premium_only' }]);
    expect(out).not.toContain('@fs_premium_only');
    expect(out).toContain('Plugin Name: X');
    expect(out).toContain('Version: 1.0');
  });

  it('applies a regex replace', () => {
    const out = applyTextEdits("'is_premium' => true,", [
      { replace: "'is_premium'\\s*=>\\s*true", with: "'is_premium' => false" },
    ]);
    expect(out).toBe("'is_premium' => false,");
  });
});
