<template>
  <div class="ai-copilot">
    <el-card class="chat-container">
      <template #header>
        <div class="header">
          <div class="header-left">
            <el-icon size="24"><ChatDotRound /></el-icon>
            <span>AI 智能助手</span>
          </div>
          <div class="header-right">
            <el-button size="small" @click="showSettings = true">
              <el-icon><Setting /></el-icon>
              API 设置
            </el-button>
            <el-button size="small" @click="clearHistory">
              <el-icon><Delete /></el-icon>
              清空对话
            </el-button>
          </div>
        </div>
      </template>

      <div class="chat-messages" ref="messagesRef">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="['message', msg.role]"
        >
          <div class="avatar">
            <el-icon v-if="msg.role === 'user'" size="20"><User /></el-icon>
            <el-icon v-else size="20"><Service /></el-icon>
          </div>
          <div class="content">
            <div class="message-content">{{ msg.content }}</div>
            <div class="time" v-if="msg.timestamp">
              {{ formatTime(msg.timestamp) }}
            </div>
          </div>
        </div>
        <div v-if="loading" class="message assistant loading">
          <div class="avatar">
            <el-icon size="20"><Service /></el-icon>
          </div>
          <div class="content">
            <div class="message-content">
              <span class="loading-text">思考中...</span>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <el-input
          v-model="inputMessage"
          placeholder="输入您的问题，AI 将为您解答..."
          @keyup.enter="sendMessage"
          :disabled="loading"
        >
          <template #append>
            <el-button
              @click="sendMessage"
              :disabled="loading || !inputMessage"
            >
              <el-icon><Position /></el-icon>
            </el-button>
          </template>
        </el-input>
        <div class="tips">
          <span>示例：</span>
          <el-tag size="small" @click="askExample('显示所有用户列表')">
            显示所有用户列表
          </el-tag>
          <el-tag size="small" @click="askExample('本月新增了多少用户？')">
            本月新增了多少用户？
          </el-tag>
          <el-tag size="small" @click="askExample('生成用户统计报表')">
            生成用户统计报表
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- API 设置对话框 -->
    <el-dialog v-model="showSettings" title="AI API 设置" width="550px">
      <el-form :model="apiSettings" label-width="100px">
        <el-form-item label="API Provider">
          <el-select v-model="apiSettings.provider" @change="onProviderChange">
            <el-option label="MiniMax (海螺)" value="minimax" />
            <el-option label="智谱 AI (GLM-4)" value="zhipu" />
            <el-option label="OpenAI (GPT-4)" value="openai" />
            <el-option label="Claude (Anthropic)" value="claude" />
            <el-option label="硅基流动" value="siliconflow" />
            <el-option label="自定义 (OpenAI 兼容)" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="Base URL">
          <el-input
            v-model="apiSettings.baseUrl"
            placeholder="https://api.example.com/v1/chat/completions"
          />
        </el-form-item>
        <el-form-item label="API Key">
          <el-input
            v-model="apiSettings.apiKey"
            type="password"
            show-password
            placeholder="输入您的 API Key"
          />
        </el-form-item>
        <el-form-item label="模型名称">
          <el-input
            v-model="apiSettings.model"
            placeholder="如: glm-4, gpt-4, claude-3-sonnet-20240229"
          />
        </el-form-item>
        <el-alert
          v-if="apiSettings.provider === 'claude'"
          type="info"
          :closable="false"
          show-icon
        >
          <template #title>
            Claude API 请使用 https://api.anthropic.com/v1/messages 作为 Base
            URL
          </template>
        </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="showSettings = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存设置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted, watch } from "vue";
import { useUserStore, api } from "@/stores/user";
import { ElMessage } from "element-plus";
import {
  ChatDotRound,
  User,
  Service,
  Position,
  Setting,
  Delete,
} from "@element-plus/icons-vue";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface ApiSettings {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

// Provider 默认配置
const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  minimax: {
    baseUrl: "https://api.minimax.chat/v1",
    model: "MiniMax-Text-01",
  },
  zhipu: {
    baseUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model: "glm-4",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4",
  },
  claude: {
    baseUrl: "https://api.anthropic.com/v1/messages",
    model: "claude-3-sonnet-20240229",
  },
  siliconflow: {
    baseUrl: "https://api.siliconflow.cn/v1/chat/completions",
    model: "Qwen/Qwen2.5-7B-Instruct",
  },
  custom: {
    baseUrl: "",
    model: "",
  },
};

const userStore = useUserStore();
const messages = reactive<Message[]>([
  {
    role: "assistant",
    content:
      "您好！我是 AI 智能助手，可以帮助您管理后台系统。请先在右上角设置您的 AI API 配置，然后开始对话。",
    timestamp: new Date(),
  },
]);
const inputMessage = ref("");
const loading = ref(false);
const messagesRef = ref<HTMLElement>();
const showSettings = ref(false);

const defaultSettings: ApiSettings = {
  provider: "minimax",
  baseUrl: PROVIDER_DEFAULTS.minimax.baseUrl,
  apiKey: "",
  model: PROVIDER_DEFAULTS.minimax.model,
};

const apiSettings = reactive<ApiSettings>({ ...defaultSettings });

// 当 Provider 变化时，自动填充 baseUrl 和 model
const onProviderChange = (provider: string) => {
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.custom;
  apiSettings.baseUrl = defaults.baseUrl;
  apiSettings.model = defaults.model;
};

// 加载保存的设置
onMounted(() => {
  const saved = localStorage.getItem("ai_api_settings");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(apiSettings, parsed);
    } catch {
      // ignore
    }
  }
});

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
    }
  });
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const saveSettings = () => {
  localStorage.setItem("ai_api_settings", JSON.stringify(apiSettings));
  showSettings.value = false;
  ElMessage.success("API 设置已保存");
};

const sendMessage = async () => {
  if (!inputMessage.value.trim() || loading.value) return;

  // 检查是否配置了 API
  if (!apiSettings.apiKey) {
    ElMessage.warning("请先配置 AI API Key");
    showSettings.value = true;
    return;
  }

  const userMessage = inputMessage.value.trim();
  inputMessage.value = "";

  messages.push({
    role: "user",
    content: userMessage,
    timestamp: new Date(),
  });
  scrollToBottom();

  loading.value = true;

  try {
    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(0, -1)
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

    const res = await api.post("/ai/chat", {
      message: userMessage,
      history,
      provider: apiSettings.provider,
      baseUrl: apiSettings.baseUrl,
      apiKey: apiSettings.apiKey,
      model: apiSettings.model,
    });

    if (res.code === 200) {
      messages.push({
        role: "assistant",
        content: res.data.reply,
        timestamp: new Date(),
      });
    } else {
      messages.push({
        role: "assistant",
        content: "抱歉，发生了错误：" + (res.message || "未知错误"),
        timestamp: new Date(),
      });
    }
  } catch (error: any) {
    messages.push({
      role: "assistant",
      content: "抱歉，连接失败了：" + (error.message || "网络错误"),
      timestamp: new Date(),
    });
  } finally {
    loading.value = false;
    scrollToBottom();
  }
};

const askExample = (question: string) => {
  inputMessage.value = question;
  sendMessage();
};

const clearHistory = () => {
  messages.splice(0, messages.length);
  messages.push({
    role: "assistant",
    content: "对话已清空，请开始新的对话。",
    timestamp: new Date(),
  });
};
</script>

<style scoped>
.ai-copilot {
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-container :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
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

.header-right {
  display: flex;
  gap: 8px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 80%;
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.assistant {
  align-self: flex-start;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message.user .avatar {
  background: #409eff;
  color: #fff;
}

.message.assistant .avatar {
  background: #67c23a;
  color: #fff;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message.user .content {
  align-items: flex-end;
}

.message-content {
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.5;
  word-break: break-word;
}

.message.user .message-content {
  background: #409eff;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-content {
  background: #f0f0f0;
  color: #333;
  border-bottom-left-radius: 4px;
}

.loading-text {
  color: #909399;
  font-style: italic;
}

.time {
  font-size: 11px;
  color: #909399;
}

.chat-input {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  background: #fff;
}

.tips {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.tips span {
  font-size: 12px;
  color: #909399;
}

.tips .el-tag {
  cursor: pointer;
}

.tips .el-tag:hover {
  opacity: 0.8;
}
</style>
