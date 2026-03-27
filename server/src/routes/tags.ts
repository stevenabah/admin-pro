import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { checkPermission } from "../middleware/rbac.js";

const router = Router();

// 获取标签列表
router.get(
  "/",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;

      const tags = await prisma.tag.findMany({
        where: {
          OR: [
            { userId: null }, // 系统标签
            { userId: userId }, // 当前用户创建的标签
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        code: 200,
        data: tags,
      });
    } catch (error) {
      console.error("Get tags error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

// 创建标签
router.post(
  "/",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { name, color } = req.body;
      const userId = req.user!.userId;

      if (!name) {
        return res.json({ code: 400, message: "标签名称不能为空" });
      }

      const tag = await prisma.tag.create({
        data: {
          name,
          color: color || "#409eff",
          userId, // 标签创建者
        },
      });

      res.json({
        code: 200,
        data: tag,
        message: "标签创建成功",
      });
    } catch (error) {
      console.error("Create tag error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

// 更新标签
router.put(
  "/:id",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { name, color } = req.body;
      const userId = req.user!.userId;

      const existingTag = await prisma.tag.findUnique({ where: { id } });
      if (!existingTag) {
        return res.json({ code: 404, message: "标签不存在" });
      }

      // 检查权限：只有创建者可以修改
      if (existingTag.userId && existingTag.userId !== userId) {
        return res.json({ code: 403, message: "无权限操作" });
      }

      const tag = await prisma.tag.update({
        where: { id },
        data: {
          name: name !== undefined ? name : existingTag.name,
          color: color !== undefined ? color : existingTag.color,
        },
      });

      res.json({
        code: 200,
        data: tag,
        message: "标签更新成功",
      });
    } catch (error) {
      console.error("Update tag error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

// 删除标签
router.delete(
  "/:id",
  authMiddleware,
  checkPermission("taskManage"),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const existingTag = await prisma.tag.findUnique({ where: { id } });
      if (!existingTag) {
        return res.json({ code: 404, message: "标签不存在" });
      }

      // 检查权限：只有创建者可以删除
      if (existingTag.userId && existingTag.userId !== userId) {
        return res.json({ code: 403, message: "无权限操作" });
      }

      await prisma.tag.delete({ where: { id } });

      res.json({
        code: 200,
        message: "标签删除成功",
      });
    } catch (error) {
      console.error("Delete tag error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  }
);

export default router;
