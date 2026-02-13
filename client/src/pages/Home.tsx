import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, ArrowRightLeft, BookOpen, Loader2, Filter, ChevronDown, ChevronUp, Clock, User as UserIcon, Layers } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const statusConfig: Record<string, { label: string; className: string }> = {
  "已完結": { label: "已完結", className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  "上線中": { label: "上線中", className: "bg-amber-500 hover:bg-amber-600 text-white" },
  "未開課": { label: "未開課", className: "bg-gray-400 hover:bg-gray-500 text-white" },
};

// 常用平台列表
const MAIN_PLATFORMS = ["知識衛星", "師父", "Hahow", "Work up", "PressPlay", "學籽", "雷蒙三十"];

export default function Home() {
  const { data: courses, isLoading } = trpc.course.list.useQuery();
  const { data: platforms } = trpc.course.platforms.useQuery();
  const { data: categories } = trpc.course.categories.useQuery();
  const { addItem, isInCart, itemCount, discountInfo } = useCart();
  const [, setLocation] = useLocation();

  // 篩選狀態
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("全部");
  const [selectedStatus, setSelectedStatus] = useState<string>("全部");
  const [showFilters, setShowFilters] = useState(false);

  // 平台分組：常用 + 其他
  const platformGroups = useMemo(() => {
    if (!platforms) return { main: [], other: [] };
    const main = MAIN_PLATFORMS.filter(p => platforms.includes(p));
    const other = platforms.filter(p => !MAIN_PLATFORMS.includes(p));
    return { main, other };
  }, [platforms]);

  // 篩選課程
  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter(c => {
      if (selectedCategory !== "全部" && c.category !== selectedCategory) return false;
      if (selectedPlatform !== "全部") {
        if (selectedPlatform === "其他") {
          if (c.platform && MAIN_PLATFORMS.includes(c.platform)) return false;
          if (!c.platform) return false;
        } else {
          if (c.platform !== selectedPlatform) return false;
        }
      }
      if (selectedStatus !== "全部" && c.status !== selectedStatus) return false;
      return true;
    });
  }, [courses, selectedCategory, selectedPlatform, selectedStatus]);

  const activeFilterCount = [selectedCategory, selectedPlatform, selectedStatus].filter(f => f !== "全部").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">課程銷售平台</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/exchange")}
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              課程交換
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="relative"
              onClick={() => setLocation("/cart")}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              購物車
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-10 bg-gradient-to-b from-primary/5 to-background">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-3">探索優質課程</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-2">
            精選課程，助您提升技能
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4 text-sm">
            <Badge variant="outline" className="px-3 py-1">買 4 送 1</Badge>
            <Badge variant="outline" className="px-3 py-1">買 9 送 3</Badge>
            <Badge variant="outline" className="px-3 py-1">買 10 送 4</Badge>
          </div>
          {discountInfo.promoName && (
            <p className="text-sm text-green-600 font-medium mt-3">
              目前購物車已達成「{discountInfo.promoName}」優惠！
            </p>
          )}
          {!discountInfo.promoName && discountInfo.nextPromoHint && (
            <p className="text-sm text-blue-600 font-medium mt-3">
              {discountInfo.nextPromoHint}
            </p>
          )}
        </div>
      </section>

      {/* Filters */}
      <div className="container pt-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1"
          >
            <Filter className="h-4 w-4" />
            篩選
            {activeFilterCount > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">{activeFilterCount}</Badge>
            )}
            {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <p className="text-sm text-muted-foreground">
            共 {filteredCourses.length} 門課程
          </p>
        </div>

        {showFilters && (
          <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-4">
            {/* Category filter */}
            <div>
              <p className="text-sm font-medium mb-2">課程類別</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={selectedCategory === "全部" ? "default" : "outline"} onClick={() => setSelectedCategory("全部")}>全部</Button>
                {categories?.map(cat => (
                  <Button key={cat} size="sm" variant={selectedCategory === cat ? "default" : "outline"} onClick={() => setSelectedCategory(cat)}>{cat}</Button>
                ))}
              </div>
            </div>

            {/* Platform filter */}
            <div>
              <p className="text-sm font-medium mb-2">課程平台</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={selectedPlatform === "全部" ? "default" : "outline"} onClick={() => setSelectedPlatform("全部")}>全部</Button>
                {platformGroups.main.map(p => (
                  <Button key={p} size="sm" variant={selectedPlatform === p ? "default" : "outline"} onClick={() => setSelectedPlatform(p)}>{p}</Button>
                ))}
                {platformGroups.other.length > 0 && (
                  <Button size="sm" variant={selectedPlatform === "其他" ? "default" : "outline"} onClick={() => setSelectedPlatform("其他")}>
                    其他 ({platformGroups.other.length})
                  </Button>
                )}
              </div>
            </div>

            {/* Status filter */}
            <div>
              <p className="text-sm font-medium mb-2">開課狀態</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={selectedStatus === "全部" ? "default" : "outline"} onClick={() => setSelectedStatus("全部")}>全部</Button>
                {["已完結", "上線中", "未開課"].map(s => (
                  <Button key={s} size="sm" variant={selectedStatus === s ? "default" : "outline"} onClick={() => setSelectedStatus(s)}>{s}</Button>
                ))}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { setSelectedCategory("全部"); setSelectedPlatform("全部"); setSelectedStatus("全部"); }}>
                清除所有篩選
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Course Grid */}
      <main className="container pb-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{courses && courses.length > 0 ? "沒有符合篩選條件的課程" : "目前尚無公開課程"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map(course => {
              const status = statusConfig[course.status] || statusConfig["已完結"];
              const inCart = isInCart(course.id);
              return (
                <Card key={course.id} className="flex flex-col hover:shadow-lg transition-shadow overflow-hidden">
                  {/* Course Image */}
                  {course.imageUrl ? (
                    <div className="aspect-video bg-muted overflow-hidden">
                      <img src={course.imageUrl} alt={course.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-primary/30" />
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight">
                        {course.originalUrl ? (
                          <a href={course.originalUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline transition-colors">
                            {course.name}
                          </a>
                        ) : (
                          course.name
                        )}
                      </CardTitle>
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {course.teacher && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />{course.teacher}
                        </span>
                      )}
                      {course.totalHours && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />{course.totalHours}
                        </span>
                      )}
                      {course.platform && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Layers className="h-3 w-3" />{course.platform}
                        </span>
                      )}
                    </div>
                    {course.category && (
                      <Badge variant="secondary" className="w-fit mt-1 text-xs">{course.category}</Badge>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1 pb-2">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {course.description || "暫無課程簡介"}
                    </p>

                    {/* Syllabus dialog */}
                    {course.syllabus && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="link" size="sm" className="p-0 h-auto text-xs text-primary">
                            查看課綱
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>{course.name} - 課綱</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-[60vh]">
                            <div className="whitespace-pre-wrap text-sm leading-relaxed pr-4">
                              {course.syllabus}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    )}

                    <p className="text-2xl font-bold text-primary mt-2">
                      NT${course.price.toLocaleString()}
                    </p>
                    {course.price > 500 && (
                      <p className="text-xs text-amber-600 mt-1">
                        優惠組合價：NT${Math.round(course.price / 2).toLocaleString()}（砍半）
                      </p>
                    )}
                  </CardContent>

                  <CardFooter className="flex gap-2 pt-0">
                    <Button
                      className="flex-1"
                      disabled={inCart}
                      onClick={() => {
                        addItem({ courseId: course.id, courseName: course.name, price: course.price });
                        toast.success(`已加入購物車：${course.name}`);
                      }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      {inCart ? "已加入" : "購買課程"}
                    </Button>
                    {course.allowExchange && (
                      <Button
                        variant="outline"
                        onClick={() => setLocation(`/exchange?courseId=${course.id}&courseName=${encodeURIComponent(course.name)}`)}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-1" />
                        交換
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>如有任何問題，歡迎透過 LINE 聯繫我們</p>
        </div>
      </footer>
    </div>
  );
}
