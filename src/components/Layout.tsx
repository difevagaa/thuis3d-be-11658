import { ReactNode, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { i18nToast } from "@/lib/i18nToast";
interface LayoutProps {
  children: ReactNode;
}
export const Layout = ({
  children
}: LayoutProps) => {
  const {
    t
  } = useTranslation(['navigation']);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isMobile,
    isTablet
  } = useResponsiveSafe();
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    checkUser();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const {
        data
      } = await supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "superadmin"]);
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
  return <div className="min-h-screen flex flex-col">
      {/* Header - Apple-style frosted glass navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/20 backdrop-blur-2xl backdrop-saturate-[1.8]" style={{
      backgroundColor: 'var(--home-menu-bg, var(--header-bg, rgba(255,255,255,0.78)))',
      color: 'var(--home-menu-text, var(--header-text, inherit))'
    }}>
        {/* Centered container for header content */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header row */}
          <div className="flex flex-row flex-nowrap h-14 items-center justify-between gap-2 sm:gap-4">
            {/* Left side: Menu + Logo */}
            <div className="flex flex-row flex-nowrap items-center gap-2.5 flex-shrink-0 min-w-0">
              {/* Mobile Menu Button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 rounded-xl hover:bg-accent/60 transition-colors">
                    <Menu className="h-[18px] w-[18px]" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0 rounded-r-3xl border-r-0 shadow-strong">
                  <SheetHeader className="p-5 border-b border-border/30">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="flex items-center gap-3 text-left">
                        <div className="w-10 h-10 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-md">
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-base font-bold text-foreground tracking-tight">Thuis3D.be</span>
                      </SheetTitle>
                    </div>
                  </SheetHeader>
                  <nav className="flex flex-col p-3 gap-0.5">
                    <Button variant="ghost" className="justify-start text-sm h-12 rounded-xl font-medium" onClick={() => handleNavigate("/")}>
                      <Home className="mr-3 h-4 w-4 opacity-70" />
                      {t('home')}
                    </Button>
                    <Button variant="ghost" className="justify-start text-sm h-12 rounded-xl font-medium" onClick={() => handleNavigate("/productos")}>
                      <Package className="mr-3 h-4 w-4 opacity-70" />
                      {t('products')}
                    </Button>
                    <Button variant="ghost" className="justify-start text-sm h-12 rounded-xl font-medium" onClick={() => handleNavigate("/cotizaciones")}>
                      <Search className="mr-3 h-4 w-4 opacity-70" />
                      {t('quotes')}
                    </Button>
                    <Button variant="ghost" className="justify-start text-sm h-12 rounded-xl font-medium" onClick={() => handleNavigate("/tarjetas-regalo")}>
                      <Gift className="mr-3 h-4 w-4 opacity-70" />
                      {t('giftCards')}
                    </Button>
                    <Button variant="ghost" className="justify-start text-sm h-12 rounded-xl font-medium" onClick={() => handleNavigate("/blog")}>
                      {t('blog')}
                    </Button>
                    <Button variant="ghost" className="justify-start text-sm h-12 rounded-xl font-medium" onClick={() => handleNavigate("/galeria")}>
                      {t('gallery')}
                    </Button>
                    
                    {user && <>
                        <div className="my-2 border-t border-border/30"></div>
                        <Button variant="ghost" className="justify-start text-sm h-12 rounded-xl font-medium" onClick={() => handleNavigate("/mi-cuenta")}>
                          <UserCircle className="mr-3 h-4 w-4 opacity-70" />
                          {t('myAccount')}
                        </Button>
                        {isAdmin && <Button variant="ghost" className="justify-start text-sm h-12 rounded-xl font-medium" onClick={() => handleNavigate("/admin/dashboard")}>
                            <Settings className="mr-3 h-4 w-4 opacity-70" />
                            {t('adminPanel')}
                          </Button>}
                        <Button variant="ghost" className="justify-start text-sm h-12 rounded-xl font-medium text-destructive hover:text-destructive" onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}>
                          <LogOut className="mr-3 h-4 w-4 opacity-70" />
                          {t('logout')}
                        </Button>
                      </>}
                    
                    {!user && <>
                        <div className="my-2 border-t border-border/30"></div>
                        <Button variant="default" className="justify-start text-sm h-12 rounded-xl font-medium" onClick={() => handleNavigate("/auth")}>
                          <User className="mr-3 h-4 w-4" />
                          {t('login')}
                        </Button>
                      </>}
                  </nav>
                </SheetContent>
              </Sheet>

              {/* Logo */}
              <Link to="/" className="flex items-center gap-2.5 notranslate flex-shrink-0 min-w-0 group">
                <div className="w-9 h-9 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm sm:text-base font-bold text-foreground truncate max-w-[100px] sm:max-w-none tracking-tight">
                  Thuis3D.be
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-0.5 mx-[5px]">
              {[{
              to: "/",
              label: t('home')
            }, {
              to: "/productos",
              label: t('products')
            }, {
              to: "/cotizaciones",
              label: t('quotes')
            }, {
              to: "/tarjetas-regalo",
              label: t('giftCards')
            }, {
              to: "/blog",
              label: t('blog')
            }, {
              to: "/galeria",
              label: t('gallery')
            }].map(({
              to,
              label
            }) => <Link key={to} to={to} className={cn("text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all duration-200 whitespace-nowrap", isActive(to) ? "text-primary bg-primary/8 font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent/60")}>
                  {label}
                </Link>)}
            </nav>

            {/* Right side: Actions */}
            <div className="flex flex-row flex-nowrap items-center gap-0.5 flex-shrink-0">
              <LanguageSelector />
              
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl hover:bg-accent/60 transition-colors" onClick={() => navigate("/carrito")}>
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] rounded-full h-[18px] w-[18px] flex items-center justify-center font-bold shadow-sm">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>}
              </Button>
              
              {user && <NotificationBell />}
              
              {user ? <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-accent/60 transition-colors">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-strong border-border/30">
                    <DropdownMenuLabel className="text-xs font-semibold px-2 text-muted-foreground">{t('myAccount')}</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border/30" />
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=profile")} className="text-sm h-10 rounded-xl">
                      <UserCircle className="mr-2.5 h-4 w-4 opacity-70" />
                      {t('myProfile')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=orders")} className="text-sm h-10 rounded-xl">
                      <ShoppingBag className="mr-2.5 h-4 w-4 opacity-70" />
                      {t('myOrders')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=messages")} className="text-sm h-10 rounded-xl">
                      <MessageSquare className="mr-2.5 h-4 w-4 opacity-70" />
                      {t('myMessages')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=invoices")} className="text-sm h-10 rounded-xl">
                      <Package className="mr-2.5 h-4 w-4 opacity-70" />
                      {t('myInvoices')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/30" />
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta")} className="font-semibold text-sm h-10 rounded-xl">
                      {t('viewAll')}
                    </DropdownMenuItem>
                    {isAdmin && <>
                        <DropdownMenuSeparator className="bg-border/30" />
                        <DropdownMenuItem onClick={() => navigate("/admin/dashboard")} className="text-sm h-10 rounded-xl">
                          <Settings className="mr-2.5 h-4 w-4 opacity-70" />
                          {t('adminPanel')}
                        </DropdownMenuItem>
                      </>}
                    <DropdownMenuSeparator className="bg-border/30" />
                    <DropdownMenuItem onClick={handleLogout} className="text-sm h-10 rounded-xl text-destructive">
                      <LogOut className="mr-2.5 h-4 w-4 opacity-70" />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu> : <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-accent/60 transition-colors" onClick={() => navigate("/auth")}>
                  <User className="h-5 w-5" />
                </Button>}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 w-full ${isMobile || isTablet ? 'pb-20' : 'pb-0'}`}>
        {children}
      </main>

      {/* Mobile Bottom Navigation - Apple-style tab bar */}
      {(isMobile || isTablet) && <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl backdrop-saturate-[1.8] border-t border-border/20 safe-area-bottom" style={{
      backgroundColor: 'var(--home-menu-bg, rgba(255,255,255,0.78))'
    }}>
          <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
            <button onClick={() => navigate("/")} className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`}>
              <Home className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{t('home')}</span>
            </button>
            
            <button onClick={() => navigate("/productos")} className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 ${isActive('/producto') ? 'text-primary' : 'text-muted-foreground'}`}>
              <Package className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{t('products')}</span>
            </button>
            
            <button onClick={() => navigate("/cotizaciones")} className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 ${isActive('/cotizaciones') ? 'text-primary' : 'text-muted-foreground'}`}>
              <Search className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{t('quotes')}</span>
            </button>
            
            <button onClick={() => navigate("/carrito")} className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 relative ${isActive('/carrito') ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] rounded-full h-3.5 w-3.5 flex items-center justify-center font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>}
              </div>
              <span className="text-[10px] font-semibold">{t('cart', 'Carrito')}</span>
            </button>
            
            <button onClick={() => navigate(user ? "/mi-cuenta" : "/auth")} className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 ${isActive('/mi-cuenta') || isActive('/auth') ? 'text-primary' : 'text-muted-foreground'}`}>
              <User className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{user ? t('account', 'Cuenta') : t('login')}</span>
            </button>
          </div>
        </nav>}

      {/* Footer */}
      {!isMobile && !isTablet && <FooterConfigurable />}
    </div>;
};