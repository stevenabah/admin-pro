<template>
  <div class="task-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>任务管理</span>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>
            新建任务
          </el-button>
        </div>
      </template>

      <!-- 筛选工具栏 -->
      <div class="filter-toolbar">
        <el-form :inline="true" :model="filterForm">
          <el-form-item label="状态">
            <el-select
              v-model="filterForm.status"
              placeholder="全部状态"
              clearable
              @change="handleFilterChange"
            >
              <el-option
                v-for="(config, key) in TaskStatusConfig"
                :key="key"
                :label="config.label"
                :value="key"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-select
              v-model="filterForm.priority"
              placeholder="全部优先级"
              clearable
              @change="handleFilterChange"
            >
              <el-option
                v-for="(config, key) in TaskPriorityConfig"
                :key="key"
                :label="config.label"
                :value="key"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input
              v-model="filterForm.keyword"
              placeholder="搜索任务标题/描述"
              clearable
              @change="handleFilterChange"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleFilterChange"
              >搜索</el-button
            >
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 任务列表 -->
      <el-table :data="taskList" v-loading="loading" stripe>
        <el-table-column prop="title" label="任务标题" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="goToDetail(row.id)">{{
              row.title
            }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :color="TaskStatusConfig[row.status]?.color"
              style="color: #fff"
            >
              {{ TaskStatusConfig[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="80">
          <template #default="{ row }">
            <el-tag
              :color="TaskPriorityConfig[row.priority]?.color"
              style="color: #fff"
            >
              {{ TaskPriorityConfig[row.priority]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="assignee" label="负责人" width="120">
          <template #default="{ row }">
            <span v-if="row.assignee">{{
              row.assignee.nickname || row.assignee.username
            }}</span>
            <span v-else style="color: #999">未分配</span>
          </template>
        </el-table-column>
        <el-table-column prop="dueDate" label="截止日期" width="120">
          <template #default="{ row }">
            <span v-if="row.dueDate">{{ formatDate(row.dueDate) }}</span>
            <span v-else style="color: #999">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="creator" label="创建人" width="120">
          <template #default="{ row }">
            {{ row.creator?.nickname || row.creator?.username }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openEditDialog(row)"
              >编辑</el-button
            >
            <el-button type="danger" size="small" @click="handleDelete(row.id)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
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
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import {
  getTaskList,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
  TaskStatusConfig,
  TaskPriorityConfig,
} from "@/api/task";
import type { TaskStatusType, TaskPriorityType } from "@/api/task";

const router = useRouter();

// 状态
const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitLoading = ref(false);
const taskList = ref<any[]>([]);
const userList = ref<any[]>([]);
const formRef = ref();

// 筛选表单
const filterForm = reactive({
  status: "" as TaskStatusType | "",
  priority: "" as TaskPriorityType | "",
  keyword: "",
});

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

// 任务表单
const taskForm = reactive({
  id: "",
  title: "",
  description: "",
  priority: "MEDIUM" as TaskPriorityType,
  assigneeId: "",
  dueDate: "",
  status: "PENDING" as TaskStatusType,
});

// 表单验证
const formRules = {
  title: [{ required: true, message: "请输入任务标题", trigger: "blur" }],
};

// 加载任务列表
const fetchTaskList = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filterForm.status || undefined,
      priority: filterForm.priority || undefined,
      keyword: filterForm.keyword || undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    };
    const res = await getTaskList(params);
    if (res.code === 200) {
      taskList.value = res.data.list;
      pagination.total = res.data.pagination.total;
    }
  } catch (error) {
    console.error("Failed to fetch task list:", error);
  } finally {
    loading.value = false;
  }
};

// 加载用户列表（用于负责人选择）
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

// 加载任务统计（用于Dashboard整合）
const fetchTaskStats = async () => {
  try {
    const res = await getTaskStats();
    if (res.code === 200) {
      return res.data;
    }
  } catch (error) {
    console.error("Failed to fetch task stats:", error);
  }
  return null;
};

// 筛选变化
const handleFilterChange = () => {
  pagination.page = 1;
  fetchTaskList();
};

// 重置筛选
const resetFilter = () => {
  filterForm.status = "";
  filterForm.priority = "";
  filterForm.keyword = "";
  pagination.page = 1;
  fetchTaskList();
};

// 分页变化
const handlePageChange = (page: number) => {
  pagination.page = page;
  fetchTaskList();
};

const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
  pagination.page = 1;
  fetchTaskList();
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
const openEditDialog = (row: any) => {
  isEdit.value = true;
  taskForm.id = row.id;
  taskForm.title = row.title;
  taskForm.description = row.description || "";
  taskForm.priority = row.priority;
  taskForm.assigneeId = row.assigneeId || "";
  taskForm.dueDate = row.dueDate ? row.dueDate.split("T")[0] : "";
  taskForm.status = row.status;
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
          fetchTaskList();
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
        fetchTaskList();
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

// 日期格式化
const formatDate = (date: string) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("zh-CN");
};

// 暴露方法给父组件使用
defineExpose({
  fetchTaskStats,
});

onMounted(() => {
  fetchTaskList();
  fetchUserList();
});
</script>

<style scoped>
.task-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-toolbar {
  margin-bottom: 20px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
