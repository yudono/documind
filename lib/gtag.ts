export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-884EFRLQ06";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export const pageview = (url: string) => {
  if (!GA_ID || typeof window === "undefined") return;
  window.gtag?.("config", GA_ID, {
    page_path: url,
  });
};