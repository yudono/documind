import "./globals.css";
import "../styles/ai-placeholders.css";
import "../styles/comment-styles.css";
import "../styles/_variables.scss";
import "../styles/_keyframe-animations.scss";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
import GATracker from "@/components/analytics/ga-tracker";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Document Assistant",
  description: "AI-powered document management and generation platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* add header link icon */}
      <link rel="icon" href="/logo/logo.png" />
      <body className={inter.className}>
        <Providers>
          {/* preload Space Grotesk font for display headings */}
          <span
            className={spaceGrotesk.className}
            style={{ display: "none" }}
          />
          {children}
          <Toaster />
          {/* Google Analytics */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${
              process.env.NEXT_PUBLIC_GA_ID || "G-884EFRLQ06"
            }`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);} 
              gtag('js', new Date());
              gtag('config', '${
                process.env.NEXT_PUBLIC_GA_ID || "G-884EFRLQ06"
              }', {
                page_path: window.location.pathname,
                send_page_view: false
              });
            `}
          </Script>
          {/* Wrap client tracker using usePathname/useSearchParams in Suspense to satisfy Next CSR bailout requirements */}
          <Suspense fallback={null}>
            <GATracker />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
