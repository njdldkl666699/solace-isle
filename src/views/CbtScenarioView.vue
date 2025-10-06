<script setup lang="ts">
import { computed, reactive, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import AppShell from "../components/layout/AppShell.vue";
import {type CbtScenarioStep, type Evidence, useAppStore} from "../stores/appStore";
import api from "../api/request.ts";
import { ElMessage } from "element-plus";
// 新增：markdown 相关
import { marked } from 'marked';
import hljs from 'highlight.js';

// markdown 渲染配置（含代码高亮）
marked.setOptions({
  // @ts-ignore
  highlight(code, lang) {
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch (_) {
      return code;
    }
  },
  gfm: true,
  breaks: true
});

// 简单净化（防止脚本注入）；如需更强净化可引入 DOMPurify（此处为轻量实现）
const sanitize = (html: string) => {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on[a-zA-Z]+\s*=\s*"[^"]*"/g, '')
    .replace(/on[a-zA-Z]+\s*=\s*'[^']*'/g, '')
    .replace(/on[a-zA-Z]+\s*=\s*[^\s>]+/g, '');
};

const props = defineProps<{ id: string }>();

const appStore = useAppStore();
const router = useRouter();

// 获取步骤
const getSteps = async () => {
  try {
    const response = await api.get(`/cbt/${props.id}`);
    if (response.data.code === 1) {
      return response.data.data as CbtScenarioStep[];
    } else {
      ElMessage.error("无法获取 CBT 训练舱步骤");
      return [] as CbtScenarioStep[];
    }
  } catch (err: any) {
    ElMessage.error("无法获取 CBT 训练舱步骤");
    return [] as CbtScenarioStep[];
  }
};

// 兜底：当直接进入详情页（刷新或外部链接）且 store 里没有场景列表时，拉取列表
const getCbtList = async () => {
  try {
    const response = await api.get("/cbt");
    if (response.data.code === 1) {
      appStore.setCbtScenarios(response.data.data);
    } else {
      ElMessage.error("无法获取 CBT 训练舱列表");
    }
  } catch (_) {
    ElMessage.error("无法获取 CBT 训练舱列表");
  }
};

// 保存步骤
const steps = ref<CbtScenarioStep[]>([]);

onMounted(async () => {
  // 确保基础场景数据存在
  if (!appStore.getScenario(props.id)) {
    await getCbtList();
  }
  // 获取步骤
  steps.value = await getSteps();
});

// 组合：包含 CbtScenario 所有字段 + steps
const scenario = computed(() => {
  const base = appStore.getScenario(props.id);
  if (!base) return null;
  return {
    id: base.id,
    title: base.title,
    description: base.description,
    difficulty: base.difficulty,
    durationLabel: base.durationLabel,
    coverColor: base.coverColor,
    tags: base.tags,
    finished: base.finished,
    steps: steps.value,
  } as (typeof base & { steps: CbtScenarioStep[] });
});
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

const singleSelectOptions = computed<string[]>(() => {
  if (currentStep.value?.type !== 'single-select') return [];
  return currentStep.value.options;
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
  // 若已定义则清空流状态
  if (typeof resetStreamState === 'function') {
    // @ts-ignore - runtime check
    resetStreamState();
  }
};

// 新增：提交与流式分析状态
interface CbtAnswer {
  options?: string[];
  text?: string;
  evidence?: { support: string; against: string };
}

const isSubmitting = ref(false);
const isStreamFinished = ref(false);
const streamAnswer = ref("");
// 新增：markdown html 计算
const streamAnswerHtml = computed(() => {
  if (!streamAnswer.value) return '';
  try {
    const raw = marked.parse(streamAnswer.value) as string;
    return sanitize(raw);
  } catch (e) {
    return streamAnswer.value; // 兜底直接原文
  }
});

const streamError = ref("");
const taskId = ref<string | null>(null);

// 将响应转换为后端需要的结构
const buildAnswerPayload = (): CbtAnswer[] => {
  if (!scenario.value) return [];
  return scenario.value.steps.map((step) => {
    const raw = responses[step.id];
    const answer: CbtAnswer = {};
    if (step.type === "single-select") {
      if (typeof raw === "string") answer.options = [raw];
    } else if (step.type === "long-text") {
      if (typeof raw === "string") answer.text = raw;
    } else if (step.type === "evidence") {
      if (raw && typeof raw === "object") {
        const { support = "", against = "" } = raw as { support?: string; against?: string };
        answer.evidence = { support, against };
      }
    }
    return answer;
  });
};

const resetStreamState = () => {
  isSubmitting.value = false;
  isStreamFinished.value = false;
  streamAnswer.value = "";
  streamError.value = "";
  taskId.value = null;
};

const submitScenario = async () => {
  if (!scenario.value) return;
  if (isSubmitting.value) return;
  resetStreamState();
  isSubmitting.value = true;
  const payload = buildAnswerPayload();
  try {
    const token = appStore.token;
    const res = await fetch(`${api.defaults.baseURL || ''}/cbt/${scenario.value.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok || !res.body) {
      ElMessage.error("提交失败，无法建立流连接");
      isSubmitting.value = false;
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawChunk = buffer.slice(0, sepIndex).trim();
        buffer = buffer.slice(sepIndex + 2);
        if (!rawChunk) continue;
        // 处理可能的多行（保守做法：逐行找 data: 开头）
        const lines = rawChunk.split(/\n+/).filter((l) => l.startsWith("data:"));
        for (const line of lines) {
          const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;
            try {
              const evt = JSON.parse(jsonStr);
              if (evt.event === "ping") {
                continue; // 心跳
              }
              if (evt.taskId && !taskId.value) taskId.value = evt.taskId;
              if (evt.event === "message") {
                if (typeof evt.answer === "string") {
                  streamAnswer.value += evt.answer;
                }
              } else if (evt.event === "messageEnd") {
                isStreamFinished.value = true;
                isSubmitting.value = false;
              } else if (evt.event === "error") {
                streamError.value = evt.message || "分析出错";
                ElMessage.error(streamError.value);
                isStreamFinished.value = true;
                isSubmitting.value = false;
              }
            } catch (e) {
              console.error("解析流数据失败", e, jsonStr);
            }
        }
      }
    }
    // 结束但未收到 messageEnd，也认为结束
    if (!isStreamFinished.value) {
      isStreamFinished.value = true;
      isSubmitting.value = false;
    }
  } catch (e) {
    console.error(e);
    streamError.value = "提交或分析过程中出现异常";
    ElMessage.error(streamError.value);
    isSubmitting.value = false;
  }
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
            v-for="option in singleSelectOptions"
            :key="option"
            type="button"
            class="option"
            :class="{ active: responses[currentStep.id] === option }"
            @click="handleSelect(option)"
          >
            {{ option }}
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
                :value="((responses[currentStep.id] as Evidence)?.support) ?? ''"
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
                :value="((responses[currentStep.id] as Evidence)?.against) ?? ''"
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
        <div class="analysis" v-if="streamAnswer || streamError || isSubmitting">
          <h4>AI 分析</h4>
          <div class="analysis-box" :class="{ loading: isSubmitting }">
            <template v-if="streamError">
              <span class="error">{{ streamError }}</span>
            </template>
            <template v-else>
              <div
                class="analysis-content markdown-body"
                v-if="streamAnswer || isSubmitting"
                v-html="streamAnswerHtml || (isSubmitting ? '分析生成中…' : '尚未获取分析')"
              />
              <template v-else>
                <span class="analysis-content">尚未获取分析</span>
              </template>
            </template>
          </div>
        </div>
        <div class="summary-actions">
          <button type="button" class="ghost" @click="restart">重新练习</button>
          <button
            v-if="!streamAnswer && !isSubmitting"
            type="button"
            class="primary"
            @click="submitScenario"
          >提交并获取 AI 分析</button>
          <button
            v-else-if="isSubmitting"
            disabled
            type="button"
            class="primary"
          >分析中…</button>
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
/* 新增：为证据区标签文字与文本域增加间距 */
.evidence label > textarea { margin-top: 0.6rem; display: block; }

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

.analysis {
  margin-top: 1.2rem;
  display: grid;
  gap: 0.6rem;
}
.analysis h4 { margin: 0; font-size: 1.1rem; color: #253257; }
.analysis-box {
  background: rgba(246,249,255,0.9);
  border: 1px solid rgba(93,130,255,0.16);
  border-radius: 16px;
  padding: 1rem 1.2rem;
  position: relative;
  min-height: 80px;
  white-space: pre-wrap;
}
.analysis-box.loading::after {
  content: ' ';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(45deg, rgba(93,130,255,0.08), rgba(93,130,255,0.08) 10px, rgba(93,130,255,0.14) 10px, rgba(93,130,255,0.14) 20px);
  animation: pulse 1.2s linear infinite;
  mix-blend-mode: multiply;
  opacity: 0.35;
  border-radius: inherit;
  pointer-events: none;
}
@keyframes pulse { to { background-position: 40px 0; } }
.analysis-content { margin: 0; font-family: inherit; color: #4a5d8a; white-space: normal; }

/* markdown 基础样式 */
.markdown-body { line-height: 1.55; font-size: 0.95rem; }
.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5 { font-weight:600; line-height:1.3; margin:1rem 0 0.6rem; }
.markdown-body h1 { font-size:1.45rem; }
.markdown-body h2 { font-size:1.3rem; }
.markdown-body h3 { font-size:1.15rem; }
.markdown-body p { margin:0.4rem 0 0.8rem; }
.markdown-body ul, .markdown-body ol { padding-left:1.2rem; margin:0.4rem 0 0.8rem; }
.markdown-body li { margin:0.25rem 0; }
.markdown-body code { background: rgba(93,130,255,0.10); padding:0.15rem 0.4rem; border-radius:6px; font-size:0.85rem; }
.markdown-body pre { background: #1f2430; color:#e6eef7; padding:0.9rem 1rem; border-radius:12px; overflow:auto; font-size:0.85rem; }
.markdown-body pre code { background: transparent; padding:0; color:inherit; }
.markdown-body blockquote { margin:0.6rem 0; padding:0.4rem 0.9rem; border-left:4px solid #5d82ff; background: rgba(93,130,255,0.10); border-radius:0 10px 10px 0; color:#3a4c79; }
.markdown-body hr { border:none; height:1px; background:linear-gradient(90deg, rgba(93,130,255,0.3), rgba(93,130,255,0)); margin:1.4rem 0; }
.markdown-body a { color:#4d6bff; text-decoration:none; }
.markdown-body a:hover { text-decoration:underline; }
.error { color: #d93030; font-weight: 600; }
</style>
