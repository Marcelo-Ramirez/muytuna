'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Loader2,
    TrendingUp,
    Calendar,
    Zap,
    AlertTriangle,
    Search
} from 'lucide-react';
// Componentes de Shadcn UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils'; // For combining classes
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

// --- Type Definitions (Matching Backend) ---

interface AllMetrics {
    MAPE?: number;
    MAD?: number;
    MSE?: number;
    RMSE?: number;
    NextForecast?: number;
}
interface ForecastResult {
    productId: number;
    productName: string;
    forecast_next_period: number | null;
    best_method: string;
    metrics: {
        [modelName: string]: AllMetrics;
    };
    warning?: string;
}

const getMetric = (item: ForecastResult, model: string, metric: keyof AllMetrics) => {
    return item.metrics?.[model]?.[metric];
};

// Componente para las cabeceras con Tooltip
const MetricTooltip = ({ abbreviation, fullName }: { abbreviation: string, fullName: string }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="cursor-help border-b border-dashed border-gray-400">
                    {abbreviation}
                </span>
            </TooltipTrigger>
            <TooltipContent className="bg-primary text-primary-foreground p-2 rounded shadow-lg text-sm">
                {fullName}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);


// --- Componente Principal ---
export default function DemandForecastPage() {
    const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Default Dates: Last 12 months
    const today = new Date();
    const defaultEndDate = today.toISOString().split('T')[0];
    const defaultStartDate = new Date(today);
    defaultStartDate.setFullYear(today.getFullYear() - 1);
    const initialStartDate = defaultStartDate.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(defaultEndDate);

    // --- Fetch Logic ---
    const fetchForecast = async (start: string = startDate, end: string = endDate) => {
        setIsLoading(true);
        setError(null);

        if (new Date(start).getTime() >= new Date(end).getTime()) {
            setError('La fecha de inicio debe ser estrictamente anterior a la fecha de fin.');
            setIsLoading(false);
            return;
        }

        const apiPath = `/api/system/pronostic?start=${start}&end=${end}`;
        
        try {
            const response = await fetch(apiPath);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Error desconocido al obtener el pronóstico');
            }
            setForecasts(data.forecasts || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido de red.');
            // El log se ha eliminado según la solicitud
        } finally {
            setIsLoading(false);
        }
    };

    // Initial Fetch on Mount
    useEffect(() => {
        fetchForecast(initialStartDate, defaultEndDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Recalculate Button Handler
    const handleRecalculate = () => {
        fetchForecast(startDate, endDate);
    };

    // --- Filtering Logic ---
    const filteredForecasts = useMemo(() => {
        if (!Array.isArray(forecasts)) return [];

        // 1. Filtrar por Pronóstico Válido (quita 'na' o null)
        const validForecasts = forecasts.filter(forecast => 
            forecast.forecast_next_period !== null && 
            !isNaN(Number(forecast.forecast_next_period))
        );

        // 2. Filtrar por Nombre del Producto (Búsqueda por nombre)
        if (!searchTerm) return validForecasts;
        
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        
        return validForecasts.filter(forecast =>
            // Búsqueda SOLAMENTE por Nombre
            forecast.productName.toLowerCase().includes(lowerCaseSearchTerm)
        );
    }, [forecasts, searchTerm]);

    const hasForecastsToShow = filteredForecasts.length > 0;
    const allDataAreInsufficient = forecasts.length > 0 && !hasForecastsToShow;

    // Calcular Pronóstico Total para Planificación Agregada
    const totalForecast = filteredForecasts.reduce((sum, item) => {
        // CORRECCIÓN: Redondear cada valor individualmente antes de sumar para coincidir con la visualización
        return sum + Math.round(item.forecast_next_period || 0);
    }, 0);

    // --- VISTA PRINCIPAL (JSX) ---
    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* 1. Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1 flex items-center">
                    <TrendingUp className="mr-3 h-7 w-7 text-primary" /> Pronóstico de Demanda
                </h1>
                <p className="text-base text-muted-foreground">Proyección de ventas futuras usando modelos cuantitativos.</p>
            </div>
            {/* 2. Control Card */}
            <Card className="shadow-lg">
                   <CardHeader>
                       <CardTitle className="text-lg font-semibold flex items-center"><Zap className="mr-2 h-4 w-4" /> Ejecución del Modelo</CardTitle>
                       <CardDescription>Seleccione el período de datos históricos (Demanda Real) a considerar para el cálculo.</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                        {/* Date Inputs */}
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 space-y-1">
                                <Label htmlFor="start-date">Fecha de Inicio Histórica</Label>
                                <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <Label htmlFor="end-date">Fecha de Fin Histórica</Label>
                                <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full" />
                            </div>
                            <Button onClick={handleRecalculate} disabled={isLoading} className="w-full md:w-auto mt-2 md:mt-0">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                                {isLoading ? 'Calculando...' : 'Recalcular Pronóstico'}
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground pt-2">
                            Pronóstico calculado con historial desde **{new Date(startDate).toLocaleDateString('es-ES', { timeZone: 'America/La_Paz' })}** hasta **{new Date(endDate).toLocaleDateString('es-ES', { timeZone: 'America/La_Paz' })}**.
                        </p>
                   </CardContent>
            </Card>
            {/* 3. Results/Status Card */}
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle className="text-lg font-semibold">Resultados por Producto</CardTitle>
                            <CardDescription>Comparación de modelos y pronóstico final recomendado.</CardDescription>
                        </div>
                        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                            {hasForecastsToShow && (
                                <Button 
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => {
                                        window.location.href = `/sys/admin/aggregate-planning?productName=Todos%20los%20Productos&forecast=${totalForecast.toFixed(0)}`;
                                    }}
                                >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Planificación Global ({totalForecast.toFixed(0)} u.)
                                </Button>
                            )}
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Buscar producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-full" />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">

                    {isLoading ? (
                         <div className="text-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                            <p className="mt-4 text-lg text-primary">Calculando pronósticos...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 bg-red-50/50">
                            <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
                            <p className="mt-4 text-lg font-semibold text-destructive">Error en la ejecución:</p>
                            <p className="text-sm text-muted-foreground mx-auto max-w-md">{error}</p>
                        </div>
                    ) : !hasForecastsToShow ? (
                        // Nuevo mensaje unificado para "Datos insuficientes"
                         <div className="text-center py-12 bg-amber-50/50">
                            <AlertTriangle className="h-8 w-8 mx-auto text-amber-500" />
                            <p className="mt-4 text-lg font-semibold text-amber-700">¡Datos Insuficientes o Sin Resultados!</p>
                            {allDataAreInsufficient ? (
                                <p className="text-sm text-muted-foreground mx-auto max-w-md">Todos los productos calculados arrojaron datos nulos o insuficientes. Intente ampliar el rango de fechas para capturar más historial.</p>
                            ) : (
                                <p className="text-sm text-muted-foreground mx-auto max-w-md">No se encontraron resultados para el rango de fechas seleccionado o no coinciden con el término de búsqueda.</p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">Rango Histórico: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</p>
                        </div>
                    ) : (
                        // Muestra la tabla si hay datos
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[200px]">Producto</TableHead> {/* Se quita la referencia al ID */}
                                        <TableHead className="text-right">
                                            <MetricTooltip 
                                                abbreviation="Pronóstico (Ft+1)" 
                                                fullName="El número de unidades que se estima vender en el próximo período (calculado por el Mejor Modelo)." 
                                            />
                                        </TableHead>
                                        <TableHead>Mejor Modelo</TableHead>
                                        {/* CABECERAS CON TOOLTIP */}
                                        <TableHead className="text-center">
                                            <MetricTooltip abbreviation="SMA-3" fullName="Promedio Móvil Simple (N=3) - MAPE/Pronóstico" />
                                        </TableHead>
                                        <TableHead className="text-center">
                                            <MetricTooltip abbreviation="SMA-6" fullName="Promedio Móvil Simple (N=6) - MAPE/Pronóstico" />
                                        </TableHead>
                                        <TableHead className="text-center">
                                            <MetricTooltip abbreviation="WMA-3" fullName="Media Móvil Ponderada (N=3) - MAPE/Pronóstico" />
                                        </TableHead>
                                        <TableHead className="text-center">
                                            <MetricTooltip abbreviation="SES-0.2" fullName="Suavización Exponencial (α=0.2) - MAPE/Pronóstico" />
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredForecasts.map((item: ForecastResult) => {
                                        const bestModelKey = item.best_method?.split(' (')[0] || '';
                                        const bestModelMad = getMetric(item, bestModelKey, 'MAD');

                                        return (
                                            <TableRow key={item.productId} className={cn(
                                                // Mantener el color de fila opcional
                                                (getMetric(item, 'SES_0.2', 'MAPE') ?? Infinity) < (getMetric(item, 'SMA_3', 'MAPE') ?? Infinity) ? 'bg-green-50/50' : ''
                                            )}>
                                                <TableCell className="font-medium">
                                                    <p>{item.productName}</p>
                                                </TableCell>

                                                {/* Forecast Value & Warning (Pronóstico Principal) */}
                                                <TableCell className="text-right">
                                                    {item.forecast_next_period !== null && !isNaN(item.forecast_next_period) ? (
                                                        <p className="text-lg font-bold text-primary">
                                                            {item.forecast_next_period.toFixed(0)} u.
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">-</p>
                                                    )}
                                                    {item.warning && (
                                                        <div className="flex items-center justify-end mt-1 text-xs text-amber-600 font-medium">
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                            {item.warning}
                                                        </div>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    {bestModelKey && !bestModelKey.includes('Datos insuficientes') ? (
                                                        <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 text-xs">
                                                            {bestModelKey}
                                                        </Badge>
                                                    ) : (
                                                       <Badge variant="destructive" className="text-xs">
                                                           {bestModelKey || 'N/A'}
                                                       </Badge>
                                                    )}
                                                </TableCell>

                                                {/* Columna SMA-3: F_t+1 y MAPE */}
                                                <TableCell className="text-center font-mono">
                                                    {getMetric(item, 'SMA_3', 'NextForecast') !== undefined && getMetric(item, 'SMA_3', 'NextForecast') !== null ? (
                                                        <>
                                                            <p className="font-semibold text-base text-gray-800 dark:text-gray-300">
                                                                {getMetric(item, 'SMA_3', 'NextForecast')?.toFixed(0)} u.
                                                            </p>
                                                            <p className="text-muted-foreground text-xs">
                                                                (MAPE: {getMetric(item, 'SMA_3', 'MAPE')?.toFixed(1) || 'N/A'}%)
                                                            </p>
                                                        </>
                                                    ) : 'N/A'}
                                                </TableCell>
                                                
                                                {/* Columna SMA-6: F_t+1 y MAPE */}
                                                <TableCell className="text-center font-mono">
                                                    {getMetric(item, 'SMA_6', 'NextForecast') !== undefined && getMetric(item, 'SMA_6', 'NextForecast') !== null ? (
                                                        <>
                                                            <p className="font-semibold text-base text-gray-800 dark:text-gray-300">
                                                                {getMetric(item, 'SMA_6', 'NextForecast')?.toFixed(0)} u.
                                                            </p>
                                                            <p className="text-muted-foreground text-xs">
                                                                (MAPE: {getMetric(item, 'SMA_6', 'MAPE')?.toFixed(1) || 'N/A'}%)
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">Insuf. Datos</span>
                                                    )}
                                                </TableCell>
                                                
                                                {/* Columna WMA-3: F_t+1 y MAPE */}
                                                <TableCell className="text-center font-mono">
                                                    {getMetric(item, 'WMA_3', 'NextForecast') !== undefined && getMetric(item, 'WMA_3', 'NextForecast') !== null ? (
                                                        <>
                                                            <p className="font-semibold text-base text-gray-800 dark:text-gray-300">
                                                                {getMetric(item, 'WMA_3', 'NextForecast')?.toFixed(0)} u.
                                                            </p>
                                                            <p className="text-muted-foreground text-xs">
                                                                (MAPE: {getMetric(item, 'WMA_3', 'MAPE')?.toFixed(1) || 'N/A'}%)
                                                            </p>
                                                        </>
                                                    ) : 'N/A'}
                                                </TableCell>

                                                {/* Columna SES-0.2: F_t+1 y MAPE */}
                                                <TableCell className="text-center font-mono">
                                                    {getMetric(item, 'SES_0.2', 'NextForecast') !== undefined && getMetric(item, 'SES_0.2', 'NextForecast') !== null ? (
                                                        <>
                                                            <p className="font-semibold text-base text-gray-800 dark:text-gray-300">
                                                                {getMetric(item, 'SES_0.2', 'NextForecast')?.toFixed(0)} u.
                                                            </p>
                                                            <p className="text-muted-foreground text-xs">
                                                                (MAPE: {getMetric(item, 'SES_0.2', 'MAPE')?.toFixed(1) || 'N/A'}%)
                                                            </p>
                                                        </>
                                                    ) : 'N/A'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
