import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// 路由
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import roleRoutes from "./routes/roles.js";
import permissionRoutes from "./routes/permissions.js";
import fileRoutes from "./routes/files.js";
import mediaRoutes from "./routes/media.js";
import dataRoutes from "./routes/data.js";
import statsRoutes from "./routes/stats.js";
import aiRoutes from "./routes/ai.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 路由
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/ai", aiRoutes);

// 健康检查
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 错误处理
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("Server error:", err);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  },
);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
