// app/layout.tsx
import { Providers } from './providers';
import { Toaster as Sonner } from "@/components/ui/sonner"; 
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MuyTuna',
  description: 'Sistema de gestión MuyTuna',
  icons: {
    icon: '/images/logos/logo.svg',
    apple: '/images/logos/logo.svg',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <div id="page-wrapper" className="min-h-screen transition-transform duration-300 ease-in-out md:translate-x-0">
            {children}
          </div>
          <Sonner /> 
        </Providers>
      </body>
    </html>
  );
}