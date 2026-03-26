<template>
  <div class="login-container">
    <div id="particles-js" class="particles"></div>
    <el-card class="login-card">
      <template #header>
        <div class="card-header-content">
          <el-icon class="logo-icon"><Platform /></el-icon>
          <div>
            <h2>Admin-Pro</h2>
            <p class="subtitle">企业级后台管理系统</p>
          </div>
        </div>
        <div class="tab-switch">
          <el-radio-group v-model="activeTab" size="small">
            <el-radio-button value="login">登录</el-radio-button>
            <el-radio-button value="register">注册</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-form
        v-if="activeTab === 'login'"
        :model="loginForm"
        :rules="loginRules"
        ref="loginFormRef"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            style="width: 100%"
            :loading="loading"
            @click="handleLogin"
            >登录</el-button
          >
        </el-form-item>
      </el-form>

      <el-form
        v-else
        :model="registerForm"
        :rules="registerRules"
        ref="registerFormRef"
      >
        <el-form-item prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="请输入用户名"
            prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请确认密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item prop="nickname">
          <el-input
            v-model="registerForm.nickname"
            placeholder="请输入昵称（选填）"
            prefix-icon="UserFilled"
          />
        </el-form-item>
        <el-form-item prop="email">
          <el-input
            v-model="registerForm.email"
            placeholder="请输入邮箱（选填）"
            prefix-icon="Message"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            style="width: 100%"
            :loading="loading"
            @click="handleRegister"
            >注册</el-button
          >
        </el-form-item>
      </el-form>

      <div class="tips">默认账号: admin / admin123</div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore, api } from "@/stores/user";
import { ElMessage, FormInstance } from "element-plus";
import { Platform } from "@element-plus/icons-vue";

declare global {
  interface Window {
    particlesJS: any;
  }
}

const router = useRouter();
const userStore = useUserStore();
const activeTab = ref("login");
const loading = ref(false);
const loginFormRef = ref<FormInstance>();
const registerFormRef = ref<FormInstance>();

const loginForm = reactive({
  username: "",
  password: "",
});

const registerForm = reactive({
  username: "",
  password: "",
  confirmPassword: "",
  nickname: "",
  email: "",
});

const loginRules = {
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }],
};

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (value !== registerForm.password) {
    callback(new Error("两次输入的密码不一致"));
  } else {
    callback();
  }
};

const registerRules = {
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码至少6位", trigger: "blur" },
  ],
  confirmPassword: [
    { required: true, message: "请确认密码", trigger: "blur" },
    { validator: validateConfirmPassword, trigger: "blur" },
  ],
};

const handleLogin = async () => {
  await loginFormRef.value?.validate();
  loading.value = true;
  const success = await userStore.login(loginForm.username, loginForm.password);
  loading.value = false;
  if (success) {
    ElMessage.success("登录成功");
    router.push("/");
  } else {
    ElMessage.error("用户名或密码错误");
  }
};

const handleRegister = async () => {
  await registerFormRef.value?.validate();
  loading.value = true;
  try {
    const res = await api.post("/auth/register", {
      username: registerForm.username,
      password: registerForm.password,
      nickname: registerForm.nickname,
      email: registerForm.email,
    });
    if (res.code === 200) {
      ElMessage.success("注册成功，请登录");
      activeTab.value = "login";
      loginForm.username = registerForm.username;
      loginForm.password = "";
    } else {
      ElMessage.error(res.message || "注册失败");
    }
  } catch {
    ElMessage.error("注册失败，请稍后重试");
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (window.particlesJS) {
    window.particlesJS("particles-js", {
      particles: {
        number: {
          value: 80,
          density: {
            enable: true,
            value_area: 800,
          },
        },
        color: {
          value: "#409eff",
        },
        shape: {
          type: "circle",
          stroke: {
            width: 0,
            color: "#409eff",
          },
        },
        opacity: {
          value: 0.5,
          random: true,
          anim: {
            enable: true,
            speed: 1,
            opacity_min: 0.1,
            sync: false,
          },
        },
        size: {
          value: 3,
          random: true,
          anim: {
            enable: true,
            speed: 2,
            size_min: 1,
            sync: false,
          },
        },
        links: {
          enable: true,
          distance: 150,
          color: "#409eff",
          opacity: 0.4,
          width: 1,
        },
        move: {
          enable: true,
          speed: 1,
          direction: "none",
          random: true,
          straight: false,
          outModes: {
            default: "bounce",
          },
        },
      },
      interactivity: {
        detect_on: "canvas",
        events: {
          onhover: {
            enable: true,
            mode: "grab",
          },
          onclick: {
            enable: true,
            mode: "push",
          },
        },
        modes: {
          grab: {
            distance: 140,
            links: {
              opacity: 0.8,
            },
          },
          push: {
            quantity: 4,
          },
        },
      },
      retina_detect: true,
    });
  }
});
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f0f23 100%);
  position: relative;
  overflow: hidden;
}

.particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background: transparent;
}

.login-card {
  width: 420px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(64, 158, 255, 0.3);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  position: relative;
  z-index: 10;
}

.login-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
  border: none;
  padding: 28px 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-card :deep(.el-card__body) {
  padding: 24px 28px 20px;
}

.card-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-header-content .logo-icon {
  font-size: 32px;
  color: #fff;
}

.card-header-content h2 {
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 1px;
  margin: 0;
  text-align: left;
}

.card-header-content .subtitle {
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  margin: 2px 0 0 0;
  text-align: left;
}

.tab-switch {
  display: flex;
  justify-content: center;
}

.tab-switch :deep(.el-radio-button__inner) {
  border-radius: 4px !important;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  box-shadow: none;
}

.tab-switch
  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: rgba(255, 255, 255, 0.95);
  color: #409eff;
  box-shadow: none;
}

.login-card :deep(.el-form-item) {
  margin-bottom: 18px;
}

.login-card :deep(.el-input__wrapper) {
  border-radius: 6px;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  transition: all 0.2s;
}

.login-card :deep(.el-input__wrapper:hover),
.login-card :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff inset;
}

.login-card :deep(.el-button--primary) {
  border-radius: 6px;
  height: 40px;
  font-size: 15px;
  letter-spacing: 2px;
  margin-top: 4px;
}

.tips {
  text-align: center;
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}
</style>
