<template>
  <div class="task-detail" v-loading="loading">
    <el-button @click="goBack" style="margin-bottom: 20px">
      <el-icon><Back /></el-icon>
      返回
    </el-button>

    <el-row :gutter="20">
      <!-- 左侧：任务基本信息 -->
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>任务详情</span>
              <div>
                <el-button type="primary" @click="openEditDialog"
                  >编辑</el-button
                >
                <el-button type="danger" @click="handleDelete">删除</el-button>
              </div>
            </div>
          </template>

          <div class="task-info">
            <h2 class="task-title">{{ taskData.title }}</h2>

            <div class="info-grid">
              <div class="info-item">
                <span class="label">状态：</span>
                <el-tag
                  :color="TaskStatusConfig[taskData.status]?.color"
                  style="color: #fff"
                >
                  {{ TaskStatusConfig[taskData.status]?.label }}
                </el-tag>
              </div>
              <div class="info-item">
                <span class="label">优先级：</span>
                <el-tag
                  :color="TaskPriorityConfig[taskData.priority]?.color"
                  style="color: #fff"
                >
                  {{ TaskPriorityConfig[taskData.priority]?.label }}
                </el-tag>
              </div>
              <div class="info-item">
                <span class="label">负责人：</span>
                <span>{{
                  taskData.assignee?.nickname ||
                  taskData.assignee?.username ||
                  "未分配"
                }}</span>
              </div>
              <div class="info-item">
                <span class="label">创建人：</span>
                <span>{{
                  taskData.creator?.nickname || taskData.creator?.username
                }}</span>
              </div>
              <div class="info-item">
                <span class="label">截止日期：</span>
                <span>{{
                  taskData.dueDate ? formatDate(taskData.dueDate) : "未设置"
                }}</span>
              </div>
              <div class="info-item">
                <span class="label">创建时间：</span>
                <span>{{ formatDate(taskData.createdAt) }}</span>
              </div>
            </div>

            <el-divider />

            <div class="description">
              <h4>任务描述</h4>
              <p v-if="taskData.description">{{ taskData.description }}</p>
              <p v-else style="color: #999">暂无描述</p>
            </div>
          </div>
        </el-card>

        <!-- 评论区域 -->
        <el-card style="margin-top: 20px">
          <template #header>
            <span>评论 ({{ taskData.comments?.length || 0 }})</span>
          </template>

          <!-- 评论列表 -->
          <div class="comment-list" v-if="taskData.comments?.length">
            <div
              class="comment-item"
              v-for="comment in taskData.comments"
              :key="comment.id"
            >
              <div class="comment-avatar">
                <el-avatar :size="36" :src="comment.user?.avatar">
                  {{
                    comment.user?.nickname?.[0] || comment.user?.username?.[0]
                  }}
                </el-avatar>
              </div>
              <div class="comment-content">
                <div class="comment-header">
                  <span class="comment-author">{{
                    comment.user?.nickname || comment.user?.username
                  }}</span>
                  <!-- 显示被@的用户 -->
                  <span v-if="comment.mentionUsers?.length" class="comment-mentions">
                    <span v-for="user in comment.mentionUsers" :key="user.id" class="mention-tag">
                      @{{ user.nickname || user.username }}
                    </span>
                  </span>
                  <span class="comment-time">{{
                    formatDateTime(comment.createdAt)
                  }}</span>
                </div>
                <div class="comment-text" v-html="formatCommentContent(comment.content)"></div>
                <!-- 显示附件 -->
                <div v-if="comment.attachmentIds?.length" class="comment-attachments">
                  <el-icon><Paperclip /></el-icon>
                  <span>{{ comment.attachmentIds.length }} 个附件</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else style="color: #999; text-align: center; padding: 20px">
            暂无评论
          </div>

          <!-- 添加评论 -->
          <el-divider />
          <div class="add-comment">
            <el-input
              v-model="newComment"
              type="textarea"
              :rows="3"
              placeholder="添加评论... 使用@用户名可以提及用户"
            />
            <div class="comment-toolbar">
              <div class="toolbar-left">
                <el-dropdown @command="handleMentionUser" trigger="click">
                  <el-button type="primary" link size="small">
                    <el-icon><ChatDotRound /></el-icon> @提及
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="user in userList"
                        :key="user.id"
                        :command="user.id"
                      >
                        {{ user.nickname || user.username }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-upload
                  :action="'/api/files/upload'"
                  :headers="{ Authorization: `Bearer ${token}` }"
                  :on-success="handleAttachmentSuccess"
                  :on-error="handleAttachmentError"
                  :show-file-list="false"
                  multiple
                >
                  <el-button type="primary" link size="small">
                    <el-icon><Paperclip /></el-icon> 附件
                  </el-button>
                </el-upload>
                <div v-if="pendingAttachments.length" class="pending-attachments">
                  <el-tag
                    v-for="(file, index) in pendingAttachments"
                    :key="index"
                    closable
                    @close="removeAttachment(index)"
                    size="small"
                  >
                    {{ file.name }}
                  </el-tag>
                </div>
              </div>
              <el-button
                type="primary"
                @click="handleAddComment"
                style="margin-top: 10px"
                :loading="commentLoading"
              >
                提交评论
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：任务日志 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>活动日志</span>
          </template>

          <div class="log-list" v-if="taskData.logs?.length">
            <div class="log-item" v-for="log in taskData.logs" :key="log.id">
              <div class="log-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="log-content">
                <div class="log-text">
                  <span class="log-user">{{
                    log.user?.nickname || log.user?.username
                  }}</span>
                  <span>{{ getLogActionText(log.action) }}</span>
                  <span v-if="log.content">: {{ log.content }}</span>
                </div>
                <div class="log-time">{{ formatDateTime(log.createdAt) }}</div>
              </div>
            </div>
          </div>
          <div v-else style="color: #999; text-align: center; padding: 20px">
            暂无日志
          </div>
        </el-card>

        <!-- 快速操作 -->
        <el-card style="margin-top: 20px">
          <template #header>
            <span>快速操作</span>
          </template>
          <div class="quick-actions">
            <el-button
              v-for="(config, key) in TaskStatusConfig"
              :key="key"
              :type="taskData.status === key ? 'primary' : 'default'"
              :disabled="taskData.status === key"
              @click="handleQuickStatusChange(key)"
              style="margin: 4px"
            >
              {{ config.label }}
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑任务"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="taskForm"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="任务标题" prop="title">
          <el-input v-model="taskForm.title" placeholder="请输入任务标题" />
        </el-form-item>
        <el-form-item label="任务描述" prop="description">
          <el-input
            v-model="taskForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入任务描述"
          />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select
            v-model="taskForm.priority"
            placeholder="请选择优先级"
            style="width: 100%"
          >
            <el-option
              v-for="(config, key) in TaskPriorityConfig"
              :key="key"
              :label="config.label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人" prop="assigneeId">
          <el-select
            v-model="taskForm.assigneeId"
            placeholder="请选择负责人"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="user in userList"
              :key="user.id"
              :label="user.nickname || user.username"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="截止日期" prop="dueDate">
          <el-date-picker
            v-model="taskForm.dueDate"
            type="date"
            placeholder="选择截止日期"
            style="width: 100%"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select
            v-model="taskForm.status"
            placeholder="请选择状态"
            style="width: 100%"
          >
            <el-option
              v-for="(config, key) in TaskStatusConfig"
              :key="key"
              :label="config.label"
              :value="key"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdate" :loading="updateLoading"
          >确定</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Back, Clock, Paperclip } from "@element-plus/icons-vue";
import {
  getTaskDetail,
  updateTask,
  deleteTask,
  addComment,
  TaskStatusConfig,
  TaskPriorityConfig,
} from "@/api/task";
import type { TaskStatusType, TaskPriorityType } from "@/api/task";

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const editDialogVisible = ref(false);
const updateLoading = ref(false);
const commentLoading = ref(false);
const taskData = ref<any>({});
const userList = ref<any[]>([]);
const newComment = ref("");
const mentionedUsers = ref<string[]>([]);
const pendingAttachments = ref<any[]>([]);
const formRef = ref();
const token = localStorage.getItem("token") || "";

const taskForm = reactive({
  title: "",
  description: "",
  priority: "MEDIUM" as TaskPriorityType,
  assigneeId: "",
  dueDate: "",
  status: "PENDING" as TaskStatusType,
});

const formRules = {
  title: [{ required: true, message: "请输入任务标题", trigger: "blur" }],
};

// 获取任务详情
const fetchTaskDetail = async () => {
  loading.value = true;
  try {
    const res = await getTaskDetail(route.params.id as string);
    if (res.code === 200) {
      taskData.value = res.data;
    } else {
      ElMessage.error(res.message || "获取任务详情失败");
    }
  } catch (error) {
    console.error("Failed to fetch task detail:", error);
    ElMessage.error("获取任务详情失败");
  } finally {
    loading.value = false;
  }
};

// 加载用户列表
const fetchUserList = async () => {
  try {
    const res = await fetch("/api/users");
    if (res.code === 200) {
      userList.value = res.data.list || res.data;
    }
  } catch (error) {
    console.error("Failed to fetch user list:", error);
  }
};

// 返回列表
const goBack = () => {
  router.push("/task");
};

// 打开编辑弹窗
const openEditDialog = () => {
  taskForm.title = taskData.value.title;
  taskForm.description = taskData.value.description || "";
  taskForm.priority = taskData.value.priority;
  taskForm.assigneeId = taskData.value.assigneeId || "";
  taskForm.dueDate = taskData.value.dueDate
    ? taskData.value.dueDate.split("T")[0]
    : "";
  taskForm.status = taskData.value.status;
  editDialogVisible.value = true;
};

// 更新任务
const handleUpdate = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      updateLoading.value = true;
      try {
        const res = await updateTask(route.params.id as string, {
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          assigneeId: taskForm.assigneeId || undefined,
          dueDate: taskForm.dueDate || undefined,
          status: taskForm.status,
        });
        if (res.code === 200) {
          ElMessage.success("任务更新成功");
          editDialogVisible.value = false;
          fetchTaskDetail();
        } else {
          ElMessage.error(res.message || "更新失败");
        }
      } catch (error) {
        console.error("Update error:", error);
        ElMessage.error("更新失败");
      } finally {
        updateLoading.value = false;
      }
    }
  });
};

// 删除任务
const handleDelete = () => {
  ElMessageBox.confirm("确定要删除该任务吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    try {
      const res = await deleteTask(route.params.id as string);
      if (res.code === 200) {
        ElMessage.success("删除成功");
        router.push("/task");
      } else {
        ElMessage.error(res.message || "删除失败");
      }
    } catch (error) {
      console.error("Delete error:", error);
      ElMessage.error("删除失败");
    }
  });
};

// 添加评论
const handleAddComment = async () => {
  if (!newComment.value.trim()) {
    ElMessage.warning("请输入评论内容");
    return;
  }
  commentLoading.value = true;
  try {
    const res = await addComment(route.params.id as string, newComment.value, {
      mentions: mentionedUsers.value,
      attachments: pendingAttachments.value.map((f) => f.id),
    });
    if (res.code === 200) {
      ElMessage.success("评论添加成功");
      newComment.value = "";
      mentionedUsers.value = [];
      pendingAttachments.value = [];
      fetchTaskDetail();
    } else {
      ElMessage.error(res.message || "添加失败");
    }
  } catch (error) {
    console.error("Add comment error:", error);
    ElMessage.error("添加失败");
  } finally {
    commentLoading.value = false;
  }
};

// @提及用户
const handleMentionUser = (userId: string) => {
  if (!mentionedUsers.value.includes(userId)) {
    mentionedUsers.value.push(userId);
  }
  const user = userList.value.find((u) => u.id === userId);
  if (user) {
    newComment.value += `@${user.nickname || user.username} `;
  }
};

// 附件上传成功
const handleAttachmentSuccess = (res: any) => {
  if (res.code === 200) {
    pendingAttachments.value.push(res.data);
    ElMessage.success("附件上传成功");
  } else {
    ElMessage.error(res.message || "附件上传失败");
  }
};

// 附件上传失败
const handleAttachmentError = () => {
  ElMessage.error("附件上传失败");
};

// 移除待上传附件
const removeAttachment = (index: number) => {
  pendingAttachments.value.splice(index, 1);
};

// 格式化评论内容（高亮@提及）
const formatCommentContent = (content: string) => {
  if (!content) return "";
  return content.replace(/@(\w+)/g, '<span class="mention-highlight">@$1</span>');
};

// 快速状态变更
const handleQuickStatusChange = async (status: TaskStatusType) => {
  try {
    const res = await updateTask(route.params.id as string, { status });
    if (res.code === 200) {
      ElMessage.success("状态更新成功");
      fetchTaskDetail();
    } else {
      ElMessage.error(res.message || "更新失败");
    }
  } catch (error) {
    console.error("Status change error:", error);
    ElMessage.error("更新失败");
  }
};

// 获取日志动作文本
const getLogActionText = (action: string) => {
  const actionMap: Record<string, string> = {
    create: "创建了任务",
    update: "更新了任务",
    status_change: "变更了状态",
    assign: "分配了任务",
    comment: "添加了评论",
  };
  return actionMap[action] || action;
};

// 格式化日期
const formatDate = (date: string) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("zh-CN");
};

// 格式化日期时间
const formatDateTime = (date: string) => {
  if (!date) return "";
  return new Date(date).toLocaleString("zh-CN");
};

onMounted(() => {
  fetchTaskDetail();
  fetchUserList();
});
</script>

<style scoped>
.task-detail {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item .label {
  color: #909399;
  margin-right: 8px;
}

.description h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.description p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.comment-list {
  max-height: 400px;
  overflow-y: auto;
}

.comment-item {
  display: flex;
  margin-bottom: 20px;
}

.comment-avatar {
  margin-right: 12px;
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.comment-author {
  font-weight: 500;
  color: #303133;
  margin-right: 8px;
}

.comment-time {
  font-size: 12px;
  color: #909399;
}

.comment-text {
  color: #606266;
  line-height: 1.5;
}

.comment-mentions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.mention-tag {
  background: #ecf5ff;
  color: #409eff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 4px;
}

:deep(.mention-highlight) {
  background: #ecf5ff;
  color: #409eff;
  padding: 0 2px;
  border-radius: 2px;
}

.comment-attachments {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.log-list {
  max-height: 500px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  margin-bottom: 16px;
}

.log-icon {
  margin-right: 12px;
  color: #909399;
}

.log-content {
  flex: 1;
}

.log-text {
  color: #606266;
  line-height: 1.5;
}

.log-user {
  font-weight: 500;
  color: #303133;
  margin-right: 4px;
}

.log-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
}

.comment-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 10px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pending-attachments {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
</style>
