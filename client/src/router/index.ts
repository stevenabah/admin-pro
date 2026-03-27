import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { useUserStore } from "@/stores/user";

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/Login.vue"),
  },
  {
    path: "/",
    component: () => import("@/layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        redirect: "/dashboard",
      },
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("@/views/Dashboard.vue"),
        meta: { title: "首页" },
      },
      {
        path: "user",
        name: "User",
        component: () => import("@/views/User.vue"),
        meta: { title: "用户管理" },
      },
      {
        path: "role",
        name: "Role",
        component: () => import("@/views/Role.vue"),
        meta: { title: "角色管理" },
      },
      {
        path: "permission",
        name: "Permission",
        component: () => import("@/views/Permission.vue"),
        meta: { title: "权限管理" },
      },
      {
        path: "file",
        name: "File",
        component: () => import("@/views/File.vue"),
        meta: { title: "文件管理" },
      },
      {
        path: "media",
        name: "Media",
        component: () => import("@/views/Media.vue"),
        meta: { title: "音视频管理" },
      },
      {
        path: "data",
        name: "Data",
        component: () => import("@/views/Data.vue"),
        meta: { title: "表格编辑" },
      },
      {
        path: "ai-copilot",
        name: "AICopilot",
        component: () => import("@/views/AICopilot.vue"),
        meta: { title: "AI 助手" },
      },
      {
        path: "nl-query",
        name: "NLQuery",
        component: () => import("@/views/NLQuery.vue"),
        meta: { title: "自然语言查询" },
      },
      {
        path: "task",
        name: "TaskList",
        component: () => import("@/views/TaskList.vue"),
        meta: { title: "任务列表" },
      },
      {
        path: "task/board",
        name: "TaskBoard",
        component: () => import("@/views/TaskBoard.vue"),
        meta: { title: "任务看板" },
      },
      {
        path: "task/:id",
        name: "TaskDetail",
        component: () => import("@/views/TaskDetail.vue"),
        meta: { title: "任务详情" },
      },
      {
        path: "stats",
        name: "StatsReport",
        component: () => import("@/views/StatsReport.vue"),
        meta: { title: "统计报表" },
      },
      {
        path: "gantt",
        name: "GanttChart",
        component: () => import("@/views/GanttChart.vue"),
        meta: { title: "甘特图" },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  const token = localStorage.getItem("token");

  if (to.path !== "/login" && !token) {
    next("/login");
  } else if (to.path === "/login" && token) {
    next("/");
  } else if (to.path !== "/login" && token) {
    // 已登录且访问非登录页，检查权限
    const permCode = (to.meta as any)?.permission as string | undefined;
    if (permCode) {
      // 权限码存储在 permissionStore 中，但守卫在初始化时可能不可用
      // 这里只做基础守卫，权限由菜单级别过滤
      next();
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
