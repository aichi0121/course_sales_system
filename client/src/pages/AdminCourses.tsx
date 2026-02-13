import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: "已完結", className: "bg-green-600 text-white" },
  ongoing: { label: "上線中", className: "bg-yellow-500 text-white" },
  upcoming: { label: "未開課", className: "bg-gray-400 text-white" },
};

type CourseForm = {
  name: string;
  description: string;
  price: number;
  link: string;
  status: "completed" | "ongoing" | "upcoming";
  scheduledAt: string;
  isPublic: boolean;
  allowExchange: boolean;
};

const emptyForm: CourseForm = {
  name: "", description: "", price: 0, link: "",
  status: "completed", scheduledAt: "", isPublic: true, allowExchange: true,
};

export default function AdminCourses() {
  const utils = trpc.useUtils();
  const { data: courses, isLoading } = trpc.admin.courses.list.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const createMutation = trpc.admin.courses.create.useMutation({
    onSuccess: () => { utils.admin.courses.list.invalidate(); setDialogOpen(false); toast.success("課程已新增"); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.admin.courses.update.useMutation({
    onSuccess: () => { utils.admin.courses.list.invalidate(); setDialogOpen(false); toast.success("課程已更新"); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.admin.courses.delete.useMutation({
    onSuccess: () => { utils.admin.courses.list.invalidate(); setDeleteId(null); toast.success("課程已刪除"); },
    onError: (err) => toast.error(err.message),
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (course: any) => {
    setEditingId(course.id);
    setForm({
      name: course.name, description: course.description || "", price: course.price,
      link: course.link || "", status: course.status, scheduledAt: course.scheduledAt ? new Date(course.scheduledAt).toISOString().split("T")[0] : "",
      isPublic: course.isPublic, allowExchange: course.allowExchange,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form, scheduledAt: form.scheduledAt || null });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">課程管理</h2>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />新增課程</Button>
      </div>

      <div className="grid gap-4">
        {courses?.map(course => {
          const status = statusConfig[course.status] || statusConfig.completed;
          return (
            <Card key={course.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{course.name}</span>
                    <Badge className={status.className}>{status.label}</Badge>
                    {!course.isPublic && <Badge variant="outline" className="text-xs"><EyeOff className="h-3 w-3 mr-1" />隱藏</Badge>}
                    {course.source === "exchange" && <Badge variant="secondary" className="text-xs">交換：{course.sourceTeacher}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{course.description || "無簡介"}</p>
                  <p className="text-sm font-medium text-primary mt-1">NT${course.price.toLocaleString()}</p>
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
        {(!courses || courses.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">尚無課程，點擊「新增課程」開始</div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "編輯課程" : "新增課程"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>課程名稱 *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>課程簡介</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>價格 (NT$)</Label>
                <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>狀態</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">已完結</SelectItem>
                    <SelectItem value="ongoing">上線中</SelectItem>
                    <SelectItem value="upcoming">未開課</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>課程連結</Label>
              <Input value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} placeholder="Google Drive 或 YouTube 連結" />
            </div>
            {form.status === "upcoming" && (
              <div className="space-y-2">
                <Label>預定開課日期</Label>
                <Input type="date" value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>公開顯示</Label>
              <Switch checked={form.isPublic} onCheckedChange={v => setForm(p => ({ ...p, isPublic: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>開放交換</Label>
              <Switch checked={form.allowExchange} onCheckedChange={v => setForm(p => ({ ...p, allowExchange: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={!form.name || createMutation.isPending || updateMutation.isPending}>
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
