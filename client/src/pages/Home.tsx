import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, ArrowRightLeft, BookOpen, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className: string }> = {
  completed: { label: "已完結", variant: "default", className: "bg-green-600 hover:bg-green-700 text-white" },
  ongoing: { label: "上線中", variant: "default", className: "bg-yellow-500 hover:bg-yellow-600 text-white" },
  upcoming: { label: "未開課", variant: "secondary", className: "bg-gray-400 hover:bg-gray-500 text-white" },
};

export default function Home() {
  const { data: courses, isLoading } = trpc.course.list.useQuery();
  const { addItem, isInCart, itemCount } = useCart();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">課程銷售平台</h1>
          </div>
          <Button
            variant="outline"
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
      </header>

      {/* Hero */}
      <section className="py-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-3">探索優質課程</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            精選課程，助您提升技能。購買 2 門享 9 折，3 門以上享 85 折優惠！
          </p>
        </div>
      </section>

      {/* Course Grid */}
      <main className="container py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !courses || courses.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>目前尚無公開課程</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => {
              const status = statusConfig[course.status] || statusConfig.completed;
              const inCart = isInCart(course.id);
              return (
                <Card key={course.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight">{course.name}</CardTitle>
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                    {course.source === "exchange" && course.sourceTeacher && (
                      <p className="text-xs text-muted-foreground mt-1">
                        來自：{course.sourceTeacher} 老師
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {course.description || "暫無課程簡介"}
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      NT${course.price.toLocaleString()}
                    </p>
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
