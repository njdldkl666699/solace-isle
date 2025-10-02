<script setup lang="ts">
import { reactive, ref, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import api from "../api/request.ts";
import { ElMessageBox, ElMessage } from "element-plus";
import { sha256 } from 'js-sha256';

const router = useRouter();

const form = reactive({ studentId: "", email: "", code: "", nickname: "", password: "", confirmPassword: "" });
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
  return true;
};

const handleSubmit = async () => {
  if (!validate()) return;
  loading.value = true;

  try {
    const encryptedPassword = sha256(form.password);
    const response = await api.post("/auth/register", {
      studentId: form.studentId,
      email: form.email,
      nickname: form.nickname,
      password: encryptedPassword,
      code: form.code
    })

    if(response.data.code === 1){
      loading.value = false;
      router.push("/login");
    }else {
      loading.value = false;
      await ElMessageBox.alert(response.data.msg || "注册失败，请稍后重试。", '提示', {
        confirmButtonText: '确定',
        type: 'error',
      });
    }
  }catch (err: any) {
    loading.value = false;
    await ElMessageBox.alert(err.response?.data?.msg || "注册失败，请稍后重试。", '提示', {
      confirmButtonText: '确定',
      type: 'error'
    });
  }
};
</script>

<template>
  <div class="auth-page">
    <form class="auth-card" @submit.prevent="handleSubmit">
      <div class="badge">创建账号</div>
      <h2 style="color:#4f7bea">欢迎加入心屿</h2>
      <p class="subtitle">几步完成注册，开启你的温柔心理伙伴之旅。</p>

      <label>
        学号
        <input v-model="form.studentId" type="text" required placeholder="1234567" />
      </label>

      <label>
        邮箱
        <input v-model="form.email" type="email" required placeholder="student@example.edu.cn" />
      </label>

      <label>
        验证码
        <span class="verify-row">
          <input class="verify_code" v-model="form.code" type="text" required placeholder="验证码" />
          <button type="button" :disabled="countdown > 0" @click="sendEmail">
            {{ countdown > 0 ? countdown + 's后重新发送' : '获取验证码' }}
          </button>
        </span>
      </label>

      <label>
        昵称
        <input v-model="form.nickname" required placeholder="给自己取一个昵称" />
      </label>

      <label>
        密码
        <input v-model="form.password" type="password" required minlength="8" placeholder="至少 8 位，含字母数字" />
      </label>

      <label>
        确认密码
        <input v-model="form.confirmPassword" type="password" required minlength="8" placeholder="再输入一次" />
      </label>

      <button type="submit" :disabled="loading">{{ loading ? "创建中…" : "完成注册" }}</button>

      <p class="switch-text">
        已有账号？
        <RouterLink to="/login">立即登录</RouterLink>
      </p>
    </form>

    <div class="preview-panel">
      <h3>注册后你将获得</h3>
      <ul>
        <li>
          <span>🌤️</span>
          <div>
            <p class="title">情绪日记 2.0</p>
            <p class="desc">随时记录情绪、上传图片，AI 帮你整理情绪关键词。</p>
          </div>
        </li>
        <li>
          <span>🤖</span>
          <div>
            <p class="title">24h AI 心理伙伴</p>
            <p class="desc">温柔对话、共情回应，必要时提醒你寻求专业帮助。</p>
          </div>
        </li>
        <li>
          <span>🎮</span>
          <div>
            <p class="title">CBT 训练舱</p>
            <p class="desc">把认知行为疗法做成互动游戏，练习识别和转化想法。</p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 480px) minmax(0, 480px);
  justify-content: center;
  align-items: center;
  gap: 3rem;
  padding: 8vh 6vw;
  background: linear-gradient(120deg, #f4f7ff 0%, #fbf1ff 100%);
}

.auth-card {
  background: rgba(255, 255, 255, 0.88);
  border-radius: 24px;
  padding: 2.75rem 3rem;
  box-shadow: 0 24px 48px rgba(119, 138, 190, 0.16);
  backdrop-filter: blur(12px);
  display: grid;
  gap: 1.1rem;
  color: #1f2943;
}

.badge {
  align-self: flex-start;
  justify-self: center;
  background: rgba(201, 210, 241, 0.16);
  color: #3a3b4c;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 1.5rem;
}

.auth-card h2 {
  margin: 0;
  font-size: 1.9rem;
}

.subtitle {
  margin: 0;
  color: #60719c;
  font-size: 0.95rem;
}

label {
  display: grid;
  gap: 0.4rem;
  font-weight: 600;
  color: #2f3a60;
}

input {
  padding: 0.75rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(93, 130, 255, 0.22);
  background: rgba(255, 255, 255, 0.95);
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus {
  outline: none;
  border-color: rgba(93, 130, 255, 0.6);
  box-shadow: 0 0 0 4px rgba(93, 130, 255, 0.18);
}

.verify-row {
  display: flex;
  gap: 3rem;
  width: 100%;
}

.verify_code{
  flex:1;
  width:60%;
}

button {
  border: none;
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  color: #fff;
  font-size: 1.05rem;
  padding: 0.85rem;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(93, 130, 255, 0.25);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-text {
  margin: 0;
  text-align: center;
  color: #60719c;
  font-size: 0.95rem;
}

.switch-text a {
  color: #4d6bff;
  font-weight: 600;
  text-decoration: none;
}

.switch-text a:hover {
  text-decoration: underline;
}

.error {
  color: #d6455f;
  margin: 0;
  font-size: 0.9rem;
}

.preview-panel {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 24px;
  padding: 2.5rem 2.75rem;
  box-shadow: inset 0 0 0 1px rgba(109, 128, 187, 0.12);
  color: #29365b;
}

.preview-panel h3 {
  margin-top: 0;
  font-size: 1.3rem;
}

.preview-panel ul {
  list-style: none;
  padding: 0;
  margin: 1.5rem 0 0;
  display: grid;
  gap: 1.2rem;
}

.preview-panel li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  align-items: flex-start;
}

.preview-panel span {
  font-size: 1.5rem;
}

.preview-panel .title {
  font-weight: 600;
  margin: 0 0 0.3rem;
}

.preview-panel .desc {
  margin: 0;
  color: #56628a;
  font-size: 0.92rem;
  line-height: 1.45;
}

@media (max-width: 1024px) {
  .auth-page {
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem;
  }

  .preview-panel {
    order: -1;
  }
}

@media (max-width: 560px) {
  .auth-card {
    padding: 2.25rem 2rem;
  }

  .preview-panel {
    padding: 2rem;
  }
}
</style>
