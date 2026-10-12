import type { Metadata, Viewport } from 'next';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = { title: 'Floorwork: free trading interview practice', description: 'Free, open-source practice for quantitative trading interviews: market-making games, trading simulators, mental math, probability, cognitive drills and timed assessments. No login, runs in your browser.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

// Applies the saved theme before paint to avoid a flash.
const themeScript = `try{var s=JSON.parse(localStorage.getItem('floorwork:v1')||'{}').state||{};var t=s.theme||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
