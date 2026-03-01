import { ReactNode, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, Package, LogOut, UserCircle, ShoppingBag, MessageSquare, Settings, Menu, Home, Search, Gift } from "lucide-react";
import { useTranslation } from "react-i18next";
import NotificationBell from "./NotificationBell";
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
      {/* Header - Full width background, pinned to top with no gap */}
      <header 
        className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80"
        style={{ 
          backgroundColor: 'var(--home-menu-bg, var(--header-bg, hsl(var(--background))))',
          color: 'var(--home-menu-text, var(--header-text, inherit))'
        }}
      >
        {/* Centered container for header content */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Compact header row - consistent height */}
          <div className="flex flex-row flex-nowrap h-14 items-center justify-between gap-2 sm:gap-3">
            {/* Left side: Menu + Logo - Compact */}
            <div className="flex flex-row flex-nowrap items-center gap-2 flex-shrink-0 min-w-0">
              {/* Mobile Menu Button - Smaller on mobile */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 rounded-md">
                    <Menu className="h-4 w-4" />
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

              {/* Logo - Consistent sizing */}
              <Link to="/" className="flex items-center gap-1.5 notranslate flex-shrink-0 min-w-0">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-sm sm:text-base font-bold text-primary truncate max-w-[100px] sm:max-w-none">
                  Thuis3D.be
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {[
                { path: '/', label: t('home') },
                { path: '/productos', label: t('products') },
                { path: '/cotizaciones', label: t('quotes') },
                { path: '/tarjetas-regalo', label: t('giftCards') },
                { path: '/blog', label: t('blog') },
                { path: '/galeria', label: t('gallery') },
              ].map(({ path, label }) => (
                <Link 
                  key={path} 
                  to={path} 
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap ${
                    isActive(path) 
                      ? 'text-primary bg-primary/10 font-semibold' 
                      : 'hover:text-primary hover:bg-accent/50'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right side: Actions - Standardized 24px icons with consistent button sizes */}
            <div className="flex flex-row flex-nowrap items-center gap-1 flex-shrink-0">
              <LanguageSelector />
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-9 w-9 rounded-lg hover:bg-accent" 
                onClick={() => navigate("/carrito")}
              >
                <ShoppingCart className="h-5 w-5" />
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
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-accent">
                      <User className="h-5 w-5" />
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
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-accent" onClick={() => navigate("/auth")}>
                  <User className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Centered container with max-width */}
      <main className={`flex-1 w-full ${isMobile || isTablet ? 'pb-20' : 'pb-0'}`}>
        {children}
      </main>

      {/* Mobile Bottom Navigation - AliExpress style */}
      {(isMobile || isTablet) && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t safe-area-bottom shadow-lg">
          <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
            {[
              { path: '/', icon: Home, label: t('home'), matchPath: '/' },
              { path: '/productos', icon: Package, label: t('products'), matchPath: '/producto' },
              { path: '/cotizaciones', icon: Search, label: t('quotes'), matchPath: '/cotizaciones' },
              { path: '/carrito', icon: ShoppingCart, label: t('cart', 'Cart'), matchPath: '/carrito', badge: cartCount },
              { path: user ? '/mi-cuenta' : '/auth', icon: User, label: user ? t('myAccount') : t('login'), matchPath: user ? '/mi-cuenta' : '/auth' },
            ].map(({ path, icon: Icon, label, matchPath, badge }) => {
              const active = isActive(matchPath);
              return (
                <button 
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 relative ${active ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                  )}
                  <div className="relative">
                    <Icon className={`h-5 w-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`} />
                    {badge != null && badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] rounded-full h-3.5 w-3.5 flex items-center justify-center font-bold">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Footer - Hidden on mobile for cleaner look */}
      {!isMobile && !isTablet && <FooterConfigurable />}
    </div>
  );
};
