<template>
  <div class="stats-report">
    <!-- 顶部时间范围选择器 -->
    <el-card class="filter-card">
      <el-row :gutter="20" align="middle">
        <el-col :span="4">
          <el-radio-group v-model="timeRange" size="default" @change="handleTimeRangeChange">
            <el-radio-button value="week">本周</el-radio-button>
            <el-radio-button value="month">本月</el-radio-button>
            <el-radio-button value="quarter">本季度</el-radio-button>
            <el-radio-button value="custom">自定义</el-radio-button>
          </el-radio-group>
        </el-col>
        <el-col :span="8" v-if="timeRange === 'custom'">
          <el-date-picker
            v-model="customDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="handleCustomDateChange"
          />
        </el-col>
        <el-col :span="12" style="text-align: right">
          <el-button type="primary" @click="refreshData">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 第一行：关键指标卡片 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #409eff">
            <el-icon :size="30"><List /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ metrics.totalTasks }}</div>
            <div class="stat-label">总任务数</div>
            <div class="stat-trend" :class="metrics.totalTasksTrend >= 0 ? 'up' : 'down'">
              {{ metrics.totalTasksTrend >= 0 ? '+' : '' }}{{ metrics.totalTasksTrend }}%
              <span class="trend-text">较上期</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #67c23a">
            <el-icon :size="30"><CircleCheck /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ metrics.completionRate }}%</div>
            <div class="stat-label">完成率</div>
            <div class="stat-trend" :class="metrics.completionRateTrend >= 0 ? 'up' : 'down'">
              {{ metrics.completionRateTrend >= 0 ? '+' : '' }}{{ metrics.completionRateTrend }}%
              <span class="trend-text">较上期</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #e6a23c">
            <el-icon :size="30"><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ metrics.avgProcessingTime }}h</div>
            <div class="stat-label">平均处理时长</div>
            <div class="stat-trend" :class="metrics.avgTimeTrend <= 0 ? 'up' : 'down'">
              {{ metrics.avgTimeTrend >= 0 ? '+' : '' }}{{ metrics.avgTimeTrend }}%
              <span class="trend-text">较上期</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #f56c6c">
            <el-icon :size="30"><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ metrics.overdueRate }}%</div>
            <div class="stat-label">逾期率</div>
            <div class="stat-trend" :class="metrics.overdueRateTrend <= 0 ? 'up' : 'down'">
              {{ metrics.overdueRateTrend >= 0 ? '+' : '' }}{{ metrics.overdueRateTrend }}%
              <span class="trend-text">较上期</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 第二行：团队效能图表 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>每日完成任务趋势</span>
              <el-select v-model="chartMetric" size="small" style="width: 120px">
                <el-option value="count" label="完成任务数" />
                <el-option value="duration" label="处理时长" />
              </el-select>
            </div>
          </template>
          <v-chart :option="efficiencyChart" style="height: 300px" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 第三行：人员负载分布 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>人员负载分布</span>
          </template>
          <v-chart :option="workloadChart" style="height: 300px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>任务优先级分布</span>
          </template>
          <v-chart :option="priorityChart" style="height: 300px" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 第四行：任务状态分布和标签分布 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>任务状态分布</span>
          </template>
          <v-chart :option="statusChart" style="height: 300px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>标签分布</span>
          </template>
          <v-chart :option="tagChart" style="height: 300px" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 第五行：团队工作量对比（支持按周/月筛选） -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>团队工作量对比</span>
              <el-radio-group v-model="workloadViewMode" size="small" @change="handleWorkloadViewModeChange">
                <el-radio-button value="week">按周</el-radio-button>
                <el-radio-button value="month">按月</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <v-chart :option="workloadComparisonChart" style="height: 350px" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart, BarChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
} from "echarts/components";
import VChart from "vue-echarts";
import { api, getTagDistribution, getWorkloadComparison } from "@/api/task";

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
]);

// 时间范围
const timeRange = ref("month");
const customDateRange = ref<[Date, Date] | null>(null);
const chartMetric = ref("count");
const workloadViewMode = ref("month");

// 关键指标
const metrics = reactive({
  totalTasks: 0,
  totalTasksTrend: 0,
  completionRate: 0,
  completionRateTrend: 0,
  avgProcessingTime: 0,
  avgTimeTrend: 0,
  overdueRate: 0,
  overdueRateTrend: 0,
});

// 图表数据
const efficiencyData = ref<{ date: string; count: number; duration: number }[]>([]);
const workloadData = ref<{ name: string; value: number }[]>([]);
const priorityData = ref<{ name: string; value: number; itemStyle: { color: string } }[]>([]);
const statusData = ref<{ name: string; value: number; itemStyle: { color: string } }[]>([]);
const tagData = ref<{ tagId: string; tagName: string; tagColor: string; total: number; itemStyle: { color: string } }[]>([]);
const workloadComparisonData = ref<{ userId: string; nickname: string; weeklyData: { week: string; created: number; completed: number }[] }[]>([]);
const workloadWeeks = ref<string[]>([]);

// 计算图表配置
const efficiencyChart = computed(() => ({
  tooltip: {
    trigger: "axis",
    formatter: (params: any) => {
      const data = params[0];
      return `${data.name}<br/>完成任务数: ${data.value}`;
    },
  },
  grid: {
    left: "3%",
    right: "4%",
    bottom: "3%",
    containLabel: true,
  },
  xAxis: {
    type: "category",
    boundaryGap: false,
    data: efficiencyData.value.map((item) => item.date),
  },
  yAxis: {
    type: "value",
    name: chartMetric.value === "count" ? "任务数" : "时长(h)",
  },
  dataZoom: [
    {
      type: "inside",
      start: 0,
      end: 100,
    },
  ],
  series: [
    {
      name: "完成任务数",
      type: "line",
      data: efficiencyData.value.map((item) =>
        chartMetric.value === "count" ? item.count : item.duration
      ),
      smooth: true,
      areaStyle: { opacity: 0.3 },
      itemStyle: { color: "#409eff" },
      lineStyle: { width: 2 },
    },
  ],
}));

const workloadChart = computed(() => ({
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
  },
  grid: {
    left: "3%",
    right: "4%",
    bottom: "3%",
    containLabel: true,
  },
  xAxis: {
    type: "value",
    name: "任务数",
  },
  yAxis: {
    type: "category",
    data: workloadData.value.map((item) => item.name),
    inverse: true,
  },
  series: [
    {
      name: "任务数",
      type: "bar",
      data: workloadData.value.map((item) => item.value),
      itemStyle: {
        color: (params: any) => {
          const colorList = ["#409eff", "#67c23a", "#e6a23c", "#f56c6c", "#909399"];
          return colorList[params.dataIndex % colorList.length];
        },
        borderRadius: [0, 4, 4, 0],
      },
      label: {
        show: true,
        position: "right",
        formatter: "{c}",
      },
    },
  ],
}));

const priorityChart = computed(() => ({
  tooltip: {
    trigger: "item",
    formatter: "{b}: {c} ({d}%)",
  },
  legend: {
    orient: "vertical",
    left: "left",
  },
  series: [
    {
      name: "优先级",
      type: "pie",
      radius: ["40%", "70%"],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: "#fff",
        borderWidth: 2,
      },
      label: {
        show: true,
        formatter: "{b}: {c}",
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: "bold",
        },
      },
      data: priorityData.value,
    },
  ],
}));

const statusChart = computed(() => ({
  tooltip: {
    trigger: "item",
    formatter: "{b}: {c} ({d}%)",
  },
  legend: {
    orient: "vertical",
    left: "left",
  },
  series: [
    {
      name: "状态",
      type: "pie",
      radius: ["40%", "70%"],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: "#fff",
        borderWidth: 2,
      },
      label: {
        show: true,
        formatter: "{b}: {c}",
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: "bold",
        },
      },
      data: statusData.value,
    },
  ],
}));

// 标签分布图表
const tagChart = computed(() => ({
  tooltip: {
    trigger: "item",
    formatter: (params: any) => {
      return `${params.name}<br/>任务数: ${params.value} (${params.percent}%)`;
    },
  },
  legend: {
    orient: "vertical",
    left: "left",
  },
  series: [
    {
      name: "标签分布",
      type: "pie",
      radius: ["40%", "70%"],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: "#fff",
        borderWidth: 2,
      },
      label: {
        show: true,
        formatter: "{b}: {c}",
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: "bold",
        },
      },
      data: tagData.value,
    },
  ],
}));

// 团队工作量对比图表（支持按周/月）
const workloadComparisonChart = computed(() => {
  // 获取所有用户和周数据
  const users = workloadComparisonData.value;
  const weeks = workloadWeeks.value;

  // 构建堆叠柱状图数据
  const seriesData = users.slice(0, 5).map((user) => ({
    name: user.nickname,
    type: "bar" as const,
    stack: "total",
    data: user.weeklyData.map((w) => w.completed),
    itemStyle: {
      borderRadius: [0, 0, 0, 0],
    },
  }));

  // 如果是按月视图，显示完成数的堆叠
  if (workloadViewMode.value === "month") {
    // 按月汇总
    const monthlyData: Record<string, number> = {};
    users.forEach((user) => {
      user.weeklyData.forEach((w, i) => {
        const month = weeks[i]?.split("/")[0] || "未知";
        if (!monthlyData[month]) monthlyData[month] = 0;
        monthlyData[month] += w.completed;
      });
    });

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      legend: {
        data: users.slice(0, 5).map((u) => u.nickname),
        bottom: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: Object.keys(monthlyData),
        axisLabel: { rotate: 30 },
      },
      yAxis: {
        type: "value",
        name: "完成任务数",
      },
      series: [
        {
          name: "完成任务数",
          type: "bar",
          data: Object.values(monthlyData),
          itemStyle: { color: "#409eff", borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: "top" },
        },
      ],
    };
  }

  // 按周视图
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    legend: {
      data: users.slice(0, 5).map((u) => u.nickname),
      bottom: 0,
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: weeks,
      axisLabel: { rotate: 30 },
    },
    yAxis: {
      type: "value",
      name: "完成任务数",
    },
    series: seriesData.length > 0 ? seriesData : [{
      name: "无数据",
      type: "bar" as const,
      data: [],
    }],
  };
});

// 获取统计数据
const fetchStats = async () => {
  try {
    const params: Record<string, any> = { range: timeRange.value };
    if (timeRange.value === "custom" && customDateRange.value) {
      params.startDate = customDateRange.value[0].toISOString().split("T")[0];
      params.endDate = customDateRange.value[1].toISOString().split("T")[0];
    }

    const res = await api.get("/tasks/stats/report", { params });

    if (res.code === 200) {
      const data = res.data;

      // 更新关键指标
      metrics.totalTasks = data.metrics.totalTasks;
      metrics.totalTasksTrend = data.metrics.totalTasksTrend;
      metrics.completionRate = data.metrics.completionRate;
      metrics.completionRateTrend = data.metrics.completionRateTrend;
      metrics.avgProcessingTime = data.metrics.avgProcessingTime;
      metrics.avgTimeTrend = data.metrics.avgTimeTrend;
      metrics.overdueRate = data.metrics.overdueRate;
      metrics.overdueRateTrend = data.metrics.overdueRateTrend;

      // 更新图表数据
      efficiencyData.value = data.charts.efficiencyTrend;
      workloadData.value = data.charts.workloadDistribution;
      priorityData.value = data.charts.priorityDistribution;
      statusData.value = data.charts.statusDistribution;
    }

    // 获取标签分布数据
    await fetchTagDistribution();

    // 获取工作量对比数据
    await fetchWorkloadComparison();
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    // 使用模拟数据
    initMockData();
  }
};

// 获取标签分布统计
const fetchTagDistribution = async () => {
  try {
    const params: Record<string, any> = { range: timeRange.value };
    if (timeRange.value === "custom" && customDateRange.value) {
      params.startDate = customDateRange.value[0].toISOString().split("T")[0];
      params.endDate = customDateRange.value[1].toISOString().split("T")[0];
    }

    const res = await getTagDistribution(params);
    if (res.code === 200) {
      tagData.value = res.data.tagDistribution.map((tag: any) => ({
        tagId: tag.tagId,
        tagName: tag.tagName,
        tagColor: tag.tagColor,
        total: tag.total,
        itemStyle: { color: tag.tagColor },
      }));
    }
  } catch (error) {
    console.error("Failed to fetch tag distribution:", error);
    // 使用模拟数据
    tagData.value = [
      { tagId: "1", tagName: "功能开发", tagColor: "#409eff", total: 45, itemStyle: { color: "#409eff" } },
      { tagId: "2", tagName: "Bug修复", tagColor: "#f56c6c", total: 23, itemStyle: { color: "#f56c6c" } },
      { tagId: "3", tagName: "文档编写", tagColor: "#67c23a", total: 15, itemStyle: { color: "#67c23a" } },
      { tagId: "4", tagName: "代码优化", tagColor: "#e6a23c", total: 20, itemStyle: { color: "#e6a23c" } },
      { tagId: "5", tagName: "测试验证", tagColor: "#909399", total: 25, itemStyle: { color: "#909399" } },
    ];
  }
};

// 获取工作量对比数据
const fetchWorkloadComparison = async () => {
  try {
    const params: Record<string, any> = { range: workloadViewMode.value };
    if (timeRange.value === "custom" && customDateRange.value) {
      params.startDate = customDateRange.value[0].toISOString().split("T")[0];
      params.endDate = customDateRange.value[1].toISOString().split("T")[0];
    }

    const res = await getWorkloadComparison(params);
    if (res.code === 200) {
      workloadComparisonData.value = res.data.users;
      workloadWeeks.value = res.data.weeks || [];
    }
  } catch (error) {
    console.error("Failed to fetch workload comparison:", error);
    // 使用模拟数据
    workloadWeeks.value = ["第1周", "第2周", "第3周", "第4周"];
    workloadComparisonData.value = [
      {
        userId: "1",
        nickname: "张三",
        weeklyData: [
          { week: "第1周", created: 5, completed: 3 },
          { week: "第2周", created: 7, completed: 5 },
          { week: "第3周", created: 4, completed: 4 },
          { week: "第4周", created: 6, completed: 5 },
        ],
      },
      {
        userId: "2",
        nickname: "李四",
        weeklyData: [
          { week: "第1周", created: 3, completed: 2 },
          { week: "第2周", created: 5, completed: 4 },
          { week: "第3周", created: 6, completed: 5 },
          { week: "第4周", created: 4, completed: 4 },
        ],
      },
      {
        userId: "3",
        nickname: "王五",
        weeklyData: [
          { week: "第1周", created: 6, completed: 4 },
          { week: "第2周", created: 8, completed: 6 },
          { week: "第3周", created: 5, completed: 5 },
          { week: "第4周", created: 7, completed: 6 },
        ],
      },
    ];
  }
};

// 初始化模拟数据（用于开发测试）
const initMockData = () => {
  metrics.totalTasks = 128;
  metrics.totalTasksTrend = 12.5;
  metrics.completionRate = 78.6;
  metrics.completionRateTrend = 5.2;
  metrics.avgProcessingTime = 24;
  metrics.avgTimeTrend = -8.3;
  metrics.overdueRate = 8.2;
  metrics.overdueRateTrend = -3.1;

  efficiencyData.value = Array.from({ length: 30 }, (_, i) => ({
    date: `03-${i + 1}`,
    count: Math.floor(Math.random() * 20) + 5,
    duration: Math.floor(Math.random() * 50) + 10,
  }));

  workloadData.value = [
    { name: "张三", value: 15 },
    { name: "李四", value: 12 },
    { name: "王五", value: 18 },
    { name: "赵六", value: 8 },
    { name: "钱七", value: 10 },
  ];

  priorityData.value = [
    { name: "紧急", value: 12, itemStyle: { color: "#f56c6c" } },
    { name: "高", value: 28, itemStyle: { color: "#e6a23c" } },
    { name: "中", value: 45, itemStyle: { color: "#409eff" } },
    { name: "低", value: 43, itemStyle: { color: "#909399" } },
  ];

  statusData.value = [
    { name: "已完成", value: 86, itemStyle: { color: "#67c23a" } },
    { name: "进行中", value: 25, itemStyle: { color: "#409eff" } },
    { name: "待处理", value: 12, itemStyle: { color: "#909399" } },
    { name: "已逾期", value: 5, itemStyle: { color: "#f56c6c" } },
  ];
};

// 时间范围变化
const handleTimeRangeChange = () => {
  if (timeRange.value !== "custom") {
    fetchStats();
  }
};

// 自定义日期变化
const handleCustomDateChange = () => {
  if (customDateRange.value) {
    fetchStats();
  }
};

// 工作量对比视图模式变化（按周/按月）
const handleWorkloadViewModeChange = () => {
  fetchWorkloadComparison();
};

// 刷新数据
const refreshData = () => {
  fetchStats();
};

onMounted(() => {
  fetchStats();
});
</script>

<style scoped>
.stats-report {
  padding: 0;
}

.filter-card {
  margin-bottom: 0;
}

.filter-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  height: 120px;
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
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}

.stat-trend {
  font-size: 12px;
  margin-top: 8px;
  font-weight: 500;
}

.stat-trend.up {
  color: #67c23a;
}

.stat-trend.down {
  color: #f56c6c;
}

.trend-text {
  color: #999;
  font-weight: normal;
  margin-left: 4px;
}
</style>
