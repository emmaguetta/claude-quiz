import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { AuthProvider } from "@/components/AuthProvider";
import { LocaleProvider } from "@/components/LocaleProvider";
import { SettingsMenu } from "@/components/SettingsMenu";
import type { Locale } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "Claude Code Quiz",
  description: "Apprends à maîtriser Claude Code à travers des quiz interactifs basés sur la documentation officielle.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('claude-quiz-locale')?.value;
  const initialLocale: Locale = localeCookie === 'en' ? 'en' : 'fr';

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
      </head>
      <body className="min-h-full flex flex-col" style={{ backgroundColor: '#1e1e1e' }}>
        <LocaleProvider initialLocale={initialLocale}>
          <AuthProvider>
            {children}
            <SettingsMenu />
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
