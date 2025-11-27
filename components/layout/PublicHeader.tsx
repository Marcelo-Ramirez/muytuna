// PublicHeader.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, User, Package, ListOrdered, LogOut, Moon, Sun, X, ShoppingBag, Info, Phone } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { ClientLoginModal } from '@/components/auth/ClientLoginModal';
import { ClientRegisterModal } from '@/components/auth/ClientRegisterModal';
import { Button } from "@/components/ui/button";

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

// Función utilitaria para restaurar scroll
const forceUnlockScroll = () => {
  document.body.classList.remove('overflow-hidden');
  document.documentElement.classList.remove('overflow-hidden');
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  document.body.style.top = '';
  // Extra: por si hay estilos inline persistentes
  document.body.style.removeProperty('overflow');
  document.documentElement.style.removeProperty('overflow');
  document.body.style.removeProperty('top');
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

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollPositionRef = useRef<number>(0);

  const { data: session, status } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();

  const commonClasses = "text-sm font-medium text-foreground hover:text-yellow-400 dark:hover:text-yellow-400 transition-colors px-3 rounded-lg h-10";
  const isActive = (href: string) => pathname === href;
  const isDark = resolvedTheme === 'dark';
  const activeClasses = 'text-yellow-400';
  const mobilePageTitle = mobilePageTitles[pathname] ?? null;

  // ============================================================
  // 1. EFECTO DE ANIMACIÓN 
  // ============================================================
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (isSidebarOpen) {
      setIsSidebarMounted(true);
      timeoutRef.current = setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false); 
      timeoutRef.current = setTimeout(() => {
        setIsSidebarMounted(false);
      }, 500); 
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isSidebarOpen]);

  // ============================================================
  // 2. EFECTO DE BLOQUEO (Aplica/remueve overflow-hidden)
  // ============================================================
  useEffect(() => {
    if (isSidebarMounted) {
      // Guardar la posición actual del scroll
      scrollPositionRef.current = window.scrollY;
      
      // Aplicar bloqueo
      document.body.classList.add('overflow-hidden');
      document.documentElement.classList.add('overflow-hidden');
      
      // En móviles, ajustar el top para mantener la posición visual
      if (window.innerWidth < 768) {
        document.body.style.top = `-${scrollPositionRef.current}px`;
      }
    } else {
      // Remover bloqueo
      document.body.classList.remove('overflow-hidden');
      document.documentElement.classList.remove('overflow-hidden');
      
      // Restaurar posición del scroll
      if (window.innerWidth < 768) {
        document.body.style.top = '';
        window.scrollTo(0, scrollPositionRef.current);
      }
    }
    
    return () => {
      document.body.classList.remove('overflow-hidden');
      document.documentElement.classList.remove('overflow-hidden');
      document.body.style.top = '';
    };
  }, [isSidebarMounted]);

  // ============================================================
  // 3. FAILSAFE DE NAVEGACIÓN (Ejecuta en cada cambio de ruta)
  // ============================================================
  useEffect(() => {
    // Cancelar animaciones pendientes
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);

    // Resetear estados del sidebar
    setIsSidebarOpen(false);
    setIsVisible(false);
    setIsSidebarMounted(false);
    
    // LIMPIEZA INMEDIATA
    forceUnlockScroll();
    
    // LIMPIEZA ASÍNCRONA (por si React tarda en actualizar)
    cleanupTimerRef.current = setTimeout(() => {
      forceUnlockScroll();
    }, 0);

    // LIMPIEZA ADICIONAL (después de transiciones)
    const finalCleanup = setTimeout(() => {
      forceUnlockScroll();
    }, 100);

    return () => {
      if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
      clearTimeout(finalCleanup);
      // Limpieza final al desmontar
      forceUnlockScroll();
    };
  }, [pathname]);

  // ============================================================
  // 4. CLEANUP GLOBAL AL DESMONTAR EL COMPONENTE
  // ============================================================
  useEffect(() => {
    return () => {
      forceUnlockScroll();
    };
  }, []);

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
                <Button variant="outline" className="relative h-12 w-12 rounded-full shadow-none hover:bg-zinc-200/50 dark:hover:bg-zinc-800 border-zinc-300 dark:border-zinc-600" onClick={() => router.push('/cart')} size="icon" title="Ver Carrito">
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

      {!isSidebarOpen && (
        <div className="md:hidden fixed top-4 left-4 z-[55] p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className={`backdrop-blur-sm shadow-md border-border ${isDark ? 'bg-background/90' : 'bg-background/80'} hover:bg-background opacity-0 animate-fade-in transition-opacity duration-500`}
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      )}

      {pathname.includes('/catalog') && (
        <div className="md:hidden fixed top-4 right-4 z-[55]">
          <Button variant="outline" className="relative h-12 w-12 rounded-full shadow-md border-zinc-300 dark:border-zinc-600 hover:bg-zinc-200/50 dark:hover:bg-zinc-800" onClick={() => router.push('/cart')} size="icon" title="Ver Carrito">
            <ShoppingBag className="h-6 w-6 text-foreground" />
            {totalItemsInCart > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-zinc-900 bg-yellow-500 dark:bg-primary rounded-full">
                {totalItemsInCart}
              </span>
            )}
          </Button>
        </div>
      )}

      {isSidebarMounted && (
        <>
          <button
            type="button"
            className={`fixed inset-0 z-30 md:hidden transition-opacity duration-500 ease-in-out ${overlayColor} ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Cerrar menú"
          />
          
          <div
            className={`fixed left-0 top-0 h-full w-64 bg-white dark:bg-background z-50 md:hidden flex flex-col rounded-r-3xl shadow-[10px_0_30px_-5px_rgba(0,0,0,0.2)] transition-transform duration-500 ease-in-out ${isVisible ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="flex items-center justify-between p-4">
              <div>
                {status === 'authenticated' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="text-lg font-semibold">{session?.user?.name || 'Usuario'}</span>
                  </div>
                ) : (
                  <button onClick={() => { setIsLoginOpen(true); setIsSidebarOpen(false); }} className="flex items-center gap-2 cursor-pointer">
                    <User className="h-6 w-6" />
                    <span className="text-lg font-semibold">Iniciar Sesión</span>
                  </button>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} aria-label="Cerrar menú">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <MobileThemeToggle isDark={isDark} toggleTheme={toggleTheme} className="px-6 py-2" />
            <MobileNavList isActive={isActive} onNavigate={(href) => { router.push(href); setIsSidebarOpen(false); }} isAuthenticated={status === 'authenticated'} activeClasses={activeClasses} />

            {status === 'authenticated' && (
              <button onClick={async () => { 
                await signOut({ redirect: false }); 
                setIsSidebarOpen(false); 
                window.location.href = '/'; 
              }} className="flex items-center gap-3 w-full text-left p-2 rounded-md hover:bg-primary transition-colors text-foreground">
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