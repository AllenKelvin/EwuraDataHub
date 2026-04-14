import { createContext, useContext, useState } from "react";

export interface CartItem {
  productId: string;
  network: "MTN" | "Telecel" | "AirtelTigo";
  name: string;
  description: string;
  userPrice: number;
  agentPrice: number;
  dataAmount: string;
  recipientPhone: string;
}

interface CartContextType {
  item: CartItem | null;
  setItem: (item: CartItem | null) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType>({
  item: null,
  setItem: () => {},
  clearCart: () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [item, setItemState] = useState<CartItem | null>(null);
  return (
    <CartContext.Provider value={{ item, setItem: setItemState, clearCart: () => setItemState(null) }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
