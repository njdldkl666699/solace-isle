<script setup lang="ts">
import {computed, onMounted, reactive} from "vue";
import AppShell from "../components/layout/AppShell.vue";
import { useAppStore } from "../stores/appStore";
import api from "../api/request.ts";
import {ElMessage} from "element-plus";

const appStore = useAppStore();
const achievedAchievements = computed(() => appStore.dashboardSummary.Achievements.filter(item => item.achievedAt));
const unachievedAchievements = computed(() => appStore.dashboardSummary.Achievements.filter(item => !item.achievedAt));

const settings = reactive({
  shareAggregated: true,
  nightlyReminder: false,
  breathingNotification: true,
});

const getAchievements = async () => {
  try {
    const response = await api.get("/dashboard/achievements");

    if (response.data.code === 1) {
      appStore.updateAchievements(response.data.data);
    } else {
      ElMessage.error("无法获取成就信息");
    }
  } catch {
    ElMessage.error("无法获取成就信息");
  }
};

onMounted(() => {
  getAchievements();
});
</script>

<template>
  <AppShell page-title="个人中心" subtitle="调节习惯、收藏回忆，和自己保持同频。">
    <div class="profile">
      <section class="hero-card">
        <img :src="appStore.user.avatar" alt="用户头像" />
        <div>
          <h3>{{ appStore.user.nickname }}</h3>
          <p class="id">学号（脱敏）：{{ appStore.user.studentId.slice(0, 4) }}****</p>
          <p class="motto">“{{ appStore.user.motto }}”</p>
        </div>
        <button type="button">编辑资料</button>
      </section>

      <section class="settings">
        <h4>我的习惯设置</h4>
        <ul>
          <li>
            <div>
              <p>允许与学校共享统计趋势</p>
              <span>仅提供匿名化数据，帮助老师了解整体状态。</span>
            </div>
            <label class="switch">
              <input v-model="settings.shareAggregated" type="checkbox" />
              <span />
            </label>
          </li>
          <li>
            <div>
              <p>晚间情绪记录提醒</p>
              <span>每天 22:00 推送温柔提醒，适当放下白天的累。</span>
            </div>
            <label class="switch">
              <input v-model="settings.nightlyReminder" type="checkbox" />
              <span />
            </label>
          </li>
          <li>
            <div>
              <p>呼吸练习通知</p>
              <span>当连续 3 天情绪紧绷时自动提醒。</span>
            </div>
            <label class="switch">
              <input v-model="settings.breathingNotification" type="checkbox" />
              <span />
            </label>
          </li>
        </ul>
      </section>

      <section class="achievements">
        <h4>我的成就勋章</h4>
        <div class="grid">
          <article v-for="item in achievedAchievements" :key="item.name">
            <span class="icon">{{ item.icon }}</span>
            <h5>{{ item.name }}</h5>
            <p>{{ item.description }}</p>
            <time>{{ item.achievedAt }}</time>
          </article>
          <article v-for="item in unachievedAchievements" :key="item.name">
            <span class="icon">{{ item.icon }}</span>
            <h5>{{ item.name }}</h5>
            <p>{{ item.description }}</p>
          </article>
        </div>
      </section>
    </div>
  </AppShell>
</template>

<style scoped>
.profile {
  display: grid;
  gap: 2rem;
}

.hero-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1.5rem;
  align-items: center;
  background: rgba(255, 255, 255, 0.86);
  border-radius: 26px;
  padding: 2rem 2.4rem;
  border: 1px solid rgba(93, 130, 255, 0.12);
  box-shadow: 0 18px 32px rgba(93, 120, 190, 0.12);
}

.hero-card img {
  width: 82px;
  height: 82px;
  border-radius: 24px;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.9);
}

.hero-card h3 {
  margin: 0 0 0.3rem;
  font-size: 1.45rem;
  color: #253257;
}

.hero-card .id {
  margin: 0;
  color: #5c6b93;
}

.hero-card .motto {
  margin: 0.6rem 0 0;
  color: #445784;
}

.hero-card button {
  border: none;
  border-radius: 14px;
  padding: 0.75rem 1.4rem;
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.settings,
.achievements {
  background: rgba(255, 255, 255, 0.88);
  border-radius: 24px;
  padding: 2rem 2.2rem;
  border: 1px solid rgba(93, 130, 255, 0.12);
  box-shadow: 0 18px 32px rgba(93, 120, 190, 0.12);
  display: grid;
  gap: 1.5rem;
}

h4 {
  margin: 0;
  font-size: 1.25rem;
  color: #253257;
}

.settings ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1.2rem;
}

.settings li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1.2rem;
  align-items: center;
  padding: 1rem 1.2rem;
  border-radius: 20px;
  background: rgba(246, 249, 255, 0.9);
  border: 1px solid rgba(93, 130, 255, 0.08);
}

.settings p {
  margin: 0;
  font-weight: 600;
  color: #2f3a60;
}

.settings span {
  display: block;
  margin-top: 0.35rem;
  color: #5c6b93;
  font-size: 0.9rem;
}

.switch {
  position: relative;
  width: 52px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch span {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: rgba(93, 130, 255, 0.2);
  border-radius: 999px;
  transition: background 0.2s ease;
}

.switch span::after {
  content: "";
  position: absolute;
  left: 4px;
  top: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s ease;
  box-shadow: 0 4px 12px rgba(93, 130, 255, 0.25);
}

.switch input:checked + span {
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
}

.switch input:checked + span::after {
  transform: translateX(24px);
}

.achievements .grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.2rem;
}

.achievements article {
  background: rgba(246, 249, 255, 0.9);
  border-radius: 20px;
  padding: 1.4rem;
  border: 1px solid rgba(93, 130, 255, 0.1);
  display: grid;
  gap: 0.6rem;
}

.icon {
  font-size: 1.8rem;
}

@media (max-width: 960px) {
  .hero-card {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .hero-card button {
    width: 100%;
  }

  .settings li {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .settings span {
    text-align: center;
  }

  .switch {
    justify-self: center;
  }
}
</style>
