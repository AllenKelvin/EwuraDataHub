import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-auth";
import { useAdminAllOrders } from "@/hooks/use-admin";

export default function PaymentReturnPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const qc = useQueryClient();
  const { data: user, isLoading: userLoading } = useUser();
  const [transactionAmount, setTransactionAmount] = useState<number | null>(null);
  const [previousBalance, setPreviousBalance] = useState<number | null>(null);

  const params = new URLSearchParams(search);
  const reference = params.get("reference");
  const success = params.get("trxref") || reference;
  const isSuccess = !!success;

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ["/api/cart"] });
    qc.invalidateQueries({ queryKey: [api.orders.listMyOrders.path] });
    qc.invalidateQueries({ queryKey: ["/api/user"] });
  }, [qc]);

  useEffect(() => {
    // Get the last order to determine transaction amount
    const getLastOrder = async () => {
      try {
        const { fetchWithAuth } = await import('@/lib/fetchWithAuth');
        const res = await fetchWithAuth(api.orders.listMyOrders.path);
        if (res.ok) {
          const orders = await res.json();
          if (orders && orders.length > 0) {
            const lastOrder = orders[0];
            setTransactionAmount(lastOrder.price);
            // Calculate previous balance
            if (user?.balance !== undefined) {
              setPreviousBalance(user.balance + lastOrder.price);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch order details', err);
      }
    };

    if (!userLoading && user && isSuccess) {
      getLastOrder();
    }
  }, [user, userLoading, isSuccess]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-border p-8 text-center">
        {isSuccess ? (
          <>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground mb-6">
              Your order has been placed. You can view it in Recent Orders on your dashboard.
            </p>

            {user?.role === 'agent' && !userLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 space-y-2 text-left">
                <div className="text-sm font-medium text-blue-900">Account Balance</div>
                {previousBalance !== null && transactionAmount !== null && (
                  <>
                    <div className="flex justify-between text-xs text-blue-700">
                      <span>Previous Balance:</span>
                      <span>GHS {previousBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-blue-700">
                      <span>Amount Charged:</span>
                      <span>-GHS {transactionAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-blue-200 pt-2 flex justify-between text-sm font-bold text-blue-900">
                      <span>New Balance:</span>
                      <span>GHS {(user?.balance ?? 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
                {previousBalance === null && (
                  <div className="text-xs text-blue-700">
                    Current Balance: GHS {(user?.balance ?? 0).toFixed(2)}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Processing Payment</h1>
            <p className="text-muted-foreground mb-6">
              Please wait while we confirm your payment...
            </p>
          </>
        )}
        <Button
          onClick={() => setLocation("/")}
          className="w-full bg-primary hover:bg-primary/90"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
