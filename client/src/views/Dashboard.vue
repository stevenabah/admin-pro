<template>
  <div class="dashboard">
    <!-- 我的任务工作台 -->
    <el-card class="my-task-workspace">
      <template #header>
        <div class="card-header">
          <span>我的任务工作台</span>
          <el-button type="primary" link @click="$router.push('/task')">
            查看全部 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="task-stat-item pending">
            <div class="task-stat-value">{{ myTaskStats.pending || 0 }}</div>
            <div class="task-stat-label">待处理</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="task-stat-item in-progress">
            <div class="task-stat-value">{{ myTaskStats.inProgress || 0 }}</div>
            <div class="task-stat-label">进行中</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="task-stat-item review">
            <div class="task-stat-value">{{ myTaskStats.review || 0 }}</div>
            <div class="task-stat-label">待审核</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="task-stat-item overdue" :class="{ 'has-overdue': myTaskStats.overdue > 0 }">
            <div class="task-stat-value">{{ myTaskStats.overdue || 0 }}</div>
            <div class="task-stat-label">逾期任务</div>
          </div>
        </el-col>
      </el-row>

      <!-- 逾期提醒 -->
      <div v-if="myDashboard.todayOverdueTasks?.length" class="overdue-alert">
        <el-alert type="warning" :closable="false">
          <template #title>
            <span>您有 {{ myDashboard.todayOverdueTasks?.length }} 个任务已逾期</span>
          </template>
        </el-alert>
        <div class="overdue-task-list">
          <div
            v-for="task in myDashboard.todayOverdueTasks"
            :key="task.id"
            class="overdue-task-item"
            @click="$router.push(`/task/${task.id}`)"
          >
            <el-tag type="danger" size="small">逾期</el-tag>
            <span class="task-title">{{ task.title }}</span>
            <span class="task-due">截止: {{ formatDate(task.dueDate) }}</span>
          </div>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20" style="margin-top: 20px">
      <!-- 我的待办 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>我的待办</span>
          </template>
          <div v-if="myDashboard.myTodoTasks?.length" class="todo-list">
            <div
              v-for="task in myDashboard.myTodoTasks"
              :key="task.id"
              class="todo-item"
              @click="$router.push(`/task/${task.id}`)"
            >
              <el-tag
                :color="TaskPriorityConfig[task.priority]?.color"
                size="small"
                style="color: #fff"
              >
                {{ TaskPriorityConfig[task.priority]?.label }}
              </el-tag>
              <span class="todo-title">{{ task.title }}</span>
              <span v-if="task.dueDate" class="todo-due" :class="{ overdue: task.isOverdue }">
                {{ formatDate(task.dueDate) }}
              </span>
            </div>
          </div>
          <el-empty v-else description="暂无待办任务" :image-size="60" />
        </el-card>
      </el-col>

      <!-- 最近创建 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>最近创建的任务</span>
          </template>
          <div v-if="myDashboard.recentCreatedTasks?.length" class="todo-list">
            <div
              v-for="task in myDashboard.recentCreatedTasks"
              :key="task.id"
              class="todo-item"
              @click="$router.push(`/task/${task.id}`)"
            >
              <el-tag :type="task.status === 'COMPLETED' ? 'success' : 'info'" size="small">
                {{ task.statusText }}
              </el-tag>
              <span class="todo-title">{{ task.title }}</span>
              <span v-if="task.assignee" class="todo-assignee">
                → {{ task.assignee.nickname || task.assignee.username }}
              </span>
            </div>
          </div>
          <el-empty v-else description="暂无任务" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #409eff">
            <el-icon :size="30"><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.userCount }}</div>
            <div class="stat-label">用户总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #67c23a">
            <el-icon :size="30"><UserFilled /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.roleCount }}</div>
            <div class="stat-label">角色数量</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #e6a23c">
            <el-icon :size="30"><Folder /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.fileCount }}</div>
            <div class="stat-label">文件数量</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #f56c6c">
            <el-icon :size="30"><VideoCamera /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.mediaCount }}</div>
            <div class="stat-label">媒体数量</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>近7天访问量趋势</span>
          </template>
          <v-chart :option="lineChart" style="height: 300px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>数据分类统计</span>
          </template>
          <v-chart :option="pieChart" style="height: 300px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>最近新增用户</span>
          </template>
          <el-table :data="stats.recentUsers" size="small">
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="nickname" label="昵称" />
            <el-table-column prop="createdAt" label="创建时间">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>最近上传文件</span>
          </template>
          <el-table :data="stats.recentFiles" size="small">
            <el-table-column prop="originalName" label="文件名" />
            <el-table-column prop="size" label="大小">
              <template #default="{ row }">
                {{ formatSize(row.size) }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="上传时间">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import VChart from "vue-echarts";
import { api } from "@/stores/user";
import { getTaskStats, getMyDashboard, TaskPriorityConfig } from "@/api/task";

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
]);

const stats = ref<any>({
  userCount: 0,
  roleCount: 0,
  fileCount: 0,
  mediaCount: 0,
  recentUsers: [],
  recentFiles: [],
});

const taskStats = ref<any>({
  total: 0,
  inProgress: 0,
  completed: 0,
});

const myTaskStats = ref<any>({
  pending: 0,
  inProgress: 0,
  review: 0,
  overdue: 0,
});

const myDashboard = ref<any>({
  myTodoTasks: [],
  recentCreatedTasks: [],
  todayOverdueTasks: [],
});

const chartData = ref<any>({
  visitChart: { xAxis: [], series: [] },
  categoryChart: [],
});

const lineChart = ref({});
const pieChart = ref({});

const fetchData = async () => {
  const [statsRes, chartRes, taskStatsRes, myDashboardRes] = await Promise.all([
    api.get("/stats/dashboard"),
    api.get("/stats/chart-data"),
    getTaskStats(),
    getMyDashboard(),
  ]);

  if (statsRes.code === 200) {
    stats.value = statsRes.data;
  }
  if (chartRes.code === 200) {
    chartData.value = chartRes.data;
    initCharts();
  }
  if (taskStatsRes.code === 200) {
    taskStats.value = taskStatsRes.data;
  }
  if (myDashboardRes.code === 200) {
    myTaskStats.value = myDashboardRes.data.stats || {};
    myDashboard.value = myDashboardRes.data || {};
  }
};

const initCharts = () => {
  lineChart.value = {
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: chartData.value.visitChart.xAxis,
    },
    yAxis: { type: "value" },
    series: [
      {
        data: chartData.value.visitChart.series,
        type: "line",
        smooth: true,
        areaStyle: { opacity: 0.3 },
        itemStyle: { color: "#409eff" },
      },
    ],
  };

  pieChart.value = {
    tooltip: { trigger: "item" },
    series: [
      {
        type: "pie",
        radius: "60%",
        data: chartData.value.categoryChart,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("zh-CN");
};

const formatSize = (size: number) => {
  if (size < 1024) return size + " B";
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB";
  return (size / 1024 / 1024).toFixed(1) + " MB";
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-right: 15px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #999;
  margin-top: 5px;
}

/* 我的任务工作台样式 */
.my-task-workspace {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.my-task-workspace :deep(.el-card__header) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

.my-task-workspace :deep(.el-card__body) {
  color: #fff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header .el-button {
  color: #fff;
}

.task-stat-item {
  text-align: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  margin: 0 8px;
}

.task-stat-item.has-overdue {
  background: rgba(245, 108, 108, 0.3);
}

.task-stat-value {
  font-size: 32px;
  font-weight: bold;
}

.task-stat-label {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 4px;
}

.overdue-alert {
  margin-top: 20px;
}

.overdue-task-list {
  margin-top: 12px;
}

.overdue-task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  margin-top: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.overdue-task-item:hover {
  background: rgba(255, 255, 255, 0.2);
}

.overdue-task-item .task-title {
  flex: 1;
}

.overdue-task-item .task-due {
  font-size: 12px;
  opacity: 0.8;
}

/* 待办列表样式 */
.todo-list {
  max-height: 300px;
  overflow-y: auto;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item:hover {
  background: #f5f7fa;
}

.todo-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-due {
  font-size: 12px;
  color: #909399;
}

.todo-due.overdue {
  color: #f56c6c;
}

.todo-assignee {
  font-size: 12px;
  color: #909399;
}
</style>
