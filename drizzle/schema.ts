import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, date } from "drizzle-orm/mysql-core";

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
 * 課程資料表
 */
export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  /** 課程名稱 */
  name: varchar("name", { length: 255 }).notNull(),
  /** 講師 */
  teacher: varchar("teacher", { length: 255 }),
  /** 課程描述 */
  description: text("description"),
  /** 價格 */
  price: int("price").notNull().default(0),
  /** 開課日期 */
  startDate: date("startDate"),
  /** 課程總時數（小時） */
  totalHours: varchar("totalHours", { length: 50 }),
  /** 開課狀態：已完結、上線中、未開課 */
  status: mysqlEnum("courseStatus", ["已完結", "上線中", "未開課"]).default("未開課").notNull(),
  /** 課程平台（自由輸入：知識衛星、師父、Hahow 等） */
  platform: varchar("platform", { length: 255 }),
  /** 課程類別 */
  category: mysqlEnum("category", [
    "理財｜投資",
    "商業｜工作學",
    "內容創作｜行銷",
    "自我成長",
    "人際關係",
    "數位工具｜AI",
    "語言｜學習",
    "健康｜身心靈",
    "美妝｜保養",
    "居家生活",
    "法律｜知識",
  ]).notNull(),
  /** 課程課綱（管理員自行編寫） */
  syllabus: text("syllabus"),
  /** 課程原網站連結（前端課程名稱可點擊跳轉） */
  originalUrl: text("originalUrl"),
  /** 課程圖片 URL */
  imageUrl: text("imageUrl"),
  /** 課程 YT 連結（僅後台可見） */
  ytLink: text("ytLink"),
  /** 雲端連結（僅後台可見） */
  cloudLink: text("cloudLink"),
  /** 是否公開顯示 */
  isPublic: boolean("isPublic").default(true).notNull(),
  /** 課程來源 */
  source: mysqlEnum("source", ["自購", "交換"]).default("自購").notNull(),
  /** 來源講師（交換來源時） */
  sourceTeacher: varchar("sourceTeacher", { length: 255 }),
  /** 是否允許交換 */
  allowExchange: boolean("allowExchange").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;

/** 課程類別列表（供前端篩選使用） */
export const COURSE_CATEGORIES = [
  "理財｜投資",
  "商業｜工作學",
  "內容創作｜行銷",
  "自我成長",
  "人際關係",
  "數位工具｜AI",
  "語言｜學習",
  "健康｜身心靈",
  "美妝｜保養",
  "居家生活",
  "法律｜知識",
] as const;

/** 開課狀態列表 */
export const COURSE_STATUSES = ["已完結", "上線中", "未開課"] as const;

/**
 * 客戶資料表
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  /** 名字 */
  name: varchar("name", { length: 255 }).notNull(),
  /** LINE 名稱 */
  lineName: varchar("lineName", { length: 255 }),
  /** LINE ID */
  lineId: varchar("lineId", { length: 255 }),
  /** 備註 */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * 訂單資料表
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  customerId: int("customerId").notNull(),
  totalAmount: int("totalAmount").notNull().default(0),
  discountAmount: int("discountAmount").notNull().default(0),
  finalAmount: int("finalAmount").notNull().default(0),
  status: mysqlEnum("orderStatus", ["待處理", "待確認", "已付款", "已完成", "已取消"]).default("待處理").notNull(),
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
 * 訂單項目資料表
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
 * 交易明細表
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
 * 課程交換資料表
 */
export const exchanges = mysqlTable("exchanges", {
  id: int("id").autoincrement().primaryKey(),
  exchangeNumber: varchar("exchangeNumber", { length: 50 }).notNull().unique(),
  /** 申請人名字 */
  applicantName: varchar("applicantName", { length: 255 }).notNull(),
  /** 申請人 LINE 名稱 */
  applicantLineName: varchar("applicantLineName", { length: 255 }),
  /** 申請人 LINE ID */
  applicantLineId: varchar("applicantLineId", { length: 255 }),
  /** 要交換的課程 ID */
  wantedCourseId: int("wantedCourseId").notNull(),
  /** 要交換的課程名稱 */
  wantedCourseName: varchar("wantedCourseName", { length: 255 }).notNull(),
  /** 他要交換給我的課程名稱 */
  offeredCourseName: varchar("offeredCourseName", { length: 255 }).notNull(),
  /** 課程描述 */
  offeredCourseDescription: text("offeredCourseDescription"),
  /** 交換方式：帳號、下載原檔、錄影 */
  provideMethod: mysqlEnum("provideMethod", ["帳號", "下載原檔", "錄影"]).notNull(),
  /** 交換狀態：待審核、確認交換、婉拒 */
  status: mysqlEnum("exchangeStatus", ["待審核", "確認交換", "婉拒"]).default("待審核").notNull(),
  /** 婉拒原因 */
  rejectReason: text("rejectReason"),
  /** 完成時間 */
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Exchange = typeof exchanges.$inferSelect;
export type InsertExchange = typeof exchanges.$inferInsert;
