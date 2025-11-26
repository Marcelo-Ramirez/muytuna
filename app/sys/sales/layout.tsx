'use client'

import { useState } from 'react'
import SystemSidebar from '@/components/layout/SystemSidebar' // Asegúrate que la ruta sea correcta

export default function SystemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  
  // El rol ahora está hardcodeado, pero en un proyecto real usarías useSession()
  const userRole = 'sales' 

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  // Definir las clases de margen y ancho en Tailwind
  const marginLeftClass = isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64' // apply margin only on md+

  return (
    // Reemplaza Flex: Contenedor principal con Flexbox y altura mínima
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 mt-9 md:mt-0">
      
      {/* Renderiza el Sidebar (asume que SystemSidebar ya usa Tailwind) */}
      <SystemSidebar
        role={userRole}
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
      />

      {/* Reemplaza Box: Contenedor principal del contenido */}
      <main
        className={`
          flex-1 flex flex-col 
          ${marginLeftClass} 
          transition-all duration-300 ease-in-out
        `} // Flex-1, Flex-col, Margen dinámico y transición
      >
        {/* Reemplaza Box: Área de contenido con padding */}
        <div className="flex-1 p-4 md:p-6"> {/* p-4/p-6 para padding responsivo */}
          {children}
        </div>
      </main>
    </div>
  )
}