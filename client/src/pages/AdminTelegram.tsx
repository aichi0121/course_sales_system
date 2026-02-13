import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminTelegram() {
  const [message, setMessage] = useState("");

  const testMutation = trpc.admin.telegram.test.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("測試訊息已發送！請查看 Telegram");
      } else {
        toast.error("發送失敗，請檢查 Bot Token 和 Chat ID 設定");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const sendMutation = trpc.admin.telegram.sendMessage.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("訊息已發送！");
        setMessage("");
      } else {
        toast.error("發送失敗");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Telegram Bot</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">連線測試</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            點擊下方按鈕測試 Telegram Bot 是否正常連線。
          </p>
          <Button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
          >
            {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            發送測試訊息
          </Button>
          {testMutation.data && (
            <div className={`flex items-center gap-2 text-sm ${testMutation.data.success ? "text-green-600" : "text-red-600"}`}>
              {testMutation.data.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testMutation.data.success ? "連線成功！" : "連線失敗，請檢查設定"}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">發送自訂訊息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="輸入要發送到 Telegram 的訊息..."
            rows={4}
          />
          <Button
            onClick={() => sendMutation.mutate({ message })}
            disabled={!message.trim() || sendMutation.isPending}
          >
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            發送訊息
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bot 指令說明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-1">一般銷售</p>
              <code className="text-xs bg-muted p-1 rounded">/paid [訂單編號]</code> - 確認收款並生成課程連結訊息
            </div>
            <div>
              <p className="font-medium mb-1">課程交換</p>
              <div className="space-y-1">
                <p><code className="text-xs bg-muted p-1 rounded">/accept [交換編號]</code> - 接受交換</p>
                <p><code className="text-xs bg-muted p-1 rounded">/reject [交換編號] [原因]</code> - 拒絕交換</p>
                <p><code className="text-xs bg-muted p-1 rounded">/received [交換編號] [課程資訊]</code> - 記錄收到課程</p>
              </div>
            </div>
            <div>
              <p className="font-medium mb-1">課程管理</p>
              <div className="space-y-1">
                <p><code className="text-xs bg-muted p-1 rounded">/course list</code> - 課程清單</p>
                <p><code className="text-xs bg-muted p-1 rounded">/course add [名稱] [價格] [連結] [狀態]</code> - 新增課程</p>
                <p><code className="text-xs bg-muted p-1 rounded">/course publish [名稱]</code> - 公開課程</p>
                <p><code className="text-xs bg-muted p-1 rounded">/course hide [名稱]</code> - 隱藏課程</p>
              </div>
            </div>
            <div>
              <p className="font-medium mb-1">查詢統計</p>
              <div className="space-y-1">
                <p><code className="text-xs bg-muted p-1 rounded">/today</code> - 今日統計</p>
                <p><code className="text-xs bg-muted p-1 rounded">/pending</code> - 待處理項目</p>
                <p><code className="text-xs bg-muted p-1 rounded">/stats</code> - 本月統計</p>
                <p><code className="text-xs bg-muted p-1 rounded">/check [編號]</code> - 查詢詳情</p>
                <p><code className="text-xs bg-muted p-1 rounded">/customer [名稱]</code> - 查詢客戶</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
