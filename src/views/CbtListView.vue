<script setup lang="ts">
import { computed } from "vue";
import AppShell from "../components/layout/AppShell.vue";
import { useAppStore } from "../stores/appStore";
import api from "../api/request.ts";
import { ElMessage } from "element-plus";

const appStore = useAppStore();
const scenarios = computed(() => {
  if (appStore.cbt.scenarios.length === 0) {
    getCbtList();
  }
  return appStore.cbt.scenarios;
});

const getCbtList = async () => {
  try {
    const response = await api.get("/cbt");
    if(response.data.code === 1){
      appStore.setCbtScenarios(response.data.data);
    }else {
      ElMessage.error("无法获取 CBT 训练舱列表");
    }
  } catch (err: any){
    ElMessage.error("无法获取 CBT 训练舱列表");
  }
};
</script>

<template>
  <AppShell page-title="CBT 训练舱" subtitle="把担忧拆成小步骤，练习新的思考路径。">
    <section class="intro">
      <div>
        <h3>欢迎来到训练舱</h3>
        <p>
          选择一个正在经历的场景，跟随 AI 的引导完成 4~5
          步练习。每次完成都会为你积累“思维肌肉”，在下一次挑战来临时，更快找回稳固的自己。
        </p>
      </div>
      <div class="tips">
        <p>小贴士：</p>
        <ul>
          <li>每个训练只需要 4-8 分钟，可随时暂停。</li>
          <li>完成后会生成一份“认知重构记录”，供你随时回顾。</li>
          <li>若训练中出现强烈情绪，请及时寻求专业老师帮助。</li>
        </ul>
      </div>
    </section>

    <section class="card-grid">
      <RouterLink
        v-for="scenario in scenarios"
        :key="scenario.id"
        :to="{ name: 'cbt-scenario', params: { id: scenario.id } }"
        class="scenario-card"
        :style="{ '--cover-color': scenario.coverColor }"
      >
        <div class="badge">难度 {{ "★".repeat(scenario.difficulty) }}</div>
        <h4>{{ scenario.title }}</h4>
        <p class="desc">{{ scenario.description }}</p>
        <p class="duration">⏱ {{ scenario.durationLabel }}</p>
        <div class="tag-row">
          <span v-for="tag in scenario.tags" :key="tag">#{{ tag }}</span>
        </div>
        <span class="cta">开始挑战 →</span>
      </RouterLink>
    </section>
  </AppShell>
</template>

<style scoped>
.intro {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 2rem;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 26px;
  padding: 2rem 2.4rem;
  border: 1px solid rgba(93, 130, 255, 0.12);
  box-shadow: 0 18px 32px rgba(93, 120, 190, 0.12);
}

.intro h3 {
  margin: 0;
  font-size: 1.45rem;
  color: #253257;
}

.intro p {
  color: #55628b;
  line-height: 1.6;
}

.tips {
  background: rgba(93, 130, 255, 0.08);
  border-radius: 20px;
  padding: 1.4rem 1.6rem;
  color: #41507a;
}

.tips ul {
  margin: 0.8rem 0 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 0.5rem;
}

.card-grid {
  margin-top: 2.4rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.75rem;
}

.scenario-card {
  position: relative;
  display: grid;
  gap: 0.8rem;
  padding: 1.8rem 1.6rem;
  border-radius: 24px;
  text-decoration: none;
  color: #253257;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(93, 130, 255, 0.12);
  box-shadow: 0 18px 32px rgba(93, 120, 190, 0.12);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.scenario-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--cover-color, rgba(93, 130, 255, 0.2));
  opacity: 0.18;
  z-index: 0;
}

.scenario-card > * {
  position: relative;
  z-index: 1;
}

.scenario-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 40px rgba(93, 120, 190, 0.18);
}

.badge {
  align-self: flex-start;
  background: rgba(93, 130, 255, 0.18);
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #41507a;
}

h4 {
  margin: 0;
  font-size: 1.2rem;
}

.desc {
  margin: 0;
  color: #55628b;
  line-height: 1.5;
}

.duration {
  margin: 0;
  color: #4d6bff;
  font-weight: 600;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.4rem;
}

.tag-row span {
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(93, 130, 255, 0.16);
  font-size: 0.85rem;
  color: #41507a;
}

.cta {
  margin-top: 0.6rem;
  font-weight: 600;
  color: #3245a0;
}

@media (max-width: 960px) {
  .intro {
    grid-template-columns: 1fr;
  }
}
</style>
