declare module "html-to-docx" {
  interface DocumentOptions {
    orientation?: "portrait" | "landscape";
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    title?: string;
    subject?: string;
    creator?: string;
    keywords?: string[];
    description?: string;
    lastModifiedBy?: string;
    revision?: number;
    createdAt?: Date;
    modifiedAt?: Date;
    headerType?: "default" | "first" | "even";
    header?: boolean;
    footer?: boolean;
    font?: string;
    fontSize?: number;
  }

  interface HeaderFooterOptions {
    first?: {
      header?: string;
      footer?: string;
    };
    default?: {
      header?: string;
      footer?: string;
    };
  }

  function HTMLtoDOCX(
    htmlString: string,
    headerHtml?: string | null,
    documentOptions?: DocumentOptions,
    footerHtml?: string | null,
    headerFooterOptions?: HeaderFooterOptions
  ): Promise<Buffer>;

  export default HTMLtoDOCX;
}
