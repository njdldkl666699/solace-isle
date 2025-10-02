<script setup lang="ts">
import { reactive, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAppStore } from "../stores/appStore";
import api from "../api/request.ts";
import { ElMessageBox } from "element-plus";
import { sha256 } from 'js-sha256';

const router = useRouter();
const appStore = useAppStore();

const form = reactive({ account: "", password: "" });
const loading = ref(false);

// 动态问候
const greeting = ref('');

const calcGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return '早安';
  if (h >= 11 && h < 14) return '午安';
  if (h >= 14 && h < 18) return '下午好';
  if (h >= 18 && h < 22) return '晚上好';
  return '晚安';
};

const updateGreeting = () => {
  greeting.value = calcGreeting();
};

onMounted(() => {
  updateGreeting();
});

const handleSubmit = async () => {
  loading.value = true;
  try{
    const encryptedPassword = sha256(form.password);
    const response = await api.post("/auth/login", {
      account: form.account,
      password: encryptedPassword
    });

    if(response.data.code === 1){
      loading.value = false;
      appStore.authenticate(response.data.data);
      await router.push("/dashboard");
    }
    else{
      loading.value = false;
      console.log(response.data.msg || "登录失败，请稍后重试。")
      await ElMessageBox.alert(response.data.msg || "登录失败，请稍后重试。", '提示', {
        confirmButtonText: '确定',
        type: 'error',
      });
    }
  } catch (err: any) {
    loading.value = false;
    await ElMessageBox.alert(err.response?.data?.msg || "登录失败，请稍后重试。", '提示', {
      confirmButtonText: '确定',
      type: 'error'
    });
  }
};
</script>

<template>
  <div class="auth-page">
    <div class="welcome-panel">
      <div class="badge">心屿 · AI心理伙伴</div>
      <h1>{{ greeting }}，欢迎靠岸。</h1>
      <p>我们始终为你留下一盏柔和的灯光，在这里练习表达与自我照顾。</p>
      <ul>
        <li>智能情绪日记，帮你看见细腻波动。</li>
        <li>AI心理伙伴 24 小时陪伴。</li>
        <li>场景化 CBT 训练，练习新的思考路径。</li>
      </ul>
    </div>

    <form class="auth-card" @submit.prevent="handleSubmit">
      <h2>登录心屿</h2>
      <p class="subtitle">使用学号邮箱即可进入你的专属心理空间。</p>
      <label>
        学号 / 邮箱
        <input v-model="form.account" required placeholder="student@example.edu.cn" />
      </label>
      <label>
        密码
        <input v-model="form.password" type="password" required placeholder="至少 8 位，含字母数字" />
      </label>
      <button class="load_btn" type="submit" :disabled="loading">{{ loading ? "正在登录…" : "立即登录" }}</button>
      <p class="switch-text">
        还没有账号？
        <RouterLink to="/register">立即注册</RouterLink>
      </p>
      <p class="switch-text">
        忘记密码？
        <RouterLink to="/resetPassword">找回密码</RouterLink>
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
  max-width: 420px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  background: rgba(94, 130, 255, 0.16);
  color: #4361ee;
  font-weight: 600;
  margin-bottom: 1.25rem;
}

.welcome-panel h1 {
  font-size: 2.45rem;
  margin-bottom: 1rem;
  font-weight: 700;
}

.welcome-panel p {
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(37, 50, 87, 0.82);
}

.welcome-panel ul {
  margin-top: 1.5rem;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.6rem;
  color: rgba(37, 50, 87, 0.8);
}

.auth-card {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 24px;
  padding: 2.75rem 3rem;
  box-shadow: 0 24px 48px rgba(85, 112, 171, 0.18);
  backdrop-filter: blur(12px);
  display: grid;
  gap: 1.25rem;
  color: #1e2a47;
  max-width: 420px;
}

.auth-card h2 {
  margin: 0;
  font-size: 1.9rem;
}

.subtitle {
  margin: 0;
  color: #61729d;
  font-size: 0.95rem;
}

label {
  display: grid;
  gap: 0.4rem;
  font-weight: 600;
  color: #2a3658;
}

input {
  padding: 0.75rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(93, 130, 255, 0.22);
  background: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus {
  outline: none;
  border-color: rgba(93, 130, 255, 0.6);
  box-shadow: 0 0 0 4px rgba(93, 130, 255, 0.18);
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

.load_btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(93, 130, 255, 0.25);
}

.load_btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-text {
  text-align: center;
  color: #61729d;
  font-size: 0.95rem;
  margin:0;
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

@media (max-width: 1024px) {
  .auth-page {
    grid-template-columns: 1fr;
    padding: 12vh 12vw;
  }

  .welcome-panel {
    display: none;
  }

  .auth-card {
    justify-self: center;
  }
}

@media (max-width: 520px) {
  .auth-page {
    padding: 8vh 6vw;
  }

  .auth-card {
    padding: 2.25rem 2rem;
  }
}
</style>
