import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

const router = Router();

// 获取当前用户的通知列表
router.get(
  "/",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { page = "1", pageSize = "20", isRead } = req.query;

      const where: any = { userId };
      if (isRead !== undefined) {
        where.isRead = isRead === "true";
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
        }),
        prisma.notification.count({ where }),
      ]);

      // 获取未读数量
      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
      });

      res.json({
        code: 200,
        data: {
          list: notifications,
          unreadCount,
          pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            total,
            totalPages: Math.ceil(total / Number(pageSize)),
          },
        },
      });
    } catch (error) {
      console.error("Get notifications error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

// 标记单条通知为已读
router.put(
  "/:id/read",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        return res.json({ code: 404, message: "通知不存在" });
      }

      if (notification.userId !== userId) {
        return res.json({ code: 403, message: "无权限操作" });
      }

      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });

      res.json({ code: 200, message: "标记已读成功" });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

// 标记全部通知为已读
router.put(
  "/read-all",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;

      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      res.json({ code: 200, message: "全部已读" });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

// 删除通知
router.delete(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        return res.json({ code: 404, message: "通知不存在" });
      }

      if (notification.userId !== userId) {
        return res.json({ code: 403, message: "无权限操作" });
      }

      await prisma.notification.delete({ where: { id } });

      res.json({ code: 200, message: "删除成功" });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

// 获取未读通知数量
router.get(
  "/unread-count",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;

      const count = await prisma.notification.count({
        where: { userId, isRead: false },
      });

      res.json({ code: 200, data: { count } });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

// 创建通知（内部服务调用）
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  content?: string,
  taskId?: string
) {
  return prisma.notification.create({
    data: { userId, type, title, content, taskId },
  });
}

export default router;