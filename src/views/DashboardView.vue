<script setup lang="ts">
import { computed, onMounted } from "vue";
import AppShell from "../components/layout/AppShell.vue";
import WeeklyMoodChart from "../components/dashboard/WeeklyMoodChart.vue";
import { useAppStore } from "../stores/appStore";
import api from "../api/request.ts";
import { ElMessage } from "element-plus";

const appStore = useAppStore();

const quickActions = computed(() => [
  {
    label: "记录心情",
    description: "三十秒写下此刻发生的事",
    icon: "📝",
    to: "/diary",
    accent: "rgba(93, 130, 255, 0.18)",
  },
  {
    label: "与 AI 对话",
    description: "来聊聊今天发生的事情",
    icon: "🤖",
    to: "/chat",
    accent: "rgba(130, 178, 255, 0.18)",
  },
  {
    label: "CBT 训练舱",
    description: "换一个角度看看想法",
    icon: "🎮",
    to: "/cbt",
    accent: "rgba(125, 220, 190, 0.22)",
  },
  {
    label: "心灵树洞",
    description: "看看同伴的温暖瞬间",
    icon: "🌳",
    to: "/treehole",
    accent: "rgba(255, 196, 132, 0.24)",
  },
]);

const summary = computed(() => appStore.dashboardSummary);
const achievedAchievements = computed(() => summary.value.Achievements.filter(item => item.achievedAt));
const unachievedAchievements = computed(() => summary.value.Achievements.filter(item => !item.achievedAt));

const streakText = computed(() => `你已连续记录 ${summary.value.streakDays} 天`);

const getCurrentMood = async () => {
  try{
    const response = await api.get("/dashboard/currentMood");

    if(response.data.code === 1){
      appStore.updateCurrentMood(response.data.data);
    }else {
      ElMessage.error("无法获取当前情绪" + (response.data.msg ? `：${response.data.msg}` : ""));
    }
  }catch {
    ElMessage.error("无法获取当前情绪，请检查网络连接");
  }
}

const getWeeklyMoodTrend = async () => {
  try{
    const response = await api.get("/dashboard/recentTrack",{
      params: {
        days: 7
      }
    });

    if(response.data.code === 1){
      appStore.updateWeeklyMoodTrend(response.data.data.moodTrend);
      appStore.updateStreakDays(response.data.data.consecutiveDays);
    }else {
      ElMessage.error("无法获取情绪轨迹" + (response.data.msg ? `：${response.data.msg}` : ""));
    }
  }catch {
    ElMessage.error("无法获取情绪轨迹，请检查网络连接");
  }
}

const getAchievements = async () => {
  try {
    const response = await api.get("/dashboard/achievements");

    if (response.data.code === 1) {
      appStore.updateAchievements(response.data.data);
    } else {
      ElMessage.error("无法获取成就信息" + (response.data.msg ? `：${response.data.msg}` : ""));
    }
  } catch {
    ElMessage.error("无法获取成就信息，请检查网络连接");
  }
};

const getQuickReminders = async () => {
  try {
    const response = await api.get("/dashboard/remind");

    if (response.data.code === 1) {
      appStore.updateQuickReminders(response.data.data);
    } else {
      ElMessage.error("无法获取轻声提醒" + (response.data.msg ? `：${response.data.msg}` : ""));
    }
  } catch {
    ElMessage.error("无法获取轻声提醒，请检查网络连接");
  }
};

onMounted(() => {
  appStore.updateGreeting();
  getCurrentMood();
  getWeeklyMoodTrend();
  getAchievements();
  getQuickReminders();
});
</script>

<template>
  <AppShell page-title="我的主页" subtitle="让情绪有被看见的安全感。">
    <div class="dashboard">
      <section class="hero-card">
        <div>
          <p class="greeting">{{ appStore.greeting }}，{{ appStore.user.nickname }} 👋</p>
          <h2>今天也在勇敢练习拥抱情绪。</h2>
          <p class="lead">心屿会记录你的每一次靠岸，帮助你在细碎的日子里，看到稳定的力量。</p>
          <RouterLink class="primary-btn" to="/diary">立即记录心情</RouterLink>
        </div>
        <div class="hero-illustration" aria-hidden="true">
          <div class="mood-bubble">
            <span>{{ summary.currentMood.emoji }}</span>
            <p>{{ summary.currentMood.label }}</p>
          </div>
          <div class="streak-tag">{{ streakText }}</div>
        </div>
      </section>

      <section class="grid">
        <article class="quick-actions">
          <header>
            <h3>快捷入口</h3>
            <p>从这里出发，去探索你的小岛。</p>
          </header>
          <div class="actions-grid">
            <RouterLink v-for="action in quickActions" :key="action.label" :to="action.to" class="action-card">
              <span class="icon" :style="{ background: action.accent }">{{ action.icon }}</span>
              <div>
                <p class="label">{{ action.label }}</p>
                <p class="desc">{{ action.description }}</p>
              </div>
            </RouterLink>
          </div>
        </article>

        <article class="mood-chart">
          <header>
            <h3>近一周情绪轨迹</h3>
            <p>了解一周内的情绪波动，练习与自己同频。</p>
          </header>
          <WeeklyMoodChart :data="summary.weeklyMoodTrend" />
        </article>

        <article class="current-mood">
          <header>
            <h3>当前情绪</h3>
            <span class="emoji">{{ summary.currentMood.emoji }}</span>
          </header>
          <p class="label">{{ summary.currentMood.label }}</p>
          <p class="description">{{ summary.currentMood.description }}</p>
          <RouterLink class="link" to="/diary">查看最近记录 →</RouterLink>
        </article>

        <article class="achievements">
          <header>
            <h3>我的成就</h3>
            <p>记录你的成长瞬间，为坚持的自己点一盏灯。</p>
          </header>
          <ul>
            <li v-for="item in achievedAchievements" :key="item.name">
              <span class="badge">{{ item.icon }}</span>
              <div>
                <p class="title">{{ item.name }}</p>
                <p class="desc">{{ item.description }}</p>
                <p class="time">{{ item.achievedAt }}</p>
              </div>
            </li>
            <li v-for="item in unachievedAchievements" :key="item.name">
              <span class="badge">{{ item.icon }}</span>
              <div>
                <p class="title">{{ item.name }}</p>
                <p class="desc">{{ item.description }}</p>
              </div>
            </li>
          </ul>
        </article>

        <article class="reminders" v-if="summary.quickReminders.length">
          <header>
            <h3>轻声提醒</h3>
          </header>
          <ul>
            <li v-for="(note, index) in summary.quickReminders" :key="index">{{ note }}</li>
          </ul>
        </article>
      </section>
    </div>
  </AppShell>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: 2.5rem;
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 2.5rem;
  background: linear-gradient(135deg, rgba(93, 130, 255, 0.15), rgba(93, 130, 255, 0));
  border-radius: 28px;
  padding: 2.8rem;
  border: 1px solid rgba(74, 110, 255, 0.12);
  box-shadow: 0 24px 48px rgba(90, 120, 220, 0.08);
}

.greeting {
  font-size: 1.25rem;
  margin: 0 0 0.75rem;
  font-weight: 600;
  color: #4a5d8a;
}

.hero-card h2 {
  font-size: 2.1rem;
  margin: 0 0 1rem;
  color: #1e2a4a;
}

.lead {
  margin: 0 0 1.75rem;
  color: #506087;
  line-height: 1.6;
  font-size: 1.05rem;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1.4rem;
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  border-radius: 14px;
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  box-shadow: 0 16px 32px rgba(93, 130, 255, 0.22);
}

.hero-illustration {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 220px;
  margin-left: 4rem;
}

.mood-bubble {
  width: 160px;
  height: 160px;
  border-radius: 36px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(165, 187, 255, 0.52));
  display: grid;
  place-items: center;
  gap: 0.4rem;
  font-size: 2.4rem;
  color: #2c3a63;
  box-shadow: 0 24px 28px rgba(97, 124, 210, 0.22);
}

.mood-bubble p {
  margin: 0;
  font-size: 1rem;
}

.streak-tag {
  margin-top:1.2rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: rgba(93, 130, 255, 0.22);
  color: #31436a;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;/*文字居中*/
}

.grid {
  display: grid;
  /* 固定两列，不随视口宽度改变 */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.75rem;
}

/* 保证子元素在网格中可压缩，避免内容撑破导致水平滚动条 */
.grid > * { min-width: 0; }

.current-mood,
.mood-chart,
.quick-actions,
.achievements,
.reminders {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 24px;
  padding: 1.8rem;
  border: 1px solid rgba(93, 130, 255, 0.12);
  box-shadow: 0 18px 36px rgba(82, 104, 178, 0.12);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.current-mood header,
.mood-chart header,
.quick-actions header,
.achievements header,
.reminders header {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #24345b;
}

.current-mood .emoji {
  font-size: 1.8rem;
}

.current-mood .label {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.current-mood .description {
  margin: 0;
  color: #5b6b93;
  line-height: 1.5;
}

.link {
  text-decoration: none;
  color: #4f68ff;
  font-weight: 600;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  overflow-y: auto; /* 若内容过多，允许内部滚动 */
}

.action-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.2rem;
  border-radius: 18px;
  text-decoration: none;
  color: #24345b;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(93, 130, 255, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 28px rgba(90, 120, 220, 0.15);
}

.action-card .icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 16px;
  font-size: 1.5rem;
}

.action-card .label {
  margin: 0;
  font-weight: 600;
}

.action-card .desc {
  margin: 0.25rem 0 0;
  color: #5c6b93;
  font-size: 0.93rem;
}

.achievements ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 1rem;
  max-height: 100px; /* 与轻声提醒一致的高度，可根据需要调整 */
  overflow-y: auto;
}

.achievements li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  align-items: center;
}

.badge {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 1.8rem;
  background: rgba(93, 130, 255, 0.18);
}

.title {
  margin: 0;
  font-weight: 600;
}

.desc {
  margin: 0.2rem 0 0;
  color: #5d6b92;
  font-size: 0.95rem;
}

.time {
  margin: 0.3rem 0 0;
  color: #8d9abc;
  font-size: 0.82rem;
}

.reminders ul {
  margin: 0;
  padding-left: 1.1rem;
  color: #54648d;
  display: grid;
  gap: 0.5rem;
  max-height: 100px; /* 超过该高度出现竖向滚动 */
  overflow-y: auto;
  padding-right: 4px;
}

/* 自定义滚动条（WebKit） */
.achievements ul::-webkit-scrollbar,
.reminders ul::-webkit-scrollbar { width: 6px; }
.achievements ul::-webkit-scrollbar-track,
.reminders ul::-webkit-scrollbar-track { background: rgba(93,130,255,0.08); border-radius: 8px; }
.achievements ul::-webkit-scrollbar-thumb,
.reminders ul::-webkit-scrollbar-thumb { background: linear-gradient(180deg,#7496ff,#5d82ff); border-radius: 8px; }
.achievements ul::-webkit-scrollbar-thumb:hover,
.reminders ul::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg,#5d82ff,#4b72ef); }

/* 非 WebKit 浏览器将回退系统默认滚动条 */

@media (max-width: 1080px) {
  .hero-card {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .hero-card {
    padding: 2.2rem;
  }
}
</style>
