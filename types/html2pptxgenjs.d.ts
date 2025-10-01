declare module 'html2pptxgenjs' {
  interface Html2PptxOptions {
    css?: string;
    fontFace?: string;
    fontSize?: number;
    paraSpaceAfter?: number;
    paraSpaceBefore?: number;
    preFontFace?: string;
  }

  interface PptxTextItem {
    text: string;
    options?: {
      bold?: boolean;
      italic?: boolean;
      underline?: {
        style?: string;
        color?: string;
      };
      strike?: boolean;
      color?: string;
      fontFace?: string;
      fontSize?: number;
      hyperlink?: {
        url: string;
        tooltip?: string;
      };
      subscript?: boolean;
      superscript?: boolean;
      align?: 'left' | 'center' | 'right';
      breakLine?: boolean;
    };
  }

  export function htmlToPptxText(
    htmlString: string,
    options?: Html2PptxOptions
  ): PptxTextItem[] | string;
}