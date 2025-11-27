// components/MaintenanceResultsModal.tsx
'use client';
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Zap, Hourglass, BarChart3, AlertCircle, RefreshCcw, TriangleAlert, HandPlatter, LucideIcon, Printer } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// ✅ Importación de lógica y tipos
import { loadReportHistoryFromLocalStorage, FullReport, MaintenanceInput } from "@/lib/maintenance_logic"; 

// --- Tipos de Datos (Simplificado para el Modal) ---
interface MaintenanceResultsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Componente auxiliar para mostrar el KPI con Tooltip
const KpiDisplay = ({ abbreviation, fullName, value, icon: Icon, color }: 
    { abbreviation: string, fullName: string, value: string, icon: LucideIcon, color: string }) => ( 
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Card className="text-center p-3 border-l-4 border-primary hover:bg-muted/50 cursor-help transition-all">
                    <Icon className={`h-6 w-6 mx-auto mb-1 ${color}`} />
                    <p className="text-sm font-medium text-muted-foreground">{abbreviation}</p>
                    <p className="text-xl font-extrabold mt-1">{value}</p>
                </Card>
            </TooltipTrigger>
            <TooltipContent className="bg-primary text-primary-foreground p-2 rounded shadow-lg text-sm">
                {fullName}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);


export function MaintenanceResultsModal({ isOpen, onClose }: MaintenanceResultsModalProps) {
    const [reportHistory, setReportHistory] = useState<FullReport[]>([]);
    const [activeIndex, setActiveIndex] = useState(0); 

    // ✅ La función se usa ahora en el JSX
    const calculateRunningTime = (data: MaintenanceInput) => data.totalTimeHours - data.totalDowntimeHours;
    
    useEffect(() => {
        if (isOpen) {
            const history = loadReportHistoryFromLocalStorage();
            setReportHistory(history);
            setActiveIndex(0); // Resetear al reporte más reciente al abrir
        }
    }, [isOpen]); 

    if (!isOpen) {
        return null;
    }
    
    // Si no hay reportes en el historial
    if (reportHistory.length === 0) {
         return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-md text-center p-6">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <DialogTitle>Sin Historial</DialogTitle>
                    <DialogDescription>Aún no se ha generado ningún reporte de mantenimiento.</DialogDescription>
                    <DialogFooter><Button onClick={onClose}>Cerrar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }
    
    // Obtenemos el reporte actualmente seleccionado/activo
    const activeReport = reportHistory[activeIndex];
    
    // --- Cálculos y datos preparados (Se declaran aquí donde se usan) ---
    const mttfValue = Number.parseFloat(activeReport.MTTF.split(' ')[0]);
    const mtbfValue = Number.parseFloat(activeReport.MTBF.split(' ')[0]);
    const availability = (mtbfValue > 0) ? (mttfValue / mtbfValue) * 100 : 0;
    
    const assetData = [
        { label: 'Total Obs.', value: `${activeReport.totalTimeHours} h` },
        { label: 'Tiempo Operativo', value: `${calculateRunningTime(activeReport).toFixed(2)} h` },
        { label: 'Total Fallas', value: activeReport.numFailures },
    ];
    
    const kpiResults = [
        { abbreviation: 'MTTR', fullName: 'Tiempo Promedio para Reparar', value: activeReport.MTTR, icon: Hourglass, color: 'text-orange-600', border: 'border-orange-500' },
        { abbreviation: 'MTTF', fullName: 'Tiempo Promedio hasta la Falla', value: activeReport.MTTF, icon: Zap, color: 'text-blue-600', border: 'border-blue-500' },
        { abbreviation: 'MTBF', fullName: 'Tiempo Promedio Entre Fallos', value: activeReport.MTBF, icon: Clock, color: 'text-green-600', border: 'border-green-500' },
        { abbreviation: 'Tasa (λ)', fullName: 'Tasa de Fallos (1 / MTBF)', value: activeReport.FailureRate, icon: TriangleAlert, color: 'text-red-600', border: 'border-red-500' },
    ];


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl w-[95%] max-h-[90vh]">
                <DialogHeader className="text-left">
                    <DialogTitle className="text-2xl">Historial de Reportes de Mantenimiento</DialogTitle>
                    <DialogDescription className="text-base font-semibold">
                        {activeIndex === 0 ? (
                            <span className="text-green-600 flex items-center">
                                <RefreshCcw className="w-4 h-4 mr-1"/> Reporte Reciente: {activeReport.assetName}
                            </span>
                        ) : (
                            `Reporte Histórico #${reportHistory.length - activeIndex}: ${activeReport.assetName}`
                        )}
                        <span className="ml-2 text-sm text-muted-foreground font-normal">Generado: ({activeReport.timestamp})</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex space-x-6 overflow-hidden max-h-[calc(90vh-150px)]">

                    {/* 1. SECCIÓN PRINCIPAL: REPORTE ACTIVO (IZQUIERDA) */}
                    <div className="flex-1 space-y-4 pr-6 overflow-y-auto">
                        
                        {/* Resumen de Datos Utilizados */}
                        <Card className="shadow-sm">
                            <CardHeader className="pb-2 pt-4">
                                <CardTitle className="text-lg flex items-center"><HandPlatter className="w-4 h-4 mr-2"/> Datos Generales</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {/* Datos de contexto del período */}
                                <div className="text-sm">
                                    <p className="font-medium text-foreground">Período de Observación: <span className="font-normal text-muted-foreground">{activeReport.startDate} a {activeReport.endDate}</span></p>
                                    <p className="font-medium text-foreground">Fecha de Cálculo: <span className="font-normal text-muted-foreground">{activeReport.timestamp}</span></p>
                                </div>
                                
                                {/* Resumen Numérico */}
                                <div className="grid grid-cols-3 gap-4 border p-3 rounded-md bg-gray-100 dark:bg-gray-800">
                                    {assetData.map((data) => (
                                        <div key={data.label} className="text-center">
                                            <p className="text-xl font-extrabold text-primary">{data.value}</p>
                                            <p className="text-xs text-muted-foreground">{data.label}</p>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Descripción de Fallas */}
                                <div className="text-sm pt-2">
                                    <p className="font-medium mb-1">Causas Reportadas:</p>
                                    <p className="text-muted-foreground">{activeReport.failureDescription || 'No se proporcionó descripción de fallas.'}</p>
                                </div>

                            </CardContent>
                        </Card>


                        {/* Indicadores Clave de Mantenimiento (KPIs) */}
                        <h3 className="text-lg font-semibold flex items-center border-b pb-2 pt-2">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Indicadores de Rendimiento
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {kpiResults.map((kpi) => (
                                <KpiDisplay 
                                    key={kpi.abbreviation} 
                                    {...kpi} 
                                />
                            ))}
                        </div>
                        
                        {/* Disponibilidad (Calculado) */}
                        <Card className="shadow-md bg-gray-50 dark:bg-gray-800">
                            <CardContent className="flex items-center justify-between p-4">
                                <p className="text-lg font-semibold">Disponibilidad Operacional:</p>
                                <p className="text-4xl font-extrabold text-purple-600">{availability.toFixed(2)}%</p>
                            </CardContent>
                        </Card>

                    </div>

                    {/* 2. SECCIÓN DE HISTORIAL (DERECHA) */}
                    <div className="w-64 border-l pl-4 shrink-0">
                        <h4 className="font-bold mb-3 text-lg">Historial ({reportHistory.length})</h4>
                        <ScrollArea className="h-full max-h-[calc(90vh-180px)] pr-2">
                            {reportHistory.map((report, index) => (
                                <div 
                                    key={index} 
                                    onClick={() => setActiveIndex(index)} // ⬅️ MANEJO DE CLIC
                                    className={`border-b py-2 px-1 text-sm cursor-pointer transition-colors ${activeIndex === index ? 'bg-primary/10 border-primary font-bold' : 'hover:bg-muted/50'}`}
                                >
                                    <p className="font-semibold">{report.assetName}</p>
                                    <p className="text-xs text-muted-foreground">{report.timestamp}</p>
                                    <p className={`text-xs ${report.FailureRate === '0.0000 fallos/h' ? 'text-gray-500' : 'text-green-600'}`}>
                                        MTBF: {report.MTBF}
                                    </p>
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => window.print()} className="w-full sm:w-auto">
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </Button>
                    <Button onClick={onClose} className="w-full sm:w-auto">Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}