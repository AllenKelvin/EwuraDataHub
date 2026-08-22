import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface OrderComplaintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
}

export function OrderComplaintDialog({ open, onOpenChange, order }: OrderComplaintDialogProps) {
  const [complaintType, setComplaintType] = useState<'not_received' | 'failed' | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Auto-populate from order data
  const recipient = order.phoneNumber;
  const packageInfo = `${order.dataAmount} - ${order.productNetwork}`;
  const status = order.status;

  const handleSendWhatsApp = async () => {
    if (!complaintType) return;

    setIsSending(true);
    try {
      let message = '';

      if (complaintType === 'not_received') {
        message = `Hello, Please my order has not been received.

Order ID: ${order.id}
Issue: Order not received

Recipient Number: ${recipient}
Package: ${packageInfo}
Order Status: ${status}
Network: ${order.productNetwork}
Data Amount: ${order.dataAmount}
Order Date: ${new Date(order.createdAt).toLocaleString()}`;
      } else if (complaintType === 'failed') {
        message = `Hello, I want to report a failed order status.

Order ID: ${order.id}
Issue: Order failed

Network: ${order.productNetwork}
Data Amount: ${order.dataAmount}
Phone Number: ${order.phoneNumber}
Order Date: ${new Date(order.createdAt).toLocaleString()}
Payment Status: ${order.paymentStatus}
Order Status: ${order.status}`;
      }

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/233592786175?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
      
      // Close dialog after sending
      onOpenChange(false);
      // Reset form
      setComplaintType(null);
    } finally {
      setIsSending(false);
    }
  };

  const isFormValid = !!complaintType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complain To Admin</DialogTitle>
          <DialogDescription>
            Report an issue with your order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Complaint Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Select Issue Type</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => setComplaintType('not_received')}>
                <input
                  type="radio"
                  name="complaintType"
                  value="not_received"
                  checked={complaintType === 'not_received'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComplaintType('not_received')}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Order not received</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => setComplaintType('failed')}>
                <input
                  type="radio"
                  name="complaintType"
                  value="failed"
                  checked={complaintType === 'failed'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComplaintType('failed')}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Order failed</span>
              </label>
            </div>
          </div>

          {/* Order Details Display */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm">Order Details</h3>
            <div className="text-xs space-y-1">
              <p><strong>Order ID:</strong> {order.id}</p>
              <p><strong>Network:</strong> {order.productNetwork}</p>
              <p><strong>Data Amount:</strong> {order.dataAmount}</p>
              <p><strong>Phone:</strong> {order.phoneNumber}</p>
            </div>
          </div>

          {/* Conditional Fields for "Order not received" */}
          {complaintType === 'not_received' && (
            <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-900 font-medium mb-3">Order Details (Automatically populated from your order)</p>
              <div>
                <label className="text-sm font-medium text-gray-700">Recipient Number</label>
                <p className="mt-1 p-2 bg-white rounded border border-border text-sm text-gray-900">{recipient}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Package Details</label>
                <p className="mt-1 p-2 bg-white rounded border border-border text-sm text-gray-900">{packageInfo}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Order Status</label>
                <p className="mt-1 p-2 bg-white rounded border border-border text-sm text-gray-900 capitalize">{status}</p>
              </div>
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSendWhatsApp}
            disabled={!isFormValid || isSending}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              '📱 Send via WhatsApp'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
