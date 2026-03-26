import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { checkPermission } from "../middleware/rbac.js";

const router = Router();

// 获取权限列表
router.get(
  "/",
  authMiddleware,
  checkPermission("permissionManage"),
  async (req: AuthRequest, res) => {
    try {
      const permissions = await prisma.permission.findMany({
        include: { children: true },
        orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
      });
      res.json({ code: 200, data: permissions });
    } catch (error) {
      console.error("Get permissions error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

// 获取所有权限（树形结构）
router.get(
  "/tree",
  authMiddleware,
  checkPermission("permissionManage"),
  async (req: AuthRequest, res) => {
    try {
      const permissions = await prisma.permission.findMany({
        orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
      });

      const buildTree = (parentId: string | null): any[] => {
        return permissions
          .filter((p) => p.parentId === parentId)
          .map((p) => ({
            ...p,
            children: buildTree(p.id),
          }));
      };

      res.json({ code: 200, data: buildTree(null) });
    } catch (error) {
      console.error("Get permission tree error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

// 创建权限
router.post(
  "/",
  authMiddleware,
  checkPermission("permissionManage"),
  async (req: AuthRequest, res) => {
    try {
      const {
        name,
        code,
        type = "menu",
        path,
        icon,
        component,
        sort = 0,
        parentId,
      } = req.body;

      const permission = await prisma.permission.create({
        data: { name, code, type, path, icon, component, sort, parentId },
      });

      res.json({ code: 200, message: "创建成功", data: { id: permission.id } });
    } catch (error) {
      console.error("Create permission error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

// 更新权限
router.put(
  "/:id",
  authMiddleware,
  checkPermission("permissionManage"),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { name, code, type, path, icon, component, sort, parentId } =
        req.body;

      await prisma.permission.update({
        where: { id },
        data: { name, code, type, path, icon, component, sort, parentId },
      });

      res.json({ code: 200, message: "更新成功" });
    } catch (error) {
      console.error("Update permission error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

// 删除权限
router.delete(
  "/:id",
  authMiddleware,
  checkPermission("permissionManage"),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await prisma.permission.delete({ where: { id } });
      res.json({ code: 200, message: "删除成功" });
    } catch (error) {
      console.error("Delete permission error:", error);
      res.json({ code: 500, message: "服务器错误" });
    }
  },
);

export default router;
