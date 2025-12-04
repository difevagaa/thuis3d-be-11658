import { ReactNode, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, Moon, Sun, Package, LogOut, UserCircle, Menu, Search, MapPin } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import NotificationBell from "./NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSelector } from "./LanguageSelector";
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
import { Input } from "@/components/ui/input";
import { i18nToast } from "@/lib/i18nToast";

interface AmazonStyleHeaderProps {
  cartCount: number;
  user: any;
  isAdmin: boolean;
  onLogout: () => void;
}

export const AmazonStyleHeader = ({ cartCount, user, isAdmin, onLogout }: AmazonStyleHeaderProps) => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation(['navigation']);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/productos?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full shadow-md">
      {/* Top header bar - Amazon style dark blue */}
      <div className="bg-[#131921] text-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Left section - Logo */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-10 w-10">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Package className="h-6 w-6 text-primary" />
                      <span className="text-xl font-bold">Thuis3D.be</span>
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-2 mt-8">
                    <Button
                      variant="ghost"
                      className="justify-start text-base py-6"
                      onClick={() => handleNavigate("/")}
                    >
                      {t('home')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-base py-6"
                      onClick={() => handleNavigate("/productos")}
                    >
                      {t('products')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-base py-6"
                      onClick={() => handleNavigate("/cotizaciones")}
                    >
                      {t('quotes')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-base py-6"
                      onClick={() => handleNavigate("/tarjetas-regalo")}
                    >
                      {t('giftCards')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-base py-6"
                      onClick={() => handleNavigate("/blog")}
                    >
                      {t('blog')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-base py-6"
                      onClick={() => handleNavigate("/galeria")}
                    >
                      {t('gallery')}
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>

              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Package className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold hidden sm:block">Thuis3D.be</span>
              </Link>
            </div>

            {/* Center section - Search bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-4 hidden md:block">
              <div className="relative flex">
                <Input
                  type="search"
                  placeholder={t('searchProducts', { defaultValue: 'Search products...' })}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-r-none border-primary/50 focus-visible:ring-primary h-10 bg-white text-foreground"
                />
                <Button 
                  type="submit"
                  className="rounded-l-none bg-primary hover:bg-primary/90 px-4"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>

            {/* Right section - User actions */}
            <div className="flex items-center gap-2">
              <LanguageSelector />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-white hover:bg-white/10 h-10 w-10"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>

              {user && <NotificationBell />}

              {/* User Menu */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-white hover:bg-white/10 px-2 h-10">
                      <div className="flex flex-col items-start text-xs">
                        <span className="text-white/80">Hello, {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}</span>
                        <span className="font-bold">Account & Lists</span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/mi-cuenta")}>
                      <UserCircle className="mr-2 h-4 w-4" />
                      {t('myAccount')}
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                        <Package className="mr-2 h-4 w-4" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => navigate("/auth")}
                  className="text-white hover:bg-white/10 px-2 h-10"
                >
                  <div className="flex flex-col items-start text-xs">
                    <span className="text-white/80">Hello, Sign in</span>
                    <span className="font-bold">Account & Lists</span>
                  </div>
                </Button>
              )}

              {/* Cart */}
              <Button
                variant="ghost"
                onClick={() => navigate("/carrito")}
                className="text-white hover:bg-white/10 relative h-10 px-3"
              >
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
                <span className="ml-2 hidden sm:inline font-bold">Cart</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation bar - Amazon style */}
      <div className="bg-[#232F3E] text-white hidden lg:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-6 h-10 text-sm">
            <Link to="/productos" className="hover:bg-white/10 px-3 py-2 rounded transition-colors font-medium">
              All Products
            </Link>
            <Link to="/cotizaciones" className="hover:bg-white/10 px-3 py-2 rounded transition-colors">
              Custom Quotes
            </Link>
            <Link to="/tarjetas-regalo" className="hover:bg-white/10 px-3 py-2 rounded transition-colors">
              Gift Cards
            </Link>
            <Link to="/blog" className="hover:bg-white/10 px-3 py-2 rounded transition-colors">
              Blog
            </Link>
            <Link to="/galeria" className="hover:bg-white/10 px-3 py-2 rounded transition-colors">
              Gallery
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden bg-[#131921] px-4 pb-3">
        <form onSubmit={handleSearch} className="relative flex">
          <Input
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-r-none border-primary/50 h-10 bg-white text-foreground"
          />
          <Button 
            type="submit"
            className="rounded-l-none bg-primary hover:bg-primary/90 px-4"
          >
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
};
