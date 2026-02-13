import {
  getCoursesScheduledToday,
  getPendingOrders,
  getPendingExchanges,
  getOrderItems,
  getCustomerById,
  getOrdersByCustomerId,
} from "./db";
import {
  sendTelegramMessage,
  isTelegramConfigured,
  formatCourseOpeningReminder,
} from "./telegram";

// Daily check at startup + every hour
let lastDailyCheck = "";

export function startCronJobs() {
  // Run check every 30 minutes
  setInterval(async () => {
    await runDailyCheck();
  }, 30 * 60 * 1000);

  // Also run immediately on startup (with a small delay)
  setTimeout(async () => {
    await runDailyCheck();
  }, 10000);

  console.log("[CronJobs] Scheduled tasks started");
}

async function runDailyCheck() {
  if (!isTelegramConfigured()) return;

  const today = new Date().toISOString().split("T")[0];

  // Only run once per day
  if (lastDailyCheck === today) return;

  const now = new Date();
  const hour = now.getHours();

  // Only run between 8:00 and 10:00 (covers 9:00 AM check)
  if (hour < 8 || hour > 10) return;

  lastDailyCheck = today;

  try {
    // Check courses scheduled for today
    const todayCourses = await getCoursesScheduledToday();
    for (const course of todayCourses) {
      const msg = formatCourseOpeningReminder(course, 0, 0);
      await sendTelegramMessage(msg);
    }

    // Check stale pending orders (older than 24 hours)
    const pendingOrders = await getPendingOrders();
    const staleOrders = pendingOrders.filter(o => {
      const created = new Date(o.createdAt);
      const diff = now.getTime() - created.getTime();
      return diff > 24 * 60 * 60 * 1000;
    });

    if (staleOrders.length > 0) {
      const lines = staleOrders.map(o =>
        `  • ${o.orderNumber} | NT$${o.finalAmount} | ${o.status === "待確認" ? "待確認" : "待處理"} | ${new Date(o.createdAt).toLocaleDateString("zh-TW")}`
      ).join("\n");
      await sendTelegramMessage(`⏰ <b>待處理訂單提醒</b>\n\n以下訂單已超過 24 小時未處理：\n${lines}`);
    }

    // Check stale pending exchanges (older than 48 hours)
    const pendingExchanges = await getPendingExchanges();
    const staleExchanges = pendingExchanges.filter(e => {
      const created = new Date(e.createdAt);
      const diff = now.getTime() - created.getTime();
      return diff > 48 * 60 * 60 * 1000;
    });

    if (staleExchanges.length > 0) {
      const lines = staleExchanges.map(e =>
        `  • ${e.exchangeNumber} | ${e.applicantName} | ${e.offeredCourseName} | ${new Date(e.createdAt).toLocaleDateString("zh-TW")}`
      ).join("\n");
      await sendTelegramMessage(`⏰ <b>待審核交換提醒</b>\n\n以下交換申請已超過 48 小時未處理：\n${lines}`);
    }

  } catch (error) {
    console.error("[CronJobs] Error in daily check:", error);
  }
}
