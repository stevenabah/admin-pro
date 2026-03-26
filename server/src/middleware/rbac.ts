import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "./auth.js";

/**
 * 权限检查中间件 - 必须在 authMiddleware 之后使用
 * 用法: router.delete('/:id', authMiddleware, checkPermission('user:delete'), async ...)
 */
export function checkPermission(permissionCode: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, roleId } = req.user!;
      if (!roleId) {
        return res
          .status(403)
          .json({ code: 403, message: "无角色分配，禁止访问" });
      }

      // admin 角色拥有所有权限
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: { permissions: true },
      });

      if (!role || role.status === 0) {
        return res.status(403).json({ code: 403, message: "角色已被禁用" });
      }

      if (role.code === "admin") {
        return next();
      }

      const hasPermission = role.permissions.some(
        (p) => p.code === permissionCode,
      );
      if (!hasPermission) {
        return res.status(403).json({ code: 403, message: "无此权限" });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ code: 500, message: "服务器错误" });
    }
  };
}

/**
 * 检查多个权限（需要全部拥有）
 */
export function checkPermissions(permissionCodes: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { roleId } = req.user!;
      if (!roleId) {
        return res
          .status(403)
          .json({ code: 403, message: "无角色分配，禁止访问" });
      }

      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: { permissions: true },
      });

      if (!role || role.status === 0) {
        return res.status(403).json({ code: 403, message: "角色已被禁用" });
      }

      if (role.code === "admin") {
        return next();
      }

      const rolePermCodes = role.permissions.map((p) => p.code);
      const hasAll = permissionCodes.every((code) =>
        rolePermCodes.includes(code),
      );
      if (!hasAll) {
        return res.status(403).json({ code: 403, message: "无此权限" });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ code: 500, message: "服务器错误" });
    }
  };
}
