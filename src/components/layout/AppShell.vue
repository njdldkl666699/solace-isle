<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from "vue";
import { useRoute, useRouter } from "vue-router";
import {type Achievement, useAppStore, type WSMessage} from "../../stores/appStore";
import api from "../../api/request.ts";
import { ElMessage, ElNotification } from "element-plus";

const props = defineProps<{ pageTitle?: string; subtitle?: string; showBack?: boolean }>();

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();

const navLinks = computed(() => [
  { label: "我的主页", path: "/dashboard" },
  { label: "心灵日记本", path: "/diary" },
  { label: "AI伙伴", path: "/chat" },
  { label: "CBT训练舱", path: "/cbt" },
  { label: "心灵树洞", path: "/treehole" },
  { label: "个人中心", path: "/profile" },
]);

const isActive = (path: string) => route.path.startsWith(path);

const handleBack = () => {
  if (props.showBack) {
    router.back();
  }
};

const toProfile = () => {
  router.push("/profile")
}

async function getUserInfo() {
  try {
    const response = await api.get("/user/profile");

    if(response.data.code === 1){
      appStore.updateUser(response.data.data);
    }else {
      ElMessage.error("无法获取用户信息" + (response.data.msg ? `：${response.data.msg}` : ""));
    }
  }catch (err: any){
    ElMessage.error("无法获取用户信息，请检查网络连接");
  }
}

const isConnected = ref(false);
let ws: WebSocket | null = null;

//预加载提醒音效
const remindAudio = new Audio(new URL("../../assets/sounds/remind.mp3", import.meta.url).href);
remindAudio.preload = "auto";

//统一通知函数
function showWSNotify(title: string, message: string) {
  ElNotification({
    title,
    message,
    position: "bottom-right",
    duration: 5000,
    customClass: "ws-notify"
  });
  // 播放音效（失败不阻断）
  remindAudio.currentTime = 0;
  remindAudio.play().catch(() => {});
}

const connectWebSocket = () => {
  const WS_URL = import.meta.env.VITE_WS_URL + `/${appStore.user.studentId}`;
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    isConnected.value = true;
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data) as WSMessage;
    if(message.type == "remind") {
      console.log("Received remind message:", message.content);
      appStore.dashboardSummary.quickReminders.unshift(message.content as string);
      showWSNotify("📢轻声提醒", message.content as string);
    }else if(message.type == "achievement") {
      appStore.dashboardSummary.Achievements.find(
          item => item.name === (message.content as Achievement).name
      )!.achievedAt = (message.content as Achievement).achievedAt;
      showWSNotify((message.content as Achievement).icon
          + "恭喜您达成新成就："
          + (message.content as Achievement).name,
          (message.content as Achievement).description);
    }else {
      console.log("Unknown message type:", message);
    }
  };

  ws.onclose = () => {
    isConnected.value = false;
    console.log('WebSocket disconnected');
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
};

onUnmounted(() => {
  if (ws) {
    ws.close();
  }
});

async function initialize() {
  await getUserInfo();
  await connectWebSocket();
}

function checkJWT() {
  const token = appStore.token as string;
  if (!token) {
    ElMessage.error("登录状态已过期，请重新登录");
    appStore.logout();
    return;
  }

  const JWTsplit = token.split('.') as string[];

  if(JWTsplit.length !== 3) {
    ElMessage.error("登录状态已过期，请重新登录");
    appStore.logout();
    return;
  }

  try {
    const payload = JSON.parse(atob(JWTsplit[1] as string));
    if (!payload.id || payload.id !== appStore.user.studentId) {
      ElMessage.error("登录状态已过期，请重新登录");
      appStore.logout();
      return;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp < currentTime) {
      ElMessage.error("登录状态已过期，请重新登录");
      appStore.logout();
      return;
    }
  } catch (error) {
    ElMessage.error("登录状态已过期，请重新登录");
    appStore.logout();
    return;
  }

}

onMounted(() => {
  checkJWT();
  initialize();
});
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <div class="app-shell__branding" role="banner">
        <div class="logo-circle">心屿</div>
        <div>
          <h1>心屿 · AI心理伙伴</h1>
          <p>在专属于你的岛屿，练习温柔与勇气。</p>
        </div>
      </div>
      <nav class="app-shell__nav" aria-label="页面导航">
        <RouterLink
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          class="nav-link"
          :class="{ active: isActive(link.path) }"
        >
          {{ link.label }}
        </RouterLink>
      </nav>
      <div class="app-shell__user" @click="toProfile">
        <div class="user-card">
          <img :src="appStore.user.avatar" alt="用户头像" class="avatar" />
          <div>
            <p class="nickname">{{ appStore.user.nickname }}</p>
            <!-- 使用 Tooltip：仅当字数 > 6 时显示截断 + 悬浮弹窗完整文本 -->
            <el-tooltip
              v-if="appStore.user.motto && appStore.user.motto.length > 6"
              :content="appStore.user.motto"
              placement="bottom"
              :show-after="120"
              effect="light"
              hide-after="0"
            >
              <p class="motto is-truncated">{{ appStore.user.motto.slice(0, 6) }}…</p>
            </el-tooltip>
            <p v-else class="motto">{{ appStore.user.motto }}</p>
          </div>
        </div>
      </div>
    </header>

    <main class="app-shell__main">
      <header v-if="pageTitle || subtitle || showBack" class="page-heading">
        <button v-if="showBack" class="ghost-btn" type="button" @click="handleBack">← 返回</button>
        <div>
          <h2 v-if="pageTitle">{{ pageTitle }}</h2>
          <p v-if="subtitle">{{ subtitle }}</p>
        </div>
      </header>
      <section class="page-content">
        <slot />
      </section>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at top, rgba(197, 242, 255, 0.5), transparent 55%),
    linear-gradient(180deg, #f6f9ff 0%, #edf2ff 35%, #fef6ff 100%);
  color: #1b2733;
}

.app-shell__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 2rem;
  padding: 1.5rem 3vw;
}

.app-shell__branding {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-circle {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(135deg, #5f8bff, #93b6ff);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  letter-spacing: 0.2em;
}

.app-shell__branding h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.app-shell__branding p {
  margin: 0;
  font-size: 0.9rem;
  color: #51607a;
}

.app-shell__nav {
  display: flex;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 999px;
  padding: 0.25rem;
  box-shadow: 0 8px 24px rgba(83, 113, 170, 0.12);
  backdrop-filter: blur(10px);
}

.nav-link {
  padding: 0.5rem 1.1rem;
  border-radius: 999px;
  font-size: 0.95rem;
  color: #4f5d7a;
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: #2d3a5c;
  background: rgba(93, 130, 255, 0.12);
}

.nav-link.active {
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  color: #fff;
  box-shadow: 0 6px 18px rgba(74, 110, 255, 0.32);
}

.app-shell__user .user-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.9rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 14px;
  box-shadow: 0 6px 18px rgba(87, 115, 170, 0.18);
  backdrop-filter: blur(8px);
  cursor: pointer;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.75);
}

.nickname {
  margin: 0;
  font-weight: 600;
}

.motto {
  margin: 0;
  font-size: 0.8rem;
  color: #5b6a86;
  line-height: 1.2;
  white-space: nowrap;
  cursor: default;
}
.motto.is-truncated {
  cursor: pointer; /* 提示可悬浮查看 */
}

/* 移除旧的 span 切换相关样式 */

.app-shell__main {
  flex: 1;
  border-top: 1px solid rgba(120, 140, 200, 0.12);
  border-radius: 28px 28px 0 0;
  background: rgba(255, 255, 255, 0.66);
  padding: 2.5rem 3vw 3rem;
  box-shadow: 0 -12px 24px rgba(95, 132, 255, 0.08);
  backdrop-filter: blur(12px);
}

.page-heading {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.75rem;
}

.page-heading h2 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 600;
  color: #2e3b63;
}

.page-heading p {
  margin: 0.25rem 0 0;
  color: #607199;
  font-size: 0.95rem;
}

.ghost-btn {
  border: 1px solid rgba(82, 99, 143, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
  padding: 0.45rem 0.9rem;
  color: #3c4a73;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ghost-btn:hover {
  border-color: rgba(82, 99, 143, 0.5);
  background: rgba(255, 255, 255, 0.85);
}

.page-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (max-width: 1080px) {
  .app-shell__header {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    gap: 1.5rem;
  }

  .app-shell__user {
    width: 100%;
    display: flex;
    justify-content: center;
  }

   .app-shell__user:hover {
     cursor: pointer;
   }

  .app-shell__nav {
    flex-wrap: wrap;
    justify-content: center;
  }

  .page-content {
    gap: 1.25rem;
  }
}

@media (max-width: 720px) {
  .app-shell__main {
    padding: 1.75rem 6vw 2.5rem;
  }

  .page-heading {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
