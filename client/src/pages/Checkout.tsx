import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Loader2, CheckCircle2, Copy } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type CheckoutStep = "info" | "confirm" | "payment" | "done";

export default function Checkout() {
  const { items, totalAmount, discountAmount, finalAmount, discountInfo, clearCart, itemCount } = useCart();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<CheckoutStep>("info");
  const [form, setForm] = useState({
    name: "",
    lineName: "",
    lineId: "",
    email: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [orderResult, setOrderResult] = useState<{ orderId: number; orderNumber: string; finalAmount: number } | null>(null);

  const createOrder = trpc.order.create.useMutation({
    onSuccess: (data) => {
      setOrderResult(data);
      setStep("payment");
    },
    onError: (err) => {
      toast.error("訂單建立失敗：" + err.message);
    },
  });

  const notifyPayment = trpc.order.notifyPayment.useMutation({
    onSuccess: () => {
      setStep("done");
      clearCart();
    },
    onError: (err) => {
      toast.error("通知失敗：" + err.message);
    },
  });

  if (items.length === 0 && !orderResult) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">購物車是空的</p>
          <Button onClick={() => setLocation("/")}>回到首頁</Button>
        </div>
      </div>
    );
  }

  const paymentMethodLabels: Record<string, string> = {
    bank_transfer: "銀行轉帳",
    line_pay: "LINE Pay",
    jko_pay: "街口支付",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center h-16 gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            if (step === "info") setLocation("/cart");
            else if (step === "confirm") setStep("info");
          }} disabled={step === "payment" || step === "done"}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">
            {step === "info" && "填寫資料"}
            {step === "confirm" && "確認訂單"}
            {step === "payment" && "付款資訊"}
            {step === "done" && "訂單完成"}
          </h1>
        </div>
      </header>

      <main className="container py-8 max-w-2xl mx-auto">
        {/* Step: Info */}
        {step === "info" && (
          <Card>
            <CardHeader>
              <CardTitle>聯絡資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">姓名 *</Label>
                <Input id="name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="請輸入姓名" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lineName">LINE 名稱 *</Label>
                <Input id="lineName" value={form.lineName} onChange={e => setForm(p => ({ ...p, lineName: e.target.value }))} placeholder="請輸入 LINE 名稱" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lineId">LINE ID</Label>
                <Input id="lineId" value={form.lineId} onChange={e => setForm(p => ({ ...p, lineId: e.target.value }))} placeholder="請輸入 LINE ID（選填）" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email（選填）</Label>
                <Input id="email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="請輸入 Email" />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>付款方式</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bank_transfer" id="bank" />
                    <Label htmlFor="bank">銀行轉帳</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="line_pay" id="linepay" />
                    <Label htmlFor="linepay">LINE Pay</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="jko_pay" id="jko" />
                    <Label htmlFor="jko">街口支付</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                className="w-full"
                disabled={!form.name || !form.lineName}
                onClick={() => setStep("confirm")}
              >
                下一步：確認訂單
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>訂單確認</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">姓名：</span>{form.name}</p>
                  <p><span className="text-muted-foreground">LINE 名稱：</span>{form.lineName}</p>
                  {form.lineId && <p><span className="text-muted-foreground">LINE ID：</span>{form.lineId}</p>}
                  {form.email && <p><span className="text-muted-foreground">Email：</span>{form.email}</p>}
                  <p><span className="text-muted-foreground">付款方式：</span>{paymentMethodLabels[paymentMethod]}</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.courseId} className="flex justify-between text-sm">
                      <span>{item.courseName}</span>
                      <span>NT${item.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>小計（{itemCount} 門）</span>
                    <span>NT${totalAmount.toLocaleString()}</span>
                  </div>
                  {discountInfo.promoName && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>優惠（{discountInfo.promoName}）</span>
                      <span>-NT${discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {discountInfo.hasPremium && (
                    <p className="text-xs text-amber-600">
                      含高價課程，金額為預估值，最終金額以管理員確認為準
                    </p>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2">
                    <span>應付金額</span>
                    <span className="text-primary">NT${finalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("info")}>
                返回修改
              </Button>
              <Button
                className="flex-1"
                disabled={createOrder.isPending}
                onClick={() => {
                  createOrder.mutate({
                    customerName: form.name,
                    customerLineName: form.lineName || undefined,
                    customerLineId: form.lineId || undefined,
                    paymentMethod,
                    items: items.map(i => ({
                      courseId: i.courseId,
                      courseName: i.courseName,
                      price: i.price,
                    })),
                  });
                }}
              >
                {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                送出訂單
              </Button>
            </div>
          </div>
        )}

        {/* Step: Payment */}
        {step === "payment" && orderResult && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>付款資訊</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <p><span className="font-medium">訂單編號：</span>{orderResult.orderNumber}</p>
                  <p><span className="font-medium">應付金額：</span>
                    <span className="text-primary font-bold text-lg">NT${orderResult.finalAmount.toLocaleString()}</span>
                  </p>
                  <p><span className="font-medium">付款方式：</span>{paymentMethodLabels[paymentMethod]}</p>
                </div>

                {paymentMethod === "bank_transfer" && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2 text-sm">
                    <p className="font-medium text-blue-800">銀行轉帳資訊</p>
                    <p>請轉帳至以下帳戶後，點擊「我已付款」按鈕通知我們。</p>
                    <div className="bg-white p-3 rounded border space-y-1">
                      <p>銀行：（請聯繫管理員取得帳戶資訊）</p>
                    </div>
                  </div>
                )}

                {paymentMethod === "line_pay" && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-sm">
                    <p className="font-medium text-green-800">LINE Pay 付款</p>
                    <p>請透過 LINE Pay 轉帳後，點擊「我已付款」按鈕通知我們。</p>
                  </div>
                )}

                {paymentMethod === "jko_pay" && (
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg text-sm">
                    <p className="font-medium text-orange-800">街口支付</p>
                    <p>請透過街口支付付款後，點擊「我已付款」按鈕通知我們。</p>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  disabled={notifyPayment.isPending}
                  onClick={() => notifyPayment.mutate({ orderId: orderResult.orderId })}
                >
                  {notifyPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  我已付款
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && orderResult && (
          <Card>
            <CardContent className="pt-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">已收到您的付款通知！</h2>
              <p className="text-muted-foreground">
                訂單編號：<span className="font-mono font-medium">{orderResult.orderNumber}</span>
              </p>
              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <p>我們會盡快確認您的付款，並透過 LINE 聯繫您提供課程連結。</p>
                <p>請耐心等候，感謝您的購買！</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(orderResult.orderNumber);
                  toast.success("訂單編號已複製");
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                複製訂單編號
              </Button>
              <div>
                <Button onClick={() => setLocation("/")} className="mt-2">
                  回到首頁
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
