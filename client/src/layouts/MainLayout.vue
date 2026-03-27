<template>
  <el-container class="main-layout">
    <el-aside width="200px">
      <div class="logo">
        <h3>Admin-Pro</h3>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item v-if="hasMenuPermission('/dashboard')" index="/dashboard">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item v-if="hasMenuPermission('/user')" index="/user">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item v-if="hasMenuPermission('/role')" index="/role">
          <el-icon><UserFilled /></el-icon>
          <span>角色管理</span>
        </el-menu-item>
        <el-menu-item
          v-if="hasMenuPermission('/permission')"
          index="/permission"
        >
          <el-icon><Lock /></el-icon>
          <span>权限管理</span>
        </el-menu-item>
        <el-menu-item v-if="hasMenuPermission('/file')" index="/file">
          <el-icon><Folder /></el-icon>
          <span>文件管理</span>
        </el-menu-item>
        <el-menu-item v-if="hasMenuPermission('/media')" index="/media">
          <el-icon><VideoCamera /></el-icon>
          <span>音视频</span>
        </el-menu-item>
        <el-menu-item v-if="hasMenuPermission('/data')" index="/data">
          <el-icon><List /></el-icon>
          <span>表格编辑</span>
        </el-menu-item>
        <el-menu-item index="/ai-copilot">
          <el-icon><ChatDotRound /></el-icon>
          <span>AI 助手</span>
        </el-menu-item>
        <el-menu-item index="/nl-query">
          <el-icon><DataAnalysis /></el-icon>
          <span>自然语言查询</span>
        </el-menu-item>
        <el-sub-menu index="/task">
          <template #title>
            <el-icon><List /></el-icon>
            <span>任务管理</span>
          </template>
          <el-menu-item index="/task">任务列表</el-menu-item>
          <el-menu-item index="/task/board">任务看板</el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/stats">
          <el-icon><DataAnalysis /></el-icon>
          <span>统计报表</span>
        </el-menu-item>
        <el-menu-item index="/gantt">
          <el-icon><TrendCharts /></el-icon>
          <span>甘特图</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }"
              >首页</el-breadcrumb-item
            >
            <el-breadcrumb-item>{{
              route.meta.title || "控制台"
            }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-tooltip content="全屏" placement="bottom">
            <span class="header-icon-btn">
              <el-icon><FullScreen /></el-icon>
            </span>
          </el-tooltip>
          <el-tooltip content="消息" placement="bottom">
            <span class="header-icon-btn">
              <NotificationBell />
            </span>
          </el-tooltip>
          <el-tooltip content="个人中心" placement="bottom">
            <span class="user-info">
              <div class="user-avatar">
                {{ (userStore.userInfo?.username || "A")[0].toUpperCase() }}
              </div>
              <span>{{ userStore.userInfo?.username || "管理员" }}</span>
              <el-tag
                v-if="userStore.userInfo?.role?.name"
                size="small"
                type="info"
                style="margin-left: 4px"
                >{{ userStore.userInfo.role.name }}</el-tag
              >
              <el-icon><ArrowDown /></el-icon>
            </span>
          </el-tooltip>
          <el-dropdown @command="handleCommand" trigger="click">
            <span class="header-icon-btn">
              <el-icon><Setting /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { usePermissionStore } from "@/stores/permission";
import NotificationBell from "@/components/NotificationBell.vue";
import {
  HomeFilled,
  User,
  UserFilled,
  Lock,
  Folder,
  VideoCamera,
  List,
  FullScreen,
  Bell,
  Setting,
  ArrowDown,
  SwitchButton,
  ChatDotRound,
  DataAnalysis,
  TrendCharts,
} from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const permStore = usePermissionStore();

const activeMenu = computed(() => route.path);

// 权限码映射
const permCodeMap: Record<string, string> = {
  "/dashboard": "dashboard",
  "/user": "userManage",
  "/role": "roleManage",
  "/permission": "permissionManage",
  "/file": "fileManage",
  "/media": "mediaManage",
  "/data": "dataManage",
  "/task": "taskManage",
};

const hasMenuPermission = (path: string) => {
  const code = permCodeMap[path];
  if (!code) return true;
  // admin 角色拥有所有权限
  if (userStore.userInfo?.role?.code === "admin") return true;
  return permStore.permissionCodes.includes(code);
};

const handleCommand = async (command: string) => {
  if (command === "logout") {
    await userStore.logout();
    router.push("/login");
  }
};

onMounted(async () => {
  if (userStore.token) {
    const userInfo = await userStore.getUserInfoFull();
    if (userInfo) {
      permStore.permissionCodes = userInfo.permissions || [];
    }
  }
});
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.el-aside {
  background: linear-gradient(180deg, #1e1e1e 0%, #2d2d2d 100%);
  transition: width 0.3s;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.logo h3 {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.el-header {
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.breadcrumb {
  color: #909399;
  font-size: 14px;
}

.breadcrumb :deep(.el-breadcrumb__separator) {
  color: #c0c4cc;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon-btn {
  font-size: 18px;
  color: #606266;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.header-icon-btn:hover {
  background: #f5f7fa;
  color: #409eff;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: background 0.2s;
  color: #303133;
  font-size: 14px;
}

.user-info:hover {
  background: #f5f7fa;
}

.user-info .el-icon {
  font-size: 18px;
  color: #409eff;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #337ecc);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
}

.el-main {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}

/* Sidebar menu hover */
.el-aside :deep(.el-menu-item) {
  border-radius: 0;
  margin: 4px 8px;
  width: auto;
  border-radius: 6px;
  transition: all 0.2s;
}

.el-aside :deep(.el-menu-item:hover) {
  background-color: rgba(64, 158, 255, 0.12) !important;
}

.el-aside :deep(.el-menu-item.is-active) {
  background: linear-gradient(
    90deg,
    rgba(64, 158, 255, 0.15),
    transparent
  ) !important;
  border-left: 3px solid #409eff;
}

.el-aside :deep(.el-menu-item .el-icon) {
  font-size: 16px;
}
</style>
