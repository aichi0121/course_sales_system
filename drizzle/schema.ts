import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Courses table
 */
export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: int("price").notNull().default(0),
  link: text("link"),
  status: mysqlEnum("status", ["completed", "ongoing", "upcoming"]).default("completed").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  isPublic: boolean("isPublic").default(true).notNull(),
  source: mysqlEnum("source", ["self", "exchange"]).default("self").notNull(),
  sourceTeacher: varchar("sourceTeacher", { length: 255 }),
  allowExchange: boolean("allowExchange").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;

/**
 * Customers table
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  lineId: varchar("lineId", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Orders table
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  customerId: int("customerId").notNull(),
  totalAmount: int("totalAmount").notNull().default(0),
  discountAmount: int("discountAmount").notNull().default(0),
  finalAmount: int("finalAmount").notNull().default(0),
  status: mysqlEnum("status", ["pending", "awaiting_confirmation", "paid", "completed", "cancelled"]).default("pending").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  paymentNotifiedAt: timestamp("paymentNotifiedAt"),
  paidAt: timestamp("paidAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order items table
 */
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  courseId: int("courseId").notNull(),
  courseName: varchar("courseName", { length: 255 }).notNull(),
  price: int("price").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Transactions table
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  amount: int("amount").notNull(),
  paidAt: timestamp("paidAt").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Exchanges table
 */
export const exchanges = mysqlTable("exchanges", {
  id: int("id").autoincrement().primaryKey(),
  exchangeNumber: varchar("exchangeNumber", { length: 50 }).notNull().unique(),
  applicantName: varchar("applicantName", { length: 255 }).notNull(),
  applicantLineId: varchar("applicantLineId", { length: 255 }),
  applicantPhone: varchar("applicantPhone", { length: 50 }),
  wantedCourseId: int("wantedCourseId").notNull(),
  wantedCourseName: varchar("wantedCourseName", { length: 255 }).notNull(),
  offeredCourseName: varchar("offeredCourseName", { length: 255 }).notNull(),
  offeredCourseDescription: text("offeredCourseDescription"),
  provideMethod: mysqlEnum("provideMethod", ["account_password", "original_file", "recording"]).notNull(),
  courseCredentials: text("courseCredentials"),
  status: mysqlEnum("exchangeStatus", ["pending", "accepted", "rejected", "awaiting_course", "completed"]).default("pending").notNull(),
  rejectReason: text("rejectReason"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Exchange = typeof exchanges.$inferSelect;
export type InsertExchange = typeof exchanges.$inferInsert;
