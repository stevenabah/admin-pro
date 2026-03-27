<template>
  <div class="task-board">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>任务看板</span>
          <div>
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>
              新建任务
            </el-button>
            <el-button @click="refreshBoard">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <!-- 看板列 -->
      <div class="board-container" v-loading="loading">
        <div
          class="board-column"
          v-for="status in statusList"
          :key="status.key"
        >
          <div class="column-header" :style="{ borderLeftColor: status.color }">
            <span class="column-title">{{ status.label }}</span>
            <el-badge :value="boardData[status.key]?.length || 0" :max="99" />
          </div>

          <div class="column-content">
            <div
              class="task-card"
              v-for="task in boardData[status.key]"
              :key="task.id"
              @click="goToDetail(task.id)"
            >
              <div class="task-card-header">
                <el-tag
                  :color="TaskPriorityConfig[task.priority]?.color"
                  size="small"
                  style="color: #fff"
                >
                  {{ TaskPriorityConfig[task.priority]?.label }}
                </el-tag>
                <el-dropdown
                  trigger="click"
                  @command="(cmd: string) => handleTaskCommand(cmd, task)"
                  @click.stop
                >
                  <el-icon class="task-action"><MoreFilled /></el-icon>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="edit">编辑</el-dropdown-item>
                      <el-dropdown-item
                        v-for="s in getAvailableTransitions(task.status)"
                        :key="s.key"
                        :command="`status:${s.key}`"
                      >
                        改为{{ s.label }}
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" divided
                        >删除</el-dropdown-item
                      >
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>

              <div class="task-card-title">{{ task.title }}</div>

              <div class="task-card-footer">
                <div class="task-assignee" v-if="task.assignee">
                  <el-avatar :size="20" :src="task.assignee.avatar">
                    {{
                      task.assignee.nickname?.[0] || task.assignee.username?.[0]
                    }}
                  </el-avatar>
                  <span>{{
                    task.assignee.nickname || task.assignee.username
                  }}</span>
                </div>
                <div
                  class="task-due"
                  v-if="task.dueDate"
                  :class="{ overdue: isOverdue(task) }"
                >
                  <el-icon><Clock /></el-icon>
                  {{ formatDate(task.dueDate) }}
                </div>
              </div>
            </div>

            <div v-if="!boardData[status.key]?.length" class="empty-column">
              暂无任务
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 创建/编辑任务弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑任务' : '创建任务'"
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
        <el-form-item v-if="isEdit" label="状态" prop="status">
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
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading"
          >确定</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Refresh, MoreFilled, Clock } from "@element-plus/icons-vue";
import {
  getTaskBoard,
  createTask,
  updateTask,
  deleteTask,
  TaskStatusConfig,
  TaskPriorityConfig,
} from "@/api/task";
import type { TaskStatusType, TaskPriorityType } from "@/api/task";

const router = useRouter();

// 状态列表
const statusList = [
  { key: "PENDING", label: "待处理", color: "#909399" },
  { key: "IN_PROGRESS", label: "进行中", color: "#409eff" },
  { key: "REVIEW", label: "待审核", color: "#e6a23c" },
  { key: "COMPLETED", label: "已完成", color: "#67c23a" },
  { key: "CANCELLED", label: "已取消", color: "#f56c6c" },
];

// 状态机定义
const TASK_STATUS_FLOW: Record<string, TaskStatusType[]> = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["REVIEW", "CANCELLED"],
  REVIEW: ["COMPLETED", "IN_PROGRESS"],
  COMPLETED: [],
  CANCELLED: ["PENDING"],
};

const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitLoading = ref(false);
const boardData = ref<Record<string, any[]>>({
  PENDING: [],
  IN_PROGRESS: [],
  REVIEW: [],
  COMPLETED: [],
  CANCELLED: [],
});
const userList = ref<any[]>([]);
const formRef = ref();

const taskForm = reactive({
  id: "",
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

// 获取看板数据
const fetchBoardData = async () => {
  loading.value = true;
  try {
    const res = await getTaskBoard();
    if (res.code === 200) {
      boardData.value = res.data;
    }
  } catch (error) {
    console.error("Failed to fetch board data:", error);
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

// 获取可用的状态转换
const getAvailableTransitions = (currentStatus: TaskStatusType) => {
  const available = TASK_STATUS_FLOW[currentStatus] || [];
  return statusList.filter((s) => available.includes(s.key as TaskStatusType));
};

// 刷新看板
const refreshBoard = () => {
  fetchBoardData();
};

// 打开创建弹窗
const openCreateDialog = () => {
  isEdit.value = false;
  taskForm.id = "";
  taskForm.title = "";
  taskForm.description = "";
  taskForm.priority = "MEDIUM";
  taskForm.assigneeId = "";
  taskForm.dueDate = "";
  taskForm.status = "PENDING";
  dialogVisible.value = true;
};

// 打开编辑弹窗
const openEditDialog = (task: any) => {
  isEdit.value = true;
  taskForm.id = task.id;
  taskForm.title = task.title;
  taskForm.description = task.description || "";
  taskForm.priority = task.priority;
  taskForm.assigneeId = task.assigneeId || "";
  taskForm.dueDate = task.dueDate ? task.dueDate.split("T")[0] : "";
  taskForm.status = task.status;
  dialogVisible.value = true;
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitLoading.value = true;
      try {
        const data = {
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          assigneeId: taskForm.assigneeId || undefined,
          dueDate: taskForm.dueDate || undefined,
        };

        let res;
        if (isEdit.value) {
          res = await updateTask(taskForm.id, {
            ...data,
            status: taskForm.status,
          });
        } else {
          res = await createTask(data);
        }

        if (res.code === 200) {
          ElMessage.success(isEdit.value ? "任务更新成功" : "任务创建成功");
          dialogVisible.value = false;
          fetchBoardData();
        } else {
          ElMessage.error(res.message || "操作失败");
        }
      } catch (error) {
        console.error("Submit error:", error);
        ElMessage.error("操作失败");
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

// 任务操作
const handleTaskCommand = (command: string, task: any) => {
  if (command === "edit") {
    openEditDialog(task);
  } else if (command === "delete") {
    handleDelete(task.id);
  } else if (command.startsWith("status:")) {
    const newStatus = command.split(":")[1] as TaskStatusType;
    handleStatusChange(task.id, newStatus);
  }
};

// 状态变更
const handleStatusChange = async (id: string, status: TaskStatusType) => {
  try {
    const res = await updateTask(id, { status });
    if (res.code === 200) {
      ElMessage.success("状态更新成功");
      fetchBoardData();
    } else {
      ElMessage.error(res.message || "更新失败");
    }
  } catch (error) {
    console.error("Status change error:", error);
    ElMessage.error("更新失败");
  }
};

// 删除任务
const handleDelete = (id: string) => {
  ElMessageBox.confirm("确定要删除该任务吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    try {
      const res = await deleteTask(id);
      if (res.code === 200) {
        ElMessage.success("删除成功");
        fetchBoardData();
      } else {
        ElMessage.error(res.message || "删除失败");
      }
    } catch (error) {
      console.error("Delete error:", error);
      ElMessage.error("删除失败");
    }
  });
};

// 跳转到详情页
const goToDetail = (id: string) => {
  router.push(`/task/${id}`);
};

// 判断是否逾期
const isOverdue = (task: any) => {
  if (
    !task.dueDate ||
    task.status === "COMPLETED" ||
    task.status === "CANCELLED"
  )
    return false;
  return new Date(task.dueDate) < new Date();
};

// 日期格式化
const formatDate = (date: string) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("zh-CN");
};

onMounted(() => {
  fetchBoardData();
  fetchUserList();
});
</script>

<style scoped>
.task-board {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.board-container {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  min-height: 500px;
}

.board-column {
  flex: 0 0 280px;
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 250px);
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-left: 4px solid;
  background: #fff;
  border-radius: 8px 8px 0 0;
}

.column-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.column-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  min-height: 200px;
}

.task-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s;
}

.task-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.task-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-action {
  cursor: pointer;
  color: #909399;
  padding: 4px;
}

.task-action:hover {
  color: #409eff;
}

.task-card-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}

.task-assignee {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-due {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-due.overdue {
  color: #f56c6c;
}

.empty-column {
  text-align: center;
  color: #909399;
  padding: 40px 0;
  font-size: 14px;
}
</style>
