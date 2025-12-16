import { ReactNode, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, Package, LogOut, UserCircle, ShoppingBag, MessageSquare, Settings, Menu, Home, Search, Gift } from "lucide-react";
import { useTranslation } from "react-i18next";
import NotificationBell from "./NotificationBell";
import { ClientChatWidget } from "./ClientChatWidget";
import { supabase } from "@/integrations/supabase/client";
import { FooterConfigurable } from "./FooterConfigurable";
import { LanguageSelector } from "./LanguageSelector";
import { logger } from "@/lib/logger";
import { useResponsiveSafe } from "@/contexts/ResponsiveContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { i18nToast } from "@/lib/i18nToast";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { t } = useTranslation(['navigation']);
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, isTablet } = useResponsiveSafe();
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "superadmin"]);
      
      setIsAdmin((data || []).length > 0);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    i18nToast.success("success.sessionClosed");
    navigate("/");
  };

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartCount(cart.length);
    };

    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    const interval = setInterval(updateCartCount, 2000);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      clearInterval(interval);
    };
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Compact on mobile */}
      <header 
        className="sticky top-0 z-40 w-full border-b backdrop-blur-lg supports-[backdrop-filter]:bg-background/80"
        style={{ 
          backgroundColor: 'var(--home-menu-bg, var(--header-bg, var(--navbar-bg, hsl(var(--background)))))',
          color: 'var(--home-menu-text, var(--header-text, inherit))'
        }}
      >
        <div className="w-full px-2 sm:px-4 md:container md:mx-auto md:px-6">
          {/* Force horizontal with flex-row and nowrap */}
          <div className="flex flex-row flex-nowrap h-12 sm:h-14 md:h-16 items-center justify-between gap-1 sm:gap-2">
            {/* Left side: Menu + Logo - Force row */}
            <div className="flex flex-row flex-nowrap items-center gap-1 sm:gap-2 flex-shrink-0 min-w-0">
              {/* Mobile Menu Button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 rounded-lg">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                  <SheetHeader className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="flex items-center gap-2 text-left">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                          <Package className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="text-base font-bold text-primary">Thuis3D.be</span>
                      </SheetTitle>
                    </div>
                  </SheetHeader>
                  <nav className="flex flex-col p-3 gap-1">
                    <Button
                      variant="ghost"
                      className="justify-start text-sm h-11 rounded-lg"
                      onClick={() => handleNavigate("/")}
                    >
                      <Home className="mr-2 h-4 w-4" />
                      {t('home')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-sm h-11 rounded-lg"
                      onClick={() => handleNavigate("/productos")}
                    >
                      <Package className="mr-2 h-4 w-4" />
                      {t('products')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-sm h-11 rounded-lg"
                      onClick={() => handleNavigate("/cotizaciones")}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      {t('quotes')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-sm h-11 rounded-lg"
                      onClick={() => handleNavigate("/tarjetas-regalo")}
                    >
                      <Gift className="mr-2 h-4 w-4" />
                      {t('giftCards')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-sm h-11 rounded-lg"
                      onClick={() => handleNavigate("/blog")}
                    >
                      {t('blog')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-sm h-11 rounded-lg"
                      onClick={() => handleNavigate("/galeria")}
                    >
                      {t('gallery')}
                    </Button>
                    
                    {user && (
                      <>
                        <div className="my-2 border-t border-border"></div>
                        <Button
                          variant="ghost"
                          className="justify-start text-sm h-11 rounded-lg"
                          onClick={() => handleNavigate("/mi-cuenta")}
                        >
                          <UserCircle className="mr-2 h-4 w-4" />
                          {t('myAccount')}
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            className="justify-start text-sm h-11 rounded-lg"
                            onClick={() => handleNavigate("/admin/dashboard")}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            {t('adminPanel')}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          className="justify-start text-sm h-11 rounded-lg text-destructive hover:text-destructive"
                          onClick={() => {
                            handleLogout();
                            setMobileMenuOpen(false);
                          }}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          {t('logout')}
                        </Button>
                      </>
                    )}
                    
                    {!user && (
                      <>
                        <div className="my-2 border-t border-border"></div>
                        <Button
                          variant="default"
                          className="justify-start text-sm h-11 rounded-lg"
                          onClick={() => handleNavigate("/auth")}
                        >
                          <User className="mr-2 h-4 w-4" />
                          {t('login')}
                        </Button>
                      </>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>

              {/* Logo */}
              <Link to="/" className="flex items-center gap-1.5 notranslate flex-shrink-0 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary-foreground" />
                </div>
                <span className="text-sm sm:text-base md:text-lg font-bold text-primary truncate max-w-[100px] sm:max-w-none">
                  Thuis3D.be
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-3 lg:gap-6">
              <Link to="/" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
                {t('home')}
              </Link>
              <Link to="/productos" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
                {t('products')}
              </Link>
              <Link to="/cotizaciones" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
                {t('quotes')}
              </Link>
              <Link to="/tarjetas-regalo" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
                {t('giftCards')}
              </Link>
              <Link to="/blog" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
                {t('blog')}
              </Link>
              <Link to="/galeria" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
                {t('gallery')}
              </Link>
            </nav>

            {/* Right side: Actions - Force horizontal row */}
            <div className="flex flex-row flex-nowrap items-center gap-0.5 sm:gap-1 flex-shrink-0">
              <LanguageSelector />
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-lg" 
                onClick={() => navigate("/carrito")}
              >
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-semibold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Button>
              
              {user && <NotificationBell />}
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg">
                      <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
                    <DropdownMenuLabel className="text-xs font-semibold px-2">{t('myAccount')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=profile")} className="text-sm h-10 rounded-lg">
                      <UserCircle className="mr-2 h-4 w-4" />
                      {t('myProfile')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=orders")} className="text-sm h-10 rounded-lg">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      {t('myOrders')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=messages")} className="text-sm h-10 rounded-lg">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {t('myMessages')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=invoices")} className="text-sm h-10 rounded-lg">
                      <Package className="mr-2 h-4 w-4" />
                      {t('myInvoices')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta")} className="font-semibold text-sm h-10 rounded-lg">
                      {t('viewAll')}
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin/dashboard")} className="text-sm h-10 rounded-lg">
                          <Settings className="mr-2 h-4 w-4" />
                          {t('adminPanel')}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-sm h-10 rounded-lg text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 hidden md:flex rounded-lg" onClick={() => navigate("/auth")}>
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Add padding bottom for mobile nav */}
      <main className={`flex-1 ${isMobile || isTablet ? 'pb-16' : 'pb-0'}`}>{children}</main>

      {/* Mobile Bottom Navigation - AliExpress style */}
      {(isMobile || isTablet) && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom">
          <div className="flex items-center justify-around h-14">
            <button 
              onClick={() => navigate("/")}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Home className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t('home')}</span>
            </button>
            
            <button 
              onClick={() => navigate("/productos")}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${isActive('/producto') ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Package className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t('products')}</span>
            </button>
            
            <button 
              onClick={() => navigate("/cotizaciones")}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${isActive('/cotizaciones') ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Search className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t('quotes')}</span>
            </button>
            
            <button 
              onClick={() => navigate("/carrito")}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors relative ${isActive('/carrito') ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] rounded-full h-3.5 w-3.5 flex items-center justify-center font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{t('cart', 'Carrito')}</span>
            </button>
            
            <button 
              onClick={() => navigate(user ? "/mi-cuenta" : "/auth")}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${isActive('/mi-cuenta') || isActive('/auth') ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <User className="h-5 w-5" />
              <span className="text-[10px] font-medium">{user ? t('account', 'Cuenta') : t('login')}</span>
            </button>
          </div>
        </nav>
      )}

      {/* Footer - Hidden on mobile for cleaner look */}
      {!isMobile && !isTablet && <FooterConfigurable />}
      
      {/* Client Chat Widget - for authenticated users */}
      {user && <ClientChatWidget />}
    </div>
  );
};
