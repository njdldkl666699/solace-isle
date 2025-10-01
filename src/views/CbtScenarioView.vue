<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import AppShell from "../components/layout/AppShell.vue";
import { useAppStore } from "../stores/appStore";

const props = defineProps<{ id: string }>();

const appStore = useAppStore();
const router = useRouter();

const scenario = computed(() => appStore.getScenario(props.id));
const stepIndex = ref(0);
const isCompleted = ref(false);

const responses = reactive<Record<string, unknown>>({});

const currentStep = computed(() => scenario.value?.steps[stepIndex.value]);
const progress = computed(() => {
  if (!scenario.value) return 0;
  return ((stepIndex.value + (isCompleted.value ? 1 : 0)) / scenario.value.steps.length) * 100;
});

const longTextPlaceholder = computed(() => {
  if (currentStep.value?.type === "long-text") {
    if ("placeholder" in currentStep.value && currentStep.value.placeholder) {
      return currentStep.value.placeholder;
    }
    return "写下你的想法…";
  }
  return "写下你的想法…";
});

const getSummary = computed(() => {
  if (!scenario.value || !isCompleted.value) return [] as { title: string; content: string }[];
  return scenario.value.steps.map((step) => {
    const answer = responses[step.id];
    if (!answer) return { title: step.title, content: "（尚未填写）" };
    if (step.type === "evidence" && typeof answer === "object" && answer !== null) {
      const { support, against } = answer as { support: string; against: string };
      return {
        title: step.title,
        content: `支持：${support || "—"}\n反驳：${against || "—"}`,
      };
    }
    return { title: step.title, content: String(answer) };
  });
});

const goPrev = () => {
  if (stepIndex.value === 0) {
    router.back();
    return;
  }
  stepIndex.value -= 1;
};

const goNext = () => {
  if (!scenario.value) return;
  if (stepIndex.value < scenario.value.steps.length - 1) {
    stepIndex.value += 1;
  } else {
    isCompleted.value = true;
  }
};

const handleSelect = (value: string) => {
  if (!currentStep.value) return;
  responses[currentStep.value.id] = value;
  goNext();
};

const handleEvidenceUpdate = (field: "support" | "against", value: string) => {
  if (!currentStep.value || currentStep.value.type !== "evidence") return;
  const record = (responses[currentStep.value.id] as { support: string; against: string }) ?? {
    support: "",
    against: "",
  };
  record[field] = value;
  responses[currentStep.value.id] = record;
};

const handleTextUpdate = (value: string) => {
  if (!currentStep.value) return;
  responses[currentStep.value.id] = value;
};

const restart = () => {
  stepIndex.value = 0;
  isCompleted.value = false;
  Object.keys(responses).forEach((key) => delete responses[key]);
};
</script>

<template>
  <AppShell
    :show-back="true"
    :page-title="scenario ? scenario.title : '训练情景'"
    :subtitle="scenario ? scenario.description : '该训练正在准备中。'"
  >
    <div v-if="!scenario" class="empty-state">
      <p>未找到该情景，请返回训练列表重新选择。</p>
      <RouterLink to="/cbt">返回列表</RouterLink>
    </div>
    <div v-else class="scenario">
      <div class="progress">
        <div class="track">
          <div class="bar" :style="{ width: progress + '%' }" />
        </div>
        <span>{{ isCompleted ? "已完成" : `步骤 ${stepIndex + 1} / ${scenario.steps.length}` }}</span>
      </div>

      <section v-if="!isCompleted && currentStep" class="step-card">
        <p class="step-title">{{ currentStep.title }}</p>
        <p class="prompt">{{ currentStep.prompt }}</p>

        <div v-if="currentStep.type === 'single-select'" class="option-grid">
          <button
            v-for="option in currentStep.options"
            :key="option.value"
            type="button"
            class="option"
            :class="{ active: responses[currentStep.id] === option.value }"
            @click="handleSelect(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <div v-else-if="currentStep.type === 'long-text'" class="long-text">
          <textarea
            :placeholder="longTextPlaceholder"
            rows="6"
            :value="(responses[currentStep.id] as string) ?? ''"
            @input="handleTextUpdate(($event.target as HTMLTextAreaElement).value)"
          />
        </div>

        <div v-else class="evidence">
          <div class="column">
            <label>
              支持这个想法的证据
              <textarea
                :placeholder="currentStep.placeholders.support"
                rows="4"
                :value="((responses[currentStep.id] as { support: string; against: string })?.support) ?? ''"
                @input="handleEvidenceUpdate('support', ($event.target as HTMLTextAreaElement).value)"
              />
            </label>
          </div>
          <div class="column">
            <label>
              反驳这个想法的证据
              <textarea
                :placeholder="currentStep.placeholders.against"
                rows="4"
                :value="((responses[currentStep.id] as { support: string; against: string })?.against) ?? ''"
                @input="handleEvidenceUpdate('against', ($event.target as HTMLTextAreaElement).value)"
              />
            </label>
          </div>
        </div>

        <footer class="actions">
          <button type="button" class="ghost" @click="goPrev">上一步</button>
          <button type="button" class="primary" @click="goNext">下一步</button>
        </footer>
      </section>

      <section v-else class="summary-card">
        <div class="icon">🎉</div>
        <h3>训练完成，看看你的收获</h3>
        <p>这是你刚经历的思考旅程，可以收藏或在下次挑战时再回顾。</p>
        <ul>
          <li v-for="item in getSummary" :key="item.title">
            <h4>{{ item.title }}</h4>
            <pre>{{ item.content }}</pre>
          </li>
        </ul>
        <div class="summary-actions">
          <button type="button" class="ghost" @click="restart">重新练习</button>
          <RouterLink class="primary-link" to="/cbt">返回训练列表</RouterLink>
        </div>
      </section>
    </div>
  </AppShell>
</template>

<style scoped>
.scenario {
  display: grid;
  gap: 2rem;
}

.progress {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #4a5d8a;
}

.track {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: rgba(93, 130, 255, 0.18);
  overflow: hidden;
}

.bar {
  height: 100%;
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  transition: width 0.3s ease;
}

.step-card,
.summary-card {
  background: rgba(255, 255, 255, 0.88);
  border-radius: 28px;
  border: 1px solid rgba(93, 130, 255, 0.12);
  box-shadow: 0 18px 32px rgba(93, 120, 190, 0.14);
  padding: 2.4rem;
  display: grid;
  gap: 1.5rem;
}

.step-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: #1f2c4d;
}

.prompt {
  margin: 0;
  color: #55628b;
  line-height: 1.6;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.option {
  border: 1px solid rgba(93, 130, 255, 0.22);
  border-radius: 18px;
  padding: 1rem 1.2rem;
  background: rgba(246, 249, 255, 0.9);
  cursor: pointer;
  font-weight: 600;
  color: #2f3a60;
  transition: all 0.2s ease;
}

.option.active,
.option:hover {
  background: linear-gradient(135deg, rgba(93, 130, 255, 0.18), rgba(93, 130, 255, 0.08));
  box-shadow: 0 12px 24px rgba(93, 130, 255, 0.18);
}

.long-text textarea,
.evidence textarea {
  width: 100%;
  border-radius: 18px;
  border: 1px solid rgba(93, 130, 255, 0.18);
  padding: 1rem 1.2rem;
  font-size: 1rem;
  line-height: 1.5;
}

.long-text textarea:focus,
.evidence textarea:focus {
  outline: none;
  border-color: rgba(93, 130, 255, 0.5);
  box-shadow: 0 0 0 4px rgba(93, 130, 255, 0.18);
}

.evidence {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ghost,
.primary {
  border-radius: 14px;
  padding: 0.75rem 1.6rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.ghost {
  background: rgba(93, 130, 255, 0.12);
  color: #4d6bff;
}

.primary {
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  color: #fff;
  box-shadow: 0 16px 32px rgba(93, 130, 255, 0.2);
}

.summary-card .icon {
  font-size: 2.5rem;
}

.summary-card h3 {
  margin: 0;
  font-size: 1.6rem;
  color: #1f2c4d;
}

.summary-card p {
  margin: 0;
  color: #55628b;
  line-height: 1.5;
}

.summary-card ul {
  list-style: none;
  margin: 1.5rem 0 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.summary-card li {
  background: rgba(246, 249, 255, 0.9);
  border-radius: 18px;
  padding: 1.1rem 1.4rem;
  border: 1px solid rgba(93, 130, 255, 0.1);
}

.summary-card h4 {
  margin: 0 0 0.4rem;
  font-size: 1.05rem;
  color: #253257;
}

.summary-card pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  color: #4a5d8a;
}

.summary-actions {
  display: flex;
  gap: 1rem;
}

.primary-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.6rem;
  border-radius: 14px;
  text-decoration: none;
  background: linear-gradient(135deg, #5d82ff, #8fa3ff);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 16px 32px rgba(93, 130, 255, 0.2);
}

.empty-state {
  background: rgba(255, 255, 255, 0.86);
  border-radius: 24px;
  padding: 2.5rem;
  text-align: center;
  display: grid;
  gap: 1rem;
  color: #4a5d8a;
}

.empty-state a {
  color: #4d6bff;
  text-decoration: none;
  font-weight: 600;
}

@media (max-width: 720px) {
  .step-card,
  .summary-card {
    padding: 1.8rem;
  }

  .summary-actions {
    flex-direction: column;
  }
}
</style>
