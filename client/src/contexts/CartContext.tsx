import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type CartItem = {
  courseId: number;
  courseName: string;
  price: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (courseId: number) => void;
  clearCart: () => void;
  itemCount: number;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  isInCart: (courseId: number) => boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      if (prev.find(i => i.courseId === item.courseId)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((courseId: number) => {
    setItems(prev => prev.filter(i => i.courseId !== courseId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const isInCart = useCallback((courseId: number) => {
    return items.some(i => i.courseId === courseId);
  }, [items]);

  const totalAmount = items.reduce((sum, i) => sum + i.price, 0);
  const itemCount = items.length;
  let discountAmount = 0;
  if (itemCount >= 3) discountAmount = Math.round(totalAmount * 0.15);
  else if (itemCount >= 2) discountAmount = Math.round(totalAmount * 0.10);
  const finalAmount = totalAmount - discountAmount;

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, clearCart,
      itemCount, totalAmount, discountAmount, finalAmount, isInCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
