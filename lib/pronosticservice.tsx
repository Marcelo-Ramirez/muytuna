
import { prisma } from '@/lib/db';

interface RawSale {
    productId: number;
    createdAt: Date; // Tipo Date, ya que Prisma lo devuelve
    quantity: number;
}

// **VARIABLES GLOBALES PARA CACHÉ**
let globalRawSalesCache: RawSale[] = [];
let lastCacheTimestamp = 0;
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutos de duración del caché

interface HistoricalDemand {
    productId: number;
    month: string; 
    demand: number;
}
interface AllMetrics {
    MAPE?: number;
    MAD?: number;
    MSE?: number;
    RMSE?: number;
    NextForecast?: number; // El valor pronosticado por ESTE modelo
}
interface ForecastResult {
    productId: number;
    productName: string;
    forecast_next_period: number | null; // El pronóstico del MEJOR modelo
    best_method: string;
    metrics: { [modelName: string]: AllMetrics; };
    warning?: string;
}

// --- 2. Funciones Auxiliares ---
// Tipo de entrada de rawSales actualizado de any[] a RawSale[]
const processRawSalesToMonthlyDemand = (rawSales: RawSale[]): Record<number, HistoricalDemand[]> => {
    const demandByProduct: Record<number, HistoricalDemand[]> = {};
    rawSales.forEach(item => {
        const productId = item.productId;
        const quantity = item.quantity || 0;
        const date = item.createdAt;
        const dateObj = new Date(date);
        
        if (isNaN(dateObj.getTime())) { return; }
        const month = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

        if (!demandByProduct[productId]) { demandByProduct[productId] = []; }
        const existingEntry = demandByProduct[productId].find(entry => entry.month === month);
        if (existingEntry) { existingEntry.demand += quantity; } 
        else { demandByProduct[productId].push({ productId, month, demand: quantity }); }
    });
    
    for (const productId in demandByProduct) {
        demandByProduct[productId].sort((a, b) => (a.month > b.month ? 1 : -1));
    }
    return demandByProduct;
};


export const ForecastService = {
    
    // Función con tipado corregido
    getHistoricalDemand: async (startDate: string, endDate: string): Promise<Record<number, HistoricalDemand[]>> => {
        
        
        // --- 1. LÓGICA DE CACHÉ ---
        const now = Date.now();
        // Tipo actualizado de any[] a RawSale[]
        let rawSales: RawSale[] = []; 

        if (globalRawSalesCache.length > 0 && (now - lastCacheTimestamp) < CACHE_DURATION_MS) {
            rawSales = globalRawSalesCache;
        } else {
            // Consulta la DB. Usamos 'dbResults' temporalmente
            // FIXED: Use OrderItem instead of SaleProduct
            const dbResults = await prisma.orderItem.findMany({
                select: { productId: true, createdAt: true, quantity: true },
                orderBy: { createdAt: 'asc' }
            });
            
            // Asignación con aserción para evitar problemas de tipado entre Prisma y la interfaz
            rawSales = dbResults as RawSale[]; 
            
            // Actualizar la caché
            globalRawSalesCache = rawSales;
            lastCacheTimestamp = now;
        }
        
        
        // Conversión de las fechas de filtro (Strings) a Objetos Date
        const startFilterDate = new Date(startDate);
        startFilterDate.setHours(0, 0, 0, 0);

        const endPlusOne = new Date(endDate);
        endPlusOne.setDate(endPlusOne.getDate() + 1);
        const endFilterDate = new Date(endPlusOne.getTime() - 1);
        
        // Ejecutar el filtro
        const filteredSales = rawSales.filter(item => {
            const itemDate = new Date(item.createdAt);
            const isAfterStart = itemDate >= startFilterDate;
            const isBeforeEnd = itemDate <= endFilterDate;
            return isAfterStart && isBeforeEnd;
        });
        

        if (filteredSales.length === 0) return {};

        // 3. Procesar solo los datos filtrados
        // CORRECCIÓN: Eliminamos el 'as any[]' innecesario
        return processRawSalesToMonthlyDemand(filteredSales);
    },

    // 2. Funciones de Cálculo (SMA, SES, WMA)
    calculateSMA: (demandSeries: number[], n: number): { historicalForecasts: number[], nextForecast: number } => { 
        const historicalForecasts: number[] = []; const seriesLength = demandSeries.length;
        for (let i = 0; i < seriesLength; i++) {
            if (i < n) { historicalForecasts.push(NaN); }
            else { const sum = demandSeries.slice(i - n, i).reduce((a, b) => a + b, 0); historicalForecasts.push(sum / n); }
        }
        const nextForecast = seriesLength >= n ? demandSeries.slice(seriesLength - n, seriesLength).reduce((a, b) => a + b, 0) / n : NaN;
        return { historicalForecasts, nextForecast };
    },
    calculateSES: (demandSeries: number[], alpha: number): { historicalForecasts: number[], nextForecast: number } => { 
        const historicalForecasts: number[] = []; const seriesLength = demandSeries.length;
        if (seriesLength === 0) return { historicalForecasts: [], nextForecast: NaN };
        if (seriesLength === 1) return { historicalForecasts: [NaN], nextForecast: demandSeries[0] };
        let Ft = demandSeries[0]; historicalForecasts.push(NaN);
        for (let i = 1; i < seriesLength; i++) {
            historicalForecasts.push(Ft); Ft = alpha * demandSeries[i - 1] + (1 - alpha) * Ft;
        }
        const nextForecast = alpha * demandSeries[seriesLength - 1] + (1 - alpha) * Ft;
        return { historicalForecasts, nextForecast };
    },
    calculateWMA: (demandSeries: number[], n: number, weights?: number[]): { historicalForecasts: number[], nextForecast: number } => { 
          if (!weights || weights.length !== n) { weights = Array.from({ length: n }, (_, i) => i + 1); }
          const historicalForecasts: number[] = []; const seriesLength = demandSeries.length;
          const sumOfWeights = weights.reduce((a, b) => a + b, 0);
          if(sumOfWeights === 0) return { historicalForecasts: Array(seriesLength).fill(NaN), nextForecast: NaN };
          for (let i = 0; i < seriesLength; i++) {
              if (i < n) { historicalForecasts.push(NaN); }
              else {
                  let weightedSum = 0;
                  for (let j = 0; j < n; j++) { weightedSum += demandSeries[i - n + j] * weights[j]; }
                  historicalForecasts.push(weightedSum / sumOfWeights);
              }
          }
          let nextWeightedSum = 0;
          if (seriesLength >= n) {
              for (let j = 0; j < n; j++) { nextWeightedSum += demandSeries[seriesLength - n + j] * weights[j]; }
          }
          const nextForecast = seriesLength >= n ? nextWeightedSum / sumOfWeights : NaN;
          return { historicalForecasts, nextForecast };
    },

    // 3. Funciones de Métricas
    calculateMAPE: (demandSeries: number[], historicalForecasts: number[]): number => { /* ... */ 
        let sumPercentageError = 0; let n = 0;
        const startIndex = historicalForecasts.findIndex(f => !isNaN(f));
        if (startIndex === -1) return NaN;
        for (let i = startIndex; i < demandSeries.length; i++) {
            const Dt = demandSeries[i]; const Ft = historicalForecasts[i];
            if (Dt > 0 && !isNaN(Ft)) { sumPercentageError += Math.abs((Dt - Ft) / Dt); n++; }
        }
        return n > 0 ? (sumPercentageError / n) * 100 : NaN;
    },
    calculateMAD: (demandSeries: number[], historicalForecasts: number[]): number => { /* ... */ 
        let sumAbsoluteError = 0; let n = 0;
        const startIndex = historicalForecasts.findIndex(f => !isNaN(f));
        if (startIndex === -1) return NaN;
        for (let i = startIndex; i < demandSeries.length; i++) {
            const Dt = demandSeries[i]; const Ft = historicalForecasts[i];
            if (!isNaN(Ft)) { sumAbsoluteError += Math.abs(Dt - Ft); n++; }
        }
        return n > 0 ? sumAbsoluteError / n : NaN;
    },
    calculateMSE: (demandSeries: number[], historicalForecasts: number[]): number => { /* ... */ 
        let sumSquaredError = 0; let n = 0;
        const startIndex = historicalForecasts.findIndex(f => !isNaN(f));
        if (startIndex === -1) return NaN;
        for (let i = startIndex; i < demandSeries.length; i++) {
            const Dt = demandSeries[i]; const Ft = historicalForecasts[i];
            if (!isNaN(Ft)) { sumSquaredError += Math.pow(Dt - Ft, 2); n++; }
        }
        return n > 0 ? sumSquaredError / n : NaN;
    },
    calculateRMSE: (mse: number): number => { return !isNaN(mse) ? Math.sqrt(mse) : NaN; },


    // 4. FUNCIÓN MAESTRA (generateAllProductsForecast)
    generateAllProductsForecast: async (startDate: string, endDate: string): Promise<ForecastResult[]> => {
        
        const allGroupedData = await ForecastService.getHistoricalDemand(startDate, endDate);
        const productIds = Object.keys(allGroupedData).map(Number);
        
        if (productIds.length === 0) {
            return []; 
        }

        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true }
        });
        const productMap = new Map(products.map(p => [p.id, p.name]));

        const finalResults: ForecastResult[] = [];
        const modelsToTest = [
            { name: 'SMA_3', method: 'SMA', param: 3 },
            { name: 'SMA_6', method: 'SMA', param: 6 },
            { name: 'WMA_3', method: 'WMA', param: 3, weights: [1, 2, 3] },
            { name: 'SES_0.2', method: 'SES', param: 0.2 },
            { name: 'SES_0.5', method: 'SES', param: 0.5 },
        ];
        const minPeriodsForSomeAccuracy = 3;
        const minPeriodsForBetterAccuracy = 6;

        for (const productId of productIds) {
            const historicalDataArray = allGroupedData[productId];
            if (!historicalDataArray) continue;

            const demandSeries = historicalDataArray.map(d => d.demand);
            const numPeriods = demandSeries.length;
            
            const allProductMetrics: { [modelName: string]: AllMetrics } = {};
            let bestMAPE = Infinity;
            let bestForecast: number | null = null;
            let bestMethodName = 'Datos insuficientes';
            let warningMessage: string | undefined = undefined;

            if (numPeriods < minPeriodsForSomeAccuracy) { warningMessage = `⚠️ Precisión muy baja (${numPeriods} mes/es)`; }
            else if (numPeriods < minPeriodsForBetterAccuracy) { warningMessage = `⚠️ Precisión limitada (${numPeriods} meses)`; }

            if (numPeriods > 0) {
                for (const model of modelsToTest) {
                    let forecastData: { historicalForecasts: number[], nextForecast: number }; 

                    if (model.method === 'SMA') {
                        if (numPeriods < model.param) continue;
                        forecastData = ForecastService.calculateSMA(demandSeries, model.param);
                    } else if (model.method === 'WMA') {
                          if (numPeriods < model.param) continue;
                          forecastData = ForecastService.calculateWMA(demandSeries, model.param, model.weights);
                    } else if (model.method === 'SES') {
                        if (numPeriods < 2) continue;
                        forecastData = ForecastService.calculateSES(demandSeries, model.param);
                    } else { continue; }

                    if (!forecastData || isNaN(forecastData.nextForecast)) continue;

                    // Calcular TODAS las métricas
                    const mape = ForecastService.calculateMAPE(demandSeries, forecastData.historicalForecasts);
                    const mad = ForecastService.calculateMAD(demandSeries, forecastData.historicalForecasts);
                    const mse = ForecastService.calculateMSE(demandSeries, forecastData.historicalForecasts);
                    const rmse = ForecastService.calculateRMSE(mse);

                    // Guardar métricas Y el pronóstico del modelo
                    const currentMetrics: AllMetrics = {};
                    if (!isNaN(mape)) currentMetrics.MAPE = parseFloat(mape.toFixed(2));
                    if (!isNaN(mad)) currentMetrics.MAD = parseFloat(mad.toFixed(2));
                    if (!isNaN(mse)) currentMetrics.MSE = parseFloat(mse.toFixed(2));
                    if (!isNaN(rmse)) currentMetrics.RMSE = parseFloat(rmse.toFixed(2));
                    if (!isNaN(forecastData.nextForecast)) {
                        currentMetrics.NextForecast = parseFloat(forecastData.nextForecast.toFixed(2)); 
                    }

                    if (Object.keys(currentMetrics).length > 0) {
                        allProductMetrics[model.name] = currentMetrics;
                    }

                    // Seleccionar el mejor modelo basado en MAPE
                    if (currentMetrics.MAPE !== undefined && currentMetrics.MAPE < bestMAPE) {
                        bestMAPE = currentMetrics.MAPE;
                        bestForecast = forecastData.nextForecast;
                        bestMethodName = `${model.name} (MAPE: ${currentMetrics.MAPE}%)`;
                    }
                }
            }

            // Añadir resultado
            finalResults.push({
                productId: productId,
                productName: productMap.get(productId) || `Producto ID ${productId}`,
                forecast_next_period: bestForecast !== null && !isNaN(bestForecast) ? parseFloat(bestForecast.toFixed(2)) : null,
                best_method: bestMethodName,
                metrics: allProductMetrics,
                warning: warningMessage,
            });
        }
        return finalResults;
    },
};