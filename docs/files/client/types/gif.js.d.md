# `client/src/types/gif.js.d.ts`
**Purpose:** Ambient TypeScript module declaration (type shim) for the `gif.js` library, which ships no types. Lets the app import and use `gif.js` with type-checking.
**Language / Size:** TypeScript declaration (.d.ts) / 820 bytes

## Exports
Ambient `declare module 'gif.js'` — augments the module resolver; no runtime code. Declares a default-exported `GIF` class plus supporting option interfaces.

## API / Signature (declared types)
- `GIFOptions` — constructor options: `workers?`, `quality?`, `width?`, `height?`, `workerScript?`, `transparent?: number | null`, `repeat?`, `background?`, `dither?: boolean | string`.
- `AddFrameOptions` — per-frame options: `delay?`, `copy?`, `dispose?`.
- `export default class GIF`:
  - `constructor(options?: GIFOptions)`.
  - `addFrame(image: CanvasImageSource | CanvasRenderingContext2D, opts?: AddFrameOptions): void`.
  - `on(event: 'finished', cb: (blob: Blob) => void): void`.
  - `on(event: 'abort' | 'start', cb: () => void): void`.
  - `on(event: 'progress', cb: (percent: number) => void): void`.
  - `render(): void`.

## Imports (Internal / External)
None (declaration only).

## Behavior / Implementation
No behavior — this only describes the `gif.js` API's shape for the compiler. The event `on` overloads model gif.js's event system (`finished` yields a `Blob`, `progress` yields a percent number, `abort`/`start` yield no args).

## Data structures / Types / Constants
`GIFOptions`, `AddFrameOptions`, and the `GIF` class interface (as above).

## Relationships
- Enables typed use of `gif.js` wherever GIF export/animation is produced (e.g. exporting animated captures — related to the canvas/media/export flows). Complements browser canvas usage (`addFrame` accepts a canvas source or 2D context).

## Edge cases & known limitations
- Deliberately minimal ("Minimal type shim") — covers only the members the app uses; other gif.js options/methods are not declared.
- Must be picked up by the TS config's type roots/includes to take effect.
