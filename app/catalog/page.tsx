'use client';

import React, { useState, useEffect, useMemo, Fragment, useCallback } from "react";
import { useSession} from "next-auth/react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Search, Loader2 } from 'lucide-react'; 
import { Button } from "@/components/ui/button";
import { AddToCartModal } from '@/components/cart/AddToCartModal'; 
import { CartSummaryModal } from '@/components/cart/carritohistorial'; 
import { ClientLoginModal } from '@/components/auth/ClientLoginModal'; 
import { ClientRegisterModal } from '@/components/auth/ClientRegisterModal'; 

import { ProductCard, Product} from '@/components/cart/ProductCards';

const PAGE_LIMIT = 10; 

interface CartItem {
    productId: number;
    name: string;
    pricePerUnit: number;
    quantity: number;
}
type Cart = Record<number, CartItem>;

interface ProductResponse {
    success: boolean;
    products: Product[];
    totalCount: number; 
}


export default function CatalogPage() {
    const { data: session, status } = useSession(); 
    
    // --- ESTADOS DE BÚSQUEDA ---
    const [products, setProducts] = useState<Product[]>([]); 
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    
    // 1. ESTADO REAL: Dispara la petición al servidor (Actualizado por el debounce)
    const [searchTerm, setSearchTerm] = useState("");
    // 2. ESTADO LOCAL: Vinculado directamente al campo de input (Actualizado inmediatamente)
    const [localSearchTerm, setLocalSearchTerm] = useState(""); 
    
    const [activeFilter, setActiveFilter] = useState("All");

    // --- ESTADOS DE PAGINACIÓN ---
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false); 
    const [isInitialLoad, setIsInitialLoad] = useState(true); 

    // --- ESTADOS DE CARRITO Y MODALES (Mantenidos) ---
    const [cart, setCart] = useState<Cart>({});
    const [isAddModalOpen, setIsAddModalOpen] = useState(false); 
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null); 
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

    const openLogin = () => { setIsLoginModalOpen(true); setIsRegisterModalOpen(false); };
    const openRegister = () => { setIsRegisterModalOpen(true); setIsLoginModalOpen(false); };
    
    const handleLoginSuccess = () => {
        setIsLoginModalOpen(false);
        location.reload(); 
    };

    // --- FUNCIONES DE PAGINACIÓN/BÚSQUEDA ---
    
    // 1. Lógica principal de carga de productos (Server-Side)
    const fetchProducts = useCallback(async () => {
        const query = new URLSearchParams();
        query.append('page', String(page));
        query.append('limit', String(PAGE_LIMIT));
        if (searchTerm) query.append('search', searchTerm);
        if (activeFilter !== "All") query.append('filter', activeFilter);
        
        const url = `/api/inventory/products?${query.toString()}`;

        try {
            if(isInitialLoad) setLoading(true); 
            setFetchError(null);
            
            const res = await fetch(url); 
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
            }
            
            const data: ProductResponse = await res.json();
            
            if (data.success && Array.isArray(data.products)) {
                setProducts(prevProducts => {
                    const newProducts = page === 1 ? data.products : [...prevProducts, ...data.products];
                    return newProducts;
                });
                setHasMore(prev => {
                    const currentTotal = page === 1 ? data.products.length : (page * PAGE_LIMIT);
                    return currentTotal < data.totalCount;
                });
            } else {
                setProducts([]); 
                setHasMore(false);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Error desconocido al cargar productos";
            setFetchError(errorMsg); 
            if (page === 1) setProducts([]); 
            setHasMore(false);
        } finally {
            setLoading(false);
            setIsInitialLoad(false);
        }
    }, [page, searchTerm, activeFilter, isInitialLoad]); 

    // 2. Control de cambios en filtros y búsqueda (Llama a fetchProducts)
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]); 
    
    // 3. Resetear página y productos (Se llama desde el debounce o el click de filtro)
    const handleSearchOrFilterChange = useCallback((newTerm: string, newFilter: string) => {
        if (newTerm !== searchTerm || newFilter !== activeFilter) {
            setIsInitialLoad(true); 
            setProducts([]); 
            setPage(1); 
            setSearchTerm(newTerm);
            setActiveFilter(newFilter);
        }
    }, [searchTerm, activeFilter]);
    
    // 4. Lógica del Debounce (Retraso de 300ms)
    useEffect(() => {
        if (localSearchTerm === searchTerm) return;

        const timerId = setTimeout(() => {
            handleSearchOrFilterChange(localSearchTerm, activeFilter);
        }, 300); 

        return () => {
            clearTimeout(timerId);
        };
    }, [localSearchTerm, activeFilter, handleSearchOrFilterChange, searchTerm]);

    // 5. Función para el botón "Cargar Más"
    const handleLoadMore = () => {
        if (!loading && hasMore) {
            setPage(prevPage => prevPage + 1);
        }
    };


    // --- LÓGICA DE CARRITO (Mantenida) ---

    useEffect(() => {
        try {
            const storedCart = localStorage.getItem('userCart');
            if (storedCart) {
                setCart(JSON.parse(storedCart));
            }
        } catch (e) {
            console.error("Error al cargar carrito desde localStorage:", e);
            localStorage.removeItem('userCart');
        }
        const timeoutId = globalThis.setTimeout(() => globalThis.dispatchEvent(new Event('cartUpdate')), 0);
        return () => clearTimeout(timeoutId);
    }, []); 

    const _totalItemsInCart = useMemo(() => {
        return Object.values(cart).reduce((total, item) => total + item.quantity, 0);
    }, [cart]);

    const _handleOpenSummaryChecked = useCallback(() => {
        if (status === 'loading') return; 

        if (session) {
            setIsSummaryModalOpen(true); 
        } else {
            setIsLoginModalOpen(true); 
        }
    }, [status, session]);

    useEffect(() => {
        const handleOpenCartModal = () => _handleOpenSummaryChecked();
        globalThis.addEventListener('openCartModal', handleOpenCartModal);
        return () => globalThis.removeEventListener('openCartModal', handleOpenCartModal);
    }, [_handleOpenSummaryChecked]);

    useEffect(() => {
        try {
            if (Object.keys(cart).length > 0) {
                localStorage.setItem('userCart', JSON.stringify(cart));
            } else if (localStorage.getItem('userCart')) {
                localStorage.removeItem('userCart');
            }
            const timeoutId = globalThis.setTimeout(() => globalThis.dispatchEvent(new Event('cartUpdate')), 0);
            return () => clearTimeout(timeoutId);
        } catch (e) {
            console.error("Error al guardar carrito en localStorage:", e);
        }
    }, [cart]); 
    
    const handleOpenAddModal = (product: Product) => { 
        setSelectedProduct(product); 
        setIsAddModalOpen(true); 
    };

    const handleAddToCart = (productId: number, quantity: number) => {
        const productToAdd = products.find(p => p.id === productId); 
        if (!productToAdd || productToAdd.currentQuantity === 0 || quantity < 1) { return; }

        setCart(prevCart => {
            const existingItem = prevCart[productId]; 
            const currentTotal = existingItem ? existingItem.quantity : 0;
            const newTotalQuantity = currentTotal + quantity;
            
            if (newTotalQuantity > productToAdd.currentQuantity) {
                alert(`Stock insuficiente. Solo puedes tener ${productToAdd.currentQuantity} unidades en total.`);
                return prevCart;
            }

            const updatedCart = {
                ...prevCart,
                [productId]: { productId, name: productToAdd.name, pricePerUnit: productToAdd.pricePerUnit, quantity: newTotalQuantity }
            };
            return updatedCart;
        });
        setTimeout(() => globalThis.dispatchEvent(new Event('cartUpdate')), 0);
    };

    const filterOptions = useMemo(() => (
        [
            { value: "All", label: "Todos los sabores" },
            { value: "Mango", label: "Mango" },
            { value: "Fresa", label: "Fresa" },
            { value: "Arándano", label: "Arándano" },
            { value: "Limón", label: "Limón" },
            { value: "Piña", label: "Piña" },
        ]
    ), []);

    // Content for products rendering
    let content;
    if (isInitialLoad && loading) {
        content = <div className="text-center py-12"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /><p className="mt-4 text-zinc-500 dark:text-zinc-400">Cargando...</p></div>;
    } else if (fetchError) {
        content = <div className="text-center py-12 p-4 border border-red-500 bg-red-500/10 text-red-500 rounded-md"><p className="font-bold">Error al cargar productos:</p><p className="text-sm">{fetchError}</p><Button className="mt-4" onClick={() => globalThis.location.reload()}>Recargar Página</Button></div>;
    } else if (products.length === 0) {
        content = <p className="text-center text-zinc-500 dark:text-zinc-400 py-12 text-lg">{searchTerm || activeFilter !== "All" ? `No se encontraron productos para "${searchTerm}" o el filtro "${activeFilter}"` : "No hay productos disponibles"}</p>;
    } else {
        content = <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8 justify-items-center max-w-6xl mx-auto">
            {products.map((product) => (
                <ProductCard key={product.id} {...product} onOpenAddModal={handleOpenAddModal} />
            ))}
        </div>;
    }

    // --- RENDERIZADO ---

    return (
        <Fragment>
            <PublicHeader />

            {/* --- LAYOUT DEL CATÁLOGO --- */}
            <main className="min-h-screen bg-background"> 

                {/* Hero solo escritorio inspirado en "Prueba la Fruta Real" */}
                <section className="hidden lg:block border-b border-zinc-200/70 dark:border-zinc-800 bg-gradient-to-r from-yellow-100 via-amber-50 to-orange-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900">
                    <div className="max-w-5xl mx-auto px-12 py-8 grid grid-cols-[1fr_minmax(320px,420px)] gap-10 items-center">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h1 className="text-5xl font-black leading-tight tracking-[-0.03em] text-zinc-900 dark:text-zinc-50">
                                    Prueba la fruta real.
                                </h1>
                                <p className="text-lg text-zinc-600 dark:text-zinc-300 max-w-xl">
                                    Gomitas deliciosamente suaves hechas 100% de pulpa de fruta natural. Nada artificial.
                                </p>
                            </div>
                        </div>
                        <div className="relative w-full min-w-[320px] max-w-[220px] aspect-[4/3] overflow-hidden rounded-[2rem] shadow-xl justify-self-end">
                            <div
                                aria-hidden="true"
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 hover:scale-[1.02]"
                                style={{
                                    backgroundImage:
                                        'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDyvKnFeLGWgnr09xS4Kmfcwf1R1hZbjVJIdq4Y7qkIcXUm8Nht3ovLwVGI09Zy5sPwnYtma2E9K3TFXNeBsJ8_A4DQVrLTrijvqBHNPvrJfqjjYnXyIqeA2zXiys7ul9_lC_Nf__N4alRYnVBcUTr0vDhkeFLDIaiyDhT3NRTX-8LcaIRzkG1MUlFEqXJ9_GC4XYbsmMWI91WbZ0txuxPE6oRh4k9WXlc_EzmpuwvpFSIoIed9oDmvjLKu49BNsLGQRybnzlrCnIyd")'
                                }}
                            />
                            <span className="sr-only">Pila vibrante y colorida de gomitas de pulpa de fruta sobre una superficie limpia y clara</span>
                        </div>
                    </div>
                </section>

                {/* Búsqueda y filtros */}
                <section className="px-4 py-8">
                    <div className="max-w-6xl mx-auto space-y-4">
                        <header className="space-y-1 hidden lg:block">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Nuestra colección de Gomitas</h2>
                        </header>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6 lg:flex-nowrap">
                            <label className="flex flex-col min-w-40 h-14 w-full lg:flex-1">
                                <div className="flex w-full flex-1 items-stretch rounded-full h-full border-2 border-zinc-600">
                                    <div className="text-zinc-500 dark:text-zinc-400 flex border-none bg-primary dark:bg-zinc-800 items-center justify-center pl-5 rounded-l-full border-r-0">
                                        <Search className="h-5 w-5" />
                                    </div>
                                    <input 
                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-full text-black dark:text-zinc-200 focus:outline-0 focus:ring-0 border-none bg-primary dark:bg-zinc-800 focus:border-none h-full placeholder:text-zinc-600 dark:placeholder:text-zinc-400 px-4 text-base font-normal" 
                                        placeholder="Buscar productos..." 
                                        aria-label="Buscar productos"
                                        value={localSearchTerm} // VINCULADO AL ESTADO LOCAL
                                        onChange={(e) => setLocalSearchTerm(e.target.value)} 
                                    />
                                </div>
                            </label>
                            <div className="flex gap-3 overflow-x-auto whitespace-nowrap justify-start lg:flex-1 lg:overflow-visible lg:whitespace-nowrap lg:justify-start no-scrollbar">
                                {filterOptions.map((filterOption) => (
                                    <button 
                                        key={filterOption.value}
                                        onClick={() => handleSearchOrFilterChange(searchTerm, filterOption.value)}
                                        className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 transition-colors ${
                                            activeFilter === filterOption.value 
                                            ? 'bg-yellow-500 text-zinc-900' 
                                            : 'bg-gray-100 dark:bg-zinc-800 text-black dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600'
                                        }`}
                                    >
                                        <p className={`text-sm leading-normal font-bold`}>
                                            {filterOption.label}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
                

                {/* --- Renderizado de Productos (Mantenido) --- */}
                <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    {content}
                </div>

                {/* --- Botón "Cargar Más" (Mantenido) --- */}
                {hasMore && (
                    <div className="flex px-4 py-6 justify-center">
                        <button 
                            onClick={handleLoadMore}
                            disabled={loading} 
                            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 flex-1 bg-primary dark:bg-zinc-800 text-black dark:text-zinc-200 text-base font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors relative dark:border-zinc-600 border border-gray-200 shadow-md"
                        >
                            {loading && page > 1 ? (
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            ) : null}
                            <span className="truncate">
                                {loading && page > 1 ? "Cargando más..." : "Cargar Más Productos"}
                            </span>
                        </button>
                    </div>
                )}


                {/* --- MODALS (Mantenido) --- */}
                <AddToCartModal isOpen={isAddModalOpen} onClose={() => {setIsAddModalOpen(false); setSelectedProduct(null);}} product={selectedProduct} onConfirmAdd={handleAddToCart} />
                <CartSummaryModal isOpen={isSummaryModalOpen} onClose={() => setIsSummaryModalOpen(false)} cart={cart} setCart={setCart} />
                
                <ClientLoginModal 
                    isOpen={isLoginModalOpen} 
                    onClose={() => setIsLoginModalOpen(false)} 
                    onLoginSuccess={handleLoginSuccess}
                    onOpenRegister={openRegister} 
                />
                <ClientRegisterModal
                    isOpen={isRegisterModalOpen}
                    onClose={() => setIsRegisterModalOpen(false)}
                    onOpenLogin={openLogin} 
                />
                
            </main>
        </Fragment>
    );
}