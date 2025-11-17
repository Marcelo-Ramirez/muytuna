// components/auth/ClientLoginModal.tsx
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

// Definición de las props
interface ClientLoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
    onOpenRegister: () => void; // Función para abrir el modal de registro
}

export function ClientLoginModal({ isOpen, onClose, onLoginSuccess, onOpenRegister }: ClientLoginModalProps) {
    const [formData, setFormData] = useState({ userName: '', password: '' })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            // Llama al handler de NextAuth, que invoca la función authorize en [...nextauth].ts
            const result = await signIn('credentials', {
                ...formData, 
                redirect: false, // Fundamental: evita la redirección automática
            })
            
            if (result?.error) {
                // El error indica que las credenciales no pasaron la verificación en la DB
                setError('Usuario o contraseña incorrectos.');
                return;
            }
            
            // Si llega aquí, NextAuth ha creado una sesión.
            onLoginSuccess(); // Notifica al componente padre para que actualice la sesión (ej. con useSession)
            onClose();

        } catch {
            setError('Error de conexión con el servidor.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className={cn(
                    "w-full max-w-md sm:max-w-sm !left-0 !right-0 !bottom-0 !top-auto !translate-x-0 !translate-y-0 rounded-t-[24px] border-none shadow-[0_-16px_42px_rgba(0,0,0,0.45)] backdrop-blur-md px-5 py-6 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-full sm:!left-1/2 sm:!top-1/2 sm:!bottom-auto sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:rounded-[24px]",
                    "bg-white/95 text-foreground",
                    "dark:bg-[#221e10]/95 dark:text-[#f8f4e6]",
                    "[&>button]:hidden"
                )}
            >
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted dark:bg-[#3d2f1a]" aria-hidden />
                <DialogHeader className="space-y-1 text-left">
                    <DialogTitle className="text-xl font-semibold text-primary">Iniciar Sesión</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground dark:text-[#d9ceb0]">
                        Ingresa tus credenciales para continuar con tu compra.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <p className="text-destructive text-sm font-medium bg-destructive/10 dark:bg-destructive/15 border border-destructive/30 rounded-xl px-3 py-2">
                        {error}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="userName" className="text-sm font-semibold text-muted-foreground dark:text-[#e8dcba]">
                            Usuario
                        </Label>
                        <Input
                            id="userName"
                            type="text"
                            value={formData.userName}
                            onChange={e => setFormData(d => ({ ...d, userName: e.target.value }))}
                            required
                            className="h-11 rounded-2xl border border-border bg-muted/60 text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:ring-primary dark:border-[#3d2f1a] dark:bg-[#2c2214] dark:text-[#fdf6dd] dark:placeholder:text-[#cbbf9b]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-sm font-semibold text-muted-foreground dark:text-[#e8dcba]">
                            Contraseña
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData(d => ({ ...d, password: e.target.value }))}
                            required
                            className="h-11 rounded-2xl border border-border bg-muted/60 text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:ring-primary dark:border-[#3d2f1a] dark:bg-[#2c2214] dark:text-[#fdf6dd] dark:placeholder:text-[#cbbf9b]"
                        />
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-full bg-[#FAC638] text-[#221e10] text-sm font-semibold shadow-[0_8px_24px_rgba(250,198,56,0.35)] hover:bg-[#fbd25a]">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
                    </Button>
                </form>

                <div className="flex flex-col items-center gap-1.5 pt-3 text-xs text-muted-foreground dark:text-[#d9ceb0]">
                    <span>¿No tienes cuenta?</span>
                    <Button
                        variant="ghost"
                        className="text-[#d39f10] hover:text-[#b98209] font-medium text-sm"
                        onClick={() => {
                            onClose()
                            onOpenRegister()
                        }}
                    >
                        Regístrate ahora
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}