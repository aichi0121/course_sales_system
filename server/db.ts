import { eq, desc, and, sql, like, or, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  courses, InsertCourse, Course,
  customers, InsertCustomer,
  orders, InsertOrder,
  orderItems, InsertOrderItem,
  transactions, InsertTransaction,
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
    and(eq(courses.status, "upcoming"), eq(courses.isPublic, true))
  ).orderBy(courses.scheduledAt);
}

export async function getCoursesScheduledToday() {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return db.select().from(courses).where(
    and(
      eq(courses.status, "upcoming"),
      gte(courses.scheduledAt, today),
      lte(courses.scheduledAt, tomorrow)
    )
  );
}

// ─── Customer helpers ───
export async function findOrCreateCustomer(data: { name: string; lineId?: string; phone?: string; email?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Try to find by phone or lineId
  let existing;
  if (data.phone) {
    const r = await db.select().from(customers).where(eq(customers.phone, data.phone)).limit(1);
    existing = r[0];
  }
  if (!existing && data.lineId) {
    const r = await db.select().from(customers).where(eq(customers.lineId, data.lineId)).limit(1);
    existing = r[0];
  }
  if (existing) {
    await db.update(customers).set({
      name: data.name,
      ...(data.lineId && { lineId: data.lineId }),
      ...(data.email && { email: data.email }),
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

export async function updateCustomerNotes(id: number, notes: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(customers).set({ notes }).where(eq(customers.id, id));
}

export async function searchCustomers(keyword: string) {
  const db = await getDb();
  if (!db) return [];
  const pattern = `%${keyword}%`;
  return db.select().from(customers).where(
    or(like(customers.name, pattern), like(customers.phone, pattern), like(customers.lineId, pattern))
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

export function calculateDiscount(itemCount: number, totalAmount: number) {
  if (itemCount >= 3) return Math.round(totalAmount * 0.15);
  if (itemCount >= 2) return Math.round(totalAmount * 0.10);
  return 0;
}

export async function createOrder(data: {
  customerId: number;
  items: { courseId: number; courseName: string; price: number }[];
  paymentMethod?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const totalAmount = data.items.reduce((sum, i) => sum + i.price, 0);
  const discountAmount = calculateDiscount(data.items.length, totalAmount);
  const finalAmount = totalAmount - discountAmount;
  const orderNumber = generateOrderNumber();

  const orderResult = await db.insert(orders).values({
    orderNumber,
    customerId: data.customerId,
    totalAmount,
    discountAmount,
    finalAmount,
    status: "pending",
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

  return { orderId, orderNumber, totalAmount, discountAmount, finalAmount };
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

export async function notifyPayment(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orders).set({
    status: "awaiting_confirmation",
    paymentNotifiedAt: new Date(),
  }).where(eq(orders.id, orderId));
}

export async function confirmPayment(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orders).set({
    status: "paid",
    paidAt: new Date(),
  }).where(eq(orders.id, orderId));
  // Create transaction record
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
    or(eq(orders.status, "pending"), eq(orders.status, "awaiting_confirmation"))
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
  return db.select().from(exchanges).where(eq(exchanges.status, "pending")).orderBy(desc(exchanges.createdAt));
}

// ─── Stats helpers ───
export async function getOrderStats(since?: Date) {
  const db = await getDb();
  if (!db) return { totalOrders: 0, totalRevenue: 0, pendingCount: 0 };
  let query = db.select({
    totalOrders: sql<number>`COUNT(*)`,
    totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN status IN ('paid','completed') THEN finalAmount ELSE 0 END), 0)`,
    pendingCount: sql<number>`SUM(CASE WHEN status IN ('pending','awaiting_confirmation') THEN 1 ELSE 0 END)`,
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
    pendingCount: sql<number>`SUM(CASE WHEN exchangeStatus = 'pending' THEN 1 ELSE 0 END)`,
  }).from(exchanges);
  if (since) {
    query = query.where(gte(exchanges.createdAt, since)) as any;
  }
  const result = await query;
  return result[0] || { totalExchanges: 0, pendingCount: 0 };
}
