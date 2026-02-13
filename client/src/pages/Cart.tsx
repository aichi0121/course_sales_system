import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Trash2, ArrowLeft, Tag, Gift } from "lucide-react";
import { useLocation } from "wouter";

export default function Cart() {
  const { items, removeItem, totalAmount, discountAmount, finalAmount, itemCount, discountInfo } = useCart();
  const [, setLocation] = useLocation();



  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center h-16 gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">購物車</h1>
          {itemCount > 0 && <Badge variant="secondary">{itemCount} 門課程</Badge>}
        </div>
      </header>

      <main className="container py-8 max-w-3xl mx-auto">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">購物車是空的</p>
            <Button onClick={() => setLocation("/")}>瀏覽課程</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">課程清單 ({itemCount} 門)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map(item => (
                  <div key={item.courseId} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.courseName}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">NT${item.price.toLocaleString()}</p>
                        {item.price > 500 && (
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">高價課程</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.courseId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Current Promo Applied */}
            {discountInfo.promoName && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <Gift className="h-4 w-4 shrink-0" />
                <span>
                  已套用 <strong>{discountInfo.promoName}</strong> 優惠！
                  {discountInfo.freeCount > 0 && ` 免費 ${discountInfo.freeCount} 門課程`}
                </span>
              </div>
            )}

            {/* Next Promo Hint */}
            {discountInfo.nextPromoHint && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                <Tag className="h-4 w-4 shrink-0" />
                <span>{discountInfo.nextPromoHint}</span>
              </div>
            )}

            {/* Premium Course Notice */}
            {discountInfo.hasPremium && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm">
                <Tag className="h-4 w-4 shrink-0" />
                <span>含高價課程，以半價計入優惠金額（預估金額，最終以確認為準）</span>
              </div>
            )}

            {/* Summary */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>小計（{itemCount} 門）</span>
                  <span>NT${totalAmount.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>折扣 {discountInfo.promoName && `(${discountInfo.promoName})`}</span>
                    <span>-NT${discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>{discountInfo.hasPremium ? "預估金額" : "應付金額"}</span>
                  <span className="text-primary">NT${finalAmount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setLocation("/")}>
                繼續選購
              </Button>
              <Button className="flex-1" onClick={() => setLocation("/checkout")}>
                前往結帳
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
