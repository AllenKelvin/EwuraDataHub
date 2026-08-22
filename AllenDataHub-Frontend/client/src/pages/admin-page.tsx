import { useCreateProduct, useProducts } from "@/hooks/use-products";
import { useVerifyAgent, useDenyAgent } from "@/hooks/use-admin";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type InsertProduct } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert, CheckCircle2, PackagePlus, KeyRound, Save, Ban, Users, BadgeCheck, BadgeX, Wallet, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderStatusBadge } from "@/components/order-status-badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  useAgents,
  useCreditAgent,
  useAdminTotals,
  useAdminAllOrders,
  useAdminApiAccess,
  usePatchAgentApiPricing,
  useIssueAgentApiKey,
  useRevokeAgentApiAccess,
  type AdminApiAccessRow,
} from "@/hooks/use-admin";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function AdminAgentsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: agents, isLoading: isLoadingAgents } = useAgents();
  const verifyMutation = useVerifyAgent();
  const denyMutation = useDenyAgent();
  const creditMutation = useCreditAgent();
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const handleVerify = (agentId: string) => {
    verifyMutation.mutate(agentId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users/agents"] });
      },
    });
  };

  const handleDeny = (agentId: string) => {
    denyMutation.mutate(agentId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users/agents"] });
      },
    });
  };

  const handleCredit = (agentId: string) => {
    const amount = parseFloat(adjustAmount);
    if (!amount || !adjustReason.trim()) {
      toast({ title: "Missing fields", description: "Enter amount and reason", variant: "destructive" });
      return;
    }

    creditMutation.mutate({ id: agentId, amount }, {
      onSuccess: () => {
        toast({ title: "Balance adjusted successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/users/agents"] });
        setAdjustingId(null);
        setAdjustAmount("");
        setAdjustReason("");
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.message || "Failed to adjust balance", variant: "destructive" });
      },
    });
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-sidebar px-5 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-white font-bold flex-1">Manage Agents</h2>
        <span className="text-white/40 text-xs">{agents ? agents.length : 0} agent{agents?.length === 1 ? "" : "s"}</span>
      </div>

      {isLoadingAgents ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !agents?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="font-semibold">No agents available for wallet management.</p>
        </div>
      ) : (
        <div>
          {agents.map((agent: any, idx: number) => (
            <div key={agent.id} className="border-b border-border last:border-b-0 slide-in-left" data-delay={Math.min(idx, 7)}>
              <div className="px-5 py-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-black text-sm">
                      {agent.username?.replace("@", "").substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground">{agent.username}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${agent.isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {agent.isVerified ? "✓ Verified" : "Pending"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{agent.email} · {agent.phoneNumber ?? "-"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-slate-950 text-white rounded-xl px-4 py-2 shadow-sm">
                    <Wallet className="h-3.5 w-3.5 text-white" />
                    <span className="text-white text-sm font-black">GHS {Number(agent.balance ?? 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={agent.isVerified ? "outline" : "default"}
                    onClick={() => agent.isVerified ? handleDeny(agent.id) : handleVerify(agent.id)}
                    disabled={verifyMutation.isPending || denyMutation.isPending}
                    className={`gap-1.5 h-8 text-xs font-semibold ${agent.isVerified ? "border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300" : ""}`}
                  >
                    {agent.isVerified ? <><BadgeX className="h-3.5 w-3.5" /> Deny</> : <><BadgeCheck className="h-3.5 w-3.5" /> Approve</>}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAdjustingId(adjustingId === agent.id ? null : agent.id)}
                    className="gap-1.5 h-8 text-xs font-semibold"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    Balance
                    {adjustingId === agent.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              {adjustingId === agent.id && (
                <div className="mx-5 mb-4 bg-muted/40 border border-border rounded-xl p-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Adjust Wallet Balance</p>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="text-xs font-semibold text-foreground/60 block mb-1">Amount (GHS)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        className="w-[120px] h-9 text-sm font-mono"
                      />
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <label className="text-xs font-semibold text-foreground/60 block mb-1">Reason</label>
                      <Input
                        placeholder="Reason for adjustment"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleCredit(agent.id)}
                        disabled={creditMutation.isPending}
                        className="h-9 bg-emerald-600 hover:bg-emerald-700 font-semibold"
                      >
                        {creditMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply Credit"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAdjustingId(null)} className="h-9">Cancel</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Deposits fetching available for admin tools; quick-view dialog removed as requested */}
    </div>
  );
}

function ManagePackagesTable() {
  const { data: products, isLoading } = useProducts();
  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Packages</CardTitle>
        <CardDescription>Package name, agent price, regular user price, description, and gigabytes.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-semibold">Package Name</th>
                <th className="text-left py-3 px-2 font-semibold">Agent Price (GHS)</th>
                <th className="text-left py-3 px-2 font-semibold">Regular User Price (GHS)</th>
                <th className="text-left py-3 px-2 font-semibold">Package Description</th>
                <th className="text-left py-3 px-2 font-semibold">Gigabytes</th>
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map((p: any) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-3 px-2">{p.name ?? '-'}</td>
                  <td className="py-3 px-2">{p.agentPrice != null ? Number(p.agentPrice).toFixed(2) : '-'}</td>
                  <td className="py-3 px-2">{p.userPrice != null ? Number(p.userPrice).toFixed(2) : '-'}</td>
                  <td className="py-3 px-2 max-w-xs truncate" title={p.description ?? ''}>{p.description ?? '-'}</td>
                  <td className="py-3 px-2">{p.dataAmount ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!products || products.length === 0) && (
            <p className="text-center py-6 text-muted-foreground">No packages yet. Add one below.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminAllOrdersTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminAllOrders(page, 50);
  const orders = data?.orders ?? [];
  const totalSpent = data?.totalSpent ?? 0;
  const pagination = data?.pagination ?? { total: 0, page: 1, limit: 50, pages: 0 };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Orders</CardTitle>
        <CardDescription>All orders placed by users and agents. Time, number sent to, amount, and total.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-semibold">Time</th>
                <th className="text-left py-3 px-2 font-semibold">Buyer</th>
                <th className="text-left py-3 px-2 font-semibold">Network</th>
                <th className="text-left py-3 px-2 font-semibold">GB</th>
                <th className="text-left py-3 px-2 font-semibold">Number sent to</th>
                <th className="text-left py-3 px-2 font-semibold">Amount (GHS)</th>
                <th className="text-left py-3 px-2 font-semibold">Source</th>
                <th className="text-left py-3 px-2 font-semibold">Bal. before</th>
                <th className="text-left py-3 px-2 font-semibold">Bal. after</th>
                <th className="text-left py-3 px-2 font-semibold">Payment</th>
                <th className="text-left py-3 px-2 font-semibold">Status</th>
                <th className="text-left py-3 px-2 font-semibold">Status updated</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="py-3 px-2">{o.createdAt ? format(new Date(o.createdAt), "MMM d, h:mm a") : "-"}</td>
                  <td className="py-3 px-2">{o.buyerUsername ?? "-"} ({o.buyerRole ?? "-"})</td>
                  <td className="py-3 px-2">{o.productNetwork ?? "-"}</td>
                  <td className="py-3 px-2">{o.dataAmount ?? "-"}</td>
                  <td className="py-3 px-2">{o.phoneNumber ?? "-"}</td>
                  <td className="py-3 px-2">{o.price != null ? Number(o.price).toFixed(2) : "-"}</td>
                  <td className="py-3 px-2">
                    {o.orderSource === "api" ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-violet-100 text-violet-800 font-medium">API</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Web</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-xs">
                    {typeof o.walletBalanceBefore === "number" ? `GHS ${Number(o.walletBalanceBefore).toFixed(2)}` : "—"}
                  </td>
                  <td className="py-3 px-2 text-xs">
                    {typeof o.walletBalanceAfter === "number" ? `GHS ${Number(o.walletBalanceAfter).toFixed(2)}` : "—"}
                  </td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      o.paymentStatus === 'success' ? 'bg-green-100 text-green-700' :
                      o.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {o.paymentStatus ?? "pending"}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <OrderStatusBadge status={o.status} size="sm" />
                  </td>
                  <td className="py-3 px-2 text-xs text-muted-foreground whitespace-nowrap">
                    {o.lastStatusUpdateAt
                      ? format(new Date(o.lastStatusUpdateAt), "MMM d, h:mm a")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <p className="text-center py-6 text-muted-foreground">No orders yet.</p>
          )}
          {orders.length > 0 && (
            <>
              <div className="mt-4 pt-4 border-t font-bold flex justify-between">
                <span>Total amount spent (this page)</span>
                <span>GHS {totalSpent.toFixed(2)}</span>
              </div>
              {pagination.pages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pages} ({pagination.total} orders)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TotalsPanel() {
  const { data: totals } = useAdminTotals();
  const safeTotals = {
    totalOrdersToday: (totals && typeof totals.totalOrdersToday === 'number') ? totals.totalOrdersToday : 0,
    totalGBSentToday: (totals && typeof totals.totalGBSentToday === 'number') ? totals.totalGBSentToday : 0,
    totalSpentToday: (totals && typeof totals.totalSpentToday === 'number') ? totals.totalSpentToday : 0,
    totalGBPurchased: (totals && typeof totals.totalGBPurchased === 'number') ? totals.totalGBPurchased : 0,
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-border/50">
      <h3 className="text-lg font-bold mb-2">Platform Totals</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 rounded">
          <div className="text-sm text-muted-foreground">Orders Today (GMT)</div>
          <div className="text-xl font-bold">{safeTotals.totalOrdersToday}</div>
        </div>
        <div className="p-4 bg-gray-50 rounded">
          <div className="text-sm text-muted-foreground">GB Sent Today</div>
          <div className="text-xl font-bold">{safeTotals.totalGBSentToday.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-gray-50 rounded">
          <div className="text-sm text-muted-foreground">GHS Spent Today</div>
          <div className="text-xl font-bold">{safeTotals.totalSpentToday}</div>
        </div>
        <div className="p-4 bg-gray-50 rounded">
          <div className="text-sm text-muted-foreground">Total GB Purchased</div>
          <div className="text-xl font-bold">{safeTotals.totalGBPurchased.toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
}

function AgentApiAccessPanel() {
  const { data: rows, isLoading } = useAdminApiAccess();
  const patchPricing = usePatchAgentApiPricing();
  const issueKey = useIssueAgentApiKey();
  const revoke = useRevokeAgentApiAccess();
  const [issuedKey, setIssuedKey] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Partner API access</CardTitle>
          <CardDescription>
            When a verified agent requests an API key from their profile, they appear here. Set per-package API prices,
            then issue a key. External apps use{" "}
            <code className="text-xs bg-muted px-1 rounded">X-API-Key</code> on{" "}
            <code className="text-xs bg-muted px-1 rounded">GET /api/v1/products</code> and{" "}
            <code className="text-xs bg-muted px-1 rounded">POST /api/v1/orders</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">No API access requests yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Dialog open={!!issuedKey} onOpenChange={(o) => !o && setIssuedKey(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>API key issued</DialogTitle>
            <DialogDescription>
              Copy this key now. It will not be shown again. Share it only with the agent or their developer.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted p-3 font-mono text-sm break-all select-all">{issuedKey}</div>
          <Button
            type="button"
            onClick={() => {
              if (issuedKey) void navigator.clipboard.writeText(issuedKey);
            }}
          >
            Copy to clipboard
          </Button>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Partner API access</CardTitle>
          <CardDescription>
            Set API prices per package (GHS). Unset rows use the agent&apos;s dashboard price. Issue a key after pricing.
            Orders via the API deduct the agent wallet and are labeled in All Orders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-10">
          {rows.map((row) => (
            <AgentApiAccessRowCard
              key={row.userId}
              row={row}
              onSave={(prices) => patchPricing.mutate({ userId: row.userId, prices })}
              isSaving={patchPricing.isPending}
              onIssue={() =>
                issueKey.mutate(row.userId, {
                  onSuccess: (d) => setIssuedKey(d.apiKey),
                })
              }
              isIssuing={issueKey.isPending}
              onRevoke={() => {
                if (confirm(`Revoke API access for ${row.username ?? row.userId}?`)) revoke.mutate(row.userId);
              }}
              isRevoking={revoke.isPending}
            />
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function AgentApiAccessRowCard({
  row,
  onSave,
  isSaving,
  onIssue,
  isIssuing,
  onRevoke,
  isRevoking,
}: {
  row: AdminApiAccessRow;
  onSave: (prices: Record<string, number>) => void;
  isSaving: boolean;
  onIssue: () => void;
  isIssuing: boolean;
  onRevoke: () => void;
  isRevoking: boolean;
}) {
  const { toast } = useToast();
  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    const init: Record<string, string> = {};
    (row.products ?? []).forEach((p) => {
      const v = row.productPrices?.[p.id] ?? p.agentPrice;
      init[p.id] = v != null && Number.isFinite(Number(v)) ? String(v) : "";
    });
    setPrices(init);
  }, [row.userId, row.productPrices, row.products]);

  const statusClass =
    row.status === "active"
      ? "bg-green-100 text-green-800"
      : row.status === "pending"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";

  function handleSave() {
    const out: Record<string, number> = {};
    for (const p of row.products ?? []) {
      const n = parseFloat(prices[p.id] ?? "");
      if (Number.isFinite(n) && n > 0) out[p.id] = n;
    }
    if (Object.keys(out).length === 0) {
      toast({
        title: "No prices to save",
        description: "Enter at least one positive API price (GHS) for a package.",
        variant: "destructive",
      });
      return;
    }
    onSave(out);
  }

  return (
    <div className="border rounded-xl p-4 space-y-4 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{row.username ?? row.userId}</p>
          <p className="text-xs text-muted-foreground">{row.email ?? "—"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusClass}`}>{row.status}</span>
          <span className="text-sm text-muted-foreground">
            Wallet: GHS {Number(row.balance ?? 0).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Package</th>
              <th className="text-left py-2 px-2">Network</th>
              <th className="text-left py-2 px-2">Agent price (ref.)</th>
              <th className="text-left py-2 px-2">API price (GHS)</th>
            </tr>
          </thead>
          <tbody>
            {(row.products ?? []).map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2 px-2">{p.name}</td>
                <td className="py-2 px-2">{p.network}</td>
                <td className="py-2 px-2 text-muted-foreground">{Number(p.agentPrice ?? 0).toFixed(2)}</td>
                <td className="py-2 px-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-8 w-28"
                    value={prices[p.id] ?? ""}
                    onChange={(e) => setPrices((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder={String(p.agentPrice ?? "")}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Save API prices
        </Button>
        <Button type="button" size="sm" onClick={onIssue} disabled={isIssuing || row.status === "revoked"}>
          {isIssuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4 mr-1" />}
          {row.status === "active" ? "Regenerate API key" : "Issue API key"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={onRevoke}
          disabled={isRevoking || row.status !== "active"}
        >
          {isRevoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4 mr-1" />}
          Revoke
        </Button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { mutate: createProduct, isPending: isCreatingProduct } = useCreateProduct();

  // Create Product Form - prices with decimals, user and agent prices must differ
  const productFormSchema = insertProductSchema.extend({
    userPrice: z.coerce.number().min(0.01, "Price must be positive"),
    agentPrice: z.coerce.number().min(0.01, "Price must be positive"),
  }).refine((data) => {
    return data.userPrice !== data.agentPrice;
  }, { message: "User price and Agent price must be different", path: ["agentPrice"] });

  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      network: "",
      dataAmount: "",
      price: 0,
      userPrice: undefined,
      agentPrice: undefined,
      description: "",
    },
  });

  const onSubmitProduct = (data: z.infer<typeof productFormSchema>) => {
    createProduct(data, {
      onSuccess: () => form.reset(),
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Admin Portal</h1>
          <p className="text-muted-foreground">Manage products, verify agents, and oversee platform activity.</p>
        </div>
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          Restricted Area
        </div>
      </div>

      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2 md:grid-cols-4 h-auto gap-1 mb-8 p-1">
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="api">API access</TabsTrigger>
          <TabsTrigger value="orders">All Orders</TabsTrigger>
          <TabsTrigger value="products">Manage Packages</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="animate-in fade-in slide-in-from-left-4">
          <AdminAgentsTab />
        </TabsContent>

        <TabsContent value="api" className="animate-in fade-in slide-in-from-bottom-4">
          <AgentApiAccessPanel />
        </TabsContent>

        {/* ALL ORDERS TAB - Admin sees all orders: time, number, amount, total */}
        <TabsContent value="orders" className="animate-in fade-in slide-in-from-bottom-4">
          <AdminAllOrdersTable />
        </TabsContent>

        {/* PRODUCTS TAB - Manage Packages: name, agent price, user price, description, gigabytes */}
        <TabsContent value="products" className="animate-in fade-in slide-in-from-right-4">
          <ManagePackagesTable />
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Add New Product</CardTitle>
                <CardDescription>Create a new data bundle package.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitProduct)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="network"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Network</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select network" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="MTN">MTN</SelectItem>
                                <SelectItem value="Telecel">Telecel</SelectItem>
                                <SelectItem value="AirtelTigo">AirtelTigo</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="dataAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data Amount (e.g. 1GB)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 1GB" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Package Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. MTN 1GB Daily" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Package Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Valid for 30 days..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="userPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Regular User Price (GHS)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" min="0" placeholder="e.g. 4.30" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="agentPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agent Price (GHS) — must differ from user price</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" min="0" placeholder="e.g. 4.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" disabled={isCreatingProduct} className="w-full">
                      {isCreatingProduct ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PackagePlus className="w-4 h-4 mr-2" />}
                      Create Product
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
