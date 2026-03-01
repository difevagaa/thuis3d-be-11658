import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ResponsiveProvider } from "@/contexts/ResponsiveContext";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import { useGlobalColors } from "@/hooks/useGlobalColors";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";

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
const CardPaymentPage = lazy(() => import("./pages/CardPaymentPage"));
const RevolutPaymentPage = lazy(() => import("./pages/RevolutPaymentPage"));
const PaymentProcessing = lazy(() => import("./pages/PaymentProcessing"));
const Page = lazy(() => import("./pages/Page"));
const StaticPage = lazy(() => import("./pages/StaticPage"));
const ShippingInfo = lazy(() => import("./pages/ShippingInfo"));
const PaymentSummary = lazy(() => import("./pages/PaymentSummary"));
const Payment = lazy(() => import("./pages/Payment"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const Lithophany = lazy(() => import("./pages/Lithophany"));

// Components loaded immediately
import CookieConsent from "./components/CookieConsent";
import ScrollToTop from "./components/ScrollToTop";
import NotFound from "./pages/NotFound";
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
const PageBuilder = lazy(() => import("./pages/admin/PageBuilder"));
const EmailManagement = lazy(() => import("./pages/admin/EmailManagement"));
const DatabaseAdmin = lazy(() => import("./pages/admin/DatabaseAdmin"));


// Public pages that need to stay eager
import Gallery from "./pages/Gallery";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const App = () => {
  // Load and apply global colors on app start
  useGlobalColors();
  // Track visitor activity
  useVisitorTracking();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
        <ResponsiveProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ErrorBoundary>
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
            <Route path="/pago-tarjeta" element={<Layout><CardPaymentPage /></Layout>} />
            <Route path="/pago-revolut" element={<Layout><RevolutPaymentPage /></Layout>} />
            <Route path="/pago-en-proceso" element={<Layout><PaymentProcessing /></Layout>} />
            <Route path="/informacion-envio" element={<Layout><ShippingInfo /></Layout>} />
            <Route path="/resumen-pago" element={<Layout><PaymentSummary /></Layout>} />
            <Route path="/pago" element={<Layout><Payment /></Layout>} />
            <Route path="/page/:slug" element={<Layout><StaticPage /></Layout>} />
            <Route path="/litofanias" element={<Layout><Lithophany /></Layout>} />
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
            <Route path="/admin/page-builder" element={<AdminLayout><PageBuilder /></AdminLayout>} />
            <Route path="/admin/emails" element={<AdminLayout><EmailManagement /></AdminLayout>} />
            <Route path="/admin/database" element={<AdminLayout><DatabaseAdmin /></AdminLayout>} />
            
            
            {/* 404 route */}
            <Route path="*" element={<Layout><NotFound /></Layout>} />
          </Routes>
            </Suspense>
            <CookieConsent />
              </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
        </ResponsiveProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
