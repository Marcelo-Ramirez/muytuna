// components/auth/ClientRegisterModal.tsx (CORREGIDO)
'use client'

import React, { useState } from 'react' // Import React for FormEvent
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ✅ Añadido confirmPassword
interface FormData {
    userName: string
    phone: string
    password: string
    confirmPassword: string // Nuevo campo
}

// Interfaz para errores de formulario
interface FormErrors {
    [key: string]: string | undefined; // Permite acceder con claves string
} 


export function ClientRegisterModal({ isOpen, onClose, onOpenLogin }: { isOpen: boolean, onClose: () => void, onOpenLogin: () => void }) {
    // ✅ Estado inicial con confirmPassword
    const [formData, setFormData] = useState<FormData>({ userName: '', phone: '', password: '', confirmPassword: '' })
    const [isLoading, setIsLoading] = useState(false)
    const [serverError, setServerError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    // ✅ Estado para errores de validación del frontend
    const [errors, setErrors] = useState<FormErrors>({})

    // ✅ Validación del Frontend (Incluye confirmPassword)
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formData.userName.trim()) newErrors.userName = 'Usuario requerido';
        if (!formData.phone.trim()) newErrors.phone = 'Teléfono requerido';
        if (!formData.password) newErrors.password = 'Contraseña requerida';
        else if (formData.password.length < 6) newErrors.password = 'Contraseña debe tener al menos 6 caracteres';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
        // Limpiar error al escribir
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
        // Limpiar error de confirmación si se edita la contraseña
        if (field === 'password' && errors.confirmPassword) {
             setErrors(prev => ({ ...prev, confirmPassword: undefined }));
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setServerError('')
        setSuccessMessage('')

        // ✅ Ejecutar validación del frontend primero
        if (!validateForm()) {
            return; 
        }

        setIsLoading(true)

        try {
            // Preparamos los datos a enviar (sin confirmPassword)
            const dataToSend = {
                userName: formData.userName.trim(),
                name: formData.userName.trim(),
                phone: formData.phone,
                password: formData.password,
            };

            const response = await fetch('/api/auth/clientregister', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend), // Enviamos solo los datos necesarios
            })

            const data = await response.json()

            if (!response.ok) {
                // El error 400 viene de aquí si la API rechaza los datos
                throw new Error(data.message || 'Error en el registro.')
            }

            setSuccessMessage('Registro exitoso. Serás redirigido al inicio de sesión.')
            setFormData({ userName: '', phone: '', password: '', confirmPassword: '' }) // Limpiar formulario completo
            
            setTimeout(() => {
                onClose();
                onOpenLogin();
            }, 1500);

        } catch (error) {
            setServerError(error instanceof Error ? error.message : 'Error desconocido')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className={cn(
                    "w-full max-w-lg sm:max-w-md !left-0 !right-0 !bottom-0 !top-auto !translate-x-0 !translate-y-0 rounded-t-[24px] border-none shadow-[0_-16px_42px_rgba(0,0,0,0.45)] backdrop-blur-md px-5 pt-4 pb-5 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-full sm:!left-1/2 sm:!top-1/2 sm:!bottom-auto sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:rounded-[24px]",
                    "bg-white/95 text-foreground",
                    "dark:bg-[#221e10]/95 dark:text-[#f8f4e6]",
                    "[&>button]:hidden"
                )}
            >
                <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted dark:bg-[#3d2f1a]" aria-hidden />
                <DialogHeader className="space-y-0.5 text-left">
                    <DialogTitle className="text-lg font-semibold text-primary">Crear Cuenta</DialogTitle>
                </DialogHeader>
                
                {serverError && <p className="text-destructive text-sm font-medium px-3 py-2 bg-destructive/10 dark:bg-destructive/15 border border-destructive/30 rounded-xl">{serverError}</p>}
                {successMessage && <p className="text-foreground dark:text-[#f8f4e6] text-sm font-medium px-3 py-2 bg-muted/70 dark:bg-[#3c3323] border border-primary/30 rounded-xl">{successMessage}</p>}

                <form onSubmit={handleSubmit} className="space-y-3 pt-2">
                    {/* Campos individuales para mejor control */}
                    <div className="space-y-1.5">
                        <Label htmlFor="userName" className="text-sm font-semibold text-muted-foreground dark:text-[#e8dcba]">Nombre de usuario</Label>
                        <Input id="userName" value={formData.userName} onChange={handleInputChange('userName')} required className={cn('h-11 rounded-2xl border border-border bg-muted/60 text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:ring-primary dark:border-[#3d2f1a] dark:bg-[#2c2214] dark:text-[#fdf6dd] dark:placeholder:text-[#cbbf9b]', errors.userName && 'border-destructive focus:border-destructive focus:ring-destructive')} />
                         {errors.userName && <p className="text-destructive text-xs font-medium">{errors.userName}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-sm font-semibold text-muted-foreground dark:text-[#e8dcba]">Teléfono</Label>
                        <Input id="phone" type="tel" value={formData.phone} onChange={handleInputChange('phone')} required className={cn('h-11 rounded-2xl border border-border bg-muted/60 text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:ring-primary dark:border-[#3d2f1a] dark:bg-[#2c2214] dark:text-[#fdf6dd] dark:placeholder:text-[#cbbf9b]', errors.phone && 'border-destructive focus:border-destructive focus:ring-destructive')} />
                         {errors.phone && <p className="text-destructive text-xs font-medium">{errors.phone}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-sm font-semibold text-muted-foreground dark:text-[#e8dcba]">Contraseña</Label>
                        <Input id="password" type="password" value={formData.password} onChange={handleInputChange('password')} required className={cn('h-11 rounded-2xl border border-border bg-muted/60 text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:ring-primary dark:border-[#3d2f1a] dark:bg-[#2c2214] dark:text-[#fdf6dd] dark:placeholder:text-[#cbbf9b]', errors.password && 'border-destructive focus:border-destructive focus:ring-destructive')} />
                         {errors.password && <p className="text-destructive text-xs font-medium">{errors.password}</p>}
                    </div>
                    {/* ✅ Campo de Confirmar Contraseña */}
                    <div className="space-y-1.5">
                        <Label htmlFor="confirmPassword" className="text-sm font-semibold text-muted-foreground dark:text-[#e8dcba]">Confirmar Contraseña</Label>
                        <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange('confirmPassword')} required className={cn('h-11 rounded-2xl border border-border bg-muted/60 text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:ring-primary dark:border-[#3d2f1a] dark:bg-[#2c2214] dark:text-[#fdf6dd] dark:placeholder:text-[#cbbf9b]', errors.confirmPassword && 'border-destructive focus:border-destructive focus:ring-destructive')} />
                        {errors.confirmPassword && <p className="text-destructive text-xs font-medium">{errors.confirmPassword}</p>}
                    </div>
                    
                    <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-full bg-[#FAC638] text-[#221e10] text-sm font-semibold shadow-[0_8px_24px_rgba(250,198,56,0.35)] hover:bg-[#fbd25a]">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Crear Cuenta'}
                    </Button>
                </form>

                <div className='flex flex-col items-center gap-1.5 pt-3 text-xs text-muted-foreground dark:text-[#d9ceb0]'>
                    <span>¿Ya tienes cuenta?</span>
                    <Button variant="ghost" className="text-[#d39f10] hover:text-[#b98209] font-medium text-sm" onClick={() => { onClose(); onOpenLogin(); }}>
                        Iniciar Sesión
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}