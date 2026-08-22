import { Link, useLocation } from "wouter";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useCartContext } from "@/context/CartContext";
import { 
  LogOut, 
  LayoutDashboard, 
  ShoppingBag, 
  Settings, 
  ShieldCheck,
  Menu,
  X,
  MessageCircle,
  MessageSquare,
  Users,
  Bell,
  Eye,
  Clock,
  Moon,
  Sun
} from "lucide-react";
import { useEffect } from "react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { data: user } = useUser();
  const { data: cart = [] } = useCart();
  const { cartItems } = useCartContext();
  const { mutate: logout } = useLogout();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? resolvedTheme : theme;

  // If no user (and not loading), we assume the page might redirect or show restricted view
  // But purely for layout, if no user, render children directly (e.g. auth pages)
  if (!user) return <>{children}</>;

  const totalContextItems = cartItems.length;  // Each context item is 1 added package
  const cartCount = (cart.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 0) + totalContextItems;

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = location === href;
    return (
      <Link href={href}>
        <div 
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer mb-1",
            isActive 
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <Icon className="w-5 h-5" />
          <span className="font-medium">{label}</span>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header: project name only */}
      <div className="md:hidden bg-card border-b border-border p-4 sticky top-0 z-50">
        <h1 className="text-xl font-bold font-display text-primary">EwuraDataHub</h1>
      </div>

      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-40 h-screen w-56 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8">
          <h1 className="text-2xl font-bold font-display text-primary tracking-tight">
            Allen<span className="text-accent">Data</span>Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">PREMIUM DATA SERVICES</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <NavItem href="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/buy-data" icon={ShoppingBag} label="Buy Data" />
          
          {user.role === 'admin' && (
            <>
              <div className="px-4 pt-6 pb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Administration</p>
              </div>
              <NavItem href="/admin" icon={ShieldCheck} label="Admin Portal" />
            </>
          )}

          {user.role === 'agent' && (
            <div className="mt-8 mx-4 p-4 rounded-xl bg-accent/10 border border-accent/20">
              <p className="text-xs font-bold text-accent-foreground mb-1">Agent Status</p>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", user.isVerified ? "bg-green-500" : "bg-yellow-500")} />
                <span className="text-sm font-medium">{user.isVerified ? "Verified" : "Pending"}</span>
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-border bg-muted/50">
          <div className="flex items-center gap-3 px-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {(user.username || user.fullName || 'U').substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-sm truncate">{user.username || user.fullName || 'User'}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden min-h-screen">
        <div className="w-full bg-card border-b border-border">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 flex items-center justify-between gap-4">
            {/* Left: Menu button (mobile only) */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              aria-label="Menu"
              className="md:hidden p-2 rounded-md hover:bg-muted/50"
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>

            <div className="flex-1" />

            {/* Top right: Cart + User menu */}
            <div className="flex items-center gap-4 ml-auto">
              <button
                onClick={() => setTheme(activeTheme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
                className="p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                {activeTheme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link href="/cart">
                <button aria-label="Cart" className="relative p-2 rounded-md hover:bg-muted/50">
                  <ShoppingBag className="w-6 h-6" />
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                      {cartCount}
                    </span>
                  )}
                </button>
              </Link>
              <div className="relative flex items-center gap-2">
                {/* Notification bell for agents */}
                {user.role === 'agent' && <BellNotifications />}

                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu((s) => !s)}
                    className="flex items-center gap-2 p-1 rounded-md"
                    aria-label="User menu"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                      {(user.username || user.fullName || 'U').substring(0, 2).toUpperCase()}
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-40 bg-card border border-border rounded-md shadow-md z-50">
                        <Link href="/profile">
                          <div className="px-4 py-2 hover:bg-muted/50">Profile</div>
                        </Link>
                        <div
                          className="px-4 py-2 hover:bg-muted/50 cursor-pointer"
                          onClick={() => logout()}
                        >
                          Logout
                        </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12 animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* Floating chat CTA (small icon with popup) */}
      <FloatingChat />

      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

function BellNotifications() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { fetchWithAuth } = await import('@/lib/fetchWithAuth');
        const res = await fetchWithAuth('/api/notifications');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setNotes(data || []);
      } catch (e) {
        console.error('[Notifications] load failed', e);
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const unread = notes.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button onClick={() => setOpen(s => !s)} className="p-2 rounded-md hover:bg-gray-100 relative">
        <Bell className="w-5 h-5" />
        {unread > 0 && <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-600 rounded-full -translate-y-1/2 translate-x-1/2">{unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-md shadow-md z-50">
          <div className="p-3 border-b">
            <div className="font-semibold">Notifications</div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {notes.length === 0 && <div className="p-3 text-sm text-muted-foreground">No notifications</div>}
            {notes.map((n) => (
              <div key={n.id} className="p-3 hover:bg-gray-50 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">!</div>
                <div className="flex-1">
                  <div className="text-sm">{n.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {!n.read && (
                    <button
                      onClick={async () => {
                        try {
                          const { fetchWithAuth } = await import('@/lib/fetchWithAuth');
                          const res = await fetchWithAuth(`/api/notifications/${n.id}/read`, { method: 'POST' });
                          if (res.ok) {
                            setNotes((s) => s.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                          }
                        } catch (e) {
                          console.error('Mark read failed', e);
                        }
                      }}
                      className="text-xs px-2 py-1 bg-primary/10 text-primary rounded"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Expanded menu */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Join Community */}
          <a
            href="https://chat.whatsapp.com/JaqjPu6Yhp453JVtKeII2z"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg transition-colors whitespace-nowrap"
          >
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Join Community</span>
          </a>

          {/* Contact Admin */}
          <a
            href="https://wa.me/233592786175"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg transition-colors whitespace-nowrap"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">Contact Admin</span>
          </a>
        </div>
      )}

      {/* Main floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
