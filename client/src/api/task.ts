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
  tags?: string[];
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
    tags?: string[];
  },
) => {
  return api.put(`/tasks/${id}`, data);
};

// 删除任务
export const deleteTask = (id: string) => {
  return api.delete(`/tasks/${id}`);
};

// 批量更新任务状态
export const batchUpdateStatus = (taskIds: string[], status: TaskStatusType) => {
  return api.put("/tasks/batch/status", { taskIds, status });
};

// 批量分配任务
export const batchAssignTask = (taskIds: string[], assigneeId: string) => {
  return api.put("/tasks/batch/assign", { taskIds, assigneeId });
};

// 批量删除任务
export const batchDeleteTask = (taskIds: string[]) => {
  return api.delete("/tasks/batch", { data: { taskIds } });
};

// 添加评论
export const addComment = (
  taskId: string,
  content: string,
  options?: {
    mentions?: string[];
    attachments?: string[];
  }
) => {
  return api.post(`/tasks/${taskId}/comments`, {
    content,
    mentions: options?.mentions || [],
    attachments: options?.attachments || [],
  });
};

// 获取任务统计
export const getTaskStats = () => {
  return api.get("/tasks/stats/summary");
};

// 获取任务统计报表
export const getTaskStatsReport = (params: {
  range?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return api.get("/tasks/stats/report", { params });
};

// 获取甘特图数据
export const getGanttData = () => {
  return api.get("/tasks/gantt");
};

// 获取个人工作台数据
export const getMyDashboard = () => {
  return api.get("/tasks/my/dashboard");
};

// 导出任务
export const exportTasks = (params: {
  format?: "xlsx" | "csv";
  status?: string;
  priority?: string;
  assigneeId?: string;
  keyword?: string;
  tag?: string;
}) => {
  return api.get("/tasks/export", { params, responseType: "blob" });
};

// 获取标签分布统计
export const getTagDistribution = (params?: {
  range?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return api.get("/tasks/stats/tag-distribution", { params });
};

// 获取工作量对比（支持按周/月筛选）
export const getWorkloadComparison = (params?: {
  range?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return api.get("/tasks/stats/workload-comparison", { params });
};

export { api };
