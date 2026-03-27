<template>
  <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
    <el-popover
      placement="bottom-end"
      :width="360"
      trigger="click"
      v-model:visible="popoverVisible"
    >
      <template #reference>
        <el-icon :size="20" class="notification-bell">
          <Bell />
        </el-icon>
      </template>

      <div class="notification-container">
        <div class="notification-header">
          <span class="notification-title">通知</span>
          <div class="notification-actions">
            <el-button
              type="primary"
              link
              size="small"
              @click="handleMarkAllRead"
              :loading="markAllLoading"
            >
              全部已读
            </el-button>
          </div>
        </div>

        <div class="notification-list" v-loading="loading">
          <template v-if="notifications.length > 0">
            <div
              class="notification-item"
              v-for="item in notifications"
              :key="item.id"
              :class="{ unread: !item.isRead }"
              @click="handleItemClick(item)"
            >
              <div class="notification-icon" :class="item.type">
                <el-icon v-if="item.type === 'mention'"><ChatDotRound /></el-icon>
                <el-icon v-else-if="item.type === 'assign'"><User /></el-icon>
                <el-icon v-else-if="item.type === 'comment'"><ChatDotRound /></el-icon>
                <el-icon v-else-if="item.type === 'overdue'"><Clock /></el-icon>
                <el-icon v-else><Bell /></el-icon>
              </div>
              <div class="notification-content">
                <div class="notification-text">{{ item.title }}</div>
                <div class="notification-desc" v-if="item.content">
                  {{ item.content }}
                </div>
                <div class="notification-time">
                  {{ formatTime(item.createdAt) }}
                </div>
              </div>
              <div class="notification-status">
                <div class="unread-dot" v-if="!item.isRead"></div>
              </div>
            </div>
          </template>
          <el-empty v-else description="暂无通知" :image-size="60" />
        </div>

        <div class="notification-footer" v-if="notifications.length > 0">
          <el-button type="primary" link size="small" @click="goToNotifications">
            查看全部
          </el-button>
        </div>
      </div>
    </el-popover>
  </el-badge>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Bell, User, ChatDotRound, Clock } from "@element-plus/icons-vue";
import {
  getNotificationList,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  NotificationType,
} from "@/api/notification";

const router = useRouter();
const loading = ref(false);
const markAllLoading = ref(false);
const popoverVisible = ref(false);
const notifications = ref<any[]>([]);
const unreadCount = ref(0);

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content?: string;
  taskId?: string;
  isRead: boolean;
  createdAt: string;
}

// 获取通知列表
const fetchNotifications = async () => {
  loading.value = true;
  try {
    const res = await getNotificationList({ page: 1, pageSize: 10 });
    if (res.code === 200) {
      notifications.value = res.data.list || [];
      unreadCount.value = res.data.unreadCount || 0;
    }
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
  } finally {
    loading.value = false;
  }
};

// 获取未读数量
const fetchUnreadCount = async () => {
  try {
    const res = await getUnreadCount();
    if (res.code === 200) {
      unreadCount.value = res.data.count || 0;
    }
  } catch (error) {
    console.error("Failed to fetch unread count:", error);
  }
};

// 标记单条已读
const handleItemClick = async (item: NotificationItem) => {
  if (!item.isRead) {
    try {
      await markAsRead(item.id);
      item.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }

  // 跳转到任务详情
  if (item.taskId) {
    popoverVisible.value = false;
    router.push(`/task/${item.taskId}`);
  }
};

// 标记全部已读
const handleMarkAllRead = async () => {
  markAllLoading.value = true;
  try {
    const res = await markAllAsRead();
    if (res.code === 200) {
      notifications.value.forEach((n) => (n.isRead = true));
      unreadCount.value = 0;
      ElMessage.success("已全部标记为已读");
    }
  } catch (error) {
    console.error("Failed to mark all as read:", error);
  } finally {
    markAllLoading.value = false;
  }
};

// 格式化时间
const formatTime = (date: string) => {
  if (!date) return "";
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(date).toLocaleDateString("zh-CN");
};

// 跳转到通知页面
const goToNotifications = () => {
  popoverVisible.value = false;
  router.push("/notifications");
};

// 定时刷新
let refreshTimer: ReturnType<typeof setInterval>;

onMounted(() => {
  fetchNotifications();
  // 每30秒刷新一次未读数
  refreshTimer = setInterval(fetchUnreadCount, 30000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<style scoped>
.notification-bell {
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.notification-bell:hover {
  background-color: #f5f7fa;
}

.notification-container {
  margin: -12px;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
}

.notification-title {
  font-weight: 600;
  font-size: 16px;
}

.notification-list {
  max-height: 400px;
  overflow-y: auto;
  min-height: 100px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item:hover {
  background-color: #f5f7fa;
}

.notification-item.unread {
  background-color: #ecf5ff;
}

.notification-item.unread:hover {
  background-color: #e6effe;
}

.notification-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 18px;
}

.notification-icon.mention {
  background-color: #ecf5ff;
  color: #409eff;
}

.notification-icon.assign {
  background-color: #f0f9eb;
  color: #67c23a;
}

.notification-icon.comment {
  background-color: #fef0f0;
  color: #f56c6c;
}

.notification-icon.overdue {
  background-color: #fff3e6;
  color: #e6a23c;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-text {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.notification-desc {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-time {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 4px;
}

.notification-status {
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #f56c6c;
}

.notification-footer {
  padding: 8px 16px;
  text-align: center;
  border-top: 1px solid #ebeef5;
}
</style>