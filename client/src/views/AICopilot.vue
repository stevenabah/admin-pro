<template>
  <div class="ai-copilot">
    <el-card class="chat-container">
      <template #header>
        <div class="header">
          <div class="header-left">
            <el-icon size="24"><ChatDotRound /></el-icon>
            <span>AI 智能助手</span>
          </div>
          <el-button size="small" @click="clearHistory">清空对话</el-button>
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
            <el-icon size="20"><Robot /></el-icon>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick } from "vue";
import { useUserStore, api } from "@/stores/user";
import { ElMessage } from "element-plus";
import { ChatDotRound, User, Service, Position } from "@element-plus/icons-vue";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

const userStore = useUserStore();
const messages = reactive<Message[]>([
  {
    role: "assistant",
    content:
      "您好！我是 AI 智能助手，可以帮助您管理后台系统。请告诉我您需要什么帮助？",
    timestamp: new Date(),
  },
]);
const inputMessage = ref("");
const loading = ref(false);
const messagesRef = ref<HTMLElement>();

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

const sendMessage = async () => {
  if (!inputMessage.value.trim() || loading.value) return;

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
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

    const res = await api.post("/ai/chat", {
      message: userMessage,
      history: history.slice(0, -1),
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
