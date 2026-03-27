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

// 预设标签颜色
export const TagColors = [
  "#409eff", // 蓝色
  "#67c23a", // 绿色
  "#e6a23c", // 橙色
  "#f56c6c", // 红色
  "#909399", // 灰色
  "#991a80", // 紫色
  "#00aaaa", // 青色
  "#ff69b4", // 粉色
];

// 获取标签列表
export const getTagList = () => {
  return api.get("/tags");
};

// 创建标签
export const createTag = (data: { name: string; color?: string }) => {
  return api.post("/tags", data);
};

// 更新标签
export const updateTag = (
  id: string,
  data: { name?: string; color?: string }
) => {
  return api.put(`/tags/${id}`, data);
};

// 删除标签
export const deleteTag = (id: string) => {
  return api.delete(`/tags/${id}`);
};

export { api };
