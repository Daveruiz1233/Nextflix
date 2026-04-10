import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";
import { LayoutWrapper } from "@/shared/components/layout-wrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEXTFLIX — Stream Movies & TV Shows",
  description:
    "NEXTFLIX is a premium streaming platform. Browse and watch movies and TV shows with multiple sources, responsive design, and a stunning glassmorphic interface.",
  keywords: ["streaming", "movies", "tv shows", "nextflix", "watch online"],
  openGraph: {
    title: "NEXTFLIX — Stream Movies & TV Shows",
    description: "Browse and watch movies and TV shows with multiple sources.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a0f" />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self' https: data: blob:; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://image.tmdb.org data: blob: *; media-src 'self' blob: data: https: *; worker-src 'self' blob:; frame-src 'self' https://vidsrc.to https://vidsrc.xyz https://vidsrc.cc https://vidsrc.me https://vidsrc.net https://vidsrc.io https://vidsrc.in https://v2.vidsrc.me https://*.v2.vidsrc.me https://vid2vidsrc.top https://short.ink https://vidlink.pro https://vixsrc.to https://embed.su https://multiembed.mov https://autoembed.co https://player.autoembed.cc https://*.autoembed.cc https://*.vidsrc.xyz https://*.vidsrc.net https://vsrc.su https://vidsrcme.su https://vidsrcme.ru https://vidsrc-embed.su https://vidsrc-embed.ru; connect-src 'self' https://api.themoviedb.org https://*.vidsrc.xyz https://*.vidsrc.net https://*.v2.vidsrc.me https://*.vidlink.pro https://*.vixsrc.to https://vid2vidsrc.top https://*.vsrc.su https://*.vidsrcme.su https://*.vidsrcme.ru;"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js', { scope: '/' })
                  .then(reg => console.log('[Shield] Pre-armed:', reg.scope))
                  .catch(err => console.error('[Shield] Pre-arm failed:', err));
              }
            `,
          }}
        />
      </head>
      <body className="bg-nf-bg text-nf-text antialiased">
        <Providers>
          <LayoutWrapper>{children}</LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
