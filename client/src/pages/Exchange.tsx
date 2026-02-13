import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Loader2, CheckCircle2, Copy } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";

export default function Exchange() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const courseId = parseInt(params.get("courseId") || "0");
  const courseName = params.get("courseName") || "";

  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ exchangeNumber: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    lineName: "",
    lineId: "",
    offeredCourseName: "",
    offeredCourseDescription: "",
    exchangeMethod: "帳號" as "帳號" | "下載原檔" | "錄影",
  });

  const createExchange = trpc.exchange.create.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error("申請失敗：" + err.message);
    },
  });

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="container flex items-center h-16 gap-4">
            <h1 className="text-xl font-bold">申請已送出</h1>
          </div>
        </header>
        <main className="container py-8 max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">課程交換申請已送出！</h2>
              <p className="text-muted-foreground">
                申請編號：<span className="font-mono font-medium">{result.exchangeNumber}</span>
              </p>
              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <p>我們會盡快審核您的申請。</p>
                <p>審核結果將透過 LINE 通知您。</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(result.exchangeNumber);
                  toast.success("申請編號已複製");
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                複製申請編號
              </Button>
              <div>
                <Button onClick={() => setLocation("/")} className="mt-2">
                  回到首頁
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center h-16 gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">課程交換申請</h1>
        </div>
      </header>

      <main className="container py-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>交換申請表單</CardTitle>
            {courseName && (
              <p className="text-sm text-muted-foreground">
                您想交換的課程：<span className="font-medium text-foreground">{courseName}</span>
              </p>
            )}
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
              <Label htmlFor="offeredCourse">您要交換給我的課程名稱 *</Label>
              <Input id="offeredCourse" value={form.offeredCourseName} onChange={e => setForm(p => ({ ...p, offeredCourseName: e.target.value }))} placeholder="請輸入您要提供的課程名稱" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">課程簡介（選填）</Label>
              <Textarea id="description" value={form.offeredCourseDescription} onChange={e => setForm(p => ({ ...p, offeredCourseDescription: e.target.value }))} placeholder="請簡述您的課程內容，方便我們評估" rows={4} />
            </div>
            <div className="space-y-3">
              <Label>交換方式 *</Label>
              <RadioGroup value={form.exchangeMethod} onValueChange={(v: any) => setForm(p => ({ ...p, exchangeMethod: v }))}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="帳號" id="ap" />
                  <Label htmlFor="ap">帳號（課程平台帳號）</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="下載原檔" id="of" />
                  <Label htmlFor="of">下載原檔（影片檔案）</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="錄影" id="rec" />
                  <Label htmlFor="rec">錄影（重新錄製）</Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              className="w-full"
              disabled={!form.name || !form.lineName || !form.offeredCourseName || createExchange.isPending}
              onClick={() => {
                createExchange.mutate({
                  applicantName: form.name,
                  applicantLineName: form.lineName,
                  applicantLineId: form.lineId || undefined,
                  wantedCourseId: courseId || undefined,
                  wantedCourseName: courseName || undefined,
                  offeredCourseName: form.offeredCourseName,
                  offeredCourseDescription: form.offeredCourseDescription || undefined,
                  exchangeMethod: form.exchangeMethod,
                });
              }}
            >
              {createExchange.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              送出申請
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
