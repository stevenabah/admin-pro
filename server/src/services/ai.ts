import { PrismaClient } from "@prisma/client";
import type { ChatMessage } from "../types/ai";

const prisma = new PrismaClient();

// 智谱 AI 配置（需要替换为实际的 API Key）
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || "";
const ZHIPU_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

// 数据库表结构信息，用于 NL2SQL
const TABLE_SCHEMAS = `
现有数据库表结构：
- User: id, username, password, nickname, email, status, createdAt, updatedAt, lastLoginAt, loginCount, roleId
- Role: id, name, code, description, status, createdAt, updatedAt
- Permission: id, name, code, type(menu/button/api), path, icon, sort, parentId, createdAt, updatedAt
- UserRole: userId, roleId
- RolePermission: roleId, permissionId
- File: id, name, path, size, type, url, createdAt, updatedAt, userId
- Media: id, name, path, type(video/audio), size, duration, thumbnail, createdAt, updatedAt, userId
- LoginLog: id, userId, ip, location, createdAt
`;

// 模拟对话回复（无 API Key 时使用）
function mockChat(message: string): string {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("用户") || lowerMsg.includes("user")) {
    return "根据系统数据，当前用户管理功能包括：\n1. 用户列表展示\n2. 新增用户\n3. 编辑用户信息\n4. 删除用户\n5. 分配角色\n\n您需要我执行哪项操作？";
  }

  if (lowerMsg.includes("角色") || lowerMsg.includes("权限")) {
    return "系统采用 RBAC 权限模型：\n- 用户分配角色\n- 角色关联权限\n- 支持多角色配置\n\n您可以进入【角色管理】或【权限管理】进行配置。";
  }

  if (lowerMsg.includes("文件") || lowerMsg.includes("上传")) {
    return "文件管理功能支持：\n- 多种文件格式上传\n- 文件列表展示\n- 文件下载\n- 文件删除\n\n您可以在【文件管理】页面进行操作。";
  }

  if (
    lowerMsg.includes("统计") ||
    lowerMsg.includes("报表") ||
    lowerMsg.includes("dashboard")
  ) {
    return "首页大屏展示以下统计数据：\n- 用户总数\n- 角色数量\n- 文件数量\n- 媒体数量\n\n图表展示用户增长趋势和活跃度分析。";
  }

  return "您好！我是 AI 智能助手，可以帮助您：\n1. 解答系统相关问题\n2. 指导操作步骤\n3. 提供数据查询建议\n\n请问有什么可以帮助您的？";
}

// 模拟 NL2SQL（无 API Key 时使用）
function mockNl2sql(question: string): {
  sql: string;
  results: any[];
  columns: string[];
} {
  const lowerQ = question.toLowerCase();

  if (lowerQ.includes("所有用户") || lowerQ.includes("用户列表")) {
    return {
      sql: "SELECT id, username, nickname, email, status, createdAt FROM User",
      results: [],
      columns: ["id", "username", "nickname", "email", "status", "createdAt"],
    };
  }

  if (lowerQ.includes("本月新增") || lowerQ.includes("新增用户")) {
    return {
      sql: "SELECT COUNT(*) as count FROM User WHERE createdAt >= DATE_TRUNC('month', CURRENT_DATE)",
      results: [],
      columns: ["count"],
    };
  }

  if (lowerQ.includes("登录次数") || lowerQ.includes("活跃")) {
    return {
      sql: "SELECT username, loginCount FROM User ORDER BY loginCount DESC LIMIT 10",
      results: [],
      columns: ["username", "loginCount"],
    };
  }

  return {
    sql: "SELECT * FROM User LIMIT 20",
    results: [],
    columns: [],
  };
}

export const zhipuAI = {
  // 通用对话
  async chat(message: string, history: ChatMessage[] = []): Promise<string> {
    // 如果没有配置 API Key，返回模拟回复
    if (!ZHIPU_API_KEY) {
      return mockChat(message);
    }

    try {
      const messages = [
        {
          role: "system",
          content:
            "你是 Admin-Pro 系统的 AI 智能助手，可以帮助管理员管理系统、回答问题、生成报表。你的回答应该简洁，专业。",
        },
        ...history.map((h) => ({
          role: h.role,
          content: h.content,
        })),
        { role: "user", content: message },
      ];

      const response = await fetch(ZHIPU_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ZHIPU_API_KEY}`,
        },
        body: JSON.stringify({
          model: "glm-4",
          messages,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      console.error("智谱 AI 调用失败:", error);
      return mockChat(message);
    }
  },

  // NL2SQL - 自然语言转 SQL
  async nl2sql(question: string): Promise<{
    sql: string;
    results: any[];
    columns: string[];
  }> {
    if (!ZHIPU_API_KEY) {
      return mockNl2sql(question);
    }

    try {
      const prompt = `${TABLE_SCHEMAS}

请将以下自然语言问题转换为 SQL 查询语句（只允许 SELECT 查询，禁止 UPDATE/DELETE/DROP 等危险操作）。

问题: ${question}

要求：
1. 只返回 SQL 语句，不要其他解释
2. SQL 必须只使用 SELECT
3. 确保 SQL 语法正确
4. 注意表之间的关联关系（外键）`;

      const messages = [{ role: "user" as const, content: prompt }];

      const response = await fetch(ZHIPU_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ZHIPU_API_KEY}`,
        },
        body: JSON.stringify({
          model: "glm-4",
          messages,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      let sql = data.choices[0].message.content
        .replace(/```sql/g, "")
        .replace(/```/g, "")
        .trim();

      // 安全检查：确保只有 SELECT
      if (!sql.toUpperCase().includes("SELECT")) {
        throw new Error("生成的 SQL 不是查询语句");
      }

      // 执行查询
      const results = await prisma.$queryRawUnsafe(sql);
      const formattedResults = Array.isArray(results) ? results : [results];
      const columns =
        formattedResults.length > 0 ? Object.keys(formattedResults[0]) : [];

      return { sql, results: formattedResults, columns };
    } catch (error: any) {
      console.error("NL2SQL 失败:", error);
      throw error;
    }
  },
};
