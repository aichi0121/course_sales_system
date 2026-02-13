import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Building2, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentSettings() {
  const { data: settings, isLoading } = trpc.admin.settings.getPayment.useQuery();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    payment_bank_name: "",
    payment_bank_branch: "",
    payment_bank_account: "",
    payment_bank_holder: "",
    payment_linepay_id: "",
    payment_linepay_note: "",
    payment_jkopay_id: "",
    payment_jkopay_note: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        payment_bank_name: settings.payment_bank_name || "",
        payment_bank_branch: settings.payment_bank_branch || "",
        payment_bank_account: settings.payment_bank_account || "",
        payment_bank_holder: settings.payment_bank_holder || "",
        payment_linepay_id: settings.payment_linepay_id || "",
        payment_linepay_note: settings.payment_linepay_note || "",
        payment_jkopay_id: settings.payment_jkopay_id || "",
        payment_jkopay_note: settings.payment_jkopay_note || "",
      });
    }
  }, [settings]);

  const updatePayment = trpc.admin.settings.updatePayment.useMutation({
    onSuccess: () => {
      toast.success("付款資訊已儲存！");
      utils.admin.settings.getPayment.invalidate();
    },
    onError: (err) => {
      toast.error("儲存失敗：" + err.message);
    },
  });

  const handleSave = () => {
    updatePayment.mutate({
      payment_bank_name: form.payment_bank_name || null,
      payment_bank_branch: form.payment_bank_branch || null,
      payment_bank_account: form.payment_bank_account || null,
      payment_bank_holder: form.payment_bank_holder || null,
      payment_linepay_id: form.payment_linepay_id || null,
      payment_linepay_note: form.payment_linepay_note || null,
      payment_jkopay_id: form.payment_jkopay_id || null,
      payment_jkopay_note: form.payment_jkopay_note || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">付款設定</h1>
        <p className="text-muted-foreground mt-1">
          設定各種付款方式的資訊，客戶在結帳頁面會自動顯示這些資訊。
        </p>
      </div>

      {/* Bank Transfer */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <CardTitle>銀行轉帳</CardTitle>
          </div>
          <CardDescription>客戶選擇銀行轉帳時會看到以下資訊</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">銀行名稱</Label>
              <Input
                id="bank_name"
                placeholder="例：中國信託、國泰世華"
                value={form.payment_bank_name}
                onChange={(e) => setForm(f => ({ ...f, payment_bank_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_branch">分行名稱</Label>
              <Input
                id="bank_branch"
                placeholder="例：敦南分行"
                value={form.payment_bank_branch}
                onChange={(e) => setForm(f => ({ ...f, payment_bank_branch: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_account">帳號</Label>
              <Input
                id="bank_account"
                placeholder="例：012-345678901234"
                value={form.payment_bank_account}
                onChange={(e) => setForm(f => ({ ...f, payment_bank_account: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_holder">戶名</Label>
              <Input
                id="bank_holder"
                placeholder="例：王小明"
                value={form.payment_bank_holder}
                onChange={(e) => setForm(f => ({ ...f, payment_bank_holder: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LINE Pay */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            <CardTitle>LINE Pay</CardTitle>
          </div>
          <CardDescription>客戶選擇 LINE Pay 時會看到以下資訊</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="linepay_id">LINE Pay ID / 連結</Label>
            <Input
              id="linepay_id"
              placeholder="例：LINE Pay 轉帳連結或 ID"
              value={form.payment_linepay_id}
              onChange={(e) => setForm(f => ({ ...f, payment_linepay_id: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linepay_note">備註說明</Label>
            <Textarea
              id="linepay_note"
              placeholder="例：請轉帳至此 LINE Pay 帳號，轉帳後請截圖通知"
              rows={3}
              value={form.payment_linepay_note}
              onChange={(e) => setForm(f => ({ ...f, payment_linepay_note: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* JKO Pay */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-orange-600" />
            <CardTitle>街口支付</CardTitle>
          </div>
          <CardDescription>客戶選擇街口支付時會看到以下資訊</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jkopay_id">街口支付 ID / 連結</Label>
            <Input
              id="jkopay_id"
              placeholder="例：街口支付帳號或轉帳連結"
              value={form.payment_jkopay_id}
              onChange={(e) => setForm(f => ({ ...f, payment_jkopay_id: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jkopay_note">備註說明</Label>
            <Textarea
              id="jkopay_note"
              placeholder="例：請使用街口支付轉帳，轉帳後請截圖通知"
              rows={3}
              value={form.payment_jkopay_note}
              onChange={(e) => setForm(f => ({ ...f, payment_jkopay_note: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={updatePayment.isPending}>
          {updatePayment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          儲存付款設定
        </Button>
      </div>
    </div>
  );
}
