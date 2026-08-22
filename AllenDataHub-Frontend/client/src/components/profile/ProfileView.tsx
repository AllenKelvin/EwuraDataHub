import React, { useState } from "react";
import { Mail, Phone, MessageSquare, Check, Wallet, Edit3 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { useAgentGenerateApiKey, useRequestAgentApiAccess } from "@/hooks/use-admin";
import { useQuery } from "@tanstack/react-query";

type User = any;

export default function ProfileView({ user }: { user: User }) {
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const genKey = useAgentGenerateApiKey();
  const requestAccess = useRequestAgentApiAccess();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { data: apiStatus } = useQuery({
    queryKey: ["/api/agent/api-access/status"],
    queryFn: async () => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth("/api/agent/api-access/status");
      if (!res.ok) throw new Error("Failed to fetch API access status");
      return res.json() as Promise<{ status: "none" | "pending" | "active" | "revoked"; hasKey: boolean }>;
    },
  });

  const [form, setForm] = useState({ fullName: user.username || "", email: user.email || "", phone: user.phoneNumber || "", whatsapp: user.whatsapp || "", momo: user.momo || "" });

  function resetForm() {
    setForm({ fullName: user.username || "", email: user.email || "", phone: user.phoneNumber || "", whatsapp: user.whatsapp || "", momo: user.momo || "" });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { fetchWithAuth } = await import('@/lib/fetchWithAuth');
      const res = await fetchWithAuth('/api/user', { method: 'PATCH', body: JSON.stringify({ fullName: form.fullName, email: form.email, phoneNumber: form.phone, whatsapp: form.whatsapp, momo: form.momo }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Failed to update profile');
      }
      const updated = await res.json();
      qc.invalidateQueries({ queryKey: [api.auth.me.path] });
      toast({ title: 'Profile saved' });
      setEditing(false);
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateKey() {
    setGenerating(true);
    try {
      if (apiStatus?.status === "active") {
        const d = await genKey.mutateAsync();
        setApiKey(d.apiKey || null);
        toast({ title: 'API key generated', description: 'Copy it now; it will not be shown again.' });
        return;
      }

      const result = await requestAccess.mutateAsync();
      if (result?.status === "pending") {
        toast({ title: 'API access requested', description: 'An admin will review the request and issue your key once approved.' });
      }
    } catch (e: any) {
      toast({ title: 'API generation failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your profile information and agent settings.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl p-6 border border-border text-center">
            <div className="relative inline-block">
              <div
                onClick={() => setShowMenu((s) => !s)}
                className="w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white text-2xl font-bold mx-auto cursor-pointer"
              >
                {String((user.username || "U").substring(0, 2)).toUpperCase()}
              </div>
              {/* verification badge */}
              <span className="absolute bottom-0 right-0 inline-flex items-center justify-center w-8 h-8 bg-white rounded-full -mb-1 -mr-1">
                <span className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                  <Check className="w-4 h-4" />
                </span>
              </span>
            </div>

            <h3 className="mt-4 font-bold text-lg">{user.fullName || user.username}</h3>
            <div className="mt-2 inline-flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.role === 'agent' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{user.role}</span>
            </div>

            <div className="mt-6 space-y-2 text-left">
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Email</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">{user.email || '—'} <span className="text-emerald-600">✓</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Phone</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">{user.phoneNumber || '—'} <span className="text-emerald-600">✓</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">WhatsApp</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">{(user.whatsapp) || '—'} <span className="text-emerald-600">✓</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                <Wallet className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">MoMo</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">{(user.momo) || '—'} <span className="text-emerald-600">✓</span></div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              {user.role === 'agent' && (
                <div className="p-4 bg-white border border-border rounded-lg text-left">
                  <div className="text-xs text-muted-foreground">Wallet Balance</div>
                  <div className="text-lg font-bold text-emerald-600">GHS {(user.balance || 0).toFixed(2)}</div>
                  <div className="mt-3">
                    <Link href="/fund-wallet">
                      <a>
                        <Button variant="secondary">Fund Wallet</Button>
                      </a>
                    </Link>
                  </div>
                </div>
              )}
              {user.role === 'agent' && (
                <div className="p-4 bg-slate-50 border border-border rounded-lg text-left">
                  <div className="text-xs text-muted-foreground">API Access</div>
                  <div className="text-lg font-bold">
                    {apiStatus?.status === "active" || apiKey ? 'Key generated' : apiStatus?.status === "pending" ? 'Request pending' : 'No API access'}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="secondary" onClick={handleGenerateKey} disabled={generating}>{generating ? 'Working...' : (apiStatus?.status === "active" || apiKey ? 'Regenerate Key' : 'Request API Access')}</Button>
                    {apiKey && (
                      <button className="px-3 py-1 bg-slate-800 text-white rounded" onClick={() => { navigator.clipboard.writeText(apiKey); toast({ title: 'Copied' }); }}>
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Edit3 className="w-4 h-4" /> Edit Profile</h2>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Full Name</label>
                <Input value={form.fullName} onChange={(e: any) => setForm(s => ({ ...s, fullName: e.target.value }))} className="bg-slate-900/5 border-border/40" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Email Address</label>
                <Input value={form.email} onChange={(e: any) => setForm(s => ({ ...s, email: e.target.value }))} className="bg-slate-900/5 border-border/40" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Phone Number</label>
                <Input value={form.phone} onChange={(e: any) => setForm(s => ({ ...s, phone: e.target.value }))} className="bg-slate-900/5 border-border/40" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">WhatsApp</label>
                <Input value={form.whatsapp} onChange={(e: any) => setForm(s => ({ ...s, whatsapp: e.target.value }))} className="bg-slate-900/5 border-border/40" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">MoMo Number</label>
                <Input value={form.momo} onChange={(e: any) => setForm(s => ({ ...s, momo: e.target.value }))} className="bg-slate-900/5 border-border/40" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              <Button variant="ghost" onClick={() => { resetForm(); setEditing(false); }}>Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
