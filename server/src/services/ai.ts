import { PrismaClient } from "@prisma/client";
import type { ChatMessage } from "../types/ai";

const prisma = new PrismaClient();

// 默认配置
const DEFAULT_CONFIG: Record<string, { baseUrl: string; model: string }> = {
  minimax: {
    baseUrl: "https://api.minimax.chat/v1",
    model: "abab6-chat",
  },
  doubao: {
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    model: "doubao-beta",
  },
  zhipu: {
    baseUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model: "glm-4",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4",
  },
  claude: {
    baseUrl: "https://api.anthropic.com/v1/messages",
    model: "claude-3-sonnet-20240229",
  },
  siliconflow: {
    baseUrl: "https://api.siliconflow.cn/v1/chat/completions",
    model: "Qwen/Qwen2.5-7B-Instruct",
  },
};

// 数据库表结构信息
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

interface AIConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

// 获取完整的 AI 配置
function getAIConfig(config: AIConfig): AIConfig {
  const providerDefaults = DEFAULT_CONFIG[config.provider] || {
    baseUrl: "",
    model: "",
  };

  return {
    provider: config.provider,
    baseUrl: config.baseUrl || providerDefaults.baseUrl,
    apiKey: config.apiKey,
    model: config.model || providerDefaults.model,
  };
}

// 通用 AI API 调用
async function callAI(messages: any[], config: AIConfig): Promise<string> {
  const { provider, baseUrl, apiKey, model } = config;

  console.log(`[AI] Provider: ${provider}`);
  console.log(`[AI] BaseURL: ${baseUrl}`);
  console.log(`[AI] Model: ${model}`);

  // Claude API 格式
  if (provider === "claude") {
    const lastMessage = messages[messages.length - 1].content;
    const systemMessage =
      messages.find((m) => m.role === "system")?.content || "";

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        system: systemMessage,
        messages: [{ role: "user", content: lastMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  // Doubao (字节跳动) API 格式 - OpenAI 兼容
  if (provider === "doubao") {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI] Doubao API error: ${response.status} - ${errorText}`);
      throw new Error(`Doubao API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // MiniMax API 格式 - OpenAI 兼容
  if (provider === "minimax") {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages.filter((m) => m.role !== "system"),
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[AI] MiniMax API error: ${response.status} - ${errorText}`,
      );
      throw new Error(`MiniMax API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(
      `[AI] MiniMax response:`,
      JSON.stringify(data).substring(0, 300),
    );
    return data.choices[0].message.content;
  }

  // OpenAI 兼容格式 (默认)
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[AI] API error: ${response.status} - ${errorText}`);
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// 模拟对话回复
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

// 模拟 NL2SQL
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
  // AI 对话
  async chat(
    message: string,
    history: ChatMessage[] = [],
    config?: AIConfig,
  ): Promise<string> {
    // 如果没有配置，使用模拟回复
    if (!config?.apiKey) {
      return mockChat(message);
    }

    try {
      const aiConfig = getAIConfig(config);

      const chatMessages = [
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

      return await callAI(chatMessages, aiConfig);
    } catch (error: any) {
      console.error("AI 调用失败:", error);
      return `AI 服务调用失败: ${error.message}\n\n请检查您的 API 配置是否正确。`;
    }
  },

  // NL2SQL
  async nl2sql(
    question: string,
    config?: AIConfig,
  ): Promise<{
    sql: string;
    results: any[];
    columns: string[];
  }> {
    // 如果没有配置 API Key，返回模拟结果
    if (!config?.apiKey) {
      return mockNl2sql(question);
    }

    try {
      const aiConfig = getAIConfig(config);

      const prompt = `${TABLE_SCHEMAS}

请将以下自然语言问题转换为 SQL 查询语句（只允许 SELECT 查询）。

问题: ${question}

要求：
1. 只返回 SQL 语句，不要其他解释
2. SQL 必须只使用 SELECT
3. 确保 SQL 语法正确`;

      const messages = [
        {
          role: "system",
          content: "你是一个 SQL 专家，负责将自然语言转换为 SQL 查询语句。",
        },
        { role: "user", content: prompt },
      ];

      let sql = await callAI(messages, aiConfig);

      // 清理 SQL
      sql = sql
        .replace(/```sql/g, "")
        .replace(/```/g, "")
        .trim();

      // 安全检查
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
