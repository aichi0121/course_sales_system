import { describe, expect, it } from "vitest";
import axios from "axios";

describe("Telegram Bot Token Validation", () => {
  it("should have TELEGRAM_BOT_TOKEN configured", () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    expect(token).toBeDefined();
    expect(token!.length).toBeGreaterThan(10);
  });

  it("should have TELEGRAM_CHAT_ID configured", () => {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    expect(chatId).toBeDefined();
    expect(chatId!.length).toBeGreaterThan(0);
  });

  it("should validate bot token with Telegram API (getMe)", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn("Skipping: TELEGRAM_BOT_TOKEN not set");
      return;
    }
    const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
    expect(response.data.ok).toBe(true);
    expect(response.data.result).toBeDefined();
    expect(response.data.result.is_bot).toBe(true);
  });
});

describe("Notification Formatters", () => {
  it("should format new order notification correctly", async () => {
    const { formatNewOrderNotification } = await import("./telegram");
    const msg = formatNewOrderNotification({
      orderNumber: "ORD260101001",
      customerName: "測試客戶",
      customerLineName: "test_line_name",
      customerLineId: "test_line_id",
      items: [
        { courseName: "投資理財入門", price: 500 },
        { courseName: "AI 工具應用", price: 500 },
      ],
      totalAmount: 1000,
      discountAmount: 0,
      finalAmount: 1000,
    });
    expect(msg).toContain("新訂單通知");
    expect(msg).toContain("ORD260101001");
    expect(msg).toContain("測試客戶");
    expect(msg).toContain("投資理財入門");
    expect(msg).toContain("NT$1000");
  });

  it("should format new order with promo name", async () => {
    const { formatNewOrderNotification } = await import("./telegram");
    const msg = formatNewOrderNotification({
      orderNumber: "ORD260101002",
      customerName: "優惠客戶",
      items: [
        { courseName: "課程A", price: 500 },
        { courseName: "課程B", price: 500 },
        { courseName: "課程C", price: 500 },
        { courseName: "課程D", price: 500 },
        { courseName: "課程E", price: 500 },
      ],
      totalAmount: 2500,
      discountAmount: 500,
      finalAmount: 2000,
      promoName: "買4送1",
    });
    expect(msg).toContain("買4送1");
    expect(msg).toContain("NT$2000");
  });

  it("should format payment notification correctly", async () => {
    const { formatPaymentNotification } = await import("./telegram");
    const msg = formatPaymentNotification({
      orderNumber: "ORD260101001",
      customerName: "測試客戶",
      customerLineName: "test_line_name",
      customerLineId: "test_line_id",
      finalAmount: 1800,
    });
    expect(msg).toContain("付款通知");
    expect(msg).toContain("ORD260101001");
    expect(msg).toContain("/paid ORD260101001");
  });

  it("should format exchange notification correctly", async () => {
    const { formatExchangeNotification } = await import("./telegram");
    const msg = formatExchangeNotification({
      exchangeNumber: "EXC260101001",
      applicantName: "王老師",
      applicantLineName: "wang_line",
      applicantLineId: "wang_teacher",
      wantedCourseName: "投資理財入門",
      offeredCourseName: "英文會話基礎",
      offeredCourseDescription: "英文入門課程",
      exchangeMethod: "帳號",
    });
    expect(msg).toContain("課程交換申請");
    expect(msg).toContain("EXC260101001");
    expect(msg).toContain("王老師");
    expect(msg).toContain("帳號");
    expect(msg).toContain("/accept EXC260101001");
    expect(msg).toContain("/reject EXC260101001");
  });

  it("should format paid confirmation correctly", async () => {
    const { formatPaidConfirmation } = await import("./telegram");
    const msg = formatPaidConfirmation({
      orderNumber: "ORD260101001",
      customerName: "測試客戶",
      items: [
        { courseName: "投資理財入門", courseLink: "https://drive.google.com/test" },
      ],
    });
    expect(msg).toContain("付款確認");
    expect(msg).toContain("測試客戶");
    expect(msg).toContain("https://drive.google.com/test");
  });

  it("should format exchange accept message correctly", async () => {
    const { formatExchangeAcceptMessage } = await import("./telegram");
    const msg = formatExchangeAcceptMessage({
      exchangeNumber: "EXC260101001",
      applicantName: "王老師",
      wantedCourseName: "投資理財入門",
      wantedCourseLink: "https://example.com/course",
    });
    expect(msg).toContain("交換確認");
    expect(msg).toContain("王老師");
    expect(msg).toContain("投資理財入門");
    expect(msg).toContain("https://example.com/course");
  });

  it("should format course opening reminder correctly", async () => {
    const { formatCourseOpeningReminder } = await import("./telegram");
    const msg = formatCourseOpeningReminder({
      name: "01｜投資理財入門",
      startDate: new Date("2026-03-01"),
    }, 5, 2);
    expect(msg).toContain("課程開課提醒");
    expect(msg).toContain("01｜投資理財入門");
    expect(msg).toContain("預購學員數：5");
    expect(msg).toContain("預交換數：2");
    expect(msg).toContain("/course open");
  });

  it("should format course opening reminder without date", async () => {
    const { formatCourseOpeningReminder } = await import("./telegram");
    const msg = formatCourseOpeningReminder({
      name: "測試課程",
      startDate: null,
    }, 0, 0);
    expect(msg).toContain("今天");
  });

  it("should format exchange reject message correctly", async () => {
    const { formatExchangeRejectMessage } = await import("./telegram");
    const msg = formatExchangeRejectMessage({
      exchangeNumber: "EXC260101001",
      applicantName: "王老師",
      reason: "課程內容不符",
    });
    expect(msg).toContain("未通過");
    expect(msg).toContain("王老師");
    expect(msg).toContain("課程內容不符");
  });
});

describe("Discount Calculation (v2.2 - exact match)", () => {
  it("should apply no discount for 1 item", async () => {
    const { calculateDiscount } = await import("./db");
    const result = calculateDiscount([{ price: 500 }]);
    expect(result.discountAmount).toBe(0);
    expect(result.finalAmount).toBe(500);
    expect(result.freeCount).toBe(0);
    expect(result.promoName).toBe("");
    expect(result.nextPromoHint).toContain("再加 4 門");
  });

  it("should apply no discount for 3 items (not 5)", async () => {
    const { calculateDiscount } = await import("./db");
    const result = calculateDiscount([
      { price: 500 }, { price: 500 }, { price: 500 },
    ]);
    expect(result.discountAmount).toBe(0);
    expect(result.finalAmount).toBe(1500);
    expect(result.promoName).toBe("");
    expect(result.nextPromoHint).toContain("再加 2 門");
  });

  it("should apply buy4get1 for exactly 5 items (all 500)", async () => {
    const { calculateDiscount } = await import("./db");
    const items = Array(5).fill({ price: 500 });
    const result = calculateDiscount(items);
    expect(result.freeCount).toBe(1);
    expect(result.finalAmount).toBe(2000); // 4 * 500
    expect(result.discountAmount).toBe(500);
    expect(result.promoName).toBe("買4送1");
  });

  it("should apply NO discount for 6 items (not a promo tier)", async () => {
    const { calculateDiscount } = await import("./db");
    const items = Array(6).fill({ price: 500 });
    const result = calculateDiscount(items);
    expect(result.discountAmount).toBe(0);
    expect(result.finalAmount).toBe(3000); // 6 * 500, no discount
    expect(result.promoName).toBe("");
    expect(result.nextPromoHint).toContain("再加 6 門");
  });

  it("should apply NO discount for 10 items (not a promo tier)", async () => {
    const { calculateDiscount } = await import("./db");
    const items = Array(10).fill({ price: 500 });
    const result = calculateDiscount(items);
    expect(result.discountAmount).toBe(0);
    expect(result.finalAmount).toBe(5000); // 10 * 500, no discount
    expect(result.promoName).toBe("");
  });

  it("should apply buy9get3 for exactly 12 items (all 500)", async () => {
    const { calculateDiscount } = await import("./db");
    const items = Array(12).fill({ price: 500 });
    const result = calculateDiscount(items);
    expect(result.freeCount).toBe(3);
    expect(result.finalAmount).toBe(4500); // 9 * 500
    expect(result.promoName).toBe("買9送3");
  });

  it("should apply buy10get4 for exactly 14 items (all 500)", async () => {
    const { calculateDiscount } = await import("./db");
    const items = Array(14).fill({ price: 500 });
    const result = calculateDiscount(items);
    expect(result.freeCount).toBe(4);
    expect(result.finalAmount).toBe(5000); // 10 * 500
    expect(result.promoName).toBe("買10送4");
  });

  it("should apply buy4get1 with 1 premium course (4000)", async () => {
    const { calculateDiscount } = await import("./db");
    const result = calculateDiscount([
      { price: 500 }, { price: 500 }, { price: 500 }, { price: 500 }, { price: 4000 },
    ]);
    // 優惠價四堂(4*500=2000) + 高價課砍半(4000/2=2000) = 4000
    expect(result.hasPremium).toBe(true);
    expect(result.finalAmount).toBe(4000);
    expect(result.promoName).toBe("買4送1");
  });

  it("should apply buy4get1 with 2 premium courses (4000 each)", async () => {
    const { calculateDiscount } = await import("./db");
    const result = calculateDiscount([
      { price: 500 }, { price: 500 }, { price: 500 },
      { price: 4000 }, { price: 4000 },
    ]);
    // 3 normal, paidNormal=min(4,3)=3 → 3*500=1500
    // 2 premium: 2000+2000=4000
    // finalAmount = 1500 + 4000 = 5500
    expect(result.hasPremium).toBe(true);
    expect(result.finalAmount).toBe(5500);
  });

  it("should handle empty cart", async () => {
    const { calculateDiscount } = await import("./db");
    const result = calculateDiscount([]);
    expect(result.finalAmount).toBe(0);
    expect(result.discountAmount).toBe(0);
    expect(result.promoName).toBe("");
  });

  it("should handle buy9get3 with 13 items (also valid)", async () => {
    const { calculateDiscount } = await import("./db");
    const items = Array(13).fill({ price: 500 });
    const result = calculateDiscount(items);
    expect(result.freeCount).toBe(4);
    expect(result.finalAmount).toBe(4500); // 9 * 500
    expect(result.promoName).toBe("買9送3");
    expect(result.nextPromoHint).toContain("再加 1 門");
  });

  it("should handle more than 14 items with buy10get4", async () => {
    const { calculateDiscount } = await import("./db");
    const items = Array(16).fill({ price: 500 });
    const result = calculateDiscount(items);
    expect(result.finalAmount).toBe(5000); // 10 * 500
    expect(result.promoName).toBe("買10送4");
  });
});
