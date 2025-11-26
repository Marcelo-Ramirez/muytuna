'use client';

import { Bell, Settings, LogOut } from 'lucide-react'; // Iconos de Lucide
import { signOut } from 'next-auth/react';

// Importa componentes Shadcn UI
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SystemHeaderProps {
  username?: string;
  role?: string;
}

export default function SystemHeader({ username = 'User', role = 'admin' }: SystemHeaderProps) {

  const userInitial = username.charAt(0).toUpperCase();
  const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    // Reemplaza Box con header. Sticky, Shadow y zIndex
    <header
      className="bg-background dark:bg-card border-b dark:border-gray-800 px-6 py-3 shadow-md sticky top-0 z-50"
    >
      {/* Reemplaza HStack principal con div flex justify-between */}
      <div className="flex items-center justify-between h-auto">

        {/* 1. Sección de Título y Subtítulo (Izquierda) */}
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            System Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {capitalizedRole} Panel
          </p>
        </div>

        {/* 2. Sección de Acciones y Perfil (Derecha) */}
        <div className="flex items-center space-x-4">
          
          {/* Botones de Acción (Bell & Settings) */}
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </Button>
          
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Button>

          {/* Separador vertical sutil */}
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
          
          {/* Info de Usuario y Avatar */}
          <div className="flex items-center space-x-2">
            
            {/* Avatar */}
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                {userInitial}
              </AvatarFallback>
            </Avatar>

            {/* Nombre y Rol */}
            <div className="hidden sm:block"> {/* Ocultar en móvil para ahorrar espacio */}
              <p className="text-sm font-medium text-foreground">{username}</p>
              <p className="text-xs text-muted-foreground">{role}</p>
            </div>
            
          </div>

          {/* Botón de Logout */}
          <Button 
            variant="ghost" 
            size="icon" 
            aria-label="Cerrar Sesión"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}