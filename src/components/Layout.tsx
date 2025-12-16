import { ReactNode, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, Package, LogOut, UserCircle, ShoppingBag, MessageSquare, Settings, Menu } from "lucide-react";

import { useTranslation } from "react-i18next";
import NotificationBell from "./NotificationBell";
import { ClientChatWidget } from "./ClientChatWidget";
import { supabase } from "@/integrations/supabase/client";
import { FooterConfigurable } from "./FooterConfigurable";
import { LanguageSelector } from "./LanguageSelector";
import { logger } from "@/lib/logger";
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
      // Check for admin OR superadmin roles
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

    // Reduce render pressure: polling every 500ms was causing constant re-renders
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - App-like on mobile */}
      <header 
        className="sticky top-0 z-40 w-full border-b backdrop-blur-lg supports-[backdrop-filter]:bg-background/80"
        style={{ 
          backgroundColor: 'var(--home-menu-bg, var(--header-bg, var(--navbar-bg, hsl(var(--background)))))',
          color: 'var(--home-menu-text, var(--header-text, inherit))'
        }}
      >
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            {/* Left side: Menu + Logo */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Mobile Menu Button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[40px] min-w-[40px] touch-manipulation flex-shrink-0 rounded-lg hover:bg-white/10">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0">
                  <SheetHeader className="p-6 border-b">
                    <SheetTitle className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                        <Package className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <span className="text-xl font-bold text-primary">Thuis3D.be</span>
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col p-4 gap-2">
                    <Button
                      variant="ghost"
                      className="justify-start text-base h-14 rounded-xl hover:bg-muted transition-all active:scale-[0.98]"
                      onClick={() => handleNavigate("/")}
                    >
                      {t('home')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-base h-14 rounded-xl hover:bg-muted transition-all active:scale-[0.98]"
                      onClick={() => handleNavigate("/productos")}
                    >
                      {t('products')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-base h-14 rounded-xl hover:bg-muted transition-all active:scale-[0.98]"
                      onClick={() => handleNavigate("/cotizaciones")}
                    >
                      {t('quotes')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-base h-14 rounded-xl hover:bg-muted transition-all active:scale-[0.98]"
                      onClick={() => handleNavigate("/tarjetas-regalo")}
                    >
                      {t('giftCards')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-base h-14 rounded-xl hover:bg-muted transition-all active:scale-[0.98]"
                      onClick={() => handleNavigate("/blog")}
                    >
                      {t('blog')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-base h-14 rounded-xl hover:bg-muted transition-all active:scale-[0.98]"
                      onClick={() => handleNavigate("/galeria")}
                    >
                      {t('gallery')}
                    </Button>
                    
                    {user && (
                      <>
                        <div className="my-4 border-t border-border"></div>
                        <Button
                          variant="ghost"
                          className="justify-start text-base h-14 rounded-xl hover:bg-muted transition-all active:scale-[0.98]"
                          onClick={() => handleNavigate("/mi-cuenta")}
                        >
                          <UserCircle className="mr-3 h-5 w-5 flex-shrink-0" />
                          {t('myAccount')}
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            className="justify-start text-base h-14 rounded-xl hover:bg-muted transition-all active:scale-[0.98]"
                            onClick={() => handleNavigate("/admin/dashboard")}
                          >
                            <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
                            {t('adminPanel')}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          className="justify-start text-base h-14 rounded-xl hover:bg-destructive/10 text-destructive hover:text-destructive transition-all active:scale-[0.98]"
                          onClick={() => {
                            handleLogout();
                            setMobileMenuOpen(false);
                          }}
                        >
                          <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
                          {t('logout')}
                        </Button>
                      </>
                    )}
                    
                    {!user && (
                      <>
                        <div className="my-4 border-t border-border"></div>
                        <Button
                          variant="default"
                          className="justify-start text-base h-14 rounded-xl transition-all active:scale-[0.98]"
                          onClick={() => handleNavigate("/auth")}
                        >
                          <User className="mr-3 h-5 w-5 flex-shrink-0" />
                          {t('login')}
                        </Button>
                      </>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>

              {/* Logo */}
              <Link to="/" className="flex items-center gap-1.5 sm:gap-2 notranslate flex-shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Package className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary-foreground" />
                </div>
                <span className="text-sm sm:text-base md:text-xl font-bold text-primary whitespace-nowrap">
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

            {/* Right side: Language + Cart + User */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <LanguageSelector />
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-10 w-10 sm:h-12 sm:w-12 min-h-[40px] min-w-[40px] touch-manipulation rounded-lg sm:rounded-xl hover:bg-white/10 transition-all active:scale-95" 
                onClick={() => navigate("/carrito")}
              >
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-semibold shadow-lg text-[10px] sm:text-xs">
                    {cartCount}
                  </span>
                )}
              </Button>
              
              {user && <NotificationBell />}
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 min-h-[40px] min-w-[40px] touch-manipulation rounded-lg sm:rounded-xl hover:bg-white/10 transition-all active:scale-95">
                      <User className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                    <DropdownMenuLabel className="text-sm font-semibold">{t('myAccount')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=profile")} className="text-sm h-11 rounded-lg">
                      <UserCircle className="mr-3 h-5 w-5" />
                      {t('myProfile')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=orders")} className="text-sm h-11 rounded-lg">
                      <ShoppingBag className="mr-3 h-5 w-5" />
                      {t('myOrders')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=messages")} className="text-sm h-11 rounded-lg">
                      <MessageSquare className="mr-3 h-5 w-5" />
                      {t('myMessages')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=invoices")} className="text-sm h-11 rounded-lg">
                      <Package className="mr-3 h-5 w-5" />
                      {t('myInvoices')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta")} className="font-semibold text-sm h-11 rounded-lg">
                      {t('viewAll')}
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin/dashboard")} className="text-sm h-11 rounded-lg">
                          <Settings className="mr-3 h-5 w-5" />
                          {t('adminPanel')}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-sm h-11 rounded-lg text-destructive">
                      <LogOut className="mr-3 h-5 w-5" />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 min-h-[40px] min-w-[40px] touch-manipulation hidden md:flex rounded-lg sm:rounded-xl hover:bg-white/10" onClick={() => navigate("/auth")}>
                  <User className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - with app-like padding */}
      <main className="flex-1 app-page-content">{children}</main>

      {/* Footer */}
      <FooterConfigurable />
      
      {/* Client Chat Widget - for authenticated users */}
      {user && <ClientChatWidget />}
    </div>
  );
};
