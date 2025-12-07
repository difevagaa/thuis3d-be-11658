import { ReactNode, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, Moon, Sun, Package, LogOut, UserCircle, ShoppingBag, MessageSquare, Award, Settings, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import NotificationBell from "./NotificationBell";
import { ClientChatWidget } from "./ClientChatWidget";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "./Footer";
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
import { toast } from "sonner";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { theme, setTheme } = useTheme();
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
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      setIsAdmin(!!data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada exitosamente");
    navigate("/");
  };

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartCount(cart.length);
    };
    
    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    
    const interval = setInterval(updateCartCount, 500);
    
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
      {/* Header */}
      <header 
        className="sticky top-0 z-40 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60"
        style={{ 
          backgroundColor: 'var(--home-menu-bg, var(--header-bg, var(--navbar-bg, hsl(var(--background)))))',
          color: 'var(--home-menu-text, var(--header-text, inherit))'
        }}
      >
        <div className="container mx-auto px-2 sm:px-3 md:px-4">
          <div className="flex h-12 sm:h-14 md:h-16 items-center justify-between">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0">
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] xs:w-[280px] sm:w-[350px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-left">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                    <span className="text-lg sm:text-xl font-bold text-primary truncate">Thuis3D.be</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-0.5 sm:gap-1 mt-6 sm:mt-8">
                  <Button
                    variant="ghost"
                    className="justify-start text-sm sm:text-base py-4 sm:py-6 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleNavigate("/")}
                  >
                    {t('home')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-sm sm:text-base py-4 sm:py-6 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleNavigate("/productos")}
                  >
                    {t('products')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-sm sm:text-base py-4 sm:py-6 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleNavigate("/cotizaciones")}
                  >
                    {t('quotes')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-sm sm:text-base py-4 sm:py-6 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleNavigate("/tarjetas-regalo")}
                  >
                    {t('giftCards')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-sm sm:text-base py-4 sm:py-6 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleNavigate("/blog")}
                  >
                    {t('blog')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-sm sm:text-base py-4 sm:py-6 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleNavigate("/galeria")}
                  >
                    {t('gallery')}
                  </Button>
                  
                  {user && (
                    <>
                      <div className="my-3 sm:my-4 border-t border-border"></div>
                      <Button
                        variant="ghost"
                        className="justify-start text-sm sm:text-base py-4 sm:py-6 hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleNavigate("/mi-cuenta")}
                      >
                        <UserCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        {t('myAccount')}
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          className="justify-start text-sm sm:text-base py-4 sm:py-6 hover:bg-accent hover:text-accent-foreground"
                          onClick={() => handleNavigate("/admin/dashboard")}
                        >
                          <Settings className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                          {t('adminPanel')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="justify-start text-sm sm:text-base py-4 sm:py-6 hover:bg-destructive/10 text-destructive hover:text-destructive"
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        {t('logout')}
                      </Button>
                    </>
                  )}
                  
                  {!user && (
                    <>
                      <div className="my-3 sm:my-4 border-t border-border"></div>
                      <Button
                        variant="default"
                        className="justify-start text-sm sm:text-base py-4 sm:py-6"
                        onClick={() => handleNavigate("/auth")}
                      >
                        <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        {t('login')}
                      </Button>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center gap-1 sm:gap-2 notranslate min-w-0 flex-1 sm:flex-initial">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              <span className="text-base sm:text-lg md:text-xl font-bold text-primary truncate">
                Thuis3D.be
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-3 lg:gap-6">
              <Link to="/" className="text-xs lg:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
                {t('home')}
              </Link>
              <Link to="/productos" className="text-xs lg:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
                {t('products')}
              </Link>
              <Link to="/cotizaciones" className="text-xs lg:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
                {t('quotes')}
              </Link>
              <Link to="/tarjetas-regalo" className="text-xs lg:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
                {t('giftCards')}
              </Link>
              <Link to="/blog" className="text-xs lg:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
                {t('blog')}
              </Link>
              <Link to="/galeria" className="text-xs lg:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
                {t('gallery')}
              </Link>
            </nav>

            <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0">
              <LanguageSelector />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10"
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10" onClick={() => navigate("/carrito")}>
                <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-primary text-primary-foreground text-[9px] sm:text-[10px] md:text-xs rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 flex items-center justify-center font-medium">
                    {cartCount}
                  </span>
                )}
              </Button>
              
              {user && <NotificationBell />}
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10">
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 sm:w-56">
                    <DropdownMenuLabel className="text-xs sm:text-sm">{t('myAccount')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=profile")} className="text-xs sm:text-sm">
                      <UserCircle className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {t('myProfile')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=orders")} className="text-xs sm:text-sm">
                      <ShoppingBag className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {t('myOrders')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=messages")} className="text-xs sm:text-sm">
                      <MessageSquare className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {t('myMessages')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=invoices")} className="text-xs sm:text-sm">
                      <Package className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {t('myInvoices')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta")} className="font-semibold text-xs sm:text-sm">
                      {t('viewAll')}
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin/dashboard")} className="text-xs sm:text-sm">
                          <Settings className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          {t('adminPanel')}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-xs sm:text-sm">
                      <LogOut className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 hidden md:flex" onClick={() => navigate("/auth")}>
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <Footer />
      
      {/* Client Chat Widget - for authenticated users */}
      {user && <ClientChatWidget />}
    </div>
  );
};
