import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import {
  listPublicCourses, listAllCourses, getCourseById, createCourse, updateCourse, deleteCourse,
  findOrCreateCustomer, listCustomers, getCustomerById, updateCustomerNotes, searchCustomers,
  createOrder, listOrders, getOrderById, getOrderByNumber, getOrderItems, updateOrderStatus, notifyPayment, confirmPayment, getOrdersByCustomerId,
  createExchange, listExchanges, getExchangeById, updateExchangeStatus, getPendingExchanges,
  getOrderStats, getExchangeStats, getPendingOrders,
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
      return listPublicCourses();
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return getCourseById(input.id);
    }),
  }),

  // ─── Order API (public for customers) ───
  order: router({
    create: publicProcedure.input(z.object({
      customerName: z.string().min(1),
      customerLineId: z.string().optional(),
      customerPhone: z.string().optional(),
      customerEmail: z.string().optional(),
      paymentMethod: z.string().optional(),
      items: z.array(z.object({
        courseId: z.number(),
        courseName: z.string(),
        price: z.number(),
      })).min(1),
    })).mutation(async ({ input }) => {
      const customerId = await findOrCreateCustomer({
        name: input.customerName,
        lineId: input.customerLineId,
        phone: input.customerPhone,
        email: input.customerEmail,
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
          customerLineId: input.customerLineId,
          customerPhone: input.customerPhone,
          items: input.items,
          totalAmount: result.totalAmount,
          discountAmount: result.discountAmount,
          finalAmount: result.finalAmount,
        });
        await sendTelegramMessage(msg);
      }

      return result;
    }),

    notifyPayment: publicProcedure.input(z.object({
      orderId: z.number(),
    })).mutation(async ({ input }) => {
      const order = await getOrderById(input.orderId);
      if (!order) throw new Error("Order not found");
      await notifyPayment(order.id);

      // Send Telegram notification
      if (isTelegramConfigured()) {
        const customer = await getCustomerById(order.customerId);
        const msg = formatPaymentNotification({
          orderNumber: order.orderNumber,
          customerName: customer?.name || "客戶",
          customerLineId: customer?.lineId || undefined,
          customerPhone: customer?.phone || undefined,
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
      applicantLineId: z.string().optional(),
      applicantPhone: z.string().optional(),
      wantedCourseId: z.number(),
      wantedCourseName: z.string(),
      offeredCourseName: z.string().min(1),
      offeredCourseDescription: z.string().optional(),
      provideMethod: z.enum(["account_password", "original_file", "recording"]),
    })).mutation(async ({ input }) => {
      const result = await createExchange(input as any);

      // Send Telegram notification
      if (isTelegramConfigured()) {
        const msg = formatExchangeNotification({
          exchangeNumber: result.exchangeNumber,
          applicantName: input.applicantName,
          applicantLineId: input.applicantLineId,
          applicantPhone: input.applicantPhone,
          wantedCourseName: input.wantedCourseName,
          offeredCourseName: input.offeredCourseName,
          offeredCourseDescription: input.offeredCourseDescription,
          provideMethod: input.provideMethod,
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
        description: z.string().optional(),
        price: z.number().min(0),
        link: z.string().optional(),
        status: z.enum(["completed", "ongoing", "upcoming"]),
        scheduledAt: z.string().optional(),
        isPublic: z.boolean().default(true),
        allowExchange: z.boolean().default(true),
      })).mutation(async ({ input }) => {
        const id = await createCourse({
          ...input,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          source: "self",
        });
        return { id };
      }),
      update: adminProcedure.input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.number().optional(),
        link: z.string().optional(),
        status: z.enum(["completed", "ongoing", "upcoming"]).optional(),
        scheduledAt: z.string().nullable().optional(),
        isPublic: z.boolean().optional(),
        allowExchange: z.boolean().optional(),
      })).mutation(async ({ input }) => {
        const { id, scheduledAt, ...rest } = input;
        await updateCourse(id, {
          ...rest,
          ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
        });
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
        // Enrich with customer info and items
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
        status: z.enum(["pending", "awaiting_confirmation", "paid", "completed", "cancelled"]),
      })).mutation(async ({ input }) => {
        if (input.status === "paid") {
          await confirmPayment(input.id);
        } else {
          await updateOrderStatus(input.id, input.status);
        }
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
        status: z.enum(["pending", "accepted", "rejected", "awaiting_course", "completed"]),
        rejectReason: z.string().optional(),
      })).mutation(async ({ input }) => {
        await updateExchangeStatus(input.id, input.status, {
          ...(input.rejectReason && { rejectReason: input.rejectReason }),
          ...(input.status === "completed" && { completedAt: new Date() }),
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
        const orders = await getOrdersByCustomerId(customer.id);
        return { ...customer, orders };
      }),
      updateNotes: adminProcedure.input(z.object({
        id: z.number(),
        notes: z.string(),
      })).mutation(async ({ input }) => {
        await updateCustomerNotes(input.id, input.notes);
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
