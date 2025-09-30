declare module 'officegen' {
  interface OfficeGenOptions {
    [key: string]: any;
  }

  interface SlideOptions {
    x?: string | number;
    y?: string | number;
    cx?: string | number;
    cy?: string | number;
    font_size?: number;
    bold?: boolean;
    bullet?: boolean;
  }

  interface Slide {
    addText(text: string | string[], options?: SlideOptions): void;
  }

  interface OfficeGen {
    makeNewSlide(): Slide;
    on(event: 'data', callback: (chunk: Buffer) => void): void;
    on(event: 'end', callback: () => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
    generate(): void;
  }

  function officegen(type: string, options?: OfficeGenOptions): OfficeGen;

  export = officegen;
}