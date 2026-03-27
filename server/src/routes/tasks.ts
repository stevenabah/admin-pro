import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { checkPermission } from "../middleware/rbac.js";
import { createNotification } from "./notifications.js";
import ExcelJS from "exceljs";

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
        tag,
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
      if (tag) {
        where.tags = { contains: tag as string };
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

      // 解析标签
      const tasksWithParsedTags = tasks.map((t) => {
        let parsedTags: string[] = [];
        if (t.tags) {
          try {
            parsedTags = JSON.parse(t.tags);
          } catch (e) {
            parsedTags = [];
          }
        }
        return {
          ...t,
          tags: parsedTags,
          statusText: STATUS_TEXT[t.status],
          priorityText: PRIORITY_TEXT[t.priority],
          isOverdue:
            !["COMPLETED", "CANCELLED"].includes(t.status) &&
            t.dueDate !== null &&
            new Date(t.dueDate) < new Date(),
        };
      });

      res.json({
        code: 200,
        data: {
          list: tasksWithParsedTags,
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
  }
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

      // 解析标签
      const tasksWithParsedTags = tasks.map((t) => {
        let parsedTags: string[] = [];
        if (t.tags) {
          try {
            parsedTags = JSON.parse(t.tags);
          } catch (e) {
            parsedTags = [];
          }
        }
        return {
          ...t,
          tags: parsedTags,
          statusText: STATUS_TEXT[t.status],
          priorityText: PRIORITY_TEXT[t.priority],
          isOverdue:
            !["COMPLETED", "CANCELLED"].includes(t.status) &&
            t.dueDate !== null &&
            new Date(t.dueDate) < new Date(),
        };
      });

      const now = new Date();
      const boardData: Record<string, typeof tasksWithParsedTags> = {
        PENDING: [],
        IN_PROGRESS: [],
        REVIEW: [],
        COMPLETED: [],
        CANCELLED: [],
      };

      tasksWithParsedTags.forEach((task) => {
        if (boardData[task.status]) {
          boardData[task.status].push(task);
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
  }
);

// 导出任务（支持Excel和CSV格式）
router.get(
  "/export",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { format = "xlsx", status, priority, assigneeId, keyword, tag } = req.query as any;

      // 构建查询条件（与列表API一致）
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
          { title: { contains: keyword } },
          { description: { contains: keyword } },
        ];
      }
      if (tag) {
        where.tags = { contains: tag };
      }

      // 获取所有匹配的任务（不分页）
      const tasks = await prisma.task.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          assignee: {
            select: { id: true, username: true, nickname: true },
          },
          creator: {
            select: { id: true, username: true, nickname: true },
          },
        },
      });

      // 获取标签列表用于名称映射
      const tags = await prisma.tag.findMany();
      const tagMap: Record<string, string> = {};
      tags.forEach((t) => {
        tagMap[t.id] = t.name;
      });

      // 格式化任务数据
      const formattedTasks = tasks.map((t) => {
        let parsedTags: string[] = [];
        if (t.tags) {
          try {
            parsedTags = JSON.parse(t.tags);
          } catch (e) {
            parsedTags = [];
          }
        }
        const tagNames = parsedTags.map((tagId) => tagMap[tagId] || tagId).join(", ");

        return {
          id: t.id,
          title: t.title,
          description: t.description || "",
          status: STATUS_TEXT[t.status] || t.status,
          priority: PRIORITY_TEXT[t.priority] || t.priority,
          assignee: t.assignee ? t.assignee.nickname || t.assignee.username : "",
          creator: t.creator ? t.creator.nickname || t.creator.username : "",
          dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString("zh-CN") : "",
          tags: tagNames,
          createdAt: t.createdAt.toLocaleDateString("zh-CN"),
          updatedAt: t.updatedAt.toLocaleDateString("zh-CN"),
        };
      });

      // 生成Excel文件
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("任务列表");

      // 设置列标题
      worksheet.columns = [
        { header: "ID", key: "id", width: 36 },
        { header: "任务标题", key: "title", width: 30 },
        { header: "任务描述", key: "description", width: 40 },
        { header: "状态", key: "status", width: 10 },
        { header: "优先级", key: "priority", width: 10 },
        { header: "负责人", key: "assignee", width: 12 },
        { header: "创建人", key: "creator", width: 12 },
        { header: "截止日期", key: "dueDate", width: 12 },
        { header: "标签", key: "tags", width: 20 },
        { header: "创建时间", key: "createdAt", width: 12 },
        { header: "更新时间", key: "updatedAt", width: 12 },
      ];

      // 添加数据行
      formattedTasks.forEach((task) => {
        worksheet.addRow(task);
      });

      // 设置响应头
      const fileName = `tasks_export_${new Date().toISOString().split("T")[0]}`;

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}.csv"`);

        // CSV格式输出
        const csvRows: string[] = [];
        csvRows.push("ID,任务标题,任务描述,状态,优先级,负责人,创建人,截止日期,标签,创建时间,更新时间");

        formattedTasks.forEach((task) => {
          const row = [
            task.id,
            `"${(task.title || "").replace(/"/g, '""')}"`,
            `"${(task.description || "").replace(/"/g, '""')}"`,
            task.status,
            task.priority,
            task.assignee,
            task.creator,
            task.dueDate,
            `"${(task.tags || "").replace(/"/g, '""')}"`,
            task.createdAt,
            task.updatedAt,
          ].join(",");
          csvRows.push(row);
        });

        res.send("\uFEFF" + csvRows.join("\n")); // BOM for Excel UTF-8
      } else {
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}.xlsx"`);

        const buffer = await workbook.xlsx.writeBuffer();
        res.send(buffer);
      }
    } catch (error) {
      console.error("Export tasks error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
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

      // 解析评论中的mentions和attachments和标签
      let parsedTags: string[] = [];
      if (task.tags) {
        try {
          parsedTags = JSON.parse(task.tags);
        } catch (e) {
          parsedTags = [];
        }
      }

      const processedComments = await Promise.all(
        task.comments.map(async (comment) => {
          let mentionUsers: any[] = [];
          let attachmentIds: string[] = [];

          if (comment.mentions) {
            try {
              const mentionIds = JSON.parse(comment.mentions);
              if (Array.isArray(mentionIds) && mentionIds.length > 0) {
                const users = await prisma.user.findMany({
                  where: { id: { in: mentionIds } },
                  select: { id: true, username: true, nickname: true, avatar: true },
                });
                mentionUsers = users;
              }
            } catch (e) {
              // ignore parse error
            }
          }

          if (comment.attachments) {
            try {
              attachmentIds = JSON.parse(comment.attachments);
            } catch (e) {
              // ignore parse error
            }
          }

          return {
            ...comment,
            mentionUsers,
            attachmentIds,
          };
        })
      );

      res.json({
        code: 200,
        data: {
          ...task,
          tags: parsedTags,
          comments: processedComments,
          statusText: STATUS_TEXT[task.status],
          priorityText: PRIORITY_TEXT[task.priority],
        },
      });
    } catch (error) {
      console.error("Get task error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

// 创建任务
router.post(
  "/",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { title, description, priority, assigneeId, dueDate, tags } = req.body;
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
          tags: tags && Array.isArray(tags) ? JSON.stringify(tags) : null,
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

      // 发送通知给任务负责人
      if (assigneeId && assigneeId !== creatorId) {
        const creator = await prisma.user.findUnique({ where: { id: creatorId } });
        const creatorName = creator?.nickname || creator?.username || "有人";
        await createNotification(
          assigneeId,
          "assign",
          `${creatorName} 给你分配了新任务`,
          title,
          task.id
        );
      }

      // 解析标签
      let parsedTags: string[] = [];
      if (task.tags) {
        try {
          parsedTags = JSON.parse(task.tags);
        } catch (e) {
          parsedTags = [];
        }
      }

      res.json({
        code: 200,
        data: {
          ...task,
          tags: parsedTags,
          statusText: STATUS_TEXT[task.status],
          priorityText: PRIORITY_TEXT[task.priority],
        },
        message: "任务创建成功",
      });
    } catch (error) {
      console.error("Create task error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

// 更新任务
router.put(
  "/:id",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { title, description, priority, assigneeId, dueDate, tags } = req.body;
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
      if (tags !== undefined) {
        updateData.tags = tags && Array.isArray(tags) ? JSON.stringify(tags) : null;
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

      // 如果重新指派了任务，发送通知给新的负责人
      if (assigneeId !== undefined && assigneeId !== existingTask.assigneeId && assigneeId) {
        const currentUser = await prisma.user.findUnique({ where: { id: userId } });
        const userName = currentUser?.nickname || currentUser?.username || "有人";
        await createNotification(
          assigneeId,
          "assign",
          `${userName} 给你分配了新任务`,
          title || existingTask.title,
          id
        );
      }

      // 解析标签
      let parsedTags: string[] = [];
      if (task.tags) {
        try {
          parsedTags = JSON.parse(task.tags);
        } catch (e) {
          parsedTags = [];
        }
      }

      res.json({
        code: 200,
        data: {
          ...task,
          tags: parsedTags,
          statusText: STATUS_TEXT[task.status],
          priorityText: PRIORITY_TEXT[task.priority],
        },
        message: "任务更新成功",
      });
    } catch (error) {
      console.error("Update task error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
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

      // 如果任务完成，通知任务创建者
      if (status === "COMPLETED" && task.creatorId !== userId) {
        const currentUser = await prisma.user.findUnique({ where: { id: userId } });
        const userName = currentUser?.nickname || currentUser?.username || "有人";
        await createNotification(
          task.creatorId,
          "status_change",
          `${userName} 完成了任务`,
          task.title,
          id
        );
      }

      // 解析标签
      let parsedTags: string[] = [];
      if (updatedTask.tags) {
        try {
          parsedTags = JSON.parse(updatedTask.tags);
        } catch (e) {
          parsedTags = [];
        }
      }

      res.json({
        code: 200,
        data: {
          ...updatedTask,
          tags: parsedTags,
          statusText: STATUS_TEXT[updatedTask.status],
          priorityText: PRIORITY_TEXT[updatedTask.priority],
        },
        message: "状态更新成功",
      });
    } catch (error) {
      console.error("Update task status error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
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
  }
);

// 批量更新任务状态
router.put(
  "/batch/status",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { taskIds, status } = req.body;
      const userId = req.user!.userId;

      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return res.json({ code: 400, message: "请选择要操作的任务" });
      }
      if (!status) {
        return res.json({ code: 400, message: "状态不能为空" });
      }

      // 验证所有任务都可以转换为目标状态
      const tasks = await prisma.task.findMany({
        where: { id: { in: taskIds } },
      });

      if (tasks.length !== taskIds.length) {
        return res.json({ code: 400, message: "部分任务不存在" });
      }

      const invalidTasks = tasks.filter(
        (t) => !TASK_STATUS_FLOW[t.status]?.includes(status)
      );
      if (invalidTasks.length > 0) {
        return res.json({
          code: 400,
          message: `以下任务不能转换为 ${STATUS_TEXT[status]}：${invalidTasks.map((t) => t.title).join(", ")}`,
        });
      }

      // 批量更新
      await prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: { status },
      });

      // 批量创建日志
      await prisma.taskLog.createMany({
        data: tasks.map((t) => ({
          taskId: t.id,
          userId,
          action: "status_change",
          beforeStatus: t.status,
          afterStatus: status,
          content: `批量将任务状态从 ${STATUS_TEXT[t.status]} 改为 ${STATUS_TEXT[status]}`,
        })),
      });

      // 如果任务完成，通知任务创建者
      if (status === "COMPLETED") {
        const currentUser = await prisma.user.findUnique({ where: { id: userId } });
        const userName = currentUser?.nickname || currentUser?.username || "有人";
        for (const task of tasks) {
          if (task.creatorId !== userId) {
            await createNotification(
              task.creatorId,
              "status_change",
              `${userName} 完成了任务`,
              task.title,
              task.id
            );
          }
        }
      }

      res.json({
        code: 200,
        message: `成功更新 ${taskIds.length} 个任务的状态`,
      });
    } catch (error) {
      console.error("Batch update status error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

// 批量分配任务
router.put(
  "/batch/assign",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { taskIds, assigneeId } = req.body;
      const userId = req.user!.userId;

      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return res.json({ code: 400, message: "请选择要操作的任务" });
      }
      if (!assigneeId) {
        return res.json({ code: 400, message: "请选择负责人" });
      }

      // 验证指派人是否存在
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
      });
      if (!assignee) {
        return res.json({ code: 400, message: "指派用户不存在" });
      }

      // 获取要更新的任务
      const tasks = await prisma.task.findMany({
        where: { id: { in: taskIds } },
      });

      if (tasks.length !== taskIds.length) {
        return res.json({ code: 400, message: "部分任务不存在" });
      }

      // 批量更新
      await prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: { assigneeId },
      });

      // 批量创建日志
      await prisma.taskLog.createMany({
        data: tasks.map((t) => ({
          taskId: t.id,
          userId,
          action: "update",
          content: `批量重新指派任务给 ${assignee.nickname || assignee.username}`,
        })),
      });

      // 发送通知给新的负责人
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      const userName = currentUser?.nickname || currentUser?.username || "有人";
      for (const task of tasks) {
        if (assigneeId !== userId) {
          await createNotification(
            assigneeId,
            "assign",
            `${userName} 给你分配了新任务`,
            task.title,
            task.id
          );
        }
      }

      res.json({
        code: 200,
        message: `成功分配 ${taskIds.length} 个任务给 ${assignee.nickname || assignee.username}`,
      });
    } catch (error) {
      console.error("Batch assign error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

// 批量删除任务
router.delete(
  "/batch",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { taskIds } = req.body;

      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return res.json({ code: 400, message: "请选择要删除的任务" });
      }

      // 验证任务存在
      const tasks = await prisma.task.findMany({
        where: { id: { in: taskIds } },
      });

      if (tasks.length !== taskIds.length) {
        return res.json({ code: 400, message: "部分任务不存在" });
      }

      // 批量删除
      await prisma.task.deleteMany({
        where: { id: { in: taskIds } },
      });

      res.json({
        code: 200,
        message: `成功删除 ${taskIds.length} 个任务`,
      });
    } catch (error) {
      console.error("Batch delete error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

// 添加评论（支持@提及和附件）
router.post(
  "/:id/comments",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { content, mentions, attachments } = req.body;
      const userId = req.user!.userId;

      if (!content) {
        return res.json({ code: 400, message: "评论内容不能为空" });
      }

      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) {
        return res.json({ code: 404, message: "任务不存在" });
      }

      // 解析mentions：如果传入的是用户ID列表，直接使用；如果是@username格式，需要解析
      let mentionUserIds: string[] = [];
      if (mentions) {
        if (Array.isArray(mentions)) {
          mentionUserIds = mentions;
        } else if (typeof mentions === "string") {
          mentionUserIds = JSON.parse(mentions);
        }
      }

      const comment = await prisma.comment.create({
        data: {
          taskId: id,
          userId,
          content,
          mentions: mentionUserIds.length > 0 ? JSON.stringify(mentionUserIds) : null,
          attachments: attachments ? (Array.isArray(attachments) ? JSON.stringify(attachments) : attachments) : null,
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

      // 发送通知给被@的用户
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      const userName = currentUser?.nickname || currentUser?.username || "有人";
      for (const mentionedUserId of mentionUserIds) {
        if (mentionedUserId !== userId) {
          // 不通知自己
          await createNotification(
            mentionedUserId,
            "mention",
            `${userName} 在任务中提到了你`,
            content.substring(0, 100),
            id
          );
        }
      }

      // 如果任务有负责人且不是评论者，通知负责人
      if (task.assigneeId && task.assigneeId !== userId) {
        await createNotification(
          task.assigneeId,
          "comment",
          `${userName} 评论了你的任务`,
          content.substring(0, 100),
          id
        );
      }

      res.json({
        code: 200,
        data: {
          ...comment,
          mentionUsers: mentionUserIds,
        },
        message: "评论添加成功",
      });
    } catch (error) {
      console.error("Add comment error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
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
        })
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
  }
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
  }
);

// 获取个人工作台数据（当前用户的任务统计）
router.get(
  "/my/dashboard",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const now = new Date();

      // 获取当前用户负责的任务
      const myTasks = await prisma.task.findMany({
        where: { assigneeId: userId },
        select: { id: true, status: true, priority: true, dueDate: true, tags: true },
      });

      // 获取当前用户创建的任务
      const createdTasks = await prisma.task.findMany({
        where: { creatorId: userId },
        select: { id: true, status: true },
      });

      // 统计负责任务的各状态数量
      const myStatusStats = {
        pending: myTasks.filter((t) => t.status === "PENDING").length,
        inProgress: myTasks.filter((t) => t.status === "IN_PROGRESS").length,
        review: myTasks.filter((t) => t.status === "REVIEW").length,
        completed: myTasks.filter((t) => t.status === "COMPLETED").length,
        cancelled: myTasks.filter((t) => t.status === "CANCELLED").length,
      };

      // 统计逾期任务
      const myOverdue = myTasks.filter(
        (t) =>
          !["COMPLETED", "CANCELLED"].includes(t.status) &&
          t.dueDate !== null &&
          new Date(t.dueDate) < now
      ).length;

      // 获取我的待办任务（未完成的）
      const myTodoTasks = await prisma.task.findMany({
        where: {
          assigneeId: userId,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        take: 5,
        include: {
          creator: { select: { id: true, username: true, nickname: true } },
        },
      });

      // 获取最近创建的任务（我创建的）
      const recentCreatedTasks = await prisma.task.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          assignee: { select: { id: true, username: true, nickname: true } },
        },
      });

      // 获取逾期提醒（今天应该完成但未完成的）
      const todayOverdueTasks = await prisma.task.findMany({
        where: {
          assigneeId: userId,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          dueDate: {
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          },
        },
        include: {
          creator: { select: { id: true, username: true, nickname: true } },
        },
      });

      res.json({
        code: 200,
        data: {
          stats: {
            total: myTasks.length,
            ...myStatusStats,
            overdue: myOverdue,
            createdByMe: createdTasks.length,
          },
          myTodoTasks: myTodoTasks.map((t) => {
            let parsedTags: string[] = [];
            if (t.tags) {
              try {
                parsedTags = JSON.parse(t.tags);
              } catch (e) {
                parsedTags = [];
              }
            }
            return {
              ...t,
              tags: parsedTags,
              statusText: STATUS_TEXT[t.status],
              priorityText: PRIORITY_TEXT[t.priority],
              isOverdue:
                !["COMPLETED", "CANCELLED"].includes(t.status) &&
                t.dueDate !== null &&
                new Date(t.dueDate) < now,
            };
          }),
          recentCreatedTasks: recentCreatedTasks.map((t) => {
            let parsedTags: string[] = [];
            if (t.tags) {
              try {
                parsedTags = JSON.parse(t.tags);
              } catch (e) {
                parsedTags = [];
              }
            }
            return {
              ...t,
              tags: parsedTags,
              statusText: STATUS_TEXT[t.status],
              priorityText: PRIORITY_TEXT[t.priority],
            };
          }),
          todayOverdueTasks: todayOverdueTasks.map((t) => {
            let parsedTags: string[] = [];
            if (t.tags) {
              try {
                parsedTags = JSON.parse(t.tags);
              } catch (e) {
                parsedTags = [];
              }
            }
            return {
              ...t,
              tags: parsedTags,
              statusText: STATUS_TEXT[t.status],
              priorityText: PRIORITY_TEXT[t.priority],
            };
          }),
        },
      });
    } catch (error) {
      console.error("Get my dashboard error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

// 获取甘特图数据
router.get(
  "/gantt",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { assigneeId, startDate, endDate } = req.query as any;

      // 构建查询条件
      const where: any = {};
      if (assigneeId) {
        where.assigneeId = assigneeId;
      }
      if (startDate) {
        where.createdAt = { gte: new Date(startDate) };
      }
      if (endDate) {
        where.updatedAt = { ...where.updatedAt, lte: new Date(endDate) };
      }

      const tasks = await prisma.task.findMany({
        where,
        orderBy: { createdAt: "asc" },
        include: {
          assignee: {
            select: { id: true, username: true, nickname: true },
          },
        },
      });

      // 计算进度（基于状态）
      const calculateProgress = (status: string): number => {
        switch (status) {
          case "PENDING": return 0;
          case "IN_PROGRESS": return 50;
          case "REVIEW": return 80;
          case "COMPLETED": return 100;
          case "CANCELLED": return 0;
          default: return 0;
        }
      };

      // 映射为甘特图数据格式
      const ganttData = tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        startDate: task.createdAt.toISOString().split("T")[0],
        endDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : task.updatedAt.toISOString().split("T")[0],
        progress: calculateProgress(task.status),
        assigneeId: task.assigneeId,
        assigneeName: task.assignee ? task.assignee.nickname || task.assignee.username : "",
      }));

      // 按人员分组
      const tasksByAssignee: Record<string, typeof ganttData> = {};
      ganttData.forEach((task) => {
        const key = task.assigneeId || "unassigned";
        if (!tasksByAssignee[key]) {
          tasksByAssignee[key] = [];
        }
        tasksByAssignee[key].push(task);
      });

      res.json({
        code: 200,
        data: {
          tasks: ganttData,
          tasksByAssignee,
          total: ganttData.length,
        },
      });
    } catch (error) {
      console.error("Get gantt data error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

export default router;
