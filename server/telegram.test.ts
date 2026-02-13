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
      customerLineId: "test_line",
      customerPhone: "0912345678",
      items: [
        { courseName: "八字入門", price: 800 },
        { courseName: "紫微斗數", price: 1200 },
      ],
      totalAmount: 2000,
      discountAmount: 200,
      finalAmount: 1800,
    });
    expect(msg).toContain("新訂單通知");
    expect(msg).toContain("ORD260101001");
    expect(msg).toContain("測試客戶");
    expect(msg).toContain("八字入門");
    expect(msg).toContain("NT$1800");
  });

  it("should format payment notification correctly", async () => {
    const { formatPaymentNotification } = await import("./telegram");
    const msg = formatPaymentNotification({
      orderNumber: "ORD260101001",
      customerName: "測試客戶",
      customerLineId: "test_line",
      customerPhone: "0912345678",
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
      applicantLineId: "wang_teacher",
      wantedCourseName: "八字入門",
      offeredCourseName: "風水基礎",
      offeredCourseDescription: "風水入門課程",
      provideMethod: "account_password",
    });
    expect(msg).toContain("課程交換申請");
    expect(msg).toContain("EXC260101001");
    expect(msg).toContain("王老師");
    expect(msg).toContain("帳號密碼");
    expect(msg).toContain("/accept EXC260101001");
    expect(msg).toContain("/reject EXC260101001");
  });

  it("should format paid confirmation correctly", async () => {
    const { formatPaidConfirmation } = await import("./telegram");
    const msg = formatPaidConfirmation({
      orderNumber: "ORD260101001",
      customerName: "測試客戶",
      items: [
        { courseName: "八字入門", courseLink: "https://drive.google.com/test" },
      ],
    });
    expect(msg).toContain("付款確認");
    expect(msg).toContain("測試客戶");
    expect(msg).toContain("https://drive.google.com/test");
  });
});

describe("Discount Calculation", () => {
  it("should apply no discount for 1 item", async () => {
    const { calculateDiscount } = await import("./db");
    expect(calculateDiscount(1, 1000)).toBe(0);
  });

  it("should apply 10% discount for 2 items", async () => {
    const { calculateDiscount } = await import("./db");
    expect(calculateDiscount(2, 2000)).toBe(200);
  });

  it("should apply 15% discount for 3+ items", async () => {
    const { calculateDiscount } = await import("./db");
    expect(calculateDiscount(3, 3000)).toBe(450);
    expect(calculateDiscount(5, 5000)).toBe(750);
  });
});
