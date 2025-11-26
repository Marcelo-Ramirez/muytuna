"use client";

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  Home, Users, Package, BarChart3, LogOut, Menu, X, User, ShoppingCart, Barcode, type LucideIcon, TrendingUp, Wrench
} from 'lucide-react';
import { cn } from "@/lib/utils"; // Utilidad para combinar clases condicionalmente

// Importa componentes Shadcn UI
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bar } from 'recharts';

// --- Tipos ---
type UserRole = 'admin' | 'stockroom' | 'sales' | string;

interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
  isUserButton?: boolean;
  isLogout?: boolean;
}

interface SystemSidebarProps {
  readonly role: UserRole;
  readonly isCollapsed?: boolean;
  readonly onToggle?: () => void;
}

// --- Mapeo de Iconos ---
const iconMap = {
  FiHome: Home,
  FiUsers: Users,
  FiPackage: Package,
  FiBarChart: BarChart3,
  FiTrendingUp: TrendingUp,
  FiLogOut: LogOut,
  FiMenu: Menu,
  FiX: X,
  FiUser: User,
  FiShoppingCart: ShoppingCart,
  FiWrench: Wrench,
  FiBarcode: Barcode,
};

// --- Componente ---
export default function SystemSidebar({ role, isCollapsed = false, onToggle }: SystemSidebarProps) {
  const [showMobile, setShowMobile] = useState(false);

  const getSidebarItems = (): SidebarItem[] => {
    const baseItems: SidebarItem[] = [
      {
        label: 'Usuario',
        href: `/sys/${role}/user`,
        icon: iconMap.FiUser,
        isUserButton: true,
      }
    ];
    // ... (El resto de la lógica de roles es la misma) ...
    const roleSpecificItems: Record<UserRole, Omit<SidebarItem, 'isUserButton' | 'isLogout'>[]> = {
      admin: [
        { label: 'Dashboard', href: `/sys/${role}/dashboard`, icon: iconMap.FiHome },
  { label: 'Capacidad de producción', href: `/sys/${role}/production-capacity`, icon: iconMap.FiBarChart },
        { label: 'Productividad', href: `/sys/${role}/productivity`, icon: iconMap.FiBarChart },
        { label: 'Gestión de Usuarios', href: `/sys/${role}/users`, icon: iconMap.FiUsers },
        { label: 'Pronóstico de Demanda', href: `/sys/${role}/pronostico-demanda`, icon: iconMap.FiTrendingUp },
        { label: 'Reporte de Mantenimiento', href: `/sys/${role}/mantenimiento`, icon: iconMap.FiWrench },
      ],
      stockroom: [
        { label: 'Ingredientes', href: `/sys/${role}/ingredients`, icon: iconMap.FiBarChart },
        { label: 'Productos', href: `/sys/${role}/products`, icon: iconMap.FiPackage },
      ],
      sales: [
        { label: 'Productos', href: `/sys/${role}/products`, icon: iconMap.FiPackage },
        { label: 'Pedidos', href: `/sys/${role}/orders`, icon: iconMap.FiShoppingCart },
        { label: 'Escanear codigo de barras', href: `/sys/${role}/scan`, icon: iconMap.FiBarcode },
      ]
    };

    const logoutItem: SidebarItem = {
      label: 'Cerrar Sesión',
      href: '#',
      icon: iconMap.FiLogOut,
      isLogout: true,
    };

    return [
      ...baseItems,
      ...(roleSpecificItems[role] || []),
      logoutItem
    ];
  };

  const menuItems = getSidebarItems();

  return (
    <>
      {/* Mobile hamburger button - visible only on small screens */}
      <div className={cn("md:hidden fixed top-4 left-4 z-50", showMobile && "hidden")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowMobile(true)}
          aria-label="Abrir navegación"
          className="bg-white/90 dark:bg-gray-800/80 p-2 rounded-lg shadow-md border border-border/20"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </Button>
      </div>

      {/* Mobile drawer overlay */}
      {showMobile && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowMobile(false)}
          />
          <div className="relative w-64 h-full bg-white dark:bg-gray-950 p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xl font-bold tracking-tight text-primary">System Panel</p>
                <p className="text-sm text-muted-foreground">{role.toUpperCase()}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowMobile(false)} aria-label="Cerrar navegación">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Separator className="my-1 border-border/50" />

            <nav className="flex flex-col gap-1 mt-3">
              <TooltipProvider delayDuration={0}>
                {menuItems.map((item) => {
                  const IconComponent = item.icon;
                  const baseStyles = "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer";
                  let specificStyles = "";
                  if (item.isLogout) specificStyles = "text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20";
                  else if (item.isUserButton) specificStyles = "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary/80 dark:hover:bg-primary/70";
                  else specificStyles = "text-muted-foreground hover:bg-accent/50 hover:text-primary dark:hover:bg-gray-800 dark:hover:text-primary";

                  const content = (
                    <div className={cn(baseStyles, specificStyles)}>
                      <IconComponent className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                  );

                  if (item.isLogout) {
                    return (
                      <Button key="logout-mobile" variant="ghost" className="w-full p-0" onClick={() => signOut({ callbackUrl: "/sys/login" })}>
                        {content}
                      </Button>
                    );
                  }

                  return (
                    <Link key={item.href + '-mobile'} href={item.href} passHref legacyBehavior>
                      <a className="block w-full" onClick={() => setShowMobile(false)}>{content}</a>
                    </Link>
                  );
                })}
              </TooltipProvider>
            </nav>
          </div>
        </div>
      )}

      <aside
      className={cn(
  // Hidden on small screens, visible from md upwards. Keep fixed layout and collapse handling.
  // Use explicit white background in light mode so content behind doesn't show through
  "hidden md:fixed md:left-0 md:top-0 md:z-50 md:flex md:h-screen md:flex-col md:border-r md:bg-white md:shadow-sm dark:md:bg-gray-950 md:transition-all md:duration-300 md:ease-in-out",
        isCollapsed ? "md:w-16" : "md:w-64"
      )}
    >
      <div className={cn("flex h-full flex-col gap-4 py-4", isCollapsed ? "px-2" : "px-4")}>

        {/* Botón de Toggle */}
        <div className={cn("flex", isCollapsed ? "justify-center" : "justify-end")}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            className="h-8 w-8 text-primary dark:text-gray-400" // Color base del ícono
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>

        {/* Logo/Title */}
        {!isCollapsed && (
          <div className="mb-2 text-center">
            <p className="text-xl font-bold tracking-tight text-primary">System Panel</p> {/* Color primario para el título */}
            <p className="text-sm text-muted-foreground">{role.toUpperCase()}</p>
          </div>
        )}

        {/* Separador */}
        <Separator className="my-1 border-border/50" /> {/* Separador más sutil */}

        {/* Menú de Navegación */}
        <nav className="flex flex-col gap-1 flex-grow overflow-y-auto">
          <TooltipProvider delayDuration={0}>
            {menuItems.map((item) => {
              const IconComponent = item.icon;

              // Estilos de Hover Mejorados (usando colores más definidos y sutiles)
              const baseStyles = "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer";
              let specificStyles = "";

              if (item.isLogout) {
                // Logout: Rojo más vibrante al pasar el ratón
                specificStyles = "text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20";
              } else if (item.isUserButton) {
                // Botón de Usuario: Fondo sólido o destacado
                specificStyles = "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary/80 dark:hover:bg-primary/70";
              } else {
                // Enlaces Normales: Resaltado sutil con el color primario
                specificStyles = "text-muted-foreground hover:bg-accent/50 hover:text-primary dark:hover:bg-gray-800 dark:hover:text-primary";
              }


              const ItemContent = (
                <div
                  className={cn(
                    baseStyles,
                    isCollapsed ? "justify-center" : "justify-start",
                    specificStyles // Aplica los estilos mejorados
                  )}
                >
                  {/* Color del ícono en estado normal y hover: El ícono hereda el color del texto */}
                  <IconComponent className={cn("h-5 w-5 transition-colors", isCollapsed ? "" : "")} />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
              );

              // Renderiza Tooltip
              const renderWithTooltip = (content: React.ReactNode) => (
                 isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{content}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                 ) : content
              );


              // Botón de Logout
              if (item.isLogout) {
                return renderWithTooltip(
                  <Button
                    key="logout"
                    variant="ghost"
                    asChild
                    onClick={() => signOut({ callbackUrl: "/sys/login" })}
                    className="h-auto w-full p-0"
                  >
                    {ItemContent}
                  </Button>
                );
              }

              // Link de Navegación
              return renderWithTooltip(
                <Link key={item.href} href={item.href} passHref legacyBehavior>
                  <a className="block w-full">{ItemContent}</a>
                </Link>
              );
            })}
          </TooltipProvider>
        </nav>
      </div>
    </aside>
    </>
  );
}