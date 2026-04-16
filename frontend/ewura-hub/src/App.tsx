import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import BuyData from "@/pages/buy-data";
import Cart from "@/pages/cart";
import Orders from "@/pages/orders";
import Wallet from "@/pages/wallet";
import PaymentCallback from "@/pages/payment-callback";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminAgents from "@/pages/admin/agents";
import AdminOrders from "@/pages/admin/orders";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { 
      retry: 1, 
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    }
  },
});

function ProtectedRoute({ component: Component, allowedRoles }: { component: any; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to={user.role === "admin" ? "/admin" : "/dashboard"} />;
  }

  return <Component />;
}

function GuestRoute({ component: Component }: { component: any }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) return <Redirect to={user.role === "admin" ? "/admin" : "/dashboard"} />;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login">{() => <GuestRoute component={Login} />}</Route>
      <Route path="/register">{() => <GuestRoute component={Register} />}</Route>

      <Route path="/dashboard">
        {() => (
          <AppLayout>
            <ProtectedRoute component={Dashboard} allowedRoles={["user", "agent"]} />
          </AppLayout>
        )}
      </Route>
      <Route path="/buy-data">
        {() => (
          <AppLayout>
            <ProtectedRoute component={BuyData} allowedRoles={["user", "agent"]} />
          </AppLayout>
        )}
      </Route>
      <Route path="/cart">
        {() => (
          <AppLayout>
            <ProtectedRoute component={Cart} allowedRoles={["user", "agent"]} />
          </AppLayout>
        )}
      </Route>
      <Route path="/orders">
        {() => (
          <AppLayout>
            <ProtectedRoute component={Orders} allowedRoles={["user", "agent"]} />
          </AppLayout>
        )}
      </Route>
      <Route path="/wallet">
        {() => (
          <AppLayout>
            <ProtectedRoute component={Wallet} allowedRoles={["agent"]} />
          </AppLayout>
        )}
      </Route>

      <Route path="/payment-callback">
        {() => (
          <AppLayout>
            <ProtectedRoute component={PaymentCallback} allowedRoles={["user", "agent"]} />
          </AppLayout>
        )}
      </Route>

      <Route path="/admin">
        {() => (
          <AppLayout>
            <ProtectedRoute component={AdminDashboard} allowedRoles={["admin"]} />
          </AppLayout>
        )}
      </Route>
      <Route path="/admin/agents">
        {() => (
          <AppLayout>
            <ProtectedRoute component={AdminAgents} allowedRoles={["admin"]} />
          </AppLayout>
        )}
      </Route>
      <Route path="/admin/orders">
        {() => (
          <AppLayout>
            <ProtectedRoute component={AdminOrders} allowedRoles={["admin"]} />
          </AppLayout>
        )}
      </Route>

      <Route path="/">{() => <GuestRoute component={Login} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <CartProvider>
              <Router />
            </CartProvider>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
