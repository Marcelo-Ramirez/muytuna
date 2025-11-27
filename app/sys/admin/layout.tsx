'use client'

import { useState } from 'react'
import SystemSidebar from '@/components/layout/SystemSidebar' // Asegúrate que la ruta sea correcta

export default function SystemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  // TODO: Obtener el rol real de la sesión (useSession)
  const userRole = 'admin' // Placeholder

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  // ELIMINADA la variable sidebarWidth que no se usaba

  // Solo necesitamos la clase de margen para el contenido principal
  const marginLeftClass = isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64' // Clases de margen (w-16 -> ml-16, w-64 -> ml-64)

  return (
    // Contenedor principal usando Flexbox
    <div className="flex min-h-screen bg-muted/40 dark:bg-muted/10">
      {/* Renderiza el Sidebar */}
      <SystemSidebar
        role={userRole}
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        // El sidebar debe manejar su propio ancho internamente basado en isCollapsed
      />

      {/* Contenedor principal del contenido */}
      <main
        className={`flex-1 flex flex-col ${marginLeftClass} transition-all duration-300 ease-in-out`} // Se aplica el margen izquierdo dinámico
      >
        {/* Padding y contenido */}
        <div className="flex-1 p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}