import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

export type CartItem = {
  courseId: number;
  courseName: string;
  price: number;
};

export type DiscountInfo = {
  originalTotal: number;
  discountAmount: number;
  finalAmount: number;
  freeCount: number;
  promoName: string;
  hasPremium: boolean;
  nextPromoHint: string;
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
  discountInfo: DiscountInfo;
  isInCart: (courseId: number) => boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * 優惠方案計算（與後端 calculateDiscount 同步）
 * - 精確匹配：5 門 → 買 4 送 1、12 門 → 買 9 送 3、14 門 → 買 10 送 4
 * - 其他數量照原價
 * - 高價課程（> 500）砍半後額外加入付費金額
 */
function calculateDiscount(items: CartItem[]): DiscountInfo {
  const totalCount = items.length;
  const normalItems = items.filter(i => i.price <= 500);
  const premiumItems = items.filter(i => i.price > 500);

  let paidNormalCount = normalItems.length;
  let freeCount = 0;
  let promoName = "";
  let nextPromoHint = "";

  if (totalCount === 14 || totalCount > 14) {
    paidNormalCount = Math.min(10, normalItems.length);
    freeCount = Math.max(0, normalItems.length - paidNormalCount);
    promoName = "買10送4";
  } else if (totalCount === 12 || totalCount === 13) {
    paidNormalCount = Math.min(9, normalItems.length);
    freeCount = Math.max(0, normalItems.length - paidNormalCount);
    promoName = "買9送3";
    nextPromoHint = `再加 ${14 - totalCount} 門即可升級為「買10送4」優惠！`;
  } else if (totalCount === 5) {
    paidNormalCount = Math.min(4, normalItems.length);
    freeCount = Math.max(0, normalItems.length - paidNormalCount);
    promoName = "買4送1";
    nextPromoHint = "再加 7 門即可升級為「買9送3」優惠！";
  } else {
    paidNormalCount = normalItems.length;
    freeCount = 0;
    if (totalCount > 0 && totalCount < 5) {
      nextPromoHint = `再加 ${5 - totalCount} 門即可享有「買4送1」優惠！`;
    } else if (totalCount > 5 && totalCount < 12) {
      nextPromoHint = `再加 ${12 - totalCount} 門即可享有「買9送3」優惠！`;
    } else if (totalCount === 13) {
      nextPromoHint = "再加 1 門即可享有「買10送4」優惠！";
    }
  }

  const normalTotal = paidNormalCount * 500;
  const premiumTotal = premiumItems.reduce((sum, i) => sum + Math.round(i.price / 2), 0);
  const originalTotal = items.reduce((sum, i) => sum + i.price, 0);
  const finalAmount = normalTotal + premiumTotal;
  const discountAmount = originalTotal - finalAmount;

  return {
    originalTotal,
    discountAmount,
    finalAmount,
    freeCount,
    promoName,
    hasPremium: premiumItems.length > 0,
    nextPromoHint,
  };
}

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

  const discountInfo = useMemo(() => calculateDiscount(items), [items]);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, clearCart,
      itemCount: items.length,
      totalAmount: discountInfo.originalTotal,
      discountAmount: discountInfo.discountAmount,
      finalAmount: discountInfo.finalAmount,
      discountInfo,
      isInCart,
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
