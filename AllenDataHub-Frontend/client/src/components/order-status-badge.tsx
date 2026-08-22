import { Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface OrderStatusBadgeProps {
  status?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function OrderStatusBadge({ status = 'pending', size = 'md' }: OrderStatusBadgeProps) {
  const iconSizeMap = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizeMap = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const paddingMap = {
    sm: 'px-2 py-0.5',
    md: 'px-3 py-1',
    lg: 'px-4 py-1.5',
  };

  const iconSize = iconSizeMap[size];
  const textSize = textSizeMap[size];
  const padding = paddingMap[size];

  if (status === 'pending') {
    return (
      <div className={`${padding} rounded-full font-medium flex items-center gap-1.5 bg-amber-600 text-amber-50 border border-amber-700`}>
        <Clock className={`${iconSize} animate-bounce`} />
        <span className={textSize}>Pending</span>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className={`${padding} rounded-full font-medium flex items-center gap-1.5 bg-blue-600 text-blue-50 border border-blue-700`}>
        <Loader2 className={`${iconSize} animate-spin`} />
        <span className={textSize}>Processing</span>
      </div>
    );
  }

  if (status === 'completed' || status === 'delivered') {
    return (
      <div className={`${padding} rounded-full font-medium flex items-center gap-1.5 bg-emerald-600 text-emerald-50 border border-emerald-700`}>
        <CheckCircle2 className={`${iconSize}`} />
        <span className={textSize}>Completed</span>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className={`${padding} rounded-full font-medium flex items-center gap-1.5 bg-red-600 text-red-50 border border-red-700`}>
        <XCircle className={`${iconSize}`} />
        <span className={textSize}>Failed</span>
      </div>
    );
  }

  return (
    <div className={`${padding} rounded-full font-medium flex items-center gap-1.5 bg-gray-600 text-gray-50 border border-gray-700`}>
      <span className={textSize}>{status || 'Unknown'}</span>
    </div>
  );
}
