import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://ewura-hub-api.onrender.com";

// List Unverified Agents
export function useUnverifiedAgents() {
  return useQuery({
    queryKey: [api.users.listUnverifiedAgents.path],
    queryFn: async () => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth(api.users.listUnverifiedAgents.path);
      if (!res.ok) throw new Error("Failed to fetch unverified agents");
      return api.users.listUnverifiedAgents.responses[200].parse(await res.json());
    },
  });
}

// Verify Agent
export function useVerifyAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.users.verifyAgent.path, { id });
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth(url, { method: "PATCH" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body && (body.message || body.error)) || "Failed to verify agent");
      }
      return api.users.verifyAgent.responses[200].parse(await res.json());
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: [api.users.listUnverifiedAgents.path] });
      toast({ title: "Agent Verified", description: `${user.username} can now access the dashboard.` });
    },
    onError: (error: Error) => {
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    },
  });
}

// Deny Agent
export function useDenyAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth(`/api/users/${id}/deny`, { method: "PATCH" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body && (body.message || body.error)) || "Failed to deny agent");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/agents"] });
      toast({ title: "Agent Denied", description: `${user.username} access has been revoked.` });
    },
    onError: (error: Error) => {
      toast({ title: "Denial Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ["/api/users/agents"],
    queryFn: async () => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth('/api/users/agents');
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
  });
}

export function useCreditAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth(`/api/admin/wallet/${id}/load`, { method: "POST", body: JSON.stringify({ amount }) });
      if (!res.ok) throw new Error("Failed to credit agent");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/agents"] });
      toast({ title: "Wallet Updated", description: "Agent wallet credited" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useAdminTotals() {
  return useQuery({
    queryKey: ["/api/admin/totals"],
    queryFn: async () => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth('/api/admin/totals');
      if (!res.ok) throw new Error("Failed to fetch totals");
      return res.json();
    },
  });
}

export function useAdminAllOrders(page = 1, limit = 50) {
  return useQuery({
    queryKey: ["/api/admin/orders", page, limit],
    queryFn: async () => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth(`/api/admin/orders?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      return { ...data, pagination: data.pagination || { total: 0, page: 1, limit, pages: 0 } };
    },
  });
}

export type AdminApiAccessRow = {
  userId: string;
  username?: string;
  email?: string;
  status: string;
  balance?: number;
  requestedAt?: string;
  lastUsedAt?: string;
  productPrices: Record<string, number>;
  products: { id: string; name: string; network: string; dataAmount: string; agentPrice: number }[];
};

export function useAdminApiAccess() {
  return useQuery({
    queryKey: ["/api/admin/api-access"],
    queryFn: async () => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth("/api/admin/api-access");
      if (!res.ok) throw new Error("Failed to fetch API access list");
      return res.json() as Promise<AdminApiAccessRow[]>;
    },
  });
}

export function usePatchAgentApiPricing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ userId, prices }: { userId: string; prices: Record<string, number> }) => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth(`/api/admin/api-access/${userId}/pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to save API prices");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-access"] });
      toast({ title: "Saved", description: "API prices updated for this agent." });
    },
    onError: (e: Error) => {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    },
  });
}

// Agent self-service API key generation
export function useAgentGenerateApiKey() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth("/api/agent/api-access/generate-key", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { message?: string }).message || "Failed to generate API key");
      }
      return res.json() as Promise<{ apiKey: string; message: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/api-access/status"] });
    },
    onError: (e: Error) => {
      toast({ title: "Generate key failed", description: e.message, variant: "destructive" });
    },
  });
}

export function useRequestAgentApiAccess() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth("/api/agent/api-access/request", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { message?: string }).message || "Failed to request API access");
      }
      return res.json() as Promise<{ status: "pending" | "active" | "revoked"; message: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/api-access/status"] });
    },
    onError: (e: Error) => {
      toast({ title: "Request access failed", description: e.message, variant: "destructive" });
    },
  });
}

export function useIssueAgentApiKey() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth(`/api/admin/api-access/${userId}/issue-key`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { message?: string }).message || "Failed to issue key");
      }
      return res.json() as Promise<{ apiKey: string; message: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-access"] });
    },
    onError: (e: Error) => {
      toast({ title: "Issue key failed", description: e.message, variant: "destructive" });
    },
  });
}

export function useRevokeAgentApiAccess() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth(`/api/admin/api-access/${userId}/revoke`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to revoke");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-access"] });
      toast({ title: "Revoked", description: "API key disabled for this agent." });
    },
    onError: (e: Error) => {
      toast({ title: "Revoke failed", description: e.message, variant: "destructive" });
    },
  });
}
