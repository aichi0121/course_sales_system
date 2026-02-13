import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Search, User } from "lucide-react";
import { toast } from "sonner";

export default function AdminCustomers() {
  const utils = trpc.useUtils();
  const { data: customers, isLoading } = trpc.admin.customers.list.useQuery();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const { data: customerDetail } = trpc.admin.customers.getById.useQuery(
    { id: detailId! },
    { enabled: !!detailId }
  );

  const updateCustomer = trpc.admin.customers.update.useMutation({
    onSuccess: () => {
      utils.admin.customers.list.invalidate();
      utils.admin.customers.getById.invalidate();
      toast.success("備註已更新");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredCustomers = customers?.filter(c => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return c.name.toLowerCase().includes(kw) ||
      c.lineName?.toLowerCase().includes(kw) ||
      c.lineId?.toLowerCase().includes(kw);
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">客戶管理</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="搜尋客戶（姓名、LINE 名稱、LINE ID）"
          value={searchKeyword}
          onChange={e => setSearchKeyword(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filteredCustomers?.map(customer => (
          <Card key={customer.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
            setDetailId(customer.id);
            setNotes(customer.notes || "");
          }}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-muted-foreground">
                  {customer.lineName && `LINE: ${customer.lineName}`}
                  {customer.lineId && ` · ID: ${customer.lineId}`}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{new Date(customer.createdAt).toLocaleDateString("zh-TW")}</p>
            </CardContent>
          </Card>
        ))}
        {(!filteredCustomers || filteredCustomers.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            {searchKeyword ? "找不到符合的客戶" : "暫無客戶資料"}
          </div>
        )}
      </div>

      {/* Customer Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>客戶詳情</DialogTitle>
          </DialogHeader>
          {customerDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">姓名</p>
                  <p className="font-medium">{customerDetail.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">LINE 名稱</p>
                  <p>{customerDetail.lineName || "未提供"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">LINE ID</p>
                  <p>{customerDetail.lineId || "未提供"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">建立時間</p>
                  <p>{new Date(customerDetail.createdAt).toLocaleDateString("zh-TW")}</p>
                </div>
              </div>

              {customerDetail.orders && customerDetail.orders.length > 0 && (
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="font-medium text-sm">購買記錄</p>
                  {customerDetail.orders.map((order: any) => (
                    <div key={order.id} className="flex justify-between text-sm border-b last:border-0 pb-2">
                      <div>
                        <p className="font-mono">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("zh-TW")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">NT${order.finalAmount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{order.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">備註</p>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="新增備註..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailId(null)}>關閉</Button>
            <Button
              onClick={() => detailId && updateCustomer.mutate({ id: detailId, notes })}
              disabled={updateCustomer.isPending}
            >
              {updateCustomer.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              儲存備註
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
