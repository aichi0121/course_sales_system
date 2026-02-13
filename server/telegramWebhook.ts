import { Express, Request, Response } from "express";
import {
  sendTelegramMessage,
  formatPaidConfirmation,
  formatExchangeAcceptMessage,
  formatExchangeRejectMessage,
} from "./telegram";
import {
  getOrderByNumber, getOrderItems, confirmPayment, getOrderById,
  getCourseById, getCourseByName, updateCourse, createCourse,
  getExchangeByNumber, updateExchangeStatus,
  listAllCourses, listExchanges, listOrders,
  getPendingOrders, getPendingExchanges, getUpcomingCourses,
  getOrderStats, getExchangeStats, searchCustomers, getOrdersByCustomerId,
  getCustomerById,
} from "./db";

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

export function registerTelegramWebhook(app: Express) {
  app.post("/api/telegram/webhook", async (req: Request, res: Response) => {
    try {
      const update = req.body;
      if (!update?.message?.text) {
        res.sendStatus(200);
        return;
      }

      const chatId = update.message.chat.id.toString();
      const text = update.message.text.trim();

      // Only respond to the admin chat
      if (chatId !== TELEGRAM_CHAT_ID) {
        await sendTelegramMessage("⚠️ 您沒有權限使用此機器人。", chatId);
        res.sendStatus(200);
        return;
      }

      await handleCommand(text, chatId);
      res.sendStatus(200);
    } catch (error) {
      console.error("[Telegram Webhook] Error:", error);
      res.sendStatus(200);
    }
  });
}

async function handleCommand(text: string, chatId: string) {
  const parts = text.split(/\s+/);
  const cmd = parts[0]?.toLowerCase();

  try {
    switch (cmd) {
      case "/paid":
        await handlePaid(parts, chatId);
        break;
      case "/accept":
        await handleAccept(parts, chatId);
        break;
      case "/reject":
        await handleReject(parts, chatId);
        break;
      case "/received":
        await handleReceived(parts, chatId);
        break;
      case "/exchange":
        await handleExchange(parts, chatId);
        break;
      case "/course":
        await handleCourse(parts, chatId);
        break;
      case "/check":
        await handleCheck(parts, chatId);
        break;
      case "/today":
        await handleToday(chatId);
        break;
      case "/pending":
        await handlePending(chatId);
        break;
      case "/stats":
        await handleStats(chatId);
        break;
      case "/customer":
        await handleCustomer(parts, chatId);
        break;
      case "/start":
      case "/help":
        await handleHelp(chatId);
        break;
      default:
        await sendTelegramMessage("❓ 未知指令，輸入 /help 查看可用指令。", chatId);
    }
  } catch (error: any) {
    await sendTelegramMessage(`❌ 處理指令時發生錯誤：${error.message}`, chatId);
  }
}

async function handlePaid(parts: string[], chatId: string) {
  const orderNumber = parts[1];
  if (!orderNumber) {
    await sendTelegramMessage("⚠️ 用法：/paid [訂單編號]", chatId);
    return;
  }
  const order = await getOrderByNumber(orderNumber);
  if (!order) {
    await sendTelegramMessage(`❌ 找不到訂單 ${orderNumber}`, chatId);
    return;
  }
  await confirmPayment(order.id);
  const items = await getOrderItems(order.id);
  const itemsWithLinks = [];
  for (const item of items) {
    const course = await getCourseById(item.courseId);
    itemsWithLinks.push({
      courseName: item.courseName,
      courseLink: course?.link || undefined,
    });
  }
  const customer = await getCustomerById(order.customerId);
  const msg = formatPaidConfirmation({
    orderNumber: order.orderNumber,
    customerName: customer?.name || "客戶",
    items: itemsWithLinks,
  });
  await sendTelegramMessage(`✅ 訂單 ${orderNumber} 已確認收款！\n\n📋 以下訊息可直接複製貼到客戶 LINE：\n\n<code>${escapeHtml(msg)}</code>`, chatId);

  // Show today stats
  const todayStats = await getOrderStats(getStartOfDay());
  await sendTelegramMessage(`📊 今日統計：訂單 ${todayStats.totalOrders} 筆，收入 NT$${todayStats.totalRevenue}`, chatId);
}

async function handleAccept(parts: string[], chatId: string) {
  const exchangeNumber = parts[1];
  if (!exchangeNumber) {
    await sendTelegramMessage("⚠️ 用法：/accept [交換編號]", chatId);
    return;
  }
  const exchange = await getExchangeByNumber(exchangeNumber);
  if (!exchange) {
    await sendTelegramMessage(`❌ 找不到交換申請 ${exchangeNumber}`, chatId);
    return;
  }
  await updateExchangeStatus(exchange.id, "accepted");

  // Auto-add the offered course as hidden
  await createCourse({
    name: exchange.offeredCourseName,
    description: exchange.offeredCourseDescription || "",
    price: 0,
    status: "completed",
    isPublic: false,
    source: "exchange",
    sourceTeacher: exchange.applicantName,
    allowExchange: false,
  });

  const wantedCourse = await getCourseById(exchange.wantedCourseId);
  const msg = formatExchangeAcceptMessage({
    exchangeNumber: exchange.exchangeNumber,
    applicantName: exchange.applicantName,
    wantedCourseName: exchange.wantedCourseName,
    wantedCourseLink: wantedCourse?.link || undefined,
  });
  await sendTelegramMessage(`✅ 已接受交換申請 ${exchangeNumber}！\n對方課程「${exchange.offeredCourseName}」已新增至課程清單（隱藏）。\n\n📋 以下訊息可直接複製貼到對方 LINE：\n\n<code>${escapeHtml(msg)}</code>`, chatId);
}

async function handleReject(parts: string[], chatId: string) {
  const exchangeNumber = parts[1];
  if (!exchangeNumber) {
    await sendTelegramMessage("⚠️ 用法：/reject [交換編號] [原因]", chatId);
    return;
  }
  const reason = parts.slice(2).join(" ") || undefined;
  const exchange = await getExchangeByNumber(exchangeNumber);
  if (!exchange) {
    await sendTelegramMessage(`❌ 找不到交換申請 ${exchangeNumber}`, chatId);
    return;
  }
  await updateExchangeStatus(exchange.id, "rejected", { rejectReason: reason } as any);

  const msg = formatExchangeRejectMessage({
    exchangeNumber: exchange.exchangeNumber,
    applicantName: exchange.applicantName,
    reason,
  });
  await sendTelegramMessage(`❌ 已拒絕交換申請 ${exchangeNumber}。\n\n📋 以下訊息可直接複製貼到對方 LINE：\n\n<code>${escapeHtml(msg)}</code>`, chatId);
}

async function handleReceived(parts: string[], chatId: string) {
  const exchangeNumber = parts[1];
  if (!exchangeNumber) {
    await sendTelegramMessage("⚠️ 用法：/received [交換編號] [課程資訊]", chatId);
    return;
  }
  const courseInfo = parts.slice(2).join(" ");
  const exchange = await getExchangeByNumber(exchangeNumber);
  if (!exchange) {
    await sendTelegramMessage(`❌ 找不到交換申請 ${exchangeNumber}`, chatId);
    return;
  }
  await updateExchangeStatus(exchange.id, "completed", {
    courseCredentials: courseInfo,
    completedAt: new Date(),
  } as any);
  await sendTelegramMessage(`✅ 交換 ${exchangeNumber} 已完成！課程資訊已記錄。`, chatId);
}

async function handleExchange(parts: string[], chatId: string) {
  const sub = parts[1]?.toLowerCase();
  if (sub === "list") {
    const list = await listExchanges();
    if (list.length === 0) {
      await sendTelegramMessage("📭 目前沒有交換課程記錄。", chatId);
      return;
    }
    const lines = list.map(e =>
      `• ${e.offeredCourseName} | ${e.provideMethod} | ${e.status} | ${new Date(e.createdAt).toLocaleDateString("zh-TW")}`
    ).join("\n");
    await sendTelegramMessage(`📋 <b>交換課程清單</b>\n\n${lines}`, chatId);
  } else if (sub === "pending") {
    const list = await getPendingExchanges();
    if (list.length === 0) {
      await sendTelegramMessage("✅ 目前沒有待審核的交換申請。", chatId);
      return;
    }
    const lines = list.map(e =>
      `• ${e.exchangeNumber} | ${e.applicantName} | 想要：${e.wantedCourseName} | 提供：${e.offeredCourseName}`
    ).join("\n");
    await sendTelegramMessage(`⏳ <b>待審核交換申請</b>\n\n${lines}`, chatId);
  } else {
    await sendTelegramMessage("⚠️ 用法：/exchange list 或 /exchange pending", chatId);
  }
}

async function handleCourse(parts: string[], chatId: string) {
  const sub = parts[1]?.toLowerCase();
  switch (sub) {
    case "add": {
      // /course add [名稱] [價格] [連結] [狀態]
      const name = parts[2];
      const price = parseInt(parts[3]) || 0;
      const link = parts[4] || "";
      const statusMap: Record<string, string> = { "已完結": "completed", "上線中": "ongoing", "未開課": "upcoming" };
      const status = statusMap[parts[5]] || "completed";
      if (!name) {
        await sendTelegramMessage("⚠️ 用法：/course add [名稱] [價格] [連結] [狀態]", chatId);
        return;
      }
      await createCourse({ name, price, link, status: status as any, isPublic: true, source: "self", allowExchange: true });
      await sendTelegramMessage(`✅ 課程「${name}」已新增！價格 NT$${price}`, chatId);
      break;
    }
    case "list": {
      const list = await listAllCourses();
      if (list.length === 0) {
        await sendTelegramMessage("📭 目前沒有課程。", chatId);
        return;
      }
      const statusMap: Record<string, string> = { completed: "已完結", ongoing: "上線中", upcoming: "未開課" };
      const lines = list.map(c =>
        `• ${c.name} | NT$${c.price} | ${statusMap[c.status] || c.status} | ${c.isPublic ? "公開" : "隱藏"} | ${c.source === "exchange" ? `來自${c.sourceTeacher}` : "自有"}`
      ).join("\n");
      await sendTelegramMessage(`📚 <b>課程清單</b>\n\n${lines}`, chatId);
      break;
    }
    case "status": {
      const name = parts[2];
      const statusMap: Record<string, string> = { "已完結": "completed", "上線中": "ongoing", "未開課": "upcoming" };
      const newStatus = statusMap[parts[3]];
      if (!name || !newStatus) {
        await sendTelegramMessage("⚠️ 用法：/course status [名稱] [已完結/上線中/未開課]", chatId);
        return;
      }
      const course = await getCourseByName(name);
      if (!course) { await sendTelegramMessage(`❌ 找不到課程「${name}」`, chatId); return; }
      await updateCourse(course.id, { status: newStatus as any });
      await sendTelegramMessage(`✅ 課程「${name}」狀態已更新為「${parts[3]}」`, chatId);
      break;
    }
    case "link": {
      const name = parts[2];
      const link = parts[3];
      if (!name || !link) {
        await sendTelegramMessage("⚠️ 用法：/course link [名稱] [新連結]", chatId);
        return;
      }
      const course = await getCourseByName(name);
      if (!course) { await sendTelegramMessage(`❌ 找不到課程「${name}」`, chatId); return; }
      await updateCourse(course.id, { link });
      await sendTelegramMessage(`✅ 課程「${name}」連結已更新`, chatId);
      break;
    }
    case "schedule": {
      const name = parts[2];
      const dateStr = parts[3];
      if (!name || !dateStr) {
        await sendTelegramMessage("⚠️ 用法：/course schedule [名稱] [日期 YYYY-MM-DD]", chatId);
        return;
      }
      const course = await getCourseByName(name);
      if (!course) { await sendTelegramMessage(`❌ 找不到課程「${name}」`, chatId); return; }
      await updateCourse(course.id, { scheduledAt: new Date(dateStr) });
      await sendTelegramMessage(`✅ 課程「${name}」開課時間已設定為 ${dateStr}`, chatId);
      break;
    }
    case "open": {
      const name = parts.slice(2).join(" ");
      if (!name) {
        await sendTelegramMessage("⚠️ 用法：/course open [課程名稱]", chatId);
        return;
      }
      const course = await getCourseByName(name);
      if (!course) { await sendTelegramMessage(`❌ 找不到課程「${name}」`, chatId); return; }
      await updateCourse(course.id, { status: "ongoing" });
      await sendTelegramMessage(`✅ 課程「${name}」已更新為上線中！`, chatId);
      break;
    }
    case "upcoming": {
      const list = await getUpcomingCourses();
      if (list.length === 0) {
        await sendTelegramMessage("📭 目前沒有即將開課的課程。", chatId);
        return;
      }
      const lines = list.map(c =>
        `• ${c.name} | 開課：${c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString("zh-TW") : "未定"}`
      ).join("\n");
      await sendTelegramMessage(`📅 <b>即將開課</b>\n\n${lines}`, chatId);
      break;
    }
    case "publish": {
      const name = parts.slice(2).join(" ");
      if (!name) { await sendTelegramMessage("⚠️ 用法：/course publish [課程名稱]", chatId); return; }
      const course = await getCourseByName(name);
      if (!course) { await sendTelegramMessage(`❌ 找不到課程「${name}」`, chatId); return; }
      await updateCourse(course.id, { isPublic: true });
      await sendTelegramMessage(`✅ 課程「${name}」已設為公開`, chatId);
      break;
    }
    case "hide": {
      const name = parts.slice(2).join(" ");
      if (!name) { await sendTelegramMessage("⚠️ 用法：/course hide [課程名稱]", chatId); return; }
      const course = await getCourseByName(name);
      if (!course) { await sendTelegramMessage(`❌ 找不到課程「${name}」`, chatId); return; }
      await updateCourse(course.id, { isPublic: false });
      await sendTelegramMessage(`✅ 課程「${name}」已設為隱藏`, chatId);
      break;
    }
    default:
      await sendTelegramMessage("⚠️ 課程指令：add, list, status, link, schedule, open, upcoming, publish, hide", chatId);
  }
}

async function handleCheck(parts: string[], chatId: string) {
  const number = parts[1];
  if (!number) {
    await sendTelegramMessage("⚠️ 用法：/check [編號]", chatId);
    return;
  }
  // Try order first
  const order = await getOrderByNumber(number);
  if (order) {
    const items = await getOrderItems(order.id);
    const customer = await getCustomerById(order.customerId);
    const statusMap: Record<string, string> = {
      pending: "待付款", awaiting_confirmation: "待確認", paid: "已付款", completed: "已完成", cancelled: "已取消"
    };
    const itemLines = items.map(i => `  • ${i.courseName} NT$${i.price}`).join("\n");
    await sendTelegramMessage(`📋 <b>訂單詳情</b>\n\n編號：${order.orderNumber}\n客戶：${customer?.name || "未知"}\nLINE：${customer?.lineId || "未提供"}\n電話：${customer?.phone || "未提供"}\n\n課程：\n${itemLines}\n\n金額：NT$${order.finalAmount}\n狀態：${statusMap[order.status] || order.status}\n下單時間：${new Date(order.createdAt).toLocaleString("zh-TW")}`, chatId);
    return;
  }
  // Try exchange
  const exchange = await getExchangeByNumber(number);
  if (exchange) {
    const statusMap: Record<string, string> = {
      pending: "待審核", accepted: "已接受", rejected: "已拒絕", awaiting_course: "待收課程", completed: "已完成"
    };
    await sendTelegramMessage(`📋 <b>交換申請詳情</b>\n\n編號：${exchange.exchangeNumber}\n申請人：${exchange.applicantName}\nLINE：${exchange.applicantLineId || "未提供"}\n\n想要：${exchange.wantedCourseName}\n提供：${exchange.offeredCourseName}\n方式：${exchange.provideMethod}\n\n狀態：${statusMap[exchange.status] || exchange.status}\n申請時間：${new Date(exchange.createdAt).toLocaleString("zh-TW")}`, chatId);
    return;
  }
  await sendTelegramMessage(`❌ 找不到編號 ${number} 的訂單或交換申請`, chatId);
}

async function handleToday(chatId: string) {
  const startOfDay = getStartOfDay();
  const orderStats = await getOrderStats(startOfDay);
  const exchangeStats = await getExchangeStats(startOfDay);
  await sendTelegramMessage(`📊 <b>今日統計</b>\n\n🛒 一般銷售：\n  訂單數：${orderStats.totalOrders}\n  收入：NT$${orderStats.totalRevenue}\n  待確認：${orderStats.pendingCount}\n\n🔄 課程交換：\n  新申請：${exchangeStats.totalExchanges}\n  待審核：${exchangeStats.pendingCount}`, chatId);
}

async function handlePending(chatId: string) {
  const pendingOrders = await getPendingOrders();
  const pendingExchanges = await getPendingExchanges();

  let msg = "⏳ <b>待處理項目</b>\n\n";
  if (pendingOrders.length > 0) {
    msg += "🛒 待處理訂單：\n";
    msg += pendingOrders.map(o => `  • ${o.orderNumber} | NT$${o.finalAmount} | ${o.status === "awaiting_confirmation" ? "待確認" : "待付款"}`).join("\n");
    msg += "\n\n";
  } else {
    msg += "🛒 無待處理訂單\n\n";
  }
  if (pendingExchanges.length > 0) {
    msg += "🔄 待審核交換：\n";
    msg += pendingExchanges.map(e => `  • ${e.exchangeNumber} | ${e.applicantName} | ${e.offeredCourseName}`).join("\n");
  } else {
    msg += "🔄 無待審核交換";
  }
  await sendTelegramMessage(msg, chatId);
}

async function handleStats(chatId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const orderStats = await getOrderStats(startOfMonth);
  const exchangeStats = await getExchangeStats(startOfMonth);
  await sendTelegramMessage(`📊 <b>本月統計</b>\n\n🛒 訂單數：${orderStats.totalOrders}\n💰 收入：NT$${orderStats.totalRevenue}\n⏳ 待確認：${orderStats.pendingCount}\n🔄 交換數：${exchangeStats.totalExchanges}\n⏳ 待審核：${exchangeStats.pendingCount}`, chatId);
}

async function handleCustomer(parts: string[], chatId: string) {
  const keyword = parts.slice(1).join(" ");
  if (!keyword) {
    await sendTelegramMessage("⚠️ 用法：/customer [名稱]", chatId);
    return;
  }
  const results = await searchCustomers(keyword);
  if (results.length === 0) {
    await sendTelegramMessage(`❌ 找不到客戶「${keyword}」`, chatId);
    return;
  }
  for (const c of results.slice(0, 3)) {
    const orders = await getOrdersByCustomerId(c.id);
    const orderLines = orders.length > 0
      ? orders.map(o => `  • ${o.orderNumber} | NT$${o.finalAmount} | ${o.status}`).join("\n")
      : "  無購買記錄";
    await sendTelegramMessage(`👤 <b>${c.name}</b>\nLINE：${c.lineId || "未提供"}\n電話：${c.phone || "未提供"}\n\n購買記錄：\n${orderLines}`, chatId);
  }
}

async function handleHelp(chatId: string) {
  await sendTelegramMessage(`📖 <b>可用指令</b>

<b>一般銷售：</b>
/paid [訂單編號] - 確認收款

<b>課程交換：</b>
/accept [交換編號] - 接受交換
/reject [交換編號] [原因] - 拒絕交換
/received [交換編號] [課程資訊] - 記錄收到課程
/exchange list - 交換課程清單
/exchange pending - 待審核交換

<b>課程管理：</b>
/course add [名稱] [價格] [連結] [狀態]
/course list - 課程清單
/course status [名稱] [新狀態]
/course link [名稱] [新連結]
/course schedule [名稱] [日期]
/course open [課程名稱]
/course upcoming - 即將開課
/course publish [課程名稱]
/course hide [課程名稱]

<b>查詢統計：</b>
/check [編號] - 查詢詳情
/today - 今日統計
/pending - 待處理項目
/stats - 本月統計
/customer [名稱] - 查詢客戶`, chatId);
}

function getStartOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
