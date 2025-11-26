'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Calculator, Save } from 'lucide-react';

// Tipos para la planificación
interface PlanningMonth {
  monthIndex: number; // 1-6
  demand: number;
  production: number;
  inventory: number;
  workers: number;
  hired: number;
  fired: number;
  overtimeUnits: number;
  costRegular: number;
  costOvertime: number;
  costHiring: number;
  costFiring: number;
  costInventory: number;
  totalCost: number;
}

interface PlanningInputs {
  initialInventory: number;
  initialWorkers: number;
  unitsPerWorker: number; // Tasa de producción diaria por trabajador
  workingDaysPerMonth: number;
  costHiring: number;
  costFiring: number;
  costRegularLabor: number; // Costo mensual por trabajador
  costOvertimeUnit: number; // Costo por unidad en tiempo extra
  costInventoryHolding: number; // Costo por unidad en inventario al mes
  growthRate: number; // % de crecimiento mensual para el pronóstico
}

const DEFAULT_INPUTS: PlanningInputs = {
  initialInventory: 0,
  initialWorkers: 10,
  unitsPerWorker: 5,
  workingDaysPerMonth: 20,
  costHiring: 200,
  costFiring: 500,
  costRegularLabor: 1500,
  costOvertimeUnit: 15,
  costInventoryHolding: 2,
  growthRate: 0,
};

export default function AggregatePlanningPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const productId = searchParams.get('productId');
  const productName = searchParams.get('productName') || 'Producto';
  const baselineForecast = parseFloat(searchParams.get('forecast') || '0');

  const [inputs, setInputs] = useState<PlanningInputs>(DEFAULT_INPUTS);
  const [plan, setPlan] = useState<PlanningMonth[]>([]);
  const [activeStrategy, setActiveStrategy] = useState('level'); // level, chase, mixed

  // Calcular la demanda proyectada para 6 meses
  const projectedDemand = useMemo(() => {
    const demands = [];
    let currentDemand = baselineForecast;
    for (let i = 0; i < 6; i++) {
        // Aplicar tasa de crecimiento: Mes 1 es base, Mes 2 = Base * (1 + rate), etc.
        if (i > 0) {
            currentDemand = currentDemand * (1 + (inputs.growthRate / 100));
        }
        demands.push(Math.round(currentDemand));
    }
    return demands;
  }, [baselineForecast, inputs.growthRate]);

  // Funciones de cálculo puras (ahora retornan el plan)
  const calculateLevelStrategy = (currentInputs: PlanningInputs, demandArr: number[]) => {
    const totalDemand = demandArr.reduce((a, b) => a + b, 0);
    const netDemand = Math.max(0, totalDemand - currentInputs.initialInventory);
    const avgDemand = netDemand / demandArr.length;
    const monthlyProduction = Math.ceil(avgDemand); 
    
    const workersNeeded = Math.ceil(monthlyProduction / (currentInputs.unitsPerWorker * currentInputs.workingDaysPerMonth));
    
    let currentInventory = currentInputs.initialInventory;
    let currentWorkers = currentInputs.initialWorkers;
    
    const newPlan: PlanningMonth[] = [];

    demandArr.forEach((demand, index) => {
        const hired = index === 0 ? Math.max(0, workersNeeded - currentWorkers) : 0;
        const fired = index === 0 ? Math.max(0, currentWorkers - workersNeeded) : 0;
        
        currentWorkers = workersNeeded; 
        const production = monthlyProduction; 
        const endingInventory = currentInventory + production - demand;
        
        const costRegular = currentWorkers * currentInputs.costRegularLabor;
        const costHiringVal = hired * currentInputs.costHiring;
        const costFiringVal = fired * currentInputs.costFiring;
        const costInventory = Math.max(0, endingInventory) * currentInputs.costInventoryHolding;
        
        const totalCost = costRegular + costHiringVal + costFiringVal + costInventory;

        newPlan.push({
            monthIndex: index + 1,
            demand,
            production,
            inventory: endingInventory,
            workers: currentWorkers,
            hired,
            fired,
            overtimeUnits: 0,
            costRegular,
            costOvertime: 0,
            costHiring: costHiringVal,
            costFiring: costFiringVal,
            costInventory,
            totalCost
        });

        currentInventory = endingInventory;
    });
    return newPlan;
  };

  const calculateChaseStrategy = (currentInputs: PlanningInputs, demandArr: number[]) => {
    let currentInventory = currentInputs.initialInventory;
    let prevWorkers = currentInputs.initialWorkers;
    const newPlan: PlanningMonth[] = [];

    demandArr.forEach((demand, index) => {
        let productionNeeded = demand - currentInventory;
        if (productionNeeded < 0) productionNeeded = 0;

        const workersNeeded = Math.ceil(productionNeeded / (currentInputs.unitsPerWorker * currentInputs.workingDaysPerMonth));
        
        const hired = Math.max(0, workersNeeded - prevWorkers);
        const fired = Math.max(0, prevWorkers - workersNeeded);
        
        const production = productionNeeded; 
        const endingInventory = currentInventory + production - demand;

        const costRegular = workersNeeded * currentInputs.costRegularLabor;
        const costHiringVal = hired * currentInputs.costHiring;
        const costFiringVal = fired * currentInputs.costFiring;
        const costInventory = Math.max(0, endingInventory) * currentInputs.costInventoryHolding; 
        
        const totalCost = costRegular + costHiringVal + costFiringVal + costInventory;

        newPlan.push({
            monthIndex: index + 1,
            demand,
            production,
            inventory: endingInventory,
            workers: workersNeeded,
            hired,
            fired,
            overtimeUnits: 0,
            costRegular,
            costOvertime: 0,
            costHiring: costHiringVal,
            costFiring: costFiringVal,
            costInventory,
            totalCost
        });

        prevWorkers = workersNeeded;
        currentInventory = endingInventory;
    });
    return newPlan;
  };

  const calculateMixedStrategy = (currentInputs: PlanningInputs, demandArr: number[]) => {
    const minDemand = Math.min(...demandArr);
    const workersConstant = Math.ceil(minDemand / (currentInputs.unitsPerWorker * currentInputs.workingDaysPerMonth));
    
    let currentInventory = currentInputs.initialInventory;
    let currentWorkers = currentInputs.initialWorkers;
    
    const newPlan: PlanningMonth[] = [];

    demandArr.forEach((demand, index) => {
        const hired = index === 0 ? Math.max(0, workersConstant - currentWorkers) : 0;
        const fired = index === 0 ? Math.max(0, currentWorkers - workersConstant) : 0;
        currentWorkers = workersConstant;

        const regularProduction = currentWorkers * currentInputs.unitsPerWorker * currentInputs.workingDaysPerMonth;
        
        let gap = demand - currentInventory - regularProduction;
        let overtimeUnits = 0;
        
        if (gap > 0) {
            overtimeUnits = gap;
        }
        
        const totalProduction = regularProduction + overtimeUnits;
        const endingInventory = currentInventory + totalProduction - demand;

        const costRegular = currentWorkers * currentInputs.costRegularLabor;
        const costOvertime = overtimeUnits * currentInputs.costOvertimeUnit;
        const costHiringVal = hired * currentInputs.costHiring;
        const costFiringVal = fired * currentInputs.costFiring;
        const costInventory = Math.max(0, endingInventory) * currentInputs.costInventoryHolding;
        
        const totalCost = costRegular + costOvertime + costHiringVal + costFiringVal + costInventory;

        newPlan.push({
            monthIndex: index + 1,
            demand,
            production: totalProduction,
            inventory: endingInventory,
            workers: currentWorkers,
            hired,
            fired,
            overtimeUnits,
            costRegular,
            costOvertime,
            costHiring: costHiringVal,
            costFiring: costFiringVal,
            costInventory,
            totalCost
        });
        
        currentInventory = endingInventory;
    });
    return newPlan;
  };

  // Efecto para recalcular cuando cambian inputs o estrategia
  useEffect(() => {
    let calculatedPlan: PlanningMonth[] = [];
    if (activeStrategy === 'level') {
        calculatedPlan = calculateLevelStrategy(inputs, projectedDemand);
    } else if (activeStrategy === 'chase') {
        calculatedPlan = calculateChaseStrategy(inputs, projectedDemand);
    } else if (activeStrategy === 'mixed') {
        calculatedPlan = calculateMixedStrategy(inputs, projectedDemand);
    }
    setPlan(calculatedPlan);
  }, [inputs, projectedDemand, activeStrategy]);

  const handlePrintBestStrategy = () => {
    const levelPlan = calculateLevelStrategy(inputs, projectedDemand);
    const chasePlan = calculateChaseStrategy(inputs, projectedDemand);
    const mixedPlan = calculateMixedStrategy(inputs, projectedDemand);

    const costLevel = levelPlan.reduce((sum, m) => sum + m.totalCost, 0);
    const costChase = chasePlan.reduce((sum, m) => sum + m.totalCost, 0);
    const costMixed = mixedPlan.reduce((sum, m) => sum + m.totalCost, 0);

    let bestPlan = levelPlan;
    let bestName = "Estrategia Nivelada";
    let minCost = costLevel;

    if (costChase < minCost) {
        minCost = costChase;
        bestPlan = chasePlan;
        bestName = "Estrategia de Persecución";
    }
    if (costMixed < minCost) {
        minCost = costMixed;
        bestPlan = mixedPlan;
        bestName = "Estrategia Mixta";
    }

    // Generar ventana de impresión
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Reporte de Planificación - ${productName}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    h1 { color: #333; }
                    .header { margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                    .info { margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                    th { background-color: #f2f2f2; }
                    .cost { font-weight: bold; color: #2563eb; }
                    .total-row { background-color: #e5e7eb; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Reporte de Planificación Agregada</h1>
                    <p>Fecha: ${dateStr}</p>
                </div>
                <div class="info">
                    <p><strong>Producto:</strong> ${productName}</p>
                    <p><strong>Estrategia Recomendada (Menor Costo):</strong> ${bestName}</p>
                    <p><strong>Costo Total Estimado:</strong> $${minCost.toLocaleString()}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Mes</th>
                            <th>Demanda</th>
                            <th>Producción</th>
                            <th>Inventario</th>
                            <th>Trabajadores</th>
                            <th>Cont/Desp</th>
                            <th>Extra</th>
                            <th>Costo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bestPlan.map(row => `
                            <tr>
                                <td>${row.monthIndex}</td>
                                <td>${row.demand}</td>
                                <td>${row.production}</td>
                                <td>${row.inventory}</td>
                                <td>${row.workers}</td>
                                <td>${row.hired > 0 ? '+' + row.hired : (row.fired > 0 ? '-' + row.fired : '-')}</td>
                                <td>${row.overtimeUnits}</td>
                                <td>$${row.totalCost.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td>TOTAL</td>
                            <td>${bestPlan.reduce((a,b)=>a+b.demand,0)}</td>
                            <td>${bestPlan.reduce((a,b)=>a+b.production,0)}</td>
                            <td>-</td>
                            <td>-</td>
                            <td>${bestPlan.reduce((a,b)=>a+b.hired+b.fired,0)} (Movs)</td>
                            <td>${bestPlan.reduce((a,b)=>a+b.overtimeUnits,0)}</td>
                            <td>$${minCost.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
  };

  const totalPlanCost = plan.reduce((sum, m) => sum + m.totalCost, 0);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <ArrowLeft className="h-6 w-6 text-muted-foreground" />
            </Button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Planificación Agregada</h1>
                <p className="text-muted-foreground mt-1">
                    Estrategia para: <span className="font-semibold text-primary">{productName}</span>
                </p>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-full">
                <span className="text-sm text-muted-foreground">Pronóstico Base:</span>
                <span className="font-bold text-lg">{baselineForecast.toFixed(0)} u.</span>
            </div>
            <Button onClick={handlePrintBestStrategy} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Save className="mr-2 h-4 w-4" /> Imprimir Mejor Estrategia
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUMNA IZQUIERDA: CONFIGURACIÓN (3 cols) */}
        <Card className="lg:col-span-4 h-fit border-none shadow-lg bg-card/80 dark:bg-zinc-800/50 backdrop-blur-sm">
            <CardHeader className="bg-muted/50 dark:bg-zinc-900/50 rounded-t-lg pb-4">
                <CardTitle className="flex items-center gap-2 text-lg"><Calculator className="h-5 w-5 text-primary"/> Parámetros de Entrada</CardTitle>
                <CardDescription>Define las capacidades y costos operativos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Capacidad Inicial</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Inv. Inicial</Label>
                            <Input type="number" className="bg-background dark:bg-zinc-950/50" value={inputs.initialInventory} onChange={e => setInputs({...inputs, initialInventory: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Trabajadores</Label>
                            <Input type="number" className="bg-background dark:bg-zinc-950/50" value={inputs.initialWorkers} onChange={e => setInputs({...inputs, initialWorkers: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Prod/Trab/Día</Label>
                            <Input type="number" className="bg-background dark:bg-zinc-950/50" value={inputs.unitsPerWorker} onChange={e => setInputs({...inputs, unitsPerWorker: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Días/Mes</Label>
                            <Input type="number" className="bg-background dark:bg-zinc-950/50" value={inputs.workingDaysPerMonth} onChange={e => setInputs({...inputs, workingDaysPerMonth: Number(e.target.value)})} />
                        </div>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Estructura de Costos ($)</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Contratar</Label>
                            <Input type="number" className="bg-background dark:bg-zinc-950/50" value={inputs.costHiring} onChange={e => setInputs({...inputs, costHiring: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Despedir</Label>
                            <Input type="number" className="bg-background dark:bg-zinc-950/50" value={inputs.costFiring} onChange={e => setInputs({...inputs, costFiring: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Salario Mensual</Label>
                            <Input type="number" className="bg-background dark:bg-zinc-950/50" value={inputs.costRegularLabor} onChange={e => setInputs({...inputs, costRegularLabor: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Hora Extra (u)</Label>
                            <Input type="number" className="bg-background dark:bg-zinc-950/50" value={inputs.costOvertimeUnit} onChange={e => setInputs({...inputs, costOvertimeUnit: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Mantener Inv.</Label>
                            <Input type="number" className="bg-background dark:bg-zinc-950/50" value={inputs.costInventoryHolding} onChange={e => setInputs({...inputs, costInventoryHolding: Number(e.target.value)})} />
                        </div>
                    </div>
                </div>

                <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <Label className="text-primary font-bold flex items-center justify-between">
                        Crecimiento Mensual
                        <span className="text-xs font-normal bg-primary text-white px-2 py-0.5 rounded-full">{inputs.growthRate}%</span>
                    </Label>
                    <Input 
                        type="range" 
                        min="-10" max="20" step="1"
                        className="mt-3 h-2"
                        value={inputs.growthRate} 
                        onChange={e => setInputs({...inputs, growthRate: Number(e.target.value)})} 
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-center">Ajusta la proyección de demanda futura.</p>
                </div>
            </CardContent>
        </Card>

        {/* COLUMNA DERECHA: RESULTADOS (9 cols) */}
        <div className="lg:col-span-8 space-y-6">
            <Tabs defaultValue="level" value={activeStrategy} onValueChange={setActiveStrategy} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-muted dark:bg-zinc-800/50 p-1 rounded-xl">
                    <TabsTrigger value="level" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Nivelada</TabsTrigger>
                    <TabsTrigger value="chase" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Persecución</TabsTrigger>
                    <TabsTrigger value="mixed" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Mixta</TabsTrigger>
                </TabsList>
                
                {/* KPI CARDS */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-none shadow-md bg-card dark:bg-zinc-800/50 border-l-4 border-l-primary overflow-hidden">
                        <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                            <div className="text-2xl font-bold text-primary">${totalPlanCost.toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">Costo Total</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-md bg-card dark:bg-zinc-800/50 border-l-4 border-l-blue-500 overflow-hidden">
                        <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                            <div className="text-2xl font-bold text-foreground">{plan.reduce((a,b)=>a+b.production, 0).toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">Prod. Total</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-md bg-card dark:bg-zinc-800/50 border-l-4 border-l-orange-500 overflow-hidden">
                        <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                            <div className="text-2xl font-bold text-foreground">{plan.reduce((a,b)=>a+b.hired+b.fired, 0)}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">Mov. Personal</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-md bg-card dark:bg-zinc-800/50 border-l-4 border-l-purple-500 overflow-hidden">
                        <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                            <div className="text-2xl font-bold text-foreground">{plan.reduce((a,b)=>a+b.overtimeUnits, 0).toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">Unid. Extra</div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="mt-6 border-none shadow-lg bg-card/90 dark:bg-zinc-800/60 backdrop-blur-sm">
                    <CardHeader className="border-b border-border dark:border-zinc-700/50">
                        <CardTitle className="text-lg">Detalle del Plan (6 Meses)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-border dark:border-zinc-700/50">
                                    <TableHead className="w-[50px] text-center">Mes</TableHead>
                                    <TableHead className="text-center">Demanda</TableHead>
                                    <TableHead className="text-center">Prod.</TableHead>
                                    <TableHead className="text-center">Inv. Final</TableHead>
                                    <TableHead className="text-center">Trab.</TableHead>
                                    <TableHead className="text-center">Cont/Desp</TableHead>
                                    <TableHead className="text-center">Extra</TableHead>
                                    <TableHead className="text-right pr-6">Costo Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plan.map((row) => (
                                    <TableRow key={row.monthIndex} className="hover:bg-muted/50 dark:hover:bg-zinc-700/30 transition-colors border-border dark:border-zinc-700/50">
                                        <TableCell className="font-bold text-center bg-muted/30 dark:bg-zinc-800/30">{row.monthIndex}</TableCell>
                                        <TableCell className="text-center">{row.demand}</TableCell>
                                        <TableCell className="text-center font-medium">{row.production}</TableCell>
                                        <TableCell className={`text-center font-bold ${row.inventory < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                                            {row.inventory}
                                        </TableCell>
                                        <TableCell className="text-center">{row.workers}</TableCell>
                                        <TableCell className="text-center">
                                            {row.hired > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">+{row.hired}</span>}
                                            {row.fired > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">-{row.fired}</span>}
                                            {row.hired === 0 && row.fired === 0 && <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell className="text-center">{row.overtimeUnits > 0 ? <span className="text-purple-600 dark:text-purple-400 font-bold">{row.overtimeUnits}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
                                        <TableCell className="text-right font-mono font-medium pr-6">${row.totalCost.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </Tabs>
        </div>
      </div>
    </div>
  );
}
