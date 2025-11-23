// PublicHeader.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, User, Package, ListOrdered, LogOut, Moon, Sun, X, ShoppingBag, Info, Phone } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { ClientLoginModal } from '@/components/auth/ClientLoginModal';
import { ClientRegisterModal } from '@/components/auth/ClientRegisterModal';
import { Button } from "@/components/ui/button";

// ... (Tus constantes NavLinks, MobileNavItems, etc. se mantienen igual) ...
const NavLinks = [
  { href: '/catalog', label: 'Tienda', icon: Package },
  { href: '/orders', label: 'Mis Pedidos', icon: ListOrdered },
  { href: '/', label: 'Sobre Nosotros', icon: Info },
  { href: '/contact', label: 'Contactanos', icon: Phone },
  { href: '/profile', label: 'Mi Cuenta', icon: User },
];

const MobileNavItems = [
  { href: '/', label: 'Sobre Nosotros', icon: Info },
  { href: '/catalog', label: 'Tienda', icon: Package },
  { href: '/orders', label: 'Mis Pedidos', icon: ListOrdered, requiresAuth: true },
  { href: '/contact', label: 'Contactanos', icon: Phone },
];

const mobilePageTitles: Record<string, string> = {
  '/': 'Bienvenido',
  '/catalog': 'Gomitas Saludables',
  '/orders': 'Mis Pedidos',
  '/contact': 'Contáctanos',
};

type SessionStatus = ReturnType<typeof useSession>['status'];
type SessionData = ReturnType<typeof useSession>['data'];

interface DesktopNavLinksProps {
  links: typeof NavLinks;
  status: SessionStatus;
  session: SessionData;
  isActive: (href: string) => boolean;
  commonClasses: string;
  activeClasses: string;
  onLogin: () => void;
}

// ... (El componente DesktopNavLinks se mantiene igual) ...
const DesktopNavLinks = ({ links, status, session, isActive, commonClasses, activeClasses, onLogin }: DesktopNavLinksProps) => (
  <>
    {links.map((link) => {
      if (link.href === '/orders' && status !== 'authenticated') return null;
      const baseClasses = `${commonClasses} ${isActive(link.href) ? activeClasses : ''}`;
      if (link.href === '/profile') {
        if (status === 'authenticated') {
          return (
            <Link key={link.href} href={link.href} className={`${baseClasses} flex items-center gap-2 justify-center`} title="Ver perfil">
              <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-foreground font-semibold text-sm">
                {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="sr-only">Perfil</span>
            </Link>
          );
        }
        return (
          <button key={link.href} type="button" onClick={onLogin} className={`${baseClasses} flex items-center justify-center gap-1 text-foreground`} title="Iniciar sesión">
            <User className="h-6 w-6" />
            <span className="sr-only">Iniciar Sesión</span>
          </button>
        );
      }
      return (
        <Link key={link.href} href={link.href} className={baseClasses}>
          {link.label}
        </Link>
      );
    })}
  </>
);

// ... (MobileNavList se mantiene igual) ...
interface MobileNavListProps {
  isActive: (href: string) => boolean;
  onNavigate: (href: string) => void;
  isAuthenticated: boolean;
  activeClasses: string;
}

const MobileNavList = ({ isActive, onNavigate, isAuthenticated, activeClasses }: MobileNavListProps) => (
  <nav className="flex-1 p-4 space-y-4">
    {isAuthenticated ? (
      <button type="button" onClick={() => onNavigate('/profile')} className={`flex items-center gap-3 w-full text-left p-2 rounded-md transition-colors text-foreground ${isActive('/profile') ? activeClasses : 'hover:bg-primary'}`}>
        <User className="h-5 w-5" />
        <span>Ver Perfil</span>
      </button>
    ) : null}
    {MobileNavItems.map((item) => {
      if (item.requiresAuth && !isAuthenticated) return null;
      const Icon = item.icon;
      return (
        <button key={item.href} type="button" onClick={() => onNavigate(item.href)} className={`flex items-center gap-3 w-full text-left p-2 rounded-md transition-colors text-foreground ${isActive(item.href) ? activeClasses : 'hover:bg-primary'}`}>
          <Icon className="h-5 w-5" />
          <span>{item.label}</span>
        </button>
      );
    })}
  </nav>
);

// ... (MobileThemeToggle se mantiene igual) ...
interface MobileThemeToggleProps {
  isDark: boolean;
  toggleTheme: () => void;
  className?: string;
}
const MobileThemeToggle = ({ isDark, toggleTheme, className = '' }: MobileThemeToggleProps) => (
  <button onClick={toggleTheme} className={`flex items-center justify-between w-full p-2 rounded-md transition-colors text-foreground hover:bg-primary ${className} pt-6`}>
    <div className="flex items-center gap-3">
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
    </div>
    <div className="relative">
      <div className={`w-10 h-6 rounded-full transition-colors ${isDark ? 'bg-amber-500 shadow-[0_0_0_2px_rgba(245,158,11,0.3)]' : 'bg-muted shadow-[0_0_0_2px_rgba(0,0,0,0.1)]'}`}></div>
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md shadow-gray-400/40 transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0'}`}></div>
    </div>
  </button>
);

export function PublicHeader() {
  const router = useRouter();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarMounted, setIsSidebarMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const { data: session, status } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();

  const commonClasses = "text-sm font-medium text-foreground hover:text-yellow-400 dark:hover:text-yellow-400 transition-colors px-3 rounded-lg h-10";
  const isActive = (href: string) => pathname === href;
  const isDark = resolvedTheme === 'dark';
  const activeClasses = 'text-yellow-400';
  const mobilePageTitle = mobilePageTitles[pathname] ?? null;

  // ============================================================
  // 1. Lógica de Animación Corregida (Sincronización de tiempo)
  // ============================================================
// Lógica de Animación
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    if (isSidebarOpen) {
      setIsSidebarMounted(true);
      // Aumentamos a 50ms para asegurar que el navegador "vea" el estado cerrado antes de animar
      timeout = setTimeout(() => {
        setIsVisible(true);
      }, 50); 
      document.body.classList.add('overflow-hidden');
    } else {
      setIsVisible(false); // Inicia animación de salida
      
      // Este tiempo (700ms) debe coincidir EXACTAMENTE con duration-700 del CSS
      timeout = setTimeout(() => {
        setIsSidebarMounted(false);
      }, 500); 
      
      document.body.classList.remove('overflow-hidden');
    }

    return () => {
      if (timeout) clearTimeout(timeout);
      document.body.classList.remove('overflow-hidden');
    };
  }, [isSidebarOpen]);

  const overlayColor = isDark ? 'bg-black/70' : 'bg-white/70';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const [totalItemsInCart, setTotalItemsInCart] = useState(0);

  useEffect(() => {
    const updateCartCount = () => {
      try {
        const storedCart = localStorage.getItem('userCart');
        if (storedCart) {
          const cart = JSON.parse(storedCart);
          const total = Object.values(cart as Record<string, { quantity: number }>).reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
          setTotalItemsInCart(total);
        } else {
          setTotalItemsInCart(0);
        }
      } catch {
        setTotalItemsInCart(0);
      }
    };
    updateCartCount();
    globalThis.addEventListener('storage', updateCartCount);
    globalThis.addEventListener('cartUpdate', updateCartCount);
    return () => {
      globalThis.removeEventListener('storage', updateCartCount);
      globalThis.removeEventListener('cartUpdate', updateCartCount);
    };
  }, []);

  return (
    <>
      {/* Header principal */}
      <header className={`bg-white dark:bg-background backdrop-blur-sm shadow-sm sticky top-0 z-40`}>
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-20 gap-4">
            <Link href="/" className="hidden md:flex items-center gap-3">
              <Image src="/images/logos/logo.svg" alt="MuytunaSys" width={60} height={60} className="object-contain" priority />
              <span className="text-xl font-semibold text-foreground">Muytuna</span>
            </Link>

            {mobilePageTitle && (
              <div className="flex flex-1 justify-center text-center">
                <h1 className="text-2xl font-bold text-foreground md:hidden">{mobilePageTitle}</h1>
              </div>
            )}

            <div className="flex items-center gap-4 ml-auto">
              <nav className="hidden md:flex items-center gap-6">
                <DesktopNavLinks links={NavLinks} status={status} session={session} isActive={isActive} commonClasses={commonClasses} activeClasses={activeClasses} onLogin={() => setIsLoginOpen(true)} />
              </nav>

              <div className="hidden md:flex">
                <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} className="text-foreground hover:bg-transparent hover:text-yellow-400">
                  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              </div>

              <div className="hidden md:flex">
                <Button variant="outline" className="relative h-12 w-12 rounded-full shadow-none hover:bg-zinc-200/50 dark:hover:bg-zinc-800 border-zinc-300 dark:border-zinc-600" onClick={() => globalThis.dispatchEvent(new Event('openCartModal'))} size="icon" title="Ver Carrito">
                  <ShoppingBag className="h-6 w-6 text-foreground" />
                  {totalItemsInCart > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-zinc-900 bg-yellow-500 dark:bg-primary rounded-full">
                      {totalItemsInCart}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Botón flotante para menú móvil */}
      {!isSidebarOpen && (
        <div className="md:hidden fixed top-4 left-4 z-[55] p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className={`
        backdrop-blur-sm shadow-md border-border 
        ${isDark ? 'bg-background/90' : 'bg-background/80'} 
        hover:bg-background
        opacity-0
        animate-fade-in
        transition-opacity duration-500
      `}
            aria-label="Abrir menú"
          >            <Menu className="h-6 w-6" />
          </Button>
        </div>
      )}

      {pathname.includes('/catalog') && (
        <div className="md:hidden fixed top-4 right-4 z-[55]">
          <Button variant="outline" className="relative h-12 w-12 rounded-full shadow-md border-zinc-300 dark:border-zinc-600 hover:bg-zinc-200/50 dark:hover:bg-zinc-800" onClick={() => globalThis.dispatchEvent(new Event('openCartModal'))} size="icon" title="Ver Carrito">
            <ShoppingBag className="h-6 w-6 text-foreground" />
            {totalItemsInCart > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-zinc-900 bg-yellow-500 dark:bg-primary rounded-full">
                {totalItemsInCart}
              </span>
            )}
          </Button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. Sidebar Lateral (Móvil) CORREGIDO                         */}
      {/* ============================================================ */}
      {isSidebarMounted && (
        <>
          {/* Overlay: Corregido a duration-700 para que coincida con el menú */}
          <button
            type="button"
            className={`fixed inset-0 z-30 md:hidden transition-opacity duration-500 ease-in-out ${overlayColor} ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Cerrar menú"
          />
          
          {/* Sidebar: Usamos duration-700 para suavidad consistente */}
          <div
            className={`fixed left-0 top-0 h-full w-64 bg-white dark:bg-background z-50 md:hidden flex flex-col 
              rounded-r-3xl 
              shadow-[10px_0_30px_-5px_rgba(0,0,0,0.2)] 
              transition-transform duration-500 ease-in-out 
              ${isVisible ? 'translate-x-0' : '-translate-x-full'}`}
          >
            {/* ... (El contenido interno de tu sidebar sigue igual) ... */}
            
            {/* Header del Sidebar */}
            <div className="flex items-center justify-between p-4">
            {/* ... resto de tu código interno ... */}
              <div>
                {status === 'authenticated' ? (
                   /* ... */
                   <span className="text-lg font-semibold">{session?.user?.name || 'Usuario'}</span>
                ) : (
                   /* ... */
                   <span className="text-lg font-semibold">Iniciar Sesión</span>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} aria-label="Cerrar menú">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <MobileThemeToggle isDark={isDark} toggleTheme={toggleTheme} className="px-6 py-2" />
            <MobileNavList isActive={isActive} onNavigate={(href) => { router.push(href); setIsSidebarOpen(false); }} isAuthenticated={status === 'authenticated'} activeClasses={activeClasses} />

            {status === 'authenticated' && (
              <button onClick={() => { signOut({ callbackUrl: `${globalThis.location.origin}` }); setIsSidebarOpen(false); }} className="flex items-center gap-3 w-full text-left p-2 rounded-md hover:bg-primary transition-colors text-foreground">
                <LogOut className="h-5 w-5" />
                <span>Cerrar Sesión</span>
              </button>
            )}
          </div>
        </>
      )}

      <ClientLoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLoginSuccess={() => { setIsLoginOpen(false); globalThis.location.reload(); }} onOpenRegister={() => { setIsLoginOpen(false); setIsRegisterOpen(true); }} />
      <ClientRegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} onOpenLogin={() => { setIsRegisterOpen(false); setIsLoginOpen(true); }} />
    </>
  );
}