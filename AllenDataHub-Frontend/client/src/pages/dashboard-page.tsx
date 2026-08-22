import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-auth";
import { useMyOrders } from "../hooks/use-orders";
import { useOrderPolling } from "../hooks/use-order-polling";
import { format } from "date-fns";
import { Loader2, TrendingUp, Wallet, Wifi, CheckCircle2, Clock, Cog, ChevronLeft, ChevronRight, MoreVertical, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { OrderComplaintDialog } from "@/components/order-complaint-dialog";

export default function DashboardPage() {
  console.log('[DashboardPage] render start');
  const [ordersPage, setOrdersPage] = useState(1);
  const [complaintDialogOpen, setComplaintDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const limit = 10;
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: ordersData, isLoading: isOrdersLoading } = useMyOrders(ordersPage, limit);

  const orders = ordersData?.orders ?? [];
  const pagination = ordersData?.pagination ?? { total: 0, page: 1, limit, pages: 0 };
  const completedCount = ordersData?.completedCount ?? 0;
  // Keep all hooks at the top-level to preserve hook order
  const [depositsOpen, setDepositsOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<any | null>(null);
  const [deposits, setDeposits] = useState<any[]>([]);

  console.log('[DashboardPage] state', { isUserLoading, isOrdersLoading, userId: user?.id, ordersCount: orders.length });

  useEffect(() => {
    let mounted = true;
    async function loadDeposits() {
      try {
        const { fetchWithAuth } = await import('@/lib/fetchWithAuth');
        const res = await fetchWithAuth('/api/notifications');
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        const dep = (data || []).filter((d: any) => d.meta && d.meta.type === 'deposit').map((d: any) => ({ id: d.id, amount: d.meta?.amount ?? d.meta?.amountGHS ?? 0, createdAt: d.createdAt, platform: d.meta?.platform || d.meta?.by || 'unknown', meta: d.meta, status: 'credited' }));
        setDeposits(dep);
      } catch (e) {
        console.error('[Deposits] load failed', e);
      }
    }
    if (user?.role === 'agent') loadDeposits();
    return () => { mounted = false; };
  }, [user]);

  // Poll the first pending/processing order for status updates
  const pendingOrder = orders.find((o: any) => o.status === "processing" || o.status === "pending");
  useOrderPolling(pendingOrder?.id, !!pendingOrder);

  if (isUserLoading || isOrdersLoading) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null; // Handled by layout/auth redirect

  // Stats
  const totalOrders = pagination.total ?? 0;
  const completedOrders = completedCount;
  
  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-display font-bold mb-2">
            Welcome back, {user.username || user.fullName || 'there'}!
          </h1>
          <p className="text-primary-foreground/80 max-w-lg">
            {user.role === 'agent' 
              ? "Your agent dashboard is ready. Manage your sales and track your performance."
              : "Ready to top up? Get the best data bundles instantly."}
          </p>
          
          <div className="mt-6 flex gap-3">
             <Link href="/buy-data">
                <button className="bg-accent text-accent-foreground px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-white transition-colors">
                  Buy Data Bundle
                </button>
             </Link>
             {user.role === 'admin' && (
               <Link href="/admin">
                 <button className="bg-white/10 text-white border border-white/20 px-6 py-2 rounded-xl font-semibold hover:bg-white/20 transition-colors">
                   Admin Dashboard
                 </button>
               </Link>
             )}
          </div>
        </div>

        {/* Decorative Circle */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
      </div>

      {/* Role-Specific Alert */}
      {user.role === 'agent' && !user.isVerified && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-xl">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Your agent account is currently <strong>unverified</strong>. You can browse bundles, but some agent features may be restricted until an admin approves your account, Contact Admin from the chat icon bellow.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user.role === 'agent' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/50 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <h3 className="text-muted-foreground font-medium text-sm">Wallet Balance</h3>
              <Wallet className="text-primary w-5 h-5" />
            </div>
            <div>
              <span className="text-3xl font-bold font-display text-foreground">GHS {Number(user.balance ?? 0).toFixed(2)}</span>
              <p className="text-xs text-muted-foreground mt-1">Available to spend</p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/50 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-muted-foreground font-medium text-sm">Total Orders</h3>
            <Wifi className="text-accent w-5 h-5" />
          </div>
          <div>
            <span className="text-3xl font-bold font-display text-foreground">{totalOrders}</span>
            <p className="text-xs text-muted-foreground mt-1">Lifetime transactions</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/50 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-muted-foreground font-medium text-sm">Total GB Purchased</h3>
            <Wifi className="text-primary w-5 h-5" />
          </div>
          <div>
            <span className="text-3xl font-bold font-display text-foreground">
              {(user.totalGBPurchased ?? 0).toFixed(1)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Lifetime data purchased</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/50 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-muted-foreground font-medium text-sm">Success Rate</h3>
            <TrendingUp className="text-green-500 w-5 h-5" />
          </div>
          <div>
            <span className="text-3xl font-bold font-display text-foreground">
              {totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">Order completion</p>
          </div>
        </div>
      </div>

      {/* Recent Orders - Table: Time/Date | Network | GB | Number | Payment | Order Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50 flex justify-between items-center">
          <h3 className="text-lg font-bold font-display">Recent Orders</h3>
          <Link href="/buy-data" className="text-sm text-primary font-medium hover:underline">New Order</Link>
        </div>
        <div className="overflow-x-auto">
          {orders && orders.length > 0 ? (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold">Time/Date</th>
                    {user.role === "agent" && (
                      <th className="text-left py-3 px-4 font-semibold">Source</th>
                    )}
                    <th className="text-left py-3 px-4 font-semibold">Network</th>
                    <th className="text-left py-3 px-4 font-semibold">GB</th>
                    <th className="text-left py-3 px-4 font-semibold">Number Sent To</th>
                    <th className="text-left py-3 px-4 font-semibold">Payment Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Order Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Status updated</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: any) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy h:mm a") : "-"}</td>
                      {user.role === "agent" && (
                        <td className="py-3 px-4">
                          {order.orderSource === "api" ? (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-800">
                              API
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Web</span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4">{order.productNetwork ?? "-"}</td>
                      <td className="py-3 px-4">{order.dataAmount ?? "-"}</td>
                      <td className="py-3 px-4">{order.phoneNumber ?? "-"}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          order.paymentStatus === 'success' ? 'bg-green-50 text-green-700' :
                          order.paymentStatus === 'failed' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {order.paymentStatus ?? "pending"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <OrderStatusBadge status={order.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-[200px]">
                        {order.lastStatusUpdateAt ? (
                          <span title={order.lastVendorWebhook?.vendorStatus ? `Vendor: ${order.lastVendorWebhook.vendorStatus}` : undefined}>
                            {format(new Date(order.lastStatusUpdateAt), "MMM d, yyyy h:mm a")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setComplaintDialogOpen(true);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"
                          title="Report issue"
                        >
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pagination.pages > 1 && (
                <div className="p-4 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => setOrdersPage((p) => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <p>No transactions yet. Buy your first bundle!</p>
            </div>
          )}
        </div>
      </div>

      {/* Complaint Dialog */}
      {selectedOrder && (
        <OrderComplaintDialog
          open={complaintDialogOpen}
          onOpenChange={setComplaintDialogOpen}
          order={selectedOrder}
        />
      )}

      {/* Recent Deposits (Agent view) */}
      {user.role === 'agent' && (
        <div className="bg-slate-900/60 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Wallet className="w-6 h-6 text-emerald-400" />
            <h3 className="text-xl font-semibold">Recent Deposits</h3>
          </div>

          <div className="space-y-3">
            {deposits.map((d) => (
              <div
                key={d.id}
                className="bg-slate-900/50 border border-slate-700/40 rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex justify-between items-center px-4 py-3">
                  <div>
                    <div className="text-emerald-500 font-bold">GHS {Number(d.amount).toFixed(2)}</div>
                    <div className="text-xs text-slate-300">{format(new Date(d.createdAt), 'MMM d, h:mm a')}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white bg-slate-800 border border-gray-400/10 px-2 py-0.5 rounded-full">{d.status}</span>
                    <button
                      aria-label="View deposit"
                      onClick={() => { setSelectedDeposit(d); setDepositsOpen(true); }}
                      className="text-slate-300 hover:text-white transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Dialog open={depositsOpen} onOpenChange={(o) => { if (!o) setSelectedDeposit(null); setDepositsOpen(o); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Deposit Details</DialogTitle>
                <DialogDescription>
                  {selectedDeposit ? `GHS ${Number(selectedDeposit.amount).toFixed(2)} • ${selectedDeposit.platform}` : 'Deposit information'}
                </DialogDescription>
              </DialogHeader>

              {selectedDeposit && (
                <div className="space-y-3 py-2">
                  <div className="text-sm">Amount: <span className="font-bold">GHS {Number(selectedDeposit.amount).toFixed(2)}</span></div>
                  <div className="text-sm">Date: <span className="text-muted-foreground">{format(new Date(selectedDeposit.createdAt), 'MMM d, yyyy h:mm a')}</span></div>
                  <div className="text-sm">Platform: <span className="font-medium">{selectedDeposit.platform}</span></div>
                  <div className="text-sm">Balance before: GHS {Number(selectedDeposit.meta?.before ?? 0).toFixed(2)}</div>
                  <div className="text-sm">Balance after: GHS {Number(selectedDeposit.meta?.after ?? 0).toFixed(2)}</div>
                </div>
              )}

              <DialogFooter>
                <button className="px-4 py-2 bg-slate-800 text-white rounded-lg" onClick={() => setDepositsOpen(false)}>Close</button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
