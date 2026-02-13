import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, EyeOff } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "理財｜投資", "商業｜工作學", "內容創作｜行銷", "自我成長",
  "人際關係", "數位工具｜AI", "語言｜學習", "健康｜身心靈",
  "美妝｜保養", "居家生活", "法律｜知識",
] as const;

const STATUSES = ["已完結", "上線中", "未開課"] as const;

const statusConfig: Record<string, { label: string; className: string }> = {
  "已完結": { label: "已完結", className: "bg-gray-500 text-white" },
  "上線中": { label: "上線中", className: "bg-green-600 text-white" },
  "未開課": { label: "未開課", className: "bg-yellow-500 text-white" },
};

type CourseForm = {
  name: string;
  teacher: string;
  description: string;
  price: number;
  startDate: string;
  totalHours: string;
  status: typeof STATUSES[number];
  platform: string;
  category: typeof CATEGORIES[number];
  syllabus: string;
  originalUrl: string;
  imageUrl: string;
  ytLink: string;
  cloudLink: string;
  isPublic: boolean;
  allowExchange: boolean;
};

const emptyForm: CourseForm = {
  name: "", teacher: "", description: "", price: 500,
  startDate: "", totalHours: "", status: "未開課",
  platform: "", category: "自我成長", syllabus: "",
  originalUrl: "", imageUrl: "", ytLink: "", cloudLink: "",
  isPublic: true, allowExchange: true,
};

export default function AdminCourses() {
  const utils = trpc.useUtils();
  const { data: courses, isLoading } = trpc.admin.courses.list.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const createMutation = trpc.admin.courses.create.useMutation({
    onSuccess: () => { utils.admin.courses.list.invalidate(); setDialogOpen(false); toast.success("課程已新增"); },
    onError: (err: any) => toast.error(err.message),
  });
  const updateMutation = trpc.admin.courses.update.useMutation({
    onSuccess: () => { utils.admin.courses.list.invalidate(); setDialogOpen(false); toast.success("課程已更新"); },
    onError: (err: any) => toast.error(err.message),
  });
  const deleteMutation = trpc.admin.courses.delete.useMutation({
    onSuccess: () => { utils.admin.courses.list.invalidate(); setDeleteId(null); toast.success("課程已刪除"); },
    onError: (err: any) => toast.error(err.message),
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (course: any) => {
    setEditingId(course.id);
    setForm({
      name: course.name,
      teacher: course.teacher || "",
      description: course.description || "",
      price: course.price,
      startDate: course.startDate ? new Date(course.startDate).toISOString().split("T")[0] : "",
      totalHours: course.totalHours || "",
      status: course.status,
      platform: course.platform || "",
      category: course.category,
      syllabus: course.syllabus || "",
      originalUrl: course.originalUrl || "",
      imageUrl: course.imageUrl || "",
      ytLink: course.ytLink || "",
      cloudLink: course.cloudLink || "",
      isPublic: course.isPublic,
      allowExchange: course.allowExchange,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = {
      ...form,
      startDate: form.startDate || undefined,
      totalHours: form.totalHours || undefined,
      platform: form.platform || undefined,
      syllabus: form.syllabus || undefined,
      originalUrl: form.originalUrl || undefined,
      imageUrl: form.imageUrl || undefined,
      ytLink: form.ytLink || undefined,
      cloudLink: form.cloudLink || undefined,
      teacher: form.teacher || undefined,
      description: form.description || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload } as any);
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const filteredCourses = courses?.filter(c => {
    if (filterCategory === "all") return true;
    return c.category === filterCategory;
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold tracking-tight">課程管理</h2>
        <div className="flex items-center gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-44"><SelectValue placeholder="篩選類別" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部類別</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />新增課程</Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">共 {filteredCourses?.length || 0} 門課程</div>

      <div className="grid gap-4">
        {filteredCourses?.map(course => {
          const status = statusConfig[course.status] || statusConfig["未開課"];
          return (
            <Card key={course.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {course.imageUrl && (
                    <img src={course.imageUrl} alt={course.name} className="w-16 h-16 rounded object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium truncate">{course.name}</span>
                      <Badge className={status.className}>{status.label}</Badge>
                      <Badge variant="outline" className="text-xs">{course.category}</Badge>
                      {course.platform && <Badge variant="secondary" className="text-xs">{course.platform}</Badge>}
                      {!course.isPublic && <Badge variant="outline" className="text-xs"><EyeOff className="h-3 w-3 mr-1" />隱藏</Badge>}
                      {course.source === "交換" && <Badge variant="secondary" className="text-xs">交換</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {course.teacher && `${course.teacher} · `}
                      {course.description || "無簡介"}
                    </p>
                    <p className="text-sm font-medium text-primary mt-1">NT${course.price.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(course)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(course.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!filteredCourses || filteredCourses.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            {filterCategory !== "all" ? "此類別尚無課程" : "尚無課程，點擊「新增課程」開始"}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "編輯課程" : "新增課程"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>課程名稱 *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>講師</Label>
                <Input value={form.teacher} onChange={e => setForm(p => ({ ...p, teacher: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>課程描述</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>價格 (NT$)</Label>
                <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>開課狀態</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>課程類別 *</Label>
                <Select value={form.category} onValueChange={(v: any) => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>課程平台</Label>
                <Input value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))} placeholder="例：Hahow、知識衛星" />
              </div>
              <div className="space-y-2">
                <Label>開課時間</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>總時數</Label>
                <Input value={form.totalHours} onChange={e => setForm(p => ({ ...p, totalHours: e.target.value }))} placeholder="例：10小時" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>課程課綱</Label>
              <Textarea value={form.syllabus} onChange={e => setForm(p => ({ ...p, syllabus: e.target.value }))} rows={4} placeholder="輸入課程課綱內容，前端會顯示給客人看" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>課程圖片 URL</Label>
                <Input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="圖片網址" />
              </div>
              <div className="space-y-2">
                <Label>課程原網站連結</Label>
                <Input value={form.originalUrl} onChange={e => setForm(p => ({ ...p, originalUrl: e.target.value }))} placeholder="前端課程名稱可點擊跳轉" />
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">以下欄位僅後台可見</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>課程 YT 連結</Label>
                  <Input value={form.ytLink} onChange={e => setForm(p => ({ ...p, ytLink: e.target.value }))} placeholder="YouTube 連結" />
                </div>
                <div className="space-y-2">
                  <Label>雲端連結</Label>
                  <Input value={form.cloudLink} onChange={e => setForm(p => ({ ...p, cloudLink: e.target.value }))} placeholder="Google Drive 等雲端連結" />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>公開顯示</Label>
                <Switch checked={form.isPublic} onCheckedChange={v => setForm(p => ({ ...p, isPublic: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>開放交換</Label>
                <Switch checked={form.allowExchange} onCheckedChange={v => setForm(p => ({ ...p, allowExchange: v }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.category || createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "儲存" : "新增"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>確定要刪除此課程嗎？此操作無法復原。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}>
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
