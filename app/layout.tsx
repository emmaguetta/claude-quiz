import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import { AuthProvider } from "@/components/AuthProvider";
import { LocaleProvider } from "@/components/LocaleProvider";
import { SettingsMenu } from "@/components/SettingsMenu";
import { DisplayNamePrompt } from "@/components/DisplayNamePrompt";
import { JsonLd } from "@/components/JsonLd";
import { Footer } from "@/components/Footer";
import { ConsentBanner } from "@/components/ConsentBanner";
import type { Locale } from "@/lib/i18n";
import "./globals.css";

const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://claudequiz.app'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Claude Code Quiz · Learn & Explore',
    template: '%s | Claude Code Quiz',
  },
  description: 'Master Claude Code with interactive quizzes and a semantic MCP search engine. 225+ questions, 4700+ MCPs.',
  keywords: ['Claude Code', 'quiz', 'MCP', 'Model Context Protocol', 'Anthropic', 'CLI', 'AI tools', 'learning'],
  authors: [{ name: 'Claude Code Quiz' }],
  creator: 'Claude Code Quiz',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'fr_FR',
    siteName: 'Claude Code Quiz',
    title: 'Claude Code Quiz · Learn & Explore',
    description: 'Master Claude Code with interactive quizzes and a semantic MCP search engine.',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Claude Code Quiz · Learn & Explore',
    description: 'Master Claude Code with interactive quizzes and a semantic MCP search engine.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' as const, 'max-snippet': -1 },
  },
  alternates: {
    canonical: '/',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('claude-quiz-locale')?.value;
  const initialLocale: Locale = localeCookie === 'fr' ? 'fr' : 'en';

  return (
    <html
      lang={initialLocale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" href="https://fonts.googleapis.com/css2?family=Jersey+10&family=Bitcount+Single+Ink&display=block" as="style" />
        <link href="https://fonts.googleapis.com/css2?family=Jersey+10&family=Bitcount+Single+Ink&display=block" rel="stylesheet" />
        {gaId && (
          <Script id="gtag-consent-default" strategy="beforeInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              var stored = null;
              try { stored = localStorage.getItem('claude-quiz-analytics-consent'); } catch(e) {}
              var granted = stored === 'granted';
              gtag('consent', 'default', {
                ad_storage: granted ? 'granted' : 'denied',
                ad_user_data: granted ? 'granted' : 'denied',
                ad_personalization: granted ? 'granted' : 'denied',
                analytics_storage: granted ? 'granted' : 'denied',
                wait_for_update: 500,
              });
            `}
          </Script>
        )}
      </head>
      <body className="min-h-full flex flex-col" style={{ backgroundColor: '#1e1e1e' }}>
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebSite',
              name: 'Claude Quiz',
              url: siteUrl,
              description: 'Interactive learning platform for Claude Code: 225+ quiz questions and 4700+ MCP server directory',
              inLanguage: ['en', 'fr'],
              potentialAction: {
                '@type': 'SearchAction',
                target: `${siteUrl}/mcp-search?q={search_term_string}`,
                'query-input': 'required name=search_term_string',
              },
            },
            {
              '@type': 'Organization',
              name: 'Claude Quiz',
              url: siteUrl,
              logo: `${siteUrl}/icon.svg`,
              sameAs: [
                'https://github.com/emmaguetta/claude-quiz',
              ],
            },
          ],
        }} />
        <LocaleProvider initialLocale={initialLocale}>
          <AuthProvider>
            {children}
            <SettingsMenu />
            <DisplayNamePrompt />
          </AuthProvider>
          <Footer />
          <ConsentBanner />
        </LocaleProvider>
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
