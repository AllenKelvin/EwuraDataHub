import { useState } from 'react';
import { useUser } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://ewura-hub-api.onrender.com";

export default function FundWalletPage() {
  const { data: user, isLoading } = useUser();
  const [amount, setAmount] = useState<number>(0);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const adminFee = amount * 0.04; // 4% fee
  const netAmount = amount - adminFee;
  const hasValidEmail = !!user.email && user.email.includes('@');

  if (isLoading) return <div className="h-[50vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  async function fundWallet() {
    if (amount <= 0) return toast({ title: 'Invalid amount', variant: 'destructive' });
    if (!user.email || !user.email.includes('@')) {
      return toast({ title: 'Email required', description: 'Please update your profile with a valid email address before funding your wallet.', variant: 'destructive' });
    }
    setIsPaymentLoading(true);
    try {
      const { fetchWithAuth } = await import('@/lib/fetchWithAuth');
      const resp = await fetchWithAuth('/api/paystack/initialize', {
        method: 'POST',
        body: JSON.stringify({ amount: Math.round(amount * 100), email: user.email, metadata: { type: 'wallet', agentId: user.id } }),
      });
      const data = await resp.json();
      if (data && (data.data?.authorization_url || data.authorization_url)) {
        const url = data.data?.authorization_url || data.authorization_url;
        toast({ title: 'Redirecting', description: 'Redirecting to Paystack...', variant: 'default' });
        setTimeout(() => { window.location.href = url; }, 200);
      } else {
        setIsPaymentLoading(false);
        const message = data?.message || 'Could not initialize Paystack';
        toast({ title: 'Payment init failed', description: message, variant: 'destructive' });
      }
    } catch (e) {
      setIsPaymentLoading(false);
      console.error(e);
      toast({ title: 'Error', description: 'Failed to initialize payment', variant: 'destructive' });
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl border border-border/50">
        <h2 className="text-xl font-bold">Fund Wallet</h2>
        <p className="text-sm text-muted-foreground mt-2">Top up your agent wallet using Paystack.</p>
        <div className="mt-4 flex gap-2 items-center">
          <Input type="number" placeholder="Amount (GHS)" value={amount} onChange={(e) => setAmount(Number(e.target.value))} disabled={isPaymentLoading} />
          <Button onClick={fundWallet} disabled={isPaymentLoading || amount <= 0 || !hasValidEmail}>
            {isPaymentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isPaymentLoading ? 'Processing...' : 'Pay'}
          </Button>
        </div>
        {!hasValidEmail && (
          <p className="text-sm text-destructive mt-2">
            A valid email is required for Paystack funding. Please update your profile with a valid email address.
          </p>
        )}
        
        {amount > 0 && (
          <div className="mt-6 space-y-2 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Amount to Pay:</span>
              <span className="font-medium">GHS {amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-red-600">
              <span>Admin Fee (4%):</span>
              <span className="font-medium">GHS {adminFee.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm font-semibold">
              <span>Amount Credited to Wallet:</span>
              <span className="text-green-600">GHS {netAmount.toFixed(2)}</span>
            </div>
          </div>
        )}
        
        <div className="mt-4">
          <Button variant="ghost" onClick={() => setLocation('/profile')}>Back to Profile</Button>
        </div>
      </div>
    </div>
  );
}
