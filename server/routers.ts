import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { COURSE_CATEGORIES, COURSE_STATUSES } from "../drizzle/schema";
import {
  listPublicCourses, listAllCourses, getCourseById, createCourse, updateCourse, deleteCourse,
  getDistinctPlatforms,
  findOrCreateCustomer, listCustomers, getCustomerById, updateCustomer, searchCustomers,
  createOrder, listOrders, getOrderById, getOrderByNumber, getOrderItems, updateOrderStatus,
  updateOrderAmount, notifyPayment, confirmPayment, getOrdersByCustomerId,
  createExchange, listExchanges, getExchangeById, updateExchangeStatus, getPendingExchanges,
  getOrderStats, getExchangeStats, getPendingOrders, calculateDiscount,
} from "./db";
import {
  sendTelegramMessage, isTelegramConfigured,
  formatNewOrderNotification, formatPaymentNotification, formatExchangeNotification,
} from "./telegram";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Public Course API ───
  course: router({
    list: publicProcedure.query(async () => {
      const courseList = await listPublicCourses();
      // 移除僅後台可見的欄位
      return courseList.map(({ ytLink, cloudLink, ...rest }) => rest);
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const course = await getCourseById(input.id);
      if (!course) return null;
      const { ytLink, cloudLink, ...rest } = course;
      return rest;
    }),
    platforms: publicProcedure.query(async () => {
      return getDistinctPlatforms();
    }),
    categories: publicProcedure.query(() => {
      return [...COURSE_CATEGORIES];
    }),
  }),

  // ─── Order API (public for customers) ───
  order: router({
    create: publicProcedure.input(z.object({
      customerName: z.string().min(1),
      customerLineName: z.string().optional(),
      customerLineId: z.string().optional(),
      paymentMethod: z.string().optional(),
      items: z.array(z.object({
        courseId: z.number(),
        courseName: z.string(),
        price: z.number(),
      })).min(1),
    })).mutation(async ({ input }) => {
      const customerId = await findOrCreateCustomer({
        name: input.customerName,
        lineName: input.customerLineName,
        lineId: input.customerLineId,
      });
      const result = await createOrder({
        customerId,
        items: input.items,
        paymentMethod: input.paymentMethod,
      });

      // Send Telegram notification
      if (isTelegramConfigured()) {
        const msg = formatNewOrderNotification({
          orderNumber: result.orderNumber,
          customerName: input.customerName,
          customerLineName: input.customerLineName,
          customerLineId: input.customerLineId,
          items: input.items,
          totalAmount: result.totalAmount,
          discountAmount: result.discountAmount,
          finalAmount: result.finalAmount,
          promoName: result.promoName,
        });
        await sendTelegramMessage(msg);
      }

      return result;
    }),

    // 計算優惠預覽（不建立訂單）
    calculateDiscount: publicProcedure.input(z.object({
      items: z.array(z.object({ price: z.number() })).min(1),
    })).query(({ input }) => {
      return calculateDiscount(input.items);
    }),

    notifyPayment: publicProcedure.input(z.object({
      orderId: z.number(),
    })).mutation(async ({ input }) => {
      const order = await getOrderById(input.orderId);
      if (!order) throw new Error("Order not found");
      await notifyPayment(order.id);

      if (isTelegramConfigured()) {
        const customer = await getCustomerById(order.customerId);
        const msg = formatPaymentNotification({
          orderNumber: order.orderNumber,
          customerName: customer?.name || "客戶",
          customerLineName: customer?.lineName || undefined,
          customerLineId: customer?.lineId || undefined,
          finalAmount: order.finalAmount,
        });
        await sendTelegramMessage(msg);
      }

      return { success: true };
    }),

    getByNumber: publicProcedure.input(z.object({ orderNumber: z.string() })).query(async ({ input }) => {
      const order = await getOrderByNumber(input.orderNumber);
      if (!order) return null;
      const items = await getOrderItems(order.id);
      return { ...order, items };
    }),
  }),

  // ─── Exchange API (public for applicants) ───
  exchange: router({
    create: publicProcedure.input(z.object({
      applicantName: z.string().min(1),
      applicantLineName: z.string().optional(),
      applicantLineId: z.string().optional(),
      wantedCourseId: z.number().optional(),
      wantedCourseName: z.string().optional(),
      offeredCourseName: z.string().min(1),
      offeredCourseDescription: z.string().optional(),
      exchangeMethod: z.enum(["帳號", "下載原檔", "錄影"]),
    })).mutation(async ({ input }) => {
      const result = await createExchange(input as any);

      if (isTelegramConfigured()) {
        const msg = formatExchangeNotification({
          exchangeNumber: result.exchangeNumber,
          applicantName: input.applicantName,
          applicantLineName: input.applicantLineName,
          applicantLineId: input.applicantLineId,
          wantedCourseName: input.wantedCourseName || '未指定',
          offeredCourseName: input.offeredCourseName,
          offeredCourseDescription: input.offeredCourseDescription,
          exchangeMethod: input.exchangeMethod,
        });
        await sendTelegramMessage(msg);
      }

      return result;
    }),
  }),

  // ─── Admin APIs ───
  admin: router({
    // Course management
    courses: router({
      list: adminProcedure.query(async () => {
        return listAllCourses();
      }),
      create: adminProcedure.input(z.object({
        name: z.string().min(1),
        teacher: z.string().optional(),
        description: z.string().optional(),
        price: z.number().min(0),
        startDate: z.string().optional(),
        totalHours: z.string().optional(),
        status: z.enum(["已完結", "上線中", "未開課"]),
        platform: z.string().optional(),
        category: z.enum(COURSE_CATEGORIES as unknown as [string, ...string[]]),
        syllabus: z.string().optional(),
        originalUrl: z.string().optional(),
        imageUrl: z.string().optional(),
        ytLink: z.string().optional(),
        cloudLink: z.string().optional(),
        isPublic: z.boolean().default(true),
        source: z.enum(["自購", "交換"]).default("自購"),
        exchangePartner: z.string().nullable().optional(),
        costPrice: z.number().nullable().optional(),
        allowExchange: z.boolean().default(true),
      })).mutation(async ({ input }) => {
        const id = await createCourse({
          ...input,
          startDate: input.startDate || undefined,
        } as any);
        return { id };
      }),
      update: adminProcedure.input(z.object({
        id: z.number(),
        name: z.string().optional(),
        teacher: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        price: z.number().optional(),
        startDate: z.string().nullable().optional(),
        totalHours: z.string().nullable().optional(),
        status: z.enum(["已完結", "上線中", "未開課"]).optional(),
        platform: z.string().nullable().optional(),
        category: z.enum(COURSE_CATEGORIES as unknown as [string, ...string[]]).optional(),
        syllabus: z.string().nullable().optional(),
        originalUrl: z.string().nullable().optional(),
        imageUrl: z.string().nullable().optional(),
        ytLink: z.string().nullable().optional(),
        cloudLink: z.string().nullable().optional(),
        isPublic: z.boolean().optional(),
        source: z.enum(["自購", "交換"]).optional(),
        exchangePartner: z.string().nullable().optional(),
        costPrice: z.number().nullable().optional(),
        allowExchange: z.boolean().optional(),
      })).mutation(async ({ input }) => {
        const { id, startDate, ...rest } = input;
        await updateCourse(id, {
          ...rest,
          ...(startDate !== undefined && { startDate: startDate || null }),
        } as any);
        return { success: true };
      }),
      delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
        await deleteCourse(input.id);
        return { success: true };
      }),
    }),

    // Order management
    orders: router({
      list: adminProcedure.input(z.object({
        status: z.string().optional(),
      }).optional()).query(async ({ input }) => {
        const orderList = await listOrders(input?.status);
        const enriched = [];
        for (const order of orderList) {
          const customer = await getCustomerById(order.customerId);
          const items = await getOrderItems(order.id);
          enriched.push({ ...order, customer, items });
        }
        return enriched;
      }),
      updateStatus: adminProcedure.input(z.object({
        id: z.number(),
        status: z.enum(["待處理", "待確認", "已付款", "待交付", "已完成", "已取消"]),
      })).mutation(async ({ input }) => {
        if (input.status === "已付款") {
          await confirmPayment(input.id);
        } else {
          await updateOrderStatus(input.id, input.status);
        }
        return { success: true };
      }),
      updateAmount: adminProcedure.input(z.object({
        id: z.number(),
        finalAmount: z.number().min(0),
      })).mutation(async ({ input }) => {
        await updateOrderAmount(input.id, input.finalAmount);
        return { success: true };
      }),
    }),

    // Exchange management
    exchanges: router({
      list: adminProcedure.input(z.object({
        status: z.string().optional(),
      }).optional()).query(async ({ input }) => {
        return listExchanges(input?.status);
      }),
      updateStatus: adminProcedure.input(z.object({
        id: z.number(),
        status: z.enum(["待審核", "確認交換", "待交付", "婉拒"]),
        rejectReason: z.string().optional(),
      })).mutation(async ({ input }) => {
        await updateExchangeStatus(input.id, input.status, {
          ...(input.rejectReason && { rejectReason: input.rejectReason }),
          ...(input.status === "確認交換" && { completedAt: new Date() }),
        } as any);
        return { success: true };
      }),
    }),

    // Customer management
    customers: router({
      list: adminProcedure.query(async () => {
        return listCustomers();
      }),
      getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        const customer = await getCustomerById(input.id);
        if (!customer) return null;
        const customerOrders = await getOrdersByCustomerId(customer.id);
        return { ...customer, orders: customerOrders };
      }),
      update: adminProcedure.input(z.object({
        id: z.number(),
        name: z.string().optional(),
        lineName: z.string().nullable().optional(),
        lineId: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      })).mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateCustomer(id, data as any);
        return { success: true };
      }),
      search: adminProcedure.input(z.object({ keyword: z.string() })).query(async ({ input }) => {
        return searchCustomers(input.keyword);
      }),
    }),

    // Stats
    stats: router({
      overview: adminProcedure.query(async () => {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [todayOrders, weekOrders, monthOrders, todayExchanges, weekExchanges, monthExchanges] = await Promise.all([
          getOrderStats(startOfDay),
          getOrderStats(startOfWeek),
          getOrderStats(startOfMonth),
          getExchangeStats(startOfDay),
          getExchangeStats(startOfWeek),
          getExchangeStats(startOfMonth),
        ]);

        return {
          today: { orders: todayOrders, exchanges: todayExchanges },
          week: { orders: weekOrders, exchanges: weekExchanges },
          month: { orders: monthOrders, exchanges: monthExchanges },
        };
      }),
    }),

    // Telegram test
    telegram: router({
      test: adminProcedure.mutation(async () => {
        const success = await sendTelegramMessage("🔔 測試訊息：Telegram Bot 連接成功！");
        return { success, configured: isTelegramConfigured() };
      }),
      sendMessage: adminProcedure.input(z.object({
        message: z.string().min(1),
      })).mutation(async ({ input }) => {
        const success = await sendTelegramMessage(input.message);
        return { success };
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
