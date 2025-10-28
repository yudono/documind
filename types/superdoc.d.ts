declare module "@harbour-enterprises/superdoc" {
  export interface SuperDocExportOptions {
    [key: string]: unknown;
  }

  export class SuperDoc {
    constructor(options: any);
    // Content APIs
    setHTML?: (html: string) => void;
    setContent?: (html: string) => void;
    getHTML?: () => string;
    getHTMLAsync?: () => Promise<string>;

    // Editor/document mode
    setDocumentMode?: (mode: string) => void;

    // Persistence/ready
    save?: () => Promise<void>;
    isReady?: boolean;

    // Export APIs
    export?: (options?: SuperDocExportOptions) => Promise<unknown> | unknown;
    exportDocx?: (options?: SuperDocExportOptions) => Promise<unknown> | unknown;
  }

  const _default: any;
  export default _default;
}