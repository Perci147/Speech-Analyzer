import './globals.css';
import { Inter } from 'next/font/google';
import { Mic, LayoutDashboard, TrendingUp, Settings } from 'lucide-react';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 flex min-h-screen`}>
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white">
              <Mic size={18} />
            </div>
            <span className="font-bold text-xl tracking-tight">Speech Analyzer</span>
          </div>
          <nav className="flex-1 px-4 space-y-2 mt-4">
            <Link href="/" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
              <LayoutDashboard size={20} /> Dashboard
            </Link>
            <Link href="/record" className="flex items-center gap-3 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium transition-colors">
              <Mic size={20} /> Practice Now
            </Link>
          </nav>
        </aside>
        <main className="flex-1 h-screen overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
