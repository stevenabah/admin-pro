<template>
  <div class="nl-query">
    <el-card class="query-card">
      <template #header>
        <div class="header">
          <div class="header-left">
            <el-icon size="24"><DataAnalysis /></el-icon>
            <span>自然语言数据查询</span>
          </div>
          <el-tag type="info">NL2SQL</el-tag>
        </div>
      </template>

      <div class="query-section">
        <el-input
          v-model="question"
          placeholder="用自然语言描述您想查询的数据，例如：显示所有管理员用户的登录记录"
          size="large"
          clearable
        >
          <template #append>
            <el-button @click="executeQuery" :loading="loading">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
          </template>
        </el-input>

        <div class="examples">
          <span class="label">示例问题：</span>
          <el-tag @click="setQuestion('所有用户列表')">所有用户列表</el-tag>
          <el-tag @click="setQuestion('本月新增用户数量')"
            >本月新增用户数量</el-tag
          >
          <el-tag @click="setQuestion('登录次数最多的用户')"
            >登录次数最多的用户</el-tag
          >
          <el-tag @click="setQuestion('各角色的用户数量统计')"
            >各角色的用户数量统计</el-tag
          >
          <el-tag @click="setQuestion('最近一周的登录记录')"
            >最近一周的登录记录</el-tag
          >
        </div>
      </div>

      <div v-if="generatedSQL" class="sql-section">
        <div class="section-title">
          <el-icon><Document /></el-icon>
          <span>生成的 SQL</span>
          <el-tag size="small" type="success">自动生成</el-tag>
        </div>
        <el-input
          v-model="generatedSQL"
          type="textarea"
          :rows="4"
          readonly
          class="sql-display"
        />
      </div>

      <div v-if="error" class="error-section">
        <el-alert :title="error" type="error" show-icon :closable="false" />
      </div>

      <div v-if="results.length > 0" class="results-section">
        <div class="section-title">
          <el-icon><Grid /></el-icon>
          <span>查询结果</span>
          <el-tag size="small" type="info">{{ results.length }} 条记录</el-tag>
        </div>

        <el-table :data="results" stripe border max-height="400">
          <el-table-column
            v-for="col in columns"
            :key="col"
            :prop="col"
            :label="col"
            sortable
          />
        </el-table>

        <div
          class="chart-section"
          v-if="results.length > 0 && columns.length <= 3"
        >
          <el-button @click="generateChart" :loading="chartLoading">
            <el-icon><DataLine /></el-icon>
            生成图表
          </el-button>

          <div v-if="chartVisible" class="chart-container">
            <div ref="chartRef" class="echarts-container"></div>
          </div>
        </div>
      </div>

      <div
        v-if="!loading && !results.length && !error && !generatedSQL"
        class="empty-state"
      >
        <el-empty description="输入自然语言问题，获取数据查询结果">
          <template #image>
            <el-icon size="80" color="#909399"><ChatLineSquare /></el-icon>
          </template>
        </el-empty>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useUserStore, api } from "@/stores/user";
import { ElMessage } from "element-plus";
import {
  DataAnalysis,
  Search,
  Document,
  Grid,
  DataLine,
  ChatLineSquare,
} from "@element-plus/icons-vue";
import * as echarts from "echarts";

const userStore = useUserStore();
const question = ref("");
const generatedSQL = ref("");
const results = ref<any[]>([]);
const columns = ref<string[]>([]);
const loading = ref(false);
const chartLoading = ref(false);
const chartVisible = ref(false);
const error = ref("");
const chartRef = ref<HTMLElement>();

const setQuestion = (q: string) => {
  question.value = q;
};

const executeQuery = async () => {
  if (!question.value.trim()) {
    ElMessage.warning("请输入查询问题");
    return;
  }

  loading.value = true;
  error.value = "";
  generatedSQL.value = "";
  results.value = [];
  columns.value = [];
  chartVisible.value = false;

  try {
    const res = await api.post("/ai/nl2sql", {
      question: question.value,
    });

    if (res.code === 200) {
      generatedSQL.value = res.data.sql || "";
      results.value = res.data.results || [];
      columns.value = res.data.columns || [];

      if (results.value.length === 0) {
        ElMessage.info("查询结果为空");
      }
    } else {
      error.value = res.message || "查询失败";
    }
  } catch (err: any) {
    error.value = err.message || "网络错误，请稍后重试";
  } finally {
    loading.value = false;
  }
};

const generateChart = () => {
  if (!chartRef.value || results.value.length === 0) return;

  chartLoading.value = true;
  chartVisible.value = true;

  nextTick(() => {
    const chart = echarts.init(chartRef.value);
    const colNames = columns.value;

    if (colNames.length === 1) {
      const xData = results.value.map((r) => r[colNames[0]]);
      chart.setOption({
        title: { text: "数据分布", left: "center" },
        tooltip: {},
        xAxis: { type: "category", data: xData },
        yAxis: { type: "value" },
        series: [
          {
            type: "bar",
            data: results.value.map((r) => r[colNames[0]]),
            itemStyle: { color: "#409eff" },
          },
        ],
      });
    } else if (colNames.length === 2) {
      chart.setOption({
        title: { text: "数据分布", left: "center" },
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "category",
          data: results.value.map((r) => r[colNames[0]]),
        },
        yAxis: { type: "value" },
        series: [
          {
            name: colNames[1],
            type: "line",
            data: results.value.map((r) => r[colNames[1]]),
            itemStyle: { color: "#67c23a" },
          },
        ],
      });
    }

    chartLoading.value = false;
  });
};

import { nextTick } from "vue";
</script>

<style scoped>
.nl-query {
  padding: 20px;
}

.query-card {
  min-height: calc(100vh - 140px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.query-section {
  margin-bottom: 20px;
}

.examples {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.label {
  font-size: 13px;
  color: #909399;
}

.examples .el-tag {
  cursor: pointer;
}

.examples .el-tag:hover {
  opacity: 0.8;
}

.sql-section,
.results-section,
.error-section {
  margin-top: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

.sql-display :deep(.el-textarea__inner) {
  font-family: "Monaco", "Menlo", monospace;
  font-size: 13px;
  background: #f5f7fa;
}

.chart-section {
  margin-top: 20px;
}

.chart-container {
  margin-top: 16px;
}

.echarts-container {
  width: 100%;
  height: 350px;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}
</style>
