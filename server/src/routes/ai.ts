import { Router } from "express";
import { zhipuAI } from "../services/ai";

const router = Router();

// AI Chat - 对话式智能助手
router.post("/chat", async (req, res) => {
  try {
    const {
      message,
      history = [],
      provider,
      baseUrl,
      apiKey,
      model,
    } = req.body;

    if (!message) {
      res.status(400).json({ code: 400, message: "消息内容不能为空" });
      return;
    }

    const config = { provider, baseUrl, apiKey, model };
    const reply = await zhipuAI.chat(message, history, config);
    res.json({ code: 200, data: { reply } });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    res.status(500).json({
      code: 500,
      message: error.message || "AI 服务暂时不可用",
    });
  }
});

// NL2SQL - 自然语言转 SQL
router.post("/nl2sql", async (req, res) => {
  try {
    const { question, provider, baseUrl, apiKey, model } = req.body;

    if (!question) {
      res.status(400).json({ code: 400, message: "问题不能为空" });
      return;
    }

    const config = { provider, baseUrl, apiKey, model };
    const result = await zhipuAI.nl2sql(question, config);
    res.json({ code: 200, data: result });
  } catch (error: any) {
    console.error("NL2SQL Error:", error);
    res.status(500).json({
      code: 500,
      message: error.message || "查询服务暂时不可用",
    });
  }
});

export default router;
