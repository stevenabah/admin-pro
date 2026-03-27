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
  }
);

// 通知类型枚举
export const NotificationType = {
  MENTION: "mention",
  ASSIGN: "assign",
  STATUS_CHANGE: "status_change",
  COMMENT: "comment",
  OVERDUE: "overdue",
} as const;

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

// 获取通知列表
export const getNotificationList = (params?: {
  page?: number;
  pageSize?: number;
  isRead?: boolean;
}) => {
  return api.get("/notifications", { params });
};

// 获取未读数量
export const getUnreadCount = () => {
  return api.get("/notifications/unread-count");
};

// 标记通知已读
export const markAsRead = (id: string) => {
  return api.put(`/notifications/${id}/read`);
};

// 标记全部已读
export const markAllAsRead = () => {
  return api.put("/notifications/read-all");
};

// 删除通知
export const deleteNotification = (id: string) => {
  return api.delete(`/notifications/${id}`);
};

export { api };