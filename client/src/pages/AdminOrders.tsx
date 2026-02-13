import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "待付款", className: "bg-gray-500 text-white" },
  awaiting_confirmation: { label: "待確認", className: "bg-yellow-500 text-white" },
  paid: { label: "已付款", className: "bg-green-600 text-white" },
  completed: { label: "已完成", className: "bg-blue-600 text-white" },
  cancelled: { label: "已取消", className: "bg-red-500 text-white" },
};

export default function AdminOrders() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<string>("all");
  const { data: orders, isLoading } = trpc.admin.orders.list.useQuery(
    filter === "all" ? undefined : { status: filter }
  );
  const [detailOrder, setDetailOrder] = useState<any>(null);

  const updateStatus = trpc.admin.orders.updateStatus.useMutation({
    onSuccess: () => {
      utils.admin.orders.list.invalidate();
      toast.success("訂單狀態已更新");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">訂單管理</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="篩選狀態" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="pending">待付款</SelectItem>
            <SelectItem value="awaiting_confirmation">待確認</SelectItem>
            <SelectItem value="paid">已付款</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {orders?.map(order => {
          const status = statusConfig[order.status] || statusConfig.pending;
          return (
            <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailOrder(order)}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-medium">{order.orderNumber}</span>
                    <Badge className={status.className}>{status.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.customer?.name || "未知客戶"} · {order.items?.map((i: any) => i.courseName).join(", ")}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-bold text-primary">NT${order.finalAmount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("zh-TW")}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!orders || orders.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">暫無訂單</div>
        )}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>訂單詳情</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">訂單編號</p>
                  <p className="font-mono font-medium">{detailOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">下單時間</p>
                  <p>{new Date(detailOrder.createdAt).toLocaleString("zh-TW")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">客戶姓名</p>
                  <p>{detailOrder.customer?.name || "未知"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">LINE ID</p>
                  <p>{detailOrder.customer?.lineId || "未提供"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">手機</p>
                  <p>{detailOrder.customer?.phone || "未提供"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">付款方式</p>
                  <p>{detailOrder.paymentMethod || "未選擇"}</p>
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <p className="font-medium text-sm">課程項目</p>
                {detailOrder.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.courseName}</span>
                    <span>NT${item.price.toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>小計</span>
                    <span>NT${detailOrder.totalAmount.toLocaleString()}</span>
                  </div>
                  {detailOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>折扣</span>
                      <span>-NT${detailOrder.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>應付金額</span>
                    <span>NT${detailOrder.finalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">更新狀態</p>
                <div className="flex gap-2 flex-wrap">
                  {(["pending", "awaiting_confirmation", "paid", "completed", "cancelled"] as const).map(s => {
                    const cfg = statusConfig[s];
                    const isCurrent = detailOrder.status === s;
                    return (
                      <Button
                        key={s}
                        size="sm"
                        variant={isCurrent ? "default" : "outline"}
                        disabled={isCurrent || updateStatus.isPending}
                        onClick={() => {
                          updateStatus.mutate({ id: detailOrder.id, status: s });
                          setDetailOrder({ ...detailOrder, status: s });
                        }}
                      >
                        {cfg.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
