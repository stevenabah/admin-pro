<template>
  <div class="notifications-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>通知中心</span>
          <el-button
            v-if="notifications.length > 0"
            type="primary"
            link
            @click="handleMarkAllRead"
          >
            全部已读
          </el-button>
        </div>
      </template>

      <div class="filter-bar">
        <el-radio-group v-model="filterType" size="default">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="unread">未读</el-radio-button>
          <el-radio-button label="mention">@提及</el-radio-button>
          <el-radio-button label="assign">任务分配</el-radio-button>
          <el-radio-button label="comment">评论</el-radio-button>
        </el-radio-group>
      </div>

      <div class="notification-list" v-loading="loading">
        <template v-if="filteredNotifications.length > 0">
          <div
            v-for="item in filteredNotifications"
            :key="item.id"
            class="notification-item"
            :class="{ unread: !item.isRead }"
            @click="handleItemClick(item)"
          >
            <div class="notification-icon" :class="item.type">
              <el-icon v-if="item.type === 'mention'"><At /></el-icon>
              <el-icon v-else-if="item.type === 'assign'"><User /></el-icon>
              <el-icon v-else-if="item.type === 'comment'"><ChatDotRound /></el-icon>
              <el-icon v-else-if="item.type === 'overdue'"><Clock /></el-icon>
              <el-icon v-else><Bell /></el-icon>
            </div>
            <div class="notification-content">
              <div class="notification-title">{{ item.title }}</div>
              <div class="notification-desc" v-if="item.content">
                {{ item.content }}
              </div>
              <div class="notification-time">
                {{ formatTime(item.createdAt) }}
              </div>
            </div>
            <div class="notification-actions">
              <el-button
                v-if="!item.isRead"
                type="primary"
                link
                size="small"
                @click.stop="handleMarkRead(item)"
              >
                标记已读
              </el-button>
              <el-button
                type="danger"
                link
                size="small"
                @click.stop="handleDelete(item)"
              >
                删除
              </el-button>
            </div>
          </div>
        </template>
        <el-empty v-else description="暂无通知" :image-size="80" />
      </div>

      <div v-if="total > pageSize" class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { At, User, ChatDotRound, Clock, Bell } from "@element-plus/icons-vue";
import {
  getNotificationList,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "@/api/notification";

const router = useRouter();
const loading = ref(false);
const notifications = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterType = ref("all");

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content?: string;
  taskId?: string;
  isRead: boolean;
  createdAt: string;
}

// 过滤后的通知
const filteredNotifications = computed(() => {
  if (filterType.value === "all") return notifications.value;
  if (filterType.value === "unread") return notifications.value.filter((n) => !n.isRead);
  return notifications.value.filter((n) => n.type === filterType.value);
});

// 获取通知列表
const fetchNotifications = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value,
    };
    if (filterType.value === "unread") {
      params.isRead = false;
    }
    const res = await getNotificationList(params);
    if (res.code === 200) {
      notifications.value = res.data.list || [];
      total.value = res.data.pagination?.total || 0;
    }
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
  } finally {
    loading.value = false;
  }
};

// 标记单条已读
const handleMarkRead = async (item: NotificationItem) => {
  try {
    const res = await markAsRead(item.id);
    if (res.code === 200) {
      item.isRead = true;
    }
  } catch (error) {
    console.error("Failed to mark as read:", error);
  }
};

// 标记全部已读
const handleMarkAllRead = async () => {
  try {
    const res = await markAllAsRead();
    if (res.code === 200) {
      notifications.value.forEach((n) => (n.isRead = true));
      ElMessage.success("已全部标记为已读");
    }
  } catch (error) {
    console.error("Failed to mark all as read:", error);
  }
};

// 删除通知
const handleDelete = async (item: NotificationItem) => {
  try {
    await ElMessageBox.confirm("确定要删除该通知吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    const res = await deleteNotification(item.id);
    if (res.code === 200) {
      notifications.value = notifications.value.filter((n) => n.id !== item.id);
      ElMessage.success("删除成功");
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to delete notification:", error);
    }
  }
};

// 点击通知
const handleItemClick = async (item: NotificationItem) => {
  if (!item.isRead) {
    await handleMarkRead(item);
  }
  if (item.taskId) {
    router.push(`/task/${item.taskId}`);
  }
};

// 翻页
const handlePageChange = () => {
  fetchNotifications();
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

// 监听筛选变化
const handleFilterChange = () => {
  currentPage.value = 1;
  fetchNotifications();
};

onMounted(() => {
  fetchNotifications();
});
</script>

<style scoped>
.notifications-page {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  margin-bottom: 20px;
}

.notification-list {
  min-height: 200px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
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
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 20px;
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

.notification-title {
  font-size: 15px;
  color: #303133;
  margin-bottom: 4px;
}

.notification-desc {
  font-size: 13px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-time {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 6px;
}

.notification-actions {
  display: flex;
  gap: 8px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>