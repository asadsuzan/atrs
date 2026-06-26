// Minimal type shim for gif.js (ships no types).
declare module 'gif.js' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    transparent?: number | null;
    repeat?: number;
    background?: string;
    dither?: boolean | string;
  }
  interface AddFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }
  export default class GIF {
    constructor(options?: GIFOptions);
    addFrame(image: CanvasImageSource | CanvasRenderingContext2D, opts?: AddFrameOptions): void;
    on(event: 'finished', cb: (blob: Blob) => void): void;
    on(event: 'abort' | 'start', cb: () => void): void;
    on(event: 'progress', cb: (percent: number) => void): void;
    render(): void;
  }
}
