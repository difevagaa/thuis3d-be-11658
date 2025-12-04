import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import { useGlobalColors } from "@/hooks/useGlobalColors";
import { useViewportReset } from "@/hooks/useViewportReset";
import { useSessionRecovery } from "@/hooks/useSessionRecovery";
import { useConnectionRecovery } from "@/hooks/useConnectionRecovery";
import { useSupabaseReconnect } from "@/hooks/useSupabaseReconnect";
import { useReconnectNotification } from "@/hooks/useReconnectNotification";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { autoCleanup as autoCleanupLocalStorage } from "@/lib/localStorageDebugger";
import { startVisibilityMonitoring, startInfiniteLoadingDetection } from "@/lib/visibilityDebugger";

// Public pages - optimized lazy loading
import Home from "./pages/Home";
import Auth from "./pages/Auth";
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const PublicQuotes = lazy(() => import("./pages/Quotes"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const GiftCard = lazy(() => import("./pages/GiftCard"));
const PaymentInstructions = lazy(() => import("./pages/PaymentInstructions"));
const Page = lazy(() => import("./pages/Page"));
const StaticPage = lazy(() => import("./pages/StaticPage"));
const ShippingInfo = lazy(() => import("./pages/ShippingInfo"));
const PaymentSummary = lazy(() => import("./pages/PaymentSummary"));
const Payment = lazy(() => import("./pages/Payment"));
const LegalPage = lazy(() => import("./pages/LegalPage"));

// Components loaded immediately
import CookieConsent from "./components/CookieConsent";
import ScrollToTop from "./components/ScrollToTop";
import NotFound from "./pages/NotFound";
import { ClientChatWidget } from "./components/ClientChatWidget";
import { SEOHead } from "./components/SEOHead";

// User pages - lazy loaded
const MyAccount = lazy(() => import("./pages/user/MyAccount"));
const OrderDetail = lazy(() => import("./pages/user/OrderDetail"));
const UserInvoiceView = lazy(() => import("./pages/user/InvoiceView"));
const GiftCardView = lazy(() => import("./pages/user/GiftCardView"));
const UserQuoteDetail = lazy(() => import("./pages/user/QuoteDetail"));
const UserMessages = lazy(() => import("./pages/user/Messages"));

// Admin pages - lazy loaded for better code splitting
const VisitorAnalytics = lazy(() => import("./pages/admin/VisitorAnalytics"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Loyalty = lazy(() => import("./pages/admin/Loyalty"));
const Coupons = lazy(() => import("./pages/admin/Coupons"));
const GiftCardsEnhanced = lazy(() => import("./pages/admin/GiftCardsEnhanced"));
const Reviews = lazy(() => import("./pages/admin/Reviews"));
const BlogAdmin = lazy(() => import("./pages/admin/BlogAdmin"));
const Pages = lazy(() => import("./pages/admin/Pages"));
const OrdersEnhanced = lazy(() => import("./pages/admin/OrdersEnhanced"));
const AdminQuotes = lazy(() => import("./pages/admin/Quotes"));
const QuoteDetail = lazy(() => import("./pages/admin/QuoteDetail"));
const CreateQuote = lazy(() => import("./pages/admin/CreateQuote"));
const AdminOrderDetail = lazy(() => import("./pages/admin/OrderDetail"));
const CreateOrder = lazy(() => import("./pages/admin/CreateOrder"));
const Users = lazy(() => import("./pages/admin/Users"));
const Materials = lazy(() => import("./pages/admin/Materials"));
const Colors = lazy(() => import("./pages/admin/Colors"));
const PinManagement = lazy(() => import("./pages/admin/PinManagement"));
const ProductsAdminEnhanced = lazy(() => import("./pages/admin/ProductsAdminEnhanced"));
const Categories = lazy(() => import("./pages/admin/Categories"));
const Messages = lazy(() => import("./pages/admin/Messages"));
const Trash = lazy(() => import("./pages/admin/Trash"));
const BackupConfig = lazy(() => import("./pages/admin/BackupConfig"));
const Statuses = lazy(() => import("./pages/admin/Statuses"));
const RolesPermissions = lazy(() => import("./pages/admin/RolesPermissions"));
const Invoices = lazy(() => import("./pages/admin/Invoices"));
const InvoiceView = lazy(() => import("./pages/admin/InvoiceView"));
const PaymentConfig = lazy(() => import("./pages/admin/PaymentConfig"));
const TaxConfiguration = lazy(() => import("./pages/admin/TaxConfiguration"));
const ShippingManagement = lazy(() => import("./pages/admin/ShippingManagement"));
const ContentManagement = lazy(() => import("./pages/admin/ContentManagement"));
const SiteCustomizer = lazy(() => import("./pages/admin/SiteCustomizer"));
const LegalPages = lazy(() => import("./pages/admin/LegalPages"));
const CalibrationSettings = lazy(() => import("./pages/admin/CalibrationSettings"));
const CalibrationProfiles = lazy(() => import("./pages/admin/CalibrationProfiles"));
const PrintingCalculatorSettings = lazy(() => import("./pages/admin/PrintingCalculatorSettings"));
const CalculatorAccuracy = lazy(() => import("./pages/admin/CalculatorAccuracy"));
const SupportDetectionSettings = lazy(() => import("./pages/admin/SupportDetectionSettings"));
const PreviewModels = lazy(() => import("./pages/admin/PreviewModels"));
const QuantityDiscounts = lazy(() => import("./pages/admin/QuantityDiscounts"));
const SEOManager = lazy(() => import("./pages/admin/SEOManager"));
const GalleryAdmin = lazy(() => import("./pages/admin/GalleryAdmin"));
const TranslationManagement = lazy(() => import("./pages/admin/TranslationManagement"));

// Public pages that need to stay eager
import Gallery from "./pages/Gallery";

/**
 * CRITICAL FIX: React Query Configuration
 * 
 * PREVIOUS PROBLEM:
 * - refetchOnWindowFocus: true → caused reloads on every tab switch
 * - refetchOnMount: "always" → caused reloads on every navigation
 * - Combined with 30+ pages having realtime subscriptions
 * - Result: Infinite loading after 20-30 seconds of navigation
 * 
 * SOLUTION:
 * - Disable aggressive refetching
 * - Increase stale time (data stays fresh longer)
 * - Reduce cache time (faster garbage collection)
 * - Let realtime subscriptions handle updates
 * 
 * ISSUE #15 FIX:
 * - Queries can fail when tab is hidden/visible transition
 * - Need to allow retries and not enter permanent error state
 * - useSupabaseReconnect will invalidate and refetch queries
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 3 minutes - reduces unnecessary refetches
      staleTime: 3 * 60 * 1000,
      // Keep unused data in cache for 2 minutes only - faster cleanup
      gcTime: 2 * 60 * 1000,
      
      // CRITICAL: Disable aggressive refetching that caused infinite loading
      refetchOnWindowFocus: false, // Don't refetch on tab switch (useSupabaseReconnect handles this)
      refetchOnReconnect: false,   // Don't refetch on reconnect (useSupabaseReconnect handles this)
      refetchOnMount: false,       // Don't refetch on every mount
      
      // ISSUE #15 FIX: Allow more retries for tab visibility issues
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status === 401 || status === 403) return false;
        }
        // Allow up to 3 retries for connection issues
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      
      // Network mode - allow queries even when browser thinks it's offline
      // (sometimes browser incorrectly reports offline during tab switches)
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Don't retry mutations - could cause duplicate operations
      retry: 0,
      networkMode: 'online',
    },
  },
  
  // Error handling for queries
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error('[QueryCache] Global query error:', error);
      // Don't log errors for background refetches
      if (query.state.fetchStatus === 'idle') return;
    },
  }),
  
  // Error handling for mutations
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error('[MutationCache] Global mutation error:', error);
    },
  }),
});

// Make QueryClient available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__queryClient = queryClient;
}

// Loading fallback component with responsive sizing
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-dvh">
    <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 border-b-2 border-primary"></div>
  </div>
);

// AppContent component - handles hooks that require router context
const AppContent = () => {
  // CRITICAL FIX FOR ISSUE #15: Reconnect Supabase when returning from another tab
  useSupabaseReconnect();
  // Show reconnection notifications to user
  useReconnectNotification();
  // Global connection recovery (highest priority)
  useConnectionRecovery();
  // Load and apply global colors on app start
  useGlobalColors();
  // Track visitor activity
  useVisitorTracking();
  // Reset viewport on navigation for mobile devices
  useViewportReset();
  // Handle session recovery for cache/cookie issues
  useSessionRecovery();
  
  // Initialize debugging and monitoring tools
  useEffect(() => {
    // Auto-cleanup corrupted localStorage on startup
    autoCleanupLocalStorage().then((cleanupPerformed) => {
      if (cleanupPerformed) {
        console.log('[App] localStorage auto-cleanup completed');
      }
    }).catch((error) => {
      console.error('[App] localStorage auto-cleanup failed:', error);
    });
    
    // Start visibility change monitoring
    startVisibilityMonitoring();
    
    // Start infinite loading detection
    const stopDetection = startInfiniteLoadingDetection();
    
    // Listen for infinite loading detection
    const handleInfiniteLoading = () => {
      console.error('[App] INFINITE LOADING DETECTED! Check console for details.');
      // Could trigger a user notification here
    };
    window.addEventListener('infinite-loading-detected', handleInfiniteLoading);
    
    return () => {
      stopDetection();
      window.removeEventListener('infinite-loading-detected', handleInfiniteLoading);
    };
  }, []);

  return (
    <>
      <SEOHead />
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes with Layout */}
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/auth" element={<Layout><Auth /></Layout>} />
          <Route path="/productos" element={<Layout><Products /></Layout>} />
          <Route path="/producto/:id" element={<Layout><ProductDetail /></Layout>} />
          <Route path="/carrito" element={<Layout><Cart /></Layout>} />
          <Route path="/cotizaciones" element={<Layout><PublicQuotes /></Layout>} />
          <Route path="/blog" element={<Layout><Blog /></Layout>} />
          <Route path="/blog/:slug" element={<Layout><BlogPost /></Layout>} />
          <Route path="/tarjetas-regalo" element={<Layout><GiftCard /></Layout>} />
          <Route path="/galeria" element={<Layout><Gallery /></Layout>} />
          <Route path="/pago-instrucciones" element={<Layout><PaymentInstructions /></Layout>} />
          <Route path="/informacion-envio" element={<Layout><ShippingInfo /></Layout>} />
          <Route path="/resumen-pago" element={<Layout><PaymentSummary /></Layout>} />
          <Route path="/pago" element={<Layout><Payment /></Layout>} />
          <Route path="/page/:slug" element={<Layout><StaticPage /></Layout>} />
          <Route path="/legal/:type" element={<Layout><LegalPage /></Layout>} />
          <Route path="/mi-cuenta" element={<Layout><MyAccount /></Layout>} />
          <Route path="/pedido/:id" element={<Layout><OrderDetail /></Layout>} />
          <Route path="/factura/:id" element={<UserInvoiceView />} />
          <Route path="/mis-tarjetas-regalo" element={<Layout><GiftCardView /></Layout>} />
          <Route path="/cotizacion/:id" element={<Layout><UserQuoteDetail /></Layout>} />
          <Route path="/mis-mensajes" element={<Layout><UserMessages /></Layout>} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
          <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
          <Route path="/admin/loyalty" element={<AdminLayout><Loyalty /></AdminLayout>} />
          <Route path="/admin/coupons" element={<AdminLayout><Coupons /></AdminLayout>} />
          <Route path="/admin/gift-cards" element={<AdminLayout><GiftCardsEnhanced /></AdminLayout>} />
          <Route path="/admin/reviews" element={<AdminLayout><Reviews /></AdminLayout>} />
          <Route path="/admin/blog" element={<AdminLayout><BlogAdmin /></AdminLayout>} />
          <Route path="/admin/pages" element={<AdminLayout><Pages /></AdminLayout>} />
          <Route path="/admin/pedidos" element={<AdminLayout><OrdersEnhanced /></AdminLayout>} />
          <Route path="/admin/pedidos/:id" element={<AdminLayout><AdminOrderDetail /></AdminLayout>} />
          <Route path="/admin/pedidos/crear" element={<AdminLayout><CreateOrder /></AdminLayout>} />
          <Route path="/admin/cotizaciones" element={<AdminLayout><AdminQuotes /></AdminLayout>} />
          <Route path="/admin/cotizaciones/crear" element={<AdminLayout><CreateQuote /></AdminLayout>} />
          <Route path="/admin/cotizaciones/:id" element={<AdminLayout><QuoteDetail /></AdminLayout>} />
          <Route path="/admin/usuarios" element={<AdminLayout><Users /></AdminLayout>} />
          <Route path="/admin/materiales" element={<AdminLayout><Materials /></AdminLayout>} />
          <Route path="/admin/colores" element={<AdminLayout><Colors /></AdminLayout>} />
          <Route path="/admin/categorias" element={<AdminLayout><Categories /></AdminLayout>} />
          <Route path="/admin/productos" element={<AdminLayout><ProductsAdminEnhanced /></AdminLayout>} />
          <Route path="/admin/messages" element={<AdminLayout><Messages /></AdminLayout>} />
          <Route path="/admin/trash" element={<AdminLayout><Trash /></AdminLayout>} />
          <Route path="/admin/backup-config" element={<AdminLayout><BackupConfig /></AdminLayout>} />
          <Route path="/admin/estados" element={<AdminLayout><Statuses /></AdminLayout>} />
          <Route path="/admin/roles" element={<AdminLayout><RolesPermissions /></AdminLayout>} />
          <Route path="/admin/facturas" element={<AdminLayout><Invoices /></AdminLayout>} />
          <Route path="/admin/facturas/:id" element={<AdminLayout><InvoiceView /></AdminLayout>} />
          <Route path="/admin/configuracion-pagos" element={<AdminLayout><PaymentConfig /></AdminLayout>} />
          <Route path="/admin/configuracion-iva" element={<AdminLayout><TaxConfiguration /></AdminLayout>} />
          <Route path="/admin/gestion-envios" element={<AdminLayout><ShippingManagement /></AdminLayout>} />
          <Route path="/admin/contenido" element={<AdminLayout><ContentManagement /></AdminLayout>} />
          <Route path="/admin/personalizador" element={<AdminLayout><SiteCustomizer /></AdminLayout>} />
          <Route path="/admin/paginas-legales" element={<AdminLayout><LegalPages /></AdminLayout>} />
          <Route path="/admin/pin" element={<AdminLayout><PinManagement /></AdminLayout>} />
          <Route path="/admin/calculadora-3d" element={<AdminLayout><PrintingCalculatorSettings /></AdminLayout>} />
          <Route path="/admin/descuentos-cantidad" element={<AdminLayout><QuantityDiscounts /></AdminLayout>} />
          <Route path="/admin/calibracion" element={<AdminLayout><CalibrationSettings /></AdminLayout>} />
          <Route path="/admin/perfiles-calibracion" element={<AdminLayout><CalibrationProfiles /></AdminLayout>} />
          <Route path="/admin/precision-calculadora" element={<AdminLayout><CalculatorAccuracy /></AdminLayout>} />
          <Route path="/admin/deteccion-soportes" element={<AdminLayout><SupportDetectionSettings /></AdminLayout>} />
          <Route path="/admin/modelos-vista-previa" element={<AdminLayout><PreviewModels /></AdminLayout>} />
          <Route path="/admin/galeria" element={<AdminLayout><GalleryAdmin /></AdminLayout>} />
          <Route path="/admin/visitantes" element={<AdminLayout><VisitorAnalytics /></AdminLayout>} />
          <Route path="/admin/seo" element={<AdminLayout><SEOManager /></AdminLayout>} />
          <Route path="/admin/traducciones" element={<AdminLayout><TranslationManagement /></AdminLayout>} />
          
          {/* 404 route */}
          <Route path="*" element={<Layout><NotFound /></Layout>} />
        </Routes>
      </Suspense>
      <ClientChatWidget />
      <CookieConsent />
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
