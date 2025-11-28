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
    <div className="min-h-screen min-h-dvh flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <header 
        className="sticky top-0 z-40 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60"
        style={{ 
          backgroundColor: 'var(--home-menu-bg, var(--header-bg, var(--navbar-bg, hsl(var(--background)))))',
          color: 'var(--home-menu-text, var(--header-text, inherit))'
        }}
      >
        <div className="w-full max-w-full mx-auto px-2 sm:px-4">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[350px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-left">
                    <Package className="h-6 w-6 text-primary" />
                    <span className="text-xl font-bold text-primary">Thuis3D.be</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 mt-8">
                  <Button
                    variant="ghost"
                    className="justify-start text-base py-6 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleNavigate("/")}
                  >
                    {t('home')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-base py-6 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleNavigate("/productos")}
                  >
                    {t('products')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-base py-6 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleNavigate("/cotizaciones")}
                  >
                    {t('quotes')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-base py-6 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleNavigate("/tarjetas-regalo")}
                  >
                    {t('giftCards')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-base py-6 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleNavigate("/blog")}
                  >
                    {t('blog')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-base py-6 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleNavigate("/galeria")}
                  >
                    {t('gallery')}
                  </Button>
                  
                  {user && (
                    <>
                      <div className="my-4 border-t border-border"></div>
                      <Button
                        variant="ghost"
                        className="justify-start text-base py-6 hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleNavigate("/mi-cuenta")}
                      >
                        <UserCircle className="mr-2 h-5 w-5" />
                        {t('myAccount')}
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          className="justify-start text-base py-6 hover:bg-accent hover:text-accent-foreground"
                          onClick={() => handleNavigate("/admin/dashboard")}
                        >
                          <Settings className="mr-2 h-5 w-5" />
                          {t('adminPanel')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="justify-start text-base py-6 hover:bg-destructive/10 text-destructive hover:text-destructive"
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="mr-2 h-5 w-5" />
                        {t('logout')}
                      </Button>
                    </>
                  )}
                  
                  {!user && (
                    <>
                      <div className="my-4 border-t border-border"></div>
                      <Button
                        variant="default"
                        className="justify-start text-base py-6"
                        onClick={() => handleNavigate("/auth")}
                      >
                        <User className="mr-2 h-5 w-5" />
                        {t('login')}
                      </Button>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center gap-2 notranslate">
              <Package className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-primary">
                Thuis3D.be
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
                {t('home')}
              </Link>
              <Link to="/productos" className="text-sm font-medium hover:text-primary transition-colors">
                {t('products')}
              </Link>
              <Link to="/cotizaciones" className="text-sm font-medium hover:text-primary transition-colors">
                {t('quotes')}
              </Link>
              <Link to="/tarjetas-regalo" className="text-sm font-medium hover:text-primary transition-colors">
                {t('giftCards')}
              </Link>
              <Link to="/blog" className="text-sm font-medium hover:text-primary transition-colors">
                {t('blog')}
              </Link>
              <Link to="/galeria" className="text-sm font-medium hover:text-primary transition-colors">
                {t('gallery')}
              </Link>
            </nav>

            <div className="flex items-center gap-1 sm:gap-2">
              <LanguageSelector />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-9 w-9 sm:h-10 sm:w-10"
              >
                {theme === "dark" ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 sm:h-10 sm:w-10" onClick={() => navigate("/carrito")}>
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] sm:text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
              
              {user && <NotificationBell />}
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
                      <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>{t('myAccount')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=profile")}>
                      <UserCircle className="mr-2 h-4 w-4" />
                      {t('myAccount')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=orders")}>
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      {t('myOrders')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=messages")}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {t('myAccount')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta?tab=invoices")}>
                      <Package className="mr-2 h-4 w-4" />
                      Facturas
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta")} className="font-semibold">
                      Ver todo
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                          <Settings className="mr-2 h-4 w-4" />
                          {t('adminPanel')}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 hidden md:flex" onClick={() => navigate("/auth")}>
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">{children}</main>

      {/* Footer */}
      <Footer />
      
      {/* Client Chat Widget - for authenticated users */}
      {user && <ClientChatWidget />}
    </div>
  );
};
