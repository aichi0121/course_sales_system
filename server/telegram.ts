import axios from "axios";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export function isTelegramConfigured(): boolean {
  return !!TELEGRAM_BOT_TOKEN && !!TELEGRAM_CHAT_ID;
}

export async function sendTelegramMessage(text: string, chatId?: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("[Telegram] Bot token not configured");
    return false;
  }
  const targetChatId = chatId || TELEGRAM_CHAT_ID;
  if (!targetChatId) {
    console.warn("[Telegram] Chat ID not configured");
    return false;
  }
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: targetChatId,
      text,
      parse_mode: "HTML",
    });
    return true;
  } catch (error: any) {
    console.error("[Telegram] Failed to send message:", error?.response?.data || error.message);
    return false;
  }
}

// ─── Notification formatters ───

export function formatNewOrderNotification(order: {
  orderNumber: string;
  customerName: string;
  customerLineId?: string;
  customerPhone?: string;
  items: { courseName: string; price: number }[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
}) {
  const itemLines = order.items.map((i, idx) => `  ${idx + 1}. ${i.courseName} - NT$${i.price}`).join("\n");
  return `🛒 <b>新訂單通知</b>

📋 訂單編號：${order.orderNumber}
👤 客戶：${order.customerName}
📱 LINE：${order.customerLineId || "未提供"}
📞 電話：${order.customerPhone || "未提供"}

📦 訂單內容：
${itemLines}

💰 小計：NT$${order.totalAmount}
🎁 折扣：-NT$${order.discountAmount}
💵 應付金額：NT$${order.finalAmount}

⏰ 時間：${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
📌 狀態：待付款`;
}

export function formatPaymentNotification(order: {
  orderNumber: string;
  customerName: string;
  customerLineId?: string;
  customerPhone?: string;
  finalAmount: number;
}) {
  return `💳 <b>付款通知</b>

📋 訂單編號：${order.orderNumber}
👤 客戶：${order.customerName}
📱 LINE：${order.customerLineId || "未提供"}
📞 電話：${order.customerPhone || "未提供"}
💵 金額：NT$${order.finalAmount}

⏰ 付款通知時間：${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}

⚠️ 請盡快對帳確認！
輸入 /paid ${order.orderNumber} 確認收款`;
}

export function formatExchangeNotification(exchange: {
  exchangeNumber: string;
  applicantName: string;
  applicantLineId?: string;
  applicantPhone?: string;
  wantedCourseName: string;
  offeredCourseName: string;
  offeredCourseDescription?: string;
  provideMethod: string;
}) {
  const methodMap: Record<string, string> = {
    account_password: "帳號密碼",
    original_file: "原檔",
    recording: "錄影",
  };
  return `🔄 <b>課程交換申請</b>

📋 申請編號：${exchange.exchangeNumber}
👤 申請人：${exchange.applicantName}
📱 LINE：${exchange.applicantLineId || "未提供"}
📞 電話：${exchange.applicantPhone || "未提供"}

📚 想要的課程：${exchange.wantedCourseName}
🎓 提供的課程：${exchange.offeredCourseName}
📝 課程簡介：${exchange.offeredCourseDescription || "未提供"}
📦 提供方式：${methodMap[exchange.provideMethod] || exchange.provideMethod}

⏰ 申請時間：${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
📌 狀態：待審核

✅ /accept ${exchange.exchangeNumber}
❌ /reject ${exchange.exchangeNumber} [原因]`;
}

export function formatCourseOpeningReminder(course: {
  name: string;
  scheduledAt: Date | null;
}, preorderCount: number, exchangeCount: number) {
  return `📢 <b>課程開課提醒</b>

📚 課程名稱：${course.name}
📅 開課時間：${course.scheduledAt ? new Date(course.scheduledAt).toLocaleDateString("zh-TW") : "今天"}
👥 預購學員數：${preorderCount}
🔄 預交換數：${exchangeCount}

⚠️ 請確認課程連結後輸入：
/course open ${course.name}`;
}

export function formatPaidConfirmation(order: {
  orderNumber: string;
  customerName: string;
  items: { courseName: string; courseLink?: string }[];
}) {
  const courseLines = order.items.map((i, idx) =>
    `${idx + 1}. ${i.courseName}\n   🔗 ${i.courseLink || "連結待設定"}`
  ).join("\n\n");

  return `✅ 付款確認

Hi ${order.customerName}，

您的訂單 ${order.orderNumber} 已確認收到款項！

以下是您的課程連結：

${courseLines}

如有任何問題，歡迎隨時聯繫我們。
祝學習愉快！ 🎉`;
}

export function formatExchangeAcceptMessage(exchange: {
  exchangeNumber: string;
  applicantName: string;
  wantedCourseName: string;
  wantedCourseLink?: string;
}) {
  return `✅ 交換確認

Hi ${exchange.applicantName}，

您的課程交換申請 ${exchange.exchangeNumber} 已通過審核！

以下是您想要的課程連結：
📚 ${exchange.wantedCourseName}
🔗 ${exchange.wantedCourseLink || "連結待設定"}

請提供您的課程給我們，謝謝！`;
}

export function formatExchangeRejectMessage(exchange: {
  exchangeNumber: string;
  applicantName: string;
  reason?: string;
}) {
  return `❌ 交換申請未通過

Hi ${exchange.applicantName}，

很抱歉，您的課程交換申請 ${exchange.exchangeNumber} 未通過審核。

${exchange.reason ? `原因：${exchange.reason}` : ""}

如有疑問，歡迎聯繫我們。`;
}
