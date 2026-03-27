<template>
  <div class="gantt-chart">
    <!-- 顶部工具栏 -->
    <el-card class="toolbar-card">
      <el-row :gutter="20" align="middle">
        <el-col :span="6">
          <el-select
            v-model="filterAssignee"
            placeholder="选择人员筛选"
            clearable
            size="default"
            @change="handleFilterChange"
          >
            <el-option
              v-for="user in userList"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="filterPriority"
            placeholder="选择优先级筛选"
            clearable
            size="default"
            @change="handleFilterChange"
          >
            <el-option
              v-for="priority in priorityOptions"
              :key="priority.value"
              :label="priority.label"
              :value="priority.value"
            />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-date-picker
            v-model="viewDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            size="default"
            @change="handleDateRangeChange"
          />
        </el-col>
        <el-col :span="6" style="text-align: right">
          <el-button-group>
            <el-button size="default" @click="zoomOut">
              <el-icon><ZoomOut /></el-icon>
            </el-button>
            <el-button size="default" @click="zoomIn">
              <el-icon><ZoomIn /></el-icon>
            </el-button>
            <el-button type="primary" size="default" @click="refreshData">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </el-button-group>
        </el-col>
      </el-row>
    </el-card>

    <!-- 甘特图主体 -->
    <el-card class="gantt-container" ref="ganttContainer">
      <div class="gantt-wrapper" v-loading="loading">
        <!-- 时间轴头部 -->
        <div class="gantt-header">
          <div class="gantt-task-name-header">任务名称</div>
          <div class="gantt-timeline-header" :style="{ width: timelineWidth + 'px' }">
            <div
              class="timeline-header-inner"
              :style="{ transform: `translateX(${scrollOffset}px)` }"
            >
              <div
                v-for="(date, index) in timelineDates"
                :key="index"
                class="timeline-header-cell"
                :class="{ today: isToday(date) }"
              >
                {{ formatDateHeader(date) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 任务列表 -->
        <div class="gantt-body" @scroll="handleScroll">
          <!-- 任务名称列 -->
          <div class="gantt-task-names">
            <div
              v-for="task in filteredTasks"
              :key="task.id"
              class="gantt-task-row"
              :class="{ 'task-overdue': isTaskOverdue(task) }"
            >
              <div class="task-name-cell">
                <el-tag size="small" :type="getPriorityType(task.priority)" class="task-priority-tag">
                  {{ getPriorityLabel(task.priority) }}
                </el-tag>
                <span class="task-name-text">{{ task.title }}</span>
              </div>
            </div>
          </div>

          <!-- 时间线区域 -->
          <div class="gantt-timeline" ref="timelineRef">
            <div
              class="timeline-content"
              :style="{ width: timelineWidth + 'px', transform: `translateX(${scrollOffset}px)` }"
            >
              <!-- 今日线 -->
              <div
                v-if="todayPosition >= 0"
                class="today-line"
                :style="{ left: todayPosition + 'px' }"
              />

              <!-- 网格线 -->
              <div class="timeline-grid">
                <div
                  v-for="(date, index) in timelineDates"
                  :key="index"
                  class="timeline-grid-cell"
                  :class="{ today: isToday(date), weekend: isWeekend(date) }"
                />
              </div>

              <!-- 任务条 -->
              <div
                v-for="task in filteredTasks"
                :key="task.id"
                class="gantt-task-bar-row"
              >
                <div
                  class="gantt-task-bar"
                  :class="{
                    'task-overdue': isTaskOverdue(task),
                    'task-completed': task.status === 'COMPLETED',
                  }"
                  :style="getTaskBarStyle(task)"
                  @click="handleTaskClick(task)"
                  @mousedown="startDrag($event, task)"
                  :title="`${task.title}\n开始: ${task.startDate}\n截止: ${task.dueDate}\n进度: ${task.progress}%`"
                >
                  <div class="task-bar-progress" :style="{ width: task.progress + '%' }" />
                  <span class="task-bar-text">{{ task.title }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 任务详情对话框 -->
    <el-dialog v-model="taskDialogVisible" title="任务详情" width="600px">
      <div v-if="selectedTask" class="task-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务名称" :span="2">
            {{ selectedTask.title }}
          </el-descriptions-item>
          <el-descriptions-item label="负责人">
            {{ selectedTask.assigneeName }}
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="getPriorityType(selectedTask.priority)" size="small">
              {{ getPriorityLabel(selectedTask.priority) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开始日期">
            {{ selectedTask.startDate }}
          </el-descriptions-item>
          <el-descriptions-item label="截止日期">
            <span :class="{ 'text-danger': isTaskOverdue(selectedTask) }">
              {{ selectedTask.dueDate }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="进度">
            <el-progress :percentage="selectedTask.progress" :stroke-width="10" />
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedTask.status)" size="small">
              {{ getStatusLabel(selectedTask.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ selectedTask.description || "无" }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/api/task";

const router = useRouter();

// 状态
const loading = ref(false);
const tasks = ref<any[]>([]);
const userList = ref<any[]>([]);
const filterAssignee = ref("");
const filterPriority = ref("");
const viewDateRange = ref<[Date, Date] | null>(null);
const scrollOffset = ref(0);
const dayWidth = ref(40);
const taskDialogVisible = ref(false);
const selectedTask = ref<any>(null);
const ganttContainer = ref<HTMLElement | null>(null);
const timelineRef = ref<HTMLElement | null>(null);

// 优先级选项
const priorityOptions = [
  { value: "LOW", label: "低" },
  { value: "MEDIUM", label: "中" },
  { value: "HIGH", label: "高" },
  { value: "URGENT", label: "紧急" },
];

// 计算时间范围
const dateRange = computed(() => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  if (viewDateRange.value) {
    return {
      start: viewDateRange.value[0],
      end: viewDateRange.value[1],
    };
  }

  return { start, end };
});

// 生成日期序列
const timelineDates = computed(() => {
  const dates: Date[] = [];
  const { start, end } = dateRange.value;
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
});

// 时间线总宽度
const timelineWidth = computed(() => {
  return timelineDates.value.length * dayWidth.value;
});

// 今日位置
const todayPosition = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { start } = dateRange.value;
  const diffDays = Math.floor(
    (today.getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0 || diffDays >= timelineDates.value.length) {
    return -1;
  }

  return diffDays * dayWidth.value + dayWidth.value / 2;
});

// 筛选后的任务
const filteredTasks = computed(() => {
  let result = tasks.value;

  if (filterAssignee.value) {
    result = result.filter((t) => t.assigneeId === filterAssignee.value);
  }

  if (filterPriority.value) {
    result = result.filter((t) => t.priority === filterPriority.value);
  }

  return result;
});

// 格式化日期头部
const formatDateHeader = (date: Date) => {
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

// 判断是否是今天
const isToday = (date: Date) => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

// 判断是否是周末
const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// 判断任务是否逾期
const isTaskOverdue = (task: any) => {
  if (task.status === "COMPLETED") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.dueDate);
  return dueDate < today;
};

// 获取优先级类型
const getPriorityType = (priority: string) => {
  const map: Record<string, string> = {
    LOW: "info",
    MEDIUM: "",
    HIGH: "warning",
    URGENT: "danger",
  };
  return map[priority] || "";
};

// 获取优先级标签
const getPriorityLabel = (priority: string) => {
  const map: Record<string, string> = {
    LOW: "低",
    MEDIUM: "中",
    HIGH: "高",
    URGENT: "紧急",
  };
  return map[priority] || priority;
};

// 获取状态类型
const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "info",
    IN_PROGRESS: "primary",
    REVIEW: "warning",
    COMPLETED: "success",
    CANCELLED: "danger",
  };
  return map[status] || "";
};

// 获取状态标签
const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "待处理",
    IN_PROGRESS: "进行中",
    REVIEW: "待审核",
    COMPLETED: "已完成",
    CANCELLED: "已取消",
  };
  return map[status] || status;
};

// 计算任务条样式
const getTaskBarStyle = (task: any) => {
  const { start } = dateRange.value;
  const taskStart = new Date(task.startDate);
  const taskEnd = new Date(task.dueDate);

  const startOffset = Math.max(
    0,
    Math.floor((taskStart.getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
  );
  const endOffset = Math.min(
    timelineDates.value.length,
    Math.ceil((taskEnd.getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const left = startOffset * dayWidth.value;
  const width = Math.max(dayWidth.value, (endOffset - startOffset) * dayWidth.value);

  return {
    left: left + "px",
    width: width + "px",
  };
};

// 缩放
const zoomIn = () => {
  dayWidth.value = Math.min(80, dayWidth.value + 10);
};

const zoomOut = () => {
  dayWidth.value = Math.max(20, dayWidth.value - 10);
};

// 滚动处理
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  scrollOffset.value = target.scrollLeft;
};

// 日期范围变化
const handleDateRangeChange = () => {
  // 日期范围变化后重新计算
};

// 筛选变化
const handleFilterChange = () => {
  // 筛选变化后重新计算
};

// 刷新数据
const refreshData = async () => {
  loading.value = true;
  try {
    const res = await api.get("/tasks/gantt");
    if (res.code === 200) {
      tasks.value = res.data.tasks || [];
      userList.value = res.data.users || [];
    }
  } catch (error) {
    console.error("Failed to fetch gantt data:", error);
    initMockData();
  } finally {
    loading.value = false;
  }
};

// 初始化模拟数据
const initMockData = () => {
  const users = [
    { id: "1", name: "张三" },
    { id: "2", name: "李四" },
    { id: "3", name: "王五" },
  ];

  tasks.value = [
    {
      id: "1",
      title: "用户模块开发",
      assigneeId: "1",
      assigneeName: "张三",
      priority: "HIGH",
      status: "IN_PROGRESS",
      startDate: "2026-03-20",
      dueDate: "2026-03-28",
      progress: 60,
      description: "完成用户管理模块的CRUD功能",
    },
    {
      id: "2",
      title: "登录功能优化",
      assigneeId: "2",
      assigneeName: "李四",
      priority: "URGENT",
      status: "IN_PROGRESS",
      startDate: "2026-03-18",
      dueDate: "2026-03-25",
      progress: 80,
      description: "优化登录流程，增加验证码功能",
    },
    {
      id: "3",
      title: "数据报表导出",
      assigneeId: "3",
      assigneeName: "王五",
      priority: "MEDIUM",
      status: "PENDING",
      startDate: "2026-03-25",
      dueDate: "2026-04-05",
      progress: 0,
      description: "实现数据导出Excel功能",
    },
    {
      id: "4",
      title: "接口文档编写",
      assigneeId: "1",
      assigneeName: "张三",
      priority: "LOW",
      status: "COMPLETED",
      startDate: "2026-03-10",
      dueDate: "2026-03-20",
      progress: 100,
      description: "编写API接口文档",
    },
    {
      id: "5",
      title: "性能优化",
      assigneeId: "2",
      assigneeName: "李四",
      priority: "HIGH",
      status: "IN_PROGRESS",
      startDate: "2026-03-22",
      dueDate: "2026-04-01",
      progress: 30,
      description: "前端性能优化，减少白屏时间",
    },
    {
      id: "6",
      title: "Bug修复",
      assigneeId: "3",
      assigneeName: "王五",
      priority: "URGENT",
      status: "IN_PROGRESS",
      startDate: "2026-03-23",
      dueDate: "2026-03-27",
      progress: 50,
      description: "修复用户反馈的若干Bug",
    },
  ];

  userList.value = users;
};

// 拖拽开始
const startDrag = (e: MouseEvent, task: any) => {
  // 拖拽功能预留接口
  console.log("Drag started:", task);
};

// 任务点击
const handleTaskClick = (task: any) => {
  selectedTask.value = task;
  taskDialogVisible.value = true;
};

// 滚动到今日
const scrollToToday = () => {
  if (timelineRef.value && todayPosition.value >= 0) {
    timelineRef.value.scrollLeft = todayPosition.value - 200;
  }
};

onMounted(() => {
  refreshData().then(() => {
    setTimeout(scrollToToday, 100);
  });
});
</script>

<style scoped>
.gantt-chart {
  padding: 0;
}

.toolbar-card {
  margin-bottom: 20px;
}

.toolbar-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.gantt-container {
  overflow: hidden;
}

.gantt-container :deep(.el-card__body) {
  padding: 0;
}

.gantt-wrapper {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 300px);
  min-height: 400px;
}

.gantt-header {
  display: flex;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
  position: sticky;
  top: 0;
  z-index: 10;
}

.gantt-task-name-header {
  width: 250px;
  min-width: 250px;
  padding: 12px 16px;
  font-weight: 600;
  color: #303133;
  border-right: 1px solid #e4e7ed;
}

.gantt-timeline-header {
  overflow: hidden;
  position: relative;
  height: 44px;
}

.timeline-header-inner {
  display: flex;
  height: 100%;
  position: absolute;
  top: 0;
}

.timeline-header-cell {
  width: 40px;
  min-width: 40px;
  padding: 12px 0;
  text-align: center;
  font-size: 12px;
  color: #606266;
  border-right: 1px solid #e4e7ed;
}

.timeline-header-cell.today {
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
  font-weight: 600;
}

.gantt-body {
  display: flex;
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
}

.gantt-task-names {
  width: 250px;
  min-width: 250px;
  border-right: 1px solid #e4e7ed;
  background: #fff;
}

.gantt-task-row {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.gantt-task-row:hover {
  background: #f5f7fa;
}

.gantt-task-row.task-overdue {
  background: rgba(245, 108, 108, 0.05);
}

.task-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.task-priority-tag {
  flex-shrink: 0;
}

.task-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.gantt-timeline {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
}

.timeline-content {
  position: relative;
  height: 100%;
  min-height: 100%;
}

.today-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #f56c6c;
  z-index: 5;
}

.today-line::before {
  content: "今天";
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: #f56c6c;
  white-space: nowrap;
}

.timeline-grid {
  display: flex;
  height: 100%;
}

.timeline-grid-cell {
  width: 40px;
  min-width: 40px;
  height: 100%;
  border-right: 1px solid #f0f0f0;
}

.timeline-grid-cell.today {
  background: rgba(64, 158, 255, 0.05);
}

.timeline-grid-cell.weekend {
  background: rgba(144, 147, 153, 0.05);
}

.gantt-task-bar-row {
  position: absolute;
  left: 0;
  right: 0;
  height: 44px;
  display: flex;
  align-items: center;
}

.gantt-task-bar {
  position: absolute;
  height: 28px;
  background: linear-gradient(135deg, #409eff, #337ecc);
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.3);
}

.gantt-task-bar:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(64, 158, 255, 0.4);
}

.gantt-task-bar.task-overdue {
  background: linear-gradient(135deg, #f56c6c, #e04040);
  box-shadow: 0 2px 4px rgba(245, 108, 108, 0.3);
}

.gantt-task-bar.task-completed {
  background: linear-gradient(135deg, #67c23a, #5baf40);
  box-shadow: 0 2px 4px rgba(103, 194, 58, 0.3);
}

.task-bar-progress {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.3);
  transition: width 0.3s;
}

.task-bar-text {
  position: relative;
  padding: 0 8px;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-danger {
  color: #f56c6c;
}

.task-detail {
  padding: 10px 0;
}
</style>
