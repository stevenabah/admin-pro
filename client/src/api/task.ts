import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// 请求拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

// 任务状态枚举
export const TaskStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  REVIEW: "REVIEW",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

// 任务优先级枚举
export const TaskPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;

export type TaskPriorityType = (typeof TaskPriority)[keyof typeof TaskPriority];

// 任务状态配置
export const TaskStatusConfig: Record<
  TaskStatusType,
  { label: string; color: string }
> = {
  PENDING: { label: "待处理", color: "#909399" },
  IN_PROGRESS: { label: "进行中", color: "#409eff" },
  REVIEW: { label: "待审核", color: "#e6a23c" },
  COMPLETED: { label: "已完成", color: "#67c23a" },
  CANCELLED: { label: "已取消", color: "#f56c6c" },
};

// 任务优先级配置
export const TaskPriorityConfig: Record<
  TaskPriorityType,
  { label: string; color: string }
> = {
  LOW: { label: "低", color: "#909399" },
  MEDIUM: { label: "中", color: "#409eff" },
  HIGH: { label: "高", color: "#e6a23c" },
  URGENT: { label: "紧急", color: "#f56c6c" },
};

// 获取任务列表
export const getTaskList = (params: {
  page?: number;
  pageSize?: number;
  status?: TaskStatusType;
  priority?: TaskPriorityType;
  assigneeId?: string;
  keyword?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) => {
  return api.get("/tasks", { params });
};

// 获取看板数据
export const getTaskBoard = () => {
  return api.get("/tasks/board");
};

// 获取任务详情
export const getTaskDetail = (id: string) => {
  return api.get(`/tasks/${id}`);
};

// 创建任务
export const createTask = (data: {
  title: string;
  description?: string;
  priority?: TaskPriorityType;
  assigneeId?: string;
  dueDate?: string;
}) => {
  return api.post("/tasks", data);
};

// 更新任务
export const updateTask = (
  id: string,
  data: {
    title?: string;
    description?: string;
    priority?: TaskPriorityType;
    assigneeId?: string;
    dueDate?: string;
    status?: TaskStatusType;
  },
) => {
  return api.put(`/tasks/${id}`, data);
};

// 删除任务
export const deleteTask = (id: string) => {
  return api.delete(`/tasks/${id}`);
};

// 添加评论
export const addComment = (taskId: string, content: string) => {
  return api.post(`/tasks/${taskId}/comments`, { content });
};

// 获取任务统计
export const getTaskStats = () => {
  return api.get("/tasks/stats/summary");
};

export { api };
