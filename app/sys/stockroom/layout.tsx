'use client'

import { useState } from 'react'
import SystemSidebar from '@/components/layout/SystemSidebar' // Asegúrate que la ruta sea correcta

export default function SystemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  
  // El rol está hardcodeado como 'stockroom', como en el original
  const userRole = 'stockroom' 

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  // Definir las clases de margen y ancho en Tailwind para el empuje del contenido
  // 60px -> ml-16 | 250px -> ml-64 (Ajusta si tus anchos reales son distintos a 64px/256px)
  const marginLeftClass = isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64' 

  return (
    // Reemplaza Flex: Contenedor principal con Flexbox y altura mínima
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      
      {/* Renderiza el Sidebar */}
      <SystemSidebar
        role={userRole}
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
      />

      {/* Reemplaza Box: Contenedor principal del contenido (<main> semántico) */}
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