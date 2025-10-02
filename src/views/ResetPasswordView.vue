<script setup lang="ts">
import { reactive, ref, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import api from "../api/request.ts";
import { ElMessageBox, ElMessage } from "element-plus";
import { sha256 } from 'js-sha256';

const router = useRouter();
const form = reactive({ email: "", code: "", password: "", confirmPassword: "" });
const loading = ref(false);
const countdown = ref(0);
let countdownTimer: number | null = null;

const startCountdown = (sec = 60) => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  countdown.value = sec;
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      countdown.value = 0;
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }
  }, 1000);
};

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});

const checkEmail = () => {
  if(form.email === "" || !form.email.includes("@")){
    ElMessage.warning("请输入正确的邮箱地址");
    return false;
  }
  return true;
};

const sendEmail = async () => {
  if (countdown.value > 0) return;
  if (!checkEmail()) return;
  try {
    const response = await api.get("/auth/sendCode",{
       params: {
        email: form.email
      }
    });
    if(response.data.code === 1){
      ElMessage.success("验证码已发送");
      startCountdown(60);
    }else {
      ElMessage.error(response.data.msg || "验证码发送失败，请稍后重试。");
    }
  }catch (err: any){
    ElMessage.error(err.response?.data?.msg || "验证码发送失败，请稍后重试。");
  }
}

const validate = () => {
  if (form.password !== form.confirmPassword) {
    ElMessage.warning("两次输入的密码不一致");
    form.password="";
    form.confirmPassword="";
    return false;
  }
  if (form.password.length < 8) {
    ElMessage.warning("密码长度至少为8位");
    return false;
  }
  return true;
};

const handleSubmit = async () => {
  if (!validate()) return;
  loading.value = true;
  try {
    const encryptedPassword = sha256(form.password);
    const response = await api.post("/auth/findPassword", {
      email: form.email,
      password: encryptedPassword,
      code: form.code
    });
    if(response.data.code === 1){
      loading.value = false;
      await ElMessageBox.alert("密码重置成功，请使用新密码登录。", '提示', {
        confirmButtonText: '确定',
        type: 'success',
      });
      router.push("/login");
    }else {
      loading.value = false;
      await ElMessageBox.alert(response.data.msg || "重置失败，请稍后重试。", '提示', {
        confirmButtonText: '确定',
        type: 'error',
      });
    }
  }catch (err: any) {
    loading.value = false;
    await ElMessageBox.alert(err.response?.data?.msg || "重置失败，请稍后重试。", '提示', {
      confirmButtonText: '确定',
      type: 'error'
    });
  }
};
</script>

<template>
  <div class="auth-page">
    <div class="welcome-panel">
      <div class="badge">心屿 · 账户安全</div>
      <h1>忘记密码了？</h1>
      <p>别担心。按照下面 3 步即可安全重设你的登录密码，继续你的情绪照护之旅。</p>
      <ul>
        <li><strong>1.</strong> 输入注册邮箱并获取验证码。</li>
        <li><strong>2.</strong> 输入邮件中的 4 位/6 位验证码。</li>
        <li><strong>3.</strong> 设置一个全新的、更安全的密码。</li>
      </ul>
      <p class="note">建议密码包含大小写字母、数字与符号的组合，避免与其它站点相同。</p>
    </div>

    <form class="auth-card" @submit.prevent="handleSubmit">
      <h2>重置密码</h2>
      <p class="subtitle">验证邮箱后即可设置新密码。</p>

      <label>
        邮箱
        <input v-model="form.email" type="email" required placeholder="student@example.edu.cn" />
      </label>

      <label>
        验证码
        <span class="verify-row">
          <input class="verify_code" v-model="form.code" type="text" required placeholder="验证码" />
          <button type="button" :disabled="countdown > 0" @click="sendEmail" class="secondary-btn">
            {{ countdown > 0 ? countdown + 's后重新发送' : '获取验证码' }}
          </button>
        </span>
      </label>

      <label>
        新密码
        <input v-model="form.password" type="password" required minlength="8" placeholder="至少 8 位，含字母数字" />
      </label>

      <label>
        确认新密码
        <input v-model="form.confirmPassword" type="password" required minlength="8" placeholder="再次输入新密码" />
      </label>

      <button type="submit" :disabled="loading" class="primary-btn">{{ loading ? '重置中…' : '确认重置' }}</button>

      <p class="switch-text">
        已想起密码？
        <RouterLink to="/login">返回登录</RouterLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  background: radial-gradient(circle at top left, rgba(129, 172, 255, 0.35), transparent 65%),
    linear-gradient(145deg, #f4f8ff 0%, #fef7ff 100%);
  padding: 0 8vw;
  gap: 4rem;
}

.welcome-panel {
  color: #253257;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  background: rgba(94, 130, 255, 0.16);
  color: #4361ee;
  font-weight: 600;
  font-size: 0.9rem;
}

.welcome-panel h1 {
  font-size: 2.2rem;
  margin: 0 0 0.25rem;
  font-weight: 700;
}

.welcome-panel p {
  font-size: 1rem;
  line-height: 1.55;
  color: rgba(37, 50, 87, 0.82);
  margin: 0;
}

.welcome-panel ul {
  margin: 0.5rem 0 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.45rem;
  color: rgba(37, 50, 87, 0.86);
  font-size: 0.95rem;
}

.note {
  font-size: 0.85rem;
  color: #5a6c95;
  margin-top: 0.75rem;
  background: rgba(255,255,255,0.55);
  padding: 0.6rem 0.8rem;
  border-left: 3px solid #5d82ff;
  border-radius: 8px;
}

.auth-card {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 24px;
  padding: 2.75rem 3rem;
  box-shadow: 0 24px 48px rgba(85, 112, 171, 0.18);
  backdrop-filter: blur(12px);
  display: grid;
  gap: 1.15rem;
  color: #1e2a47;
  max-width: 420px;
}

.auth-card h2 { margin: 0; font-size: 1.9rem; }
.subtitle { margin: 0; color: #61729d; font-size: 0.95rem; }

label { display: grid; gap: 0.45rem; font-weight: 600; color: #2a3658; }

input {
  padding: 0.75rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(93, 130, 255, 0.22);
  background: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
input:focus { outline: none; border-color: rgba(93,130,255,0.6); box-shadow: 0 0 0 4px rgba(93,130,255,0.18); }

.verify-row { display: flex; gap: 1rem; width: 100%; }
.verify_code { flex: 1; }

.primary-btn, .secondary-btn {
  border: none;
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  color: #fff;
  font-size: 1.05rem;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.3s;
  white-space: nowrap;
}
.secondary-btn { font-size: 0.9rem; padding: 0.75rem 0.9rem; }
.primary-btn:hover:not(:disabled), .secondary-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 24px rgba(93,130,255,0.25); }
.primary-btn:disabled, .secondary-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.switch-text { text-align: center; color: #61729d; font-size: 0.95rem; margin: 0; }
.switch-text a { color: #4d6bff; font-weight: 600; text-decoration: none; }
.switch-text a:hover { text-decoration: underline; }

@media (max-width: 1024px) {
  .auth-page { grid-template-columns: 1fr; padding: 10vh 10vw; }
  .welcome-panel { display: none; }
  .auth-card { justify-self: center; }
}

@media (max-width: 560px) {
  .auth-page { padding: 8vh 6vw; }
  .auth-card { padding: 2.25rem 2rem; }
}
</style>