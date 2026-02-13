import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShoppingCart, ArrowRightLeft, DollarSign, Clock } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.stats.overview.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cards = [
    { title: "今日訂單", value: stats?.today.orders.totalOrders ?? 0, icon: ShoppingCart, color: "text-blue-600" },
    { title: "今日收入", value: `NT$${(stats?.today.orders.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-green-600" },
    { title: "待確認付款", value: stats?.today.orders.pendingCount ?? 0, icon: Clock, color: "text-yellow-600" },
    { title: "待審核交換", value: stats?.today.exchanges.pendingCount ?? 0, icon: ArrowRightLeft, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">儀表板</h2>

      {/* Today Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Week & Month Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">本週統計</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">訂單數</span>
              <span className="font-medium">{stats?.week.orders.totalOrders ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">收入</span>
              <span className="font-medium">NT${(stats?.week.orders.totalRevenue ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">交換申請</span>
              <span className="font-medium">{stats?.week.exchanges.totalExchanges ?? 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">本月統計</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">訂單數</span>
              <span className="font-medium">{stats?.month.orders.totalOrders ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">收入</span>
              <span className="font-medium">NT${(stats?.month.orders.totalRevenue ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">交換申請</span>
              <span className="font-medium">{stats?.month.exchanges.totalExchanges ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
