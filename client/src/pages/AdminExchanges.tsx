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
  pending: { label: "待審核", className: "bg-yellow-500 text-white" },
  accepted: { label: "已接受", className: "bg-green-600 text-white" },
  rejected: { label: "已拒絕", className: "bg-red-500 text-white" },
  awaiting_course: { label: "待收課程", className: "bg-blue-500 text-white" },
  completed: { label: "已完成", className: "bg-gray-600 text-white" },
};

const methodLabels: Record<string, string> = {
  account_password: "帳號密碼",
  original_file: "原檔",
  recording: "錄影",
};

export default function AdminExchanges() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<string>("all");
  const { data: exchanges, isLoading } = trpc.admin.exchanges.list.useQuery(
    filter === "all" ? undefined : { status: filter }
  );
  const [detailExchange, setDetailExchange] = useState<any>(null);

  const updateStatus = trpc.admin.exchanges.updateStatus.useMutation({
    onSuccess: () => {
      utils.admin.exchanges.list.invalidate();
      toast.success("交換狀態已更新");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">交換管理</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="篩選狀態" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="pending">待審核</SelectItem>
            <SelectItem value="accepted">已接受</SelectItem>
            <SelectItem value="rejected">已拒絕</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {exchanges?.map(exchange => {
          const status = statusConfig[exchange.status] || statusConfig.pending;
          return (
            <Card key={exchange.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailExchange(exchange)}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-medium">{exchange.exchangeNumber}</span>
                    <Badge className={status.className}>{status.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {exchange.applicantName} · 想要：{exchange.wantedCourseName} · 提供：{exchange.offeredCourseName}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-xs text-muted-foreground">{new Date(exchange.createdAt).toLocaleDateString("zh-TW")}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!exchanges || exchanges.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">暫無交換申請</div>
        )}
      </div>

      {/* Exchange Detail Dialog */}
      <Dialog open={!!detailExchange} onOpenChange={() => setDetailExchange(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>交換申請詳情</DialogTitle>
          </DialogHeader>
          {detailExchange && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">申請編號</p>
                  <p className="font-mono font-medium">{detailExchange.exchangeNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">申請時間</p>
                  <p>{new Date(detailExchange.createdAt).toLocaleString("zh-TW")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">申請人</p>
                  <p>{detailExchange.applicantName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">LINE ID</p>
                  <p>{detailExchange.applicantLineId || "未提供"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">手機</p>
                  <p>{detailExchange.applicantPhone || "未提供"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">提供方式</p>
                  <p>{methodLabels[detailExchange.provideMethod] || detailExchange.provideMethod}</p>
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">想要的課程</span>
                  <span className="font-medium">{detailExchange.wantedCourseName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">提供的課程</span>
                  <span className="font-medium">{detailExchange.offeredCourseName}</span>
                </div>
                {detailExchange.offeredCourseDescription && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">課程簡介</p>
                    <p className="mt-1">{detailExchange.offeredCourseDescription}</p>
                  </div>
                )}
              </div>

              {detailExchange.rejectReason && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-sm">
                  <p className="font-medium text-red-800">拒絕原因</p>
                  <p>{detailExchange.rejectReason}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">更新狀態</p>
                <div className="flex gap-2 flex-wrap">
                  {(["pending", "accepted", "rejected", "awaiting_course", "completed"] as const).map(s => {
                    const cfg = statusConfig[s];
                    const isCurrent = detailExchange.status === s;
                    return (
                      <Button
                        key={s}
                        size="sm"
                        variant={isCurrent ? "default" : "outline"}
                        disabled={isCurrent || updateStatus.isPending}
                        onClick={() => {
                          updateStatus.mutate({ id: detailExchange.id, status: s });
                          setDetailExchange({ ...detailExchange, status: s });
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
