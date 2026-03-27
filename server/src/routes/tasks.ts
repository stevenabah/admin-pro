import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { checkPermission } from "../middleware/rbac.js";

const router = Router();

// 任务状态机定义
const TASK_STATUS_FLOW: Record<string, string[]> = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["REVIEW", "CANCELLED"],
  REVIEW: ["COMPLETED", "IN_PROGRESS"],
  COMPLETED: [],
  CANCELLED: ["PENDING"],
};

// 任务状态中文映射
const STATUS_TEXT: Record<string, string> = {
  PENDING: "待处理",
  IN_PROGRESS: "进行中",
  REVIEW: "待审核",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

const PRIORITY_TEXT: Record<string, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  URGENT: "紧急",
};

// 获取任务列表（支持筛选、排序、分页）
router.get(
  "/",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const {
        page = "1",
        pageSize = "10",
        status,
        priority,
        assigneeId,
        keyword,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const where: any = {};

      if (status) {
        where.status = status;
      }
      if (priority) {
        where.priority = priority;
      }
      if (assigneeId) {
        where.assigneeId = assigneeId;
      }
      if (keyword) {
        where.OR = [
          { title: { contains: keyword as string } },
          { description: { contains: keyword as string } },
        ];
      }

      const skip = (Number(page) - 1) * Number(pageSize);
      const take = Number(pageSize);

      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy as string]: sortOrder },
          include: {
            assignee: {
              select: {
                id: true,
                username: true,
                nickname: true,
                avatar: true,
              },
            },
            creator: {
              select: {
                id: true,
                username: true,
                nickname: true,
                avatar: true,
              },
            },
            _count: {
              select: { comments: true, logs: true },
            },
          },
        }),
        prisma.task.count({ where }),
      ]);

      res.json({
        code: 200,
        data: {
          list: tasks.map((t) => ({
            ...t,
            statusText: STATUS_TEXT[t.status],
            priorityText: PRIORITY_TEXT[t.priority],
          })),
          pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            total,
            totalPages: Math.ceil(total / Number(pageSize)),
          },
        },
      });
    } catch (error) {
      console.error("Get tasks error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

// 获取看板数据（按状态分组）
router.get(
  "/board",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const tasks = await prisma.task.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          assignee: {
            select: { id: true, username: true, nickname: true, avatar: true },
          },
          creator: {
            select: { id: true, username: true, nickname: true },
          },
        },
      });

      const boardData = {
        PENDING: [],
        IN_PROGRESS: [],
        REVIEW: [],
        COMPLETED: [],
        CANCELLED: [],
      };

      tasks.forEach((task) => {
        if (boardData[task.status as keyof typeof boardData]) {
          boardData[task.status as keyof typeof boardData].push({
            ...task,
            statusText: STATUS_TEXT[task.status],
            priorityText: PRIORITY_TEXT[task.priority],
          });
        }
      });

      res.json({
        code: 200,
        data: boardData,
      });
    } catch (error) {
      console.error("Get board error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

// 获取单个任务详情
router.get(
  "/:id",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const task = await prisma.task.findUnique({
        where: { id },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              nickname: true,
              avatar: true,
              email: true,
            },
          },
          creator: {
            select: { id: true, username: true, nickname: true, avatar: true },
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  nickname: true,
                  avatar: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          logs: {
            include: {
              user: {
                select: { id: true, username: true, nickname: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!task) {
        return res.json({ code: 404, message: "任务不存在" });
      }

      res.json({
        code: 200,
        data: {
          ...task,
          statusText: STATUS_TEXT[task.status],
          priorityText: PRIORITY_TEXT[task.priority],
        },
      });
    } catch (error) {
      console.error("Get task error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

// 创建任务
router.post(
  "/",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { title, description, priority, assigneeId, dueDate } = req.body;
      const creatorId = req.user!.userId;

      if (!title) {
        return res.json({ code: 400, message: "任务标题不能为空" });
      }

      // 验证指派人是否存在
      if (assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: assigneeId },
        });
        if (!assignee) {
          return res.json({ code: 400, message: "指派用户不存在" });
        }
      }

      const task = await prisma.task.create({
        data: {
          title,
          description,
          priority: priority || "MEDIUM",
          assigneeId,
          creatorId,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
        include: {
          assignee: {
            select: { id: true, username: true, nickname: true, avatar: true },
          },
          creator: {
            select: { id: true, username: true, nickname: true, avatar: true },
          },
        },
      });

      // 创建任务日志
      await prisma.taskLog.create({
        data: {
          taskId: task.id,
          userId: creatorId,
          action: "create",
          content: "创建了任务",
        },
      });

      res.json({
        code: 200,
        data: {
          ...task,
          statusText: STATUS_TEXT[task.status],
          priorityText: PRIORITY_TEXT[task.priority],
        },
        message: "任务创建成功",
      });
    } catch (error) {
      console.error("Create task error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

// 更新任务
router.put(
  "/:id",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { title, description, priority, assigneeId, dueDate } = req.body;
      const userId = req.user!.userId;

      const existingTask = await prisma.task.findUnique({ where: { id } });
      if (!existingTask) {
        return res.json({ code: 404, message: "任务不存在" });
      }

      // 验证指派人是否存在
      if (assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: assigneeId },
        });
        if (!assignee) {
          return res.json({ code: 400, message: "指派用户不存在" });
        }
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (priority !== undefined) updateData.priority = priority;
      if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
      if (dueDate !== undefined) {
        updateData.dueDate = dueDate ? new Date(dueDate) : null;
      }

      const task = await prisma.task.update({
        where: { id },
        data: updateData,
        include: {
          assignee: {
            select: { id: true, username: true, nickname: true, avatar: true },
          },
          creator: {
            select: { id: true, username: true, nickname: true, avatar: true },
          },
        },
      });

      // 记录日志
      let logContent = "更新了任务";
      if (title !== undefined && title !== existingTask.title) {
        logContent += `，标题改为"${title}"`;
      }
      if (priority !== undefined && priority !== existingTask.priority) {
        logContent += `，优先级从${PRIORITY_TEXT[existingTask.priority]}改为${PRIORITY_TEXT[priority]}`;
      }
      if (assigneeId !== undefined && assigneeId !== existingTask.assigneeId) {
        logContent += "，重新指派任务";
      }

      await prisma.taskLog.create({
        data: {
          taskId: id,
          userId,
          action: "update",
          content: logContent,
        },
      });

      res.json({
        code: 200,
        data: {
          ...task,
          statusText: STATUS_TEXT[task.status],
          priorityText: PRIORITY_TEXT[task.priority],
        },
        message: "任务更新成功",
      });
    } catch (error) {
      console.error("Update task error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

// 更新任务状态（专门的状态更新端点，带状态机校验）
router.put(
  "/:id/status",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.userId;

      if (!status) {
        return res.json({ code: 400, message: "状态不能为空" });
      }

      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) {
        return res.json({ code: 404, message: "任务不存在" });
      }

      // 状态机校验
      const allowedTransitions = TASK_STATUS_FLOW[task.status] || [];
      if (!allowedTransitions.includes(status)) {
        return res.json({
          code: 400,
          message: `不能从 ${STATUS_TEXT[task.status]} 转换为 ${STATUS_TEXT[status]}`,
        });
      }

      const updatedTask = await prisma.task.update({
        where: { id },
        data: { status },
        include: {
          assignee: {
            select: { id: true, username: true, nickname: true, avatar: true },
          },
          creator: {
            select: { id: true, username: true, nickname: true, avatar: true },
          },
        },
      });

      // 记录日志
      await prisma.taskLog.create({
        data: {
          taskId: id,
          userId,
          action: "status_change",
          beforeStatus: task.status,
          afterStatus: status,
          content: `将任务状态从 ${STATUS_TEXT[task.status]} 改为 ${STATUS_TEXT[status]}`,
        },
      });

      res.json({
        code: 200,
        data: {
          ...updatedTask,
          statusText: STATUS_TEXT[updatedTask.status],
          priorityText: PRIORITY_TEXT[updatedTask.priority],
        },
        message: "状态更新成功",
      });
    } catch (error) {
      console.error("Update task status error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

// 删除任务
router.delete(
  "/:id",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const existingTask = await prisma.task.findUnique({ where: { id } });
      if (!existingTask) {
        return res.json({ code: 404, message: "任务不存在" });
      }

      await prisma.task.delete({ where: { id } });

      res.json({
        code: 200,
        message: "任务删除成功",
      });
    } catch (error) {
      console.error("Delete task error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

// 添加评论
router.post(
  "/:id/comments",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user!.userId;

      if (!content) {
        return res.json({ code: 400, message: "评论内容不能为空" });
      }

      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) {
        return res.json({ code: 404, message: "任务不存在" });
      }

      const comment = await prisma.comment.create({
        data: {
          taskId: id,
          userId,
          content,
        },
        include: {
          user: {
            select: { id: true, username: true, nickname: true, avatar: true },
          },
        },
      });

      // 记录日志
      await prisma.taskLog.create({
        data: {
          taskId: id,
          userId,
          action: "comment",
          content: "添加了评论",
        },
      });

      res.json({
        code: 200,
        data: comment,
        message: "评论添加成功",
      });
    } catch (error) {
      console.error("Add comment error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

// 获取任务统计
router.get(
  "/stats/summary",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate, assigneeId } = req.query;

      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate as string);
        }
      }
      if (assigneeId) {
        where.assigneeId = assigneeId;
      }

      // 按状态统计
      const statusStats = await prisma.task.groupBy({
        by: ["status"],
        where,
        _count: true,
      });

      // 按优先级统计
      const priorityStats = await prisma.task.groupBy({
        by: ["priority"],
        where,
        _count: true,
      });

      // 本月创建的任务数
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const monthStats = await prisma.task.aggregate({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
          ...(assigneeId ? { assigneeId: assigneeId as string } : {}),
        },
        _count: true,
      });

      // 本月完成的任务数
      const monthCompletedStats = await prisma.task.aggregate({
        where: {
          status: "COMPLETED",
          updatedAt: {
            gte: monthStart,
            lte: monthEnd,
          },
          ...(assigneeId ? { assigneeId: assigneeId as string } : {}),
        },
        _count: true,
      });

      // 逾期任务数
      const overdueStats = await prisma.task.aggregate({
        where: {
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          dueDate: { lt: now },
          ...(assigneeId ? { assigneeId: assigneeId as string } : {}),
        },
        _count: true,
      });

      // 格式化状态统计
      const statusFormatted = {
        pending: 0,
        inProgress: 0,
        review: 0,
        completed: 0,
        cancelled: 0,
      };
      statusStats.forEach((s) => {
        switch (s.status) {
          case "PENDING":
            statusFormatted.pending = s._count;
            break;
          case "IN_PROGRESS":
            statusFormatted.inProgress = s._count;
            break;
          case "REVIEW":
            statusFormatted.review = s._count;
            break;
          case "COMPLETED":
            statusFormatted.completed = s._count;
            break;
          case "CANCELLED":
            statusFormatted.cancelled = s._count;
            break;
        }
      });

      // 格式化优先级统计
      const priorityFormatted = {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      };
      priorityStats.forEach((p) => {
        switch (p.priority) {
          case "LOW":
            priorityFormatted.low = p._count;
            break;
          case "MEDIUM":
            priorityFormatted.medium = p._count;
            break;
          case "HIGH":
            priorityFormatted.high = p._count;
            break;
          case "URGENT":
            priorityFormatted.urgent = p._count;
            break;
        }
      });

      // 按人员统计任务数
      const assigneeStats = await prisma.task.groupBy({
        by: ["assigneeId"],
        where: {
          ...where,
          assigneeId: { not: null },
        },
        _count: true,
      });

      const assigneeWithNames = await Promise.all(
        assigneeStats.map(async (s) => {
          const user = await prisma.user.findUnique({
            where: { id: s.assigneeId! },
            select: { id: true, username: true, nickname: true },
          });
          return {
            assigneeId: s.assigneeId,
            assigneeName: user?.nickname || user?.username || "未知",
            count: s._count,
          };
        }),
      );

      const total =
        statusFormatted.pending +
        statusFormatted.inProgress +
        statusFormatted.review +
        statusFormatted.completed +
        statusFormatted.cancelled;

      res.json({
        code: 200,
        data: {
          total,
          status: statusFormatted,
          priority: priorityFormatted,
          monthCreated: monthStats._count,
          monthCompleted: monthCompletedStats._count,
          overdue: overdueStats._count,
          completionRate:
            monthStats._count > 0
              ? Math.round(
                  (monthCompletedStats._count / monthStats._count) * 100,
                )
              : 0,
          assigneeStats: assigneeWithNames,
        },
      });
    } catch (error) {
      console.error("Get task stats error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

// 获取任务日志
router.get(
  "/:id/logs",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { page = "1", pageSize = "20" } = req.query;

      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) {
        return res.json({ code: 404, message: "任务不存在" });
      }

      const [logs, total] = await Promise.all([
        prisma.taskLog.findMany({
          where: { taskId: id },
          include: {
            user: { select: { id: true, username: true, nickname: true } },
          },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
          orderBy: { createdAt: "desc" },
        }),
        prisma.taskLog.count({ where: { taskId: id } }),
      ]);

      res.json({
        code: 200,
        data: {
          list: logs.map((l) => ({
            ...l,
            beforeStatusText: l.beforeStatus
              ? STATUS_TEXT[l.beforeStatus]
              : null,
            afterStatusText: l.afterStatus ? STATUS_TEXT[l.afterStatus] : null,
          })),
          pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            total,
            totalPages: Math.ceil(total / Number(pageSize)),
          },
        },
      });
    } catch (error) {
      console.error("Get task logs error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

export default router;
