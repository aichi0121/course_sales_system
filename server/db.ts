import { eq, desc, and, sql, like, or, gte, lte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  courses, InsertCourse,
  customers, InsertCustomer,
  orders, InsertOrder,
  orderItems, InsertOrderItem,
  transactions,
  exchanges, InsertExchange,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User helpers ───
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Course helpers ───
export async function listPublicCourses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).where(eq(courses.isPublic, true)).orderBy(desc(courses.createdAt));
}

export async function listAllCourses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).orderBy(desc(courses.createdAt));
}

export async function getCourseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  return result[0];
}

export async function getCourseByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(courses).where(eq(courses.name, name)).limit(1);
  return result[0];
}

export async function createCourse(data: InsertCourse) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(courses).values(data);
  return result[0].insertId;
}

export async function updateCourse(id: number, data: Partial<InsertCourse>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(courses).set(data).where(eq(courses.id, id));
}

export async function deleteCourse(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(courses).where(eq(courses.id, id));
}

export async function getUpcomingCourses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).where(
    and(eq(courses.status, "未開課"), eq(courses.isPublic, true))
  ).orderBy(sql`${courses.startDate} DESC`);
}

export async function getCoursesScheduledToday() {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayStr = today.toISOString().split('T')[0];
  return db.select().from(courses).where(
    and(
      eq(courses.status, "未開課"),
      sql`${courses.startDate} = ${todayStr}`
    )
  );
}

/** 取得所有不重複的平台名稱（供篩選用） */
export async function getDistinctPlatforms() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ platform: courses.platform }).from(courses).where(
    and(eq(courses.isPublic, true), sql`${courses.platform} IS NOT NULL AND ${courses.platform} != ''`)
  );
  return result.map(r => r.platform).filter(Boolean) as string[];
}

// ─── Customer helpers ───
export async function findOrCreateCustomer(data: { name: string; lineName?: string; lineId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  let existing;
  if (data.lineId) {
    const r = await db.select().from(customers).where(eq(customers.lineId, data.lineId)).limit(1);
    existing = r[0];
  }
  if (!existing && data.lineName) {
    const r = await db.select().from(customers).where(eq(customers.lineName, data.lineName)).limit(1);
    existing = r[0];
  }
  if (existing) {
    await db.update(customers).set({
      name: data.name,
      ...(data.lineName && { lineName: data.lineName }),
      ...(data.lineId && { lineId: data.lineId }),
    }).where(eq(customers.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(customers).values(data);
  return result[0].insertId;
}

export async function listCustomers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0];
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function searchCustomers(keyword: string) {
  const db = await getDb();
  if (!db) return [];
  const pattern = `%${keyword}%`;
  return db.select().from(customers).where(
    or(like(customers.name, pattern), like(customers.lineName, pattern), like(customers.lineId, pattern))
  );
}

// ─── Order helpers ───
function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${y}${m}${d}${rand}`;
}

/**
 * 優惠方案計算
 * 規則：
 * - 總數量 5 門 → 買 4 送 1（付 4 門一般課程費用）
 * - 總數量 12 門 → 買 9 送 3（付 9 門一般課程費用）
 * - 總數量 14 門 → 買 10 送 4（付 10 門一般課程費用）
 * - 高價課程（> 500）砍半後額外加入付費金額，不佔付費門數
 * - 一般課程（<= 500）按優惠方案計算付費門數
 */
export function calculateDiscount(items: { price: number }[]) {
  const totalCount = items.length;
  const normalItems = items.filter(i => i.price <= 500);
  const premiumItems = items.filter(i => i.price > 500);

  // 優惠方案：精確匹配總數量
  // 高價課程不佔「付費/免費」門數，一律砍半計價
  let paidNormalCount = normalItems.length; // 預設全付
  let freeCount = 0;
  let promoName = "";
  let nextPromoHint = "";

  if (totalCount === 14 || totalCount > 14) {
    // 買10送4
    paidNormalCount = Math.min(10, normalItems.length);
    freeCount = Math.max(0, normalItems.length - paidNormalCount);
    promoName = "買10送4";
  } else if (totalCount === 12 || totalCount === 13) {
    // 買9送3
    paidNormalCount = Math.min(9, normalItems.length);
    freeCount = Math.max(0, normalItems.length - paidNormalCount);
    promoName = "買9送3";
    nextPromoHint = `再加 ${14 - totalCount} 門即可升級為「買10送4」優惠！`;
  } else if (totalCount === 5) {
    // 買4送1
    paidNormalCount = Math.min(4, normalItems.length);
    freeCount = Math.max(0, normalItems.length - paidNormalCount);
    promoName = "買4送1";
    nextPromoHint = "再加 7 門即可升級為「買9送3」優惠！";
  } else {
    // 其他數量：照原價
    paidNormalCount = normalItems.length;
    freeCount = 0;
    if (totalCount < 5) {
      nextPromoHint = `再加 ${5 - totalCount} 門即可享有「買4送1」優惠！`;
    } else if (totalCount < 12) {
      nextPromoHint = `再加 ${12 - totalCount} 門即可享有「買9送3」優惠！`;
    } else {
      nextPromoHint = `再加 ${14 - totalCount} 門即可享有「買10送4」優惠！`;
    }
  }

  // 計算金額
  const normalTotal = paidNormalCount * 500;
  const premiumTotal = premiumItems.reduce((sum, i) => sum + Math.round(i.price / 2), 0);
  const originalTotal = items.reduce((sum, i) => sum + i.price, 0);
  const finalAmount = normalTotal + premiumTotal;
  const discountAmount = originalTotal - finalAmount;

  return {
    originalTotal,
    discountAmount,
    finalAmount,
    freeCount,
    promoName,
    hasPremium: premiumItems.length > 0,
    nextPromoHint,
  };
}

export async function createOrder(data: {
  customerId: number;
  items: { courseId: number; courseName: string; price: number }[];
  paymentMethod?: string;
  finalAmount?: number; // 手動調整金額
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const discount = calculateDiscount(data.items);
  const totalAmount = discount.originalTotal;
  const discountAmount = discount.discountAmount;
  const finalAmount = data.finalAmount ?? discount.finalAmount;
  const orderNumber = generateOrderNumber();

  const orderResult = await db.insert(orders).values({
    orderNumber,
    customerId: data.customerId,
    totalAmount,
    discountAmount: totalAmount - finalAmount,
    finalAmount,
    status: "待處理",
    paymentMethod: data.paymentMethod,
  });
  const orderId = orderResult[0].insertId;

  for (const item of data.items) {
    await db.insert(orderItems).values({
      orderId,
      courseId: item.courseId,
      courseName: item.courseName,
      price: item.price,
    });
  }

  return { orderId, orderNumber, totalAmount, discountAmount: totalAmount - finalAmount, finalAmount, promoName: discount.promoName };
}

export async function listOrders(statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  if (statusFilter) {
    return db.select().from(orders).where(eq(orders.status, statusFilter as any)).orderBy(desc(orders.createdAt));
  }
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

export async function getOrderByNumber(orderNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  return result[0];
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function updateOrderStatus(id: number, status: string, extra?: Partial<InsertOrder>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orders).set({ status: status as any, ...extra }).where(eq(orders.id, id));
}

export async function updateOrderAmount(id: number, finalAmount: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const order = await getOrderById(id);
  if (!order) throw new Error("Order not found");
  await db.update(orders).set({
    finalAmount,
    discountAmount: order.totalAmount - finalAmount,
  }).where(eq(orders.id, id));
}

export async function notifyPayment(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orders).set({
    status: "待確認",
    paymentNotifiedAt: new Date(),
  }).where(eq(orders.id, orderId));
}

export async function confirmPayment(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orders).set({
    status: "已付款",
    paidAt: new Date(),
  }).where(eq(orders.id, orderId));
  const order = await getOrderById(orderId);
  if (order) {
    await db.insert(transactions).values({
      orderId: order.id,
      amount: order.finalAmount,
    });
  }
}

export async function getOrdersByCustomerId(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
}

export async function getPendingOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(
    or(eq(orders.status, "待處理"), eq(orders.status, "待確認"))
  ).orderBy(desc(orders.createdAt));
}

// ─── Exchange helpers ───
function generateExchangeNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EXC${y}${m}${d}${rand}`;
}

export async function createExchange(data: InsertExchange) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const exchangeNumber = generateExchangeNumber();
  const result = await db.insert(exchanges).values({ ...data, exchangeNumber });
  return { exchangeId: result[0].insertId, exchangeNumber };
}

export async function listExchanges(statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  if (statusFilter) {
    return db.select().from(exchanges).where(eq(exchanges.status, statusFilter as any)).orderBy(desc(exchanges.createdAt));
  }
  return db.select().from(exchanges).orderBy(desc(exchanges.createdAt));
}

export async function getExchangeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(exchanges).where(eq(exchanges.id, id)).limit(1);
  return result[0];
}

export async function getExchangeByNumber(exchangeNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(exchanges).where(eq(exchanges.exchangeNumber, exchangeNumber)).limit(1);
  return result[0];
}

export async function updateExchangeStatus(id: number, status: string, extra?: Partial<InsertExchange>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(exchanges).set({ status: status as any, ...extra }).where(eq(exchanges.id, id));
}

export async function getPendingExchanges() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(exchanges).where(eq(exchanges.status, "待審核")).orderBy(desc(exchanges.createdAt));
}

// ─── Stats helpers ───
export async function getOrderStats(since?: Date) {
  const db = await getDb();
  if (!db) return { totalOrders: 0, totalRevenue: 0, pendingCount: 0 };
  let query = db.select({
    totalOrders: sql<number>`COUNT(*)`,
    totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN orderStatus IN ('已付款','已完成') THEN finalAmount ELSE 0 END), 0)`,
    pendingCount: sql<number>`SUM(CASE WHEN orderStatus IN ('待處理','待確認') THEN 1 ELSE 0 END)`,
  }).from(orders);
  if (since) {
    query = query.where(gte(orders.createdAt, since)) as any;
  }
  const result = await query;
  return result[0] || { totalOrders: 0, totalRevenue: 0, pendingCount: 0 };
}

export async function getExchangeStats(since?: Date) {
  const db = await getDb();
  if (!db) return { totalExchanges: 0, pendingCount: 0 };
  let query = db.select({
    totalExchanges: sql<number>`COUNT(*)`,
    pendingCount: sql<number>`SUM(CASE WHEN exchangeStatus = '待審核' THEN 1 ELSE 0 END)`,
  }).from(exchanges);
  if (since) {
    query = query.where(gte(exchanges.createdAt, since)) as any;
  }
  const result = await query;
  return result[0] || { totalExchanges: 0, pendingCount: 0 };
}

// ─── Pending delivery helpers ───

/** 取得某課程相關的「待交付」訂單數量 */
export async function getPendingDeliveryOrdersByCourseId(courseId: number) {
  const db = await getDb();
  if (!db) return [];
  // Find orders that contain this course and are in 待交付 status
  const items = await db.select({ orderId: orderItems.orderId }).from(orderItems).where(eq(orderItems.courseId, courseId));
  if (items.length === 0) return [];
  const orderIds = items.map(i => i.orderId);
  return db.select().from(orders).where(
    and(
      eq(orders.status, "待交付"),
      inArray(orders.id, orderIds)
    )
  );
}

/** 取得某課程相關的「待交付」交換數量 */
export async function getPendingDeliveryExchangesByCourseId(courseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(exchanges).where(
    and(
      eq(exchanges.status, "待交付"),
      eq(exchanges.wantedCourseId, courseId)
    )
  );
}
